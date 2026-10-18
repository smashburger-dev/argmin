import { createTraceScene } from '../objects/trace-stage.mjs';

const scene = createTraceScene("name-tags", {
  "2": "b zeigt jetzt auf das neu berechnete Objekt. Die Formel wird nicht als Verbindung zu a gespeichert.",
  "3": "Nur a hängt jetzt an einem anderen Objekt. b bleibt an seinem bisherigen Objekt."
}, {"beat":"step-2","step":3,"binding":"global.a"});
export const { id, viewMode, beatIds, validateParams, model, beatDuration, pose, build, trace, cameraFor, ground, readout, describe, answerValues, predictValue, displayNumbers } = scene;

