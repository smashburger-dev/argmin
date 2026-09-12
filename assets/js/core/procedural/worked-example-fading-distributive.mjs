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

export const WORKED_DISTRIBUTIVE_PROFILES = ['intro', 'core', 'stretch'];

const TIERS = {
  intro: { a: [2, 3], p: [2, 5], q: [-5, 5], d: [-5, 5] },
  core: { a: [2, 4], p: [2, 6], q: [-7, 7], d: [-9, 9] },
  stretch: { a: [2, 6], p: [2, 8], q: [-9, 9], d: [-12, 12] },
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

// Capsule shape: positive factors, nonzero inner/outer constants, non-
// vanishing combined constant.
export function distributiveFadingParamsOk(params) {
  try {
    if (!params || typeof params !== 'object') return false;
    const { a, p, q, d } = params;
    if (![a, p, q, d].every(Number.isInteger)) return false;
    if (a < 2 || a > 9 || p < 2 || p > 9) return false;
    if (q === 0 || d === 0) return false;
    return a * q + d !== 0;
  } catch { return false; }
}

const DISTRIBUTIVE_GAP_ANSWERS = {
  coef: (t) => String(t.a * t.p),
  prod: (t) => String(Math.abs(t.a * t.q)),
  tail: (t) => String(Math.abs(t.d)),
  coef2: (t) => String(t.a * t.p),
  const: (t) => String(Math.abs(t.a * t.q + t.d)),
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

function solvedLines(t) {
  return [
    `${t.a}(${t.p}x ${signed(t.q)}) ${signed(t.d)}`,
    `= ${coefText(t)} ${signed(t.a * t.q)} ${signed(t.d)}`,
    `= ${coefText(t)} ${signed(t.a * t.q + t.d)}`,
  ];
}

function buildDistributiveCase(t, caseId) {
  const caseDef = FADE_CASES[caseId];
  const lines = scaffoldLines(t, caseDef.slots);
  return {
    parameters: { fade: caseDef.fade, ...t },
    expected: {
      kind: 'gaps',
      gaps: caseDef.slots.map((slot) => ({ answer: DISTRIBUTIVE_GAP_ANSWERS[slot](t), input: 'numeric' })),
    },
    title: caseDef.title,
    prompt: [
      `Vervollständige den Lösungsweg für $${t.a}(${t.p}x ${signed(t.q)}) ${signed(t.d)}$. ${caseDef.stage}`,
      'Fülle jede Lücke mit dem passenden Wert — ein Vorzeichen vor einer Lücke steht bereits im Beispiel.',
      '<br>',
      lines.map((line) => `$${line}$`).join('<br>'),
    ].join(' '),
    fullSolution: [
      'Vollständiger Lösungsweg:<br>',
      solvedLines(t).map((line) => `$${line}$`).join('<br>'),
      `<br>Zuerst jedes Glied in der Klammer mit $${t.a}$ multiplizieren ($${t.a} \\cdot ${t.p}x = ${t.a * t.p}x$, $${t.a} \\cdot (${t.q}) = ${t.a * t.q}$), dann die Konstanten $${t.a * t.q}$ und $${t.d}$ zusammenfassen.`,
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
  if (!caseDef || !tier) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  const drawn = drawFamilyInstance(
    (subseed) => buildDistributiveCase(drawDistributiveParams(rng(subseed), tier), caseId),
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
