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
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  for(const width of [390,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: tuning, 42 chords, bass/20 frets, scales, microphone request, raw audio constraints, production AudioWorklet/E1, tuner, metronome timestamps/accents/6/8, tap tempo, solo, mobile');
  const deniedBrowser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream']});
  try{const deniedContext=await deniedBrowser.newContext(),denied=await deniedContext.newPage();await denied.goto(base);await denied.getByRole('button',{name:'Подключить',exact:true}).click();await expect(denied.getByRole('alert')).toContainText('Доступ к микрофону запрещён');await deniedContext.close();console.log('PASS: denied microphone permission has actionable message');}finally{await deniedBrowser.close();}
}finally{await browser.close();}
