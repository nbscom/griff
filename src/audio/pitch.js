// YIN: difference function + cumulative mean normalization + parabolic interpolation.
// Downsample by averaging to ~12 kHz. An 8192-sample frame at 48 kHz covers
// seven cycles at E1; the comparison window covers >3 cycles at Drop D1.
export function detectPitch(input, sampleRate) {
  const factor=Math.max(1,Math.floor(sampleRate/12000));
  const length=Math.floor(input.length/factor), rate=sampleRate/factor;
  const data=new Float32Array(length);
  let energy=0, peak=0;
  for(let i=0;i<input.length;i++){energy+=input[i]*input[i];peak=Math.max(peak,Math.abs(input[i]));}
  const rms=Math.sqrt(energy/input.length);
  if(rms<0.0015) return {frequency:null,confidence:0,rms,peak};
  for(let i=0;i<length;i++){let sum=0;for(let j=0;j<factor;j++)sum+=input[i*factor+j];data[i]=sum/factor;}
  const minTau=Math.max(2,Math.floor(rate/1400));
  const maxTau=Math.min(Math.floor(rate/30),Math.floor(length/2)-1);
  const window=length-maxTau;
  const difference=new Float32Array(maxTau+1);
  for(let tau=1;tau<=maxTau;tau++){
    let sum=0;
    for(let j=0;j<window;j++){const d=data[j]-data[j+tau];sum+=d*d;}
    difference[tau]=sum;
  }
  let running=0;difference[0]=1;
  for(let tau=1;tau<=maxTau;tau++){running+=difference[tau];difference[tau]=running?difference[tau]*tau/running:1;}
  let tau=-1;
  for(let i=minTau;i<maxTau;i++){
    if(difference[i]<.15){while(i+1<=maxTau && difference[i+1]<difference[i])i++;tau=i;break;}
  }
  if(tau<0) return {frequency:null,confidence:0,rms,peak};
  const left=difference[tau-1], center=difference[tau], right=difference[Math.min(tau+1,maxTau)];
  const denominator=2*(2*center-right-left);
  const refined=tau+(denominator?(right-left)/denominator:0);
  // Refine the lag at the original rate to avoid cent bias on high notes.
  const rough=Math.round(refined*factor), compare=input.length-Math.ceil(sampleRate/30)-factor-3;
  const fineDifference=lag=>{let sum=0;for(let j=0;j<compare;j++){const d=input[j]-input[j+lag];sum+=d*d;}return sum;};
  let best=rough,bestValue=Infinity;
  for(let lag=Math.max(2,rough-factor);lag<=rough+factor;lag++){const value=fineDifference(lag);if(value<bestValue){best=lag;bestValue=value;}}
  const a=fineDifference(best-1),b=bestValue,c=fineDifference(best+1),den=2*(2*b-a-c);
  const lag=best+(den?(c-a)/den:0);
  const frequency=sampleRate/lag,confidence=1-center;
  return {frequency:frequency>=30&&frequency<=1400 ? frequency:null,confidence,rms,peak};
}
