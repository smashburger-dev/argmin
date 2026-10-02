// Procedural cases of formula-scalar-product: the four remaining w05 cases
// (matmul-entry-w05-e1/-e12 via the genMatmulEntry draw space, dot-product-
// w05-e13/-e3 via the genDot space). The authored bodies stay in the JSON as
// anchors; feedback/hints/typicalErrors are emitted from the drawn numbers.
// Run: node --test tests/procedural_scalar_product_remaining.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateScalarProductFamily,
  solveScalarProduct,
  SCALAR_PRODUCT_CONTRACT,
} from '../assets/js/core/foundations_linalg_families.mjs';
import './helpers/register_static_cases.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-scalar-product.json'), 'utf8'));
const MATMUL = ['matmul-entry-w05-e1', 'matmul-entry-w05-e12'];
const DOT = ['dot-product-w05-e13', 'dot-product-w05-e3'];
const GEN_CASES = [...MATMUL, ...DOT];
const PROFILE = {
  'matmul-entry-w05-e1': 'intro',
  'matmul-entry-w05-e12': 'core',
  'dot-product-w05-e13': 'core',
  'dot-product-w05-e3': 'core',
};
const authored = Object.fromEntries(
  GEN_CASES.map((caseId) => [caseId, doc.cases.find((entry) => entry.caseId === caseId)]),
);
const gen = (seed, caseId, difficulty = 'core') => generateScalarProductFamily({ seed, caseId, difficulty });

test('anchor: contract null, authored bodies complete, solver reproduces authored expected (fixture parity)', () => {
  assert.equal(doc.contract, null);
  for (const caseId of GEN_CASES) {
    const body = authored[caseId];
    assert.ok(body, `${caseId}: anchor fehlt`);
    assert.ok(body.prompt.length > 20 && body.fullSolution.length > 20, `${caseId}: Texte erhalten`);
    assert.equal(body.expected.kind, 'integer', `${caseId}: expected.kind`);
    // Fixture parity: the authored instance parameters solve to the authored
    // expected value under the seeded solver. The authored instances sit
    // inside the draw spaces: e1's B draws over the full ints [-3,3] (its
    // authored B[0][0]=0 needs the widened space — documented decision);
    // e12/e13/e3 lie inside the nonzeroInt spaces.
    const solved = solveScalarProduct({ caseId, difficulty: 'core', ...body.parameters });
    assert.equal(solved.value, body.expected.value, `${caseId}: Solver-Parität`);
  }
});

test('anchor reachability: authored parameters satisfy the per-case draw space', () => {
  for (const caseId of MATMUL) {
    const { A, B, entry } = authored[caseId].parameters;
    assert.ok(A.flat().every((v) => Number.isInteger(v) && v !== 0 && v >= -4 && v <= 4), `${caseId}: A im nonzeroInt-Raum`);
    const bOk = (v) => Number.isInteger(v) && v >= -3 && v <= 3 && (caseId === 'matmul-entry-w05-e1' || v !== 0);
    assert.ok(B.flat().every(bOk), `${caseId}: B im Draw-Raum`);
    assert.ok(entry.every((v) => v === 1 || v === 2), `${caseId}: entry in {1,2}²`);
  }
  for (const caseId of DOT) {
    const { u, v } = authored[caseId].parameters;
    for (const vec of [u, v]) {
      assert.equal(vec.length, 3);
      assert.ok(vec.every((x) => Number.isInteger(x) && x !== 0 && x >= -5 && x <= 5), `${caseId}: nonzeroInt(-5,5)³`);
    }
  }
});

test('integer guard: every drawn parameter is an integer; expected stays integer-typed', () => {
  for (const caseId of GEN_CASES) {
    for (let seed = 0; seed < 200; seed += 1) {
      const g = gen(seed, caseId);
      const p = g.parameters;
      assert.equal(p.caseId, caseId);
      assert.deepEqual(g.expected.kind, 'integer', `${caseId}:${seed}: kind`);
      assert.ok(Number.isInteger(g.expected.value), `${caseId}:${seed}: integer expected`);
      if (p.form === 'matmul-entry') {
        assert.ok(p.A.flat().every(Number.isInteger) && p.B.flat().every(Number.isInteger), `${caseId}:${seed}: Matrizen ganzzahlig`);
        assert.ok(p.A.flat().every((v) => v !== 0 && Math.abs(v) <= 4), `${caseId}:${seed}: A nonzeroInt(-4,4)`);
        const bOk = (v) => v >= -3 && v <= 3 && (caseId === 'matmul-entry-w05-e1' || v !== 0);
        assert.ok(p.B.flat().every(bOk), `${caseId}:${seed}: B-Draw-Raum`);
        if (caseId === 'matmul-entry-w05-e1') assert.ok(!p.B.flat().every((v) => v === 0), `${caseId}:${seed}: B nicht Nullmatrix`);
        assert.ok(p.entry.every((v) => v === 1 || v === 2), `${caseId}:${seed}: entry`);
      } else {
        assert.equal(p.form, 'dot-vectors');
        assert.ok(p.u.every((x) => Number.isInteger(x) && x !== 0 && Math.abs(x) <= 5), `${caseId}:${seed}: u nonzeroInt(-5,5)`);
        assert.ok(p.v.every((x) => Number.isInteger(x) && x !== 0 && Math.abs(x) <= 5), `${caseId}:${seed}: v nonzeroInt(-5,5)`);
      }
      assert.deepEqual(solveScalarProduct(p), { value: g.expected.value }, `${caseId}:${seed}: Solver`);
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of GEN_CASES) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(gen(seed, caseId).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: nur ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces the identical instance, negative seeds valid', () => {
  for (const caseId of GEN_CASES) {
    for (let seed = -10; seed < 10; seed += 1) {
      assert.deepEqual(gen(seed, caseId), gen(seed, caseId), `${caseId}:${seed}`);
    }
  }
});

test('feedback emission: rules name honestly computed wrong values of the draw', () => {
  for (const caseId of MATMUL) {
    for (let seed = 0; seed < 80; seed += 1) {
      const g = gen(seed, caseId);
      const { A, B, entry } = g.parameters;
      const [i, j] = entry;
      const [p1, p2] = [A[i - 1][0] * B[0][j - 1], A[i - 1][1] * B[1][j - 1]];
      const legal = new Set([
        p1 + p2, p1, p1 - p2,
        A[j - 1][0] * B[0][i - 1] + A[j - 1][1] * B[1][i - 1],
        A[i - 1][0] * B[0][(3 - j) - 1] + A[i - 1][1] * B[1][(3 - j) - 1],
      ]);
      assert.ok(g.feedbackRules.length >= 1 && g.feedbackRules.length <= 4, `${caseId}:${seed}: Regelanzahl`);
      for (const rule of g.feedbackRules) {
        const match = /^value === (-?\d+)$/.exec(rule.if);
        assert.ok(match, `${caseId}:${seed}: Regelform ${rule.if}`);
        const wrong = Number(match[1]);
        assert.notEqual(wrong, g.expected.value, `${caseId}:${seed}: Regel trifft Erwartungswert`);
        assert.ok(legal.has(wrong), `${caseId}:${seed}: Fehlwert ${wrong} nicht aus dem Draw berechenbar`);
        assert.ok(rule.then.length > 20, `${caseId}:${seed}: then-Text`);
      }
      // Erste Priorität: der indexgetauschte Eintrag c_{j,i} (nur wenn != Erwartung).
      const swapped = A[j - 1][0] * B[0][i - 1] + A[j - 1][1] * B[1][i - 1];
      if (swapped !== g.expected.value) {
        assert.equal(g.feedbackRules[0].if, `value === ${swapped}`, `${caseId}:${seed}: Swap-Regel vorne`);
      }
    }
  }
  for (const caseId of DOT) {
    for (let seed = 0; seed < 80; seed += 1) {
      const g = gen(seed, caseId);
      const { u, v } = g.parameters;
      const products = u.map((x, i2) => x * v[i2]);
      const legal = new Set([
        g.expected.value - 2 * products[0], g.expected.value - 2 * products[1],
        g.expected.value - 2 * products[2], g.expected.value - products[2],
        u[0] * v[1] + u[1] * v[2] + u[2] * v[0], -g.expected.value,
      ]);
      for (const rule of g.feedbackRules) {
        const match = /^value === (-?\d+)$/.exec(rule.if);
        assert.ok(match, `${caseId}:${seed}: Regelform ${rule.if}`);
        const wrong = Number(match[1]);
        assert.notEqual(wrong, g.expected.value, `${caseId}:${seed}: Regel trifft Erwartungswert`);
        assert.ok(legal.has(wrong), `${caseId}:${seed}: Fehlwert ${wrong} nicht aus dem Draw berechenbar`);
      }
    }
  }
});

test('emitted material: hints and typicalErrors ride along; prompt does not leak "= value"', () => {
  for (const caseId of GEN_CASES) {
    for (let seed = 0; seed < 40; seed += 1) {
      const g = gen(seed, caseId);
      assert.ok(Array.isArray(g.hints) && g.hints.length >= 2, `${caseId}:${seed}: hints`);
      assert.ok(Array.isArray(g.typicalErrors) && g.typicalErrors.length >= 2, `${caseId}:${seed}: typicalErrors`);
      assert.ok(!g.prompt.includes(`= ${g.expected.value}`), `${caseId}:${seed}: Schlüssel im Prompt`);
      assert.equal(g.activityType, 'numeric');
      assert.equal(g.graderId, 'deterministic');
    }
  }
});

test('contract + dispatch: caseTypes keep authored propertyTest:false; authored cases removed from static list', () => {
  for (const caseId of GEN_CASES) {
    const spec = SCALAR_PRODUCT_CONTRACT.caseTypes.find((entry) => entry.caseId === caseId);
    assert.equal(spec.propertyTest, false, `${caseId}: authored Kuratierung bleibt placement-only`);
    // Jede Profilanfrage wird bedient (Placements und Lesson-Links mischen Profile).
    for (const difficulty of ['intro', 'core', 'stretch', 'challenge']) {
      const g = gen(4, caseId, difficulty);
      assert.equal(g.parameters.difficulty, difficulty, `${caseId}:${difficulty}`);
    }
  }
  assert.throws(() => gen(0, 'nope'), /Unbekannter Fall|nicht gefunden|fehlt/i);
  assert.throws(() => gen(0.5, GEN_CASES[0]), /ganze Zahl/);
});

test('registry end-to-end: instantiate serves emitted feedback, grader marks correct and wrong', async () => {
  for (const caseId of GEN_CASES) {
    const instance = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 5, PROFILE[caseId], caseId);
    assert.equal(instance.masteryEligible, true, `${caseId}: Mastery wie authored`);
    assert.ok((instance.feedbackRules || []).every((rule) => /^value === -?\d+$/.test(rule.if)), `${caseId}: emittierte Regeln`);
    const right = await EXERCISE_FAMILIES.grade(instance, String(instance.expectedAnswer.value));
    assert.equal(right.correct, true, `${caseId}: richtige Antwort`);
    const wrong = await EXERCISE_FAMILIES.grade(instance, String(instance.expectedAnswer.value + 1));
    assert.equal(wrong.correct, false, `${caseId}: falsche Antwort`);
  }
});
