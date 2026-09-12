// Procedural family worked-example-fading-linear-equations: seeded a*x + b = c
// worked examples whose solution scaffold carries [[gap]] slots (contract:
// activityType 'worked-example-fading', graderId 'deterministic', expected
// { kind: 'gaps', gaps: [{ answer, input }] } in prompt order). The three
// caseIds pin the fading stage; the difficulty tier only widens the
// coefficient ranges:
//   fade-final-step   — only the result line x = … is blanked (early fading)
//   fade-middle-steps — both result lines after the shown operation (mid)
//   fade-all-steps    — operation amount and both result lines (near-complete)
// Answers are deterministic functions of the drawn {a, b, c, x2}: x2 is twice
// the solution, so stretch can draw half-integer x while a stays even and the
// middle line a*x = m keeps an integer m. A sign character printed before a
// gap slot stays visible — the gap then takes the absolute value (the 'op'
// slot); result gaps carry their own sign (m and x may be negative).

import {
  rng, randInt, nonzeroInt, drawFamilyInstance,
} from '../generator_draw_kit.mjs';
import { signed } from '../foundations_generators.mjs';

export const WORKED_LINEAR_PROFILES = ['intro', 'core', 'stretch'];

const TIERS = {
  intro: { a: [2, 6], x: [1, 9], b: [-9, 9], halves: false },
  core: { a: [2, 9], x: [-9, 9], b: [-12, 12], halves: false },
  stretch: { a: [2, 9], x2: [-24, 24], b: [-15, 15], halves: true },
};

// Fading stages: slots listed in prompt order = gaps array order.
const FADE_CASES = {
  'fade-final-step': {
    slots: ['x'],
    fade: 'final',
    title: 'Musterbeispiel ergänzen: Ergebniszeile fehlt.',
    stage: 'Das Musterbeispiel zeigt die komplette Umformung — nur die letzte Zeile fehlt.',
  },
  'fade-middle-steps': {
    slots: ['m', 'x'],
    fade: 'middle',
    title: 'Musterbeispiel ergänzen: Ergebniszeilen fehlen.',
    stage: 'Die Umformungsoperation ist vorgegeben — ergänze beide Ergebniszeilen.',
  },
  'fade-all-steps': {
    slots: ['op', 'm', 'x'],
    fade: 'all',
    title: 'Musterbeispiel ergänzen: Umformung komplettieren.',
    stage: 'Ab der Ausgangsgleichung fehlt jeder Schritt — ergänze Rechenoperation und Ergebniszeilen.',
  },
};

const EVEN_A = [2, 4, 6, 8];

// Draws {a, b, c, x2} with c = a·x + b. Half-integer x (odd x2) forces an even
// a so a·x2/2 and therefore c stay integral; b ≠ 0 keeps the two-step shape.
function drawLinearParams(r, tier) {
  const x2 = tier.halves
    ? nonzeroInt(r, tier.x2[0], tier.x2[1])
    : 2 * nonzeroInt(r, tier.x[0], tier.x[1]);
  const a = x2 % 2 !== 0
    ? EVEN_A[randInt(r, 0, EVEN_A.length - 1)]
    : randInt(r, tier.a[0], tier.a[1]);
  const b = nonzeroInt(r, tier.b[0], tier.b[1]);
  const c = (a * x2) / 2 + b;
  return { a, b, c, x2 };
}

// Capsule shape: integer coefficients, two-step equation, consistent x2.
export function linearFadingParamsOk(p) {
  try {
    if (!p || typeof p !== 'object') return false;
    if (!Number.isInteger(p.a) || p.a < 2 || p.a > 9) return false;
    if (!Number.isInteger(p.b) || p.b === 0) return false;
    if (!Number.isInteger(p.c)) return false;
    if (!Number.isInteger(p.x2) || p.x2 === 0) return false;
    if (p.x2 % 2 !== 0 && p.a % 2 !== 0) return false;
    return aTimesX2(p) === 2 * (p.c - p.b);
  } catch { return false; }
}

const aTimesX2 = (p) => p.a * p.x2;

// Answer strings per slot: 'op' is the absolute operation amount (its sign is
// printed), 'm' and 'x' carry their own sign; half-integer x uses the German
// decimal comma ('-3,5'), matching the deterministic numeric input contract.
const xAnswer = (x2) => (x2 % 2 === 0
  ? String(x2 / 2)
  : `${x2 < 0 ? '-' : ''}${Math.floor(Math.abs(x2) / 2)},5`);
const LINEAR_GAP_ANSWERS = {
  op: (p) => String(Math.abs(p.b)),
  m: (p) => String(p.c - p.b),
  x: (p) => xAnswer(p.x2),
};

// KaTeX rendering of x: decimal comma as {,} so the comma does not become a
// list separator.
const xMath = (x2) => (x2 % 2 === 0
  ? `${x2 / 2}`
  : `${x2 < 0 ? '-' : ''}${Math.floor(Math.abs(x2) / 2)}{,}5`);

function scaffoldLines(p, slots) {
  const cell = (slot, text) => (slots.includes(slot) ? '[[gap]]' : text);
  const opSign = p.b < 0 ? '+' : '-';
  return [
    `${p.a}x ${signed(p.b)} = ${p.c} \\;|\\;${opSign}${cell('op', Math.abs(p.b))}`,
    `${p.a}x = ${cell('m', p.c - p.b)}`,
    `x = ${cell('x', xMath(p.x2))}`,
  ];
}

function solvedLines(p) {
  const opSign = p.b < 0 ? '+' : '-';
  return [
    `${p.a}x ${signed(p.b)} = ${p.c} \\;|\\;${opSign}${Math.abs(p.b)}`,
    `${p.a}x = ${p.c - p.b}`,
    `x = ${xMath(p.x2)}`,
  ];
}

function buildLinearCase(p, caseId) {
  const caseDef = FADE_CASES[caseId];
  const lines = scaffoldLines(p, caseDef.slots);
  return {
    parameters: { fade: caseDef.fade, ...p },
    expected: {
      kind: 'gaps',
      gaps: caseDef.slots.map((slot) => ({ answer: LINEAR_GAP_ANSWERS[slot](p), input: 'numeric' })),
    },
    title: caseDef.title,
    prompt: [
      `Vervollständige den Lösungsweg für $${p.a}x ${signed(p.b)} = ${p.c}$. ${caseDef.stage}`,
      'Fülle jede Lücke mit dem passenden Wert — ein Vorzeichen vor einer Lücke steht bereits im Beispiel.',
      '<br>',
      lines.map((line) => `$${line}$`).join('<br>'),
    ].join(' '),
    fullSolution: [
      'Vollständiger Lösungsweg:<br>',
      solvedLines(p).map((line) => `$${line}$`).join('<br>'),
      `<br>Probe: $${p.a} \\cdot ${p.x2 < 0 ? `(${xMath(p.x2)})` : xMath(p.x2)} ${signed(p.b)} = ${p.c}$ stimmt.`,
    ].join(''),
  };
}

/** Unabhängiger Solver: Lückenwerte allein aus den Fallparametern. */
export function solveWorkedLinearFading(parameters) {
  const caseDef = FADE_CASES[parameters?.caseId];
  if (!caseDef || !linearFadingParamsOk(parameters)) {
    throw new Error('Worked-Example-Parameter verletzen die Kapselform');
  }
  return { answers: caseDef.slots.map((slot) => LINEAR_GAP_ANSWERS[slot](parameters)) };
}

export function generateWorkedLinearFadingFamily({ seed, caseId, difficulty }) {
  const caseDef = FADE_CASES[caseId];
  const tier = TIERS[difficulty];
  if (!caseDef || !tier) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  const drawn = drawFamilyInstance(
    (subseed) => buildLinearCase(drawLinearParams(rng(subseed), tier), caseId),
    {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => linearFadingParamsOk(instance.parameters),
      profileAccepts: null,
      profiles: WORKED_LINEAR_PROFILES,
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

export const WORKED_LINEAR_CONTRACT = {
  familyId: 'worked-example-fading-linear-equations',
  familyGroup: 'worked-example-fading',
  summary: 'Ergänzt ausgeblendete Schritte in einem Musterbeispiel zum Lösen linearer Gleichungen (Fading-Stufen).',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'fade-final-step' },
    { caseId: 'fade-middle-steps' },
    { caseId: 'fade-all-steps' },
  ],
  difficultyProfiles: WORKED_LINEAR_PROFILES,
  competencyIds: ['c-algebra'],
  graderId: 'deterministic',
  activityType: 'worked-example-fading',
};

export const FAMILY_SPEC = {
  ...WORKED_LINEAR_CONTRACT,
  generate: generateWorkedLinearFadingFamily,
  solve: solveWorkedLinearFading,
};
