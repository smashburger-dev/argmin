// Procedural family trace-chunk-window-loop: capsule gates.
// Run: node --test tests/procedural_chunk_window_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/trace-chunk-window-loop.mjs';
import { predictCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHUNK_DEF = mod.CHUNK_CASES['chunk-window-loop'];

// Independent JS mirror of the Python while-loop: the solver and the expected
// output must both agree with this recomputation for every drawn instance.
const refParts = (text, size, overlap) => {
  const parts = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    parts.push(text.slice(start, start + size));
  }
  return parts;
};

predictCapsuleSuite('trace-chunk-window-loop', mod, [
  { caseId: 'chunk-window-loop', difficulty: 'core' },
], { familyGroup: 'trace-state', difficultyProfiles: ['core'] });

test('anchor extras: expected form, base solution and oracle self-consistency', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/trace-chunk-window-loop.json'), 'utf8'));
  const body = doc.cases.find((item) => item.caseId === 'chunk-window-loop');
  assert.deepEqual(body.expected, { kind: 'output-lines', output: CHUNK_DEF.baseOutput }, 'expected form');
  assert.equal(body.fullSolution, CHUNK_DEF.baseSolution, 'solution verbatim');
  assert.equal(CHUNK_DEF.baseOutput, '4\ngh');
  assert.deepEqual(refParts('abcdefgh', 4, 2), ['abcd', 'cdef', 'efgh', 'gh']);
});

test('expected output: solver recomputes the prediction deterministically', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genChunkCase(seed, 'chunk-window-loop', CHUNK_DEF);
    const parts = refParts(generated.parameters.text, generated.parameters.size, generated.parameters.overlap);
    const want = `${parts.length}\n${parts.at(-1)}`;
    assert.equal(generated.expected.kind, 'output-lines', 'expected form like base case');
    assert.equal(generated.expected.output, want, `${seed}: expected output`);
    assert.deepEqual(mod.solveChunkFamily(generated.parameters), { output: want }, `${seed}: solve output`);
    assert.deepEqual(mod.chunkParts(generated.parameters.text, generated.parameters.size, generated.parameters.overlap), parts);
    // the last window is a possibly truncated suffix, count line is an int
    const [countLine, lastLine] = generated.expected.output.split('\n');
    assert.equal(Number(countLine), parts.length, 'first line is the window count');
    assert.ok(generated.parameters.text.endsWith(lastLine), 'last window is a text suffix');
    assert.ok(lastLine.length <= generated.parameters.size, 'last window at most size chars');
    // the snippet carries the drawn literals
    assert.ok(generated.parameters.snippet.includes(`text = "${generated.parameters.text}"`), 'snippet carries drawn text');
    assert.ok(
      generated.parameters.snippet.includes(`chunk(text, ${generated.parameters.size}, ${generated.parameters.overlap})`),
      'snippet carries drawn size/overlap',
    );
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genChunkCase(seed, 'chunk-window-loop', CHUNK_DEF);
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

test('family extras: contract fields and broken-parameter error path', () => {
  assert.equal(mod.CHUNK_CONTRACT.taskArchetype, 'output-predict-lines');
  assert.deepEqual(mod.CHUNK_CONTRACT.competencyIds, ['c-genai-rag', 'c-python-reading']);
  assert.deepEqual(mod.CHUNK_CONTRACT.caseTypes, [
    { caseId: 'chunk-window-loop', propertyTest: false },
  ]);
  assert.throws(
    () => mod.solveChunkFamily({ caseId: 'chunk-window-loop', text: '!!!!', size: 4, overlap: 2, snippet: 'x' }),
    /Kapselform/,
  );
});
