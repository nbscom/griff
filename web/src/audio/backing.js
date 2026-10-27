import {soundContext,scheduleTone,beatSeconds} from './sound';
import {rootMidi,chordIntervals} from '../practice';
const noiseCache=new WeakMap();
function drum(ctx,time,type){
  const gain=ctx.createGain();gain.connect(ctx.destination);
  if(type==='kick'){
    const osc=ctx.createOscillator();osc.frequency.setValueAtTime(145,time);osc.frequency.exponentialRampToValueAtTime(42,time+.15);gain.gain.setValueAtTime(.3,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.2);osc.connect(gain);osc.start(time);osc.stop(time+.21);osc.onended=()=>{osc.disconnect();gain.disconnect();};return osc;
  }
  if(!noiseCache.has(ctx)){const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;noiseCache.set(ctx,buffer);}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=noiseCache.get(ctx);filter.type=type==='hat'?'highpass':'bandpass';filter.frequency.value=type==='hat'?6500:1600;filter.Q.value=.7;source.connect(filter);filter.connect(gain);
  const duration=type==='hat'?.045:.14;gain.gain.setValueAtTime(type==='hat'?.065:.2,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);source.start(time);source.stop(time+duration+.005);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return source;
}
export function startBacking({sequence,bpm,meter,tracks,onPosition}){
  const ctx=soundContext(),steps=meter==='4/4'?8:6,stepSeconds=beatSeconds(bpm,meter)/(meter==='6/8'?1:2);
  const bars=sequence.flatMap((item,index)=>Array.from({length:item.bars},(_,bar)=>({chord:item.chord,index,bar}))),pending=[],nodes=new Set();
  let time=ctx.currentTime+.05,tick=0,barIndex=0,frame;
  const add=node=>{nodes.add(node);node.addEventListener('ended',()=>nodes.delete(node));};
  function schedule(){
    while(time<ctx.currentTime+.1){
      const bar=bars[barIndex],root=rootMidi(bar.chord,28);
      if(tracks.drums){add(drum(ctx,time,'hat'));if(tick===0||meter==='4/4'&&tick===4)add(drum(ctx,time,'kick'));if(meter==='6/8'?tick===3:meter==='4/4'?tick===2||tick===6:tick===2)add(drum(ctx,time,'snare'));}
      if(tracks.bass&&(tick===0||tick===Math.floor(steps/2)||tick===steps-1))add(scheduleTone(ctx,time,root+(tick===steps-1?7:0),stepSeconds*1.6,undefined,.9));
      if(tracks.chords&&tick===0)chordIntervals(bar.chord).forEach((interval,i)=>add(scheduleTone(ctx,time+i*.018,root+24+interval,Math.min(2.5,steps*stepSeconds*.85),undefined,.28)));
      pending.push({time,index:bar.index,bar:bar.bar,beat:tick});time+=stepSeconds;tick++;
      if(tick===steps){tick=0;barIndex=(barIndex+1)%bars.length;}
    }
  }
  function draw(){while(pending.length&&pending[0].time<=ctx.currentTime)onPosition(pending.shift());frame=requestAnimationFrame(draw);}
  schedule();const timer=setInterval(schedule,25);frame=requestAnimationFrame(draw);
  return()=>{clearInterval(timer);cancelAnimationFrame(frame);nodes.forEach(node=>{try{node.stop();}catch{}});pending.length=0;};
}
