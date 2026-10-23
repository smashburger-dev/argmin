import { figure } from '../objects/optimization-plot.mjs';
import { responsibleModel, thresholdParams } from '../objects/threshold-model.mjs';
import { responsibleItems, responsibleDetail } from '../objects/threshold-stage.mjs';

export const defaults = {"threshold":0.5};
export const captions = [
  "Die Auswahlraten beider Gruppen werden aus den gelabelten Einzelfällen berechnet.",
  "Bei veränderter Schwelle ändern sich Fehler und Auswahlraten gemeinsam. Das Paritätsband bleibt fest.",
  "Ein Kandidat außerhalb des Bands bleibt ausgeschlossen. Das Qualitätsoptimum entscheidet erst innerhalb des Bands."
];
const scene = figure({ id: 'responsible-sorter', captions, validate: thresholdParams, compute: responsibleModel, items: responsibleItems, detail: responsibleDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

