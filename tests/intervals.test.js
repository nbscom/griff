import test from 'node:test';
import assert from 'node:assert/strict';
import {intervals,intervalStudy,intervalDegree,intervalPositions,closestIntervalPair,selectedMidi} from '../web/src/intervals.js';
import {tunings} from '../web/src/instruments.js';
import {notes} from '../web/src/music.js';
for(const instrument of ['guitar','bass'])for(const tuning of tunings[instrument])test(`${instrument}/${tuning.id}: selected string/fret anchors every ascending and descending interval`,()=>{
  const limit=instrument==='bass'?20:24;
  for(const string of [0,tuning.midi.length-1])for(const fret of [0,5,limit])for(const[,interval]of intervals)for(const direction of [1,-1]){
    const anchor={string,fret},tonic=tuning.midi[string]+fret,study=intervalStudy(tuning,notes[tonic%12],'Интервалы',interval,{anchor,direction});
    assert.equal(study.tonic,tonic);assert.equal(study.target,tonic+direction*interval);
    const positions=intervalPositions(tuning,study),pair=closestIntervalPair(positions,study,anchor);
    assert.equal(pair.root.string,string);assert.equal(pair.root.fret,fret);
    if(pair.target)assert.equal(tuning.midi[pair.target.string]+pair.target.fret,study.target);
    else assert.ok(tuning.midi.every(open=>study.target<open||study.target>open+limit));
    assert.equal(intervalDegree(tonic,study),'1');
    if(interval===12)assert.equal(intervalDegree(study.target,study),'8');
  }
});
test('Guitar B3 open-string fifth is F♯4, not a fifth from B2',()=>{
  const tuning=tunings.guitar[0],study=intervalStudy(tuning,'B','Интервалы',7,{anchor:{string:1,fret:0}});
  assert.deepEqual(study.midis,[59,66]);
});
test('Bass E2 at fret 12 stays in that octave when the interval changes',()=>{
  const tuning=tunings.bass[0],anchor={string:3,fret:12};
  assert.deepEqual(intervalStudy(tuning,'E','Интервалы',3,{anchor}).midis,[40,43]);
  assert.deepEqual(intervalStudy(tuning,'E','Интервалы',12,{anchor}).midis,[40,52]);
});
test('Upper/lower edge never aliases an unavailable target into another octave',()=>{
  const tuning=tunings.guitar[0],anchor={string:0,fret:24};
  const up=intervalStudy(tuning,'E','Интервалы',12,{anchor});assert.deepEqual(up.midis,[88,100]);assert.equal(closestIntervalPair(intervalPositions(tuning,up),up,anchor).target,null);
  const down=intervalStudy(tuning,'E','Интервалы',12,{anchor,direction:-1});assert.deepEqual(down.midis,[88,76]);assert.ok(closestIntervalPair(intervalPositions(tuning,down),down,anchor).target);
});
test('Invalid position does not read a missing string or use an out-of-bounds fret',()=>{
  for(const anchor of [null,{string:6,fret:0},{string:0,fret:25},{string:-1,fret:0},{string:0,fret:-1}])assert.equal(selectedMidi(tunings.guitar[0],anchor),null);
});
