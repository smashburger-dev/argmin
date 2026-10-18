import { figure } from '../objects/optimization-plot.mjs';
import { cleaningModel, noParams } from '../objects/pipeline-model.mjs';
import { cleaningItems, cleaningDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Alle Kundenzeilen gehen mit ihrem Befund in die Kontrolle.",
  "Die ungültige Altersangabe wird dokumentiert und ausgesondert.",
  "Die zweite identische Zeile trägt keine neue Information.",
  "None und Sentinel zählen als fehlender Zielwert. Nur vollständige Zeilen gehen in die Auswertung."
];
const scene = figure({ id: 'cleaning-line', captions, validate: noParams, compute: cleaningModel, items: cleaningItems, detail: cleaningDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

