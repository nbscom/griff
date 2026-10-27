import test from 'node:test';
import assert from 'node:assert/strict';
import {bassStudy,bassIntervals,bassIntervalDegree,bassIntervalPositions,closestBassIntervalPair} from '../web/src/bass.js';
import {tunings} from '../web/src/instruments.js';
import {notes} from '../web/src/music.js';
const formulas={
  'Минорная пентатоника':[0,3,5,7,10,12],
  'Натуральный минор':[0,2,3,5,7,8,10,12],
  'Мажор':[0,2,4,5,7,9,11,12],
  'Блюзовая гамма':[0,3,5,6,7,10,12],
  'Мажорная пентатоника':[0,2,4,7,9,12],
  'Дорийский лад':[0,2,3,5,7,9,10,12],
  'Миксолидийский лад':[0,2,4,5,7,9,10,12],
};
for(const tuning of tunings.bass)for(const root of notes)test(`${tuning.name}/${root}: intervals and scales match the selected sounding tonic`,()=>{
  const tonic=bassStudy(tuning,root,'Только тоника',0).tonic,low=tuning.midi.at(-1);
  assert.equal(tonic%12,notes.indexOf(root));assert.ok(tonic>=low&&tonic<low+12);
  for(const[name,semitones]of bassIntervals){const study=bassStudy(tuning,root,'Интервалы',semitones);assert.equal(study.title,name);assert.deepEqual(study.midis,[tonic,tonic+semitones]);const positions=bassIntervalPositions(tuning,study),pair=closestBassIntervalPair(positions,study);assert.equal(pair.root.midi,tonic);assert.equal(pair.target.midi,tonic+semitones);assert.ok(Math.abs(pair.root.fret-pair.target.fret)<=5);assert.ok(positions.every(p=>p.fret>=0&&p.fret<=20));}
  for(const[mode,steps]of Object.entries(formulas)){
    const study=bassStudy(tuning,root,mode,0);assert.deepEqual(study.midis.map(m=>m-tonic),steps);
    study.midis.forEach(m=>assert.ok(tuning.midi.some(open=>m>=open&&m<=open+20),`unplayable MIDI ${m}`));
  }
});
test('Octave and unison have distinct registers and degree labels',()=>{
  const octave=bassStudy(tunings.bass[0],'E','Интервалы',12),unison=bassStudy(tunings.bass[0],'E','Интервалы',0);
  assert.deepEqual(octave.midis,[28,40]);assert.deepEqual(unison.midis,[28,28]);
  assert.equal(bassIntervalDegree(28,octave),'1');assert.equal(bassIntervalDegree(40,octave),'8');assert.equal(bassIntervalDegree(52,octave),null);
});
