import React,{useEffect,useRef,useState} from 'react';
import {Mic,RefreshCw,Power,Play,Pause} from 'lucide-react';
import {openInput,inputError} from './audio/input';
import {soundContext,startSequence} from './audio/sound';
import {frequency,octaveName} from './instruments';
export function Tempo({bpm,setBpm,label='Темп'}){
  const[draft,setDraft]=useState(String(bpm));
  useEffect(()=>setDraft(String(bpm)),[bpm]);
  return <label className="tempo-input"><span>{label}</span><input aria-label={label} type="number" min="40" max="220" value={draft} onChange={e=>{setDraft(e.target.value);const n=Number(e.target.value);if(n>=40&&n<=220)setBpm(n);}} onBlur={()=>{const n=Number(draft);const value=Number.isFinite(n)?Math.max(40,Math.min(220,n)):bpm;setBpm(value);setDraft(String(value));}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}}/> BPM</label>;
}
export function Metronome({bpm,setBpm,meter,setMeter}){
  const[running,setRunning]=useState(false),[beat,setBeat]=useState(-1),[tapCount,setTapCount]=useState(0);
  const taps=useRef([]);
  useEffect(()=>{if(!running)return;return startSequence({bpm,meter,onStep:setBeat});},[running,bpm,meter]);
  const count=meter==='3/4'?3:meter==='6/8'?6:4;
  function tap(){const now=performance.now();if(taps.current.length&&now-taps.current.at(-1)>2200)taps.current=[];taps.current.push(now);taps.current=taps.current.slice(-6);setTapCount(taps.current.length);if(taps.current.length>=2){const intervals=taps.current.slice(1).map((n,i)=>n-taps.current[i]);const average=intervals.reduce((a,b)=>a+b,0)/intervals.length;setBpm(Math.max(40,Math.min(220,Math.round(60000/average))));}}
  return <section className="panel metro-panel" id="metronome"><div className="section-top"><h3>Метроном</h3><span className="section-caption">{meter==='6/8'?'BPM · четверть с точкой':'BPM · четверть'}</span></div><div className="metro-controls"><Tempo bpm={bpm} setBpm={setBpm}/><select aria-label="Размер" value={meter} onChange={e=>setMeter(e.target.value)}><option>4/4</option><option>3/4</option><option>6/8</option></select><button className="tap-button" onClick={tap}>Tap tempo <span>{tapCount>0?tapCount:''}</span></button></div><div className="beat-lights" aria-label="Доли такта">{Array.from({length:count},(_,i)=><span key={i} className={(i===0?'accent ':'')+(running&&beat===i?'lit':'')}>{i+1}</span>)}</div><button className="primary metro-start" aria-pressed={running} onClick={()=>{soundContext();setRunning(!running);setBeat(-1);}}>{running?<Pause size={16}/>:<Play size={16}/>} {running?'Остановить метроном':'Включить метроном'}</button></section>;
}
export function InputTuner({tuning}){
  const[devices,setDevices]=useState([]),[deviceId,setDeviceId]=useState(''),[status,setStatus]=useState('off'),[error,setError]=useState('');
  const[data,setData]=useState({frequency:null,rms:0,peak:0}),[auto,setAuto]=useState(true),[manual,setManual]=useState(0),[waiting,setWaiting]=useState(false),[deviceName,setDeviceName]=useState('');
  const engine=useRef(null),generation=useRef(0),lastSignal=useRef(0),history=useRef([]);
  async function refresh(){try{const list=await navigator.mediaDevices?.enumerateDevices();setDevices((list||[]).filter(d=>d.kind==='audioinput'));}catch{setError('Не удалось получить список аудиоустройств.');}}
  useEffect(()=>{refresh();navigator.mediaDevices?.addEventListener('devicechange',refresh);return()=>{generation.current++;engine.current?.close();navigator.mediaDevices?.removeEventListener('devicechange',refresh);};},[]);
  useEffect(()=>{if(status!=='on')return;const id=setInterval(()=>setWaiting(Date.now()-lastSignal.current>2000),300);return()=>clearInterval(id);},[status]);
  function disconnect(){generation.current++;engine.current?.close();engine.current=null;history.current=[];setStatus('off');setData({frequency:null,rms:0,peak:0});setWaiting(false);setDeviceName('');}
  async function connect(id=deviceId){
    const current=++generation.current;engine.current?.close();engine.current=null;
    setStatus('requesting');setError('');setData({frequency:null,rms:0,peak:0});history.current=[];
    try{
      const active=await openInput(id,measurement=>{
        if(current!==generation.current)return;
        if(measurement.rms>.003)lastSignal.current=Date.now();
        if(measurement.frequency && measurement.confidence>.85){
          history.current.push(measurement.frequency);history.current=history.current.slice(-3);
          const sorted=[...history.current].sort((a,b)=>a-b);measurement.frequency=sorted[Math.floor(sorted.length/2)];
        }else{measurement.frequency=null;history.current=[];}
        setData(measurement);
      });
      if(current!==generation.current){active.close();return;}
      engine.current=active;lastSignal.current=Date.now();setStatus('on');setWaiting(false);setDeviceName(active.track.label);
      active.track.onended=()=>{if(current===generation.current){disconnect();setError('Аудиоустройство отключено. Подключи его и выбери вход заново.');}};
      await refresh();
    }catch(err){if(current===generation.current){setError(inputError(err));setStatus('off');}}
  }
  const frequencyNow=data.frequency;
  const targetIndex=auto&&frequencyNow?tuning.midi.reduce((best,midi,i)=>Math.abs(1200*Math.log2(frequencyNow/frequency(midi)))<Math.abs(1200*Math.log2(frequencyNow/frequency(tuning.midi[best])))?i:best,0):Math.min(manual,tuning.midi.length-1);
  const target=tuning.midi[targetIndex];
  const cents=frequencyNow?1200*Math.log2(frequencyNow/frequency(target)):null;
  const inTune=cents!==null&&Math.abs(cents)<=5;
  const level=Math.max(0,Math.min(100,(20*Math.log10(data.rms||.00001)+60)/60*100));
  return <section className="panel input-panel" id="tuner"><div className="section-top"><h3>Вход и тюнер</h3><span className={'connection-status '+(status==='on'?'connected':'')}>{status==='on'?'Вход подключён':status==='requesting'?'Запрос доступа…':'Вход выключен'}</span></div><div className="input-controls"><label className="input-device"><span>Аудиовход · Mooer / USB</span><select aria-label="Устройство ввода" value={deviceId} disabled={status==='requesting'} onChange={e=>{setDeviceId(e.target.value);if(status==='on')connect(e.target.value);}}><option value="">Системный вход по умолчанию</option>{devices.map((d,i)=><option value={d.deviceId} key={d.deviceId||i}>{d.label||`Аудиовход ${i+1}`}</option>)}</select></label><button className="icon-btn" title="Обновить устройства" onClick={refresh}><RefreshCw size={16}/></button><button className={status==='on'?'disconnect-button':'primary'} disabled={status==='requesting'} onClick={()=>status==='on'?disconnect():connect()}>{status==='on'?<Power size={15}/>:<Mic size={15}/>} {status==='on'?'Отключить':'Подключить'}</button></div>{error&&<p role="alert" className="audio-error">{error}</p>}
    <div className="input-level"><span>Вход</span><div role="meter" aria-label="Уровень входа" aria-valuemin="-60" aria-valuemax="0" aria-valuenow={Math.max(-60,Math.round(20*Math.log10(data.rms||.00001)))}><i className={data.peak>.98?'clipping':''} style={{width:level+'%'}}/></div><strong>{status==='on'?Math.max(-60,Math.round(20*Math.log10(data.rms||.00001)))+' dB':'—'}</strong></div>
    {status==='on'&&data.peak>.98?<p className="audio-warning">Перегрузка: уменьши уровень USB-выхода Mooer.</p>:status==='on'&&waiting?<p className="audio-warning">Нет сигнала. Проверь USB-вход и громкость Mooer; сыграй открытую струну.</p>:<p className="input-help">{status==='on'?`${deviceName||'Аудиовход'} · сыграй одну открытую струну без эффектов`:'Нажми «Подключить» и разреши микрофон в браузере. Звук входа не выводится в динамики.'}</p>}
    <div className="tuner-options"><label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Автоопределение струны</label><span>A4 = 440 Гц</span></div>
    <div className="tuner-strings">{tuning.midi.map((midi,i)=><button key={i} className={(targetIndex===i&&(frequencyNow||!auto)?'selected':'')} onClick={()=>{setAuto(false);setManual(i);}}><span>{i+1}</span>{octaveName(midi)}</button>)}</div>
    <div className={'tuner-display '+(inTune?'in-tune':'')}><div className="tuner-target"><span>{frequencyNow||!auto?`Струна ${targetIndex+1} · ${frequency(target).toFixed(2)} Гц`:'Сыграй открытую струну'}</span><strong>{frequencyNow||!auto?octaveName(target):'—'}</strong></div><div className="tuner-reading"><strong>{cents===null?'—':(cents>0?'+':'')+cents.toFixed(0)}<small> cents</small></strong><span>{frequencyNow?frequencyNow.toFixed(2)+' Гц':status==='on'?'Ожидание ноты':'Подключи аудиовход'}</span></div></div>
    <div className="cents-gauge"><div className="gauge-zones"/><span className="gauge-center"/>{cents!==null&&<i style={{left:Math.max(0,Math.min(100,cents+50))+'%'}}/>}</div><div className="gauge-labels"><span>−50</span><span>{inTune?'В строю':cents===null?'Центы':cents<0?'Подтяни струну ↑':'Ослабь струну ↓'}</span><span>+50</span></div>
  </section>;
}
