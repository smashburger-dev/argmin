import { createTraceScene } from '../objects/trace-stage.mjs';

const scene = createTraceScene("ledger", {}, {"beat":"step-11","step":13,"field":"line"});
export const { id, viewMode, beatIds, validateParams, model, beatDuration, pose, build, trace, cameraFor, ground, readout, describe, answerValues, predictValue, displayNumbers } = scene;

