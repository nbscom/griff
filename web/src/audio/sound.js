let context;
export function soundContext(){
  context ||= new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  context.resume();return context;
}
export function playTone(midi,duration=.35){
  const ctx=soundContext();return scheduleTone(ctx,ctx.currentTime,midi,duration);
}
export function scheduleTone(ctx,time,midi,duration,accent,level=1){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=accent!==undefined?'sine':'triangle';
  osc.frequency.value=accent!==undefined ? (accent===2?1300:accent===1?950:650) : 440*2**((midi-69)/12);
  const volume=accent!==undefined?(accent===2?.23:accent===1?.16:.10):.12;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume*level,time+.002);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(time);osc.stop(time+duration+.005);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
  return osc;
}
export const beatSeconds=(bpm,meter)=>60/bpm/(meter==='6/8'?3:1);
// JS wakes every 25 ms; sound is scheduled on the audio clock 100 ms ahead.
export function previewNotes(midis,simultaneous=false){
  const ctx=soundContext(),now=ctx.currentTime+.03;
  const nodes=midis.map((midi,i)=>scheduleTone(ctx,now+(simultaneous?0:i*.65),midi,.55));
  return ()=>nodes.forEach(node=>{try{node.stop();}catch{}});
}
export function startSequence({bpm,meter='4/4',pattern,tuning,rest=0,onStep,countIn=0,ramp,onTempo,onLoop}){
  const ctx=soundContext();let nextTime=ctx.currentTime+.05,stopped=false,currentBpm=bpm,loops=0;
  const pending=[],oscillators=new Set();
  const beats=meter==='3/4'?3:meter==='6/8'?6:4;
  let index=pattern?-beats*countIn:0;
  const total=pattern?pattern.length+rest*(meter==='6/8'?3:2):beats;
  function schedule(){
    if(stopped)return;
    while(nextTime<ctx.currentTime+.1){
      let osc;
      const counting=index<0;
      if(counting)osc=scheduleTone(ctx,nextTime,0,.035,(-index)%beats===0?2:0);
      else if(pattern){if(index<pattern.length){const[s,f]=pattern[index];osc=scheduleTone(ctx,nextTime,tuning[s]+f,Math.min(.55,beatSeconds(currentBpm,meter)*.45));}}
      else osc=scheduleTone(ctx,nextTime,0,.035,index===0?2:meter==='6/8'&&index===3?1:0);
      if(osc){oscillators.add(osc);osc.addEventListener('ended',()=>oscillators.delete(osc));}
      pending.push({time:nextTime,index:counting?-2:pattern&&index>=pattern.length?-1:index});
      const duration=pattern&&!counting?beatSeconds(currentBpm,meter)/(meter==='6/8'?1:2):beatSeconds(currentBpm,meter);
      nextTime+=duration;index++;
      if(index>=total){
        index=0;if(pattern){loops++;if(ramp&&loops%ramp.every===0)currentBpm=Math.min(ramp.max,currentBpm+ramp.step);pending.push({time:nextTime,loop:loops,tempo:currentBpm});}
      }
    }
  }
  let frame;
  function draw(){while(pending.length&&pending[0].time<=ctx.currentTime){const event=pending.shift();if(event.index!==undefined)onStep?.(event.index);if(event.loop){onLoop?.(event.loop);onTempo?.(event.tempo);}}frame=requestAnimationFrame(draw);}
  onTempo?.(currentBpm);schedule();const timer=setInterval(schedule,25);frame=requestAnimationFrame(draw);
  return ()=>{stopped=true;clearInterval(timer);cancelAnimationFrame(frame);oscillators.forEach(osc=>{try{osc.stop();}catch{}});pending.length=0;};
}
