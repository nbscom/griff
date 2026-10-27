import {notes} from './music.js';
import {scales} from './instruments.js';
export const bassIntervals=[['Прима',0],['Малая терция',3],['Большая терция',4],['Кварта',5],['Квинта',7],['Малая септима',10],['Октава',12]];
export const degreeNames=['1','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7','8'];
export function bassStudy(tuning,root,mode,interval){
  const low=tuning.midi.at(-1),tonic=low+(notes.indexOf(root)-low%12+12)%12;
  if(mode==='Интервалы')return{kind:'interval',title:bassIntervals.find(([,value])=>value===interval)?.[0]||'Интервал',tonic,target:tonic+interval,steps:[0,interval],midis:[tonic,tonic+interval]};
  if(Object.hasOwn(scales,mode)){const steps=[...scales[mode],12];return{kind:'scale',title:mode,tonic,steps,midis:steps.map(n=>tonic+n)};}
  return{kind:'tonic',title:'Тоника',tonic,steps:[0],midis:[tonic]};
}
export function bassIntervalDegree(midi,study){
  if(study.kind!=='interval')return null;
  if(midi===study.tonic)return'1';
  if(midi===study.target)return degreeNames[study.target-study.tonic];
  return null;
}
export function semitoneLabel(value){return `${value} ${value===1?'полутон':value>=2&&value<=4?'полутона':'полутонов'}`;}
