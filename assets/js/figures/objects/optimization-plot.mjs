import { readingPlane, text, stroke } from './linalg-stage.mjs';
import { clamp } from './optimization-model.mjs';

export const label = (key, x, y, value, tone = 'hi', anchor = 'start') => ({ ...text(key, x, y, value, 5, tone), font: 'sans', anchor });
export const line = (key, from, to, tone = 'hi', extra = {}) => ({ t: 'line', key, from, to, tone, width: 0.35, ...extra });
export const dot = (key, at, tone = 'lit', extra = {}) => ({ t: 'dot', key, at, r: 1.2, tone, ...extra });
export const panel = prims => readingPlane('plot-labels', [-50, -0.1, 50], [100, 100], prims);
export const worldPoint = ([x, y]) => [x - 50, -0.2, 50 - y];
export const curve = (id, points, tone = 'hi', extra = {}) => ({ ...stroke(id, points.map(worldPoint), tone, 0.5), ...extra });
export const flatCamera = (m, p, vp) => ({ azimuth: 0, elevation: 0, target: [0, 0, 0], zoom: Math.min(vp.width, vp.height) / 110 });

// Scene contract helper only: no events, DOM, rendering or grading authority.
export function figure({ id, captions, validate, compute, items, detail, answers = [], predictions = {} }) {
  const beatIds = captions.map((_, i) => `step-${i}`);
  const cache = new WeakMap();
  const model = params => { validate(params); return compute(params); };
  const pose = (m, beat, time) => {
    const k = Math.max(0, Math.min(beatIds.length - 1, beat));
    const t = clamp(time / 1.6), smooth = t * t * (3 - 2 * t);
    return { phase: Math.max(0, k - 1) + (k === 0 ? 0 : smooth), camera: 'world' };
  };
  const build = (m, p, mode = 'lesson') => {
    if (mode !== 'lesson') throw new Error('F7 hint contract not assigned');
    let states = cache.get(m);
    if (!states) { states = new Map(); cache.set(m, states); }
    if (!Number.isInteger(p.phase)) return items(m, p.phase);
    if (!states.has(p.phase)) states.set(p.phase, items(m, p.phase));
    return states.get(p.phase);
  };
  return { id, beatIds, validateParams: validate, model, pose, build,
    beatDuration: beat => { if (!beatIds.includes(beat)) throw new Error('Unknown beat'); return 1.6; },
    cameraFor: flatCamera, ground: () => null,
    readout: (m, p) => detail(m, p.phase),
    describe: (m, k) => `${captions[k]} ${detail(m, k)}`,
    answerValues: m => answers.map(fn => fn(m)),
    predictValue: (m, beat) => { if (!predictions[beat]) throw new Error('No prediction'); return predictions[beat](m); },
    displayNumbers: m => [...new Set([0, 1, 2, 3, 4, 5, 10, ...numericLeaves(m)])],
  };
}

function numericLeaves(value) {
  if (typeof value === 'number') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(numericLeaves);
}
