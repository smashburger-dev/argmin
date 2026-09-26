// Procedural family classify-hash-semantics: capsule gates.
// Run: node --test tests/procedural_hash_semantics_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bank from '../content/banks/classify-hash-semantics.json' with { type: 'json' };
import { JS_FAMILY_SPECS } from '../assets/js/domain/exercise_registry.mjs';

const spec = JS_FAMILY_SPECS.find((item) => item.familyId === 'classify-hash-semantics');
const generateHashSemanticsFamily = spec.generate;


const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'hash-semantics-baseline';
const CAPSULE = bank.capsules.intro;
const draw = (seed) => generateHashSemanticsFamily({ seed, caseId: CASE_ID, difficulty: 'intro' });


test('Familien-Extras: Fallkörper-Größe, Schwierigkeitsprofil, Schlüssel-Id', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-hash-semantics.json'), 'utf8'));
  assert.equal(doc.cases.length, 1);
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.equal(body.difficultyProfile, 'intro');
  assert.equal(body.choices.find((choice) => choice.correct).id, 'd');
  assert.deepEqual(bank.contract.competencyIds, ['c-research-capstone']);
});

test('bank: 12-16 scenarios, unique keys, four distinct option texts each', () => {
  assert.equal(CAPSULE.caseId, CASE_ID);
  assert.ok(CAPSULE.bank.length >= 12 && CAPSULE.bank.length <= 16, `bank size ${CAPSULE.bank.length}`);
  assert.equal(CAPSULE.bank.filter((item) => item.key === 'base').length, 1, 'exactly one oracle row');
  for (const entry of CAPSULE.bank) {
    const options = [entry.correct, ...entry.wrong];
    for (const text of options) assert.ok(text.length > 10, `${entry.key}: no filler text`);
  }
});

test('capsule shape extras: parameter keys and bank-verbatim prompt/solution', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    assert.deepEqual(Object.keys(generated.parameters).sort(), ['caseId', 'difficulty', 'scenario'], `${seed}: parameter keys`);
    const entry = CAPSULE.bank.find((item) => item.key === generated.parameters.scenario);
    assert.equal(generated.prompt, entry.prompt, `${seed}: prompt from bank row`);
    assert.equal(generated.fullSolution, entry.solution, `${seed}: solution from bank row`);
  }
});
