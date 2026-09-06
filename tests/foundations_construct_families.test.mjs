// S4D1 Konstrukt-Familien: Vertrags-, Fail-closed-, Distinctness-, Solver-,
// Property- und Taxonomie-Tests für die zehn Foundations-Konstruktions- und
// Prüf-Familien. Spiegelstruktur zu tests/exercise_family.test.mjs (S4C).
// Unabhängigkeit: Numerik/Parsons werden über den echten Grader geprüft,
// Code- und Termfamilien über python3 + SymPy (Referenz muss bestehen,
// dokumentierte Mutanten müssen scheitern); JS-Orakel im Test sind aus den
// Aufgabentexten abgeschrieben, nicht aus dem Produkt importiert.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import {
  CONSTRUCT_PROFILES,
  FAMILY_NOTES,
  LINEAR_ISOLATE_CONTRACT,
  solveLinearIsolate,
  generateLinearIsolateFamily,
  POWER_LOG_CONTRACT,
  solvePowerLogExponent,
  generatePowerLogFamily,
  EXPRESSION_CANONICAL_CONTRACT,
  SYMPY_EQUIVALENCE_RULE,
  canonicalLinear,
  solveExpressionCanonical,
  generateExpressionCanonicalFamily,
  VALIDATE_COUNT_CONTRACT,
  ZAEHLE_REFERENZ,
  ZAEHLE_TESTS,
  ZAEHLE_MUTANT_PLUS,
  ZAEHLE_MUTANT_TWO_COLON,
  INSPECT_REFERENZ,
  INSPECT_TESTS,
  INSPECT_STARTER,
  solveValidateCount,
  generateValidateCountFamily,
  REGRESSION_SUITE_CONTRACT,
  PALINDROM_REFERENZ,
  PALINDROM_SUITE_REFERENZ,
  PALINDROM_TESTS,
  PALINDROM_TESTS_EXTENDED,
  PALINDROM_MUTANT_NAIVE,
  solveRegressionSuite,
  generateRegressionSuiteFamily,
  TEST_STRUCTURE_CONTRACT,
  solveTestStructure,
  generateTestStructureFamily,
  GUARDED_LOOP_CONTRACT,
  solveGuardedLoop,
  generateGuardedLoopFamily,
  REQUIRED_FIELD_CONTRACT,
  solveRequiredField,
  generateRequiredFieldFamily,
  BUGFIX_WORKFLOW_CONTRACT,
  solveBugfixWorkflow,
  generateBugfixWorkflowFamily,
  TEST_DESIGN_COVERAGE_CONTRACT,
  COVERAGE_LEAF_TIERS,
  solveTestDesignCoverage,
  generateTestDesignCoverageFamily,
} from '../assets/js/core/foundations_construct_families.mjs';
import {
  GIT_OPERATION_CONTRACT,
  generateGitOperationFamily,
  solveGitOperation,
} from '../assets/js/core/foundations_fresh_generators.mjs';
import { countBranchCoverageLeaves } from '../assets/js/core/foundations_fresh_generators.mjs';
import {
  createFamilyRegistry,
  familyIdTokens,
  familyEventInput,
} from '../assets/js/domain/exercise_registry.mjs';
import { FOUNDATIONS_CONSTRUCT_FAMILIES } from '../assets/js/domain/foundations_construct_registry.mjs';
import { validateSourceDocument } from '../tools/compile_content.mjs';
import { SEED_GENERATORS } from '../assets/js/core/seed_generator_registry.mjs';
import './helpers/register_static_cases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = JSON.parse(readFileSync(join(root, 'research/streamlining/s4a-v2/canonical-families.json'), 'utf8'));
const shard = JSON.parse(readFileSync(join(root, 'research/streamlining/s4a-v2/shards/foundations.json'), 'utf8'));

const FAMILIES = [
  { contract: LINEAR_ISOLATE_CONTRACT, generate: generateLinearIsolateFamily, solve: solveLinearIsolate },
  { contract: POWER_LOG_CONTRACT, generate: generatePowerLogFamily, solve: solvePowerLogExponent },
  { contract: EXPRESSION_CANONICAL_CONTRACT, generate: generateExpressionCanonicalFamily, solve: solveExpressionCanonical },
  { contract: VALIDATE_COUNT_CONTRACT, generate: generateValidateCountFamily, solve: solveValidateCount },
  { contract: REGRESSION_SUITE_CONTRACT, generate: generateRegressionSuiteFamily, solve: solveRegressionSuite },
  { contract: TEST_STRUCTURE_CONTRACT, generate: generateTestStructureFamily, solve: solveTestStructure },
  { contract: GUARDED_LOOP_CONTRACT, generate: generateGuardedLoopFamily, solve: solveGuardedLoop },
  { contract: REQUIRED_FIELD_CONTRACT, generate: generateRequiredFieldFamily, solve: solveRequiredField },
  { contract: BUGFIX_WORKFLOW_CONTRACT, generate: generateBugfixWorkflowFamily, solve: solveBugfixWorkflow },
  { contract: TEST_DESIGN_COVERAGE_CONTRACT, generate: generateTestDesignCoverageFamily, solve: solveTestDesignCoverage },
];

const byId = new Map(FAMILIES.map((f) => [f.contract.familyId, f]));
const instantiate = (familyId, seed, difficulty, caseId) => (
  FOUNDATIONS_CONSTRUCT_FAMILIES.instantiate(familyId, seed, difficulty, caseId)
);
const grade = (instance, answer) => FOUNDATIONS_CONSTRUCT_FAMILIES.grade(instance, answer);
const propertyCases = (family) => family.contract.caseTypes.filter((c) => c.propertyTest !== false);

function solvedOf(family, generated) {
  return family.solve(generated.parameters);
}

function assertSolverMatchesExpected(family, generated) {
  const solved = solvedOf(family, generated);
  const { expected } = generated;
  if (expected.kind === 'integer') assert.equal(solved.value, expected.value);
  else if (expected.kind === 'expression') assert.equal(solved.canonicalExpression, expected.expression);
  else if (expected.kind === 'ordered-lines') assert.deepEqual(solved.solutionOrder, expected.solutionOrder);
  else if (expected.kind === 'reference-solver') assert.ok(solved.referenceCode.includes('def '));
  else assert.fail(`unbekannte expected-Art ${expected.kind}`);
}

test('construct contracts validate against the exercise-family schema', () => {
  for (const family of FAMILIES) {
    validateSourceDocument('exercise-family', family.contract, root);
  }
  assert.throws(
    () => validateSourceDocument('exercise-family', { ...LINEAR_ISOLATE_CONTRACT, generate: true }, root),
    /additional/,
  );
});

test('construct families are canonical S4A families with disjoint token multisets', () => {
  const known = new Set(canonical.families.map((f) => f.familyId));
  const seen = new Set();
  for (const family of FAMILIES) {
    assert.ok(known.has(family.contract.familyId), `${family.contract.familyId} fehlt in canonical-families.json`);
    const tokens = familyIdTokens(family.contract.familyId);
    assert.ok(!seen.has(tokens), `Token-Kollision ${family.contract.familyId}`);
    seen.add(tokens);
  }
  assert.ok(!seen.has(familyIdTokens('classify-git-operation')));
});

test('construct registry composes with the S4C family without collision', () => {
  const registry = createFamilyRegistry([
    { ...GIT_OPERATION_CONTRACT, generate: generateGitOperationFamily, solve: solveGitOperation },
    ...FAMILIES.map((f) => ({ ...f.contract, generate: f.generate, solve: f.solve })),
  ]);
  assert.equal(registry.get('transform-linear-equation-isolate').familyId, 'transform-linear-equation-isolate');
  assert.equal(registry.get('classify-git-operation').familyId, 'classify-git-operation');
});

test('registry rejects duplicates, token aliases and empty case lists', () => {
  const entry = (family) => ({ ...family.contract, generate: family.generate, solve: family.solve });
  assert.throws(() => createFamilyRegistry([entry(byId.get('transform-linear-equation-isolate')), entry(byId.get('transform-linear-equation-isolate'))]), /doppelt/);
  const alias = {
    ...LINEAR_ISOLATE_CONTRACT,
    familyId: 'linear-transform-isolate-equation',
    caseTypes: [{ caseId: 'alpha-case' }, { caseId: 'beta-case' }],
  };
  assert.equal(familyIdTokens(alias.familyId), familyIdTokens('transform-linear-equation-isolate'));
  assert.throws(
    () => createFamilyRegistry([entry(byId.get('transform-linear-equation-isolate')), { ...alias, generate: generateLinearIsolateFamily, solve: solveLinearIsolate }]),
    /Token-Multiset/,
  );
  const empty = { ...POWER_LOG_CONTRACT, caseTypes: [] };
  assert.throws(
    () => createFamilyRegistry([{ ...empty, generate: generatePowerLogFamily, solve: solvePowerLogExponent }]),
    /mindestens ein Falltyp/,
  );
  for (const family of FAMILIES) {
    assert.ok(family.contract.caseTypes.length >= 1, `${family.contract.familyId}: Schema-Minimum`);
  }
});

test('unknown family, case, profile or seed fail closed', () => {
  assert.throws(() => instantiate('transform-no-such-family', 1, 'core', 'x'), /Unbekannte Familie/);
  for (const family of FAMILIES) {
    const { familyId } = family.contract;
    const firstCase = family.contract.caseTypes[0].caseId;
    assert.throws(() => instantiate(familyId, 1, 'core', 'no-such-case'), /Unbekannter Fall/);
    assert.throws(() => instantiate(familyId, 1, 'expert', firstCase), /Unbekanntes Profil/);
    assert.throws(() => instantiate(familyId, 1.5, 'core', firstCase), /Seed/);
    assert.throws(() => family.generate({ seed: 1, caseId: 'no-such-case', difficulty: 'core' }), /Unbekannter Fall/);
  }
  assert.throws(() => solveValidateCount({ task: 'nope' }), /Unbekannte Aufgabe/);
  assert.throws(() => solveTestStructure({ parsonsCase: 'nope' }), /Unbekannter Fall/);
  assert.throws(() => solveGuardedLoop({ parsonsCase: 'nope' }), /Unbekannter Fall/);
  assert.throws(() => solveRequiredField({ parsonsCase: 'nope' }), /Unbekannter Fall/);
  assert.throws(() => solveBugfixWorkflow({ parsonsCase: 'nope' }), /Unbekannter Fall/);
});

test('case, seed and profile instantiate distinct deterministic variants', () => {
  for (const family of FAMILIES) {
    const { familyId } = family.contract;
    const allCases = family.contract.caseTypes;
    assert.ok(allCases.length >= 1, `${familyId}: mindestens ein Falltyp`);
    const propCases = propertyCases(family);
    assert.ok(propCases.length >= 1, `${familyId}: mindestens ein property-testfähiger Fall`);
    const otherSeed = instantiate(familyId, 8, 'core', propCases[0].caseId);
    const baseSeed = instantiate(familyId, 7, 'core', propCases[0].caseId);
    assert.notDeepEqual(baseSeed.parameters, otherSeed.parameters, `${familyId}: Seeds unterscheiden sich`);
    assert.deepEqual(baseSeed, instantiate(familyId, 7, 'core', propCases[0].caseId), `${familyId}: deterministisch`);
    assert.equal(baseSeed.instanceId, `${familyId}:${propCases[0].caseId}:core:7`);
    assert.equal(baseSeed.masteryEligible, true);
    assert.equal(baseSeed.familyId, familyId);
    for (const profile of CONSTRUCT_PROFILES) {
      const inst = instantiate(familyId, 7, profile, propCases[0].caseId);
      assert.equal(inst.difficulty, profile);
    }
  }
});

test('solver agrees with expected across samples', () => {
  for (const family of FAMILIES) {
    for (const caseType of propertyCases(family)) {
      for (const difficulty of CONSTRUCT_PROFILES) {
        for (const seed of [0, 1, 7, 63]) {
          const generated = family.generate({ seed, caseId: caseType.caseId, difficulty });
          assertSolverMatchesExpected(family, generated);
        }
      }
    }
  }
});

test('node graders: correct answers pass, mutants fail', async () => {
  const numericFamilies = [
    'transform-linear-equation-isolate',
    'transform-power-log-exponent',
    'validate-test-design-coverage',
  ];
  for (const familyId of numericFamilies) {
    const family = byId.get(familyId);
    for (const caseType of propertyCases(family)) {
      const instance = instantiate(familyId, 21, 'core', caseType.caseId);
      const right = await grade(instance, String(instance.expectedAnswer.value));
      assert.equal(right.correct, true, `${familyId}:${caseType.caseId} Sollantwort`);
      const wrong = await grade(instance, String(instance.expectedAnswer.value + 1));
      assert.equal(wrong.correct, false, `${familyId}:${caseType.caseId} Gegenbeispiel`);
      assert.equal(wrong.errorType, 'wrong-value');
      const invalid = await grade(instance, 'keine zahl');
      assert.equal(invalid.correct, false);
      assert.equal(invalid.errorType, 'invalid-input');
      assert.equal((await graders.deterministic.grade(instance, String(instance.expectedAnswer.value))).correct, true);
    }
  }
  const parsonsFamilies = [
    'construct-test-structure-aaa',
    'construct-guarded-loop',
    'validate-required-field-raise',
    'construct-safe-bugfix-workflow',
  ];
  for (const familyId of parsonsFamilies) {
    const family = byId.get(familyId);
    for (const caseType of propertyCases(family)) {
      const instance = instantiate(familyId, 21, 'core', caseType.caseId);
      const solution = instance.expectedAnswer.solutionOrder;
      const right = await grade(instance, solution);
      assert.equal(right.correct, true, `${familyId}:${caseType.caseId} Sollreihenfolge`);
      const withDistractor = await grade(instance, [...solution, ...instance.expectedAnswer.distractors]);
      assert.equal(withDistractor.correct, false, `${familyId}:${caseType.caseId} Distraktor-Gegenbeispiel`);
      const swapped = await grade(instance, [...solution].reverse());
      assert.equal(swapped.correct, false, `${familyId}:${caseType.caseId} Reihenfolge-Gegenbeispiel`);
    }
  }
});

test('property tests cover every authoritative case and profile over 32 seeds', async () => {
  for (const family of FAMILIES) {
    const nodeGraded = family.contract.graderId === 'deterministic';
    for (const caseType of propertyCases(family)) {
      for (const difficulty of CONSTRUCT_PROFILES) {
        for (let seed = 0; seed < 32; seed += 1) {
          const instance = instantiate(family.contract.familyId, seed, difficulty, caseType.caseId);
          assert.deepEqual(instance, instantiate(family.contract.familyId, seed, difficulty, caseType.caseId));
          assert.equal(instance.caseId, caseType.caseId);
          assert.equal(instance.difficulty, difficulty);
          const generated = family.generate({ seed, caseId: caseType.caseId, difficulty });
          assertSolverMatchesExpected(family, generated);
          if (!nodeGraded) continue;
          if (instance.activityType === 'numeric') {
            assert.equal((await grade(instance, String(instance.expectedAnswer.value))).correct, true);
            assert.equal((await grade(instance, String(instance.expectedAnswer.value + 1))).correct, false);
          } else {
            const solution = instance.expectedAnswer.solutionOrder;
            assert.equal((await grade(instance, solution)).correct, true);
            assert.equal((await grade(instance, [...solution, ...instance.expectedAnswer.distractors])).correct, false);
          }
        }
      }
    }
  }
});

// Test-eigene Orakel, aus den Aufgabentexten (w03-e3/w04-e3) abgeschrieben.
function specZaehleSummary(lines) {
  let gueltig = 0;
  let ungueltig = 0;
  let summe = 0;
  for (const line of lines) {
    const teile = line.split(':');
    if (teile.length !== 2) {
      ungueltig += 1;
      continue;
    }
    const name = teile[0].trim();
    const zahl = teile[1].trim();
    if (!name || !/^-?\d+$/.test(zahl) || zahl === '-') {
      ungueltig += 1;
      continue;
    }
    gueltig += 1;
    summe += Number.parseInt(zahl, 10);
  }
  return { gueltig, ungueltig, summe };
}

function specPalindrom(s) {
  const norm = s.toLowerCase().split(/\s/).join('');
  return norm === norm.split('').reverse().join('');
}

function specInspect(rows) {
  const issues = [];
  const seen = new Set();
  for (const row of rows) {
    if (row.age === '' || row.age === '-' || !/^-?\d+$/.test(row.age)) issues.push(['invalid-age', row.id]);
    if (seen.has(row.id)) issues.push(['duplicate-id', row.id]);
    seen.add(row.id);
  }
  return issues;
}

test('code bundles: curated base is byte-identical, extras follow the profile tier', () => {
  const tiers = { intro: 0, core: 1, stretch: 2, challenge: 3 };
  for (const [familyId, caseId, curated] of [
    ['aggregate-validate-and-count-records', 'parse-validate-summarize', ZAEHLE_TESTS],
    ['aggregate-validate-and-count-records', 'seen-scope-and-narrow-except', INSPECT_TESTS],
    ['construct-regression-test-suite', 'normalize-and-assert-suite', PALINDROM_TESTS],
    ['construct-regression-test-suite', 'normalize-and-assert-extended', PALINDROM_TESTS_EXTENDED],
  ]) {
    for (const difficulty of CONSTRUCT_PROFILES) {
      const instance = instantiate(familyId, 11, difficulty, caseId);
      const { tests } = instance.parameters;
      assert.ok(tests.startsWith(curated), `${familyId}:${caseId}:${difficulty} startet mit dem kuratierten Bündel`);
      if (tiers[difficulty] === 0) {
        assert.equal(tests, curated, `${familyId}:${caseId}:intro ohne Zusatz`);
      } else {
        assert.ok(tests.length > curated.length, `${familyId}:${caseId}:${difficulty} mit Zusatz`);
      }
      const starterFn = {
        'parse-validate-summarize': 'def zaehle_zeilen',
        'seen-scope-and-narrow-except': 'def inspect_rows',
        'normalize-and-assert-suite': 'def ist_palindrom',
        'normalize-and-assert-extended': 'def ist_palindrom',
      }[caseId];
      assert.ok(String(instance.parameters.starterCode).includes(starterFn), `${familyId}:${caseId} Starter enthält ${starterFn}`);
    }
  }
  const zaehle = instantiate('aggregate-validate-and-count-records', 11, 'challenge', 'parse-validate-summarize');
  assert.deepEqual(zaehle.parameters.seedExtraSummary, specZaehleSummary(zaehle.parameters.seedExtraRows));
  assert.ok(zaehle.parameters.tests.includes(`"summe": ${zaehle.parameters.seedExtraSummary.summe}`));
  const inspect = instantiate('aggregate-validate-and-count-records', 11, 'stretch', 'seen-scope-and-narrow-except');
  assert.deepEqual(inspect.parameters.seedExtraIssues, specInspect(inspect.parameters.seedExtraRows));
  const pal = instantiate('construct-regression-test-suite', 11, 'stretch', 'normalize-and-assert-suite');
  const pyEsc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  for (const s of pal.parameters.seedExtraCases) {
    assert.ok(pal.parameters.tests.includes(`ist_palindrom("${pyEsc(s)}") is ${specPalindrom(s) ? 'True' : 'False'}`));
  }
});

const PYTHON_HARNESS = `
import json, sys
payload = json.load(sys.stdin)
report = {'bundles': [], 'sympy': []}
def run_bundle(ref, tests):
    checks = []
    def __check(label, cond, detail=''):
        checks.append({'label': label, 'passed': bool(cond)})
    ns = {'__check': __check}
    try:
        exec(ref, ns)
        exec(tests, ns)
    except Exception as e:
        return {'checks': checks, 'error': '%s: %s' % (type(e).__name__, e)}
    return {'checks': checks, 'error': None}
for b in payload['bundles']:
    r = run_bundle(b['ref'], b['tests'])
    report['bundles'].append({'name': b['name'], 'expect': b['expect'], 'checks': r['checks'], 'error': r['error']})
try:
    from sympy import expand, simplify, Symbol
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
    __x = Symbol('x')
    __tsf = standard_transformations + (implicit_multiplication_application,)
    def __canon(s):
        return parse_expr(str(s).strip().replace('^', '**'), local_dict={'x': __x}, transformations=__tsf)
    for s in payload['sympy']:
        try:
            ok = bool(simplify(expand(__canon(s['student'])) - expand(__canon(s['expected']))) == 0)
            report['sympy'].append({'name': s['name'], 'expect': s['expect'], 'equivalent': ok, 'error': None})
        except Exception as e:
            report['sympy'].append({'name': s['name'], 'expect': s['expect'], 'equivalent': False, 'error': type(e).__name__})
except ImportError as e:
    report['sympyError'] = 'sympy fehlt: %s' % e
print(json.dumps(report))
`;

function runPythonAuthority(payload) {
  try {
    execFileSync('python3', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    assert.fail('python3 fehlt: Code- und Termfamilien brauchen die ausführbare Autorität (python3 + sympy).');
  }
  const out = execFileSync('python3', ['-c', PYTHON_HARNESS], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function codeBundle(familyId, caseId, seed, difficulty, code) {
  const instance = instantiate(familyId, seed, difficulty, caseId);
  return {
    ref: code,
    tests: instance.parameters.tests,
    checkCount: instance.parameters.tests.split('__check(').length - 1,
  };
}

test('python authority: references pass every check, documented mutants fail', () => {
  // Seed mit Zwei-Doppelpunkt-Zusatzzeile (numerisches Mittelfeld) suchen.
  let twoColonSeed = -1;
  for (let seed = 0; seed < 400; seed += 1) {
    const inst = instantiate('aggregate-validate-and-count-records', seed, 'challenge', 'parse-validate-summarize');
    if (inst.parameters.seedExtraRows.some((row) => row.split(':').length === 3 && /^-?\d+$/.test(row.split(':')[1].trim()))) {
      twoColonSeed = seed;
      break;
    }
  }
  assert.ok(twoColonSeed >= 0, 'Zwei-Doppelpunkt-Seed gefunden');

  const bundles = [];
  const sympy = [];
  const push = (name, expect, familyId, caseId, seed, difficulty, code) => {
    const b = codeBundle(familyId, caseId, seed, difficulty, code);
    bundles.push({ name, expect, ref: b.ref, tests: b.tests });
  };
  push('zaehle-ref-challenge', 'pass', 'aggregate-validate-and-count-records', 'parse-validate-summarize', 11, 'challenge', ZAEHLE_REFERENZ);
  push('zaehle-ref-core', 'pass', 'aggregate-validate-and-count-records', 'parse-validate-summarize', 4, 'core', ZAEHLE_REFERENZ);
  push('zaehle-ref-twocolon', 'pass', 'aggregate-validate-and-count-records', 'parse-validate-summarize', twoColonSeed, 'challenge', ZAEHLE_REFERENZ);
  push('zaehle-plus-mutant', 'fail', 'aggregate-validate-and-count-records', 'parse-validate-summarize', 11, 'challenge', ZAEHLE_MUTANT_PLUS);
  push('zaehle-plus-mutant-intro', 'fail', 'aggregate-validate-and-count-records', 'parse-validate-summarize', 4, 'intro', ZAEHLE_MUTANT_PLUS);
  push('zaehle-twocolon-mutant', 'fail', 'aggregate-validate-and-count-records', 'parse-validate-summarize', twoColonSeed, 'challenge', ZAEHLE_MUTANT_TWO_COLON);
  push('inspect-ref-challenge', 'pass', 'aggregate-validate-and-count-records', 'seen-scope-and-narrow-except', 7, 'challenge', INSPECT_REFERENZ);
  push('inspect-ref-core', 'pass', 'aggregate-validate-and-count-records', 'seen-scope-and-narrow-except', 2, 'core', INSPECT_REFERENZ);
  push('inspect-starter', 'fail', 'aggregate-validate-and-count-records', 'seen-scope-and-narrow-except', 7, 'challenge', INSPECT_STARTER);
  push('inspect-starter-core', 'fail', 'aggregate-validate-and-count-records', 'seen-scope-and-narrow-except', 2, 'core', INSPECT_STARTER);
  push('pal-ref-challenge', 'pass', 'construct-regression-test-suite', 'normalize-and-assert-suite', 7, 'challenge', solveRegressionSuite({ suite: 'standard' }).referenceCode);
  push('pal-ref-extended', 'pass', 'construct-regression-test-suite', 'normalize-and-assert-extended', 7, 'core', solveRegressionSuite({ suite: 'extended' }).referenceCode);
  push('pal-naive-mutant', 'fail', 'construct-regression-test-suite', 'normalize-and-assert-suite', 7, 'challenge', PALINDROM_MUTANT_NAIVE);

  for (const caseId of ['combine-like-terms', 'distribute-sign-constant-chain']) {
    for (const seed of [5, 6, 7]) {
      const generated = generateExpressionCanonicalFamily({ seed, caseId, difficulty: 'core' });
      const solved = solveExpressionCanonical(generated.parameters);
      sympy.push({ name: `${caseId}#${seed}-correct`, expect: true, student: generated.expected.expression, expected: generated.expected.expression });
      sympy.push({
        name: `${caseId}#${seed}-offbyone`,
        expect: false,
        student: canonicalLinear(solved.aCoef + 1, solved.bConst),
        expected: generated.expected.expression,
      });
    }
  }

  const report = runPythonAuthority({ bundles, sympy });
  assert.equal(report.sympyError, undefined, 'sympy verfügbar');
  for (const entry of report.bundles) {
    if (entry.expect === 'pass') {
      assert.equal(entry.error, null, `${entry.name}: Bündel läuft fehlerfrei`);
      assert.ok(entry.checks.length > 0, `${entry.name}: Bündel enthält Prüfungen`);
      assert.deepEqual(entry.checks.filter((c) => !c.passed), [], `${entry.name}: alle Prüfungen bestehen`);
    } else {
      const failed = entry.checks.filter((c) => !c.passed);
      assert.ok(entry.error !== null || failed.length > 0, `${entry.name}: Mutant scheitert`);
    }
  }
  for (const entry of report.sympy) {
    assert.equal(entry.error, null, `${entry.name}: SymPy liest beide Terme`);
    assert.equal(entry.equivalent, entry.expect, `${entry.name}: Äquivalenz wie erwartet`);
  }
  assert.equal(
    report.bundles.find((b) => b.name === 'zaehle-twocolon-mutant').checks.filter((c) => !c.passed).length >= 1,
    true,
  );
});

test('taxonomy cross-check: contracts match the foundations shard', () => {
  const membersByFamily = new Map();
  for (const entry of shard.entries) {
    const id = entry.cognitiveFamily.familyId;
    if (!membersByFamily.has(id)) membersByFamily.set(id, []);
    membersByFamily.get(id).push(entry);
  }
  const notesByFamily = new Map(FAMILY_NOTES.map((n) => [n.familyId, n]));
  for (const family of FAMILIES) {
    const { contract } = family;
    const members = membersByFamily.get(contract.familyId);
    assert.ok(members && members.length > 0, `${contract.familyId}: Shard-Mitglieder vorhanden`);
    const first = members[0].cognitiveFamily;
    for (const member of members) {
      assert.equal(member.cognitiveFamily.summary, first.summary, `${contract.familyId}: Summary einheitlich`);
      assert.deepEqual(
        [...member.cognitiveFamily.membershipEvidence.errorHypotheses].sort(),
        [...first.membershipEvidence.errorHypotheses].sort(),
        `${contract.familyId}: Fehlerhypothesen mengen-identisch`,
      );
      assert.ok(first.membershipEvidence.errorHypotheses.length > 0, `${contract.familyId}: Hypothesen vorhanden`);
    }
    assert.equal(contract.summary, first.summary, `${contract.familyId}: Summary zeichengetreu`);
    assert.equal(contract.familyGroup, members[0].familyGroup, `${contract.familyId}: Gruppe`);
    const archetypes = members.map((m) => m.taskArchetype.archetypeId);
    const majority = [...archetypes].sort((a, b) => (
      archetypes.filter((x) => x === b).length - archetypes.filter((x) => x === a).length
    ))[0];
    assert.equal(contract.taskArchetype, majority, `${contract.familyId}: Mehrheits-Archetyp`);
    for (const member of members) {
      assert.ok(
        contract.competencyIds.includes(member.competencyClaim.primary),
        `${contract.familyId}: Primärclaim ${member.competencyClaim.primary} abgedeckt`,
      );
    }
    const shardCases = new Set(members.map((m) => m.caseTemplate.caseId));
    const runtimeCases = new Set(contract.caseTypes.map((c) => c.caseId));
    const note = notesByFamily.get(contract.familyId);
    assert.ok(note, `${contract.familyId}: FAMILY_NOTES-Eintrag`);
    for (const s of note.staticOnly) {
      assert.ok(shardCases.has(s.caseId), `${contract.familyId}: statischer Fall ${s.caseId} im Shard`);
      assert.ok(!runtimeCases.has(s.caseId), `${contract.familyId}: statischer Fall ${s.caseId} nicht in der Runtime`);
      assert.ok(s.reason.length > 0);
    }
    for (const a of note.addedParametric) {
      assert.ok(!shardCases.has(a.caseId), `${contract.familyId}: Geschwisterfall ${a.caseId} ist neu`);
      assert.ok(runtimeCases.has(a.caseId), `${contract.familyId}: Geschwisterfall ${a.caseId} in der Runtime`);
      assert.ok(runtimeCases.has(a.parentCaseId), `${contract.familyId}: Elternfall ${a.parentCaseId} in der Runtime`);
      assert.ok(a.reason.length > 0);
    }
    for (const caseId of shardCases) {
      const documentedStatic = note.staticOnly.some((s) => s.caseId === caseId);
      assert.ok(runtimeCases.has(caseId) || documentedStatic, `${contract.familyId}: Shard-Fall ${caseId} abgedeckt oder dokumentiert`);
    }
  }
});

test('content anchors: references, bundles and fragments match authored definitions', () => {
  const w03 = JSON.parse(readFileSync(join(root, 'content/exercises/w03.json'), 'utf8'));
  const w04 = JSON.parse(readFileSync(join(root, 'content/exercises/w04.json'), 'utf8'));
  const w01 = JSON.parse(readFileSync(join(root, 'content/exercises/w01.json'), 'utf8'));
  const w03e3 = w03.exercises.find((e) => e.exerciseId === 'w03-e3');
  assert.equal(w03e3.expectedAnswer.referenceSolver, ZAEHLE_REFERENZ);
  assert.equal(w03e3.parameters.tests, ZAEHLE_TESTS);
  const w04e3 = w04.exercises.find((e) => e.exerciseId === 'w04-e3');
  assert.equal(w04e3.expectedAnswer.referenceSolver, `${PALINDROM_REFERENZ}\n\n${PALINDROM_SUITE_REFERENZ}`);
  assert.equal(w04e3.parameters.tests, PALINDROM_TESTS);
  const w01e8 = w01.exercises.find((e) => e.exerciseId === 'w01-e8');
  const w01e9 = w01.exercises.find((e) => e.exerciseId === 'w01-e9');
  const w01e10 = w01.exercises.find((e) => e.exerciseId === 'w01-e10');
  assert.equal(w01e8.parameters.seedGenerator, 'genLinearEquation');
  assert.equal(w01e9.parameters.seedGenerator, 'genPowerExpr');
  assert.equal(w01e10.parameters.seedGenerator, 'genLogExpr');
  const fdata = JSON.parse(readFileSync(join(root, 'content/exercise-definitions/foundations/data-code-repair.json'), 'utf8'));
  assert.equal(fdata.parameters.tests, INSPECT_TESTS);
  assert.equal(fdata.parameters.starterCode, INSPECT_STARTER);
  const branch = JSON.parse(readFileSync(join(root, 'content/exercise-definitions/foundations/branch-coverage.json'), 'utf8'));
  assert.equal(branch.parameters.seedGenerator, 'genBranchCoverageCount');
  for (const [path, familyId, caseId] of [
    ['testing-parsons.json', 'construct-test-structure-aaa', 'arrange-act-assert'],
    ['control-parsons.json', 'construct-guarded-loop', 'positive-values-structure'],
    ['files-parsons.json', 'validate-required-field-raise', 'specific-except-with-issue'],
    ['git-parsons.json', 'construct-safe-bugfix-workflow', 'bugfix-flow-with-test-contract'],
  ]) {
    const definition = JSON.parse(readFileSync(join(root, 'content/exercise-definitions/foundations', path), 'utf8'));
    const generated = byId.get(familyId).generate({ seed: 5, caseId, difficulty: 'core' });
    assert.deepEqual(generated.parameters.fragments, definition.parameters.fragments, `${path}: Fragmente wörtlich`);
    assert.deepEqual(generated.expected.solutionOrder, definition.expectedAnswer.solutionOrder, `${path}: Lösung`);
    assert.deepEqual(generated.expected.distractors, definition.expectedAnswer.distractors, `${path}: Distraktoren`);
  }
  // Geseedeter Countdown: Startwert steckt im Fragment, Kontrollsumme stimmt.
  const countdown = byId.get('construct-guarded-loop').generate({ seed: 9, caseId: 'countdown-accumulator-structure', difficulty: 'stretch' });
  const start = countdown.parameters.start;
  assert.ok(countdown.parameters.fragments[0].text === `n = ${start}`);
  assert.equal(solveGuardedLoop(countdown.parameters).total, (start * (start + 1)) / 2);
  // SymPy-Regel der Termfamilie entspricht dem Content-Vertrag (w01-e2).
  const w01e2 = w01.exercises.find((e) => e.exerciseId === 'w01-e2');
  assert.equal(w01e2.expectedAnswer.equivalence, SYMPY_EQUIVALENCE_RULE);
});

test('branch coverage solver reuses the existing leaf counter', () => {
  assert.equal(countBranchCoverageLeaves('if-if'), 3);
  for (const difficulty of CONSTRUCT_PROFILES) {
    const [lo, hi] = COVERAGE_LEAF_TIERS[CONSTRUCT_PROFILES.indexOf(difficulty)];
    for (let seed = 0; seed < 16; seed += 1) {
      const generated = generateTestDesignCoverageFamily({ seed, caseId: 'nested-if-decision-tree', difficulty });
      const leaves = countBranchCoverageLeaves(generated.parameters.branchShape);
      assert.ok(leaves >= lo && leaves <= hi, `Stufe ${difficulty}: ${leaves} Blätter`);
      assert.equal(generated.expected.value, leaves);
    }
  }
});

test('legacy seed-generator baseline stays at 51 families', () => {
  assert.equal(Object.keys(SEED_GENERATORS).length, 51);
  for (const name of [
    'generateLinearIsolateFamily', 'generatePowerLogFamily', 'generateExpressionCanonicalFamily',
    'generateValidateCountFamily', 'generateRegressionSuiteFamily', 'generateTestStructureFamily',
    'generateGuardedLoopFamily', 'generateRequiredFieldFamily', 'generateBugfixWorkflowFamily',
    'generateTestDesignCoverageFamily',
  ]) {
    assert.equal(Object.hasOwn(SEED_GENERATORS, name), false);
  }
});

test('construct golden corpus is byte-identical over seeds 0-63', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/foundations-construct-golden-corpus.json'), 'utf8'));
  const [firstSeed, lastSeed] = fixture.seedRange;
  const instances = [];
  for (const familyFixture of fixture.families) {
    for (const caseId of familyFixture.caseTypes) {
      for (const difficulty of familyFixture.difficultyProfiles) {
        for (let seed = firstSeed; seed <= lastSeed; seed += 1) {
          instances.push(instantiate(familyFixture.familyId, seed, difficulty, caseId));
        }
      }
    }
  }
  const expectedCount = fixture.families.reduce(
    (sum, f) => sum + f.caseTypes.length * f.difficultyProfiles.length * (lastSeed - firstSeed + 1),
    0,
  );
  assert.equal(instances.length, fixture.instances);
  assert.equal(instances.length, expectedCount);
  assert.equal(
    createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex'),
    fixture.digest,
  );
});

test('familyEventInput maps construct instances to the S3 write path', () => {
  for (const [familyId, caseId] of [
    ['transform-linear-equation-isolate', 'two-step-seeded-retrieval'],
    ['transform-expression-simplify-canonical', 'combine-like-terms'],
    ['aggregate-validate-and-count-records', 'parse-validate-summarize'],
    ['construct-test-structure-aaa', 'arrange-act-assert'],
  ]) {
    const instance = instantiate(familyId, 7, 'core', caseId);
    const input = familyEventInput(instance);
    assert.equal(input.definitionId, `${familyId}:${caseId}`);
    assert.equal(input.activityId, familyId);
    assert.equal(input.exerciseId, `${familyId}:${caseId}`);
    assert.deepEqual(input.competencyIds, [...instance.competencyIds]);
    assert.equal(input.seed, 7);
    assert.equal(input.masteryEligible, true);
  }
});
