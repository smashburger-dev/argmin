import { figure } from '../objects/optimization-plot.mjs';
import { baselineModel } from '../objects/threshold-model.mjs';
import { noParams } from '../objects/pipeline-model.mjs';
import { baselineItems, thresholdDetail } from '../objects/threshold-stage.mjs';

export const defaults = {};
export const captions = [
  "Jeder Punkt ist ein Fall. Die Majority-Baseline sagt immer „kein Betrug“.",
  "Der einzige Betrugsfall landet ebenfalls bei negativ. Die hohe Accuracy verdeckt Recall null."
];
const scene = figure({ id: 'baseline-sorter', captions, validate: noParams, compute: baselineModel, items: baselineItems, detail: thresholdDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

