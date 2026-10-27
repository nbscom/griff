import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:5174/griff/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const chromatic=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const midi=label=>{const m=label.match(/^([A-G]♯?)(-?\d+)$/);return(Number(m[2])+1)*12+chromatic.indexOf(m[1]);};
const intervalNames=['Прима','Малая секунда','Большая секунда','Малая терция','Большая терция','Кварта','Тритон','Квинта','Малая секста','Большая секста','Малая септима','Большая септима','Октава'];
const panel=page.locator('.instrument-studies');
async function choose(string,fret){await panel.getByRole('button',{name:new RegExp(`^Выбрать ноту: ${string+1} струна, ${fret} лад,`)}).click();}
async function assertStudy(source,target){
  const values=(await panel.locator('.bass-note-list strong').allTextContents()).map(midi);assert.deepEqual(values,[source,target]);
  const positions=await panel.locator('.bass-position-root,.bass-position-target').evaluateAll(cells=>cells.map(cell=>cell.getAttribute('aria-label').split(', ')[2]));assert.ok(positions.map(midi).every(m=>m===source||m===target));
}
try{
  await page.goto(base);
  await expect(panel.getByRole('region',{name:'Интервал на гитарном грифе'})).toBeVisible();assert.equal(await panel.locator('.bass-board-row').count(),6);assert.equal(await panel.locator('.bass-board-row').first().locator('.bass-position').count(),25);
  // Select a particular physical B3, then vary the interval without falling to B2.
  await choose(1,0);await expect(panel.locator('.selected-note-summary')).toContainText('B3 · 2 струна, 0 лад');
  for(let value=0;value<=12;value++){await panel.getByRole('button',{name:intervalNames[value],exact:true}).click();await assertStudy(59,59+value);await expect(panel.getByRole('button',{name:'Выбрать ноту: 2 струна, 0 лад, B3',exact:true})).toHaveAttribute('aria-pressed','true');}
  await page.getByLabel('Направление интервала',{exact:true}).selectOption('-1');await assertStudy(59,47);
  await page.getByLabel('Направление интервала',{exact:true}).selectOption('1');await choose(5,7);await assertStudy(47,59);
  // Clicking another fret, even on the same pitch class, changes the actual source octave.
  await choose(5,19);await assertStudy(59,71);
  await choose(0,24);await assertStudy(88,100);await expect(panel.getByRole('status')).toContainText('вне диапазона');assert.equal(await panel.locator('.bass-position-target').count(),0);
  await panel.locator('.bass-scales').getByRole('button',{name:'Мажор',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Часть гаммы вне диапазона');await panel.getByRole('button',{name:'Октава',exact:true}).click();await page.getByLabel('Направление интервала',{exact:true}).selectOption('-1');await assertStudy(88,76);await expect(panel.getByRole('status')).toHaveCount(0);assert.ok(await panel.locator('.bass-position-target').count()>0);
  // Every tuning uses the clicked string's real open pitch, and changing tuning clears selection.
  const guitarTunings=[['standard',40],['drop-d',38],['eb',39],['drop-cs',37]];
  for(const[id,low]of guitarTunings){await page.getByLabel('Строй',{exact:true}).selectOption(id);assert.equal(await panel.locator('.selected-origin').count(),0);await choose(5,12);await panel.getByRole('button',{name:'Квинта',exact:true}).click();await assertStudy(low+12,low+19);}
  await page.getByRole('button',{name:'Бас-гитара',exact:true}).click();assert.equal(await panel.locator('.bass-board-row').count(),4);assert.equal(await panel.locator('.bass-board-row').first().locator('.bass-position').count(),21);
  for(const[id,low]of [['standard',28],['drop-d',26],['eb',27]]){await page.getByLabel('Строй',{exact:true}).selectOption(id);await choose(3,12);await panel.getByRole('button',{name:'Квинта',exact:true}).click();await assertStudy(low+12,low+19);}
  await page.getByLabel('Строй',{exact:true}).selectOption('standard');await choose(3,12);
  for(let value=0;value<=12;value++){await panel.getByRole('button',{name:intervalNames[value],exact:true}).click();await assertStudy(40,40+value);}
  // The full board provides the same click-note -> choose-interval workflow locally.
  await page.getByRole('button',{name:'Электрогитара',exact:true}).click();await page.getByRole('button',{name:'1 струна, 5 лад, A4',exact:true}).click();await page.getByLabel('Интервал от выбранной ноты').selectOption('7');await assertStudy(69,76);await expect(page.locator('.fret.selected-origin')).toHaveAttribute('aria-label','1 струна, 5 лад, A4');
  await page.getByLabel('Направление на полном грифе').selectOption('-1');await assertStudy(69,62);
  await page.getByRole('button',{name:'Бас-гитара',exact:true}).click();await page.getByRole('button',{name:'4 струна, 12 лад, E2',exact:true}).click();await page.getByLabel('Интервал от выбранной ноты').selectOption('12');await assertStudy(40,52);await page.getByLabel('Ступени',{exact:true}).check();assert.ok((await page.locator('.fret.interval-target span').allTextContents()).every(s=>s==='8'));
  await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();await choose(2,7);await panel.getByRole('button',{name:'Малая терция',exact:true}).click();await assertStudy(40,43);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mkdir('test-results',{recursive:true});await panel.screenshot({path:'test-results/select-note-bass.png'});await page.getByRole('button',{name:'Электрогитара',exact:true}).click();await choose(1,5);await panel.getByRole('button',{name:'Квинта',exact:true}).click();await assertStudy(64,71);await panel.screenshot({path:'test-results/select-note-guitar.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log('PASS: click note then choose all 13 intervals, guitar/bass, exact source position/octave, all 7 tunings, both directions, unavailable target, full board integration and mobile');
}finally{await browser.close();}
