// Procedural family aggregate-evidence-rule-audit: capsule gates (mixed:
// numeric + predict-output + python-code).
// Run: node --test tests/procedural_evidence_rule_audit_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EVIDENCE_CASES,
  EVIDENCE_CONTRACT,
  FAMILY_SPEC,
  evidenceCaseOk,
  genEvidenceCase,
  generateEvidenceFamily,
  solveEvidenceFamily,
} from '../assets/js/core/procedural/aggregate-evidence-rule-audit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-evidence-rule-audit.json'), 'utf8'));
const CASE_IDS = ['evidence-rule-count', 'final-diagnosis-trace', 'final-diagnosis-rules'];
const COUNT = EVIDENCE_CASES['evidence-rule-count'];
const TRACE = EVIDENCE_CASES['final-diagnosis-trace'];
const RULES = EVIDENCE_CASES['final-diagnosis-rules'];

// Independent JS mirror of the Python diagnose(): lock out locked instances,
// count remaining hits, compare day suffixes.
function refTraceLine(gesperrt, diff) {
  const line2 = diff >= 14 ? 'erfuellt' : 'nicht_erfuellt';
  return `${gesperrt ? 'nicht_erfuellt' : line2}\n${line2}`;
}

test('anchor: contract null, authored bodies fully preserved as oracle', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const count = doc.cases.find((entry) => entry.caseId === 'evidence-rule-count');
  assert.equal(count.expected.kind, 'integer');
  assert.equal(count.activityType, 'numeric');
  assert.equal(count.graderId, 'deterministic');
  assert.ok(count.feedbackRules.length >= 3, 'count: authored rules preserved');
  const trace = doc.cases.find((entry) => entry.caseId === 'final-diagnosis-trace');
  assert.equal(trace.expected.output, 'nicht_erfuellt\nerfuellt', 'trace: real newline expected');
  assert.equal(trace.activityType, 'predict-output');
  const code = doc.cases.find((entry) => entry.caseId === 'final-diagnosis-rules');
  assert.equal(code.parameters.tests, RULES.baseTests, 'code: base tests verbatim');
  assert.equal(code.parameters.starterCode, RULES.starterCode, 'code: starter verbatim');
  assert.equal(code.expected.referenceSolver, RULES.referenceSolver, 'code: solver verbatim');
  assert.equal(code.activityType, 'python-code');
  assert.equal(code.graderId, 'pyodide');
});

test('count case: expected equals hits minus disqualified, no prompt leak', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genEvidenceCase(seed, COUNT);
    const { hits, disqualified, definitions } = generated.parameters;
    assert.ok(evidenceCaseOk(generated.parameters, COUNT), `${seed}: shape`);
    assert.equal(generated.expected.value, hits - disqualified, `${seed}: expected`);
    assert.ok(hits - disqualified !== definitions, `${seed}: leak guard`);
    // the correct value must not stand alone in the prompt
    assert.ok(!new RegExp(`\\b${hits - disqualified}\\b`).test(generated.prompt.replaceAll(String(hits), '').replaceAll(String(disqualified), '').replaceAll(String(definitions), '')), `${seed}: answer not in prompt`);
    assert.ok(generated.prompt.includes(String(hits)), `${seed}: hits in prompt`);
    assert.ok(generated.prompt.includes(String(disqualified)), `${seed}: disqualified in prompt`);
    for (const rule of generated.feedbackRules) {
      const probe = { value: Number(rule.if.match(/value === (\d+)/)[1]) };
      assert.ok(generated.fullSolution.length > 40 && rule.then.length > 30, `${seed}: rule text`);
      assert.notEqual(probe.value, hits - disqualified, `${seed}: rules only fire on wrong answers`);
    }
    assert.equal(solveEvidenceFamily(generated.parameters).value, hits - disqualified, `${seed}: solver`);
    seen.add(JSON.stringify(generated.parameters));
  }
  assert.ok(seen.size >= 40, `count: only ${seen.size} distinct`);
});

test('trace case: real newline output, JS mirror agrees, dates valid', () => {
  const seen = new Set();
  let arms = { gesperrt: 0, offen: 0, erfuellt: 0 };
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genEvidenceCase(seed, TRACE);
    const p = generated.parameters;
    assert.ok(evidenceCaseOk(p, TRACE), `${seed}: shape`);
    assert.ok(Number.isInteger(p.dayA) && p.dayA >= 1 && p.dayA + p.diff <= 28, `${seed}: same-month dates`);
    assert.ok(generated.expected.output.includes('\n'), `${seed}: real newline`);
    assert.ok(!generated.expected.output.includes('\\n'), `${seed}: no literal backslash-n`);
    assert.equal(generated.expected.output, refTraceLine(p.gesperrt, p.diff), `${seed}: mirror`);
    assert.equal(generated.expected.output, p.gesperrt ? `nicht_erfuellt\n${p.diff >= 14 ? 'erfuellt' : 'nicht_erfuellt'}` : refTraceLine(false, p.diff), `${seed}: semantics`);
    assert.deepEqual(solveEvidenceFamily(p), { output: generated.expected.output }, `${seed}: solver`);
    assert.ok(p.snippet.includes(`"tag": "${iso(p.year, p.month, p.dayA)}"`), `${seed}: snippet carries drawn dates`);
    assert.equal(p.snippet.includes('"art": "loesungsanzeige"'), p.gesperrt, `${seed}: lock line present iff drawn`);
    assert.ok(generated.prompt.includes('vorhanden'), `${seed}: lock state in prompt`);
    arms[p.gesperrt ? 'gesperrt' : 'offen'] += 1;
    if (p.diff >= 14) arms.erfuellt += 1;
    seen.add(JSON.stringify(p));
  }
  assert.ok(seen.size >= 60, `trace: only ${seen.size} distinct`);
  assert.ok(arms.gesperrt > 40 && arms.offen > 40, `arms: ${JSON.stringify(arms)}`);
  assert.ok(arms.erfuellt > 40, 'erfuellt arm exercised');
});

test('code case: base tests verbatim, seeded extras checked against __ref oracle', () => {
  const seen = new Set();
  for (let seed = 0; seed < 60; seed += 1) {
    const generated = genEvidenceCase(seed, RULES);
    const p = generated.parameters;
    assert.ok(evidenceCaseOk(p, RULES), `${seed}: shape`);
    assert.ok(p.tests.startsWith(RULES.baseTests), `${seed}: base block verbatim`);
    assert.ok(p.tests.includes('# seeded extra cases'), `${seed}: seeded marker`);
    assert.ok(p.tests.includes('def __ref_final_diagnosis('), `${seed}: oracle copy`);
    assert.ok(!p.tests.slice(p.tests.indexOf('def __ref_')).includes('\nfinal_diagnosis(') || p.tests.includes('final_diagnosis(__E'), `${seed}: student fn still named in checks`);
    assert.equal(p.seedCases.length, 2, `${seed}: extraCount`);
    for (const entry of p.seedCases) {
      assert.ok(entry.dayA + entry.diff <= 28, `${seed}: valid day`);
      assert.ok(entry.diff >= 10 && entry.diff <= 20, `${seed}: mixed arms`);
      assert.ok(typeof entry.gesperrt === 'boolean', `${seed}: lock flag`);
      assert.ok(p.tests.includes(`${entry.year}-`), `${seed}: drawn dates baked in`);
    }
    assert.equal(p.starterCode, RULES.starterCode, `${seed}: starter pinned`);
    assert.deepEqual(generated.expected, { kind: 'reference-solver', referenceSolver: RULES.referenceSolver }, `${seed}: expected`);
    assert.deepEqual(solveEvidenceFamily(p), { referenceCode: RULES.referenceSolver }, `${seed}: solver`);
    seen.add(JSON.stringify(p.seedCases));
  }
  assert.ok(seen.size >= 40, `code: only ${seen.size} distinct`);
});

test('mixed family: per-instance activityType and graderId reach the instance', () => {
  const table = {
    'evidence-rule-count': ['numeric', 'deterministic'],
    'final-diagnosis-trace': ['predict-output', 'deterministic'],
    'final-diagnosis-rules': ['python-code', 'pyodide'],
  };
  for (const [caseId, [activity, grader]] of Object.entries(table)) {
    const def = EVIDENCE_CASES[caseId];
    const generated = generateEvidenceFamily({ seed: 7, caseId, difficulty: def.difficulty });
    assert.equal(generated.activityType, activity, `${caseId}: activityType`);
    assert.equal(generated.graderId, grader, `${caseId}: graderId`);
    assert.equal(generated.parameters.caseId, caseId);
    assert.equal(generated.parameters.difficulty, def.difficulty);
    assert.deepEqual(generated.competencyIds, def.competencyIds, `${caseId}: competencies`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = EVIDENCE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genEvidenceCase(seed, def), genEvidenceCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('family block: contract, dispatch, error paths', () => {
  assert.equal(EVIDENCE_CONTRACT.familyId, 'aggregate-evidence-rule-audit');
  assert.equal(EVIDENCE_CONTRACT.authorityMode, 'seeded');
  assert.equal(EVIDENCE_CONTRACT.masteryEligible, true);
  assert.deepEqual(EVIDENCE_CONTRACT.caseTypes.map((entry) => entry.caseId), CASE_IDS);
  assert.deepEqual(EVIDENCE_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.equal(FAMILY_SPEC.generate, generateEvidenceFamily);
  assert.equal(FAMILY_SPEC.solve, solveEvidenceFamily);
  assert.throws(() => generateEvidenceFamily({ seed: 0, caseId: 'evidence-rule-count', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateEvidenceFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateEvidenceFamily({ seed: 0.5, caseId: 'evidence-rule-count', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveEvidenceFamily({}), /Kapselform/);
  assert.throws(() => solveEvidenceFamily({ caseId: 'final-diagnosis-trace', year: 2026, month: 1, dayA: 5, diff: 16, gesperrt: true, snippet: 'falsch' }), /Kapselform/);
});

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
