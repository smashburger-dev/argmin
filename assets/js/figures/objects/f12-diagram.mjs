import { fitZoom } from '../kit/camera.mjs';
import { readingPlane, text } from './linalg-stage.mjs';

export const label = (key, x, y, value, size = 5.3, tone = 'hi') => text(key, x, y, value, size, tone);
export const line = (key, from, to, tone = 'hi', width = 0.5) => ({ t: 'line', key, from, to, tone, width });
export const rectangle = (key, from, to, tone = 'hi') => ({ t: 'rect', key, from, to, tone, plate: true });
export const arrow = (key, from, to, tone = 'lit') => ({ t: 'arrow', key, from, to, tone, width: 0.65 });

export function flatCamera(_model, _pose, viewport) {
  const camera = { azimuth: 0, elevation: 0, target: [0, 0, 0], zoom: 1 };
  camera.zoom = fitZoom(viewport, [[-50, 0, -50], [50, 0, 50]], camera, 16);
  return camera;
}

// Pure scene composition only. Input, navigation, gestures and paint stay
// in the shared FigureRuntime and Painter.
export function diagramScene({ id, captions, defaults, compute, frames, prediction }) {
  const beatIds = captions.map((_, index) => `step-${index}`);
  const validateParams = (params) => {
    if (JSON.stringify(params) !== JSON.stringify(defaults)) throw new Error('Unbekanntes Lektionsbeispiel');
  };
  const model = (params) => {
    validateParams(params);
    const m = compute(params);
    m.frames = frames(m);
    return m;
  };
  const pose = (_m, beat, t) => {
    const end = Math.max(0, beat);
    const u = Math.min(1, Math.max(0, t / 0.8));
    return { phase: Math.max(0, end - 1) + (end === 0 ? 0 : u * u * (3 - 2 * u)) };
  };
  const build = (m, p) => m.frames.map((prims, index) => {
    const alpha = Math.max(0, 1 - Math.abs(p.phase - index));
    return readingPlane(`${id}-${index}`, [-50, 0, 50], [100, 100],
      prims.map((prim) => ({ ...prim, alpha })), { visible: alpha > 0 });
  });
  return { id, beatIds, validateParams, model, pose, build, cameraFor: flatCamera,
    beatDuration: () => 0.8, ground: () => null, readout: () => '',
    describe: (m, beat) => `${captions[beat]} ${m.descriptions[beat]}`,
    predictValue: (m) => prediction(m), answerValues: (m) => [prediction(m)],
    displayNumbers: (m) => m.numbers,
  };
}

export function equationText(state) {
  const side = ({ x, constant }) => {
    if (x === '0') return constant;
    const variable = x === '1' ? 'x' : `${x}x`;
    if (constant === '0') return variable;
    return `${variable} ${constant.startsWith('-') ? '− ' + constant.slice(1) : '+ ' + constant}`;
  };
  return `${side(state.left)} = ${side(state.right)}`;
}

export function balanceDiagram(state, { tilt = 0, operation = '', note = '', fontSize = 5.3 } = {}) {
  return [
    label('equation', 7, 14, equationText(state), 6.3),
    line('beam', [10, 43 - tilt], [90, 43 + tilt]),
    line('stem', [50, 43], [50, 79]), line('base', [35, 79], [65, 79]),
    line('left-rope', [24, 43 - tilt], [24, 59 - tilt]),
    line('right-rope', [76, 43 + tilt], [76, 59 + tilt]),
    rectangle('left-pan', [5, 59 - tilt], [43, 73 - tilt]),
    rectangle('right-pan', [57, 59 + tilt], [95, 73 + tilt]),
    label('left-value', 8, 68 - tilt, equationText({ left: state.left, right: state.left }).split(' = ')[0], fontSize),
    label('right-value', 60, 68 + tilt, equationText({ left: state.right, right: state.right }).split(' = ')[0], fontSize),
    label('left-op', 8, 34, operation, fontSize, 'lit'), label('right-op', 61, 34, operation, fontSize, 'lit'),
    label('note', 7, 94, note, fontSize),
  ];
}
