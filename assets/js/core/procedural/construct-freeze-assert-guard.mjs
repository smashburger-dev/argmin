// Procedural family construct-freeze-assert-guard: fragments, prompts and
// reference solvers stay fixed; the seed draws the parsons start order
// (non-identity permutation of the pool for the stretch case — mirrors
// parsonsInitialOrder in foundations_construct_families.mjs) and fresh
// report/fresh dict pairs that get appended to the curated base test block
// as literal __check lines with inline expectations (frozen dict literal for
// the equal path, __raised for the AssertionError path). Mirrors
// validate-data-quality-contract.mjs.

import { RAISED_HELPER } from './py_test_kit.mjs';

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

const PROFILE_TIERS = ['intro', 'core', 'stretch', 'challenge'];

const shuffledIds = (ids, seed) => shuffle(rng(seed >>> 0), ids);

// Seeded parsons start order: intro tier performs exactly one adjacent swap
// of the pool (nearly-solved didactic); every other tier draws a permutation
// that differs from the pool order (bounded bump keeps it deterministic).
function parsonsInitialOrder(pool, seed, difficulty) {
  const tier = PROFILE_TIERS.indexOf(difficulty);
  if (tier === 0) {
    const r = rng(seed >>> 0);
    const out = [...pool];
    const i = out.length > 1 ? randInt(r, 0, out.length - 2) : 0;
    [out[i], out[i + 1]] = [out[i + 1], out[i]];
    return out;
  }
  let bump = 0;
  let order = shuffledIds(pool, ((seed * 31 + tier) >>> 0));
  while (bump < 8 && order.every((id, index) => id === pool[index])) {
    bump += 1;
    order = shuffledIds(pool, (((seed * 31) + tier + bump * 101) >>> 0));
  }
  return order;
}

const FREEZE_FRAGMENTS = [
  { id: 'p1', text: 'def assert_frozen(dateien, pins):' },
  { id: 'p2', text: '    verstoesse = []' },
  { id: 'p3', text: '    for name, pin in pins.items():' },
  { id: 'p4', text: '        if name not in dateien:' },
  { id: 'p5', text: '            verstoesse.append(name + ": fehlt")' },
  { id: 'p6', text: '        elif pin is not None and sha256(dateien[name]) != pin:' },
  { id: 'p7', text: '            verstoesse.append(name + ": hash weicht ab")' },
  { id: 'p8', text: '    if verstoesse:' },
  { id: 'p9', text: '        raise AssertionError("; ".join(verstoesse))' },
  { id: 'd1', text: '        return {"status": "fehler", "verstoesse": []}' },
  { id: 'd2', text: '    return {"status": "ok", "verstoesse": verstoesse}' },
];

const FREEZE_ORDER = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];
const FREEZE_DISTRACTORS = ['d1', 'd2'];

const FREEZE_PROMPT = 'Freeze-Check als Parsons-Problem: Bringe die Zeilen in die richtige Reihenfolge, sodass <code>assert_frozen(dateien, pins)</code> Verstöße sammelt und bei Abweichungen mit <code>AssertionError</code> scheitert — ohne stillen Fallback. Zwei Zeilen gehören nicht zur Lösung.';

const FREEZE_SOLUTION = 'Reihenfolge: Signatur, Liste anlegen, über pins iterieren, fehlt-Zweig, hash-Zweig, am Ende bei Verstößen raise AssertionError. Die Rückgabe-Zeilen (d1/d2) sind bewusst draußen: Ein Freeze-Assert kehrt entweder still zurück oder scheitert laut — es liefert kein Fehlerobjekt.';

const DEMO_STARTER = `def demo_aus_bericht(bericht, frisch):
    """Eingefrorene Werte zurueckgeben — oder bei Abweichung laut scheitern."""
    ...

`;

const DEMO_BASE_TESTS = `BERICHT = {"recall_at_k": 0.75, "answered": 6}
__check('identisch ok', demo_aus_bericht(BERICHT, {"answered": 6, "recall_at_k": 0.75}) == {"metriken": BERICHT, "quelle": "eingefroren", "geprueft": True})
try:
    demo_aus_bericht(BERICHT, {"recall_at_k": 0.9, "answered": 6})
    __check('abweichung scheitert laut', False)
except AssertionError as e:
    __check('abweichung scheitert laut', "demo-abweichung" in str(e))
__check('bericht unangetastet', BERICHT == {"recall_at_k": 0.75, "answered": 6})
__check('verschachtelt geprueft', demo_aus_bericht({"a": {"b": [1, 2]}}, {"a": {"b": [1, 2]}})["geprueft"] is True)
try:
    demo_aus_bericht({"a": 1}, {"a": 2})
    __check('tiefenvergleich', False)
except AssertionError:
    __check('tiefenvergleich', True)`;

const DEMO_IMPL = `def demo_aus_bericht(bericht, frisch):
    if bericht != frisch:
        raise AssertionError("demo-abweichung")
    return {"metriken": bericht, "quelle": "eingefroren", "geprueft": True}`;

const DEMO_REFERENCE = `${DEMO_IMPL}

# Gleicher Inhalt -> eingefrorene Werte; Abweichung -> AssertionError, kein Ersatzwert`;

const DEMO_PROMPT = 'Demo-Disziplin: <code>demo_aus_bericht(bericht, frisch)</code> erhält die eingefrorenen Messwerte (dict) und eine frisch berechnete Kopie. Stimmen beide überein (==), liefert die Funktion <code>{"metriken": bericht, "quelle": "eingefroren", "geprueft": True}</code>. Weichen sie ab, wirft sie <code>AssertionError("demo-abweichung")</code> — kein stiller Fallback auf alte Werte. Die Funktion verändert weder bericht noch frisch.';

const DEMO_SOLUTION = `${DEMO_IMPL}

# Ein Vergleich, ein Fehlerweg, ein Rückgabewert — die Demo lügt nicht.`;

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers). Double-quoted strings are valid Python.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Returns (exception type, message) or ("ok", result): lets one comparison
// cover both value returns and the contracted AssertionError path.

// Draw domains for the demo case: metric dicts over a fixed name pool plus
// one guaranteed deviation (value change, extra key or dropped key — every
// mutation keeps bericht != frisch so the AssertionError arm is honest).
const METRIC_NAMES = ['recall_at_k', 'precision_at_k', 'answered', 'coverage', 'latency_ms', 'faithfulness'];

const RATIO_NAMES = new Set(['recall_at_k', 'precision_at_k', 'coverage', 'faithfulness']);

function drawReport(r) {
  const count = randInt(r, 2, 3);
  const names = shuffle(r, [...METRIC_NAMES]).slice(0, count);
  const bericht = {};
  for (const name of names) {
    bericht[name] = RATIO_NAMES.has(name) ? randInt(r, 1, 99) / 100 : randInt(r, 1, 12);
  }
  return bericht;
}

function drawMutation(r, bericht) {
  const kind = pick(r, ['value', 'add', 'drop']);
  const frisch = { ...bericht };
  const keys = Object.keys(bericht);
  if (kind === 'value' || keys.length === 0) {
    const key = keys[randInt(r, 0, keys.length - 1)];
    frisch[key] = RATIO_NAMES.has(key) ? bericht[key] + 0.01 : bericht[key] + 1;
  } else if (kind === 'add') {
    frisch[`extra_${randInt(r, 1, 9)}`] = randInt(r, 0, 9);
  } else {
    delete frisch[keys[randInt(r, 0, keys.length - 1)]];
  }
  return frisch;
}

// Case definitions: parsons cases keep fragments/order fixed and seed only
// the start order; code cases bake the drawn literals into the test block.
export const FREEZE_GUARD_CASES = {
  'freeze-assert-parsons': {
    difficulty: 'stretch',
    kind: 'parsons',
    activityType: 'parsons',
    graderId: 'deterministic',
    caseId: 'freeze-assert-parsons',
    fragments: FREEZE_FRAGMENTS,
    solutionOrder: FREEZE_ORDER,
    distractors: FREEZE_DISTRACTORS,
    prompt: FREEZE_PROMPT,
    fullSolution: FREEZE_SOLUTION,
  },
  'demo-from-frozen-report': {
    difficulty: 'core',
    kind: 'python-code',
    activityType: 'python-code',
    graderId: 'pyodide',
    caseId: 'demo-from-frozen-report',
    packages: [],
    starterCode: DEMO_STARTER,
    baseTests: DEMO_BASE_TESTS,
    referenceSolver: DEMO_REFERENCE,
    prompt: DEMO_PROMPT,
    fullSolution: DEMO_SOLUTION,
    prelude: RAISED_HELPER,
    draw(r) {
      const bericht = drawReport(r);
      return { bericht, frisch: drawMutation(r, bericht) };
    },
    emit({ bericht, frisch }, index) {
      return [
        `__b${index} = ${pyLit(bericht)}`,
        `__check('seeded eingefroren ${index}', demo_aus_bericht(__b${index}, {**__b${index}}) == {"metriken": __b${index}, "quelle": "eingefroren", "geprueft": True})`,
        `__f${index} = ${pyLit(frisch)}`,
        `__check('seeded abweichung ${index}', __raised(demo_aus_bericht, __b${index}, __f${index}) == ("AssertionError", "demo-abweichung"))`,
        `__check('seeded eingabe intakt ${index}', __b${index} == ${pyLit(bericht)})`,
      ].join('\n');
    },
    extraCount: 2,
  },
};

const codeSeededBlock = (caseDef, seedCases) => [
  caseDef.prelude,
  ...seedCases.map((entry, i) => caseDef.emit(entry, i + 1)),
].join('\n\n');

const codeTestsFor = (caseDef, seedCases) => `${caseDef.baseTests}\n\n# seeded extra cases\n${codeSeededBlock(caseDef, seedCases)}`;

// Parsons capsule shape: parsonsCase binds the fixed fragments and solution;
// initialOrder must be a permutation of the pool that matches the profile
// rule (intro: exactly one adjacent swap, else a non-identity permutation).
export function freezeParsonsCaseOk(parameters, caseDef) {
  try {
    if (!parameters || parameters.parsonsCase !== caseDef.caseId) return false;
    if (JSON.stringify(parameters.fragments) !== JSON.stringify(caseDef.fragments)) return false;
    const pool = [...caseDef.solutionOrder, ...caseDef.distractors];
    const order = parameters.initialOrder;
    if (!Array.isArray(order) || order.length !== pool.length) return false;
    if (new Set(order).size !== pool.length || !order.every((id) => pool.includes(id))) return false;
    const diffs = pool.map((id, i) => (order[i] === id ? -1 : i)).filter((i) => i >= 0);
    if (caseDef.difficulty === 'intro') return diffs.length === 2 && diffs[1] === diffs[0] + 1;
    return diffs.length > 0;
  } catch { return false; }
}

// Code capsule shape: starterCode/tests/seedCases; tests must be the
// verbatim base block plus the seeded extras derived from seedCases.
export function freezeCodeCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === codeTestsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function freezeCaseOk(parameters, caseDef) {
  return caseDef.kind === 'parsons'
    ? freezeParsonsCaseOk(parameters, caseDef)
    : freezeCodeCaseOk(parameters, caseDef);
}

export function genFreezeGuardCase(seed, caseDef) {
  if (caseDef.kind === 'parsons') {
    const pool = [...caseDef.solutionOrder, ...caseDef.distractors];
    return {
      parameters: {
        parsonsCase: caseDef.caseId,
        fragments: caseDef.fragments.map((f) => ({ ...f })),
        initialOrder: parsonsInitialOrder(pool, seed, caseDef.difficulty),
      },
      expected: { kind: 'ordered-lines', solutionOrder: [...caseDef.solutionOrder], distractors: [...caseDef.distractors] },
      prompt: caseDef.prompt,
      fullSolution: caseDef.fullSolution,
      activityType: caseDef.activityType,
      graderId: caseDef.graderId,
    };
  }
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.draw(r));
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

export function solveFreezeGuardFamily(parameters) {
  const caseDef = Object.values(FREEZE_GUARD_CASES).find((item) => freezeCaseOk(parameters, item));
  if (!caseDef) throw new Error('Freeze-Guard-Parameter verletzen die Kapselform');
  if (caseDef.kind === 'parsons') return { solutionOrder: [...caseDef.solutionOrder] };
  return { referenceCode: caseDef.referenceSolver };
}

export const FREEZE_GUARD_CONTRACT = {
  familyId: 'construct-freeze-assert-guard',
  familyGroup: 'construct-program',
  summary: 'Schützt eingefrorene Berichte durch einen expliziten Gleichheits- und Abweichungsvertrag.',
  taskArchetype: 'program-ordering',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'freeze-assert-parsons', propertyTest: false },
    { caseId: 'demo-from-frozen-report', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-capstone-pipeline', 'c-python-functions'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

export function generateFreezeGuardFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = FREEZE_GUARD_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genFreezeGuardCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...FREEZE_GUARD_CONTRACT, generate: generateFreezeGuardFamily, solve: solveFreezeGuardFamily };
