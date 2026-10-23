import { rng } from '../generator_draw_kit.mjs';
import { createTraceTagTask } from '../python_trace_task.mjs';
import traceSnapshots from '../../figures/objects/python-traces-v1.json' with { type: 'json' };
import doc from '../../../../content/families/trace-tag-after-line.json' with { type: 'json' };

const CASES = [
  { caseId: 'name-tags-assignments', traceKey: 'name-tags', allowedEventKinds: ['line'], title: 'Namen und Werte nach Zuweisungen' },
  { caseId: 'bouncer-short-circuit', traceKey: 'bouncer-age-16', adultKey: 'bouncer-age-18', allowedEventKinds: ['line'], title: 'Kurzschluss beim Türsteher' },
  { caseId: 'vending-nested-frames', traceKey: 'vending-frame', allowedEventKinds: ['call', 'return', 'line'], title: 'Verschachtelte Funktionsrahmen' },
  { caseId: 'ledger-loop-aliases', traceKey: 'ledger-n0-3', allowedEventKinds: ['line'], title: 'Akkumulator und Schleife' },
  { caseId: 'two-tags-one-list', traceKey: 'two-tags-one-list', allowedEventKinds: ['line'], title: 'Zwei Namen für eine Liste' },
  { caseId: 'dictionary-updates', traceKey: 'dictionary', allowedEventKinds: ['line'], title: 'Dictionary-Einträge überschreiben' },
  { caseId: 'smoke-detector-index-error', traceKey: 'smoke-detector', allowedEventKinds: ['line', 'exception'], title: 'Kurzschluss und Indexfehler' },
];
const byCase = new Map(CASES.map((entry) => [entry.caseId, entry]));
const drawInteger = (seed, min, max) => min + Math.floor(rng(seed)() * (max - min + 1));

function selectedRecord(spec, seed) {
  if (spec.caseId === 'bouncer-short-circuit') return traceSnapshots.records[seed % 2 ? spec.adultKey : spec.traceKey];
  if (spec.caseId === 'ledger-loop-aliases') return traceSnapshots.records[`ledger-n0-${drawInteger(seed, 1, 4)}`];
  return traceSnapshots.records[spec.traceKey];
}

function selectedState(record, seed, allowedEventKinds) {
  const eligible = record.events.filter((event) => allowedEventKinds.includes(event.event) && Object.keys(event.bindings).length > 0);
  if (!eligible.length) throw new Error(`Trace enthält keinen erlaubten ausführbaren Zustand: ${record.programId}`);
  return eligible[drawInteger(seed, 0, eligible.length - 1)].ordinal;
}

function generate({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed) || !['intro', 'core'].includes(difficulty)) throw new Error(`Unbekannter Trace-Tag-Profil ${difficulty}`);
  const spec = byCase.get(caseId);
  if (!spec) throw new Error(`Unbekannter tag-after-line-Fall ${caseId}`);
  const record = selectedRecord(spec, seed);
  const traceKey = Object.keys(traceSnapshots.records).find((key) => traceSnapshots.records[key] === record);
  const targetEventOrdinal = selectedState(record, seed, spec.allowedEventKinds);
  const { task, expectedAnswer } = createTraceTagTask(record, {
    caseId, title: spec.title, traceKey, targetEventOrdinal, allowedEventKinds: spec.allowedEventKinds,
  });
  const content = doc.cases.find((entry) => entry.caseId === caseId);
  return {
    parameters: { caseId, difficulty, tagTask: task },
    expected: expectedAnswer,
    title: spec.title,
    prompt: content.prompt,
    fullSolution: content.fullSolution,
    hints: content.hints,
    activityType: 'scene-build',
    graderId: 'deterministic',
    competencyIds: content.competencyIds,
    masteryEligible: true,
  };
}

function solve(parameters) {
  const spec = byCase.get(parameters?.caseId);
  if (!spec || !traceSnapshots.records[parameters?.tagTask?.traceKey]) throw new Error('Unbekannte Trace-Tag-Parameter');
  const record = traceSnapshots.records[parameters.tagTask.traceKey];
  const { expectedAnswer } = createTraceTagTask(record, {
    caseId: spec.caseId, title: spec.title, traceKey: parameters.tagTask.traceKey,
    targetEventOrdinal: parameters.tagTask.target?.eventOrdinal, allowedEventKinds: spec.allowedEventKinds,
  });
  if (parameters.tagTask.sourceHash !== record.sourceHash) throw new Error('Trace-Tag-Quellhash stimmt nicht');
  return expectedAnswer;
}

export const FAMILY_SPEC = {
  familyId: 'trace-tag-after-line',
  familyGroup: 'trace-state',
  summary: 'Ordnet nach jedem sichtbaren Quellschritt die Namen ihren Objektmarken zu und erhält Aliasbeziehungen.',
  taskArchetype: 'tag-after-line',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: CASES.map(({ caseId }) => ({ caseId, propertyTest: ['bouncer-short-circuit', 'ledger-loop-aliases'].includes(caseId) })),
  difficultyProfiles: ['intro', 'core'],
  competencyIds: ['c-python-control-flow', 'c-python-collections'],
  graderId: 'deterministic',
  activityType: 'scene-build',
  generate,
  solve,
};
