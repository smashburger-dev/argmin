// S4D1 Konstrukt-Familien: ExerciseFamily-Runtime für die Foundations-
// Konstruktions- und Prüf-Familien (10 kognitive Familien aus
// Vertragsform wie der frühere S4C-Familienvertrag:
// Jede Familie liefert CONTRACT (Schema schemas/exercise-family.schema.json),
// generate({ seed, caseId, difficulty }) -> { parameters, expected, prompt,
// fullSolution, choices? } und solve(parameters) als unabhängige
// Referenz. Die Registry steht in
// assets/js/domain/foundations_construct_registry.mjs und wird hier NICHT
// gebaut (nur createFamilyRegistry([...]) dort).
//
// Leitplanken:
// - Kein LLM irgendwo; Autoritäten sind exakte Solver (Algebra),
//   SymPy-Äquivalenzklasse (Terme, Grader pyodide-sympy) oder eingebettete
//   Referenzimplementationen mit Pyodide-Testbündel (Code-Familien).
// - Bestehende Zähler aus foundations_fresh_generators.mjs
//   (countBranchCoverageLeaves, genBranchCoverageCount) werden gelesen und
//   wiederverwendet, nicht neu implementiert. exceptionBoundaryCaseCount
//   gehört zur Familie trace-exception-path und wird hier bewusst NICHT
//   verwendet (falsche Referenzmodellklasse).
// - Zwei shard-Fälle mit fremdem TaskArchetyp bleiben statischer Content und
//   sind KEINE Laufzeit-Falltypen (Multi-Archetyp-Doku siehe FAMILY_NOTES):
//   divide-both-sides-fully (choice-diagnose in transform-linear-equation-
//   isolate) und append-return-in-loop (code-test in construct-guarded-loop).
//   Sechs parametrische Geschwister-Falltypen (je einer für die vier
//   Single-Case-Parsons/Code-Familien plus einer für die Regressionssuite)
//   teilen Lösungsweg, Referenzmodell und Fehlerhypothesen mit ihrem
//   Shard-Fall und erfüllen das Zwei-Falltypen-Minimum der Registry.

import {
  rng,
  randInt,
  nonzeroInt,
  solveLinearEquation,
  solveLinearEquationBothSides,
  powerLawProduct,
  powerLawPower,
  logInt,
} from './foundations_generators.mjs';
import {
  countBranchCoverageLeaves,
  genBranchCoverageCount,
} from './foundations_fresh_generators.mjs';
import { shuffle } from './generator_draw_kit.mjs';
import { logTerm, signed } from './foundations_generators.mjs';
import { registerStaticCases, staticCaseBody, staticVariantInstance, variantOf } from '../domain/family_registry.mjs';
import guardedLoopDoc from '../../../content/families/construct-guarded-loop.json' with { type: 'json' };
import regressionSuiteDoc from '../../../content/families/construct-regression-test-suite.json' with { type: 'json' };
import bugfixWorkflowDoc from '../../../content/families/construct-safe-bugfix-workflow.json' with { type: 'json' };
import testStructureDoc from '../../../content/families/construct-test-structure-aaa.json' with { type: 'json' };
import expressionCanonicalDoc from '../../../content/families/transform-expression-simplify-canonical.json' with { type: 'json' };
import powerLogDoc from '../../../content/families/transform-power-log-exponent.json' with { type: 'json' };

export const CONSTRUCT_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

function assertSeed(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
}

function assertProfile(difficulty) {
  if (!CONSTRUCT_PROFILES.includes(difficulty)) throw new Error(`Unbekanntes Profil ${difficulty}`);
}

function profileTier(difficulty) {
  return CONSTRUCT_PROFILES.indexOf(difficulty);
}

/** Autorenvorlagen aus den Fallkörpern (content/families/*.json) füllen:
 *  `${name}`-Platzhalter werden durch den Wert ersetzt; die Semantik bleibt
 *  gegenüber den früheren JS-Template-Literalen zeichenidentisch. */
const fillTemplate = (template, values) => Object.keys(values).reduce(
  (text, key) => text.replaceAll(`\${${key}}`, String(values[key])),
  template,
);

// Eigenregistrierung der öffentlichen Fallkörper (idempotent — die Registry
// übernimmt beim späteren Bundle-Load keine Fremdkörper; Muster wie in
// foundations_choice_families.mjs, damit Generatoren auch ohne Bundle-
// Registrierung laufen, z. B. direkte EXERCISE_FAMILIES-Nutzung in Tests).
// Lazy beim ersten Zugriff: auf Modulebene gelesene Import-Bindings
// können in gebündelten Chunk-Graphen noch uninitialisiert sein.
let constructDocsRegistered = false;
function ensureConstructDocs() {
  if (constructDocsRegistered) return;
  constructDocsRegistered = true;
  for (const doc of [
    guardedLoopDoc,
    regressionSuiteDoc,
    bugfixWorkflowDoc,
    testStructureDoc,
    expressionCanonicalDoc,
    powerLogDoc,
  ]) {
    registerStaticCases(doc.familyId, doc.cases);
  }
}

const constructCaseBody = (familyId, caseId) => {
  ensureConstructDocs();
  return staticCaseBody(familyId, caseId);
};

const constructVariantInstance = (familyId, caseId, seed, difficulty) => {
  ensureConstructDocs();
  return staticVariantInstance(familyId, caseId, seed, difficulty);
};


// --- Familie 1: transform-linear-equation-isolate (numeric-exact) ---------
// Shard-Fälle: two-step-fixed-instance (statisch, w01-e1), two-step-seeded-
// retrieval (geseedet, w01-e8), collect-x-terms-both-sides (geseedet,
// f-algebra-both-sides-01). divide-both-sides-fully bleibt statisch
// (choice-diagnose, siehe FAMILY_NOTES).

export const LINEAR_ISOLATE_CONTRACT = {
  familyId: 'transform-linear-equation-isolate',
  familyGroup: 'transform-terms',
  summary: 'Löst eine lineare Gleichung durch skalare Äquivalenzumformung mit einer Unbekannten und genau einer Lösung.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'two-step-fixed-instance', propertyTest: false },
    { caseId: 'two-step-seeded-retrieval' },
    { caseId: 'collect-x-terms-both-sides' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-algebra', 'c-algebra-basics'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

/** Verankerung w01-e1: fixe Diagnoseinstanz, keine Seed-Variation. */
/** Unabhängiger Solver: Lösung allein aus den Fallparametern. */
export function solveLinearIsolate(parameters) {
  if (parameters.shape === 'both-sides') {
    return { value: solveLinearEquationBothSides(parameters.a, parameters.b, parameters.c, parameters.d) };
  }
  return { value: solveLinearEquation(parameters.a, parameters.b, parameters.c) };
}

const LINEAR_SIMPLE_TIERS = [
  { a: [2, 5], x: [1, 9], b: [-9, 9] },
  { a: [2, 9], x: [-9, 9], b: [-12, 12] },
  { a: [6, 12], x: [-12, 12], b: [-20, 20] },
  { a: [6, 15], x: [-15, 15], b: [-25, 25] },
];

const LINEAR_BOTH_TIERS = [
  { x: [-5, 5], a: [2, 6], c: [2, 6], b: [-9, 9] },
  { x: [-12, 12], a: [2, 9], c: [-9, 9], b: [-15, 15] },
  { x: [-15, 15], a: [2, 12], c: [-12, 12], b: [-20, 20] },
  { x: [-20, 20], a: [2, 15], c: [-15, 15], b: [-25, 25] },
];

function drawLinearSimple(seed, tier) {
  const r = rng(seed >>> 0);
  const x = randInt(r, tier.x[0], tier.x[1]);
  const a = nonzeroInt(r, tier.a[0], tier.a[1]);
  const b = randInt(r, tier.b[0], tier.b[1]);
  return { shape: 'simple', a, b, c: a * x + b };
}

function drawLinearBothSides(seed, tier) {
  const r = rng(seed >>> 0);
  const x = randInt(r, tier.x[0], tier.x[1]);
  const a = nonzeroInt(r, tier.a[0], tier.a[1]);
  let c = nonzeroInt(r, tier.c[0], tier.c[1]);
  if (c === a) c = a >= tier.c[1] ? a - 1 : a + 1;
  const b = randInt(r, tier.b[0], tier.b[1]);
  return { shape: 'both-sides', a, b, c, d: (a - c) * x + b };
}

export function generateLinearIsolateFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  const tier = profileTier(difficulty);
  if (caseId === 'two-step-fixed-instance') {
    const body = constructCaseBody('transform-linear-equation-isolate', caseId);
    const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
    return { ...generated, parameters: { ...(body.parameters || {}) } };
  }
  if (caseId === 'two-step-seeded-retrieval') {
    const p = drawLinearSimple(seed, LINEAR_SIMPLE_TIERS[tier]);
    const value = solveLinearIsolate(p).value;
    return {
      parameters: p,
      expected: { kind: 'integer', value },
      title: 'Löse die Gleichung, gib den Wert von x als ganze Zahl ein.',
      prompt: `Löse die Gleichung ${p.a}x ${signed(p.b)} = ${p.c}. Gib den Wert von x als ganze Zahl ein.`,
      fullSolution: `${p.a}x ${signed(p.b)} = ${p.c} ergibt ${p.a}x = ${p.c - p.b}, also x = ${value}. Probe: ${p.a}·${value} ${signed(p.b)} = ${p.c}.`,
    };
  }
  if (caseId === 'collect-x-terms-both-sides') {
    const p = drawLinearBothSides(seed, LINEAR_BOTH_TIERS[tier]);
    const value = solveLinearIsolate(p).value;
    return {
      parameters: p,
      expected: { kind: 'integer', value },
      title: 'Löse die Gleichung, sammle zuerst alle x-Terme auf einer Seite.',
      prompt: `Löse die Gleichung ${p.a}x ${signed(p.b)} = ${p.c}x ${signed(p.d)}. Sammle zuerst alle x-Terme auf einer Seite und gib x als ganze Zahl ein.`,
      fullSolution: `${p.a}x ${signed(p.b)} = ${p.c}x ${signed(p.d)} führt auf ${p.a - p.c}x = ${p.d - p.b} und damit x = ${value}. Die Probe erfüllt beide Seiten.`,
    };
  }
  throw new Error(`Unbekannter Fall ${caseId}`);
}

/** Doku der Shard-Abweichungen: statische Fälle und parametrische Geschwister.
 *  Wird vom Taxonomie-Kreuzcheck im Test gelesen. */
export const FAMILY_NOTES = [
  {
    familyId: 'transform-linear-equation-isolate',
    staticOnly: [
      {
        caseId: 'divide-both-sides-fully',
        reason: 'choice-diagnose-Fall in einer numeric-exact-Laufzeitfamilie; bleibt statischer Content (f-algebra-equivalence-01).',
      },
    ],
    addedParametric: [],
  },
  { familyId: 'transform-power-log-exponent', staticOnly: [], addedParametric: [] },
  { familyId: 'transform-expression-simplify-canonical', staticOnly: [], addedParametric: [] },
  { familyId: 'aggregate-validate-and-count-records', staticOnly: [], addedParametric: [] },
  {
    familyId: 'construct-regression-test-suite',
    staticOnly: [],
    addedParametric: [
      {
        caseId: 'normalize-and-assert-extended',
        parentCaseId: 'normalize-and-assert-suite',
        reason: 'Gleicher Lösungsweg (normalisieren, vergleichen, Assert-Kette mit Zähler), strengeres Bündel (acht statt fünf Prüfungen, inkl. Tabs/Zeilenumbrüche).',
      },
    ],
  },
  {
    familyId: 'construct-test-structure-aaa',
    staticOnly: [],
    addedParametric: [
      {
        caseId: 'arrange-act-assert-filter',
        parentCaseId: 'arrange-act-assert',
        reason: 'Gleicher AAA-Strukturvertrag mit erwartungsunabhängigem Assert; anderes Szenario (Filter statt Duplikatssuche), gleiche Fehlerhypothese.',
      },
    ],
  },
  {
    familyId: 'construct-guarded-loop',
    staticOnly: [
      {
        caseId: 'append-return-in-loop',
        reason: 'code-test-Fall in einer program-ordering-Laufzeitfamilie; bleibt statischer Content (f-control-code-repair-01).',
      },
    ],
    addedParametric: [
      {
        caseId: 'countdown-accumulator-structure',
        parentCaseId: 'positive-values-structure',
        reason: 'Gleiche Wächterschleife mit Terminierungsbedingung; geseedeter Startwert, Distraktor mit nicht-terminierendem Update.',
      },
    ],
  },
  {
    familyId: 'validate-required-field-raise',
    staticOnly: [],
    addedParametric: [
      {
        caseId: 'required-key-with-issue',
        parentCaseId: 'specific-except-with-issue',
        reason: 'Gleicher Pflichtfeld-Vertrag (spezifischer Handler, Issue mit Zeilenkontext); anderes Feld (fehlender Schlüssel statt ungültiges Alter).',
      },
    ],
  },
  {
    familyId: 'construct-safe-bugfix-workflow',
    staticOnly: [],
    addedParametric: [
      {
        caseId: 'datafix-flow-with-test-contract',
        parentCaseId: 'bugfix-flow-with-test-contract',
        reason: 'Gleiche Sicherheitsreihenfolge mit Testvertrag; Datenszenario statt Codefix, gleiche Fehlerhypothese (Testlöschung als Distraktor).',
      },
    ],
  },
  { familyId: 'validate-test-design-coverage', staticOnly: [], addedParametric: [] },
];

// --- Familie 2: transform-power-log-exponent (numeric-exact) ----------------
// Shard-Fälle: product-and-power-of-power (w01-e9, Produkt/Potenz-von-Potenz),
// integer-base-power (w01-e10, einzelner Logarithmus/Log-Summe). Exponenten-
// arithmetik zu fester Basis; Referenz: powerLawProduct/powerLawPower/logInt.

export const POWER_LOG_CONTRACT = {
  familyId: 'transform-power-log-exponent',
  familyGroup: 'transform-terms',
  summary: 'Führt Potenz- und Logarithmenausdrücke fester Basis über Exponentenregeln auf einen einzigen Exponentenwert zurück.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'product-and-power-of-power' },
    { caseId: 'integer-base-power' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-algebra-basics'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

/** Unabhängiger Solver: Exponentenwert allein aus den Fallparametern. */
export function solvePowerLogExponent(parameters) {
  if (parameters.shape === 'product') return { value: powerLawProduct(parameters.m, parameters.n) };
  if (parameters.shape === 'power') return { value: powerLawPower(parameters.m, parameters.k) };
  if (parameters.shape === 'log-sum') {
    return { value: logInt(parameters.base, parameters.argM) + logInt(parameters.base, parameters.argN) };
  }
  return { value: logInt(parameters.base, parameters.arg) };
}

function drawPowerShape(seed, tier, intro, bases, introBases) {
  const r = rng(seed >>> 0);
  const pool = intro ? introBases : bases;
  const base = pool[randInt(r, 0, pool.length - 1)];
  if (r() >= 0.5) {
    const m = randInt(r, tier.prod[0], tier.prod[1]);
    const n = randInt(r, tier.prod[2], Math.min(tier.prod[3], tier.prod[4] - m));
    return { shape: 'product', base, m, n };
  }
  const m = randInt(r, tier.pow[0], tier.pow[1]);
  const k = randInt(r, tier.pow[2], Math.floor(tier.pow[4] / m));
  return { shape: 'power', base, m, k };
}

function drawLogShape(seed, tier, bases) {
  const r = rng(seed >>> 0);
  const base = bases[randInt(r, 0, bases.length - 1)];
  const kMax = base === 2 ? tier[2] : tier.other;
  if (r() >= 0.5) {
    const m = randInt(r, 1, kMax);
    const n = randInt(r, 1, kMax);
    return { shape: 'log-sum', base, m, n, argM: base ** m, argN: base ** n };
  }
  const k = randInt(r, 1, kMax);
  return { shape: 'log-single', base, k, arg: base ** k };
}

function powerLogPrompt(p, templates) {
  if (p.shape === 'product') return fillTemplate(templates.product, p);
  if (p.shape === 'power') return fillTemplate(templates.power, p);
  if (p.shape === 'log-sum') {
    return fillTemplate(templates['log-sum'], { logM: logTerm(p.base, p.argM), logN: logTerm(p.base, p.argN) });
  }
  return fillTemplate(templates['log-single'], { log: logTerm(p.base, p.arg) });
}

function powerLogSolution(p, value, templates) {
  if (p.shape === 'product') return fillTemplate(templates.product, { ...p, value });
  if (p.shape === 'power') return fillTemplate(templates.power, { ...p, value });
  if (p.shape === 'log-sum') {
    return fillTemplate(templates['log-sum'], {
      logM: logTerm(p.base, p.argM),
      valM: logInt(p.base, p.argM),
      logN: logTerm(p.base, p.argN),
      valN: logInt(p.base, p.argN),
      value,
    });
  }
  return fillTemplate(templates['log-single'], { log: logTerm(p.base, p.arg), value, base: p.base, arg: p.arg });
}

export function generatePowerLogFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  const tier = profileTier(difficulty);
  if (caseId !== 'product-and-power-of-power' && caseId !== 'integer-base-power') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const body = constructCaseBody('transform-power-log-exponent', caseId);
  if (caseId === 'product-and-power-of-power') {
    const p = drawPowerShape(seed, body.parameters.tiers[tier], tier === 0, body.parameters.bases, body.parameters.introBases);
    const { value } = solvePowerLogExponent(p);
    return {
      parameters: p,
      expected: { ...body.expected, value },
      prompt: powerLogPrompt(p, body.parameters.promptTemplates),
      fullSolution: powerLogSolution(p, value, body.parameters.solutionTemplates),
    };
  }
  const p = drawLogShape(seed, body.parameters.kMaxTiers[tier], body.parameters.bases);
  const { value } = solvePowerLogExponent(p);
  const argCap = body.parameters.argCap;
  if (p.arg > argCap || (p.argM != null && (p.argM > argCap || p.argN > argCap))) {
    throw new Error('Log-Argument überschreitet die Kopfrechengrenze');
  }
  return {
    parameters: p,
    expected: { ...body.expected, value },
    prompt: powerLogPrompt(p, body.parameters.promptTemplates),
    fullSolution: powerLogSolution(p, value, body.parameters.solutionTemplates),
  };
}

// --- Familie 3: transform-expression-simplify-canonical ----------------------
// (expression-equivalence, Grader pyodide-sympy, kein LLM). Shard-Fälle:
// combine-like-terms (w01-e2), distribute-sign-constant-chain
// (f-algebra-final-boss-01). Autorität ist die Termäquivalenzklasse mit
// kanonischer Normalform Ax+B; der Laufzeitgrader beweist sie per SymPy, der
// Familiensolver rechnet A und B exakt aus den Fallparametern.

export const EXPRESSION_CANONICAL_CONTRACT = {
  familyId: 'transform-expression-simplify-canonical',
  familyGroup: 'transform-terms',
  summary: 'Überführt Terme durch gleichwertige Umformung in eine kanonische Form.',
  taskArchetype: 'expression-equivalence',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'combine-like-terms' },
    { caseId: 'distribute-sign-constant-chain' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-algebra', 'c-algebra-basics'],
  graderId: 'pyodide-sympy',
  activityType: 'algebraic-expression',
};

export const SYMPY_EQUIVALENCE_RULE = 'sympy: simplify(expand(student) - expand(expected)) == 0';

/** Kanonische Normalform für Ax+B (sympy-parsebar: explizites *, ^ / **). */
export function canonicalLinear(aCoef, bConst) {
  const xTerm = aCoef === 1 ? 'x' : aCoef === -1 ? '-x' : `${aCoef}*x`;
  if (bConst === 0) return xTerm;
  if (aCoef === 0) return `${bConst}`;
  return `${xTerm} ${bConst > 0 ? `+ ${bConst}` : `- ${-bConst}`}`;
}

/** Unabhängiger Solver: A und B exakt aus den Fallparametern, dann kanonisch
 *  formatieren. */
export function solveExpressionCanonical(parameters) {
  if (parameters.shape === 'distribute') {
    const { p, q, r, s, t, u, v } = parameters;
    const aCoef = p * q - s * t;
    const bConst = -p * r - s * u + v;
    return { aCoef, bConst, canonicalExpression: canonicalLinear(aCoef, bConst) };
  }
  let aCoef = 0;
  let bConst = 0;
  for (const c of parameters.varCoefs) aCoef += c;
  for (const c of parameters.consts) bConst += c;
  return { aCoef, bConst, canonicalExpression: canonicalLinear(aCoef, bConst) };
}

function drawCombine(seed, tier) {
  const r = rng(seed >>> 0);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const varCoefs = Array.from({ length: tier.vars }, () => nonzeroInt(r, -tier.coef, tier.coef));
    const consts = Array.from({ length: tier.consts }, () => randInt(r, -tier.coef, tier.coef));
    const probe = solveExpressionCanonical({ shape: 'combine', varCoefs, consts });
    if (probe.aCoef !== 0) return { shape: 'combine', varCoefs, consts };
  }
  throw new Error('combine-like-terms: kein nicht-degenerierter Term gefunden');
}

function drawDistribute(seed, tier) {
  const r = rng(seed >>> 0);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const p = randInt(r, 2, tier.coef);
    const q = randInt(r, 1, tier.coef);
    const s = randInt(r, 1, tier.coef);
    const t = randInt(r, 1, tier.coef);
    const rr = randInt(r, 1, tier.constant);
    const u = randInt(r, 1, tier.constant);
    const v = randInt(r, 1, tier.constant);
    const probe = solveExpressionCanonical({ shape: 'distribute', p, q, r: rr, s, t, u, v });
    if (probe.aCoef !== 0) return { shape: 'distribute', p, q, r: rr, s, t, u, v };
  }
  throw new Error('distribute-sign-constant-chain: kein nicht-degenerierter Term gefunden');
}

function renderVarCoef(c, first) {
  const body = Math.abs(c) === 1 ? 'x' : `${Math.abs(c)}*x`;
  if (first) return c < 0 ? `-${body}` : body;
  return c < 0 ? `- ${body}` : `+ ${body}`;
}

function combineSource(p) {
  const parts = [
    ...p.varCoefs.map((c, i) => renderVarCoef(c, i === 0)),
    ...p.consts.map((c) => (c < 0 ? `- ${-c}` : `+ ${c}`)),
  ];
  return parts.join(' ');
}

function distributeSource(p) {
  return `${p.p}(${p.q}*x-${p.r})-${p.s}(${p.t}*x+${p.u})+${p.v}`;
}

export function generateExpressionCanonicalFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  const tier = profileTier(difficulty);
  if (caseId !== 'combine-like-terms' && caseId !== 'distribute-sign-constant-chain') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const body = constructCaseBody('transform-expression-simplify-canonical', caseId);
  const mathTerm = (term) => term.replace(/\*/g, ' \\cdot ');
  let parameters;
  let source;
  if (caseId === 'combine-like-terms') {
    parameters = drawCombine(seed, body.parameters.tiers[tier]);
    source = combineSource(parameters);
  } else {
    parameters = drawDistribute(seed, body.parameters.tiers[tier]);
    source = distributeSource(parameters);
  }
  const solved = solveExpressionCanonical(parameters);
  return {
    parameters,
    expected: { ...body.expected, expression: solved.canonicalExpression, equivalence: SYMPY_EQUIVALENCE_RULE },
    title: 'Vereinfache den Term so weit wie möglich und gib ihn ein.',
    prompt: fillTemplate(body.prompt, { source: mathTerm(source) }),
    fullSolution: fillTemplate(body.fullSolution, {
      source: mathTerm(source),
      canonicalMath: mathTerm(solved.canonicalExpression),
      canonical: solved.canonicalExpression,
    }),
  };
}

// --- Familie 4: aggregate-validate-and-count-records (code-test) -------------
// Shard-Fälle: parse-validate-summarize (w03-e3, zaehle_zeilen), seen-scope-
// and-narrow-except (f-data-code-repair-01, inspect_rows). Autorität ist die
// eingebettete Referenzimplementation; das kuratierte Testbündel stammt aus
// dem Content, Profilstufen ab core hängen seed-spezifische Zusatzzeilen an
// (vacuous-axis: intro prüft nur das kuratierte Bündel).

export const VALIDATE_COUNT_CONTRACT = {
  familyId: 'aggregate-validate-and-count-records',
  familyGroup: 'aggregate-count',
  summary: 'Prüft Datensätze gegen ein Validierungskriterium und zählt die erfüllenden Datensätze.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  vacuousSteps: [
    {
      stepId: 'seeded-extra-fixture',
      emptyWhen: ['intro'],
      rationale: 'Intro prüft nur das kuratierte Testbündel; seed-spezifische Zusatzzeilen laufen erst ab core.',
    },
  ],
  caseTypes: [
    { caseId: 'parse-validate-summarize' },
    { caseId: 'seen-scope-and-narrow-except' },
    {
      caseId: 'separate-error-kinds',
      propertyTest: false,
      competencyIds: ['c-capstone-pipeline', 'c-genai-security'],
    },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-files-errors'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

/** Referenz für den kanonischen Zeilenprüfungsfall. */
export const ZAEHLE_REFERENZ = `def zaehle_zeilen(zeilen):
    gueltig = 0
    ungueltig = 0
    summe = 0
    for zeile in zeilen:
        teile = zeile.split(":")
        if len(teile) != 2:
            ungueltig += 1
            continue
        name = teile[0].strip()
        zahl = teile[1].strip()
        if not name or not zahl.lstrip("-").isdigit():
            ungueltig += 1
            continue
        gueltig += 1
        summe += int(zahl)
    return {"gueltig": gueltig, "ungueltig": ungueltig, "summe": summe}`;

/** Kuratiertes Bündel für den kanonischen Zeilenprüfungsfall. */
export const ZAEHLE_TESTS = `def check(zeilen, erwartet, label):
    ergebnis = zaehle_zeilen(zeilen)
    __check(label, ergebnis == erwartet, 'erhalten ' + repr(ergebnis) + ', erwartet ' + repr(erwartet))

check(["ki:12", "lern:-3", "plattform:abc", "", "ki:5"], {"gueltig": 3, "ungueltig": 2, "summe": 14}, "gemischte Liste")
check([], {"gueltig": 0, "ungueltig": 0, "summe": 0}, "leere Liste")
check([" ki : 7 ", "ohne:doppelpunkt:zwei", "  :9", "minus:-1"], {"gueltig": 2, "ungueltig": 2, "summe": 6}, "Trimmen und Struktur")
check(["ki:12", "lern:+4"], {"gueltig": 1, "ungueltig": 1, "summe": 12}, "Plus-Vorzeichen ist ungueltig")`;

export const ZAEHLE_STARTER = `def zaehle_zeilen(zeilen):
    """Zaehlt gueltige/ungueltige 'name:zahl'-Zeilen und summiert die gueltigen Zahlen."""
    ...
`;

/** Gegenbeispiel aus Feedbackregel 0 (w03-e3): "+4" wird per try/int
 *  akzeptiert — das kuratierte Bündel ("Plus-Vorzeichen ist ungueltig")
 *  fängt es in jedem Profil. */
export const ZAEHLE_MUTANT_PLUS = `def zaehle_zeilen(zeilen):
    gueltig = 0
    ungueltig = 0
    summe = 0
    for zeile in zeilen:
        teile = zeile.split(":")
        if len(teile) != 2:
            ungueltig += 1
            continue
        name = teile[0].strip()
        zahl = teile[1].strip()
        if not name:
            ungueltig += 1
            continue
        try:
            summe += int(zahl)
        except ValueError:
            ungueltig += 1
            continue
        gueltig += 1
    return {"gueltig": gueltig, "ungueltig": ungueltig, "summe": summe}`;

/** Gegenbeispiel aus typicalErrors (w03-e3): Zeilen mit zwei Doppelpunkten
 *  gelten als gültig — gefangen, sobald Seed-Zusatzzeilen eine Zeile der Form
 *  "name:zahl:extra" mit numerischem Mittelfeld enthalten. */
export const ZAEHLE_MUTANT_TWO_COLON = `def zaehle_zeilen(zeilen):
    gueltig = 0
    ungueltig = 0
    summe = 0
    for zeile in zeilen:
        teile = zeile.split(":")
        if len(teile) < 2:
            ungueltig += 1
            continue
        name = teile[0].strip()
        zahl = teile[1].strip()
        if not name or not zahl.lstrip("-").isdigit():
            ungueltig += 1
            continue
        gueltig += 1
        summe += int(zahl)
    return {"gueltig": gueltig, "ungueltig": ungueltig, "summe": summe}`;

/** Referenz f-data-code-repair-01 (wörtlich aus der Definition). */
export const INSPECT_REFERENZ = `def inspect_rows(rows):
    issues = []
    seen = set()
    for row in rows:
        try:
            int(row['age'])
        except ValueError:
            issues.append(('invalid-age', row['id']))
        if row['id'] in seen:
            issues.append(('duplicate-id', row['id']))
        seen.add(row['id'])
    return issues`;

/** Kuratiertes Bündel f-data-code-repair-01 (wörtlich aus der Definition). */
export const INSPECT_TESTS = `__rows = [{'id':'a','age':'18'},{'id':'b','age':'x'},{'id':'a','age':'21'}]
__check('Typ- und Duplikatfehler', inspect_rows(__rows) == [('invalid-age','b'),('duplicate-id','a')])
__check('leere Eingabe', inspect_rows([]) == [])
__check('gültige eindeutige Zeilen', inspect_rows([{'id':'a','age':'0'},{'id':'b','age':'-2'}]) == [])
__twice = [{'id':'z','age':'bad'},{'id':'z','age':'bad'}]
__check('Fehlerreihenfolge pro Zeile', inspect_rows(__twice) == [('invalid-age','z'),('invalid-age','z'),('duplicate-id','z')])`;

export const INSPECT_STARTER = `def inspect_rows(rows):
    issues = []
    for row in rows:
        seen = set()
        try:
            int(row['age'])
        except Exception:
            pass
        if row['id'] in seen:
            issues.append(('duplicate-id', row['id']))
        seen.add(row['id'])
    return issues
`;

/** Unabhängiger Solver: gibt die Referenzimplementation des Falls zurück. */
export function solveValidateCount(parameters) {
  if (parameters.task === 'zaehle') return { referenceCode: ZAEHLE_REFERENZ };
  if (parameters.task === 'inspect') return { referenceCode: INSPECT_REFERENZ };
  if (parameters.caseId === 'separate-error-kinds') {
    return { kind: constructCaseBody('aggregate-validate-and-count-records', parameters.caseId).expected.kind };
  }
  throw new Error(`Unbekannte Aufgabe ${parameters.task}`);
}

const ZAEHLE_NAMES = ['ki', 'lern', 'plattform', 'daten', 'kurs', 'test', 'modul', 'zeile'];
const INSPECT_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** JS-Orakel für zaehle_zeilen, aus der Spezifikation (w03-e3-Prompt)
 *  nachgebaut: genau ein Doppelpunkt, Name nach Trimmen nicht leer, Zahl
 *  nach Trimmen optional-minus-ganzzahlig ("+4" ist ungültig). */
export function zaehleRowOutcome(line) {
  const teile = line.split(':');
  if (teile.length !== 2) return { valid: false, add: 0 };
  const name = teile[0].trim();
  const zahl = teile[1].trim();
  const digits = zahl.replace(/^-+/, '');
  if (!name || digits.length === 0 || !/^\d+$/.test(digits)) return { valid: false, add: 0 };
  return { valid: true, add: Number.parseInt(zahl, 10) };
}

export function zaehleSummary(lines) {
  let gueltig = 0;
  let ungueltig = 0;
  let summe = 0;
  for (const line of lines) {
    const outcome = zaehleRowOutcome(line);
    if (outcome.valid) {
      gueltig += 1;
      summe += outcome.add;
    } else {
      ungueltig += 1;
    }
  }
  return { gueltig, ungueltig, summe };
}

/** JS-Orakel für inspect_rows (sicheres Alphabet: Dezimalziffern mit
 *  optionalem Minus vorne; Python-int-Quirks wie "_"/"+" bleiben den
 *  kuratierten Fällen vorbehalten und kommen in Seed-Zeilen nicht vor). */
export function inspectRowOutcome(id, age, seen) {
  const out = [];
  if (!/^-?\d+$/.test(age) || age === '-' || age === '') out.push(['invalid-age', id]);
  if (seen.has(id)) out.push(['duplicate-id', id]);
  return out;
}

export function inspectSummary(rows) {
  const issues = [];
  const seen = new Set();
  for (const row of rows) {
    issues.push(...inspectRowOutcome(row.id, row.age, seen));
    seen.add(row.id);
  }
  return issues;
}

const pyString = (s) => `"${s}"`;

function zaehleExtraRows(seed, count) {
  // ponytail: historische Seed-Ableitung eingefroren, neue Fälle via familySubseed.
  const r = rng((seed ^ 0x9e37) >>> 0);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const kind = randInt(r, 0, 5);
    const name = ZAEHLE_NAMES[randInt(r, 0, ZAEHLE_NAMES.length - 1)];
    const num = randInt(r, -99, 99);
    if (kind === 0) rows.push(`${name}:${num}`);
    else if (kind === 1) rows.push(` ${name} : ${num} `);
    else if (kind === 2) rows.push(`${name}:${num}:extra`);
    else if (kind === 3) rows.push(`  :${Math.abs(num)}`);
    else if (kind === 4) rows.push(`${name}:+${Math.abs(num)}`);
    else rows.push(`${name}:n/a`);
  }
  return rows;
}

function inspectExtraRows(seed, count) {
  // ponytail: historische Seed-Ableitung eingefroren, neue Fälle via familySubseed.
  const r = rng((seed ^ 0x51f7) >>> 0);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const kind = randInt(r, 0, 4);
    const id = INSPECT_IDS[randInt(r, 0, INSPECT_IDS.length - 1)];
    const num = randInt(r, -50, 50);
    if (kind === 0) rows.push({ id, age: `${num}` });
    else if (kind === 1) rows.push({ id, age: 'x' });
    else if (kind === 2) rows.push({ id, age: '' });
    else if (kind === 3) rows.push({ id, age: `${num}a` });
    else rows.push({ id, age: `-${Math.abs(num)}` });
  }
  return rows;
}

const EXTRA_COUNTS = [0, 1, 2, 3];

export function generateValidateCountFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (caseId === 'separate-error-kinds') {
    return constructVariantInstance('aggregate-validate-and-count-records', caseId, seed, difficulty);
  }
  const extraCount = EXTRA_COUNTS[profileTier(difficulty)];
  if (caseId === 'parse-validate-summarize') {
    const extraRows = zaehleExtraRows(seed, extraCount);
    const summary = zaehleSummary(extraRows);
    const extraTests = extraRows.length
      ? `\ncheck([${extraRows.map(pyString).join(', ')}], {"gueltig": ${summary.gueltig}, "ungueltig": ${summary.ungueltig}, "summe": ${summary.summe}}, "Seed-Zusatzzeilen ${seed}")`
      : '';
    return {
      parameters: {
        task: 'zaehle',
        starterCode: ZAEHLE_STARTER,
        tests: `${ZAEHLE_TESTS}${extraTests}`,
        seedExtraRows: extraRows,
        seedExtraSummary: summary,
      },
      expected: { kind: 'reference-solver', referenceSolver: ZAEHLE_REFERENZ },
      prompt: `Implementiere eine robuste Zeilenstatistik. \`zaehle_zeilen(zeilen)\` erhält eine Liste von Zeilen im Format \`"name:zahl"\`. Eine Zeile ist gültig, wenn sie genau einen Doppelpunkt enthält, der Name nicht leer ist (nach Trimmen) und die Zahl (nach Trimmen) eine ganze Zahl mit optionalem Minus ist. Rückgabe: \`{"gueltig": g, "ungueltig": u, "summe": s}\` mit s = Summe der Zahlen aller gültigen Zeilen. Ungültige Zeilen werden übersprungen, nicht abgebrochen — aber jede Entscheidung muss aus dem Code lesbar sein (kein blankes except). Der Testcode bringt eigene Zeilenlisten mit.`,
      fullSolution: `${ZAEHLE_REFERENZ}\n\nErst Struktur prüfen (genau ein Doppelpunkt), dann Inhalt (Name, Zahl).`,
    };
  }
  if (caseId === 'seen-scope-and-narrow-except') {
    const extraRows = inspectExtraRows(seed, extraCount);
    const expected = inspectSummary(extraRows);
    const extraTests = extraRows.length
      ? `\n__extra = [${extraRows.map((row) => `{'id':'${row.id}','age':'${row.age}'}`).join(',')}]\n__check('Seed-Zusatzzeilen ${seed}', inspect_rows(__extra) == [${expected.map(([k, v]) => `('${k}','${v}')`).join(',')}])`
      : '';
    return {
      parameters: {
        task: 'inspect',
        starterCode: INSPECT_STARTER,
        tests: `${INSPECT_TESTS}${extraTests}`,
        seedExtraRows: extraRows.map((row) => ({ ...row })),
        seedExtraIssues: expected.map(([kind, id]) => [kind, id]),
      },
      expected: { kind: 'reference-solver', referenceSolver: INSPECT_REFERENZ },
      prompt: `Repariere \`inspect_rows(rows)\`. Für ungültige Alterswerte soll ein Issue \`('invalid-age', id)\` entstehen, für jede wiederholte ID ein Issue \`('duplicate-id', id)\`. \`seen\` muss über mehrere Schleifendurchläufe bestehen bleiben; fange nur \`ValueError\` ab und erzeuge im Handler den konkreten Issue-Eintrag. Der Testcode prüft Typ-, Duplikat- und Reihenfolgeverhalten.`,
      fullSolution: `${INSPECT_REFERENZ}\n\nseen gehört vor die Schleife; nur ValueError fangen und dort den Issue anhängen.`,
    };
  }
  throw new Error(`Unbekannter Fall ${caseId}`);
}

// --- Familie 5: construct-regression-test-suite (code-test) ------------------
// Shard-Fall: normalize-and-assert-suite (w04-e3, ist_palindrom plus
// teste_palindrom mit Assert-Kette und Prüfzähler); parametrischer Geschwister-
// fall normalize-and-assert-extended mit strengerem Bündel (acht Prüfungen,
// inkl. Tabs/Zeilenumbrüche). Autorität: eingebettete Referenz.

export const REGRESSION_SUITE_CONTRACT = {
  familyId: 'construct-regression-test-suite',
  familyGroup: 'construct-program',
  summary: 'Implementiert eine normalisierende Funktion plus Regressionstestfunktion mit Assert-Kette und Prüfzähler.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  vacuousSteps: [
    {
      stepId: 'seeded-extra-fixture',
      emptyWhen: ['intro'],
      rationale: 'Intro prüft nur das kuratierte Testbündel; seed-spezifische Zusatzfälle laufen erst ab core.',
    },
  ],
  caseTypes: [
    { caseId: 'normalize-and-assert-suite' },
    { caseId: 'normalize-and-assert-extended' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-testing-debugging'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

/** Referenzfunktion für den kanonischen Palindromfall. */
export const PALINDROM_REFERENZ = `def ist_palindrom(s):
    normalisiert = "".join(s.lower().split())
    return normalisiert == normalisiert[::-1]`;

/** Referenzsuite für den kanonischen Palindromfall. */
export const PALINDROM_SUITE_REFERENZ = `def teste_palindrom():
    pruefungen = 0
    assert ist_palindrom("Anna") is True
    pruefungen += 1
    assert ist_palindrom("Lager") is False
    pruefungen += 1
    assert ist_palindrom("") is True
    pruefungen += 1
    assert ist_palindrom("Relief pfeiler") is True
    pruefungen += 1
    assert ist_palindrom("A") is True
    pruefungen += 1
    return pruefungen`;

/** Erweiterte Referenzsuite (Geschwisterfall): acht Prüfungen. */
export const PALINDROM_SUITE_EXTENDED_REFERENZ = `${PALINDROM_SUITE_REFERENZ.split('\n    return pruefungen')[0]}
    assert ist_palindrom("A\\tb\\ta") is True
    pruefungen += 1
    assert ist_palindrom("Ab\\nc\\nb\\na") is True
    pruefungen += 1
    assert ist_palindrom("Kein Palindrom") is False
    pruefungen += 1
    return pruefungen`;

/** Kuratiertes Bündel für den kanonischen Palindromfall. */
export const PALINDROM_TESTS = `__check("Anna ist Palindrom", ist_palindrom("Anna") is True)
__check("Lager ist kein Palindrom", ist_palindrom("Lager") is False)
__check("leerer Text ist Palindrom", ist_palindrom("") is True)
__check("Relief pfeiler mit Leerzeichen", ist_palindrom("Relief pfeiler") is True)
anzahl = teste_palindrom()
__check("mindestens fuenf Pruefungen", isinstance(anzahl, int) and anzahl >= 5, "anzahl=" + repr(anzahl))`;

export const PALINDROM_TESTS_EXTENDED = `${PALINDROM_TESTS.split('\nanzahl = teste_palindrom()')[0]}
__check("Tab als Leerraum", ist_palindrom("A\\tb\\ta") is True)
__check("Zeilenumbruch als Leerraum", ist_palindrom("Ab\\nc\\nb\\na") is True)
__check("Nicht-Palindrom bleibt falsch", ist_palindrom("Kein Palindrom") is False)
anzahl = teste_palindrom()
__check("mindestens acht Pruefungen", isinstance(anzahl, int) and anzahl >= 8, "anzahl=" + repr(anzahl))`;

/** Gegenbeispiel aus typicalErrors (w04-e3): weder lower() noch
 *  Leerzeichen-Entfernung — "Anna" und "Relief pfeiler" scheitern. */
export const PALINDROM_MUTANT_NAIVE = `def ist_palindrom(s):
    return s == s[::-1]

def teste_palindrom():
    pruefungen = 0
    assert ist_palindrom("Anna") is True
    pruefungen += 1
    assert ist_palindrom("Lager") is False
    pruefungen += 1
    assert ist_palindrom("") is True
    pruefungen += 1
    assert ist_palindrom("Relief pfeiler") is True
    pruefungen += 1
    assert ist_palindrom("A") is True
    pruefungen += 1
    return pruefungen`;

/** Unabhängiger Solver: Referenzfunktion plus fallzugehörige Suite. */
export function solveRegressionSuite(parameters) {
  const suite = parameters.suite === 'extended' ? PALINDROM_SUITE_EXTENDED_REFERENZ : PALINDROM_SUITE_REFERENZ;
  return { referenceCode: `${PALINDROM_REFERENZ}\n\n${suite}` };
}

const PALINDROM_WORDS = ['anna', 'lager', 'relief', 'pfeiler', 'otto', 'rentner', 'ax', 'a', 'ab', 'abc'];

/** JS-Orakel für ist_palindrom (w04-e3-Spezifikation): Kleinbuchstaben,
 *  Leerzeichen (alle Whitespace) entfernt, Vergleich mit der Umkehrung. */
export function palindromOutcome(s) {
  const normalisiert = s.toLowerCase().replace(/\s+/g, '');
  return normalisiert === [...normalisiert].reverse().join('');
}

const pyEscape = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');

function palindromExtraCases(seed, count) {
  // ponytail: historische Seed-Ableitung eingefroren, neue Fälle via familySubseed.
  const r = rng((seed ^ 0x3a5f) >>> 0);
  const cases = [];
  for (let i = 0; i < count; i += 1) {
    const kind = randInt(r, 0, 3);
    const w = PALINDROM_WORDS[randInt(r, 0, PALINDROM_WORDS.length - 1)];
    if (kind === 0) cases.push(w);
    else if (kind === 1) cases.push(`${w} ${PALINDROM_WORDS[randInt(r, 0, PALINDROM_WORDS.length - 1)]}`);
    else if (kind === 2) cases.push(w.charAt(0).toUpperCase() + w.slice(1));
    else cases.push(`${w}\t${w}`);
  }
  return cases;
}

export function generateRegressionSuiteFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (caseId !== 'normalize-and-assert-suite' && caseId !== 'normalize-and-assert-extended') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const body = constructCaseBody('construct-regression-test-suite', caseId);
  const extraCount = EXTRA_COUNTS[profileTier(difficulty)];
  const suite = body.parameters.suite;
  const baseTests = suite === 'extended' ? PALINDROM_TESTS_EXTENDED : PALINDROM_TESTS;
  const extraCases = palindromExtraCases(seed, extraCount);
  const extraTests = extraCases.length
    ? `\n${extraCases.map((s) => `__check("Seed-Fall ${seed}", ist_palindrom("${pyEscape(s)}") is ${palindromOutcome(s) ? 'True' : 'False'})`).join('\n')}`
    : '';
  const { referenceCode } = solveRegressionSuite({ suite });
  return {
    parameters: {
      task: body.parameters.task,
      suite,
      starterCode: body.parameters.starterCode,
      tests: `${baseTests}${extraTests}`,
      seedExtraCases: extraCases,
    },
    expected: { ...body.expected, referenceSolver: referenceCode },
    prompt: body.prompt,
    fullSolution: fillTemplate(body.fullSolution, { referenceCode }),
  };
}

// --- Parsons-Grundgerüst (Familien 6–9, program-ordering) -------------------
// Der Seed steuert nur die dargebotene Startreihenfolge (intro: genau eine
// adjazente Vertauschung; sonst geseedete Permutation ungleich der
// Poolreihenfolge). Lösung und Distraktoren sind fallfixiert; der Solver
// kennt nur die geordnete Lösungssequenz je Fall (Referenzvertrag).

const shuffledIds = (ids, seed) => shuffle(rng(seed >>> 0), ids);

function parsonsInitialOrder(pool, seed, difficulty) {
  if (profileTier(difficulty) === 0) {
    const r = rng(seed >>> 0);
    const out = [...pool];
    const i = out.length > 1 ? randInt(r, 0, out.length - 2) : 0;
    [out[i], out[i + 1]] = [out[i + 1], out[i]];
    return out;
  }
  let bump = 0;
  let order = shuffledIds(pool, ((seed * 31 + profileTier(difficulty)) >>> 0));
  while (bump < 8 && order.every((id, index) => id === pool[index])) {
    bump += 1;
    order = shuffledIds(pool, (((seed * 31) + profileTier(difficulty) + bump * 101) >>> 0));
  }
  return order;
}

function parsonsGenerate({ seed, difficulty, parsonsCase, fragments, solutionOrder, distractors, prompt, fullSolution, extraParameters }) {
  const pool = [...solutionOrder, ...distractors];
  return {
    parameters: {
      parsonsCase,
      fragments: fragments.map((f) => ({ ...f })),
      initialOrder: parsonsInitialOrder(pool, seed, difficulty),
      ...(extraParameters || {}),
    },
    expected: { kind: 'ordered-lines', solutionOrder: [...solutionOrder], distractors: [...distractors] },
    prompt,
    fullSolution,
  };
}

// --- Familie 6: construct-test-structure-aaa (program-ordering) --------------
// Shard-Fall arrange-act-assert (f-testing-parsons-01) plus parametrischer
// Geschwisterfall arrange-act-assert-filter (gleicher AAA-Strukturvertrag).

export const TEST_STRUCTURE_CONTRACT = {
  familyId: 'construct-test-structure-aaa',
  familyGroup: 'construct-program',
  summary: 'Ordnet einen Test nach Arrange-Act-Assert bei unabhängig formulierter Erwartung.',
  taskArchetype: 'program-ordering',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'arrange-act-assert' },
    { caseId: 'arrange-act-assert-filter' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-testing-debugging'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

/** Unabhängiger Solver: Lösungssequenz allein aus dem Fallschlüssel. */
export function solveTestStructure(parameters) {
  const order = constructCaseBody('construct-test-structure-aaa', parameters.parsonsCase).expected.solutionOrder;
  if (!order) throw new Error(`Unbekannter Fall ${parameters.parsonsCase}`);
  return { solutionOrder: [...order] };
}

export function generateTestStructureFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (caseId !== 'arrange-act-assert' && caseId !== 'arrange-act-assert-filter') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const body = constructCaseBody('construct-test-structure-aaa', caseId);
  return parsonsGenerate({
    seed,
    difficulty,
    parsonsCase: caseId,
    fragments: body.parameters.fragments,
    solutionOrder: body.expected.solutionOrder,
    distractors: body.expected.distractors,
    prompt: body.prompt,
    fullSolution: body.fullSolution,
  });
}

// --- Familie 7: construct-guarded-loop (program-ordering) --------------------
// Shard-Fall positive-values-structure (f-control-parsons-01) plus
// parametrischer Geschwisterfall countdown-accumulator-structure (geseedeter
// Startwert, nicht-terminierender Distraktor). append-return-in-loop bleibt
// statisch (code-test, siehe FAMILY_NOTES).

export const GUARDED_LOOP_CONTRACT = {
  familyId: 'construct-guarded-loop',
  familyGroup: 'construct-program',
  summary: 'Konstruiert eine bewachte Schleife mit korrekter Bedingung und Update.',
  taskArchetype: 'program-ordering',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'positive-values-structure' },
    { caseId: 'countdown-accumulator-structure' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-control-flow'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

/** Unabhängiger Solver: Lösungssequenz aus dem Fallschlüssel; beim Countdown
 *  zusätzlich die arithmetische Kontrollsumme N(N+1)/2. */
export function solveGuardedLoop(parameters) {
  const order = constructCaseBody('construct-guarded-loop', parameters.parsonsCase).expected.solutionOrder;
  if (!order) throw new Error(`Unbekannter Fall ${parameters.parsonsCase}`);
  if (parameters.parsonsCase === 'countdown-accumulator-structure') {
    const n = parameters.start;
    return { solutionOrder: [...order], total: (n * (n + 1)) / 2 };
  }
  return { solutionOrder: [...order] };
}

export function generateGuardedLoopFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (caseId !== 'positive-values-structure' && caseId !== 'countdown-accumulator-structure') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const body = constructCaseBody('construct-guarded-loop', caseId);
  if (caseId === 'positive-values-structure') {
    return parsonsGenerate({
      seed,
      difficulty,
      parsonsCase: caseId,
      fragments: body.parameters.fragments,
      solutionOrder: body.expected.solutionOrder,
      distractors: body.expected.distractors,
      prompt: body.prompt,
      fullSolution: body.fullSolution,
    });
  }
  const tier = body.parameters.startTiers[profileTier(difficulty)];
  const start = randInt(rng(seed >>> 0), tier[0], tier[1]);
  const fragments = body.parameters.fragments.map((f) => ({ ...f, text: fillTemplate(f.text, { start }) }));
  const total = (start * (start + 1)) / 2;
  return parsonsGenerate({
    seed,
    difficulty,
    parsonsCase: caseId,
    fragments,
    solutionOrder: body.expected.solutionOrder,
    distractors: body.expected.distractors,
    prompt: fillTemplate(body.prompt, { start }),
    fullSolution: fillTemplate(body.fullSolution, { start, total }),
    extraParameters: { start },
  });
}

// --- Familie 8: validate-required-field-raise (program-ordering) --------------
// Shard-Fall specific-except-with-issue (f-files-parsons-01) plus
// parametrischer Geschwisterfall required-key-with-issue (Szenario-Tabelle
// mit deterministisch gezogenem Feld).

export const REQUIRED_FIELD_CONTRACT = {
  familyId: 'validate-required-field-raise',
  familyGroup: 'validate-contract',
  summary: 'Prüft Datensätze oder Objekte auf Pflichtfelder und hebt bei Verletzung einen Fehler aus.',
  taskArchetype: 'program-ordering',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'specific-except-with-issue' },
    { caseId: 'required-key-with-issue' },
    { caseId: 'paper-card-required-fields', propertyTest: false, competencyIds: ['c-dl-papers'] },
    { caseId: 'protocol-validator', propertyTest: false, competencyIds: ['c-research-question', 'c-python-functions'] },
    { caseId: 'validate-card-fields', propertyTest: false, competencyIds: ['c-research-cards', 'c-python-functions'] },
    { caseId: 'readme-required-headings', propertyTest: false, competencyIds: ['c-capstone-pipeline', 'c-python-functions'] },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-python-files-errors'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

const REQUIRED_SCENARIOS = {
  'specific-except-with-issue': [
    { field: 'age', parser: 'parse_age', kind: 'invalid-age', noun: 'ein Altersfeld' },
    { field: 'price', parser: 'parse_price', kind: 'invalid-price', noun: 'ein Preisfeld' },
    { field: 'year', parser: 'parse_year', kind: 'invalid-year', noun: 'ein Jahresfeld' },
    { field: 'score', parser: 'parse_score', kind: 'invalid-score', noun: 'ein Punktefeld' },
  ],
  'required-key-with-issue': [
    { field: 'email', kind: 'missing-email', noun: 'die E-Mail' },
    { field: 'id', kind: 'missing-id', noun: 'die ID' },
    { field: 'name', kind: 'missing-name', noun: 'den Namen' },
    { field: 'date', kind: 'missing-date', noun: 'das Datum' },
  ],
};

const REQUIRED_ORDERS = {
  'specific-except-with-issue': ['p1', 'p2', 'p3', 'p4'],
  'required-key-with-issue': ['p1', 'p2', 'p3', 'p4'],
};

/** Unabhängiger Solver: Lösungssequenz allein aus dem Fallschlüssel. */
export function solveRequiredField(parameters) {
  if (parameters.caseId === 'paper-card-required-fields') {
    return { kind: constructCaseBody('validate-required-field-raise', parameters.caseId).expected.kind };
  }
  if (
    parameters.caseId === 'protocol-validator'
    || parameters.caseId === 'validate-card-fields'
    || parameters.caseId === 'readme-required-headings'
  ) {
    return { kind: constructCaseBody('validate-required-field-raise', parameters.caseId).expected.kind };
  }
  const order = REQUIRED_ORDERS[parameters.parsonsCase];
  if (!order) throw new Error(`Unbekannter Fall ${parameters.parsonsCase}`);
  return { solutionOrder: [...order] };
}

export function generateRequiredFieldFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (
    caseId === 'paper-card-required-fields'
    || caseId === 'protocol-validator'
    || caseId === 'validate-card-fields'
    || caseId === 'readme-required-headings'
  ) {
    return constructVariantInstance('validate-required-field-raise', caseId, seed, difficulty);
  }
  if (caseId !== 'specific-except-with-issue' && caseId !== 'required-key-with-issue') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const scenarioRng = rng(((seed * 2654435761) + 97) >>> 0);
  const scenario = REQUIRED_SCENARIOS[caseId][randInt(scenarioRng, 0, 3)];
  const fragments = caseId === 'specific-except-with-issue'
    ? [
      { id: 'p1', text: 'try:' },
      { id: 'p2', text: `    ${scenario.field} = ${scenario.parser}(row["${scenario.field}"])` },
      { id: 'p3', text: 'except ValueError as error:' },
      { id: 'p4', text: `    issues.append({"row": row_number, "kind": "${scenario.kind}", "detail": str(error)})` },
      { id: 'd1', text: 'except Exception: pass' },
    ]
    : [
      { id: 'p1', text: 'try:' },
      { id: 'p2', text: `    ${scenario.field} = row["${scenario.field}"]` },
      { id: 'p3', text: 'except KeyError as error:' },
      { id: 'p4', text: `    issues.append({"row": row_number, "kind": "${scenario.kind}", "detail": str(error)})` },
      { id: 'd1', text: 'except Exception: pass' },
    ];
  const prompt = caseId === 'specific-except-with-issue'
    ? `Ordne die Schritte, um ${scenario.noun} zu prüfen und einen erwarteten ValueError als Issue zu speichern. Eine Zeile verschluckt zu viele Fehler.`
    : `Ordne die Schritte, um ${scenario.noun} als Pflichtfeld zu prüfen und einen fehlenden Schlüssel als Issue zu speichern. Eine Zeile verschluckt zu viele Fehler.`;
  return parsonsGenerate({
    seed,
    difficulty,
    parsonsCase: caseId,
    fragments,
    solutionOrder: REQUIRED_ORDERS[caseId],
    distractors: ['d1'],
    prompt,
    fullSolution: 'try umschließt den riskanten Zugriff. Der spezifische except-Zweig ergänzt den Issue mit Zeilenkontext; die breite Exception-Zeile ist der Distraktor.',
    extraParameters: { field: scenario.field },
  });
}

// --- Familie 9: construct-safe-bugfix-workflow (program-ordering) -------------
// Shard-Fall bugfix-flow-with-test-contract (f-git-parsons-01) plus
// parametrischer Geschwisterfall datafix-flow-with-test-contract (gleiche
// Sicherheitsreihenfolge mit Testvertrag, Datenszenario).

export const BUGFIX_WORKFLOW_CONTRACT = {
  familyId: 'construct-safe-bugfix-workflow',
  familyGroup: 'construct-program',
  summary: 'Ordnet den gesicherten Bugfix-Ablauf von der Reproduktion bis zum Commit mit Testvertrag.',
  taskArchetype: 'program-ordering',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'bugfix-flow-with-test-contract' },
    { caseId: 'datafix-flow-with-test-contract' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-git-basics'],
  graderId: 'deterministic',
  activityType: 'parsons',
};

/** Unabhängiger Solver: Lösungssequenz allein aus dem Fallschlüssel. */
export function solveBugfixWorkflow(parameters) {
  const order = constructCaseBody('construct-safe-bugfix-workflow', parameters.parsonsCase).expected.solutionOrder;
  if (!order) throw new Error(`Unbekannter Fall ${parameters.parsonsCase}`);
  return { solutionOrder: [...order] };
}

export function generateBugfixWorkflowFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (caseId !== 'bugfix-flow-with-test-contract' && caseId !== 'datafix-flow-with-test-contract') {
    throw new Error(`Unbekannter Fall ${caseId}`);
  }
  const body = constructCaseBody('construct-safe-bugfix-workflow', caseId);
  return parsonsGenerate({
    seed,
    difficulty,
    parsonsCase: caseId,
    fragments: body.parameters.fragments,
    solutionOrder: body.expected.solutionOrder,
    distractors: body.expected.distractors,
    prompt: body.prompt,
    fullSolution: body.fullSolution,
  });
}

// --- Familie 10: validate-test-design-coverage (numeric-exact) ----------------
// Shard-Fälle: elif-chain-five-outcomes (statisch, w04-e2, fünf Ausgänge),
// nested-if-decision-tree (geseedet, f-branch-coverage-01). Der geseedete Fall
// wiederverwendet genBranchCoverageCount als Generator und
// countBranchCoverageLeaves als Solver; das Profil wählt die Blattzahl-
// Stufe, der Seed wird bei Bedarf deterministisch weitergerollt.

export const TEST_DESIGN_COVERAGE_CONTRACT = {
  familyId: 'validate-test-design-coverage',
  familyGroup: 'validate-contract',
  summary: 'Bewertet einen Testentwurf gegen Abdeckungs- und Designkriterien.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'elif-chain-five-outcomes', propertyTest: false },
    { caseId: 'nested-if-decision-tree' },
  ],
  difficultyProfiles: ['intro', 'core', 'stretch', 'challenge'],
  competencyIds: ['c-testing-debugging'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

/** Blattzahl-Stufen je Profil (Teilmengen der 2–5-Antworträume). */
export const COVERAGE_LEAF_TIERS = [[2, 3], [3, 4], [4, 4], [4, 5]];

/** Unabhängiger Solver: statisch 5, sonst Blattzahl des Entscheidungsbaums. */
export function solveTestDesignCoverage(parameters) {
  if (parameters.caseId === 'elif-chain-five-outcomes') {
    return { value: constructCaseBody('validate-test-design-coverage', parameters.caseId).expected.value };
  }
  return { value: countBranchCoverageLeaves(parameters.branchShape) };
}

export function generateTestDesignCoverageFamily({ seed, caseId, difficulty }) {
  assertSeed(seed);
  assertProfile(difficulty);
  if (caseId === 'elif-chain-five-outcomes') {
    const body = constructCaseBody('validate-test-design-coverage', caseId);
    const { caseId: _caseId, difficultyProfile: _difficultyProfile, sourceLineage: _sourceLineage, ...generated } = body;
    return { ...generated, parameters: { ...(body.parameters || {}) } };
  }
  if (caseId === 'nested-if-decision-tree') {
    const [lo, hi] = COVERAGE_LEAF_TIERS[profileTier(difficulty)];
    for (let offset = 0; offset < 1024; offset += 1) {
      const drawn = genBranchCoverageCount(seed + offset);
      const leaves = countBranchCoverageLeaves(drawn.parameters.shape);
      if (leaves >= lo && leaves <= hi) {
        const value = solveTestDesignCoverage({ shape: 'nested', branchShape: drawn.parameters.shape }).value;
        return {
          parameters: { shape: 'nested', branchShape: drawn.parameters.shape, seedOffset: offset },
          expected: { kind: 'integer', value },
          prompt: drawn.prompt,
          fullSolution: drawn.fullSolution,
        };
      }
    }
    throw new Error('nested-if-decision-tree: keine Stufe im Suchfenster gefunden');
  }
  throw new Error(`Unbekannter Fall ${caseId}`);
}
