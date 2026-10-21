import { text, readingPlane } from './linalg-stage.mjs';
export { figure } from './optimization-plot.mjs';
export const label = (key, x, y, value, tone = 'hi', anchor = 'start', size = 5.5) => ({ ...text(key, x, y, value, size, tone), font: 'sans', anchor });
export const plate = (key, from, to, tone = 'hi') => ({ t: 'rect', key, from, to, tone, plate: true });
export const line = (key, from, to, tone = 'hi') => ({ t: 'line', key, from, to, width: 0.4, tone });
export const panel = (id, prims) => readingPlane(id, [-50, 0, 50], [100, 100], prims);
export const clamp = x => Math.max(0, Math.min(1, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inlineCamera = (_m, _p, vp) => ({ azimuth: 0, elevation: 0, target: [0, 0, 25], zoom: Math.min((vp.width - 32) / 100, (vp.height - 32) / 50) });

export function fixedParams(params, expected) {
  if (!params || Object.keys(params).sort().join() !== Object.keys(expected).sort().join()) throw new Error('Unexpected scene parameters');
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(params[key]) !== JSON.stringify(value)) throw new Error(`Unknown lesson example: ${key}`);
  }
}
