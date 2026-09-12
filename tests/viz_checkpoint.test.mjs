// Formative viz checkpoints: parser (German decimals, fractions),
// tolerance comparison, typicalErrors matching and contract validation.
// Nothing here touches persistence — checkpoints are formative by design.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertVizCheckpointContract,
  gradeVizCheckpoint,
  parseCheckpointNumber,
  parseCheckpointVector,
} from '../assets/js/core/viz_checkpoint_grader.mjs';
import { validateSourceDocument } from '../tools/compile_content.mjs';

const numeric = (extra = {}) => ({ prompt: 'Wert?', input: 'numeric', expected: 1.5, ...extra });
const vector = (extra = {}) => ({ prompt: 'Punkt?', input: 'vector', expected: [1, 2], ...extra });
const parse = (raw) => parseCheckpointNumber(raw).value;

test('parser accepts German decimals, dot decimals, signs and whitespace', () => {
  assert.equal(parse('1,5'), 1.5);
  assert.equal(parse('1.5'), 1.5);
  assert.equal(parse('-2'), -2);
  assert.equal(parse(' 4 '), 4);
  assert.equal(parse(',5'), 0.5);
  assert.equal(parse('.5'), 0.5);
  assert.equal(parse('−1'), -1); // unicode minus
});

test('parser accepts fractions incl. decimal numerator/denominator', () => {
  assert.equal(parse('3/4'), 0.75);
  assert.equal(parse('-1/2'), -0.5);
  assert.equal(parse('1,5/2'), 0.75);
  assert.equal(parse('6/3'), 2);
});

test('parser rejects empty, junk, ambiguous and scientific input', () => {
  for (const raw of ['', '   ', 'abc', '1,2,3', '1.2.3', '1/0', '1 2', '1e3', 'e3', '/', '1/', 'NaN', 'Infinity']) {
    assert.equal(parseCheckpointNumber(raw).ok, false, JSON.stringify(raw));
  }
});

test('vector parser takes two fields or (x; y) text', () => {
  assert.deepEqual(parseCheckpointVector(['1,5', '2']).value, [1.5, 2]);
  assert.deepEqual(parseCheckpointVector('1,5;2').value, [1.5, 2]);
  assert.deepEqual(parseCheckpointVector('(1,5; 2)').value, [1.5, 2]);
  assert.deepEqual(parseCheckpointVector('1 2').value, [1, 2]);
  assert.deepEqual(parseCheckpointVector('(1; -2)').value, [1, -2]);
});

test('vector parser rejects wrong arity and junk', () => {
  for (const raw of [['1'], ['1', 'a'], ['1', '2', '3'], '1,5', 'x;y', '']) {
    assert.equal(parseCheckpointVector(raw).ok, false, JSON.stringify(raw));
  }
});

test('numeric grading: correct inside tolerance, wrong outside', () => {
  assert.equal(gradeVizCheckpoint(numeric(), '1,5').correct, true);
  const wrong = gradeVizCheckpoint(numeric(), '1,4');
  assert.equal(wrong.correct, false);
  assert.match(wrong.verdictText, /Nicht richtig/);
});

test('numeric grading: German comma and fraction answers grade correctly', () => {
  assert.equal(gradeVizCheckpoint({ prompt: 'p', input: 'numeric', expected: 0.75 }, '3/4').correct, true);
  assert.equal(gradeVizCheckpoint(numeric(), '1,5').correct, true);
  assert.equal(gradeVizCheckpoint(numeric(), '1.5').correct, true);
});

test('numeric grading: default tolerance 1e-6', () => {
  // IEEE754: 1.500001 - 1.5 lands just under 1e-6, so the strict default
  // tolerance still passes for "one more decimal" answers — authors pick
  // explicit tolerances when they need tighter gates.
  assert.equal(gradeVizCheckpoint(numeric(), '1,5000005').correct, true);
  assert.equal(gradeVizCheckpoint(numeric(), '1,50001').correct, false); // diff ~1e-5
});

test('numeric grading: explicit tolerance, binary-safe boundary', () => {
  const checkpoint = numeric({ expected: 1, tolerance: 0.5 });
  assert.equal(gradeVizCheckpoint(checkpoint, '1,5').correct, true); // |1.5-1| = 0.5 exactly
  assert.equal(gradeVizCheckpoint(checkpoint, '1,51').correct, false);
});

test('numeric grading: unparseable input is ok:false with a hint, never throws', () => {
  const result = gradeVizCheckpoint(numeric(), 'abc');
  assert.equal(result.ok, false);
  assert.equal(result.correct, false);
  assert.match(result.verdictText, /Zahl/);
  assert.equal(gradeVizCheckpoint(numeric(), '').ok, false);
});

test('vector grading: componentwise within tolerance', () => {
  assert.equal(gradeVizCheckpoint(vector(), ['1', '2']).correct, true);
  assert.equal(gradeVizCheckpoint(vector(), ['2', '1']).correct, false);
  assert.equal(gradeVizCheckpoint(vector(), '(1; 2)').correct, true);
  assert.equal(gradeVizCheckpoint(vector({ tolerance: 0.5, expected: [0, 0] }), ['0,5', '-0,5']).correct, true);
  assert.equal(gradeVizCheckpoint(vector({ tolerance: 0.5, expected: [0, 0] }), ['0,51', '0']).correct, false);
});

test('typicalErrors: numeric match gives targeted feedback within tolerance', () => {
  const checkpoint = numeric({ expected: 1, tolerance: 0.5, typicalErrors: [{ match: 2, feedback: 'Verdoppelt statt halbiert.' }] });
  assert.equal(gradeVizCheckpoint(checkpoint, '2').verdictText, 'Verdoppelt statt halbiert.');
  assert.equal(gradeVizCheckpoint(checkpoint, '2,4').verdictText, 'Verdoppelt statt halbiert.'); // |2.4-2| <= 0.5
  assert.match(gradeVizCheckpoint(checkpoint, '2,6').verdictText, /Nicht richtig/); // outside tolerance
});

test('typicalErrors: vector match compares componentwise', () => {
  const checkpoint = vector({ typicalErrors: [{ match: [2, 1], feedback: 'Komponenten vertauscht.' }] });
  assert.equal(gradeVizCheckpoint(vector(), ['2', '1']).matchedTypicalError, null);
  assert.equal(gradeVizCheckpoint(checkpoint, ['2', '1']).verdictText, 'Komponenten vertauscht.');
});

test('typicalErrors: string match runs a substring check on the raw input', () => {
  const checkpoint = numeric({ expected: 4, typicalErrors: [{ match: '4/2', feedback: 'Bruch nicht gekürzt — das ist 2.' }] });
  assert.equal(gradeVizCheckpoint(checkpoint, '4/2').verdictText, 'Bruch nicht gekürzt — das ist 2.');
  assert.match(gradeVizCheckpoint(checkpoint, '2').verdictText, /Nicht richtig/);
});

test('typicalErrors: first matching entry wins, unmatched falls back to generic', () => {
  const checkpoint = numeric({
    expected: 1,
    typicalErrors: [
      { match: 'x', feedback: 'Erste Regel.' },
      { match: 9, feedback: 'Zweite Regel.' },
    ],
  });
  assert.equal(gradeVizCheckpoint(checkpoint, '9').verdictText, 'Zweite Regel.');
  const bothMatch = numeric({ expected: 1, typicalErrors: [{ match: 9, feedback: 'A' }, { match: 9, feedback: 'B' }] });
  assert.equal(gradeVizCheckpoint(bothMatch, '9').verdictText, 'A');
});

test('contract validation accepts valid checkpoints', () => {
  assert.ok(assertVizCheckpointContract(numeric()));
  assert.ok(assertVizCheckpointContract(vector({ tolerance: 0.01, hints: ['h1'], typicalErrors: [{ match: [0, 0], feedback: 'f' }, { match: 'x=0', feedback: 'f2' }] })));
});

test('contract validation rejects malformed checkpoints', () => {
  assert.throws(() => assertVizCheckpointContract(null, 'L:V'), /Objekt/);
  assert.throws(() => assertVizCheckpointContract({ prompt: 'p', input: 'numeric', expected: [1, 2] }, 'L:V'), /expected.*numeric/);
  assert.throws(() => assertVizCheckpointContract({ prompt: 'p', input: 'vector', expected: 3 }, 'L:V'), /expected.*vector/);
  assert.throws(() => assertVizCheckpointContract(numeric({ tolerance: 0 }), 'L:V'), /tolerance/);
  assert.throws(() => assertVizCheckpointContract(numeric({ tolerance: -1 }), 'L:V'), /tolerance/);
  assert.throws(() => assertVizCheckpointContract({ input: 'numeric', expected: 1 }, 'L:V'), /prompt/);
  assert.throws(() => assertVizCheckpointContract({ prompt: 'p', input: 'scalar', expected: 1 }, 'L:V'), /input/);
  assert.throws(() => assertVizCheckpointContract(numeric({ bogus: 1 }), 'L:V'), /unbekanntes Feld/);
  assert.throws(() => assertVizCheckpointContract(numeric({ hints: [''] }), 'L:V'), /hints/);
});

test('contract validation flags dead typicalErrors rules', () => {
  assert.throws(() => assertVizCheckpointContract(numeric({ typicalErrors: [{ match: [1, 2], feedback: 'f' }] }), 'L:V'), /nie greifen/);
  assert.throws(() => assertVizCheckpointContract(vector({ typicalErrors: [{ match: 5, feedback: 'f' }] }), 'L:V'), /nie greifen/);
  assert.throws(() => assertVizCheckpointContract(numeric({ typicalErrors: [{ match: true, feedback: 'f' }] }), 'L:V'), /match/);
  assert.throws(() => assertVizCheckpointContract(numeric({ typicalErrors: [{ match: 2 }] }), 'L:V'), /feedback/);
});

const spec = (checkpoint) => ({
  schemaVersion: 1,
  engine: 'jsxgraph',
  title: 'T',
  caption: 'C',
  boundingbox: [-5, 5, 5, -5],
  objects: [{ kind: 'point', at: [0, 0] }],
  ...(checkpoint === undefined ? {} : { checkpoint }),
});

test('schema: checkpoint is optional and accepts the full contract', () => {
  assert.ok(validateSourceDocument('visualization', spec(undefined)));
  assert.ok(validateSourceDocument('visualization', spec({ prompt: 'Wert?', input: 'numeric', expected: 1.5 })));
  assert.ok(validateSourceDocument('visualization', spec({
    prompt: 'Punkt $(x, y)$?', input: 'vector', expected: [1, 2], tolerance: 0.01,
    hints: ['h'], typicalErrors: [{ match: [0, 0], feedback: 'f' }, { match: 'x=0', feedback: 'f2' }, { match: 3, feedback: 'f3' }],
  })));
});

test('schema: malformed checkpoints fail closed', () => {
  const bad = [
    { prompt: 'p', input: 'numeric', expected: [1, 2] },              // expected shape vs. input
    { prompt: 'p', input: 'vector', expected: 3 },                   // scalar for vector
    { prompt: 'p', input: 'vector', expected: [1, 2, 3] },           // arity
    { prompt: 'p', input: 'numeric', expected: 1, tolerance: 0 },    // tolerance > 0
    { prompt: 'p', input: 'numeric', expected: 1, bogus: 1 },        // additionalProperties
    { input: 'numeric', expected: 1 },                               // missing prompt
    { prompt: 'p', input: 'scalar', expected: 1 },                   // input enum
    { prompt: 'p', input: 'numeric', expected: 1, typicalErrors: [{ match: 2 }] }, // missing feedback
  ];
  for (const checkpoint of bad) {
    assert.throws(() => validateSourceDocument('visualization', spec(checkpoint)), /visualization/, JSON.stringify(checkpoint));
  }
});
