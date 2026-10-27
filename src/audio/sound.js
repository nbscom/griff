let context;
export function soundContext(){
  context ||= new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  context.resume();return context;
}
export function playTone(midi,duration=.35){
  const ctx=soundContext();return scheduleTone(ctx,ctx.currentTime,midi,duration);
}
function scheduleTone(ctx,time,midi,duration,accent){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=accent!==undefined?'sine':'triangle';
  osc.frequency.value=accent!==undefined ? (accent===2?1300:accent===1?950:650) : 440*2**((midi-69)/12);
  const volume=accent!==undefined?(accent===2?.23:accent===1?.16:.10):.12;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.002);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(time);osc.stop(time+duration+.005);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
  return osc;
}
export const beatSeconds=(bpm,meter)=>60/bpm/(meter==='6/8'?3:1);
// JS wakes every 25 ms; sound is scheduled on the audio clock 100 ms ahead.
export function startSequence({bpm,meter='4/4',pattern,tuning,rest=0,onStep}){
  const ctx=soundContext();let index=0,nextTime=ctx.currentTime+.05,stopped=false;
  const pending=[],oscillators=new Set();
  const beats=meter==='3/4'?3:meter==='6/8'?6:4;
  const duration=pattern ? beatSeconds(bpm,meter)/(meter==='6/8'?1:2) : beatSeconds(bpm,meter);
  const total=pattern?pattern.length+rest*(meter==='6/8'?3:2):beats;
  function schedule(){
    if(stopped)return;
    while(nextTime<ctx.currentTime+.1){
      let osc;
      if(pattern){if(index<pattern.length){const[s,f]=pattern[index];osc=scheduleTone(ctx,nextTime,tuning[s]+f,Math.min(.55,duration*.9));}}
      else osc=scheduleTone(ctx,nextTime,0,.035,index===0?2:meter==='6/8'&&index===3?1:0);
      if(osc){oscillators.add(osc);osc.addEventListener('ended',()=>oscillators.delete(osc));}
      pending.push({time:nextTime,index:pattern&&index>=pattern.length?-1:index});
      nextTime+=duration;index=(index+1)%total;
    }
  }
  let frame;
  function draw(){while(pending.length && pending[0].time<=ctx.currentTime)onStep?.(pending.shift().index);frame=requestAnimationFrame(draw);}
  schedule();const timer=setInterval(schedule,25);frame=requestAnimationFrame(draw);
  return ()=>{stopped=true;clearInterval(timer);cancelAnimationFrame(frame);oscillators.forEach(osc=>{try{osc.stop();}catch{}});pending.length=0;};
}
