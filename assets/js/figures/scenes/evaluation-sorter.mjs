import { figure } from '../objects/optimization-plot.mjs';
import { evalModel, thresholdParams } from '../objects/threshold-model.mjs';
import { thresholdItems, thresholdDetail } from '../objects/threshold-stage.mjs';

export const defaults = {"threshold":0.5};
export const captions = [
  "Die niedrige Schranke lässt viele Fälle als positiv passieren. Gefüllte Punkte sind tatsächlich positiv.",
  "Die mittlere Schranke zählt dieselben Fälle neu in die vier Matrixfächer.",
  "Aus den vier Matrixfächern wird F1 berechnet. Kein Zähler folgt einem vorgegebenen Kurvenverlauf.",
  "Die hohe Schranke vermeidet falsche Alarme und übersieht dafür mehr positive Fälle."
];
const scene = figure({ id: 'evaluation-sorter', captions, validate: thresholdParams, compute: evalModel, items: thresholdItems, detail: thresholdDetail,
  answers: [m => m.checkpoint], predictions: { 'step-1': m => m.checkpoint } });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

