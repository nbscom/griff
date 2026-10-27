import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,Volume2,Pause} from 'lucide-react';
import {notes} from './music';
import {scales,octaveName,noteName} from './instruments';
import {intervals,intervalStudy,intervalPositions,degreeNames,semitoneLabel} from './intervals';
import {previewNotes,soundContext} from './audio/sound';
import {playbackStarted} from './audio/events';
import {IntervalFretboard} from './IntervalFretboard';
export function FretboardStudies({instrument,tuning,root,setRoot,mode,setMode,interval,setIntervalNote,anchor,onSelect,clearAnchor,direction,setDirection,clearExercise,onReveal}){
  const[request,setRequest]=useState(null);
  const study=useMemo(()=>intervalStudy(tuning,root,mode,interval,{anchor,direction}),[tuning,root,mode,interval,anchor,direction]);
  const available=new Set(intervalPositions(tuning,study).map(p=>p.midi));
  const targetExists=study.kind!=='interval'||available.has(study.target);
  const scaleOutside=study.kind==='scale'&&study.midis.some(midi=>!available.has(midi));
  useEffect(()=>{
    if(!request||request.root!==root||request.tuning!==tuning.id||request.mode!==mode||request.interval!==interval||request.tonic!==study.tonic||request.direction!==direction)return;
    return previewNotes(request.midis);
  },[request,root,tuning,mode,interval,study.tonic,direction]);
  useEffect(()=>{const stop=e=>{if(e.detail!=='bass-study')setRequest(null);};window.addEventListener('griff:playback',stop);return()=>window.removeEventListener('griff:playback',stop);},[]);
  function play(midis,{newMode=mode,newInterval=interval,tonic=study.tonic,rootName=root}={}){
    soundContext();playbackStarted('bass-study');setRequest({midis,root:rootName,tuning:tuning.id,mode:newMode,interval:newInterval,tonic,direction});
  }
  function selectInterval(value){
    clearExercise();setMode('Интервалы');setIntervalNote(value);
    play(intervalStudy(tuning,root,'Интервалы',value,{anchor,direction}).midis,{newMode:'Интервалы',newInterval:value});
  }
  function choosePosition(string,fret){
    const midi=tuning.midi[string]+fret;onSelect(string,fret);play([midi],{tonic:midi,rootName:noteName(midi)});
  }
  return <section className={'panel instrument-studies '+(instrument==='bass'?'bass-studies':'guitar-studies')} id="intervals"><div className="section-top"><h3>Ноты, интервалы и гаммы</h3><span className="section-caption">{instrument==='bass'?'Бас':'Гитара'} · {tuning.name}</span></div>
    <p className="section-caption">1. Нажми исходную ноту на грифе. 2. Выбери интервал.</p>
    <div className="bass-controls"><label>Тоника <select aria-label={instrument==='bass'?'Тоника басового упражнения':'Тоника гитарного упражнения'} value={root} onChange={e=>{setRequest(null);clearAnchor();setRoot(e.target.value);clearExercise();}}>{notes.map(n=><option key={n}>{n}</option>)}</select></label><span className="selected-note-summary">{octaveName(study.tonic)}{anchor?` · ${anchor.string+1} струна, ${anchor.fret} лад`:''}</span><button className={'secondary '+(mode==='Только тоника'?'selected':'')} onClick={()=>{setRequest(null);setMode('Только тоника');clearExercise();}}>Найти тонику</button></div>
    <div className="exercise-tabs" aria-label="Интервалы от выбранной ноты" role="group">{intervals.map(([name,value])=><button className={mode==='Интервалы'&&interval===value?'selected':''} aria-pressed={mode==='Интервалы'&&interval===value} key={name} onClick={()=>selectInterval(value)}>{name}</button>)}</div>
    <div className="interval-direction"><label>Направление <select aria-label="Направление интервала" value={direction} onChange={e=>{setRequest(null);setDirection(Number(e.target.value));}}><option value="1">Вверх</option><option value="-1">Вниз</option></select></label>{study.kind==='interval'&&<span>{octaveName(study.tonic)} → {octaveName(study.target)} · {semitoneLabel(interval)}</span>}</div>
    <IntervalFretboard tuning={tuning} study={study} anchor={anchor} instrument={instrument} onSelect={choosePosition}/>
    {!targetExists&&<p role="status" className="audio-warning">Цель {octaveName(study.target)} вне диапазона этого грифа. Выбери направление {direction===1?'вниз':'вверх'}, другую исходную ноту или меньший интервал.</p>}
    {scaleOutside&&<p role="status" className="audio-warning">Часть гаммы вне диапазона этого грифа. Выбери исходную ноту ниже.</p>}
    <div className="bass-scales" aria-label="Гаммы" role="group">{Object.keys(scales).map(name=><button className={'secondary '+(mode===name?'selected':'')} aria-pressed={mode===name} key={name} onClick={()=>{setRequest(null);setMode(name);clearExercise();}}>{name}</button>)}</div>
    <div className="bass-result"><div className="bass-result-heading"><strong>{study.title}</strong><span>{study.kind==='interval'?semitoneLabel(interval):study.kind==='scale'?'Одна октава от '+octaveName(study.tonic):octaveName(study.tonic)}</span></div><div className="bass-note-list" aria-label="Ноты упражнения">{study.midis.map((midi,i)=><button key={i} className={midi===study.tonic?'bass-root':'bass-target'} onClick={()=>play([midi])} title={'Прослушать '+octaveName(midi)}><span>{degreeNames[study.steps[i]]}</span><strong>{octaveName(midi)}</strong></button>)}</div>
      <div className="bass-result-actions"><button className="secondary" onClick={()=>play(study.midis)}><Volume2 size={14}/>{study.kind==='scale'?'Прослушать гамму':study.kind==='interval'?'Повторить интервал':'Прослушать тонику'}</button><button className="icon-btn" title="Остановить пример" onClick={()=>setRequest(null)}><Pause size={15}/></button><button className="secondary" onClick={()=>{clearExercise();if(mode==='Все ноты')setMode('Только тоника');onReveal();}}>Полный гриф <ArrowRight size={13}/></button></div>
    </div>
  </section>;
}
