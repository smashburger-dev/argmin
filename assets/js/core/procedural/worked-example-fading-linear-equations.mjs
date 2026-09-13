// Procedural family worked-example-fading-linear-equations: seeded a*x + b = c
// worked examples whose solution scaffold carries [[gap]] slots (contract:
// activityType 'worked-example-fading', graderId 'deterministic', expected
// { kind: 'gaps', gaps: [{ answer, input }] } in prompt order). The three
// caseIds pin the fading stage; the difficulty tier only widens the
// coefficient ranges:
//   fade-final-step   — only the result line x = … is blanked (early fading)
//   fade-middle-steps — both result lines after the shown operation (mid)
//   fade-all-steps    — operation amount and both result lines (near-complete)
//   fade-two-sided    — challenge profile: a*x + b = c*x + d, six signed gaps
// Answers are deterministic functions of the drawn {a, b, c, x2}: x2 is twice
// the solution, so stretch can draw half-integer x while a stays even and the
// middle line a*x = m keeps an integer m. A sign character printed before a
// gap slot stays visible — the gap then takes the absolute value (the 'op'
// slot); result gaps carry their own sign (m and x may be negative).
// The two-sided case draws {a, b, c, d, x2} with d = b + (a-c)*x2/2 so the
// merged coefficient a-c and the solution x stay integral or half-integral;
// no sign is pre-printed on its operation gaps — the learner owns every sign
// (mirrors the distribute-double-gap challenge convention).

import {
  rng, randInt, nonzeroInt, drawFamilyInstance,
} from '../generator_draw_kit.mjs';
import { signed } from '../foundations_generators.mjs';

export const WORKED_LINEAR_PROFILES = ['intro', 'core', 'stretch', 'challenge'];

const TIERS = {
  intro: { a: [2, 6], x: [1, 9], b: [-9, 9], halves: false },
  core: { a: [2, 9], x: [-9, 9], b: [-12, 12], halves: false },
  stretch: { a: [2, 9], x2: [-24, 24], b: [-15, 15], halves: true },
  // Two-sided case only: a,c are the x-coefficients of both sides, x2 keeps
  // the doubled-solution convention, c is signed so the first operation's
  // direction is a genuine decision.
  challenge: { a: [3, 9], c: [-9, 9], b: [-14, 14], x2: [-18, 18] },
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
  // Challenge profile: a*x + b = c*x + d — x on both sides. Six signed gaps
  // over two separate equivalence steps (x-terms left, constants right);
  // the merged coefficient a-c is asked on both intermediate lines so the
  // learner must carry the sign through the whole scaffold. The one-sided
  // cases stay on the other profiles (generate() gates the pairing).
  'fade-two-sided': {
    slots: ['opx', 'coef', 'opc', 'coef2', 'm2', 'x'],
    fade: 'two-sided',
    twoSided: true,
    title: 'Musterbeispiel ergänzen: beidseitige Gleichung komplett umformen.',
    stage: 'Die Gleichung hat x auf beiden Seiten — ergänze beide Umformungsoperationen, beide Zwischenzeilen und die Lösung vollständig.',
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

// Draws {a, b, c, d, x2} for a*x + b = c*x + d (challenge). c is signed and
// differs from a, so collecting x-terms on the left is a real sign decision;
// |c| >= 2 and |a-c| != 1 keep every coefficient nontrivial. For odd x2 the
// merged coefficient a-c must be even so d = b + (a-c)*x2/2 stays integral —
// the parity-filtered candidate pool makes that deterministic (it is never
// empty for the configured ranges: same-parity c always has >=7 candidates).
// The b-bump keeps d != 0 without ever producing b = 0.
function drawTwoSidedParams(r, tier) {
  const x2 = nonzeroInt(r, tier.x2[0], tier.x2[1]);
  const a = randInt(r, tier.a[0], tier.a[1]);
  const pool = [];
  for (let c = tier.c[0]; c <= tier.c[1]; c += 1) {
    if (Math.abs(c) < 2 || c === a || Math.abs(a - c) === 1) continue;
    if (x2 % 2 !== 0 && (a - c) % 2 !== 0) continue;
    pool.push(c);
  }
  const c = pool[randInt(r, 0, pool.length - 1)];
  let b = nonzeroInt(r, tier.b[0], tier.b[1]);
  if (b + ((a - c) * x2) / 2 === 0) b = (b === -1 || b === tier.b[1]) ? b - 1 : b + 1;
  const d = b + ((a - c) * x2) / 2;
  return { a, b, c, d, x2 };
}

// Capsule shape: integer coefficients, two-step equation, consistent x2.
// The two-sided challenge case (p.d present or fade 'two-sided') carries
// a*x + b = c*x + d: c is the right-side x-coefficient, a-c the merged one —
// nonzero and never +-1 — and (a-c)*x2 = 2*(d-b) pins the solution x = x2/2.
export function linearFadingParamsOk(p) {
  try {
    if (!p || typeof p !== 'object') return false;
    if (!Number.isInteger(p.a) || p.a < 2 || p.a > 9) return false;
    if (!Number.isInteger(p.b) || p.b === 0) return false;
    if (!Number.isInteger(p.c)) return false;
    if (!Number.isInteger(p.x2) || p.x2 === 0) return false;
    if (p.fade === 'two-sided' || p.d !== undefined) {
      if (!Number.isInteger(p.d) || p.d === 0) return false;
      if (Math.abs(p.c) < 2 || p.c > 9 || p.c < -9) return false;
      if (p.c === p.a || Math.abs(p.a - p.c) === 1) return false;
      return (p.a - p.c) * p.x2 === 2 * (p.d - p.b);
    }
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
  // Two-sided slots (a*x + b = c*x + d): every gap carries its own sign —
  // the | operations are the signed values -c and -b, coef/coef2 are the
  // merged coefficient a-c on both intermediate lines, m2 is d-b.
  opx: (p) => String(-p.c),
  coef: (p) => String(p.a - p.c),
  opc: (p) => String(-p.b),
  coef2: (p) => String(p.a - p.c),
  m2: (p) => String(p.d - p.b),
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

// Two-sided scaffold: the | gaps hold the signed operation value (-c on the
// x-terms, -b on the constants), the merged coefficient a-c is blanked on
// both intermediate lines and only the right side d-b plus x follow.
function twoSidedScaffoldLines(p, slots) {
  const cell = (slot, text) => (slots.includes(slot) ? '[[gap]]' : text);
  const k = p.a - p.c;
  return [
    `${p.a}x ${signed(p.b)} = ${p.c}x ${signed(p.d)} \\;|\\;${cell('opx', signed(-p.c))}x`,
    `${cell('coef', String(k))}x ${signed(p.b)} = ${p.d} \\;|\\;${cell('opc', signed(-p.b))}`,
    `${cell('coef2', String(k))}x = ${cell('m2', String(p.d - p.b))}`,
    `x = ${cell('x', xMath(p.x2))}`,
  ];
}

function twoSidedSolvedLines(p) {
  const k = p.a - p.c;
  return [
    `${p.a}x ${signed(p.b)} = ${p.c}x ${signed(p.d)} \\;|\\;${signed(-p.c)}x`,
    `${k}x ${signed(p.b)} = ${p.d} \\;|\\;${signed(-p.b)}`,
    `${k}x = ${p.d - p.b}`,
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

// Two-sided variant: same capsule shape, but the prompt shows the equation
// with x on both sides and the fullSolution adds a strategy paragraph (the
// order of the two equivalence steps is a free decision) — kept as a second
// block so the challenge contract sees >=2 blocks.
function buildTwoSidedCase(p, caseId) {
  const caseDef = FADE_CASES[caseId];
  const lines = twoSidedScaffoldLines(p, caseDef.slots);
  const solved = twoSidedSolvedLines(p);
  const xText = p.x2 < 0 ? `(${xMath(p.x2)})` : xMath(p.x2);
  return {
    parameters: { fade: caseDef.fade, ...p },
    expected: {
      kind: 'gaps',
      gaps: caseDef.slots.map((slot) => ({ answer: LINEAR_GAP_ANSWERS[slot](p), input: 'numeric' })),
    },
    title: caseDef.title,
    prompt: [
      `Vervollständige den Lösungsweg für $${p.a}x ${signed(p.b)} = ${p.c}x ${signed(p.d)}$. ${caseDef.stage}`,
      'Fülle jede Lücke mit dem vollständigen Wert inklusive Vorzeichen (z. B. −5 oder +7) — in den Operationslücken steht, was beidseitig verrechnet wird.',
      '<br>',
      lines.map((line) => `$${line}$`).join('<br>'),
    ].join(' '),
    fullSolution: [
      'Vollständiger Lösungsweg:<br>',
      solved.map((line) => `$${line}$`).join('<br>'),
      `<br>Probe: $${p.a} \\cdot ${xText} ${signed(p.b)} = ${p.c} \\cdot ${xText} ${signed(p.d)}$ stimmt.`,
      '\n\n',
      `Strategie: erst die x-Terme auf eine Seite (${signed(-p.c)}x beidseitig), dann die Konstanten auf die andere (${signed(-p.b)} beidseitig) — die umgekehrte Reihenfolge führt zum selben Ergebnis.`,
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
  // Mutual gate: the two-sided case IS the challenge profile — a one-sided
  // fading stage at 'challenge' would be trivially short (same convention
  // as worked-example-fading-distributive).
  if (!caseDef || !tier || Boolean(caseDef.twoSided) !== (difficulty === 'challenge')) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  const draw = caseDef.twoSided ? drawTwoSidedParams : drawLinearParams;
  const build = caseDef.twoSided ? buildTwoSidedCase : buildLinearCase;
  const drawn = drawFamilyInstance(
    (subseed) => build(draw(rng(subseed), tier), caseId),
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
    { caseId: 'fade-two-sided' },
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
