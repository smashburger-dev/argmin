// Procedural family trace-chunk-window-loop: capsule gates.
// Run: node --test tests/procedural_chunk_window_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHUNK_CASES,
  CHUNK_CONTRACT,
  FAMILY_SPEC,
  chunkCaseOk,
  chunkParts,
  genChunkCase,
  generateChunkFamily,
  solveChunkFamily,
} from '../assets/js/core/procedural/trace-chunk-window-loop.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['chunk-window-loop'];

// Independent JS mirror of the Python while-loop: the solver and the expected
// output must both agree with this recomputation for every drawn instance.
const refParts = (text, size, overlap) => {
  const parts = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    parts.push(text.slice(start, start + size));
  }
  return parts;
};

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/trace-chunk-window-loop.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    const def = CHUNK_CASES[caseId];
    assert.equal(body.parameters.snippet, def.baseSnippet, `${caseId}: base snippet verbatim`);
    assert.deepEqual(body.expected, { kind: 'output-lines', output: def.baseOutput }, `${caseId}: expected form`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.baseSolution, `${caseId}: solution verbatim`);
    assert.deepEqual(body.competencyIds, def.competencyIds, `${caseId}: competencies verbatim`);
  }
  // base oracle self-consistency: the pinned output matches the loop semantics
  assert.equal(CHUNK_CASES['chunk-window-loop'].baseOutput, '4\ngh');
  assert.deepEqual(refParts('abcdefgh', 4, 2), ['abcd', 'cdef', 'efgh', 'gh']);
});

test('capsule shape: generated parameters satisfy chunkCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = CHUNK_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genChunkCase(seed, def);
      assert.ok(chunkCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.equal(generated.parameters.caseId, caseId);
      assert.equal(generated.parameters.difficulty, def.difficulty);
      assert.equal(generated.expected.kind, 'output-lines', 'expected form like base case');
      assert.equal(generated.prompt, def.prompt);
      assert.ok(generated.parameters.snippet.includes(`text = "${generated.parameters.text}"`), 'snippet carries drawn text');
      assert.ok(
        generated.parameters.snippet.includes(`chunk(text, ${generated.parameters.size}, ${generated.parameters.overlap})`),
        'snippet carries drawn size/overlap',
      );
    }
  }
});

test('expected output: solver recomputes the prediction deterministically', () => {
  for (const caseId of CASE_IDS) {
    const def = CHUNK_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genChunkCase(seed, def);
      const parts = refParts(generated.parameters.text, generated.parameters.size, generated.parameters.overlap);
      const want = `${parts.length}\n${parts.at(-1)}`;
      assert.equal(generated.expected.output, want, `${caseId}:${seed}: expected output`);
      assert.deepEqual(solveChunkFamily(generated.parameters), { output: want }, `${caseId}:${seed}: solve output`);
      assert.deepEqual(chunkParts(generated.parameters.text, generated.parameters.size, generated.parameters.overlap), parts);
      // the last window is a possibly truncated suffix, count line is an int
      const [countLine, lastLine] = generated.expected.output.split('\n');
      assert.equal(Number(countLine), parts.length, 'first line is the window count');
      assert.ok(generated.parameters.text.endsWith(lastLine), 'last window is a text suffix');
      assert.ok(lastLine.length <= generated.parameters.size, 'last window at most size chars');
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = CHUNK_CASES['chunk-window-loop'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genChunkCase(seed, def);
    const { text, size, overlap } = generated.parameters;
    assert.match(text, /^[a-z]{6,12}$/, `text shape: ${text}`);
    for (let i = 1; i < text.length; i += 1) {
      assert.equal(text.charCodeAt(i), text.charCodeAt(i - 1) + 1, `consecutive letters: ${text}`);
    }
    assert.ok(size >= 3 && size <= 6, `size 3-6: ${size}`);
    assert.ok(overlap >= 1 && overlap <= size - 1, `overlap 1..size-1: ${overlap}`);
    assert.ok(size - overlap >= 1, 'stride >= 1, loop terminates');
    // the explanation carries the recomputed trace
    assert.ok(generated.fullSolution.includes(`${refParts(text, size, overlap).length} Fenster`), 'solution names the count');
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = CHUNK_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateChunkFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = CHUNK_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genChunkCase(seed, def), genChunkCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve reproduces the generated expected output', () => {
  for (const caseId of CASE_IDS) {
    const def = CHUNK_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateChunkFamily({ seed, caseId, difficulty: def.difficulty });
      assert.equal(solveChunkFamily(generated.parameters).output, generated.expected.output);
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(CHUNK_CONTRACT.familyId, 'trace-chunk-window-loop');
  assert.equal(CHUNK_CONTRACT.authorityMode, 'seeded');
  assert.equal(CHUNK_CONTRACT.taskArchetype, 'output-predict-lines');
  assert.equal(CHUNK_CONTRACT.activityType, 'predict-output');
  assert.equal(CHUNK_CONTRACT.graderId, 'deterministic');
  assert.equal(CHUNK_CONTRACT.masteryEligible, true);
  assert.deepEqual(CHUNK_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(CHUNK_CONTRACT.competencyIds, ['c-genai-rag', 'c-python-reading']);
  assert.equal(FAMILY_SPEC.generate, generateChunkFamily);
  assert.equal(FAMILY_SPEC.solve, solveChunkFamily);
  assert.throws(() => generateChunkFamily({ seed: 0, caseId: 'chunk-window-loop', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateChunkFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateChunkFamily({ seed: 0.5, caseId: 'chunk-window-loop', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveChunkFamily({}), /Kapselform/);
  assert.throws(() => solveChunkFamily({ caseId: 'chunk-window-loop', text: '!!!!', size: 4, overlap: 2, snippet: 'x' }), /Kapselform/);
});
