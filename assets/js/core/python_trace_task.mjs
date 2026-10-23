const objectOptions = (count) => Object.freeze(Array.from({ length: count }, (_, index) => ({ objectId: `object:${index}`, label: `Objektmarke object:${index}` })));
const nameOptions = (entries) => Object.freeze(entries.map(([frame, name, label]) => ({ name: `frame:${frame}:${name}`, label })));
export const TRACE_TAG_CANDIDATES = Object.freeze({
  'name-tags': Object.freeze({ names: nameOptions([[0, 'a', 'a'], [0, 'b', 'b']]), objects: objectOptions(4) }),
  bouncer: Object.freeze({ names: nameOptions([[0, 'age', 'age'], [0, 'ok', 'ok'], [0, 'ticket', 'ticket']]), objects: objectOptions(3) }),
  'vending-frame': Object.freeze({ names: nameOptions([[0, 'x', 'global: x'], [1, 'x', 'Aufruf 1: x'], [2, 'x', 'Aufruf 2: x']]), objects: objectOptions(4) }),
  ledger: Object.freeze({ names: nameOptions([[0, 'n', 'n'], [0, 'summe', 'summe']]), objects: objectOptions(9) }),
  'two-tags-one-list': Object.freeze({ names: nameOptions([[0, 'x', 'x'], [0, 'y', 'y']]), objects: objectOptions(3) }),
  dictionary: Object.freeze({ names: nameOptions([[0, 'lage', 'lage']]), objects: objectOptions(2) }),
  'smoke-detector': Object.freeze({ names: nameOptions([[0, 'wert', 'wert'], [0, 'werte', 'werte']]), objects: objectOptions(2) }),
});

const candidateSet = (programId) => {
  const candidates = TRACE_TAG_CANDIDATES[programId];
  if (!candidates) throw new Error(`Trace-Programm hat keinen unabhängigen Auswahlkatalog: ${programId}`);
  return candidates;
};

export function projectTraceHintPrefix(record, safety) {
  if (safety?.kind !== 'trace-hint-prefix' || safety.schemaVersion !== 1
      || safety.cut !== 'after-last-allowed-state'
      || JSON.stringify(safety.visibleFields) !== JSON.stringify(['sourceLines', 'priorCaptions'])
      || !safety.requested || !safety.lastAllowedState) {
    throw new Error('Unsupported trace hint projection');
  }
  const events = record?.events;
  if (!Array.isArray(events) || typeof record.source !== 'string') throw new Error('Trace hint needs a recorded source and events');
  const targetIndex = events.findIndex((event) => event.ordinal === safety.target?.eventOrdinal);
  const target = events[targetIndex];
  if (!target || target.frameId !== safety.target.frameId || target.line !== safety.target.line
      || `trace:${record.programId}:${target.ordinal}` !== safety.target.lineId) {
    throw new Error('Trace hint target does not match the recorded event');
  }
  const allowedIndex = events.findIndex((event) => event.ordinal === safety.lastAllowedState.eventOrdinal);
  const allowed = events[allowedIndex];
  if (allowedIndex < 0 || allowedIndex >= targetIndex || allowed.frameId !== safety.lastAllowedState.frameId
      || allowed.line !== safety.lastAllowedState.line) throw new Error('Trace hint lastAllowedState must precede its target exactly');
  const source = record.source.split('\n');
  const lineNumbers = [...new Set(events.slice(0, allowedIndex + 1).map((event) => event.line).filter((line) => line > 0))].sort((a, b) => a - b);
  const sourceLines = lineNumbers.map((line) => ({ line, sourceLine: source[line - 1] }));
  const priorCaptions = events.slice(0, allowedIndex + 1).map((event) => `Schritt ${event.ordinal + 1}`);
  return Object.freeze({ sourceLines: Object.freeze(sourceLines), priorCaptions: Object.freeze(priorCaptions) });
}

const stable = (value) => JSON.stringify(value);

export function assertTraceTaskOptions(task, candidates = candidateSet(task?.programId)) {
  if (!task || !task.selectionOptions || stable(task.selectionOptions.names) !== stable(candidates.names)
      || stable(task.selectionOptions.objects) !== stable(candidates.objects)) {
    throw new Error('Trace selection options must be copied from the independent candidate catalog');
  }
  if (Object.hasOwn(task, 'expectedAnswer') || Object.hasOwn(task, 'states') || Object.hasOwn(task, 'events')) {
    throw new Error('Trace task parameters must not contain expected bindings or hidden events');
  }
  const names = new Set(candidates.names.map(({ name }) => name));
  const objects = new Set(candidates.objects.map(({ objectId }) => objectId));
  if (names.size !== candidates.names.length || objects.size !== candidates.objects.length) {
    throw new Error('Trace candidate catalog contains duplicate IDs');
  }
  return task;
}

function validateTraceTaskInput(record, metadata) {
  if (record?.kind !== 'python-trace' || record.schemaVersion !== 1 || record.normalization !== 's6a-visible-events/v1') {
    throw new Error('Trace task requires python-trace/v1');
  }
  if (!metadata || !/^[a-z][a-z0-9-]*$/.test(metadata.caseId || '') || !metadata.title) {
    throw new Error('Trace task needs authored case metadata');
  }
  if (!/^[a-f0-9]{64}$/.test(record.sourceHash)) throw new Error('Trace task needs a verified source hash');
}

function targetEvent(record, metadata) {
  const targetEventOrdinal = metadata.targetEventOrdinal ?? record.events.length - 1;
  if (!Number.isInteger(targetEventOrdinal) || targetEventOrdinal < 0 || targetEventOrdinal >= record.events.length) throw new Error('Trace task target ordinal is outside the recorded event sequence');
  const event = record.events[targetEventOrdinal];
  if (metadata.allowedEventKinds && !metadata.allowedEventKinds.includes(event.event)) {
    throw new Error('Trace task target is outside its authored executable-event allowlist');
  }
  return event;
}

function expectedBindings(record, event, candidates) {
  const expectedAnswer = {
    kind: 'tag-after-line',
    schemaVersion: 1,
    states: [{
      lineId: `trace:${record.programId}:${event.ordinal}`,
      bindings: Object.entries(event.bindings).sort(([left], [right]) => left.localeCompare(right))
        .map(([name, objectId]) => ({ name, objectId })),
    }],
  };
  const nameIds = new Set(candidates.names.map(({ name }) => name));
  const objectIds = new Set(candidates.objects.map(({ objectId }) => objectId));
  for (const state of expectedAnswer.states) for (const binding of state.bindings) {
    if (!nameIds.has(binding.name) || !objectIds.has(binding.objectId)) throw new Error(`Trace answer exceeds independent candidates at ${state.lineId}`);
  }
  return expectedAnswer;
}

export function createTraceTagTask(record, metadata, candidates = candidateSet(record?.programId)) {
  validateTraceTaskInput(record, metadata);
  const event = targetEvent(record, metadata);
  const sourceLines = record.source.split('\n');
  const lineIds = [`trace:${record.programId}:${event.ordinal}`];
  const lines = [{
    lineId: `trace:${record.programId}:${event.ordinal}`,
    line: event.line,
    sourceLine: event.line === 0 ? '' : (sourceLines[event.line - 1] ?? ''),
  }];
  const task = {
    schemaVersion: 1,
    programId: record.programId,
    traceKey: metadata.traceKey ?? record.programId,
    caseId: metadata.caseId,
    title: metadata.title,
    sourceHash: record.sourceHash,
    normalization: record.normalization,
    inputs: structuredClone(record.inputs),
    source: record.source,
    lines,
    lineIds,
    selectionOptions: structuredClone(candidates),
    target: { lineId: lineIds[0], frameId: event.frameId, eventOrdinal: event.ordinal, line: event.line },
  };
  assertTraceTaskOptions(task, candidates);
  const expectedAnswer = expectedBindings(record, event, candidates);
  return { task, expectedAnswer };
}
