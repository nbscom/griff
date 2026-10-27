import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,Volume2,Pause} from 'lucide-react';
import {notes} from './music';
import {scales,octaveName} from './instruments';
import {bassIntervals,bassStudy,degreeNames,semitoneLabel} from './bass';
import {previewNotes,soundContext} from './audio/sound';
import {playbackStarted} from './audio/events';
import {BassIntervalFretboard} from './BassIntervalFretboard';
export function BassStudies({tuning,root,setRoot,mode,setMode,interval,setIntervalNote,clearExercise,onReveal}){
  const[request,setRequest]=useState(null);
  const study=useMemo(()=>bassStudy(tuning,root,mode,interval),[tuning,root,mode,interval]);
  useEffect(()=>{
    if(!request||request.root!==root||request.tuning!==tuning.id||request.mode!==mode||request.interval!==interval)return;
    // Schedule the whole example on the audio clock, canceling it on any selection change.
    return previewNotes(request.midis);
  },[request,root,tuning,mode,interval]);
  useEffect(()=>{const stop=e=>{if(e.detail!=='bass-study')setRequest(null);};window.addEventListener('griff:playback',stop);return()=>window.removeEventListener('griff:playback',stop);},[]);
  function play(midis,newMode=mode,newInterval=interval){
    soundContext();playbackStarted('bass-study');setRequest({midis,root,tuning:tuning.id,mode:newMode,interval:newInterval});
  }
  function selectInterval(value){
    clearExercise();setMode('Интервалы');setIntervalNote(value);
    play(bassStudy(tuning,root,'Интервалы',value).midis,'Интервалы',value);
  }
  return <section className="panel bass-studies" id="chords"><div className="section-top"><h3>Ноты, интервалы и гаммы</h3><span className="section-caption">Бас · {tuning.name}</span></div>
    <div className="bass-controls"><label>Тоника <select aria-label="Тоника басового упражнения" value={root} onChange={e=>{setRequest(null);setRoot(e.target.value);clearExercise();}}>{notes.map(n=><option key={n}>{n}</option>)}</select></label><button className={'secondary '+(mode==='Только тоника'?'selected':'')} onClick={()=>{setRequest(null);setMode('Только тоника');clearExercise();}}>Найти тонику</button></div>
    <div className="exercise-tabs" aria-label="Басовые интервалы" role="group">{bassIntervals.map(([name,value])=><button className={mode==='Интервалы'&&interval===value?'selected':''} aria-pressed={mode==='Интервалы'&&interval===value} key={name} onClick={()=>selectInterval(value)}>{name}</button>)}</div>
    {study.kind==='interval'&&<BassIntervalFretboard tuning={tuning} study={study} onPlay={midi=>play([midi])}/>}
    <div className="bass-scales" aria-label="Басовые гаммы" role="group">{Object.keys(scales).map(name=><button className={'secondary '+(mode===name?'selected':'')} aria-pressed={mode===name} key={name} onClick={()=>{setRequest(null);setMode(name);clearExercise();}}>{name}</button>)}</div>
    <div className="bass-result"><div className="bass-result-heading"><strong>{study.title}</strong><span>{study.kind==='interval'?semitoneLabel(interval):study.kind==='scale'?'Одна октава от '+octaveName(study.tonic):octaveName(study.tonic)}</span></div><div className="bass-note-list" aria-label="Ноты басового упражнения">{study.midis.map((midi,i)=><button key={i} className={midi===study.tonic?'bass-root':'bass-target'} onClick={()=>play([midi])} title={'Прослушать '+octaveName(midi)}><span>{degreeNames[study.steps[i]]}</span><strong>{octaveName(midi)}</strong></button>)}</div>

      <div className="bass-result-actions"><button className="secondary" onClick={()=>play(study.midis)}><Volume2 size={14}/>{study.kind==='scale'?'Прослушать гамму':study.kind==='interval'?'Повторить интервал':'Прослушать тонику'}</button><button className="icon-btn" title="Остановить пример" onClick={()=>setRequest(null)}><Pause size={15}/></button><button className="secondary" onClick={()=>{clearExercise();if(mode==='Все ноты')setMode('Только тоника');onReveal();}}>Полный гриф <ArrowRight size={13}/></button></div>
      {study.kind==='interval'&&<p className="section-caption">На грифе: тоника {octaveName(study.tonic)} — зелёная{interval!==0?`, цель ${octaveName(study.target)} — янтарная`:''}. Показаны позиции этих конкретных высот{interval===12?'; октава — ступень 8':''}.</p>}
    </div>
  </section>;
}
