import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:5174/griff/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.tones=[];const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const oscillator=original.call(this),start=oscillator.start.bind(oscillator),stop=oscillator.stop.bind(oscillator);let record;oscillator.start=time=>{record={frequency:oscillator.frequency.value,time,cancelled:false};window.tones.push(record);start(time);};oscillator.stop=time=>{if(record&&time===undefined)record.cancelled=true;stop(time);};return oscillator;};});
const notes=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const toMidi=name=>{const match=name.match(/^([A-G]♯?)(-?\d+)$/);assert.ok(match,`Invalid pitch ${name}`);return(Number(match[2])+1)*12+notes.indexOf(match[1]);};
const shownMidis=async()=>{const labels=await page.locator('.fret:has(span)').evaluateAll(elements=>elements.map(e=>e.getAttribute('aria-label').split(', ').at(-1)));return labels.map(toMidi).sort((a,b)=>a-b);};
const intervals=[['Прима',0],['Малая терция',3],['Большая терция',4],['Кварта',5],['Квинта',7],['Малая септима',10],['Октава',12]];
const scales={'Минорная пентатоника':[0,3,5,7,10,12],'Натуральный минор':[0,2,3,5,7,8,10,12],'Мажор':[0,2,4,5,7,9,11,12],'Блюзовая гамма':[0,3,5,6,7,10,12],'Мажорная пентатоника':[0,2,4,7,9,12],'Дорийский лад':[0,2,3,5,7,9,10,12],'Миксолидийский лад':[0,2,4,5,7,9,10,12]};
try{
  await page.goto(base);await page.getByRole('button',{name:'Бас-гитара',exact:true}).click();
  const panel=page.locator('.bass-studies');
  assert.equal(await page.locator('.fret-string').count(),4);assert.equal(await page.locator('.fret-string').first().locator('.fret').count(),21);
  const tunings=[['standard',[43,38,33,28]],['drop-d',[43,38,33,26]],['eb',[42,37,32,27]]];
  for(const[id,open]of tunings){
    await page.getByLabel('Строй',{exact:true}).selectOption(id);const root=open.at(-1);await page.getByLabel('Тоника басового упражнения').selectOption(notes[root%12]);
    for(const[label,semitones]of intervals){
      await panel.getByRole('button',{name:label,exact:true}).click();await expect(page.getByLabel('Режим грифа')).toHaveValue('Интервалы');
      const displayed=await panel.locator('.bass-note-list strong').allTextContents();assert.deepEqual(displayed.map(toMidi),[root,root+semitones]);
      const expected=open.flatMap(m=>Array.from({length:21},(_,f)=>m+f)).filter(m=>m===root||m===root+semitones).sort((a,b)=>a-b);assert.deepEqual(await shownMidis(),expected,`${id}/${label}`);
    }
    await page.getByLabel('Ступени',{exact:true}).check();assert.ok((await page.locator('.fret.interval-target span').allTextContents()).every(n=>n==='8'));assert.ok((await page.locator('.fret:not(.interval-target) span').allTextContents()).every(n=>n==='1'));
    await panel.getByRole('button',{name:'Прима',exact:true}).click();assert.equal(await page.locator('.fret.interval-target').count(),0);
    await page.getByLabel('Ступени',{exact:true}).uncheck();
    for(const[name,formula]of Object.entries(scales)){
      await panel.locator('.bass-scales').getByRole('button',{name,exact:true}).click();await expect(page.getByLabel('Режим грифа')).toHaveValue(name);
      const displayed=await panel.locator('.bass-note-list strong').allTextContents();assert.deepEqual(displayed.map(toMidi),formula.map(n=>root+n),`${id}/${name} displayed`);
      const expected=open.flatMap(m=>Array.from({length:21},(_,f)=>m+f)).filter(m=>formula.includes((m-root+120)%12)).sort((a,b)=>a-b);assert.deepEqual(await shownMidis(),expected,`${id}/${name} highlighted`);
      await page.evaluate(()=>window.tones=[]);await panel.getByRole('button',{name:'Прослушать гамму',exact:true}).click();const tones=await page.evaluate(()=>window.tones);
      assert.equal(tones.length,formula.length);tones.forEach((tone,i)=>{assert.ok(Math.abs(tone.frequency-440*2**((root+formula[i]-69)/12))<.001);if(i>0)assert.ok(Math.abs(tone.time-tones[i-1].time-.65)<1e-6);});
      await panel.getByTitle('Остановить пример').click();assert.ok((await page.evaluate(()=>window.tones)).every(t=>t.cancelled));
    }
  }
  // Reproduce the old delayed-note bug: changing tonic must cancel both scheduled notes.
  await page.getByLabel('Строй',{exact:true}).selectOption('standard');await page.getByLabel('Тоника басового упражнения').selectOption('E');await page.evaluate(()=>window.tones=[]);await panel.getByRole('button',{name:'Квинта',exact:true}).click();await page.getByLabel('Тоника басового упражнения').selectOption('C');
  await page.waitForTimeout(750);const cancelled=await page.evaluate(()=>window.tones);assert.equal(cancelled.length,2);assert.ok(cancelled.every(t=>t.cancelled));assert.deepEqual((await panel.locator('.bass-note-list strong').allTextContents()).map(toMidi),[36,43]);
  await page.evaluate(()=>window.tones=[]);await panel.getByRole('button',{name:'Октава',exact:true}).click();await panel.locator('.bass-scales').getByRole('button',{name:'Мажор',exact:true}).click();assert.ok((await page.evaluate(()=>window.tones)).every(t=>t.cancelled));
  // Root search and changing the tonic via the shared fretboard stay in sync.
  await panel.getByRole('button',{name:'Найти тонику',exact:true}).click();await expect(page.getByLabel('Режим грифа')).toHaveValue('Только тоника');await page.getByLabel('Тоника',{exact:true}).selectOption('F♯');await expect(page.getByLabel('Тоника басового упражнения')).toHaveValue('F♯');
  await panel.getByRole('button',{name:'Октава',exact:true}).click();await page.getByLabel('Ступени',{exact:true}).check();await panel.getByRole('button',{name:'Показать на грифе',exact:true}).click();await expect(page.locator('#fretboard')).toBeInViewport();await expect(page.locator('.fret.interval-target span').first()).toHaveText('8');
  await mkdir('test-results',{recursive:true});await panel.screenshot({path:'test-results/bass-desktop.png'});await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/bass-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log('PASS: bass 4 strings/20 frets, 3 tunings × 7 intervals × 7 scales, actual MIDI highlights, octave degree 8, scheduled scale audio, stale-note cancellation, shared tonic and mobile');
}finally{await browser.close();}
