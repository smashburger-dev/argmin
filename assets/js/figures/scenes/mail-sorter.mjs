import { figure } from '../objects/optimization-plot.mjs';
import { mailModel, noParams } from '../objects/pipeline-model.mjs';
import { mailItems, mailDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Das Dokument bleibt untrusted. Nur der ausdrücklich erlaubte Werkzeugwunsch passiert die Schranke.",
  "Die eingeschmuggelte Versandanweisung erhält keine Autorität. Die Allowlist verweigert das Werkzeug."
];
const scene = figure({ id: 'mail-sorter', captions, validate: noParams, compute: mailModel, items: mailItems, detail: mailDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

