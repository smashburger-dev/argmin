import { figure } from '../objects/optimization-plot.mjs';
import { logisticModel, thresholdParams } from '../objects/threshold-model.mjs';
import { logisticItems, logisticDetail } from '../objects/threshold-stage.mjs';

export const defaults = {"threshold":0.5};
export const captions = [
  "Dieselben Eingabewerte werden durch den linearen Term und Sigmoid in Wahrscheinlichkeiten überführt.",
  "Die Schranke trennt die Wahrscheinlichkeiten. Zähle vor dem Aufdecken die positiven Entscheidungen.",
  "Ab der Schranke gehört die Wahrscheinlichkeit zur Klasse positiv. Die Labels zeigen die getroffene Entscheidung."
];
const scene = figure({ id: 'logistic-sorter', captions, validate: thresholdParams, compute: logisticModel, items: logisticItems, detail: logisticDetail,
  answers: [m => m.checkpoint], predictions: { 'step-1': m => m.checkpoint } });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

