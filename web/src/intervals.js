import {notes} from './music.js';
import {scales} from './instruments.js';
export const intervals=[['Прима',0],['Малая секунда',1],['Большая секунда',2],['Малая терция',3],['Большая терция',4],['Кварта',5],['Тритон',6],['Квинта',7],['Малая секста',8],['Большая секста',9],['Малая септима',10],['Большая септима',11],['Октава',12]];
export const degreeNames=['1','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7','8'];
export function selectedMidi(tuning,anchor){
  return anchor&&Number.isInteger(anchor.string)&&anchor.string>=0&&anchor.string<tuning.midi.length&&Number.isInteger(anchor.fret)&&anchor.fret>=0&&anchor.fret<=(tuning.midi.length===4?20:24)?tuning.midi[anchor.string]+anchor.fret:null;
}
export function intervalStudy(tuning,root,mode,interval,{anchor=null,direction=1}={}){
  const low=tuning.midi.at(-1),tonic=selectedMidi(tuning,anchor)??low+(notes.indexOf(root)-low%12+12)%12;
  if(mode==='Интервалы')return{kind:'interval',title:intervals.find(([,value])=>value===interval)?.[0]||'Интервал',tonic,target:tonic+interval*direction,steps:[0,interval],midis:[tonic,tonic+interval*direction],direction};
  if(Object.hasOwn(scales,mode)){const steps=[...scales[mode],12];return{kind:'scale',title:mode,tonic,steps,midis:steps.map(n=>tonic+n)};}
  return{kind:'tonic',title:'Исходная нота',tonic,steps:[0],midis:[tonic]};
}
export function intervalDegree(midi,study){
  if(study.kind!=='interval')return null;
  if(midi===study.tonic)return'1';
  if(midi===study.target)return degreeNames[Math.abs(study.target-study.tonic)];
  return null;
}
export function semitoneLabel(value){return `${value} ${value===1?'полутон':value>=2&&value<=4?'полутона':'полутонов'}`;}
export function intervalPositions(tuning,study,frets=tuning.midi.length===4?20:24){
  return tuning.midi.flatMap((open,string)=>Array.from({length:frets+1},(_,fret)=>({string,fret,midi:open+fret}))).filter(position=>study.midis.includes(position.midi));
}
export function closestIntervalPair(positions,study,anchor=null){
  let roots=positions.filter(p=>p.midi===study.tonic);const targets=positions.filter(p=>p.midi===(study.kind==='scale'?study.midis.at(-1):study.target));
  const chosen=anchor&&roots.find(p=>p.string===anchor.string&&p.fret===anchor.fret);if(chosen)roots=[chosen];
  let best=null;
  for(const root of roots)for(const target of targets){
    const score=Math.abs(root.fret-target.fret)*100+Math.max(root.fret,target.fret)*5+Math.abs(root.string-target.string);
    if(!best||score<best.score)best={root,target,score};
  }
  return best||{root:roots[0],target:null};
}
