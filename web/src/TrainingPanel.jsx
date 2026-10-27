import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play,ArrowRight} from 'lucide-react';
import {chooseQuestion,matchPitch,earIntervals,earChords,emptyStats,validStats,loadLocal,saveLocal} from './practice';
import {noteName,octaveName} from './instruments';
import {playTone,previewNotes} from './audio/sound';
import {subscribeInput,playbackStarted} from './audio/events';
export function TrainingPanel({instrument,tuning}){
  const[kind,setKind]=useState('notes'),[range,setRange]=useState('0:5'),[string,setString]=useState(-1),[answerMode,setAnswerMode]=useState('board');
  const[round,setRound]=useState(0),[result,setResult]=useState(null),[solved,setSolved]=useState(false),[inputStatus,setInputStatus]=useState('off'),[heard,setHeard]=useState(null);
  const[stats,setStats]=useState(()=>loadLocal('griff:stats:v1',emptyStats(),validStats)),[storageError,setStorageError]=useState(false);
  const[soundMode,setSoundMode]=useState('melodic'),[listened,setListened]=useState(false);
  const counted=useRef(false),finished=useRef(false),started=useRef(performance.now()),lastQuestion=useRef(null),stopAudio=useRef(null),stable=useRef({midi:null,count:0});
  const maxFrets=instrument==='bass'?20:24;
  const[min,max]=range.split(':').map(Number);
  const question=useMemo(()=>{
    if(kind==='notes')return chooseQuestion(tuning,{min,max:Math.min(max,maxFrets),string,previous:lastQuestion.current});
    const choices=kind==='intervals'?earIntervals:earChords;
    return {choice:Math.floor(Math.random()*choices.length),midi:(instrument==='bass'?36:48)+Math.floor(Math.random()*12)};
  },[kind,range,string,round,tuning,instrument]);
  useEffect(()=>{
    counted.current=false;finished.current=false;started.current=performance.now();stable.current={midi:null,count:0};
    setResult(null);setSolved(false);setHeard(null);setListened(false);stopAudio.current?.();
    if(kind==='notes')lastQuestion.current=question.midi;
  },[question,kind]);
  useEffect(()=>()=>stopAudio.current?.(),[]);
  useEffect(()=>{if(!saveLocal('griff:stats:v1',stats))setStorageError(true);},[stats]);
  function record(correct){
    if(counted.current)return;counted.current=true;
    const ms=Math.max(0,performance.now()-started.current);
    setStats(previous=>({...previous,[kind]:{total:previous[kind].total+1,correct:previous[kind].correct+Number(correct),ms:previous[kind].ms+ms}}));
  }
  function answerNote(midi){
    if(finished.current)return;
    const correct=midi===question.midi;record(correct);
    setResult({correct,text:correct?'Верно · '+octaveName(midi):'Это '+octaveName(midi)+'. Найди '+octaveName(question.midi)});
    if(correct){finished.current=true;setSolved(true);}
  }
  useEffect(()=>subscribeInput(input=>{
    setInputStatus(input.status);
    if(kind!=='notes'||answerMode!=='usb'||input.status!=='on'||!input.frequency||finished.current||performance.now()-started.current<350)return;
    const midi=Math.round(69+12*Math.log2(input.frequency/440));
    if(!matchPitch(input.frequency,midi))return;
    setHeard(octaveName(midi));
    stable.current=stable.current.midi===midi?{midi,count:stable.current.count+1}:{midi,count:1};
    if(stable.current.count===3)answerNote(midi);
  }),[kind,answerMode,question]);
  function next(){setRound(v=>v+1);}
  function listen(){
    stopAudio.current?.();playbackStarted('ear');if(!listened)started.current=performance.now();setListened(true);
    const intervals=kind==='intervals'?[0,earIntervals[question.choice][1]]:earChords[question.choice][1];
    stopAudio.current=previewNotes(intervals.map(n=>question.midi+n),kind==='chords'||soundMode==='harmonic');
  }
  function answerEar(index){if(finished.current||!listened)return;const correct=index===question.choice;record(correct);finished.current=true;setSolved(true);setResult({correct,text:correct?'Верно':'Ответ: '+(kind==='intervals'?earIntervals:earChords)[question.choice][0]});}
  const currentStats=stats[kind];
  return <section className="panel training-panel" id="training"><div className="section-top"><h3>Проверить себя</h3><span className="section-caption">{currentStats.total?`${currentStats.correct}/${currentStats.total} с первой попытки · ${Math.round(currentStats.correct/currentStats.total*100)}%`:'Результаты сохраняются в этом браузере'}</span></div>
    <div className="exercise-tabs" aria-label="Тип тренировки" role="group">{[['notes','Ноты на грифе'],['intervals','Интервалы на слух'],['chords','Аккорды на слух']].map(([id,label])=><button className={kind===id?'selected':''} key={id} onClick={()=>{setKind(id);setRound(v=>v+1);}}>{label}</button>)}</div>
    {kind==='notes'?<><div className="training-options"><label>Лады <select aria-label="Диапазон тренировки" value={range} onChange={e=>setRange(e.target.value)}><option value="0:5">0–5</option><option value="5:12">5–12</option><option value={`12:${maxFrets}`}>12–{maxFrets}</option></select></label><label>Струна <select aria-label="Струна тренировки" value={string} onChange={e=>setString(Number(e.target.value))}><option value="-1">Все</option>{tuning.midi.map((midi,i)=><option key={i} value={i}>{i+1} · {octaveName(midi)}</option>)}</select></label><label>Ответ <select aria-label="Способ ответа" value={answerMode} onChange={e=>{setAnswerMode(e.target.value);next();}}><option value="board">На грифе</option><option value="usb">Сыграть через USB</option></select></label></div>
      <div className="quiz-question"><div><span className="tiny-label">{answerMode==='usb'?'СЫГРАЙ НОТУ':'НАЙДИ НОТУ'}</span><strong>{octaveName(question.midi)}</strong></div><button className="secondary" onClick={()=>playTone(question.midi)}>Эталон <Play size={13}/></button>{answerMode==='usb'&&<span className="section-caption">{inputStatus!=='on'?'Подключи аудиовход в тюнере выше':heard?'Слышу: '+heard:'Играй одну ноту чистым звуком'}</span>}</div>
      {answerMode==='board'&&<div className="tab-scroll quiz-scroll"><div className="quiz-board" style={{'--quiz-frets':Math.min(max,maxFrets)-min+1}}>{tuning.midi.map((midi,s)=><div className="quiz-string" key={s}><span className="tab-label">{noteName(midi)}</span>{Array.from({length:Math.min(max,maxFrets)-min+1},(_,j)=>j+min).map(fret=><button disabled={solved} key={fret} aria-label={`Ответ: ${s+1} струна, ${fret} лад`} className="quiz-fret" onClick={()=>{playTone(midi+fret);answerNote(midi+fret);}}><i/>{fret}</button>)}</div>)}</div></div>}
    </>:<><div className="ear-controls"><button className="primary" onClick={listen}><Play size={15}/> Слушать задание</button>{kind==='intervals'&&<select aria-label="Звучание интервала" value={soundMode} onChange={e=>setSoundMode(e.target.value)}><option value="melodic">Ноты по очереди</option><option value="harmonic">Ноты вместе</option></select>}<span className="section-caption">{kind==='intervals'?'Определи расстояние между нотами':'Определи тип звучащего аккорда'}</span></div><div className="ear-answers">{(kind==='intervals'?earIntervals:earChords).map(([label],i)=><button className={'secondary '+(solved&&i===question.choice?'correct-answer':'')} disabled={solved||!listened} key={label} onClick={()=>answerEar(i)}>{label}</button>)}</div></>}
    <div className="quiz-footer"><span role="status" className={result?(result.correct?'correct-feedback':'wrong-feedback'):''}>{result?.text||'Первая попытка идёт в статистику'}{currentStats.total>0&&<small>Среднее время: {(currentStats.ms/currentStats.total/1000).toFixed(1)} с</small>}</span><button className="secondary" onClick={next}>{solved?'Следующее задание':'Пропустить'} <ArrowRight size={14}/></button></div>{storageError&&<p className="audio-warning">Браузер запретил сохранение. Тренировка доступна, результаты останутся до закрытия страницы.</p>}
  </section>;
}
