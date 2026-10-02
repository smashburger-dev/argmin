// Procedural family worked-example-fading-distributive: seeded expansion of
// a·(p·x + q) + d as a worked example with [[gap]] slots (contract:
// activityType 'worked-example-fading', graderId 'deterministic', expected
// { kind: 'gaps', gaps: [{ answer, input }] } in prompt order). The three
// caseIds pin the fading stage; the difficulty tier widens the ranges:
//   distribute-final-gap    — only the combined constant of the last line
//   distribute-products-gap — the two expansion products + final constant
//   distribute-all-gap      — every value slot in both transformation lines
// Answers are deterministic functions of {a, p, q, d}: a and p stay positive
// so a·p > 0, while q and d carry signs. A sign character printed before a
// gap stays visible — the gap then takes the absolute value (products and
// constants after a printed sign); a leading coefficient gap carries its own
// sign implicitly because a·p is always positive here.

import {
  rng, randInt, nonzeroInt, drawFamilyInstance,
} from '../generator_draw_kit.mjs';
import { signed } from '../foundations_generators.mjs';

export const WORKED_DISTRIBUTIVE_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

const TIERS = {
  intro: { a: [2, 3], p: [2, 5], q: [-5, 5], d: [-5, 5] },
  core: { a: [2, 4], p: [2, 6], q: [-7, 7], d: [-9, 9] },
  stretch: { a: [2, 6], p: [2, 8], q: [-9, 9], d: [-12, 12] },
  challenge: { a: [3, 9], p: [3, 9], q: [-14, 14], d: [-14, 14] },
};

// Fading stages: slots listed in prompt order = gaps array order. 'coef' is
// the x-coefficient a·p (leading slot, positive), 'prod' the absolute inner
// product |a·q|, 'tail' the absolute outer constant |d|, 'const' the absolute
// combined constant |a·q + d|.
const FADE_CASES = {
  'distribute-final-gap': {
    slots: ['const'],
    fade: 'final',
    title: 'Musterbeispiel ergänzen: letzte Konstante fehlt.',
    stage: 'Das Ausmultiplizieren ist fertig gezeigt — ergänze nur die zusammengefasste Konstante.',
  },
  'distribute-products-gap': {
    slots: ['coef', 'prod', 'const'],
    fade: 'products',
    title: 'Musterbeispiel ergänzen: Produkte und Konstante fehlen.',
    stage: 'Die Struktur der Umformung steht — ergänze die beiden Ausmultiplikations-Produkte und die Schlusskonstante.',
  },
  'distribute-all-gap': {
    slots: ['coef', 'prod', 'tail', 'coef2', 'const'],
    fade: 'all',
    title: 'Musterbeispiel ergänzen: Umformung komplettieren.',
    stage: 'Ab dem Ausgangsterm fehlt jeder Wert — ergänze beide Zeilen vollständig.',
  },
  // Challenge profile (plan v3 §Punkt 4): a(px + q) + c(mx + n) — two
  // separate expansions, then a like-term merge across both products. Six
  // gaps over genuinely separate reasoning stages; the single-bracket
  // cases stay on the other profiles (generate() gates the pairing).
  'distribute-double-gap': {
    slots: ['lead1', 'in1', 'lead2', 'in2', 'leadSum', 'constSum'],
    fade: 'double',
    double: true,
    title: 'Musterbeispiel ergänzen: zwei Produkte ausmultiplizieren und zusammenfassen.',
    stage: 'Zwei Klammern, zwei Zwischenergebnisse — ergänze beide Ausmultiplikationen und die Schlusszeile vollständig.',
  },
};

// Draws {a, p, q, d} for a·(p·x + q) + d with q, d ≠ 0 and a·q + d ≠ 0 (a zero
// combined constant would collapse the last line to a bare x-term).
function drawDistributiveParams(r, tier) {
  const a = randInt(r, tier.a[0], tier.a[1]);
  const p = randInt(r, tier.p[0], tier.p[1]);
  const q = nonzeroInt(r, tier.q[0], tier.q[1]);
  let d = nonzeroInt(r, tier.d[0], tier.d[1]);
  if (a * q + d === 0) d = d === tier.d[1] ? d - 1 : d + 1;
  return { a, p, q, d };
}

// Draws {a, p, q, c, m, n} for a·(p·x + q) + c·(m·x + n): both brackets share
// the tier ranges; q, n ≠ 0 and a·q + c·n ≠ 0 (zero combined constant would
// drop the final term and shrink stage two).
function drawDoubleParams(r, tier) {
  const a = randInt(r, tier.a[0], tier.a[1]);
  const p = randInt(r, tier.p[0], tier.p[1]);
  const q = nonzeroInt(r, tier.q[0], tier.q[1]);
  const c = randInt(r, tier.a[0], tier.a[1]);
  const m = randInt(r, tier.p[0], tier.p[1]);
  let n = nonzeroInt(r, tier.q[0], tier.q[1]);
  if (a * q + c * n === 0) n = n === tier.q[1] ? n - 1 : n + 1;
  return { a, p, q, c, m, n };
}

// Capsule shape: positive factors, nonzero inner/outer constants, non-
// vanishing combined constant. Double-bracket params {a,p,q,c,m,n} follow
// the same invariants on both brackets.
export function distributiveFadingParamsOk(params) {
  try {
    if (!params || typeof params !== 'object') return false;
    const { a, p, q, d, c, m, n } = params;
    if (![a, p, q].every(Number.isInteger)) return false;
    if (a < 2 || a > 9 || p < 2 || p > 9) return false;
    if (q === 0) return false;
    if (c !== undefined || m !== undefined || n !== undefined) {
      if (![c, m, n].every(Number.isInteger)) return false;
      if (c < 2 || c > 9 || m < 2 || m > 9) return false;
      if (n === 0) return false;
      return a * q + c * n !== 0;
    }
    if (!Number.isInteger(d)) return false;
    if (d === 0) return false;
    return a * q + d !== 0;
  } catch { return false; }
}

const DISTRIBUTIVE_GAP_ANSWERS = {
  coef: (t) => String(t.a * t.p),
  prod: (t) => String(Math.abs(t.a * t.q)),
  tail: (t) => String(Math.abs(t.d)),
  coef2: (t) => String(t.a * t.p),
  const: (t) => String(Math.abs(t.a * t.q + t.d)),
  // Double-bracket slots (a·(p·x + q) + c·(m·x + n)): the sign is part of
  // the gap — the challenge profile does not pre-print sgn() markers, so
  // the learner owns the sign decision on the inner products and the final
  // constant (numeric grading accepts signed input).
  lead1: (t) => String(t.a * t.p),
  in1: (t) => String(t.a * t.q),
  lead2: (t) => String(t.c * t.m),
  in2: (t) => String(t.c * t.n),
  leadSum: (t) => String(t.a * t.p + t.c * t.m),
  constSum: (t) => String(t.a * t.q + t.c * t.n),
};

const coefText = (t) => `${t.a * t.p}x`;
const sgn = (n) => (n >= 0 ? '+' : '-');

function scaffoldLines(t, slots) {
  const cell = (slot, text) => (slots.includes(slot) ? '[[gap]]' : text);
  return [
    `${t.a}(${t.p}x ${signed(t.q)}) ${signed(t.d)}`,
    `= ${cell('coef', String(t.a * t.p))}x ${sgn(t.a * t.q)} ${cell('prod', Math.abs(t.a * t.q))} ${sgn(t.d)} ${cell('tail', Math.abs(t.d))}`,
    `= ${cell('coef2', String(t.a * t.p))}x ${sgn(t.a * t.q + t.d)} ${cell('const', Math.abs(t.a * t.q + t.d))}`,
  ];
}

function doubleScaffoldLines(t, slots) {
  const cell = (slot, text) => (slots.includes(slot) ? '[[gap]]' : text);
  return [
    `${t.a}(${t.p}x ${signed(t.q)}) + ${t.c}(${t.m}x ${signed(t.n)})`,
    `= ${cell('lead1', String(t.a * t.p))}x ${cell('in1', signed(t.a * t.q))} + ${cell('lead2', String(t.c * t.m))}x ${cell('in2', signed(t.c * t.n))}`,
    `= ${cell('leadSum', String(t.a * t.p + t.c * t.m))}x ${cell('constSum', signed(t.a * t.q + t.c * t.n))}`,
  ];
}

function solvedLines(t) {
  return [
    `${t.a}(${t.p}x ${signed(t.q)}) ${signed(t.d)}`,
    `= ${coefText(t)} ${signed(t.a * t.q)} ${signed(t.d)}`,
    `= ${coefText(t)} ${signed(t.a * t.q + t.d)}`,
  ];
}

function doubleSolvedLines(t) {
  return [
    `${t.a}(${t.p}x ${signed(t.q)}) + ${t.c}(${t.m}x ${signed(t.n)})`,
    `= ${t.a * t.p}x ${signed(t.a * t.q)} + ${t.c * t.m}x ${signed(t.c * t.n)}`,
    `= ${t.a * t.p + t.c * t.m}x ${signed(t.a * t.q + t.c * t.n)}`,
  ];
}

function buildDistributiveCase(t, caseId) {
  const caseDef = FADE_CASES[caseId];
  const start = caseDef.double
    ? `${t.a}(${t.p}x ${signed(t.q)}) + ${t.c}(${t.m}x ${signed(t.n)})`
    : `${t.a}(${t.p}x ${signed(t.q)}) ${signed(t.d)}`;
  const lines = caseDef.double ? doubleScaffoldLines(t, caseDef.slots) : scaffoldLines(t, caseDef.slots);
  const solved = caseDef.double ? doubleSolvedLines(t) : solvedLines(t);
  const explanation = caseDef.double
    ? `<br>Stufe 1: beide Klammern getrennt ausmultiplizieren ($${t.a} \\cdot ${t.p}x = ${t.a * t.p}x$, $${t.a} \\cdot (${t.q}) = ${t.a * t.q}$ und $${t.c} \\cdot ${t.m}x = ${t.c * t.m}x$, $${t.c} \\cdot (${t.n}) = ${t.c * t.n}$).<br>Stufe 2: die x-Terme $${t.a * t.p}x$ und $${t.c * t.m}x$ sowie die Konstanten $${t.a * t.q}$ und $${t.c * t.n}$ zusammenfassen.`
    : `<br>Zuerst jedes Glied in der Klammer mit $${t.a}$ multiplizieren ($${t.a} \\cdot ${t.p}x = ${t.a * t.p}x$, $${t.a} \\cdot (${t.q}) = ${t.a * t.q}$), dann die Konstanten $${t.a * t.q}$ und $${t.d}$ zusammenfassen.`;
  return {
    parameters: { fade: caseDef.fade, ...t },
    expected: {
      kind: 'gaps',
      gaps: caseDef.slots.map((slot) => ({ answer: DISTRIBUTIVE_GAP_ANSWERS[slot](t), input: 'numeric' })),
    },
    title: caseDef.title,
    prompt: [
      `Vervollständige den Lösungsweg für $${start}$. ${caseDef.stage}`,
      caseDef.double
        ? 'Fülle jede Lücke mit dem vollständigen Wert inklusive Vorzeichen (z. B. −35 oder +18).'
        : 'Fülle jede Lücke mit dem passenden Wert — ein Vorzeichen vor einer Lücke steht bereits im Beispiel.',
      '<br>',
      lines.map((line) => `$${line}$`).join('<br>'),
    ].join(' '),
    fullSolution: [
      'Vollständiger Lösungsweg:<br>',
      solved.map((line) => `$${line}$`).join('<br>'),
      explanation,
    ].join(''),
  };
}

/** Unabhängiger Solver: Lückenwerte allein aus den Fallparametern. */
export function solveWorkedDistributiveFading(parameters) {
  const caseDef = FADE_CASES[parameters?.caseId];
  if (!caseDef || !distributiveFadingParamsOk(parameters)) {
    throw new Error('Worked-Example-Parameter verletzen die Kapselform');
  }
  return { answers: caseDef.slots.map((slot) => DISTRIBUTIVE_GAP_ANSWERS[slot](parameters)) };
}

export function generateWorkedDistributiveFadingFamily({ seed, caseId, difficulty }) {
  const caseDef = FADE_CASES[caseId];
  const tier = TIERS[difficulty];
  // Mutual gate: the double-expansion case IS the challenge profile — a
  // single-bracket fading stage at 'challenge' would be trivially short.
  if (!caseDef || !tier || Boolean(caseDef.double) !== (difficulty === 'challenge')) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  const draw = caseDef.double ? drawDoubleParams : drawDistributiveParams;
  const drawn = drawFamilyInstance(
    (subseed) => buildDistributiveCase(draw(rng(subseed), tier), caseId),
    {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => distributiveFadingParamsOk(instance.parameters),
      profileAccepts: null,
      profiles: WORKED_DISTRIBUTIVE_PROFILES,
    },
  );
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: drawn.expected,
    title: drawn.title,
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
  };
}

export const WORKED_DISTRIBUTIVE_CONTRACT = {
  familyId: 'worked-example-fading-distributive',
  familyGroup: 'worked-example-fading',
  summary: 'Ergänzt ausgeblendete Schritte in einem Musterbeispiel zum Ausmultiplizieren von a(bx+c)±d (Fading-Stufen).',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'distribute-final-gap' },
    { caseId: 'distribute-products-gap' },
    { caseId: 'distribute-all-gap' },
    { caseId: 'distribute-double-gap' },
  ],
  difficultyProfiles: WORKED_DISTRIBUTIVE_PROFILES,
  competencyIds: ['c-algebra-basics'],
  graderId: 'deterministic',
  activityType: 'worked-example-fading',
};

export const FAMILY_SPEC = {
  ...WORKED_DISTRIBUTIVE_CONTRACT,
  generate: generateWorkedDistributiveFadingFamily,
  solve: solveWorkedDistributiveFading,
};
