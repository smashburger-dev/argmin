// Procedural case shard of optimize-mse-gradient-closed-form: capsule gates
// for grad-mse-numpy-reference (python-code/pyodide, core-pinnt). The authored
// base body stays the oracle — starter/tests/referenceSolver reach generated
// instances byte-identically, only a `# seeded extra cases` block is appended.
// Run: node --test tests/procedural_grad_mse_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './helpers/register_static_cases.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import {
  generateMseGradientClosedFormFamily as generate,
  solveMseGradientClosedForm as solve,
} from '../assets/js/core/data_ml_families.mjs';
import { gradMseParamsOk } from '../assets/js/core/data_ml_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-mse-gradient-closed-form.json'), 'utf8'));
const body = doc.cases.find((entry) => entry.caseId === 'grad-mse-numpy-reference');
const gen = (seed) => generate({ seed, caseId: 'grad-mse-numpy-reference', difficulty: 'core' });
const SEEDED = '# seeded extra cases';

// Independent JS mirror of the closed-form gradient (oracle side condition,
// used to pick discriminating seeds for the mutant runs).
const grads = ({ x, y, w, b }) => {
  const r = x.map((xi, i) => w * xi + b - y[i]);
  const n = x.length;
  return [
    (2 / n) * x.reduce((sum, xi, i) => sum + xi * r[i], 0),
    (2 / n) * r.reduce((sum, v) => sum + v, 0),
  ];
};

const PY3 = (() => {
  try {
    execFileSync('python3', ['-c', 'import sys; assert sys.version_info >= (3, 9)'], { stdio: 'pipe' });
    return 'python3';
  } catch { return null; }
})();

test('anchor: contract null, variants removed, authored body preserved', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  assert.equal(body.caseId, 'grad-mse-numpy-reference');
  assert.equal(body.variants, undefined, 'variants entfernt');
  assert.equal(body.difficultyProfile, 'core');
  assert.equal(body.activityType, 'python-code');
  assert.equal(body.graderId, 'pyodide');
  assert.equal(body.masteryEligible, true);
  assert.deepEqual(body.competencyIds, ['c-grad-regression', 'c-numpy-basics']);
  assert.equal(body.expected.kind, 'reference-solver');
  assert.ok(body.expected.referenceSolver.includes('def grad_mse(w, b, x, y):'));
  assert.ok(body.expected.referenceSolver.includes('def num_grad(f, x, h):'));
  assert.ok(body.parameters.starterCode.includes('def grad_mse'));
  // authored base checks incl. the stronger 0/0 edge stay byte-anchored
  assert.ok(body.parameters.tests.includes("__check('bei 0/0 groesser', abs(dw2) > abs(dw))"));
  assert.equal(body.hints.length, 2);
  assert.equal(body.typicalErrors.length, 3);
});

test('generated block: authored prefix + seeded oracle, fixture baked in', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const g = gen(seed);
    const p = g.parameters;
    assert.ok(p.tests.startsWith(body.parameters.tests), `${seed}: base tests verbatim prefix`);
    assert.ok(p.tests.includes(SEEDED), `${seed}: seeded marker`);
    assert.ok(p.tests.includes('def __ref_grad_mse('), `${seed}: oracle grad_mse copy`);
    assert.ok(p.tests.includes('def __ref_num_grad('), `${seed}: oracle num_grad copy`);
    for (const name of ['seeded dw', 'seeded db', 'seeded numgrad w', 'seeded numgrad b', 'seeded numgrad quadrat', 'seeded bei 0/0']) {
      assert.ok(p.tests.includes(`'${name}'`), `${seed}: check ${name}`);
    }
    assert.equal(p.starterCode, body.parameters.starterCode, `${seed}: starter pinned`);
    assert.deepEqual(p.packages, ['numpy'], `${seed}: packages`);
    assert.deepEqual(g.expected, { kind: 'reference-solver', referenceSolver: body.expected.referenceSolver }, `${seed}: expected`);
    const f = p.seedFixture;
    assert.ok(g.prompt.startsWith(body.prompt), `${seed}: prompt prefix`);
    assert.ok(g.prompt.includes(`x = [${f.x.join(', ')}]`), `${seed}: x echoed`);
    assert.ok(g.prompt.includes(`y = [${f.y.join(', ')}]`), `${seed}: y echoed`);
    assert.ok(g.prompt.includes(`w = ${f.w}`) && g.prompt.includes(`b = ${f.b}`) && g.prompt.includes(`t = ${f.t}`), `${seed}: w/b/t echoed`);
    assert.ok(p.tests.includes(`x = np.array([${f.x.join(', ')}])`), `${seed}: x literal baked in`);
    assert.ok(p.tests.includes(`w, b = ${f.w}, ${f.b}`), `${seed}: w/b literal baked in`);
    assert.equal(g.activityType, 'python-code');
    assert.equal(g.graderId, 'pyodide');
  }
});

test('draw space: >=40 distinct, no degenerate fixtures', () => {
  const seen = new Set();
  const lengths = new Set();
  const wSigns = new Set();
  const bSigns = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const f = gen(seed).parameters.seedFixture;
    seen.add(JSON.stringify(f));
    lengths.add(f.x.length);
    wSigns.add(Math.sign(f.w));
    bSigns.add(Math.sign(f.b));
    assert.equal(f.y.length, f.x.length, `${seed}: x/y Länge`);
    assert.ok(f.y.some((v) => v !== 0), `${seed}: y nicht alle 0`);
    assert.ok(
      f.x.some((xi, i) => Math.abs(f.w * xi + f.b - f.y[i]) > 1e-9),
      `${seed}: Null-Residuen-Draw abgelehnt`,
    );
    assert.notEqual(f.t, 0, `${seed}: Quadrat-Stichprobe nicht degeneriert`);
  }
  assert.ok(seen.size >= 40, `nur ${seen.size} distinct fixtures`);
  assert.ok(lengths.size >= 2, 'x-Länge variiert');
  assert.ok(wSigns.size >= 2 && bSigns.size >= 2, 'Vorzeichen variieren');
});

test('solve: authored referenceCode, Kapsel-Check fail-closed', () => {
  for (const seed of [0, 1, 2, 3, 7, 42, -11]) {
    const g = gen(seed);
    assert.deepEqual(solve(g.parameters), { referenceCode: body.expected.referenceSolver }, `${seed}: solver`);
    assert.ok(gradMseParamsOk(g.parameters), `${seed}: paramsOk`);
  }
  const g = gen(5);
  for (const bad of [
    { ...g.parameters, tests: `${g.parameters.tests}\n# tampered` },
    { ...g.parameters, tests: g.parameters.tests.replace('1e-9', '1e-3') },
    { ...g.parameters, seedFixture: { ...g.parameters.seedFixture, w: -99 } },
    { ...g.parameters, seedFixture: { ...g.parameters.seedFixture, x: [0, 0, 0] } },
    { ...g.parameters, seedFixture: { ...g.parameters.seedFixture, t: 0 } },
    { ...g.parameters, seedFixture: undefined },
    { ...g.parameters, starterCode: 'pass' },
  ]) {
    assert.throws(() => solve(bad), /Unbekannter Fall/, 'tampered parameters müssen scheitern');
  }
  // numerischer Bestandsfall bleibt unverändert lösbar
  const num = generate({ seed: 0, caseId: 'mse-gradient-wrt-w', difficulty: 'core' });
  assert.equal(typeof solve(num.parameters).value, 'number');
});

test('profiles fail closed, seed guard, determinism incl. negatives', () => {
  assert.deepEqual(gen(7), gen(7), 'gleiche Seeds identisch');
  assert.deepEqual(gen(-42), gen(-42), 'negative Seeds deterministisch');
  assert.notDeepEqual(gen(-42).parameters.tests, gen(42).parameters.tests, 'negativ != positiv gezogen');
  for (const badSeed of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '7']) {
    assert.throws(() => gen(badSeed), /Seed/, `Seed ${badSeed}`);
  }
  for (const difficulty of ['intro', 'stretch', 'challenge']) {
    assert.throws(
      () => generate({ seed: 0, caseId: 'grad-mse-numpy-reference', difficulty }),
      /Unbekanntes Profil/, `Profil ${difficulty}`,
    );
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate('optimize-mse-gradient-closed-form', 0, difficulty, 'grad-mse-numpy-reference'),
      /Unbekanntes Profil/, `Registry ${difficulty}`,
    );
  }
  assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: 'core' }), /unbekannter Fall/);
});

test('registry: python-code metadata, expectedAnswer, authored fallback', () => {
  const inst = EXERCISE_FAMILIES.instantiate('optimize-mse-gradient-closed-form', 11, 'core', 'grad-mse-numpy-reference');
  assert.equal(inst.activityType, 'python-code');
  assert.equal(inst.graderId, 'pyodide');
  assert.equal(inst.masteryEligible, true);
  assert.deepEqual(inst.competencyIds, ['c-grad-regression', 'c-numpy-basics']);
  assert.deepEqual(inst.expectedAnswer, { kind: 'reference-solver', referenceSolver: body.expected.referenceSolver });
  assert.deepEqual(inst.hints, body.hints, 'authored hints erreichen die Instanz');
  assert.deepEqual(inst.typicalErrors, body.typicalErrors);
  assert.equal(inst.parameters.caseId, 'grad-mse-numpy-reference');
  assert.equal(inst.parameters.difficulty, 'core');
  assert.deepEqual(inst.parameters.packages, ['numpy']);
});

// Minimaler Listen-np-Shim: nur die vom Referenzsolver und den emittierten
// Checks benutzte Teilmenge (array/asarray/sum/mean, elementweise +-*/**, .size).
// Semantik deckt sich mit NumPy fuer diese Ausdruecke — dient der Ausführung-
// prüfung ohne installiertes NumPy; der Syntax-Check unten läuft ohnehin.
const NUMPY_SHIM = String.raw`
import json, sys, types, builtins

class ndarray(list):
    @property
    def size(self):
        return len(self)
    def _ewise(self, other, op):
        if isinstance(other, list):
            return ndarray([op(a, b) for a, b in zip(self, other)])
        return ndarray([op(a, other) for a in self])
    def __add__(s, o): return s._ewise(o, lambda a, b: a + b)
    def __radd__(s, o): return s._ewise(o, lambda a, b: b + a)
    def __sub__(s, o): return s._ewise(o, lambda a, b: a - b)
    def __rsub__(s, o): return s._ewise(o, lambda a, b: b - a)
    def __mul__(s, o): return s._ewise(o, lambda a, b: a * b)
    def __rmul__(s, o): return s._ewise(o, lambda a, b: b * a)
    def __pow__(s, o): return s._ewise(o, lambda a, b: a ** b)
    def __neg__(s): return ndarray([-a for a in s])

def _asarray(x, dtype=None):
    return ndarray([dtype(v) for v in x]) if dtype else ndarray(list(x))

sys.modules['numpy'] = types.SimpleNamespace(
    array=lambda seq: ndarray([float(v) for v in seq]),
    asarray=_asarray,
    sum=lambda a: builtins.sum(a),
    mean=lambda a: builtins.sum(a) / len(a),
)

bundle = json.load(sys.stdin)
for item in bundle:
    checks = []
    def __check(name, cond, detail=''):
        checks.append((name, bool(cond)))
    ns = {'__check': __check}
    err = None
    try:
        exec(item['learner'], ns)
        exec(item['tests'], ns)
    except Exception as exc:
        err = '%s: %s' % (type(exc).__name__, exc)
    print(json.dumps({'name': item['name'], 'failed': [c[0] for c in checks if not c[1]], 'error': err}))
`;

test('python: Referenz besteht alle Checks, Mutanten scheitern zuverlässig', (t) => {
  if (!PY3) return t.skip('python3 nicht verfügbar');
  const ref = body.expected.referenceSolver;
  // Mutanten: Faktor 2 fehlt (dw/db halbiert) und num_grad ohne 2h-Nenner.
  const mutantHalf = ref.split('2.0 / n').join('1.0 / n');
  const mutantNg = ref.replace('(f(x + h) - f(x - h)) / (2.0 * h)', '(f(x + h) - f(x - h)) / h');
  assert.notEqual(mutantHalf, ref, 'half-Mutant gebaut');
  assert.notEqual(mutantNg, ref, 'num_grad-Mutant gebaut');
  const bundles = [];
  const strongSeeds = [];
  for (let seed = 0; seed < 80; seed += 1) {
    const g = gen(seed);
    if (seed < 10) bundles.push({ name: `ref-${seed}`, learner: ref, tests: g.parameters.tests });
    const [dw, db] = grads(g.parameters.seedFixture);
    if (Math.abs(dw) > 1e-9 && Math.abs(db) > 1e-9 && strongSeeds.length < 6) strongSeeds.push(seed);
  }
  assert.ok(strongSeeds.length >= 6, 'genug diskriminierende Seeds');
  for (const seed of strongSeeds) {
    const g = gen(seed);
    bundles.push({ name: `half-${seed}`, learner: mutantHalf, tests: g.parameters.tests });
    bundles.push({ name: `ng-${seed}`, learner: mutantNg, tests: g.parameters.tests });
  }
  const out = execFileSync(PY3, ['-c', NUMPY_SHIM], { input: JSON.stringify(bundles), encoding: 'utf8' })
    .trim().split('\n').map((line) => JSON.parse(line));
  for (const row of out) {
    assert.equal(row.error, null, `${row.name}: Laufzeitfehler`);
    if (row.name.startsWith('ref-')) {
      assert.deepEqual(row.failed, [], `${row.name}: Referenz muss alle Checks bestehen`);
    } else if (row.name.startsWith('half-')) {
      assert.ok(row.failed.includes('seeded dw') && row.failed.includes('seeded db'), `${row.name}: half-Mutant unerkannt`);
    } else {
      assert.ok(row.failed.includes('seeded numgrad quadrat'), `${row.name}: num_grad-Mutant unerkannt`);
    }
  }
});

test('python: emittierte Testblöcke kompilieren unter echtem Interpreter', (t) => {
  if (!PY3) return t.skip('python3 nicht verfügbar');
  const compile = 'import sys\ncompile(sys.stdin.read(), "<tests>", "exec")\n';
  for (let seed = 0; seed < 20; seed += 1) {
    const g = gen(seed);
    execFileSync(PY3, ['-c', compile], { input: g.parameters.tests, stdio: 'pipe' });
    execFileSync(PY3, ['-c', compile], { input: g.parameters.starterCode, stdio: 'pipe' });
  }
});
