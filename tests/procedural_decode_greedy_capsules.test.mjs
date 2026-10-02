// Procedural family optimize-decode-greedy-loop: capsule gates.
// Run: node --test tests/procedural_decode_greedy_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DECODE_CASES,
  DECODE_CONTRACT,
  FAMILY_SPEC,
  decodeCaseOk,
  genDecodeCase,
  generateDecodeFamily,
  greedyDecode,
  solveDecodeFamily,
} from '../assets/js/core/procedural/optimize-decode-greedy-loop.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['greedy-loop-trace', 'greedy-decode-function'];
const TRACE = DECODE_CASES['greedy-loop-trace'];
const CODE = DECODE_CASES['greedy-decode-function'];

// Independent JS mirror of the Python greedy loop over a step function.
const refDecode = (stepFn, initIds, maxLen, eos) => {
  const ids = [...initIds];
  while (ids.length < maxLen) {
    const nxt = stepFn([...ids]);
    ids.push(nxt);
    if (nxt === eos) break;
  }
  return ids;
};

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-decode-greedy-loop.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 2);
  const traceBody = doc.cases.find((item) => item.caseId === 'greedy-loop-trace');
  assert.equal(traceBody.parameters.snippet, TRACE.baseSnippet, 'trace: base snippet verbatim');
  assert.deepEqual(traceBody.expected, { output: TRACE.baseOutput }, 'trace: expected form');
  assert.equal(traceBody.prompt, TRACE.prompt, 'trace: prompt verbatim');
  assert.equal(traceBody.fullSolution, TRACE.baseSolution, 'trace: solution verbatim');
  assert.equal(traceBody.activityType, 'predict-output');
  assert.equal(traceBody.graderId, 'deterministic');
  const codeBody = doc.cases.find((item) => item.caseId === 'greedy-decode-function');
  assert.equal(codeBody.parameters.tests, CODE.baseTests, 'code: base tests verbatim');
  assert.equal(codeBody.parameters.starterCode, CODE.starterCode, 'code: starter verbatim');
  assert.equal(codeBody.prompt, CODE.prompt, 'code: prompt verbatim');
  assert.equal(codeBody.fullSolution, CODE.fullSolution, 'code: fullSolution verbatim');
  assert.equal(codeBody.expected.referenceSolver, CODE.referenceSolver, 'code: solver verbatim');
  // base oracle self-consistency: the pinned output matches the loop semantics
  const baseTable = { '': 0, '0': 1, '0,1': 2 };
  assert.equal(refDecode((ids) => baseTable[ids.join(',')], [], 5, 2).join(', '), '0, 1, 2');
});

test('capsule shape: generated parameters satisfy decodeCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = DECODE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genDecodeCase(seed, def);
      assert.ok(decodeCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.equal(generated.activityType, def.activityType, `${caseId}:${seed}: activityType`);
      assert.equal(generated.graderId, def.graderId, `${caseId}:${seed}: graderId`);
      if (def.kind === 'predict-output') {
        assert.equal(generated.parameters.caseId, caseId);
        assert.ok(generated.parameters.snippet.includes('def greedy_decode('), 'snippet keeps the loop');
        assert.ok(generated.parameters.snippet.includes('def step_fn(ids):'), 'snippet keeps the table fn');
      } else {
        assert.ok(generated.parameters.tests.startsWith(def.baseTests), 'code: base block kept');
        assert.ok(generated.parameters.tests.includes('# seeded extra cases'), 'code: seeded block');
        assert.ok(generated.parameters.tests.includes('def __ref_decode('), 'code: ref preamble');
        assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      }
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('expected output: solver recomputes the trace prediction deterministically', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genDecodeCase(seed, TRACE);
    const { vocab, chain, initIds, maxLen, eos } = generated.parameters;
    const table = {};
    for (let i = 0; i < chain.length; i += 1) {
      table[[...initIds, ...chain.slice(0, i)].join(',')] = chain[i];
    }
    const out = refDecode((ids) => table[ids.join(',')], initIds, maxLen, eos);
    const want = `[${out.join(', ')}]\n${out.map((id) => vocab[id]).join('')}`;
    assert.equal(generated.expected.output, want, `${seed}: expected output`);
    assert.deepEqual(solveDecodeFamily(generated.parameters), { output: want }, `${seed}: solve output`);
    assert.equal(out.at(-1), eos, 'chain reaches eos inside max_len');
    assert.equal(out.length, chain.length, 'no truncation inside budget');
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const trace = genDecodeCase(seed, TRACE);
    const { vocab, chain, maxLen, eos } = trace.parameters;
    assert.ok(vocab.length >= 3 && vocab.length <= 4, `vocab size: ${vocab.length}`);
    assert.equal(vocab.at(-1), '<eos>');
    assert.ok(chain.length >= 3 && chain.length <= 5, `chain length: ${chain.length}`);
    assert.equal(chain.at(-1), eos, 'chain ends on eos');
    assert.ok(chain.slice(0, -1).every((id) => id >= 0 && id < eos), 'body ids below eos');
    assert.ok(maxLen >= chain.length && maxLen <= chain.length + 2, `maxLen: ${maxLen}`);
    const code = genDecodeCase(seed, CODE);
    assert.equal(code.parameters.seedCases.length, 4, 'extraCount');
    code.parameters.seedCases.forEach((entry, i) => {
      if (entry.kind === 'chain') {
        assert.ok(entry.chain.length >= 3 && entry.chain.length <= 5, 'chain length');
        assert.equal(entry.chain.at(-1), entry.eos, 'chain ends on eos');
        assert.ok(entry.eos === 8 || entry.eos === 9, 'eos bank');
        assert.ok(entry.chain.slice(0, -1).every((id) => id >= 0 && id <= 7), 'body ids below eos');
        assert.ok(entry.maxLen >= entry.chain.length && entry.maxLen <= entry.chain.length + 3, 'chain maxLen');
      } else {
        assert.ok(entry.value >= 0 && entry.value <= 9, 'const value');
        assert.ok(entry.init.every((id) => id >= 0 && id <= 9), 'init range');
        assert.ok(entry.maxLen >= entry.init.length && entry.maxLen <= entry.init.length + 4, 'const maxLen');
        assert.ok(entry.eos >= 10 && entry.eos <= 19, 'const eos never hits value');
      }
      assert.equal(entry.kind === 'chain', i % 2 === 0, 'alternating fixture kinds');
    });
    // the generated code checks reference the drawn literals verbatim
    assert.ok(code.parameters.tests.includes(`__tab1 = {(): ${code.parameters.seedCases[0].chain[0]}`), 'chain table literal');
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = DECODE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateDecodeFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = DECODE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genDecodeCase(seed, def), genDecodeCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve reproduces generated expected or reference', () => {
  for (const caseId of CASE_IDS) {
    const def = DECODE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateDecodeFamily({ seed, caseId, difficulty: def.difficulty });
      if (def.kind === 'predict-output') {
        assert.equal(solveDecodeFamily(generated.parameters).output, generated.expected.output);
      } else {
        assert.deepEqual(solveDecodeFamily(generated.parameters), { referenceCode: def.referenceSolver });
      }
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(DECODE_CONTRACT.familyId, 'optimize-decode-greedy-loop');
  assert.equal(DECODE_CONTRACT.authorityMode, 'seeded');
  assert.equal(DECODE_CONTRACT.taskArchetype, 'output-predict-lines');
  assert.equal(FAMILY_SPEC.activityType, 'predict-output');
  assert.equal(FAMILY_SPEC.graderId, 'deterministic');
  assert.equal(DECODE_CONTRACT.masteryEligible, true);
  assert.deepEqual(DECODE_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(DECODE_CONTRACT.competencyIds, ['c-dl-inference', 'c-python-basics']);
  assert.deepEqual(DECODE_CONTRACT.caseTypes, [
    { caseId: 'greedy-loop-trace', propertyTest: false },
    { caseId: 'greedy-decode-function', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateDecodeFamily);
  assert.equal(FAMILY_SPEC.solve, solveDecodeFamily);
  assert.throws(() => generateDecodeFamily({ seed: 0, caseId: 'greedy-loop-trace', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateDecodeFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateDecodeFamily({ seed: 0.5, caseId: 'greedy-decode-function', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveDecodeFamily({}), /Kapselform/);
  assert.throws(() => solveDecodeFamily({ caseId: 'greedy-loop-trace', vocab: ['a', '<eos>'], chain: [0, 1], initIds: [], maxLen: 2, eos: 1, snippet: 'x' }), /Kapselform/);
});

test('exported mirror: greedyDecode matches the Python loop semantics', () => {
  // max_len bound is exclusive; eos stays in the returned ids.
  const four = () => 4;
  assert.deepEqual(greedyDecode(four, [], 3, 9), [4, 4, 4]);
  assert.deepEqual(greedyDecode(four, [6, 7, 8], 3, 9), [6, 7, 8]);
  assert.deepEqual(greedyDecode(four, [], 1, 4), [4]);
});
