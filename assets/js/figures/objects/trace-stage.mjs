import { fitZoom } from '../kit/camera.mjs';
import { records } from './trace-records.mjs';
import traceSnapshots from './python-traces-v1.json' with { type: 'json' };

// A frontal code/binding diagram, not a Python evaluator. Every value and
// identity comes from a frozen CPython capture. Only the visible pose moves.
const SIZE = 190;
const BOARD_HEIGHT = 330;
const FONT = 9;
const point = (x, y) => [x - SIZE / 2, 0, BOARD_HEIGHT / 2 - y];
const text = (key, x, y, value, tone = 'hi', code = false) => ({
  t: 'text', key, x, y, runs: [{ text: value }], size: FONT,
  font: code ? 'code' : 'label', anchor: 'start', tone,
  bb: [x, y - FONT, x + String(value).length * FONT * 0.61, y + 1],
});
const line = (key, from, to, tone = 'hi') => ({ t: 'line', key, from, to, tone, width: 0.25 });
const rect = (key, x, y, w, h, tone = 'board') => ({ t: 'rect', key, from: [x, y], to: [x + w, y + h], tone, plate: true });

function capturedRecord(trace) {
  return {
    code: trace.source.split('\n'),
    steps: trace.events.map((event, index) => ({
      id: `step-${index}`, caption: `Trace-Schritt ${index + 1}`, event: event.event,
      line: event.line, scope: event.function, bindings: event.bindings, objects: event.objects,
      output: event.output,
      ...(event.result ? { result: event.result } : {}),
      ...(event.exception ? { exception: event.exception.type } : {}),
    })),
  };
}

function recordForInputs(id, params, fallback) {
  if (id === 'bouncer' && Object.keys(params).join() === 'age' && [16, 17].includes(params.age)) {
    return capturedRecord(traceSnapshots.records[`bouncer-age-${params.age}`]);
  }
  if (id === 'ledger' && Object.keys(params).join() === 'sum0' && Number.isInteger(params.sum0) && params.sum0 >= 0 && params.sum0 <= 3) {
    return capturedRecord(traceSnapshots.records[`ledger-n0-3-sum0-${params.sum0}`] ?? traceSnapshots.records['ledger-n0-3']);
  }
  return fallback;
}

function displayBindingName(name) {
  return name.replace(/^global\./, '').replace(/^frame:\d+:/, '');
}

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
    ...text(`code-${i}`, 9, 9 + i * 10, `${i + 1}  ${value}`, i + 1 === s.line ? 'lit' : 'hi', true),
  }));
}

function objectsForStep(m, s, index) {
  return m.keepObjects
    ? Object.assign({}, ...m.steps.slice(0, index + 1).map((step) => step.objects))
    : s.objects;
}

function bindingItems(m, s, index) {
  const names = Object.keys(s.bindings);
  const objectIds = Object.keys(objectsForStep(m, s, index));
  return names.flatMap((name, i) => {
    const y = 94 + i * 42;
    const identity = s.bindings[name];
    // Python commits a binding atomically. Keep the endpoint attached to
    // its object throughout the transition; never tween through empty space.
    const targetY = objectPosition(objectIds, identity);
    const label = `${displayBindingName(name)}:${identity ?? ''}`;
    return [
      { ...rect(`name-box-${i}`, 6, y - 17, 76, 34), visible: Boolean(identity) },
      { ...text(`name-${i}`, 9, y, label, 'hi', true), visible: Boolean(identity) },
      { ...line(`bind-a-${i}`, [82, y], [91, y]), visible: Boolean(identity) },
      { ...line(`bind-b-${i}`, [91, y], [91, targetY]), visible: Boolean(identity) },
      { ...line(`bind-c-${i}`, [91, targetY], [101, targetY]), visible: Boolean(identity) },
    ];
  });
}

function objectPosition(objectIds, identity) {
  return 94 + Math.max(0, objectIds.indexOf(identity)) * 42;
}

function objectItems(m, s, index) {
  const objects = objectsForStep(m, s, index);
  return Object.keys(objects).flatMap((identity, i) => {
    const object = objects[identity];
    const y = 94 + i * 42;
    const value = (object?.value ?? '').replaceAll(', ', ',');
    return [
      { ...rect(`object-box-${i}`, 101, y - 17, 82, 34), visible: Boolean(object) },
      { ...text(`object-${i}`, 104, y, `${identity}: ${value}`, s.result === identity ? 'lit' : 'hi', true), visible: Boolean(object) },
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
    return [text('ledger-path', 6, 310, `Zeilen: ${path || '—'}`, 'hi', true)];
  },
  'smoke-detector': (m, s) => [
    text('exception', 6, 36, s.exception ? `Act: ${s.exception}` : 'Arrange: Liste vorbereiten', s.exception ? 'lit' : 'hi'),
    { ...line('unreached', [17, 19], [88, 23]), visible: Boolean(s.exception) },
  ],
};

function mechanismItems(m, s, index) {
  const output = s.output.trim() || '—';
  const rows = Math.max(Object.keys(s.bindings).length, Object.keys(objectsForStep(m, s, index)).length);
  const outputY = Math.max(169, 77 + rows * 42);
  return [
    rect('output-box', 6, outputY, 177, 34),
    text('output', 10, outputY + 21, `Ausgabe: ${output}`, s.output ? 'lit' : 'hi', true),
    ...(mechanisms[m.id]?.(m, s) ?? []),
  ];
}

function sectionHeadings(m, s) {
  if (m.id !== 'vending-frame') return [text('names-label', 6, 72, 'Namen'), text('objects-label', 101, 72, 'Objekte')];
  const scope = s.scope === '<module>' ? 'global' : `Aufruf ${s.scope}`;
  return [text('names-label', 6, 72, scope), text('objects-label', 101, 72, s.result ? 'Rückgabe' : 'Objekte')];
}

function items(m, p) {
  const index = Math.min(m.steps.length - 1, Math.max(0, Math.ceil(p.phase)));
  const s = { ...m.steps[index], index };
  const prims = [
    ...codeItems(m, s), ...sectionHeadings(m, s),
    ...bindingItems(m, s, index), ...objectItems(m, s, index), ...mechanismItems(m, s, index),
  ];
  return [{ kind: 'plane', id: 'trace-board', origin: point(0, 0), ex: [1, 0, 0], ey: [0, 0, -1], normal: [0, -1, 0], size: [SIZE, BOARD_HEIGHT], tone: 'board', prims }];
}

function sceneModel(id, record, params, custom) {
  validateParams(id, params);
  const steps = record.steps.map((step, index) => ({ ...step, id: `step-${index}`, caption: stepCaption(record, step, index, custom) }));
  return { id, code: record.code, steps,
    names: [...new Set(steps.flatMap((step) => Object.keys(step.bindings)))],
    identities: [...new Set(steps.flatMap((step) => Object.keys(step.objects)))],
    keepObjects: id === 'name-tags',
  };
}

function validateParams(id, params) {
  assertTraceParamsObject(params);
  if (Object.keys(params).length === 0 || validBouncerParameter(id, params) || validLedgerParameter(id, params)) return;
  throw new Error('Diese geprüfte Spur hat keine freien Parameter in diesem Bereich');
}

function assertTraceParamsObject(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('Trace-Parameter müssen ein Objekt sein');
}

function validBouncerParameter(id, params) {
  return id === 'bouncer' && Object.keys(params).length === 1 && Object.hasOwn(params, 'age')
    && Number.isInteger(params.age) && [16, 17].includes(params.age);
}

function validLedgerParameter(id, params) {
  return id === 'ledger' && Object.keys(params).length === 1 && Object.hasOwn(params, 'sum0')
    && Number.isInteger(params.sum0) && params.sum0 >= 0 && params.sum0 <= 3;
}

function describe(m, index) {
  const s = m.steps[index];
  const bindings = Object.entries(s.bindings).map(([name, identity]) => `${name}: ${identity} (${s.objects[identity].value})`);
  return [s.caption, ...bindings, `Ausgabe: ${s.output.trim() || 'keine'}`].join('. ');
}

function selectionTargets(m, index) {
  const s = m.steps[Math.min(m.steps.length - 1, Math.max(0, Math.floor(index)))];
  const names = Object.keys(s.bindings);
  const visibleObjects = m.keepObjects
    ? Object.assign({}, ...m.steps.slice(0, Math.floor(index) + 1).map((step) => step.objects))
    : s.objects;
  const identities = Object.keys(visibleObjects);
  const frameByScope = new Map([['global', 0]]);
  for (const name of m.names) {
    const scope = name.slice(0, name.indexOf('.'));
    if (!frameByScope.has(scope)) frameByScope.set(scope, frameByScope.size);
  }
  const targets = [
    ...names.map((name) => {
      const captured = name.match(/^frame:(\d+):(.+)$/);
      if (captured) return {
        id: `binding:${name}`,
        itemId: 'trace-board',
        primKey: `name-box-${names.indexOf(name)}`,
        label: displayBindingName(name),
        description: `${displayBindingName(name)} ist an ${s.bindings[name]} gebunden.`,
      };
      const separator = name.indexOf('.');
      const scope = name.slice(0, separator);
      const variable = name.slice(separator + 1);
      return {
        id: `binding:frame:${frameByScope.get(scope)}:${variable}`,
        itemId: 'trace-board',
        primKey: `name-box-${names.indexOf(name)}`,
        label: displayBindingName(name),
        description: `${displayBindingName(name)} ist an ${s.bindings[name]} gebunden.`,
      };
    }),
    ...identities.filter((identity) => identity !== s.result).map((identity) => ({
      id: identity.startsWith('object:') ? identity : `object:${identity}`,
      itemId: 'trace-board',
      primKey: `object-box-${identities.indexOf(identity)}`,
      label: identity,
      description: `Objektmarke ${identity}.`,
    })),
  ];
  if (s.output.trim()) targets.push({ id: `output:${index}`, itemId: 'trace-board', primKey: 'output-box', label: 'Ausgabe', description: 'Sichtbare Programmausgabe.' });
  if (s.result) targets.push({
    id: `return:${s.result}`, itemId: 'trace-board', primKey: `object-box-${identities.indexOf(s.result)}`,
    label: `Rückgabe ${s.result}`, description: `Rückgabewert des aktuellen Aufrufs: Objektmarke ${s.result}.`,
  });
  return targets;
}

function predictionValue(m, prediction) {
  const step = m.steps[prediction.step];
  if (prediction.field === 'line') return step.line;
  const identity = prediction.binding ? step.bindings[prediction.binding] : step.result;
  return Number(step.objects[identity].value);
}

export function createTraceScene(id, custom = {}, prediction = null) {
  const record = records[id];
  const model = (params) => sceneModel(id, recordForInputs(id, params, record), params, custom);
  const validate = (params) => validateParams(id, params);
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
  return { id, viewMode: 'flat', stageLayout: 'trace', beatIds, validateParams: validate, model, beatDuration, pose, build, selectionTargets,
    trace: (m) => m.steps,
    cameraFor: (m, p, vp) => {
      const camera = { azimuth: 0, elevation: 0, target: [0, 0, 0], zoom: 1 };
      camera.zoom = fitZoom(vp, [point(0, 0), point(SIZE, BOARD_HEIGHT)], camera, 16);
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
