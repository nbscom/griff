import workletUrl from './input-worklet.js?worker&url';
export const inputConstraints = deviceId => ({
  audio: {
    echoCancellation:false, noiseSuppression:false, autoGainControl:false,
    channelCount:{ideal:1}, ...(deviceId ? {deviceId:{exact:deviceId}} : {}),
  }, video:false,
});
export async function openInput(deviceId, onData) {
  if(!window.isSecureContext)throw new Error('Для аудиовхода открой страницу по HTTPS.');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Браузер не поддерживает захват звука. Открой Safari или Chrome.');
  // Resume directly inside the click gesture, before the permission prompt (Safari).
  const context=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  const resumed=context.resume();
  let stream,source,node,mute;
  const close=()=>{
    stream?.getTracks().forEach(track=>track.stop());
    if(node){node.port.onmessage=null;node.disconnect();}
    source?.disconnect();mute?.disconnect();
    if(context.state!=='closed')context.close().catch(()=>{});
  };
  try{
    stream=await navigator.mediaDevices.getUserMedia(inputConstraints(deviceId));
    await resumed;await context.audioWorklet.addModule(workletUrl);
    source=context.createMediaStreamSource(stream);
    node=new AudioWorkletNode(context,'instrument-input');
    mute=context.createGain();mute.gain.value=0;
    node.port.onmessage=event=>onData(event.data);
    source.connect(node);node.connect(mute);mute.connect(context.destination);
    const track=stream.getAudioTracks()[0];
    return {close,stream,context,track,settings:track.getSettings()};
  }catch(error){close();throw error;}
}
export function inputError(error){
  return ({NotAllowedError:'Доступ к микрофону запрещён. Разреши его для этого сайта в настройках браузера и нажми «Подключить».',NotFoundError:'Аудиовход не найден. Подключи Mooer по USB и обнови список устройств.',NotReadableError:'Не удалось открыть аудиовход. Закрой приложения, которые заняли устройство, и попробуй снова.',OverconstrainedError:'Выбранное устройство недоступно. Обнови список и выбери вход заново.'})[error.name] || error.message;
}
