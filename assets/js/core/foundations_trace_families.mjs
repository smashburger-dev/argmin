// S4D1 Trace-Familien (Foundations): ExerciseFamily-Runtime für
// trace-assignment-state, trace-call-composition, trace-collection-state,
// aggregate-accumulator-count, trace-dict-state-update, trace-exception-path.
//
// Dünne Wrapper um die bestehenden Seed-Generatoren aus
// foundations_fresh_generators.mjs (unverändert wiederverwendet, nichts
// dupliziert): Der Falltyp pinnt die Generatorform, der Seed rotiert die
// Instanz, das Profil filtert die Zahlenlage per Rejection-Sampling — das
// erhält alle Generatorinvarianten, weil nur gültige Generatorausgaben
// übernommen werden. Die Referenzsolver sind eigenständig implementiert und
// lesen nie `expected` ab.

import {
  genPythonStateTrace,
  genCodeReadingOutput,
  genFunctionCompose,
  genControlFlowOutput,
  genCollectionStepTrace,
  genExceptionBoundary,
} from './foundations_fresh_generators.mjs';
import { staticCaseBody } from '../domain/family_registry.mjs';

export const TRACE_DIFFICULTY_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

// Ziehlogik aus generator_draw_kit (eine Stelle, keine Duplikate).
// traceSubseed bleibt als Alias erhalten.
export { drawFamilyInstance, familySubseed as traceSubseed } from './generator_draw_kit.mjs';
import { drawFamilyInstance as drawInstance } from './generator_draw_kit.mjs';

function requireTraceProfile(difficulty) {
  if (!TRACE_DIFFICULTY_PROFILES.includes(difficulty)) throw new Error(`Unbekanntes Profil ${difficulty}`);
}

const drawTraceInstance = (generate, options) => drawInstance(generate, { ...options, profiles: TRACE_DIFFICULTY_PROFILES });

const maxAbs = (values) => values.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
const hasNegative = (values) => values.some((value) => value < 0);

// --- trace-assignment-state --------------------------------------------------
// Laufzeit-Archetyp: output-predict-lines. Quelle ist genPythonStateTrace
// (drei Zuweisungsformen mit Überschreibung) plus genCodeReadingOutput (vier
// Einmalzuweisungsformen: Umgebungstabelle plus stdout-Puffer, der
// Überschreibungsschritt läuft dort vakant — dokumentiert, keine eigene
// Fallverzweigung im Lösungsweg).

const ASSIGNMENT_STATE_SHAPES = {
  'reassign-two-variables-print': 'reassign',
  'chain3-overwrite-print': 'chain3',
  'accumulate-reassign-print': 'accumulate',
};

const ASSIGNMENT_READING_SHAPES = {
  'slice-predict-output': 'slice',
  'join-split-predict': 'join',
  'comprehension-predict': 'comprehension',
  'method-chain-transform': 'transform',
};

function assignmentStateNumbers(caseId, parameters) {
  if (caseId === 'reassign-two-variables-print') return [parameters.a0, parameters.k1, parameters.k2];
  if (caseId === 'chain3-overwrite-print') return [parameters.x0, parameters.k1, parameters.k2];
  return [parameters.n0, parameters.k1, parameters.f1, parameters.g1];
}

function assignmentProfileAccepts(caseId, difficulty) {
  if (difficulty === 'core') return null;
  if (ASSIGNMENT_STATE_SHAPES[caseId]) {
    if (difficulty === 'intro') {
      return (parameters) => maxAbs(assignmentStateNumbers(caseId, parameters)) <= 6;
    }
    if (difficulty === 'stretch') {
      return (parameters) => hasNegative(assignmentStateNumbers(caseId, parameters));
    }
    return (parameters) => {
      const numbers = assignmentStateNumbers(caseId, parameters);
      return hasNegative(numbers) && maxAbs(numbers) >= 8;
    };
  }
  if (caseId === 'slice-predict-output') {
    if (difficulty === 'intro') return (parameters) => parameters.b - parameters.a <= 3;
    if (difficulty === 'stretch') return (parameters) => parameters.a >= 3;
    return (parameters) => parameters.b - parameters.a >= 5;
  }
  if (caseId === 'join-split-predict') {
    if (difficulty === 'intro') return (parameters) => parameters.j - parameters.i === 2;
    if (difficulty === 'stretch') return (parameters) => parameters.j - parameters.i >= 3;
    return (parameters) => parameters.i === 0 && parameters.j === parameters.parts.length;
  }
  if (caseId === 'comprehension-predict') {
    if (difficulty === 'intro') return (parameters) => parameters.threshold <= -1 && parameters.factor === 2;
    if (difficulty === 'stretch') return (parameters) => parameters.threshold >= 1;
    return (parameters) => parameters.factor >= 3 && parameters.threshold >= 0;
  }
  if (difficulty === 'intro') return (parameters) => parameters.mode === 0;
  if (difficulty === 'stretch') return (parameters) => parameters.mode === 1;
  return (parameters) => parameters.mode === 1 && parameters.word.length >= 12;
}

/** Unabhängiger Solver: wertet die Fallparameter mit eigener Arithmetik aus. */
export function solveTraceAssignment(parameters) {
  const { shape } = parameters;
  if (shape === 'reassign') {
    const b = parameters.a0 + parameters.k1;
    const a = b - parameters.k2;
    return { output: `${a} ${b}` };
  }
  if (shape === 'chain3') {
    const y = parameters.x0 * parameters.k1;
    const z = y - parameters.x0;
    const x = z + parameters.k2;
    return { output: `${x} ${y} ${z}` };
  }
  if (shape === 'accumulate') {
    const n1 = parameters.n0 + parameters.k1;
    const m = n1 * parameters.f1;
    const n = m - parameters.g1;
    return { output: `${n} ${m}` };
  }
  if (shape === 'slice') return { output: parameters.word.slice(parameters.a, parameters.b) };
  if (shape === 'join') return { output: parameters.parts.slice(parameters.i, parameters.j).join('-') };
  if (shape === 'comprehension') {
    const out = parameters.nums
      .filter((n) => n > parameters.threshold)
      .map((n) => n * parameters.factor);
    return { output: `[${out.join(', ')}]` };
  }
  if (shape === 'transform') {
    const clean = parameters.word.trim();
    const out = parameters.mode === 0
      ? clean.toUpperCase()
      : clean.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    return { output: out };
  }
  throw new Error(`trace-assignment-state: unbekannte Form ${shape}`);
}

export function generateTraceAssignmentFamily({ seed, caseId, difficulty }) {
  const stateShape = ASSIGNMENT_STATE_SHAPES[caseId];
  const readingShape = ASSIGNMENT_READING_SHAPES[caseId];
  if (!stateShape && !readingShape) throw new Error(`Unbekannter Fall ${caseId}`);
  const generate = stateShape ? genPythonStateTrace : genCodeReadingOutput;
  const wantShape = (drawn) => drawn.parameters.shape === (stateShape || readingShape);
  const drawn = drawTraceInstance(generate, {
    seed,
    caseId,
    difficulty,
    wantShape,
    profileAccepts: assignmentProfileAccepts(caseId, difficulty),
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { output: drawn.expected.output },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
    traceTable: assignmentTraceTable(drawn),
  };
}

export const TRACE_ASSIGNMENT_CONTRACT = {
  familyId: 'trace-assignment-state',
  familyGroup: 'trace-state',
  summary: 'Verfolgt Zuweisungszustände durch ein Programm in einer Umgebungstabelle mit stdout-Puffer.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'reassign-two-variables-print' },
    { caseId: 'chain3-overwrite-print' },
    { caseId: 'accumulate-reassign-print' },
    { caseId: 'slice-predict-output' },
    { caseId: 'join-split-predict' },
    { caseId: 'comprehension-predict' },
    { caseId: 'method-chain-transform' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-reading', 'c-python-basics'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

// --- trace-call-composition --------------------------------------------------
// Laufzeit-Archetyp: output-predict-lines. Geseedet über genFunctionCompose
// (beide Kompositionsreihenfolgen in einer Printzeile); zweiter Falltyp ist
// die gepinnte statische Quelle w01-e6 (zwei unabhängige Aufrufe, Autorität
// fix, propertyTest: false) — gleiche Antwortform, gleicher Lösungsweg.

function callCompositionProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') {
    return (parameters) => maxAbs([parameters.fb, parameters.gb, parameters.v]) <= 3;
  }
  if (difficulty === 'stretch') {
    return (parameters) => parameters.v < 0 && (parameters.fb < 0 || parameters.gb < 0);
  }
  return (parameters) => parameters.ga < 0 && maxAbs([parameters.fb, parameters.gb, parameters.v]) >= 4;
}

/** Unabhängiger Solver: beide Kompositionsreihenfolgen aus den Fallparametern. */
export function solveTraceCallComposition(parameters) {
  if (parameters.form === 'area-perimeter') {
    return { output: `${parameters.a * parameters.b} ${2 * (parameters.a + parameters.b)}` };
  }
  if (parameters.form === 'linear-both-orders') {
    const f = (x) => parameters.fa * x + parameters.fb;
    const g = (x) => parameters.ga * x + parameters.gb;
    return { output: `${f(g(parameters.v))} ${g(f(parameters.v))}` };
  }
  throw new Error(`trace-call-composition: unbekannte Form ${parameters.form}`);
}

export function generateTraceCallCompositionFamily({ seed, caseId, difficulty }) {
  requireTraceProfile(difficulty);
  if (caseId === 'two-functions-one-print') {
    const body = staticCaseBody('trace-call-composition', caseId);
    const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
    return { ...generated, parameters: { caseId, difficulty, ...(body.parameters || {}) } };
  }
  if (caseId !== 'both-orders-linear-functions') throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawTraceInstance(genFunctionCompose, {
    seed,
    caseId,
    difficulty,
    wantShape: () => true,
    profileAccepts: callCompositionProfileAccepts(difficulty),
  });
  const generated = {
    parameters: { caseId, difficulty, form: 'linear-both-orders', ...drawn.parameters },
    expected: { output: drawn.expected.output },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
  return { ...generated, traceTable: callCompositionTraceTable(generated) };
}

export const TRACE_CALL_COMPOSITION_CONTRACT = {
  familyId: 'trace-call-composition',
  familyGroup: 'trace-state',
  summary: 'Tracet die Auswertung verketteter bzw. verschachtelter Aufrufe und ihren resultierenden Wert.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'both-orders-linear-functions' },
    { caseId: 'two-functions-one-print', propertyTest: false },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-functions', 'c-python-reading'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

// --- aggregate-accumulator-count ---------------------------------------------
// Laufzeit-Archetyp: output-predict-lines. Geseedet über genControlFlowOutput
// (elif-Zweigwert, while-Zähler mit Endzustand, for-Filter-Akkumulator).

const ACCUMULATOR_SHAPES = {
  'elif-branch-value': 'elif',
  'while-counter-with-stop-state': 'while',
  'for-filter-accumulator': 'forfilter',
};

function accumulatorProfileAccepts(caseId, difficulty) {
  if (difficulty === 'core') return null;
  if (caseId === 'elif-branch-value') {
    if (difficulty === 'intro') return (parameters) => Math.abs(parameters.x) <= 6;
    if (difficulty === 'stretch') return (parameters) => parameters.x < 0;
    return (parameters) => Math.abs(parameters.x) >= 8;
  }
  if (caseId === 'while-counter-with-stop-state') {
    if (difficulty === 'intro') return (parameters) => parameters.step === 2;
    if (difficulty === 'stretch') return (parameters) => parameters.iterations >= 4;
    return (parameters) => parameters.n0 >= 12;
  }
  if (difficulty === 'intro') return (parameters) => parameters.factor === 2;
  if (difficulty === 'stretch') {
    return (parameters) => parameters.nums.filter((n) => n % 2 === 0).length >= 3;
  }
  return (parameters) => parameters.factor === 3 && Math.min(...parameters.nums) < -5;
}

/** Unabhängiger Solver: Zweig-, Schleifen- und Filterauswertung aus den Fallparametern. */
export function solveAccumulatorCount(parameters) {
  const { shape } = parameters;
  if (shape === 'elif') {
    let branch;
    let value;
    if (parameters.x > parameters.t1) { branch = 'A'; value = parameters.x * parameters.k; } else if (parameters.x < parameters.t2) { branch = 'B'; value = parameters.x + parameters.k; } else { branch = 'C'; value = parameters.x - parameters.k; }
    return { output: `${branch} ${value}` };
  }
  if (shape === 'while') {
    let n = parameters.n0;
    let total = 0;
    while (n > parameters.stop) {
      total += n;
      n -= parameters.step;
    }
    return { output: `${total} ${n}` };
  }
  if (shape === 'forfilter') {
    const out = parameters.nums
      .filter((n) => n % 2 === 0)
      .map((n) => n * parameters.factor);
    return { output: `[${out.join(', ')}]` };
  }
  throw new Error(`aggregate-accumulator-count: unbekannte Form ${shape}`);
}

export function generateAccumulatorCountFamily({ seed, caseId, difficulty }) {
  const shape = ACCUMULATOR_SHAPES[caseId];
  if (!shape) throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawTraceInstance(genControlFlowOutput, {
    seed,
    caseId,
    difficulty,
    wantShape: (candidate) => candidate.parameters.shape === shape,
    profileAccepts: accumulatorProfileAccepts(caseId, difficulty),
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { output: drawn.expected.output },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
    traceTable: accumulatorTraceTable(drawn),
  };
}

export const ACCUMULATOR_COUNT_CONTRACT = {
  familyId: 'aggregate-accumulator-count',
  familyGroup: 'aggregate-count',
  summary: 'Zählt durch Akkumulation über eine Folge von Elementen oder Schritten.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'elif-branch-value' },
    { caseId: 'while-counter-with-stop-state' },
    { caseId: 'for-filter-accumulator' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-control-flow', 'c-python-collections'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

// --- trace-collection-state / trace-dict-state-update ------------------------
// Laufzeit-Archetyp beider Familien: state-trace-vars. Geseedet über
// genCollectionStepTrace; die Formwahl trennt die Referenzmodelle:
// Listen-/Set-Mutation gehört zu trace-collection-state, die
// Dict-Update-Semantik (eigene Shard-Familie) zu trace-dict-state-update.
// Der Solver ist ein eigenständiger Mini-Interpreter über den Snippetzeilen.

const COLLECTION_SHAPES = {
  'list-mutate-steps': 'list-mutate',
  'list-alias-steps': 'list-alias',
  'list-copy-steps': 'list-copy',
  'list-rebind-steps': 'list-rebind',
  'set-add-discard-steps': 'set-steps',
};

/** Snippetzeilen ohne Zeilennummern (Generatorformat "1  code"). */
function traceCodeLines(snippet) {
  return String(snippet).split('\n').map((line) => line.replace(/^\d+\s+/, ''));
}

const intsOf = (code) => (code.match(/-?\d+/g) || []).map(Number);
const wordsOf = (code) => [...code.matchAll(/'([^']*)'/g)].map((match) => match[1]);
const varOf = (code) => {
  const match = code.match(/^(\w+)\s*=/);
  if (!match) throw new Error(`trace: keine Zuweisung in "${code}"`);
  return match[1];
};

function requireOp(code, token, shape) {
  if (!code.includes(token)) throw new Error(`trace (${shape}): erwartetes "${token}" in "${code}"`);
}

const renderListState = (state) => `[${state.join(', ')}]`;
const renderSetState = (state) => `{${[...state].map((w) => `'${w}'`).sort().join(', ')}}`;
const renderDictState = (state) => `{${[...state.entries()].map(([k, v]) => `'${k}': ${v}`).join(', ')}}`;

/** Simuliert eine Listenspur; gibt { varName, states, yEnd } zurück. */
function simulateListTrace(shape, codes) {
  const varName = varOf(codes[0]);
  const init = intsOf(codes[0]);
  if (shape === 'list-mutate') {
    requireOp(codes[1], '.append(', shape);
    requireOp(codes[2], '.extend(', shape);
    const state = [...init];
    const states = [[...state]];
    state.push(intsOf(codes[1]).at(-1));
    states.push([...state]);
    state.push(...intsOf(codes[2]));
    states.push([...state]);
    const [idx, val] = intsOf(codes[3]);
    state[idx] = val;
    states.push([...state]);
    return { varName, states, render: renderListState };
  }
  if (shape === 'list-alias') {
    requireOp(codes[2], '.append(', shape);
    const state = [...init];
    const states = [[...state], [...state]];
    state.push(intsOf(codes[2]).at(-1));
    states.push([...state]);
    const [idx, val] = intsOf(codes[3]);
    state[idx] = val;
    states.push([...state]);
    return { varName, states, render: renderListState };
  }
  if (shape === 'list-copy') {
    requireOp(codes[1], '.copy()', shape);
    requireOp(codes[2], '.append(', shape);
    const state = [...init];
    const yEnd = [...init, intsOf(codes[2]).at(-1)];
    const states = [[...state], [...state], [...state]];
    const [idx, val] = intsOf(codes[3]);
    state[idx] = val;
    states.push([...state]);
    return { varName, states, render: renderListState, yEnd };
  }
  if (shape !== 'list-rebind') throw new Error(`trace: unbekannte Listenform ${shape}`);
  requireOp(codes[2], '+=', shape);
  const rebased = [...init, ...intsOf(codes[1])];
  const states = [[...init], [...rebased]];
  const grown = [...rebased, ...intsOf(codes[2])];
  states.push([...grown], [...grown]);
  return { varName, states, render: renderListState };
}

function simulateSetTrace(codes) {
  const varName = varOf(codes[0]);
  const state = new Set(wordsOf(codes[0]));
  const states = [new Set(state)];
  requireOp(codes[1], '.add(', 'set-steps');
  state.add(wordsOf(codes[1]).at(-1));
  states.push(new Set(state));
  requireOp(codes[2], '.discard(', 'set-steps');
  state.delete(wordsOf(codes[2]).at(-1));
  states.push(new Set(state));
  requireOp(codes[3], '.add(', 'set-steps');
  state.add(wordsOf(codes[3]).at(-1));
  states.push(new Set(state));
  return { varName, states, render: renderSetState };
}

function simulateDictTrace(codes) {
  const varName = varOf(codes[0]);
  const [k1] = wordsOf(codes[0]);
  const [a] = intsOf(codes[0]);
  const state = new Map([[k1, a]]);
  const states = [new Map(state)];
  const setLine = (code) => {
    const key = wordsOf(code).at(-1);
    const val = intsOf(code).at(-1);
    state.set(key, val);
    states.push(new Map(state));
  };
  setLine(codes[1]);
  setLine(codes[2]);
  requireOp(codes[3], 'del ', 'dict-steps');
  state.delete(wordsOf(codes[3]).at(-1));
  states.push(new Map(state));
  return { varName, states, render: renderDictState };
}

/** Unabhängiger Solver für beide Trace-Familien: resimuliert die Spur aus
 *  den Snippetzeilen und vergleicht gegen parameters.variables (Test). */
export function solveCollectionTrace(parameters) {
  const codes = traceCodeLines(parameters.snippet);
  const shape = parameters.family;
  const simulated = shape === 'set-steps'
    ? simulateSetTrace(codes)
    : simulateDictTraceShim(shape, codes);
  const variables = simulated.states.map((state, index) => ({
    name: `${simulated.varName}_nach_${index + 1}`,
    value: simulated.render(state),
  }));
  if (simulated.yEnd) variables.push({ name: 'y_ende', value: renderListState(simulated.yEnd) });
  return { variables };
}

function simulateDictTraceShim(shape, codes) {
  if (shape === 'dict-steps') return simulateDictTrace(codes);
  return simulateListTrace(shape, codes);
}

/** Ganze Zahlen im Snippet (ohne Zeilennummern) für die Profillage. */
function traceSnippetNumbers(snippet) {
  return intsOf(traceCodeLines(snippet).join('\n'));
}

function collectionProfileAccepts(difficulty) {
  if (difficulty === 'core') return null;
  if (difficulty === 'intro') return (parameters) => maxAbs(traceSnippetNumbers(parameters.snippet)) <= 5;
  if (difficulty === 'stretch') return (parameters) => hasNegative(traceSnippetNumbers(parameters.snippet));
  return (parameters) => {
    const numbers = traceSnippetNumbers(parameters.snippet);
    return hasNegative(numbers) && maxAbs(numbers) >= 7;
  };
}

export function generateTraceCollectionFamily({ seed, caseId, difficulty }) {
  const shape = COLLECTION_SHAPES[caseId];
  if (!shape) throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawTraceInstance(genCollectionStepTrace, {
    seed,
    caseId,
    difficulty,
    wantShape: (candidate) => candidate.parameters.family === shape,
    profileAccepts: shape === 'set-steps' ? null : collectionProfileAccepts(difficulty),
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { kind: 'variable-values' },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

export const TRACE_COLLECTION_CONTRACT = {
  familyId: 'trace-collection-state',
  familyGroup: 'trace-state',
  summary: 'Tracet Zustandsänderungen einer Collection durch Operationen und Zuweisungen.',
  taskArchetype: 'state-trace-vars',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'list-mutate-steps' },
    { caseId: 'list-alias-steps' },
    { caseId: 'list-copy-steps' },
    { caseId: 'list-rebind-steps' },
    { caseId: 'set-add-discard-steps' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-collections', 'c-python-control-flow'],
  graderId: 'deterministic',
  activityType: 'code-trace',
};

// --- trace-dict-state-update ---
// Zwei Falltypen partitionieren dieselbe dict-steps-Schablone nach
// Schlüsselvokabular (start- vs. ziel-/pfad-Schlüssel); Lösungsweg und
// Referenzmodell sind identisch. Getrennte Falltypen statt einem, weil die
// Registry parametrische Familien verlangt.

function dictVocabulary(parameters) {
  const [k1] = wordsOf(traceCodeLines(parameters.snippet)[0]);
  return k1;
}

export function generateTraceDictFamily({ seed, caseId, difficulty }) {
  if (caseId !== 'dict-start-key-steps' && caseId !== 'dict-ziel-pfad-key-steps') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const wantStart = caseId === 'dict-start-key-steps';
  const drawn = drawTraceInstance(genCollectionStepTrace, {
    seed,
    caseId,
    difficulty,
    wantShape: (candidate) => candidate.parameters.family === 'dict-steps'
      && (dictVocabulary(candidate.parameters) === 'start') === wantStart,
    profileAccepts: collectionProfileAccepts(difficulty),
  });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { kind: 'variable-values' },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

/** Dict-Solver: dieselbe Resimulation, eigener Einstieg für den Vertragscheck. */
export function solveTraceDict(parameters) {
  if (parameters.family !== 'dict-steps') throw new Error(`trace-dict-state-update: unerwartete Form ${parameters.family}`);
  return solveCollectionTrace(parameters);
}

export const TRACE_DICT_CONTRACT = {
  familyId: 'trace-dict-state-update',
  familyGroup: 'trace-state',
  summary: 'Verfolgt den Zustand eines Dictionaries durch Update-Operationen und liest Werte und Schlüsselmenge am Ende ab.',
  taskArchetype: 'state-trace-vars',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'dict-start-key-steps' },
    { caseId: 'dict-ziel-pfad-key-steps' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-collections'],
  graderId: 'deterministic',
  activityType: 'code-trace',
};

// --- trace-exception-path ----------------------------------------------------
// Laufzeit-Archetyp: choice-diagnose. Geseedet über genExceptionBoundary
// (acht Ausnahmefälle inkl. zwei fehlerfreier Gegenfälle). Die Profilachse
// ist strukturell wie in S4C: intro fragt mit zwei Optionen, alle anderen
// Profile mit vier. Der Solver bestimmt den korrekten Text aus Fall plus
// Code (fehlerfreie Fälle parsen den Code eigenständig).

const EXCEPTION_CASE_IDS = [
  'valueerror',
  'typeerror-concat',
  'keyerror',
  'filenotfound',
  'indexerror',
  'typeerror-len',
  'no-error-int',
  'no-error-mul',
];

const EXCEPTION_INTRO_CHOICES = 2;

function exceptionCodeOf(prompt) {
  return String(prompt).split('\n\n').at(-1);
}

/** Unabhängiger Solver: korrekter Antworttext aus Fall und Code. */
export function solveTraceException(parameters) {
  const { caseId } = parameters;
  if (caseId === 'valueerror') {
    return { correctText: 'ValueError — Der String enthält ein Komma und ist daher keine gültige Ganzzahl — int() mit ungültigem Literal wirft ValueError.' };
  }
  if (caseId === 'typeerror-concat') {
    return { correctText: 'TypeError — Die +-Operation zwischen str und int ist nicht definiert; Python verketten keine Typen automatisch.' };
  }
  if (caseId === 'keyerror') {
    return { correctText: 'KeyError — Der Schlüssel existiert im Dictionary nicht; der Zugriff über eckige Klammern wirft KeyError.' };
  }
  if (caseId === 'filenotfound') {
    return { correctText: 'FileNotFoundError — Die Datei existiert nicht; open() im Lesemodus scheitert daher mit FileNotFoundError.' };
  }
  if (caseId === 'indexerror') {
    return { correctText: 'IndexError — Der Index liegt hinter dem Listenende; der Zugriff wirft IndexError.' };
  }
  if (caseId === 'typeerror-len') {
    return { correctText: 'TypeError — len() braucht ein Objekt mit Länge; eine ganze Zahl hat keine.' };
  }
  if (caseId === 'no-error-int') {
    const value = String(parameters.code).match(/"(\d+)"/)?.[1];
    if (value === undefined) throw new Error('trace-exception-path: kein Int-Literal im Code');
    return { correctText: `Kein Fehler — der Ausdruck liefert problemlos die ganze Zahl ${value}.` };
  }
  if (caseId === 'no-error-mul') {
    const digits = String(parameters.code).match(/"(\d+)"/)?.[1];
    const times = Number(String(parameters.code).split('*')[1]);
    if (digits === undefined || !Number.isSafeInteger(times)) {
      throw new Error('trace-exception-path: kein String-Multiplikand im Code');
    }
    return { correctText: `Kein Fehler — der Ausdruck liefert problemlos den String "${digits.repeat(times)}".` };
  }
  throw new Error(`trace-exception-path: unbekannter Fall ${caseId}`);
}

export function generateTraceExceptionFamily({ seed, caseId, difficulty }) {
  requireTraceProfile(difficulty);
  if (!EXCEPTION_CASE_IDS.includes(caseId)) throw new Error(`Unbekannter Fall ${caseId}`);
  const drawn = drawTraceInstance(genExceptionBoundary, {
    seed,
    caseId,
    difficulty,
    wantShape: (candidate) => candidate.parameters.caseId === caseId,
    profileAccepts: null,
  });
  const parameters = {
    caseId,
    difficulty,
    caseIndex: drawn.parameters.caseIndex,
    code: exceptionCodeOf(drawn.prompt),
  };
  if (difficulty !== 'intro') {
    return {
      parameters,
      expected: drawn.expected,
      choices: drawn.choices,
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
    };
  }
  const correct = drawn.choices.find((choice) => choice.correct);
  const distractor = drawn.choices.find((choice) => !choice.correct);
  if (!correct || !distractor) throw new Error('trace-exception-path: Gegenbeispiel fehlt');
  const rotation = Math.abs(seed) % EXCEPTION_INTRO_CHOICES;
  const ordered = rotation === 0 ? [correct, distractor] : [distractor, correct];
  const ids = ['a', 'b'];
  return {
    parameters,
    expected: { correctChoice: ids[rotation] },
    choices: ordered.map((choice, index) => ({ id: ids[index], text: choice.text, correct: index === rotation })),
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

export const TRACE_EXCEPTION_CONTRACT = {
  familyId: 'trace-exception-path',
  familyGroup: 'trace-state',
  summary: 'Tracet, welcher Programm- und Ausnahmepfad bei der Ausführung tatsächlich durchlaufen wird.',
  taskArchetype: 'choice-diagnose',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: EXCEPTION_CASE_IDS.map((caseId) => ({ caseId })),
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-testing-debugging'],
  graderId: 'deterministic',
  activityType: 'single-choice',
};

export const TRACE_FAMILY_CONTRACTS = [
  TRACE_ASSIGNMENT_CONTRACT,
  TRACE_CALL_COMPOSITION_CONTRACT,
  TRACE_COLLECTION_CONTRACT,
  ACCUMULATOR_COUNT_CONTRACT,
  TRACE_DICT_CONTRACT,
  TRACE_EXCEPTION_CONTRACT,
];

// --- Trace-Tabelle (S4D1, Interaktionsvariante von output-predict-lines) ---
// Nur für geradlinige Zuweisungsformen (reassign, chain3, accumulate):
// Die Zeilen stammen aus dem Generator-Snippet (kein Nachbau), die
// Zustände aus formspezifischer Arithmetik (kein Interpreter). Alle
// anderen Formen liefern null und behalten die reine Ausgabevorhersage.
// Schleifen-, Aufruf-, Collection-, Dict- und Exception-Familien folgen
// als eigene Tabellenvarianten, sobald ihre Generatoren Zustände kennen.
const num = (value) => String(value);

function snippetAssignmentLines(snippet) {
  return String(snippet).split('\n').filter((line) => !line.startsWith('print'));
}

export function assignmentTraceTable(drawn) {
  const { shape } = drawn.parameters;
  const lines = snippetAssignmentLines(drawn.parameters.snippet);
  if (shape === 'reassign') {
    const { a0, k1, k2 } = drawn.parameters;
    const b = a0 + k1;
    const a = b - k2;
    return {
      lines,
      stateVars: ['a', 'b'],
      expectedStates: [
        { a: num(a0), b: '' },
        { a: num(a0), b: num(b) },
        { a: num(a), b: num(b) },
      ],
    };
  }
  if (shape === 'chain3') {
    const { x0, k1, k2 } = drawn.parameters;
    const y = x0 * k1;
    const z = y - x0;
    const x = z + k2;
    return {
      lines,
      stateVars: ['x', 'y', 'z'],
      expectedStates: [
        { x: num(x0), y: '', z: '' },
        { x: num(x0), y: num(y), z: '' },
        { x: num(x0), y: num(y), z: num(z) },
        { x: num(x), y: num(y), z: num(z) },
      ],
    };
  }
  if (shape === 'accumulate') {
    const { n0, k1, f1, g1 } = drawn.parameters;
    const afterFirst = n0 + k1;
    const m = afterFirst * f1;
    const n = m - g1;
    return {
      lines,
      stateVars: ['n', 'm'],
      expectedStates: [
        { n: num(n0), m: '' },
        { n: num(afterFirst), m: '' },
        { n: num(afterFirst), m: num(m) },
        { n: num(n), m: num(m) },
      ],
    };
  }
  return null;
}

// Schleifen-Tabelle: eine Zeile je Initialisierung plus eine je Durchlauf.
// Die Schleifenrümpfe sind pro Form fix (Generator-Format), die Zustände
// folgen derselben Arithmetik wie der Solver. elif ist eine
// Zweigentscheidung ohne Zustand und behält die reine Vorhersage (null).
export function accumulatorTraceTable(drawn) {
  const { shape } = drawn.parameters;
  if (shape === 'while') {
    const { n0, step, stop } = drawn.parameters;
    const lines = [`n = ${n0}`, 'summe = 0'];
    const expectedStates = [{ n: num(n0), summe: '' }, { n: num(n0), summe: '0' }];
    let n = n0;
    let total = 0;
    let round = 0;
    while (n > stop) {
      round += 1;
      total += n;
      n -= step;
      lines.push(`Durchlauf ${round}: summe = summe + n; n = n - ${step}`);
      expectedStates.push({ n: num(n), summe: num(total) });
    }
    return { lines, stateVars: ['n', 'summe'], expectedStates };
  }
  if (shape === 'forfilter') {
    const { nums, factor } = drawn.parameters;
    const lines = [`werte = [${nums.join(', ')}]`, 'ergebnis = []'];
    const expectedStates = [
      { w: '', ergebnis: '' },
      { w: '', ergebnis: '[]' },
    ];
    const collected = [];
    for (const w of nums) {
      if (w % 2 === 0) collected.push(w * factor);
      lines.push(`w = ${w}: ${w % 2 === 0 ? 'anhängen' : 'überspringen'}`);
      expectedStates.push({ w: num(w), ergebnis: `[${collected.join(', ')}]` });
    }
    return { lines, stateVars: ['w', 'ergebnis'], expectedStates };
  }
  return null;
}

// Aufruf-Tabelle: innen vor außen, beide Bahnen. Geseedet aus den
// Funktionsparametern, statisch aus Fläche und Umfang gerechnet
// (keine hartcodierten Werte neben der Quelle).
export function callCompositionTraceTable(generated) {
  const { form } = generated.parameters;
  if (form === 'linear-both-orders') {
    const { fa, fb, ga, gb, v } = generated.parameters;
    const innerFirst = ga * v + gb;
    const outerFirst = fa * innerFirst + fb;
    const innerSecond = fa * v + fb;
    const outerSecond = ga * innerSecond + gb;
    return {
      lines: [`f(g(${v}))`, `g(f(${v}))`],
      stateVars: ['innen', 'außen'],
      expectedStates: [
        { innen: num(innerFirst), außen: num(outerFirst) },
        { innen: num(innerSecond), außen: num(outerSecond) },
      ],
    };
  }
  if (form === 'area-perimeter') {
    const { a, b } = generated.parameters;
    return {
      lines: [`flaeche(${a}, ${b})`, `umfang(${a}, ${b})`],
      stateVars: ['ergebnis'],
      expectedStates: [{ ergebnis: num(a * b) }, { ergebnis: num(2 * (a + b)) }],
    };
  }
  return null;
}

// Reine Tabellenprüfung: trimming-tolerant, sonst exakt. Meldet die erste
// abweichende Zelle (Zeile + Variable), sonst korrekt.
export function gradeTraceTable(traceTable, states) {
  const vars = traceTable.stateVars;
  const expected = traceTable.expectedStates;
  for (let row = 0; row < expected.length; row += 1) {
    for (const name of vars) {
      const want = String(expected[row]?.[name] ?? '').trim();
      const got = String(states[row]?.[name] ?? '').trim();
      if (want !== got) return { correct: false, firstBadRow: row, firstBadVar: name };
    }
  }
  return { correct: true, firstBadRow: null, firstBadVar: null };
}

export const TRACE_FAMILY_RUNTIME = {
  'trace-assignment-state': { generate: generateTraceAssignmentFamily, solve: solveTraceAssignment },
  'trace-call-composition': { generate: generateTraceCallCompositionFamily, solve: solveTraceCallComposition },
  'trace-collection-state': { generate: generateTraceCollectionFamily, solve: solveCollectionTrace },
  'aggregate-accumulator-count': { generate: generateAccumulatorCountFamily, solve: solveAccumulatorCount },
  'trace-dict-state-update': { generate: generateTraceDictFamily, solve: solveTraceDict },
  'trace-exception-path': { generate: generateTraceExceptionFamily, solve: solveTraceException },
};
