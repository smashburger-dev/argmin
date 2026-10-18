import { createTraceScene } from '../objects/trace-stage.mjs';

const scene = createTraceScene("vending-frame", {
  "5": "Der Rückgabewert wird an den globalen Namen x gebunden. Erst die nächste Zeile druckt ihn."
}, {"beat":"step-1","step":2});
export const { id, viewMode, beatIds, validateParams, model, beatDuration, pose, build, trace, cameraFor, ground, readout, describe, answerValues, predictValue, displayNumbers } = scene;

