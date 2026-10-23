import { createTraceTagTask, assertTraceTaskOptions, projectTraceHintPrefix } from '../../core/python_trace_task.mjs';
import traceSnapshot from '../objects/python-traces-v1.json' with { type: 'json' };
import { figure, label, line } from '../objects/s8b-diagram.mjs';
import { readingPlane } from '../objects/linalg-stage.mjs';

export const id = 'python-trace-tag';
export const viewMode = 'flat';
export const captions = ['Ordne nach jedem ausgeführten Schritt die Namen den Objektmarken zu.'];
const tracePanel = (id, prims) => readingPlane(id, [-75, 0, 75], [150, 100], prims);

function validateTask(task) {
  assertTraceTaskShape(task);
  assertTraceTaskOptions(task);
  assertTraceTaskLines(task);
  assertRecordedTraceTarget(task);
}

function assertTraceTaskShape(task) {
  if (!task || task.schemaVersion !== 1 || task.normalization !== 's6a-visible-events/v1'
      || typeof task.source !== 'string' || !Array.isArray(task.lines) || !Array.isArray(task.lineIds)
      || task.lines.length !== task.lineIds.length || !task.lines.length) throw new Error('Ungültige python-trace-tag Aufgabe');
}

function assertTraceTaskLines(task) {
  if (task.lines.some((row, index) => row.lineId !== task.lineIds[index]
      || typeof row.sourceLine !== 'string' || !Number.isInteger(row.line) || row.line < 0)) {
    throw new Error('Trace-Zeilen müssen exakt der geordneten Eingabespur folgen');
  }
  if (task.lines.some((row) => !row.lineId.startsWith(`trace:${task.programId}:`))) throw new Error('Trace-Zeilen-ID passt nicht zum Programm');
}

function assertRecordedTraceTarget(task) {
  const record = traceSnapshot.records[task.traceKey];
  assertTraceProgramIdentity(task, record);
  const target = record?.events?.[task.target?.eventOrdinal];
  assertTraceEventIdentity(task, record, target);
}

function assertTraceProgramIdentity(task, record) {
  if (!record || record.programId !== task.programId || task.sourceHash !== record.sourceHash || task.source !== record.source) {
    throw new Error('Trace-Ziel muss zu einem aufgezeichneten CPython-Schritt gehören');
  }
}

function assertTraceEventIdentity(task, record, target) {
  if (!target || target.ordinal !== task.target.eventOrdinal || target.frameId !== task.target.frameId
      || target.line !== task.target.line || task.target.lineId !== `trace:${task.programId}:${target.ordinal}`
      ) throw new Error('Trace-Ziel muss zu einem aufgezeichneten CPython-Schritt gehören');
}

function fixedNeighborTask(params) {
  if (!params || !/^[a-z][a-z0-9-]*$/.test(params.caseId || '')
      || !Object.hasOwn(traceSnapshot.records, params.traceKey)) throw new Error('Ungültiger fester Trace-Nachbar');
  const record = traceSnapshot.records[params.traceKey];
  return createTraceTagTask(record, { caseId: params.caseId, title: 'Festes Nachbarbeispiel', traceKey: params.traceKey }).task;
}

function normalizedParams(params, options = {}) {
  if (options.mode !== 'hint' || params?.tagTask) return params;
  const task = fixedNeighborTask(params);
  const safety = params.traceHintSafety;
  return { tagTask: task, traceHintSafety: safety };
}

function compute(params) {
  validateTask(params?.tagTask);
  return { task: structuredClone(params.tagTask) };
}

function items(model, _phase) {
  const task = model.task;
  const record = traceSnapshot.records[task.traceKey];
  const target = record.events[task.target.eventOrdinal];
  const prior = record.events.slice(0, target.ordinal);
  const priorState = prior.at(-1);
  const knownObjects = new Map();
  for (const event of prior) for (const [objectId, value] of Object.entries(event.objects)) knownObjects.set(objectId, value);
  const sourceRows = task.source.split('\n').map((code, index) => label(`source-${index}`, 3, 12 + index * 6, `${index + 1}  ${code}`, 'ink'));
  const markerY = 7 + task.target.line * 6;
  const lineMarker = task.target.line > 0 ? line('active-source-line', [1, markerY], [52, markerY], 'accent', { width: 0.35 }) : null;
  const stateLabels = Object.entries(priorState?.bindings ?? {}).map(([name, objectId], index) =>
    label(`prior-binding-${index}`, 3, 74 + index * 6, `${name} → ${objectId}`, 'hi'));
  const objectLabels = [...knownObjects].map(([objectId, value], index) =>
    label(`prior-object-${index}`, 87, 13 + index * 8, `${objectId}: ${value.type} ${value.value}`, 'lit', 'start', 4.2));
  const eventLabel = ({ call: 'Aufruf', return: 'Rückgabe', exception: 'Ausnahme', line: 'Zeile' })[target.event] ?? 'Start';
  const functionLabel = target.function === '<module>' ? 'Hauptprogramm' : target.function;
  return [tracePanel('python-trace-tag-board', [
    label('task-title', 3, 5, task.title, 'hi'),
    label('known-objects-heading', 87, 5, 'Bisher bekannte Objektmarken', 'hi', 'start', 4.2),
    label('target-step', 3, 50, `Schritt ${target.ordinal + 1} · ${eventLabel} · ${functionLabel}`, 'lit'),
    label('identity-rule', 3, 58, 'Neue Marke: nächste Nummer. Bekanntes Objekt: bisherige Marke.', 'hi'),
    label('prior-heading', 3, 66, priorState ? `Direkt davor · Schritt ${priorState.ordinal + 1}` : 'Direkt davor · Start', 'hi'),
    ...sourceRows,
    ...(lineMarker ? [lineMarker] : []),
    ...stateLabels,
    ...objectLabels,
  ])];
}

const scene = figure({
  id,
  captions,
  validate: (params) => validateTask(params?.tagTask),
  compute,
  items,
  detail: (model, phase) => {
    const row = model.task.lines[Math.min(model.task.lines.length - 1, Math.max(0, Math.floor(phase)))];
    const { target } = model.task;
    const event = traceSnapshot.records[model.task.traceKey].events[target.eventOrdinal];
    const kind = ({ call: 'Aufruf', return: 'Rückgabe', exception: 'Ausnahme', line: 'Zeile' })[event.event] ?? 'Start';
    const frame = event.function === '<module>' ? 'Hauptprogramm' : event.function;
    return `Trace-Schritt ${target.eventOrdinal + 1} · ${kind} · ${frame}. Quellzeile ${row.line || 'Start'}. ${row.sourceLine}`;
  },
});

const lessonModel = scene.model;
export const beatIds = scene.beatIds;
export const validateParams = (params, options = {}) => {
  const normalized = normalizedParams(params, options);
  if (options.mode === 'hint' && normalized.traceHintSafety) safeHintProjection(normalized, normalized.traceHintSafety);
  return scene.validateParams({ tagTask: normalized.tagTask });
};
export const model = (params, options = {}) => {
  const normalized = normalizedParams(params, options);
  if (options.mode === 'hint') {
    const safety = normalized.traceHintSafety;
    if (!safety) throw new Error('Trace-Hinweis braucht einen geprüften Präfixvertrag');
    return { hintProjection: safeHintProjection(normalized, safety) };
  }
  const result = lessonModel({ tagTask: normalized.tagTask });
  return result;
};
export const { pose, beatDuration, ground, predictValue, answerValues } = scene;
export const describe = (m, index, mode) => mode === 'hint'
  ? (m.hintProjection?.priorCaptions[index] ?? '')
  : scene.describe(m, index, mode);
export const readout = (m, pose, mode) => mode === 'hint'
  ? describe(m, 0, mode)
  : scene.readout(m, pose, mode);
export const build = (m, phase, mode = 'lesson') => {
  if (mode === 'lesson') return scene.build(m, phase, mode);
  if (mode !== 'hint') throw new Error(`Unbekannter python-trace-tag Modus: ${mode}`);
  const projection = m.hintProjection;
  if (!projection) throw new Error('Trace-Hinweis braucht eine geprüfte Präfixprojektion');
  const sourceRows = projection.sourceLines.map(({ line: number, sourceLine }, index) =>
    label(`hint-source-${index}`, 3, 12 + index * 7, `${number}  ${sourceLine}`, 'ink'));
  const captions = projection.priorCaptions.map((caption, index) =>
    label(`hint-prior-${index}`, 3, 62 + index * 4, caption, 'lit'));
  return [tracePanel('python-trace-tag-hint-prefix', sourceRows.concat(captions))];
};
export const cameraFor = (_model, _phase, viewport) => ({
  azimuth: 0, elevation: 0, target: [0, 0, 25],
  zoom: Math.min((viewport.width - 32) / 150, (viewport.height - 32) / 50),
});
export const displayNumbers = (model) => [...new Set(model.task.source.match(/-?\d+/g)?.map(Number) ?? [])];
export const trace = (model) => {
  const record = traceSnapshot.records[model.task.traceKey];
  if (!record || record.sourceHash !== model.task.sourceHash) throw new Error('Trace-Hinweisdatensatz stimmt nicht mit der Aufgabe überein');
  return record.events.map((event) => ({
    ...event,
    id: `trace:${record.programId}:${event.ordinal}`,
    caption: `Schritt ${event.ordinal + 1}`,
  }));
};
export const source = (params) => (params.tagTask ?? fixedNeighborTask(params)).source;
export const hintParams = (_familyId, parameters) => ({ tagTask: parameters.tagTask });
export const hintBeatIds = ['step-0'];
export const safeHintProjection = (parameters, safety) => {
  const task = parameters.tagTask ?? fixedNeighborTask(parameters);
  const record = traceSnapshot.records[task.traceKey];
  if (!record || task.sourceHash !== record.sourceHash) throw new Error('Trace-Hinweisdatensatz stimmt nicht mit der Aufgabe überein');
  return projectTraceHintPrefix(record, safety);
};
export const safeTaskForRecord = createTraceTagTask;
