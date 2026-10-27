import {intervals,intervalPositions} from './intervals.js';
export {degreeNames,intervalStudy as bassStudy,intervalDegree as bassIntervalDegree,closestIntervalPair as closestBassIntervalPair,semitoneLabel} from './intervals.js';
export const bassIntervals=intervals.filter(([,value])=>[0,3,4,5,7,10,12].includes(value));
export const bassIntervalPositions=(tuning,study)=>intervalPositions(tuning,study,20);
