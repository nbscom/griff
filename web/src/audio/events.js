let latest={status:'off',frequency:null,rms:0};
const listeners=new Set();
export function publishInput(value){latest={...latest,...value};listeners.forEach(fn=>fn(latest));}
export function subscribeInput(fn){listeners.add(fn);fn(latest);return()=>listeners.delete(fn);}
export function playbackStarted(source){window.dispatchEvent(new CustomEvent('griff:playback',{detail:source}));}
