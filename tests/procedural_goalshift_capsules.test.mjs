// Procedural case shard of validate-goalshift-flag-rules: capsule gates for
// detect-goal-shift (python-code/pyodide, challenge-pinnt). The authored base
// body stays the oracle — starter/tests/referenceSolver reach generated
// instances byte-identically, only a `# seeded extra cases` block with five
// drawn protocol pairs (all five edge arms per instance) is appended.
// Run: node --test tests/procedural_goalshift_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './helpers/register_static_cases.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import {
  generateValidateGoalshiftFlagRulesFamily as generate,
  solveValidateGoalshiftFlagRules as solve,
} from '../assets/js/core/data_ml_families.mjs';
import { GOALSHIFT_ARMS, goalShiftFlags, goalShiftParamsOk } from '../assets/js/core/data_ml_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/validate-goalshift-flag-rules.json'), 'utf8'));
const body = doc.cases.find((entry) => entry.caseId === 'detect-goal-shift');
const gen = (seed) => generate({ seed, caseId: 'detect-goal-shift', difficulty: 'challenge' });
const SEEDED = '# seeded extra cases';
const FLAG_NAMES = ['metrik_geaendert', 'primaer_demoted', 'schwelle_geaendert', 'subgruppe_nach_freeze'];
const SHAPE_FLAGS = {
  0: ['metrik_geaendert'],
  1: ['metrik_geaendert', 'schwelle_geaendert'],
  2: ['primaer_demoted'],
  3: ['subgruppe_nach_freeze'],
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
  assert.equal(body.caseId, 'detect-goal-shift');
  assert.equal(body.variants, undefined, 'variants entfernt');
  assert.equal(body.difficultyProfile, 'challenge');
  assert.equal(body.activityType, 'python-code');
  assert.equal(body.graderId, 'pyodide');
  assert.equal(body.masteryEligible, true);
  assert.deepEqual(body.competencyIds, ['c-research-question', 'c-python-functions']);
  assert.equal(body.expected.kind, 'reference-solver');
  const solver = body.expected.referenceSolver;
  assert.ok(solver.includes('def detect_goal_shift(v1, v2):'));
  for (const flag of FLAG_NAMES) assert.ok(solver.includes(`"${flag}"`), `Flag ${flag}`);
  assert.ok(solver.includes('return sorted(flags)'), 'sortierte Ausgabe authored');
  assert.ok(body.parameters.starterCode.includes('def detect_goal_shift'));
  // authored Edge-Checks bleiben byte-verankert
  assert.ok(body.parameters.tests.includes("'entfernte subgruppe ist kein flag'"));
  assert.ok(body.parameters.tests.includes("'fehlende felder gelten als leer'"));
  assert.equal(body.hints.length, 2);
  assert.equal(body.typicalErrors.length, 3);
});

test('generated block: authored prefix + seeded oracle + 5 Paare', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const g = gen(seed);
    const p = g.parameters;
    assert.ok(p.tests.startsWith(body.parameters.tests), `${seed}: base tests verbatim prefix`);
    assert.ok(p.tests.includes(SEEDED), `${seed}: seeded marker`);
    assert.ok(p.tests.includes('def __ref_detect_goal_shift('), `${seed}: oracle copy`);
    for (let i = 1; i <= 5; i += 1) {
      assert.ok(p.tests.includes(`'seeded flags ${i}'`), `${seed}: flags check ${i}`);
      assert.ok(p.tests.includes(`'seeded copy ${i}'`), `${seed}: copy check ${i}`);
    }
    assert.ok(p.tests.includes('dict({'), `${seed}: identische-Kopie-Checks via dict()`);
    assert.equal(p.starterCode, body.parameters.starterCode, `${seed}: starter pinned`);
    assert.deepEqual(p.packages, [], `${seed}: packages`);
    assert.deepEqual(g.expected, { kind: 'reference-solver', referenceSolver: body.expected.referenceSolver }, `${seed}: expected`);
    assert.equal(g.activityType, 'python-code');
    assert.equal(g.graderId, 'pyodide');
    // Prompt spiegelt die gezogene Zusammensetzung (5 Paare + Arm-Notizen).
    assert.ok(g.prompt.includes('5 Protokollpaarungen'), `${seed}: Paarzahl im Prompt`);
    assert.ok(g.prompt.includes('Protokollpaare:'), `${seed}: Fixture-Notiz`);
    assert.ok(!g.prompt.includes('drei Protokollpaarungen'), `${seed}: authored Dreier-Text ersetzt`);
  }
});

test('draw arms: jede Instanz deckt alle fünf Edge-Arme ab', () => {
  const seen = new Set();
  const shapes = new Set();
  const multiFlags = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const pairs = gen(seed).parameters.seedPairs;
    seen.add(JSON.stringify(pairs));
    assert.equal(pairs.length, GOALSHIFT_ARMS.length, `${seed}: Paarzahl`);
    const arms = pairs.map((pair) => pair.arm);
    assert.deepEqual([...arms].sort(), [...GOALSHIFT_ARMS].sort(), `${seed}: alle Arme`);
    for (const pair of pairs) {
      const flags = goalShiftFlags(pair.v1, pair.v2);
      if (pair.arm === 'identisch') {
        assert.deepEqual(pair.v1, pair.v2, `${seed}: Kopie`);
        assert.deepEqual(flags, [], `${seed}: identisch ohne Flags`);
      } else if (pair.arm === 'subgruppe-entfernt') {
        assert.equal(pair.v2.subgruppen.length, pair.v1.subgruppen.length - 1, `${seed}: eine entfernt`);
        assert.ok(pair.v2.subgruppen.every((s) => pair.v1.subgruppen.includes(s)), `${seed}: Teilmenge`);
        assert.equal(pair.v2.metrik, pair.v1.metrik);
        assert.equal(pair.v2.schwelle, pair.v1.schwelle);
        assert.equal(pair.v2.primaer, pair.v1.primaer);
        assert.deepEqual(pair.v2.sekundaer, pair.v1.sekundaer);
        assert.deepEqual(flags, [], `${seed}: Entfernen ohne Flag`);
      } else if (pair.arm === 'primaer-demoted') {
        assert.equal(pair.v2.primaer, pair.v1.primaer, `${seed}: primaer unverändert`);
        assert.ok(pair.v2.sekundaer.includes(pair.v1.primaer), `${seed}: alt in sekundaer`);
        assert.ok(!pair.v1.sekundaer.includes(pair.v1.primaer), `${seed}: vorher nicht sekundaer`);
        assert.deepEqual(flags, ['primaer_demoted'], `${seed}: exakt ein Flag`);
      } else if (pair.arm === 'fehlende-felder') {
        shapes.add(pair.shape);
        assert.ok(
          Object.keys(pair.v1).length < 5 || Object.keys(pair.v2).length < 5,
          `${seed}: mindestens ein Feld fehlt`,
        );
        assert.deepEqual(flags, SHAPE_FLAGS[pair.shape], `${seed}: Shape ${pair.shape} Flags`);
      } else if (pair.arm === 'multi-flag') {
        assert.ok(flags.length >= 1 && flags.length <= 4, `${seed}: Flag-Anzahl`);
        for (const flag of flags) multiFlags.add(flag);
      }
      // primaer gehört in vollständigen Versionen nie zu eigenen sekundaer
      if (pair.v1.primaer !== undefined && Array.isArray(pair.v1.sekundaer)) {
        assert.ok(!pair.v1.sekundaer.includes(pair.v1.primaer), `${seed}: v1 sauber`);
      }
    }
  }
  assert.ok(seen.size >= 40, `nur ${seen.size} distinct draws`);
  assert.deepEqual([...shapes].sort(), [0, 1, 2, 3], 'alle fehlende-felder-Shapes über Seeds');
  assert.deepEqual([...multiFlags].sort(), FLAG_NAMES, 'alle vier Flags über multi-flag-Draws');
});

test('solve: authored referenceCode, Kapsel-Check fail-closed', () => {
  for (const seed of [0, 1, 2, 3, 7, 42, -11]) {
    const g = gen(seed);
    assert.deepEqual(solve(g.parameters), { referenceCode: body.expected.referenceSolver }, `${seed}: solver`);
    assert.ok(goalShiftParamsOk(g.parameters), `${seed}: paramsOk`);
  }
  const g = gen(5);
  const reordered = [...g.parameters.seedPairs.slice(1), g.parameters.seedPairs[0]];
  for (const bad of [
    { ...g.parameters, tests: `${g.parameters.tests}\n# tampered` },
    { ...g.parameters, seedPairs: g.parameters.seedPairs.slice(1) },
    { ...g.parameters, seedPairs: reordered },
    { ...g.parameters, seedPairs: g.parameters.seedPairs.map((p, i) => (i === 0 ? { ...p, arm: 'multi-flag' } : p)) },
    { ...g.parameters, seedPairs: g.parameters.seedPairs.map((p, i) => (i === 0 ? { ...p, v1: { ...p.v1, metrik: 'bogus' } } : p)) },
    { ...g.parameters, seedPairs: g.parameters.seedPairs.map((p, i) => (i === 0 ? { ...p, v1: { ...p.v1, fremd: 1 } } : p)) },
    { ...g.parameters, starterCode: 'x = 1' },
  ]) {
    assert.throws(() => solve(bad), /Unbekannter Fall/, 'tampered parameters müssen scheitern');
  }
  // numerischer Bestandsfall bleibt unverändert lösbar
  const num = generate({ seed: 0, caseId: 'protocol-shift-flag-count', difficulty: 'core' });
  assert.equal(typeof solve(num.parameters).value, 'number');
});

test('profiles fail closed, seed guard, determinism incl. negatives', () => {
  assert.deepEqual(gen(7), gen(7), 'gleiche Seeds identisch');
  assert.deepEqual(gen(-42), gen(-42), 'negative Seeds deterministisch');
  assert.notDeepEqual(gen(-42).parameters.tests, gen(42).parameters.tests, 'negativ != positiv gezogen');
  for (const badSeed of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '7']) {
    assert.throws(() => gen(badSeed), /Seed/, `Seed ${badSeed}`);
  }
  for (const difficulty of ['intro', 'core', 'stretch']) {
    assert.throws(
      () => generate({ seed: 0, caseId: 'detect-goal-shift', difficulty }),
      /Unbekanntes Profil/, `Profil ${difficulty}`,
    );
    assert.throws(
      () => EXERCISE_FAMILIES.instantiate('validate-goalshift-flag-rules', 0, difficulty, 'detect-goal-shift'),
      /Unbekanntes Profil/, `Registry ${difficulty}`,
    );
  }
  assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /unbekannter Fall/);
});

test('registry: python-code metadata, expectedAnswer, authored fallback', () => {
  const inst = EXERCISE_FAMILIES.instantiate('validate-goalshift-flag-rules', 11, 'challenge', 'detect-goal-shift');
  assert.equal(inst.activityType, 'python-code');
  assert.equal(inst.graderId, 'pyodide');
  assert.equal(inst.masteryEligible, true);
  assert.deepEqual(inst.competencyIds, ['c-research-question', 'c-python-functions']);
  assert.deepEqual(inst.expectedAnswer, { kind: 'reference-solver', referenceSolver: body.expected.referenceSolver });
  assert.deepEqual(inst.hints, body.hints, 'authored hints erreichen die Instanz');
  assert.deepEqual(inst.typicalErrors, body.typicalErrors);
  assert.equal(inst.parameters.caseId, 'detect-goal-shift');
  assert.equal(inst.parameters.difficulty, 'challenge');
  assert.deepEqual(inst.parameters.packages, []);
});

// Kein Shim nötig: detect_goal_shift ist reines Python — Referenz und
// Mutanten laufen unter dem echten Interpreter.
const HARNESS = String.raw`
import json, sys
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
  // Mutanten: falsche Demotions-Richtung und Subgruppen-Entfernung als Flag.
  const mutantDemoted = ref.replace(
    'v1.get("primaer") in (v2.get("sekundaer") or [])',
    'v2.get("primaer") in (v1.get("sekundaer") or [])',
  );
  const mutantRemoved = ref.replace(
    'any(s not in (v1.get("subgruppen") or []) for s in (v2.get("subgruppen") or []))',
    'any(s not in (v2.get("subgruppen") or []) for s in (v1.get("subgruppen") or []))',
  );
  assert.notEqual(mutantDemoted, ref, 'Demoted-Mutant gebaut');
  assert.notEqual(mutantRemoved, ref, 'Removed-Mutant gebaut');
  const bundles = [];
  for (let seed = 0; seed < 10; seed += 1) {
    const g = gen(seed);
    bundles.push({ name: `ref-${seed}`, learner: ref, tests: g.parameters.tests });
    bundles.push({ name: `demoted-${seed}`, learner: mutantDemoted, tests: g.parameters.tests });
    bundles.push({ name: `removed-${seed}`, learner: mutantRemoved, tests: g.parameters.tests });
  }
  // Der authored Block endet mit print("ok w31-e6") — nur JSON-Zeilen werten.
  const out = execFileSync(PY3, ['-c', HARNESS], { input: JSON.stringify(bundles), encoding: 'utf8' })
    .trim().split('\n').filter((line) => line.startsWith('{')).map((line) => JSON.parse(line));
  for (const row of out) {
    assert.equal(row.error, null, `${row.name}: Laufzeitfehler`);
    if (row.name.startsWith('ref-')) {
      assert.deepEqual(row.failed, [], `${row.name}: Referenz muss alle Checks bestehen`);
    } else {
      assert.ok(row.failed.length > 0, `${row.name}: Mutant unerkannt`);
      assert.ok(
        row.failed.some((name) => name.startsWith('seeded flags')),
        `${row.name}: seeded-Arm-Checks schlagen an`,
      );
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
