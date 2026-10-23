import { createTraceScene } from '../objects/trace-stage.mjs';

const scene = createTraceScene("smoke-detector", {}, null);
export const { id, viewMode, beatIds, validateParams, model, beatDuration, pose, build, trace, cameraFor, ground, readout, describe, answerValues, predictValue, displayNumbers, selectionTargets } = scene;
