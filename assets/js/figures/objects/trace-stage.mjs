import { fitZoom } from '../kit/camera.mjs';
import { records } from './trace-records.mjs';

// A frontal code/binding diagram, not a Python evaluator. Every value and
// identity comes from a frozen CPython capture. Only the visible pose moves.
const SIZE = 100;
const FONT = 5.1;
const point = (x, y) => [x - SIZE / 2, 0, SIZE / 2 - y];
const text = (key, x, y, value, tone = 'hi', code = false) => ({
  t: 'text', key, x, y, runs: [{ text: value }], size: FONT,
  font: code ? 'code' : 'label', anchor: 'start', tone,
  bb: [x, y - FONT, x + String(value).length * FONT * 0.61, y + 1],
});
const line = (key, from, to, tone = 'hi') => ({ t: 'line', key, from, to, tone, width: 0.25 });
const rect = (key, x, y, w, h, tone = 'board') => ({ t: 'rect', key, from: [x, y], to: [x + w, y + h], tone, plate: true });

function stepCaption(record, step, index, custom) {
  if (custom[index]) return custom[index];
  if (step.event === 'start') return 'Noch keine Zeile ausgeführt. Die Namen sind noch nicht gebunden.';
  if (step.event === 'call') return `Aufruf von ${step.scope}: Das Argument wird an den lokalen Namen gebunden.`;
  if (step.event === 'return') return `${step.scope} gibt ${step.objects[step.result].value} zurück. Das ist noch keine Ausgabe.`;
  if (step.event === 'exception') return `Zeile ${step.line} löst ${step.exception} aus. Die folgende Zeile wird nicht erreicht.`;
  return `Zeile ${step.line} ausgeführt: ${record.code[step.line - 1].trim()}`;
}

function codeItems(m, s) {
  return m.code.map((value, i) => ({
    ...text(`code-${i}`, 9, 9 + i * 6, `${i + 1}  ${value}`, i + 1 === s.line ? 'lit' : 'hi', true),
  }));
}

function bindingItems(m, s) {
  return m.names.flatMap((name, i) => {
    const y = 60 + i * 13;
    const identity = s.bindings[name];
    // Python commits a binding atomically. Keep the endpoint attached to
    // its object throughout the transition; never tween through empty space.
    const targetY = objectPosition(m, s, identity);
    const label = `${name.replace('global.', '')}:${identity ?? ''}`;
    return [
      { ...rect(`name-box-${i}`, 6, y - 6, 29, 9), visible: Boolean(identity) },
      { ...text(`name-${i}`, 8, y, label, 'hi', true), visible: Boolean(identity) },
      { ...line(`bind-a-${i}`, [35, y - 2], [40 + i * 3, y - 2]), visible: Boolean(identity) },
      { ...line(`bind-b-${i}`, [40 + i * 3, y - 2], [40 + i * 3, targetY - 2]), visible: Boolean(identity) },
      { ...line(`bind-c-${i}`, [40 + i * 3, targetY - 2], [49, targetY - 2]), visible: Boolean(identity) },
    ];
  });
}

function objectPosition(m, state, identity) {
  const keys = m.keepObjects ? m.identities : Object.keys(state.objects);
  return 60 + Math.max(0, keys.indexOf(identity)) * 13;
}

function objectItems(m, s, index) {
  const seen = Object.assign({}, ...m.steps.slice(0, index + 1).map((step) => step.objects));
  const objects = m.keepObjects ? seen : s.objects;
  return m.identities.flatMap((identity, i) => {
    const object = objects[identity];
    const y = objectPosition(m, s, identity);
    const value = (object?.value ?? '').replaceAll(', ', ',');
    return [
      { ...rect(`object-box-${i}`, 49, y - 6, 46, 10), visible: Boolean(object) },
      { ...text(`object-${i}`, 51, y, `${identity}: ${value}`, s.result === identity ? 'lit' : 'hi', true), visible: Boolean(object) },
    ];
  });
}

const mechanisms = {
  bouncer: (m, s) => [
    text('gate-left', 6, 36, 'Alter ≥ 18', s.line === 2 ? 'lit' : 'hi'),
    text('gate-right', 52, 36, 'ticket: ungelesen'),
    { ...line('gate-cross', [52, 30], [94, 38]), visible: s.line >= 2 },
  ],
  ledger: (m, s) => {
    const path = m.steps.slice(Math.max(1, s.index - 3), s.index + 1).map((step) => step.line).join(' → ');
    return [text('ledger-path', 6, 87, `Zeilen: ${path || '—'}`, 'hi', true)];
  },
  'smoke-detector': (m, s) => [
    text('exception', 6, 36, s.exception ? `Act: ${s.exception}` : 'Arrange: Liste vorbereiten', s.exception ? 'lit' : 'hi'),
    { ...line('unreached', [17, 19], [88, 23]), visible: Boolean(s.exception) },
  ],
};

function mechanismItems(m, s) {
  const output = s.output.trim() || '—';
  return [text('output', 6, 98, `Ausgabe: ${output}`, s.output ? 'lit' : 'hi', true), ...(mechanisms[m.id]?.(m, s) ?? [])];
}

function sectionHeadings(m, s) {
  if (m.id !== 'vending-frame') return [text('names-label', 6, 49, 'Namen'), text('objects-label', 49, 49, 'Objekte')];
  const scope = s.scope === '<module>' ? 'global' : `Aufruf ${s.scope}`;
  return [text('names-label', 6, 49, scope), text('objects-label', 49, 49, s.result ? 'Rückgabe' : 'Objekte')];
}

function items(m, p) {
  const index = Math.min(m.steps.length - 1, Math.max(0, Math.ceil(p.phase)));
  const s = { ...m.steps[index], index };
  const prims = [
    ...codeItems(m, s), ...sectionHeadings(m, s),
    ...bindingItems(m, s), ...objectItems(m, s, index), ...mechanismItems(m, s),
  ];
  return [{ kind: 'plane', id: 'trace-board', origin: point(0, 0), ex: [1, 0, 0], ey: [0, 0, -1], normal: [0, -1, 0], size: [SIZE, SIZE], tone: 'board', prims }];
}

function sceneModel(id, record, params, custom) {
  validateParams(params);
  const steps = record.steps.map((step, index) => ({ ...step, id: `step-${index}`, caption: stepCaption(record, step, index, custom) }));
  return { id, code: record.code, steps,
    names: [...new Set(steps.flatMap((step) => Object.keys(step.bindings)))],
    identities: [...new Set(steps.flatMap((step) => Object.keys(step.objects)))],
    keepObjects: id === 'name-tags',
  };
}

function validateParams(params) {
  if (!params || Object.keys(params).length) throw new Error('Diese geprüfte Spur hat keine freien Parameter');
}

function describe(m, index) {
  const s = m.steps[index];
  const bindings = Object.entries(s.bindings).map(([name, identity]) => `${name}: ${identity} (${s.objects[identity].value})`);
  return [s.caption, ...bindings, `Ausgabe: ${s.output.trim() || 'keine'}`].join('. ');
}

function predictionValue(m, prediction) {
  const step = m.steps[prediction.step];
  if (prediction.field === 'line') return step.line;
  const identity = prediction.binding ? step.bindings[prediction.binding] : step.result;
  return Number(step.objects[identity].value);
}

export function createTraceScene(id, custom = {}, prediction = null) {
  const record = records[id];
  const model = (params) => sceneModel(id, record, params, custom);
  const reference = model({});
  const beatIds = reference.steps.map((step) => step.id);
  const beatDuration = (beat) => {
    if (!beatIds.includes(beat)) throw new Error('Unbekannter Trace-Schritt');
    return 0.65;
  };
  const pose = (m, beat, time) => {
    const k = Math.min(m.steps.length - 1, Math.max(0, beat));
    return { phase: Math.max(0, k - 1) + (k ? Math.min(1, Math.max(0, time / 0.65)) : 0), camera: 'front' };
  };
  const build = (m, p, mode = 'lesson') => {
    if (mode !== 'lesson') throw new Error('Trace-Hinweise sind ohne separaten Präfixvertrag gesperrt');
    return items(m, p);
  };
  return { id, viewMode: 'flat', beatIds, validateParams, model, beatDuration, pose, build,
    trace: (m) => m.steps,
    cameraFor: (m, p, vp) => {
      const camera = { azimuth: 0, elevation: 0, target: [0, 0, 0], zoom: 1 };
      camera.zoom = fitZoom(vp, [point(0, 0), point(SIZE, SIZE)], camera, 16);
      return camera;
    },
    ground: () => null,
    readout: () => '',
    describe,
    answerValues: (m) => prediction ? [predictionValue(m, prediction)] : [],
    predictValue: (m, beat) => {
      if (!prediction || beat !== prediction.beat) throw new Error('Keine Vorhersage an diesem Schritt');
      return predictionValue(m, prediction);
    },
    displayNumbers: (m) => [...new Set([0, ...m.code.flatMap((code) => (code.match(/-?\d+/g) ?? []).map(Number)),
      ...m.steps.flatMap((s) => Object.values(s.objects).flatMap((o) => (o.value.match(/-?\d+/g) ?? []).map(Number))),
      ...m.steps.map((s) => s.line)])],
  };
}
