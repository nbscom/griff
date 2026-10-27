import { detectPitch } from './pitch';
class InstrumentInput extends AudioWorkletProcessor {
  constructor(){super();this.buffer=new Float32Array(8192);this.position=0;this.filled=0;this.hop=0;}
  process(inputs){
    const channel=inputs[0]?.[0];
    if(!channel)return true;
    for(let i=0;i<channel.length;i++){
      this.buffer[this.position]=channel[i];this.position=(this.position+1)%this.buffer.length;
    }
    this.filled=Math.min(this.buffer.length,this.filled+channel.length);this.hop+=channel.length;
    if(this.hop>=2048 && this.filled===this.buffer.length){
      this.hop=0;const frame=new Float32Array(this.buffer.length);
      frame.set(this.buffer.subarray(this.position));frame.set(this.buffer.subarray(0,this.position),this.buffer.length-this.position);
      this.port.postMessage(detectPitch(frame,sampleRate));
    }
    return true;
  }
}
registerProcessor('instrument-input',InstrumentInput);
