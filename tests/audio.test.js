import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPitch} from '../web/src/audio/pitch.js';
import {beatSeconds} from '../web/src/audio/sound.js';
function signal(hz,sampleRate,kind='clean',amplitude=.2){return Float32Array.from({length:8192},(_,i)=>{const t=i/sampleRate;return amplitude*(Math.sin(2*Math.PI*hz*t)+(kind==='harmonic'?.65*Math.sin(4*Math.PI*hz*t)+.3*Math.sin(6*Math.PI*hz*t):0));});}
for(const rate of [44100,48000,96000]){
  for(const hz of [36.7081,38.8909,41.2034,55,82.4069,110,196,329.6276,659.2551,1174.659]){
    for(const kind of ['clean','harmonic'])test(`YIN ${hz} Hz, ${rate} Hz, ${kind}`,()=>{
      const result=detectPitch(signal(hz,rate,kind),rate);
      assert.ok(result.frequency,JSON.stringify(result));
      assert.ok(Math.abs(1200*Math.log2(result.frequency/hz))<5,JSON.stringify({hz,...result}));
      assert.ok(result.confidence>.85);
    });
  }
}
test('Silence and quiet input are unpitched',()=>{for(const amplitude of [0,.0005])assert.equal(detectPitch(signal(41.2034,48000,'clean',amplitude),48000).frequency,null);});
test('Broadband noise is unpitched',()=>{let seed=42;const noise=Float32Array.from({length:8192},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed/2**32-.5)*.5;});assert.equal(detectPitch(noise,48000).frequency,null);});
test('Sample-accurate beat durations include compound meter',()=>{assert.equal(beatSeconds(120,'4/4'),.5);assert.equal(beatSeconds(120,'3/4'),.5);assert.equal(beatSeconds(60,'6/8'),1/3);});
