import { createTraceScene } from '../objects/trace-stage.mjs';

const scene = createTraceScene("bouncer", {
  "0": "ticket ist absichtlich noch nicht gebunden. Prüfe, ob Python diesen Namen überhaupt liest.",
  "2": "Die Altersprüfung ist falsch. ticket wird nicht gelesen; hier entsteht deshalb kein NameError."
}, null);
export const { id, viewMode, beatIds, validateParams, model, beatDuration, pose, build, trace, cameraFor, ground, readout, describe, answerValues, predictValue, displayNumbers, selectionTargets } = scene;
