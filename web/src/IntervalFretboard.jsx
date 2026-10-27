import React,{useLayoutEffect,useMemo,useRef} from 'react';
import {octaveName} from './instruments';
import {intervalPositions,closestIntervalPair,degreeNames} from './intervals';
export function IntervalFretboard({tuning,study,anchor,instrument,onSelect}){
  const scroll=useRef(null),frets=instrument==='bass'?20:24;
  const positions=useMemo(()=>intervalPositions(tuning,study,frets),[tuning,study,frets]);
  const pair=useMemo(()=>closestIntervalPair(positions,study,anchor),[positions,study,anchor]);
  useLayoutEffect(()=>{
    const container=scroll.current;if(!container||!pair.root)return;
    const reveal=()=>{
      const last=pair.target?.fret??pair.root.fret,needed=Math.abs(pair.root.fret-last)+1,available=container.clientWidth-42;
      container.style.setProperty('--bass-cell-width',`${Math.max(24,Math.min(40,Math.floor(available/needed)))}px`);
      const cell=container.querySelector('.bass-position');if(!cell)return;
      const width=cell.getBoundingClientRect().width,visible=Math.floor(available/width),padding=Math.max(0,Math.floor((visible-needed)/2));
      const first=needed>visible?Math.max(0,pair.root.fret-Math.floor(visible/2)):Math.max(0,Math.min(pair.root.fret,last)-padding);
      container.scrollLeft=first*width;
    };
    reveal();const observer=new ResizeObserver(reveal);observer.observe(container);return()=>observer.disconnect();
  },[pair]);
  const semitones=study.kind==='interval'?Math.abs(study.target-study.tonic):0;
  return <div className="bass-interval-view"><div className="bass-interval-scroll" ref={scroll} role="region" aria-label={instrument==='bass'?'Интервал на басовом грифе':'Интервал на гитарном грифе'} tabIndex="0"><div className="bass-interval-board" style={{'--interval-frets':frets+1}}>
    {tuning.midi.map((open,string)=><div className="bass-board-row" key={string}><span className="bass-string-label">{string+1} · {octaveName(open)}</span>{Array.from({length:frets+1},(_,fret)=>{
      const midi=open+fret,isRoot=midi===study.tonic,isTarget=study.kind==='interval'?midi===study.target:study.kind==='scale'&&!isRoot&&study.midis.includes(midi),shown=isRoot||isTarget,selected=anchor?.string===string&&anchor?.fret===fret;
      return <button key={fret} className={'bass-position '+(fret===0?'bass-open ':'')+(isRoot?'bass-position-root ':isTarget?'bass-position-target ':'')+(selected?'selected-origin':'')} aria-pressed={selected} aria-label={`Выбрать ноту: ${string+1} струна, ${fret} лад, ${octaveName(midi)}`} onClick={()=>onSelect(string,fret)}><i/>{shown?<span><strong>{octaveName(midi)}</strong><small>{isRoot?'1':degreeNames[study.kind==='scale'?midi-study.tonic:semitones]}</small></span>:<span className="available-note">{octaveName(midi)}</span>}</button>;
    })}</div>)}
    <div className="bass-board-numbers"><span className="bass-string-label">Лад</span>{Array.from({length:frets+1},(_,fret)=><span key={fret}>{fret}{[3,5,7,9,12,15,17,19,21,24].includes(fret)&&<small>{fret%12===0?'••':'•'}</small>}</span>)}</div>
  </div></div><p className="bass-board-help"><span><i className="bass-root-dot"/>1 · исходная нота</span>{study.kind==='interval'&&study.target!==study.tonic&&<span><i className="bass-target-dot"/>{degreeNames[semitones]} · {study.title.toLowerCase()}</span>}<span>Нажми ноту, затем выбери интервал · лады 0–{frets} ↔</span></p></div>;
}
