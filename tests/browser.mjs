import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base=process.env.TEST_URL||'http://localhost:5174/griff/';
const temporary=await mkdtemp(join(tmpdir(),'griff-audio-'));
function wav(hz){const rate=48000,seconds=6,count=rate*seconds,b=Buffer.alloc(44+count*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(count*2,40);for(let i=0;i<count;i++)b.writeInt16LE(Math.round(8000*Math.sin(2*Math.PI*hz*i/rate)),44+i*2);return b;}
const capture=join(temporary,'e1.wav');await writeFile(capture,wav(41.2034446));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${capture}`]});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  window.inputRequests=[];window.scheduledClicks=[];
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async constraints=>{window.inputRequests.push(constraints);const stream=await original(constraints);window.capturedStream=stream;return stream;};
  const prototype=(window.AudioContext||window.webkitAudioContext).prototype;
  const create=prototype.createOscillator;
  prototype.createOscillator=function(){const oscillator=create.call(this),start=oscillator.start.bind(oscillator);oscillator.start=time=>{window.scheduledClicks.push({time,frequency:oscillator.frequency.value});start(time);};return oscillator;};
});
try{
  await page.goto(base);await expect(page.getByRole('heading',{name:'Практика.',exact:true})).toBeVisible();
  assert.equal(await page.getByText('Твои 30 минут',{exact:true}).count(),0);
  assert.equal(await page.getByText('Звук, к которому идём',{exact:true}).count(),0);
  await page.getByLabel('Поиск аккорда').fill('Bm');await page.locator('.chord-selector button').filter({hasText:/^Bm$/}).click();await expect(page.locator('.chord-title strong')).toHaveText('Bm');
  await page.getByLabel('Строй',{exact:true}).selectOption('drop-d');await page.getByRole('button',{name:'Пауэр-аккорды',exact:true}).click();await page.locator('.chord-selector button').filter({hasText:/^D5$/}).click();
  await expect(page.locator('.voicing-tip')).toContainText('один палец');
  assert.equal(await page.locator('.current-chord .string-mark').filter({hasText:'○'}).count(),3);
  await page.getByLabel('Строй',{exact:true}).selectOption('drop-cs');await expect(page.locator('.fret-caption .tuning')).toContainText('C♯2');
  await page.getByRole('button',{name:'Бас-гитара',exact:true}).click();assert.equal(await page.locator('.fret-string').count(),4);assert.equal(await page.locator('.fret-string').first().locator('.fret').count(),21);assert.equal(await page.locator('.chord-library').count(),0);
  await page.getByRole('button',{name:'Квинта',exact:true}).click();await expect(page.getByLabel('Режим грифа')).toHaveValue('Интервалы');
  await page.getByRole('button',{name:'Натуральный минор',exact:true}).click();await expect(page.getByLabel('Режим грифа')).toHaveValue('Натуральный минор');
  await page.getByLabel('Строй',{exact:true}).selectOption('eb');await expect(page.locator('.tuner-strings button').last()).toContainText('D♯1');
  await page.getByLabel('Строй',{exact:true}).selectOption('standard');
  assert.equal(await page.evaluate(()=>window.inputRequests.length),0);
  await page.getByRole('button',{name:'Подключить',exact:true}).click();
  const constraints=await page.evaluate(()=>window.inputRequests[0]);for(const key of ['echoCancellation','noiseSuppression','autoGainControl'])assert.equal(constraints.audio[key],false);
  await context.grantPermissions(['microphone']);
  await expect(page.locator('.connection-status')).toHaveText('Вход подключён',{timeout:15000});
  await expect(page.locator('.tuner-reading>span')).toContainText('41.20',{timeout:15000});
  await expect(page.locator('.tuner-target>strong')).toHaveText('E1');await expect(page.locator('.tuner-target>span')).toContainText('Струна 4');
  await expect(page.locator('.tuner-display')).toHaveClass(/in-tune/);
  const actualSettings=await page.evaluate(()=>window.capturedStream.getAudioTracks()[0].getSettings());for(const key of ['echoCancellation','noiseSuppression','autoGainControl'])assert.equal(actualSettings[key],false);
  await page.evaluate(()=>window.capturedStream.getAudioTracks()[0].enabled=false);await expect(page.getByText(/Нет сигнала\./)).toBeVisible({timeout:7000});
  await page.evaluate(()=>window.capturedStream.getAudioTracks()[0].enabled=true);await expect(page.locator('.tuner-reading>span')).toContainText('41.20',{timeout:10000});
  const specificDevice=await page.locator('select[aria-label="Устройство ввода"] option').evaluateAll(options=>options.find(o=>o.value&&o.value!=='default')?.value);
  assert.ok(specificDevice);await page.getByLabel('Устройство ввода').selectOption(specificDevice);await expect.poll(()=>page.evaluate(()=>window.inputRequests.length)).toBe(2);await expect(page.locator('.connection-status')).toHaveText('Вход подключён');assert.equal(await page.evaluate(()=>window.inputRequests[1].audio.deviceId.exact),specificDevice);
  await page.getByRole('button',{name:'Отключить',exact:true}).click();await expect(page.locator('.connection-status')).toHaveText('Вход выключен');
  await page.getByLabel('Темп',{exact:true}).fill('120');await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Включить метроном',exact:true}).click();
  await expect.poll(async()=>page.evaluate(()=>window.scheduledClicks.length)).toBeGreaterThan(4);
  const clicks=await page.evaluate(()=>window.scheduledClicks);for(let i=1;i<5;i++)assert.ok(Math.abs(clicks[i].time-clicks[i-1].time-.5)<1e-6);
  assert.equal(clicks[0].frequency,1300);assert.equal(clicks[1].frequency,650);assert.equal(clicks[4].frequency,1300);
  await page.getByRole('button',{name:'Остановить метроном',exact:true}).click();
  await page.getByLabel('Размер',{exact:true}).selectOption('6/8');await page.getByLabel('Темп',{exact:true}).fill('90');await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Включить метроном',exact:true}).click();
  await expect.poll(async()=>page.evaluate(()=>window.scheduledClicks.length)).toBeGreaterThan(5);const compound=await page.evaluate(()=>window.scheduledClicks);assert.ok(Math.abs(compound[1].time-compound[0].time-60/90/3)<1e-6);assert.equal(compound[3].frequency,950);assert.equal(await page.locator('.beat-lights>span').count(),6);
  await page.getByRole('button',{name:'Остановить метроном',exact:true}).click();
  const expectedTap=await page.evaluate(async()=>{const button=document.querySelector('.tap-button');button.click();const start=performance.now();await new Promise(resolve=>setTimeout(resolve,500));button.click();return 60000/(performance.now()-start);});const tapped=Number(await page.getByLabel('Темп',{exact:true}).inputValue());assert.ok(Math.abs(tapped-expectedTap)<2,JSON.stringify({tapped,expectedTap}));
  await page.getByRole('button',{name:'Электрогитара',exact:true}).click();await page.getByRole('button',{name:'Hammer-on / pull-off',exact:true}).click();await page.getByRole('button',{name:'Слушать по кругу',exact:true}).click();await expect(page.locator('.tab-cell.sounding')).toHaveCount(6);await page.getByRole('button',{name:'Остановить упражнение',exact:true}).click();
  // A–B, count-in and automatic tempo use the actual Web Audio schedule.
  await page.getByLabel('Размер',{exact:true}).selectOption('4/4');await page.getByLabel('Темп упражнения',{exact:true}).fill('210');await page.getByLabel('Начало петли').selectOption('2');await page.getByLabel('Конец петли').selectOption('3');await page.getByLabel('Отсчёт: 1 такт').check();await page.getByLabel('+5 BPM каждые 3 круга',{exact:true}).check();await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Слушать по кругу',exact:true}).click();
  await expect(page.locator('.loop-controls .section-caption')).toContainText('отсчёт');await expect(page.locator('.loop-controls .section-caption')).toHaveText(/21[5-9] BPM|220 BPM/,{timeout:10000});await page.getByRole('button',{name:'Остановить упражнение',exact:true}).click();
  const loopAudio=await page.evaluate(()=>window.scheduledClicks);assert.deepEqual(loopAudio.slice(0,4).map(n=>n.frequency),[1300,650,650,650]);assert.ok(loopAudio.slice(4).every(n=>[69,72].includes(Math.round(69+12*Math.log2(n.frequency/440)))));
  // Editable accompaniment, track isolation, ordering and persistent favorites.
  await page.getByLabel('Заготовка аккомпанемента').selectOption('0');await page.getByLabel('Ударные',{exact:true}).uncheck();await page.getByLabel('Аккорды',{exact:true}).uncheck();await page.getByLabel('Темп аккомпанемента',{exact:true}).fill('120');await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Играть по кругу',exact:true}).click();await expect(page.locator('.progression-item.playing-chord')).toHaveCount(1);const backingNotes=await page.evaluate(()=>window.scheduledClicks);assert.ok(backingNotes.length>0);assert.ok(Math.abs(backingNotes[0].frequency-41.2034446)<.001);await page.getByRole('button',{name:'Остановить аккомпанемент',exact:true}).click();
  await page.getByLabel('Аккорд 1',{exact:true}).selectOption('Am');await page.getByLabel('Такты аккорда 1',{exact:true}).selectOption('2');await page.getByTitle('Сдвинуть аккорд 1 вправо',{exact:true}).click();await expect(page.getByLabel('Аккорд 2',{exact:true})).toHaveValue('Am');await page.getByLabel('Название последовательности').fill('Мой рок');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('.saved-progressions')).toContainText('Мой рок');
  await page.getByLabel('Заготовка аккомпанемента').selectOption('1');await page.getByRole('button',{name:'★ Мой рок',exact:true}).click();await expect(page.getByLabel('Аккорд 2',{exact:true})).toHaveValue('Am');
  // Note quiz: the first attempt is counted once, even after a correction.
  await page.getByLabel('Струна тренировки').selectOption('0');
  const noteMidi=label=>{const match=label.match(/^([A-G]♯?)(-?\d+)$/);return (Number(match[2])+1)*12+['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'].indexOf(match[1]);};
  let target=noteMidi(await page.locator('.quiz-question strong').textContent())-64;
  await page.getByRole('button',{name:`Ответ: 1 струна, ${target===0?1:0} лад`,exact:true}).click();await expect(page.locator('.quiz-footer .wrong-feedback')).toBeVisible();await page.getByRole('button',{name:`Ответ: 1 струна, ${target} лад`,exact:true}).click();await expect(page.locator('.training-panel>.section-top .section-caption')).toContainText('0/1');
  await page.getByRole('button',{name:'Следующее задание',exact:true}).click();target=noteMidi(await page.locator('.quiz-question strong').textContent())-64;await page.getByRole('button',{name:`Ответ: 1 струна, ${target} лад`,exact:true}).click();await expect(page.locator('.training-panel>.section-top .section-caption')).toContainText('1/2');
  // Derive the ear answer from the two scheduled pitches, not hidden UI state.
  const intervalLabels={3:'Малая терция',4:'Большая терция',5:'Кварта',7:'Квинта',10:'Малая септима',12:'Октава'};
  await page.getByRole('button',{name:'Интервалы на слух',exact:true}).click();await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Слушать задание',exact:true}).click();let earAudio=await page.evaluate(()=>window.scheduledClicks);let semitones=Math.round(12*Math.log2(earAudio[1].frequency/earAudio[0].frequency));await page.locator('.ear-answers').getByRole('button',{name:intervalLabels[semitones],exact:true}).click();await expect(page.locator('.quiz-footer .correct-feedback')).toHaveText(/Верно/);
  await page.getByRole('button',{name:'Следующее задание',exact:true}).click();await page.getByLabel('Звучание интервала').selectOption('harmonic');await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Слушать задание',exact:true}).click();earAudio=await page.evaluate(()=>window.scheduledClicks);assert.equal(earAudio[0].time,earAudio[1].time);semitones=Math.round(12*Math.log2(earAudio[1].frequency/earAudio[0].frequency));await page.locator('.ear-answers').getByRole('button',{name:intervalLabels[semitones===3?4:3],exact:true}).click();await expect(page.locator('.training-panel>.section-top .section-caption')).toContainText('1/2');
  await page.getByRole('button',{name:'Аккорды на слух',exact:true}).click();await page.evaluate(()=>window.scheduledClicks=[]);await page.getByRole('button',{name:'Слушать задание',exact:true}).click();earAudio=await page.evaluate(()=>window.scheduledClicks);const quality=earAudio.length===2?'Пауэр':earAudio.length===4?'Доминантсептаккорд':Math.round(12*Math.log2(earAudio[1].frequency/earAudio[0].frequency))===3?'Минор':'Мажор';await page.locator('.ear-answers').getByRole('button',{name:quality,exact:true}).click();await expect(page.locator('.training-panel>.section-top .section-caption')).toContainText('1/1');
  // A real virtual E1 stream must answer the bass USB quiz and light up the fretboard.
  await page.evaluate(()=>{window.originalRandom=Math.random;Math.random=()=>0;});await page.getByRole('button',{name:'Бас-гитара',exact:true}).click();await page.getByLabel('Струна тренировки').selectOption('0');await page.getByLabel('Способ ответа').selectOption('usb');await page.getByLabel('Струна тренировки').selectOption('3');await expect(page.locator('.quiz-question strong')).toHaveText('E1');await page.getByRole('button',{name:'Подключить',exact:true}).click();await expect(page.locator('.quiz-footer .correct-feedback')).toContainText('Верно',{timeout:15000});await expect(page.locator('.live-note-label')).toHaveText('USB: E1');await expect(page.locator('.fret.input-note')).toHaveCount(1);await page.getByRole('button',{name:'Отключить',exact:true}).click();await page.evaluate(()=>Math.random=window.originalRandom);
  // Reload must restore settings, scores and saved sequence, never reopen the mic.
  await page.getByLabel('Строй',{exact:true}).selectOption('eb');await page.getByLabel('Темп',{exact:true}).fill('95');await page.getByLabel('Размер',{exact:true}).selectOption('3/4');const savedStats=await page.evaluate(()=>localStorage.getItem('griff:stats:v1'));await page.reload();await expect(page.getByLabel('Строй',{exact:true})).toHaveValue('eb');await expect(page.getByLabel('Темп',{exact:true})).toHaveValue('95');await expect(page.getByLabel('Размер',{exact:true})).toHaveValue('3/4');assert.equal(await page.locator('.fret-string').count(),4);assert.equal(await page.evaluate(()=>localStorage.getItem('griff:stats:v1')),savedStats);await expect(page.locator('.saved-progressions')).toContainText('Мой рок');await expect(page.locator('.connection-status')).toHaveText('Вход выключен');await page.getByLabel('Режим грифа').selectOption('Блюзовая гамма');await page.getByLabel('Ступени',{exact:true}).check();await expect(page.locator('.fret.root-note span').first()).toHaveText('1');
  console.log('PASS: A–B/count-in/tempo ramp; backing tracks/editor/favorites; first-attempt scoring; interval/chord ear training; USB E1 quiz and live fretboard; reload persistence and extra scales');
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  for(const width of [390,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: tuning, 42 chords, bass/20 frets, scales, microphone request, raw audio constraints, production AudioWorklet/E1, tuner, metronome timestamps/accents/6/8, tap tempo, solo, mobile');
  const deniedBrowser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream']});
  try{const deniedContext=await deniedBrowser.newContext(),denied=await deniedContext.newPage();await denied.goto(base);await denied.getByRole('button',{name:'Подключить',exact:true}).click();await expect(denied.getByRole('alert')).toContainText('Доступ к микрофону запрещён');await deniedContext.close();console.log('PASS: denied microphone permission has actionable message');}finally{await deniedBrowser.close();}
}finally{await browser.close();}
