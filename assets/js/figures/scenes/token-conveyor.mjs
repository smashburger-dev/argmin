import { figure } from '../objects/optimization-plot.mjs';
import { tokenModel, noParams } from '../objects/pipeline-model.mjs';
import { tokenItems, tokenDetail } from '../objects/pipeline-stage.mjs';

export const defaults = {};
export const captions = [
  "Die gestellte Forward-Fixtur liefert Logits. Argmax wählt das nächste Token und erweitert den Kontext.",
  "Der nächste Durchlauf sieht den erweiterten Kontext. Das gewählte Ende-Token stoppt die Schleife."
];
const scene = figure({ id: 'token-conveyor', captions, validate: noParams, compute: tokenModel, items: tokenItems, detail: tokenDetail });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, describe, predictValue, answerValues, displayNumbers } = scene;
export const readout = () => '';
export const viewMode = 'flat';

