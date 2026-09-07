// Week-1 exercise generators and reference solvers (Abruf-Algebra: lineare
// Gleichungen, Potenzgesetze, Logarithmen). Same contract as
// Foundations generator module: single source of truth imported by the browser
// graders AND the Node property tests (tests/foundations_generators.test.mjs).
//
// Every generator returns { parameters, expected, prompt } where `prompt` is
// the complete German exercise text (plain text + unicode math, no KaTeX
// markup — seeded prompts must render without a math pass after re-rolling)
// and `expected` is computed by a reference solver, never hardcoded.

/** Deterministic small PRNG (mulberry32) — identical implementation to
 *  linalg_generators.mjs so seeds behave identically in browser and Node. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const nonzeroInt = (r, lo, hi) => {
  for (let i = 0; i < 50; i++) {
    const v = randInt(r, lo, hi);
    if (v !== 0) return v;
  }
  return 1;
};

// --- reference solvers ---------------------------------------------------------

/** Solve a*x + b = c (throws on a === 0 — generators never produce it). */
export function solveLinearEquation(a, b, c) {
  if (a === 0) throw new Error('division durch 0 (a === 0)');
  return (c - b) / a;
}

/** Solve a*x + b = c*x + d (throws on a === c — generators never produce it). */
export function solveLinearEquationBothSides(a, b, c, d) {
  if (a === c) throw new Error('division durch 0 (a === c)');
  return (d - b) / (a - c);
}

/** Product of powers: b^m * b^n = b^(m+n) — returns the resulting exponent. */
export function powerLawProduct(m, n) { return m + n; }

/** Power of a power: (b^m)^k = b^(m*k) — returns the resulting exponent. */
export function powerLawPower(m, k) { return m * k; }

/** Discrete logarithm: returns k with b^k === arg (throws if none exists). */
export function logInt(base, arg) {
  let k = 0, v = 1;
  while (v < arg) { v *= base; k++; }
  if (v !== arg) throw new Error(`kein ganzzahliger Logarithmus: log_${base}(${arg})`);
  return k;
}

// --- prompt formatting helpers ---------------------------------------------------

const signed = (n) => (n >= 0 ? `+ ${n}` : `- ${-n}`);
const coeff = (a) => `${a}x`;
const SUB = { 2: '\u2082', 3: '\u2083', 5: '\u2085', 10: '\u2081\u2080' };
const logTerm = (b, arg) => `log${SUB[b] || '_' + b}(${arg})`;

// --- generators -----------------------------------------------------------------

/** w01-e8: linear equation in one variable, two shapes:
 *  - 'simple':     a*x + b = c           (a in [2,9], b in [-12,12], x in [-9,9])
 *  - 'both-sides': a*x + b = c*x + d     (a,c in [2,9] with a !== c)
 *  Invariants: integer solution in [-9,9], no division by zero (a !== 0,
 *  a !== c), all coefficients small enough for mental math. */
export function genLinearEquation(seed) {
  const r = rng(seed);
  const bothSides = r() >= 0.5;
  const x = randInt(r, -9, 9);
  if (bothSides) {
    const a = nonzeroInt(r, 2, 9);
    let c = nonzeroInt(r, 2, 9);
    if (c === a) c = a === 9 ? 2 : a + 1;
    const b = randInt(r, -12, 12);
    const d = (a - c) * x + b;
    return {
      parameters: { shape: 'both-sides', a, b, c, d },
      expected: solveLinearEquationBothSides(a, b, c, d),
      prompt: `Löse die Gleichung ${coeff(a)} ${signed(b)} = ${coeff(c)} ${signed(d)}. Gib den Wert von x als ganze Zahl ein.`,
    };
  }
  const a = nonzeroInt(r, 2, 9);
  const b = randInt(r, -12, 12);
  const c = a * x + b;
  return {
    parameters: { shape: 'simple', a, b, c },
    expected: solveLinearEquation(a, b, c),
    prompt: `Löse die Gleichung ${coeff(a)} ${signed(b)} = ${c}. Gib den Wert von x als ganze Zahl ein.`,
  };
}

/** w01-e9: power laws, two shapes — the ANSWER is always the resulting
 *  exponent (small integer, hand-computable without evaluating the power):
 *  - 'product': b^m · b^n  -> m + n   (m in [2,6], n in [1,4], m+n <= 8)
 *  - 'power':   (b^m)^k    -> m * k   (m in [2,4], k in [2,3], m*k <= 10)
 *  Bases from {2,3,5,10}. */
export function genPowerExpr(seed) {
  const r = rng(seed);
  const base = [2, 3, 5, 10][randInt(r, 0, 3)];
  if (r() >= 0.5) {
    const m = randInt(r, 2, 6);
    const n = randInt(r, 1, Math.min(4, 8 - m));
    return {
      parameters: { shape: 'product', base, m, n },
      expected: powerLawProduct(m, n),
      prompt: `Vereinfache ${base}^${m} · ${base}^${n} mit dem Potenzgesetz und gib den neuen Exponenten der Basis ${base} an (also n aus ${base}^n).`,
    };
  }
  const m = randInt(r, 2, 4);
  const k = randInt(r, 2, Math.floor(10 / m));
  return {
    parameters: { shape: 'power', base, m, k },
    expected: powerLawPower(m, k),
    prompt: `Vereinfache (${base}^${m})^${k} mit dem Potenzgesetz und gib den neuen Exponenten der Basis ${base} an (also n aus ${base}^n).`,
  };
}

/** w01-e10: discrete logarithms, two shapes (answer always an integer k):
 *  - 'single': log_b(b^k)          (k in [1,6] for base 2, [1,4] otherwise)
 *  - 'sum':    log_b(b^m)+log_b(b^n) -> m + n
 *  Invariants: argument > 0, argument = b^k exactly (verified by the
 *  reference solver logInt), argument <= 10000. */
export function genLogExpr(seed) {
  const r = rng(seed);
  const base = [2, 3, 5, 10][randInt(r, 0, 3)];
  const kMax = base === 2 ? 6 : 4;
  if (r() >= 0.5) {
    const m = randInt(r, 1, kMax);
    const n = randInt(r, 1, kMax);
    return {
      parameters: { shape: 'sum', base, m, n },
      expected: logInt(base, base ** m) + logInt(base, base ** n),
      prompt: `Berechne ${logTerm(base, base ** m)} + ${logTerm(base, base ** n)} und gib das Ergebnis als ganze Zahl ein.`,
    };
  }
  const k = randInt(r, 1, kMax);
  return {
    parameters: { shape: 'single', base, k },
    expected: logInt(base, base ** k),
    prompt: `Berechne ${logTerm(base, base ** k)} und gib das Ergebnis als ganze Zahl ein.`,
  };
}

export function genLinearBothSides(seed) {
  const r = rng(seed);
  const x = randInt(r, -12, 12);
  const a = nonzeroInt(r, 2, 9);
  let c = nonzeroInt(r, -9, 9);
  if (c === a) c = a === 9 ? -2 : a + 1;
  const b = randInt(r, -15, 15);
  const d = (a - c) * x + b;
  return {
    parameters: { a, b, c, d },
    expected: solveLinearEquationBothSides(a, b, c, d),
    prompt: `Löse die Gleichung ${coeff(a)} ${signed(b)} = ${coeff(c)} ${signed(d)}. Sammle zuerst alle x-Terme auf einer Seite und gib x als ganze Zahl ein.`,
    fullSolution: `${coeff(a)} ${signed(b)} = ${coeff(c)} ${signed(d)} führt auf ${a - c}x = ${d - b} und damit x = ${x}. Die Probe erfüllt beide Seiten.`,
  };
}
