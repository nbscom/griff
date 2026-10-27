import React,{useLayoutEffect,useMemo,useRef} from 'react';
import {octaveName} from './instruments';
import {bassIntervalPositions,closestBassIntervalPair,degreeNames} from './bass';
export function BassIntervalFretboard({tuning,study,onPlay}){
  const scroll=useRef(null);
  const positions=useMemo(()=>bassIntervalPositions(tuning,study),[tuning,study]);
  const pair=useMemo(()=>closestBassIntervalPair(positions,study),[positions,study]);
  useLayoutEffect(()=>{
    const container=scroll.current;if(!container)return;
    // Show a nearby root/target pair on narrow screens without moving the page.
    const reveal=()=>{
      const needed=Math.abs(pair.root.fret-pair.target.fret)+1,available=container.clientWidth-42;
      container.style.setProperty('--bass-cell-width',`${Math.max(24,Math.min(40,Math.floor(available/needed)))}px`);
      const cell=container.querySelector('.bass-position');if(!cell)return;
      const width=cell.getBoundingClientRect().width,visible=Math.floor(available/width),padding=Math.max(0,Math.floor((visible-needed)/2));
      container.scrollLeft=Math.max(0,Math.min(pair.root.fret,pair.target.fret)-padding)*width;
    };
    reveal();const observer=new ResizeObserver(reveal);observer.observe(container);return()=>observer.disconnect();
  },[pair]);
  return <div className="bass-interval-view"><div className="bass-interval-scroll" ref={scroll} role="region" aria-label="Интервал на басовом грифе" tabIndex="0"><div className="bass-interval-board">
    {tuning.midi.map((open,string)=><div className="bass-board-row" key={string}><span className="bass-string-label">{string+1} · {octaveName(open)}</span>{Array.from({length:21},(_,fret)=>{
      const midi=open+fret,isRoot=midi===study.tonic,isTarget=midi===study.target,shown=isRoot||isTarget;
      return <button key={fret} className={'bass-position '+(fret===0?'bass-open ':'')+(isRoot?'bass-position-root ':isTarget?'bass-position-target ':'')} aria-label={`Басовый интервал: ${string+1} струна, ${fret} лад, ${octaveName(midi)}${shown?', ступень '+(isRoot?'1':degreeNames[study.target-study.tonic]):''}`} onClick={()=>onPlay(midi)}><i/>{shown&&<span><strong>{octaveName(midi)}</strong><small>{isRoot?'1':degreeNames[study.target-study.tonic]}</small></span>}</button>;
    })}</div>)}
    <div className="bass-board-numbers"><span className="bass-string-label">Лад</span>{Array.from({length:21},(_,fret)=><span key={fret}>{fret}{[3,5,7,9,12,15,17,19].includes(fret)&&<small>{fret===12?'••':'•'}</small>}</span>)}</div>
  </div></div><p className="bass-board-help"><span><i className="bass-root-dot"/>1 · тоника</span>{study.target!==study.tonic&&<span><i className="bass-target-dot"/>{degreeNames[study.target-study.tonic]} · {study.title.toLowerCase()}</span>}<span>Нажми позицию, чтобы услышать · лады 0–20 ↔</span></p></div>;
}
