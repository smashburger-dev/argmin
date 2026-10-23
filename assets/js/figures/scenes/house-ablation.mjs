import { figure } from '../objects/optimization-plot.mjs';
import { ablationModel, noParams } from '../objects/pipeline-model.mjs';
import { ablationItems, ablationDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Die Kontrolle blockiert die Injektionsfrage. Das kostet einen Retrieval-Treffer.",
  "Nach Entfernen der Kontrolle steigt der Recall. Gleichzeitig wird die unsichere Freigabe sichtbar."
];
const scene = figure({ id: 'house-ablation', captions, validate: noParams, compute: ablationModel, items: ablationItems, detail: ablationDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

