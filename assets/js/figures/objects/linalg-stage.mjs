import { deg, fitZoom } from '../kit/camera.mjs';

export const text = (key, x, y, value, size = 2.1, tone = 'hi') => ({
  t: 'text', key, x, y, runs: [{ text: String(value) }], size, tone, font: 'math', anchor: 'start',
  bb: [x, y - size, x + String(value).length * size * 0.58, y + size * 0.2],
});
export const solid = (id, mesh, tone = 'mid', extra = {}) => ({ kind: 'solid', id, mesh, tone, ...extra });
export const stroke = (id, pts, tone = 'mid', width = 0.3) => ({ kind: 'stroke', id, pts, tone, width });
export function readingPlane(id, origin, size, prims, extra = {}) {
  return { kind: 'plane', id, origin, ex: [1, 0, 0], ey: [0, 0, -1], normal: [0, -1, 0], size, tone: 'board', prims, ...extra };
}
const ease = (t) => t * t * (3 - 2 * t);
export function createScene(config) {
  const beatIds = config.captions.map((_, i) => `step-${i}`);
  const validateParams = (params) => {
    if (!params || Object.keys(params).sort().join(',') !== Object.keys(config.defaults).sort().join(',')) throw new Error('Unexpected scene parameters');
    for (const [key, value] of Object.entries(params)) {
      if (!Number.isFinite(value) || Math.abs(value) > 6) throw new Error(`Invalid parameter ${key}`);
    }
    config.validate?.(params);
  };
  const model = (params) => {
    validateParams(params);
    const m = config.model(params);
    m.world = config.worldItems(m);
    return m;
  };
  const beatDuration = (id) => {
    if (!beatIds.includes(id)) throw new Error('Unknown beat');
    return 1.6;
  };
  const pose = (m, beat, t) => {
    const k = Math.min(beatIds.length - 1, Math.max(0, beat));
    const progress = ease(Math.min(1, Math.max(0, t / beatDuration(beatIds[k]))));
    const phase = Math.max(0, k - 1) + (k === 0 ? 0 : progress);
    return { phase, camera: 'world' };
  };
  const build = (m, p, mode = 'lesson') => {
    if (mode !== 'lesson') throw new Error('S3 scenes do not expose hint geometry');
    return [...m.world, ...config.items(m, p.phase)];
  };
  const cameraFor = (m, p, vp) => {
    const cam = { azimuth: deg(config.azimuth ?? 42), elevation: deg(config.elevation ?? 35), target: config.target ?? [0, 0, 8], zoom: 1 };
    cam.zoom = fitZoom(vp, config.bounds, cam, config.padding ?? 18);
    return cam;
  };
  const describe = (m, k) => `${config.captions[k]} ${config.lines(m, k).join('. ')}`;
  const predictValue = (m, beat) => {
    if (beat !== beatIds[config.predictBeat]) throw new Error('No prediction on this beat');
    return config.predict(m);
  };
  return { id: config.id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor,
    ground: () => config.ground,
    readout: (m, p) => config.lines(m, p.phase)[0], describe, predictValue,
    answerValues: (m) => [config.predict(m)],
    displayNumbers: (m) => [...new Set([...config.numbers(m), ...Object.values(config.defaults), 0, 1, 2, 3])],
  };
}
