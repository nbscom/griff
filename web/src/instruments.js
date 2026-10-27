import { chords, notes, solos } from './music.js';
export const tunings = {
  guitar: [
    { id:'standard', name:'Стандарт', midi:[64,59,55,50,45,40] },
    { id:'drop-d', name:'Drop D', midi:[64,59,55,50,45,38], drop:true },
    { id:'eb', name:'Eb · полтона вниз', midi:[63,58,54,49,44,39] },
    { id:'drop-cs', name:'Drop C♯ · Drop D −½', midi:[63,58,54,49,44,37], drop:true },
  ],
  bass: [
    { id:'standard', name:'Стандарт', midi:[43,38,33,28] },
    { id:'drop-d', name:'Drop D', midi:[43,38,33,26] },
    { id:'eb', name:'Eb · полтона вниз', midi:[42,37,32,27] },
  ],
};
export const scales = {
  'Минорная пентатоника':[0,3,5,7,10],
  'Натуральный минор':[0,2,3,5,7,8,10],
  'Мажор':[0,2,4,5,7,9,11],
  'Блюзовая гамма':[0,3,5,6,7,10],
  'Мажорная пентатоника':[0,2,4,7,9],
  'Дорийский лад':[0,2,3,5,7,9,10],
  'Миксолидийский лад':[0,2,4,5,7,9,10],
};
export const noteName = midi => notes[((Math.round(midi)%12)+12)%12];
export const octaveName = midi => `${noteName(midi)}${Math.floor(Math.round(midi)/12)-1}`;
export const frequency = midi => 440 * 2 ** ((midi-69)/12);
export function chordVoicing(key, tuning) {
  const original = chords[key], match = key.match(/^([A-G]♯?)(.*)$/);
  const root = notes.indexOf(match[1]), suffix = match[2];
  if (suffix === '5' && tuning.drop) {
    const fret = (root-tuning.midi[5]%12+12)%12;
    return { ...original, frets:[fret,fret,fret,-1,-1,-1], barre:fret ? [fret,0,2] : null, tip:'6–5–4 струны: один палец поперёк трёх струн. На 0-м ладу — открытые струны.' };
  }
  if (tuning.id === 'standard') return original;
  let frets, barre;
  if (suffix === '5') {
    const fret = (root-tuning.midi[5]%12+12)%12;
    frets=[fret,fret+2,fret+2,-1,-1,-1];
  } else if (suffix === 'sus2') {
    const r=(root-tuning.midi[4]%12+12)%12;
    frets=[-1,r,r+2,r+2,r,r]; barre=r ? [r,1,5] : null;
  } else {
    const r=(root-tuning.midi[0]%12+12)%12;
    const shape = suffix === 'm' ? [0,2,2,0,0,0] : suffix === 'm7' ? [0,2,0,0,0,0] : suffix === '7' ? [0,2,0,1,0,0] : suffix === 'sus4' ? [0,2,2,2,0,0] : [0,2,2,1,0,0];
    frets=shape.map(f=>r+f);
    if (tuning.drop) frets[0]=-1;
    barre=r ? [r,tuning.drop ? 1 : 0,5] : null;
  }
  return { ...original, frets, barre, tip:'Названия аккордов соответствуют реальному звучанию в выбранном строе.' };
}
export function exerciseFor(instrument, id, tuning) {
  const exercise=solos[instrument].find(e=>e.id===id) || solos[instrument][0];
  // Keep the established shapes on upper strings; compensate the dropped low string.
  const low=tuning.midi.length-1;
  const dropOffset=tuning.id==='drop-d'||tuning.id==='drop-cs' ? 2 : 0;
  const pattern=exercise.pattern.map(([s,f])=>[s,f+(s===low?dropOffset:0)]);
  const transpose=tuning.id==='eb'||tuning.id==='drop-cs' ? -1 : 0;
  const root=notes[(notes.indexOf(exercise.root)+transpose+12)%12];
  return { ...exercise, pattern, root, hint:instrument==='bass'&&exercise.id==='phrase' ? exercise.hint.replace('на A',`на ${root}`) : instrument==='bass'&&exercise.id==='cross' ? `Корень на струне ${noteName(tuning.midi[3])} → октава на струне ${noteName(tuning.midi[1])}. Глуши пропущенную струну ${noteName(tuning.midi[2])}.` : exercise.id==='bend' ? `Сначала сыграй ${octaveName(tuning.midi[1]+12)} на 12-м ладу второй струны. Затем подтяни 10-й лад на тон до той же высоты. В примере звучит целевая высота бенда.` : exercise.hint, title:exercise.id==='pent' ? `Пентатоника ${root}m` : exercise.title };
}
