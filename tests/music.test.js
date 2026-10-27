import test from 'node:test';
import assert from 'node:assert/strict';
import {chords,notes,solos} from '../web/src/music.js';
import {tunings,chordVoicing,exerciseFor,frequency} from '../web/src/instruments.js';
const expected={ '':[0,4,7],m:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],sus2:[0,2,7],sus4:[0,5,7],'5':[0,7] };
for(const tuning of tunings.guitar)for(const name of Object.keys(chords))test(`${tuning.name}: ${name} has the correct sounding notes`,()=>{
  const match=name.match(/^([A-G]♯?)(.*)$/),root=notes.indexOf(match[1]);
  const voicing=chordVoicing(name,tuning),low=[...tuning.midi].reverse();
  const intervals=[...new Set(voicing.frets.flatMap((f,i)=>f<0?[]:[(low[i]+f-root+120)%12]))].sort((a,b)=>a-b);
  const allowed=expected[match[2]];assert.ok(intervals.every(i=>allowed.includes(i)));const required=allowed.filter(i=>!(match[2].includes('7')&&i===7));assert.ok(required.every(i=>intervals.includes(i)),JSON.stringify({name,intervals,required}));
  voicing.frets.forEach(f=>assert.ok(f>=-1&&f<=24));
  voicing.next.forEach(n=>assert.ok(chords[n]));
});
for(const tuning of tunings.guitar.filter(t=>t.drop))test(`${tuning.name}: power chord uses one finger`,()=>{for(const name of Object.keys(chords).filter(n=>n.endsWith('5'))){const f=chordVoicing(name,tuning).frets;assert.equal(f[0],f[1]);assert.equal(f[1],f[2]);assert.deepEqual(f.slice(3),[-1,-1,-1]);}});
for(const instrument of ['guitar','bass'])for(const tuning of tunings[instrument])for(const item of solos[instrument])test(`${instrument}/${tuning.id}: ${item.id} fits the instrument`,()=>{
  const exercise=exerciseFor(instrument,item.id,tuning);
  for(const[string,fret]of exercise.pattern){assert.ok(string>=0&&string<tuning.midi.length);assert.ok(fret>=0&&fret<=(instrument==='bass'?20:24));}
  if(item.id==='pent'){const root=notes.indexOf(exercise.root);for(const[s,f]of exercise.pattern)assert.ok([0,3,5,7,10].includes((tuning.midi[s]+f-root+120)%12));}
});
test('Bass standard includes E1',()=>assert.ok(Math.abs(frequency(tunings.bass[0].midi.at(-1))-41.20344)<.0001));
