import { figure } from '../objects/optimization-plot.mjs';
import { tradesModel, noParams } from '../objects/pipeline-model.mjs';
import { tradesItems, tradesDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Die erste Stage liefert docs innerhalb ihres Budgets.",
  "Die virtuelle Uhr überschreitet das Retrieval-Budget. Es entsteht ein Timeout statt rankings.",
  "Ohne gültige Übergabe bleibt der Bericht stehen. Ein Ersatzwert würde den Abbruch verschleiern."
];
const scene = figure({ id: 'trades-stopwatch', captions, validate: noParams, compute: tradesModel, items: tradesItems, detail: tradesDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

