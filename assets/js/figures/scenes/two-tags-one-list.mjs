import { createTraceScene } from '../objects/trace-stage.mjs';

const scene = createTraceScene("two-tags-one-list", {
  "2": "Zwei Schilder zeigen auf o1. Es wurde keine zweite Liste erzeugt.",
  "3": "append verändert o1. Beide Namen sehen den zusätzlichen Eintrag.",
  "4": "Auch der Indexzugriff verändert o1. Seine Identität bleibt gleich.",
  "5": "x wird neu gebunden. y bleibt an o1; die bisherige Liste wird nicht überschrieben."
}, null);
export const { id, viewMode, beatIds, validateParams, model, beatDuration, pose, build, trace, cameraFor, ground, readout, describe, answerValues, predictValue, displayNumbers } = scene;
