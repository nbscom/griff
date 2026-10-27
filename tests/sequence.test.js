import test from 'node:test';
import assert from 'node:assert/strict';
import {startSequence} from '../web/src/audio/sound.js';
let now=0,interval,frame;const scheduled=[];
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
class Context{
 get currentTime(){return now;}resume(){}destination={};
 createOscillator(){const oscillator={type:'',frequency:param(),connect(){},disconnect(){},addEventListener(){},start(time){scheduled.push({time,frequency:this.frequency.value,node:this});},stop(time){if(time===undefined)this.cancelled=true;}};return oscillator;}
 createGain(){return {gain:param(),connect(){},disconnect(){}};}
}
globalThis.window={AudioContext:Context};globalThis.setInterval=callback=>(interval=callback,1);globalThis.clearInterval=()=>{interval=null;};globalThis.requestAnimationFrame=callback=>(frame=callback,1);globalThis.cancelAnimationFrame=()=>{frame=null;};
function advance(end){while(now<end){now+=.025;interval?.();frame?.();}}
test('Count-in is one bar and A–B pattern repeats only the provided notes',()=>{
  const steps=[];const stop=startSequence({bpm:120,meter:'4/4',pattern:[[0,3],[0,5]],tuning:[64],countIn:1,onStep:index=>steps.push(index)});
  advance(3);
  assert.deepEqual(scheduled.slice(0,4).map(n=>n.frequency),[1300,650,650,650]);
  assert.ok(Math.abs(scheduled[4].time-2.05)<1e-8);
  const midi=hz=>Math.round(69+12*Math.log2(hz/440));assert.deepEqual(scheduled.slice(4,8).map(n=>midi(n.frequency)),[67,69,67,69]);assert.ok(steps.includes(-2));stop();assert.ok(scheduled.every(n=>n.node.cancelled));
});
test('Tempo rises only at the configured loop boundary and stays capped',()=>{
  now=0;scheduled.length=0;const tempos=[],loops=[];
  const stop=startSequence({bpm:120,meter:'4/4',pattern:[[0,0],[0,2]],tuning:[64],ramp:{every:3,step:5,max:125},onLoop:n=>loops.push(n),onTempo:n=>tempos.push(n)});
  advance(4);
  assert.equal(tempos[0],120);assert.ok(tempos.includes(125));assert.ok(tempos.every(n=>n<=125));assert.deepEqual(loops.slice(0,3),[1,2,3]);
  for(let i=1;i<6;i++)assert.ok(Math.abs(scheduled[i].time-scheduled[i-1].time-.25)<1e-8);
  assert.ok(Math.abs(scheduled[7].time-scheduled[6].time-.24)<1e-8);
  stop();const count=scheduled.length;advance(5);assert.equal(scheduled.length,count);
});
