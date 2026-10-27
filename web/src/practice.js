import {notes,chords} from './music.js';
export const earIntervals=[['Малая терция',3],['Большая терция',4],['Кварта',5],['Квинта',7],['Малая септима',10],['Октава',12]];
export const earChords=[['Мажор',[0,4,7]],['Минор',[0,3,7]],['Пауэр',[0,7]],['Доминантсептаккорд',[0,4,7,10]]];
export function chooseQuestion(tuning,{min=0,max=12,string=-1,previous=null,random=Math.random}={}){
  const positions=[];
  tuning.midi.forEach((midi,s)=>{if(string>=0&&s!==string)return;for(let fret=min;fret<=max;fret++)if(midi+fret!==previous)positions.push({string:s,fret,midi:midi+fret});});
  if(!positions.length)return {string:Math.max(0,string),fret:min,midi:tuning.midi[Math.max(0,string)]+min};
  return positions[Math.min(positions.length-1,Math.floor(random()*positions.length))];
}
export function matchPitch(frequency,midi,tolerance=35){return Number.isFinite(frequency)&&frequency>0&&Math.abs(1200*Math.log2(frequency/(440*2**((midi-69)/12))))<=tolerance;}
export function clampLoop(length,start,end){const a=Math.max(1,Math.min(length,Math.trunc(Number(start))||1));const b=Math.max(a,Math.min(length,Math.trunc(Number(end))||length));return[a,b];}
export function rootMidi(name,low=40){const pitch=notes.indexOf(name.match(/^([A-G]♯?)/)?.[1]);return low+(pitch-low%12+12)%12;}
export function chordIntervals(name){const suffix=name.replace(/^[A-G]♯?/,'');return suffix==='5'?[0,7,12]:suffix==='m'?[0,3,7]:suffix==='m7'?[0,3,7,10]:suffix==='7'?[0,4,7,10]:suffix==='sus2'?[0,2,7]:suffix==='sus4'?[0,5,7]:[0,4,7];}
export const presets=[
  {name:'Рок · Em–C–G–D',sequence:['Em','C','G','D'].map(chord=>({chord,bars:1}))},
  {name:'Пауэр · E5–G5–A5',sequence:['E5','G5','A5','E5'].map(chord=>({chord,bars:1}))},
  {name:'12-тактовый блюз',sequence:['A7','A7','A7','A7','D7','D7','A7','A7','E7','D7','A7','E7'].map(chord=>({chord,bars:1}))},
];
export function validSequence(value){return Array.isArray(value)&&value.length>0&&value.length<=16&&value.every(item=>item&&Object.hasOwn(chords,item.chord)&&Number.isInteger(item.bars)&&item.bars>=1&&item.bars<=4);}
export function loadLocal(key,fallback,validate=()=>true){try{const value=JSON.parse(localStorage.getItem(key));return value!==null&&validate(value)?value:fallback;}catch{return fallback;}}
export function saveLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function validStats(value){return value&&typeof value==='object'&&!Array.isArray(value)&&['notes','intervals','chords'].every(key=>{const s=value[key];return s&&Number.isInteger(s.total)&&s.total>=0&&Number.isInteger(s.correct)&&s.correct>=0&&s.correct<=s.total&&Number.isFinite(s.ms)&&s.ms>=0;});}
export const emptyStats=()=>({notes:{total:0,correct:0,ms:0},intervals:{total:0,correct:0,ms:0},chords:{total:0,correct:0,ms:0}});
export function loadPreferences(){return loadLocal('griff:preferences:v1',{},value=>value&&typeof value==='object'&&!Array.isArray(value));}
