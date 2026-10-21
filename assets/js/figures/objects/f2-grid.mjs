import { fitZoom } from '../kit/camera.mjs';
import { readingPlane } from './linalg-stage.mjs';

// Frontal lesson primitives. Coordinates are in a square 100-unit sheet.
export const label = (key, x, y, value, tone = 'hi', size = 5.8) => ({
  t: 'text', key, x, y, runs: [{ text: String(value) }], size, tone, font: 'label', anchor: 'middle',
  bb: [x - String(value).length * size * 0.3, y - size, x + String(value).length * size * 0.3, y + size * 0.2],
});
export const rect = (key, x, y, width, height, tone = 'hi') => ({ t: 'rect', key, from: [x, y], to: [x + width, y + height], tone, plate: true });
export const line = (key, from, to, tone = 'hi', width = 0.45) => ({ t: 'line', key, from, to, tone, width });
export const arrow = (key, from, to) => ({ t: 'arrow', key, from, to, tone: 'lit', width: 0.5 });
export const heading = (value) => label('heading', 50, 9, value);
export const footer = (value) => label('footer', 50, 94, value);
export const shapeText = (s) => `(${s.join(', ')})`;
export const approx = (n) => `≈ ${n.toFixed(3).replace('.', ',')}`;

export function grid(key, values, { x = 20, y = 28, cell = 18, active = () => false } = {}) {
  return values.flatMap((row, i) => row.flatMap((value, j) => {
    const tone = active(i, j) ? 'lit' : 'hi';
    return [rect(`${key}-${i}-${j}`, x + j * cell, y + i * cell, cell, cell, tone),
      label(`${key}-v-${i}-${j}`, x + (j + 0.5) * cell, y + (i + 0.5) * cell + 2, value, tone)];
  }));
}
export function block(key, x, y, width, height, name, dimensions, tone = 'hi') {
  return [rect(key, x, y, width, height, tone), label(`${key}-name`, x + width / 2, y + height / 2 - 3.5, name, tone),
    label(`${key}-shape`, x + width / 2, y + height / 2 + 7.5, dimensions, tone)];
}
function numbersIn(value) {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(numbersIn);
  return [];
}
function camera(_m, _p, viewport) {
  const cam = { azimuth: 0, elevation: 0, target: [0, 0, 0], zoom: 1 };
  cam.zoom = fitZoom(viewport, [[-50, 0, -50], [50, 0, 50]], cam, 16);
  return cam;
}
export function fixedScene({ id, captions, compute, frames, prediction = () => 0, predictionBeat = captions.length - 1 }) {
  const beatIds = captions.map((_, i) => `step-${i}`);
  const validateParams = (params, options = {}) => {
    if (options.mode === 'hint') throw new Error('F2-Hinweisvertrag noch nicht freigegeben');
    if (!params || Array.isArray(params) || Object.keys(params).length) throw new Error('Nur das feste Lektionsbeispiel ist freigegeben');
  };
  const model = (params, options) => {
    validateParams(params, options);
    const m = compute();
    m.numbers = [...new Set([0, 1, 2, 3, 4, ...numbersIn(m)])];
    m.frames = frames(m).map((prims, i) => readingPlane(`${id}-${i}`, [-50, 0, 50], [100, 100], prims));
    return m;
  };
  const pose = (_m, beat, t) => ({ phase: Math.max(0, beat - 1) + (beat === 0 ? 0 : Math.min(1, Math.max(0, t / 0.15))) });
  const build = (m, p, mode = 'lesson') => {
    if (mode !== 'lesson') throw new Error('F2-Hinweisgeometrie ist gesperrt');
    return m.frames.map((frame, i) => {
      const alpha = Math.max(0, 1 - Math.abs(p.phase - i));
      // Visibility changes are dynamic items. Reusing two cached item identities
      // for one id would make Painter skip restoring an earlier visibility state.
      const prims = alpha === 1 ? frame.prims : frame.prims.map((prim) => ({ ...prim, alpha }));
      return { ...frame, visible: alpha > 0, prims };
    });
  };
  const describe = (m, beat) => `${captions[beat]} ${m.frames[beat].prims.filter((p) => p.t === 'text').map((p) => p.runs.map((r) => r.text).join('')).join('; ')}.`;
  const predictValue = (m, beat) => {
    if (beat !== beatIds[predictionBeat]) throw new Error('Keine Vorhersage in diesem Schritt');
    return prediction(m);
  };
  return { id, beatIds, validateParams, model, pose, build, cameraFor: camera, describe, predictValue,
    beatDuration: () => 0.15, ground: () => null, readout: () => '',
    answerValues: (m) => [prediction(m)], displayNumbers: (m) => m.numbers };
}
