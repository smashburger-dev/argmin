// Procedural family optimize-decode-greedy-loop: mixed-activity family.
// The predict-output trace case keeps the snippet shape fixed; the seed
// draws the vocab letters, the step-table chain (always reaching eos) and
// max_len, and a JS mirror of the greedy loop recomputes both output lines —
// never hardcoded. The python-code case keeps starter/reference fixed; the
// seed draws fresh step-table chains and constant-step fixtures that get
// appended to the curated base test block as literal __check lines asserted
// with == against a __ref_-copy of the reference loop (pure Python).
// Mirrors trace-chunk-window-loop.mjs and transform-bpe-merge-apply.mjs.

import { randInt, rng } from '../generator_draw_kit.mjs';

// --- case greedy-loop-trace (predict-output, deterministic) ----------------

const TRACE_BASE_SNIPPET = `VOCAB = {0: "a", 1: "b", 2: "<eos>"}

def step_fn(ids):
    table = {(): 0, (0,): 1, (0, 1): 2}
    return table[tuple(ids)]

def greedy_decode(step_fn, init_ids, max_len, eos):
    ids = list(init_ids)
    while len(ids) < max_len:
        nxt = step_fn(ids)
        ids.append(nxt)
        if nxt == eos:
            break
    return ids

out = greedy_decode(step_fn, [], 5, 2)
print(out)
print("".join(VOCAB[i] for i in out))`;

const TRACE_BASE_OUTPUT = '[0, 1, 2]\nab<eos>';

const TRACE_PROMPT = 'Dekodierschleife lesen: Was gibt dieses Programm aus? Sage beide <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Die Tabelle in <code>step_fn</code> ist eine gestellte Fixtur (Toy-Modell mit gestellten Gewichten — Mechanik, keine Sprachfähigkeit).';

const TRACE_BASE_SOLUTION = 'Schritt 1: <code>() → 0</code>, Schritt 2: <code>(0,) → 1</code>, Schritt 3: <code>(0, 1) → 2 = eos</code> → Stop. Ausgabe: <code>[0, 1, 2]</code> und <code>ab&lt;eos&gt;</code>.';

const TRACE_LETTERS = 'abcdefgh'.split('');

// Renders the tuple keys of the staged step table: () for the empty prefix,
// (5,) for one element, (5, 2) for longer prefixes — Python tuple syntax.
const pyTupleKey = (ids) => {
  if (ids.length === 0) return '()';
  if (ids.length === 1) return `(${ids[0]},)`;
  return `(${ids.join(', ')})`;
};

// Snippet shape is byte-identical to the curated base: vocab dict, chain
// table (each proper prefix maps to the next chain id), the fixed loop and
// the two print lines.
function buildTraceSnippet({ vocab, chain, initIds, maxLen, eos }) {
  const vocabBody = vocab.map((text, id) => `${id}: "${text}"`).join(', ');
  const tableBody = chain
    .map((next, i) => `${pyTupleKey([...initIds, ...chain.slice(0, i)])}: ${next}`)
    .join(', ');
  const initLit = `[${initIds.join(', ')}]`;
  return `VOCAB = {${vocabBody}}

def step_fn(ids):
    table = {${tableBody}}
    return table[tuple(ids)]

def greedy_decode(step_fn, init_ids, max_len, eos):
    ids = list(init_ids)
    while len(ids) < max_len:
        nxt = step_fn(ids)
        ids.append(nxt)
        if nxt == eos:
            break
    return ids

out = greedy_decode(step_fn, ${initLit}, ${maxLen}, ${eos})
print(out)
print("".join(VOCAB[i] for i in out))`;
}

// Mirror of the Python greedy loop: appends step_fn(ids) until eos or the
// exclusive max_len bound. The drawn tables always answer the reached
// prefix, so the run ends with eos inside the budget.
export function greedyDecode(stepFn, initIds, maxLen, eos) {
  const ids = [...initIds];
  while (ids.length < maxLen) {
    const nxt = stepFn([...ids]);
    ids.push(nxt);
    if (nxt === eos) break;
  }
  return ids;
}

// Step function over the drawn chain table: prefix "i0,i1" -> next. The
// chain holds the full id sequence including the trailing eos token.
function chainStep(initIds, chain) {
  const table = {};
  for (let i = 0; i < chain.length; i += 1) {
    table[[...initIds, ...chain.slice(0, i)].join(',')] = chain[i];
  }
  return (ids) => table[ids.join(',')];
}

function drawTrace(r) {
  const letterCount = randInt(r, 2, 3);
  const offset = randInt(r, 0, TRACE_LETTERS.length - letterCount);
  const letters = TRACE_LETTERS.slice(offset, offset + letterCount);
  const eos = letterCount;
  const vocab = [...letters, '<eos>'];
  const body = Array.from({ length: randInt(r, 2, 4) }, () => randInt(r, 0, letterCount - 1));
  const chain = [...body, eos];
  const initIds = [];
  const maxLen = chain.length + randInt(r, 0, 2);
  return { vocab, chain, initIds, maxLen, eos };
}

function traceOutput({ vocab, chain, initIds, maxLen, eos }) {
  const out = greedyDecode(chainStep(initIds, chain), initIds, maxLen, eos);
  return `[${out.join(', ')}]\n${out.map((id) => vocab[id]).join('')}`;
}

function buildTraceSolution({ vocab, chain, initIds, eos }) {
  const steps = chain.map((next, i) => {
    const key = pyTupleKey([...initIds, ...chain.slice(0, i)]).replace(/ /g, ' ');
    return `Schritt ${i + 1}: <code>${key} → ${next}${next === eos ? ' = eos' : ''}</code>`;
  });
  const out = greedyDecode(chainStep(initIds, chain), initIds, 99, eos);
  const decoded = out.map((id) => vocab[id]).join('').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `${steps.join(', ')} → Stop. Ausgabe: <code>[${out.join(', ')}]</code> und <code>${decoded}</code>.`;
}

// --- case greedy-decode-function (python-code, pyodide) --------------------

const CODE_STARTER = `def greedy_decode(step_fn, init_ids, max_len, eos):
    """Greedy loop: copy init, append step_fn(ids) while len < max_len, stop after eos."""
    # copy init_ids first (never mutate the caller's list)
    # while len(ids) < max_len: nxt = step_fn(...); append; break on eos
    ...
`;

const CODE_BASE_TESTS = `TABLE = {(): 5, (5,): 7, (5, 7): 9}

def table_step(ids):
    return TABLE[tuple(ids)]

__check('kette bis eos', greedy_decode(table_step, [], 8, 9) == [5, 7, 9])

def always_four(ids):
    return 4

__check('max_len schneidet ab', greedy_decode(always_four, [], 3, 9) == [4, 4, 4])
__check('start bereits lang genug', greedy_decode(always_four, [6, 7, 8], 3, 9) == [6, 7, 8])
__check('eos als erstes token', greedy_decode(always_four, [], 1, 4) == [4])
init = [1, 2]
greedy_decode(always_four, init, 6, 9)
__check('init nicht mutiert', init == [1, 2])
__check('eos wird mitgezaehlt', len(greedy_decode(table_step, [], 3, 9)) == 3)
__check('eos stoppt vor max_len', len(greedy_decode(table_step, [], 99, 9)) == 3)
__check('leerer start erlaubt', greedy_decode(table_step, [], 1, 5) == [5])`;

const CODE_REFERENCE = `def greedy_decode(step_fn, init_ids, max_len, eos):
    """Greedy loop: copy init, append step_fn(ids) while len < max_len, stop after eos."""
    ids = list(init_ids)
    while len(ids) < max_len:
        nxt = int(step_fn(list(ids)))
        ids.append(nxt)
        if nxt == eos:
            break
    return ids
`;

const CODE_PROMPT = 'Implementiere <code>greedy_decode(step_fn, init_ids, max_len, eos)</code>. Vertrag: Die Startfolge wird <strong>kopiert</strong> (die Eingabe des Aufrufers darf nicht mutiert werden); solange die Folge kürzer als <code>max_len</code> ist, liefert <code>step_fn(ids)</code> das nächste Token (aufrufen mit einer Kopie der aktuellen Folge); das Token wird angehängt; ist es <code>eos</code>, stoppt die Schleife sofort — das <code>eos</code> bleibt Teil der Folge. Rückgabe: Liste von ints. <strong>Dies ist eine Toy-Pipeline mit gestellten Gewichten — sie demonstriert Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt lokales Projekt.</strong> Der Testcode benutzt Fixtur-<code>step_fn</code>s (Tabellen und Konstanten) und prüft Stoppen, Längengrenze, Kopie-Vertrag und Randfälle.';

const CODE_SOLUTION = `${CODE_REFERENCE}# greedy_decode(table_step, [], 8, 9) -> [5, 7, 9] (eos mitgezählt)
# greedy_decode(always_four, [], 3, 9) -> [4, 4, 4] (max_len schneidet ab).`;

// __ref_-copy of the reference loop for the seeded blocks: drawn fixtures
// are asserted with == against this copy, never hardcoded.
const CODE_SEEDED_PREAMBLE = `def __ref_decode(step_fn, init_ids, max_len, eos):
    ids = list(init_ids)
    while len(ids) < max_len:
        nxt = int(step_fn(list(ids)))
        ids.append(nxt)
        if nxt == eos:
            break
    return ids`;

// Case definitions: the trace case draws vocab/chain/max_len into the
// snippet; the code case bakes drawn chain tables and constant-step
// fixtures into the test block (honest distinctness — the literals differ).
export const DECODE_CASES = {
  'greedy-loop-trace': {
    caseId: 'greedy-loop-trace',
    difficulty: 'core',
    kind: 'predict-output',
    activityType: 'predict-output',
    graderId: 'deterministic',
    baseSnippet: TRACE_BASE_SNIPPET,
    baseOutput: TRACE_BASE_OUTPUT,
    prompt: TRACE_PROMPT,
    baseSolution: TRACE_BASE_SOLUTION,
    competencyIds: ['c-dl-inference', 'c-python-basics'],
  },
  'greedy-decode-function': {
    caseId: 'greedy-decode-function',
    difficulty: 'core',
    kind: 'python-code',
    activityType: 'python-code',
    graderId: 'pyodide',
    packages: ['numpy'],
    starterCode: CODE_STARTER,
    baseTests: CODE_BASE_TESTS,
    referenceSolver: CODE_REFERENCE,
    prompt: CODE_PROMPT,
    fullSolution: CODE_SOLUTION,
    preamble: CODE_SEEDED_PREAMBLE,
    // Alternating fixture kinds: chain tables that always reach eos, then
    // constant step_fns that probe max_len and the copy contract.
    drawCase(r, index) {
      if (index % 2 === 0) {
        const length = randInt(r, 2, 4);
        const eos = randInt(r, 8, 9);
        const chain = [...Array.from({ length }, () => randInt(r, 0, 7)), eos];
        return { kind: 'chain', chain, eos, maxLen: chain.length + randInt(r, 0, 3) };
      }
      const init = Array.from({ length: randInt(r, 0, 3) }, () => randInt(r, 0, 9));
      return {
        kind: 'const',
        value: randInt(r, 0, 9),
        init,
        maxLen: init.length + randInt(r, 0, 4),
        eos: randInt(r, 10, 19),
      };
    },
    extraCount: 4,
  },
};

const pyIntList = (values) => `[${values.join(', ')}]`;

// Emits the seeded literal checks for one drawn fixture. Chain entries get a
// concrete table plus a named step function; const entries use a lambda and
// additionally pin that the caller-visible init list is never mutated.
function seededChecks(entry, index) {
  if (entry.kind === 'chain') {
    const tableBody = entry.chain
      .map((next, i) => `${pyTupleKey(entry.chain.slice(0, i))}: ${next}`)
      .join(', ');
    return [
      `__tab${index} = {${tableBody}}`,
      `def __step${index}(ids):`,
      `    return __tab${index}[tuple(ids)]`,
      `__check('seeded kette ${index}', greedy_decode(__step${index}, [], ${entry.maxLen}, ${entry.eos}) == __ref_decode(__step${index}, [], ${entry.maxLen}, ${entry.eos}))`,
    ].join('\n');
  }
  const init = pyIntList(entry.init);
  return [
    `__init${index} = ${init}`,
    `__check('seeded konstant ${index}', greedy_decode(lambda ids: ${entry.value}, __init${index}, ${entry.maxLen}, ${entry.eos}) == __ref_decode(lambda ids: ${entry.value}, __init${index}, ${entry.maxLen}, ${entry.eos}))`,
    `__check('seeded init intakt ${index}', __init${index} == ${init})`,
  ].join('\n');
}

function codeTestsFor(caseDef, seedCases) {
  const extras = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
  return `${caseDef.baseTests}\n\n# seeded extra cases\n${caseDef.preamble}\n${extras}`;
}

// Trace capsule shape: parameters carry the drawn fields plus the snippet
// rebuilt verbatim from them — honest distinctness (the code text differs).
export function traceCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    const { vocab, chain, initIds, maxLen, eos } = parameters;
    if (!Array.isArray(vocab) || vocab.length < 3 || vocab.length > 4) return false;
    if (!vocab.every((text) => typeof text === 'string') || vocab.at(-1) !== '<eos>') return false;
    if (!Array.isArray(chain) || chain.length < 3 || chain.length > 5) return false;
    if (eos !== vocab.length - 1 || chain.at(-1) !== eos) return false;
    if (!chain.slice(0, -1).every((id) => Number.isInteger(id) && id >= 0 && id < eos)) return false;
    if (!Array.isArray(initIds) || initIds.length !== 0) return false;
    if (!Number.isInteger(maxLen) || maxLen < chain.length || maxLen > chain.length + 2) return false;
    return parameters.snippet === buildTraceSnippet(parameters);
  } catch { return false; }
}

// Code capsule shape: starterCode/tests/seedCases; tests must be the
// verbatim base block plus the seeded extras derived from seedCases.
export function decodeCodeCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === codeTestsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function decodeCaseOk(parameters, caseDef) {
  return caseDef.kind === 'predict-output'
    ? traceCaseOk(parameters, caseDef)
    : decodeCodeCaseOk(parameters, caseDef);
}

export function genDecodeCase(seed, caseDef) {
  if (caseDef.kind === 'predict-output') {
    const drawn = drawTrace(rng(seed));
    return {
      parameters: {
        caseId: caseDef.caseId,
        difficulty: caseDef.difficulty,
        ...drawn,
        snippet: buildTraceSnippet(drawn),
      },
      expected: { output: traceOutput(drawn) },
      prompt: caseDef.prompt,
      fullSolution: buildTraceSolution(drawn),
      competencyIds: caseDef.competencyIds,
      activityType: caseDef.activityType,
      graderId: caseDef.graderId,
    };
  }
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, (_, i) => caseDef.drawCase(r, i));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: codeTestsFor(caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    activityType: caseDef.activityType,
    graderId: caseDef.graderId,
  };
}

export function solveDecodeFamily(parameters) {
  // The trace case is found by parameters.caseId (it carries caseId like the
  // curated static instance); the code case is found by its capsule shape —
  // code parameters carry starterCode/tests/seedCases without a caseId.
  const byId = DECODE_CASES[parameters?.caseId];
  if (byId && decodeCaseOk(parameters, byId)) {
    return byId.kind === 'predict-output'
      ? { output: traceOutput(parameters) }
      : { referenceCode: byId.referenceSolver };
  }
  const codeDef = Object.values(DECODE_CASES).find(
    (item) => item.kind === 'python-code' && decodeCodeCaseOk(parameters, item),
  );
  if (codeDef) return { referenceCode: codeDef.referenceSolver };
  throw new Error('Greedy-Decode-Parameter verletzen die Kapselform');
}

export const DECODE_CONTRACT = {
  familyId: 'optimize-decode-greedy-loop',
  familyGroup: 'optimize-update',
  summary: 'Führt Greedy-Decoding als Schleife über die Decodeschritte aus.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'greedy-loop-trace', propertyTest: false },
    { caseId: 'greedy-decode-function', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-dl-inference', 'c-python-basics'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

export function generateDecodeFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = DECODE_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genDecodeCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...DECODE_CONTRACT, generate: generateDecodeFamily, solve: solveDecodeFamily };
