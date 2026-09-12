import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keeps explanation `diagnosticCodes` inside the canonical taxonomy
// documented in docs/authoring-guide.md §8 („diagnosticCodes-Taxonomie").
// Two directions: (1) every code used in content/explanations must be a
// known code, (2) every errorType literal the graders emit must be listed
// in the canonical set, so a new grader errorType fails loudly until the
// taxonomy is updated.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CANONICAL_CODES = new Set([
  // deterministic grader errorTypes (assets/js/core/graders.js)
  'invalid-input',
  'wrong-value',
  'wrong-choice',
  'swapped',
  'wrong-order',
  'wrong-output',
  'unparsed',
  'not-equivalent',
  'grader-error',
  'missing-choice',
  'extra-choice',
  'missing-diagnosis',
  'wrong-gap',
  // domain misconception codes grounded in family feedbackRules
  'off-by-one',
  'except-pass',
  'missing-before-hash',
]);

// Dynamic code families that cannot be enumerated statically.
const CANONICAL_PATTERNS = [
  /^trace-row-\d+$/, // interactive trace table, first wrong row (1-based)
  /^[A-Z][A-Za-z]*Error$/, // Python runtime: SyntaxError, ValueError, PythonError, WorkdirError, ...
  /^(Timeout|WorkerRestarted|PackageError)$/,
];

function isCanonical(code) {
  return CANONICAL_CODES.has(code) || CANONICAL_PATTERNS.some((p) => p.test(code));
}

function* explanationFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* explanationFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

test('every explanation diagnosticCode belongs to the canonical taxonomy', () => {
  const dir = join(root, 'content', 'explanations');
  const files = [...explanationFiles(dir)];
  assert.ok(files.length > 0, 'keine Explanation-Karten gefunden');
  for (const file of files) {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    for (const code of doc.diagnosticCodes || []) {
      assert.ok(isCanonical(code), `${doc.explanationId}: unbekannter diagnosticCode '${code}' — Taxonomie in docs/authoring-guide.md §8 prüfen`);
    }
  }
});

test('every errorType literal emitted by graders.js is in the taxonomy', () => {
  const source = readFileSync(join(root, 'assets', 'js', 'core', 'graders.js'), 'utf8');
  const emitted = new Set();
  for (const line of source.split('\n')) {
    if (!line.includes('errorType')) continue;
    for (const match of line.matchAll(/'([a-z][a-z0-9-]*)'/g)) emitted.add(match[1]);
  }
  for (const code of emitted) {
    assert.ok(isCanonical(code), `graders.js emittiert nicht-kanonischen errorType '${code}' — Taxonomie in docs/authoring-guide.md §8 nachziehen`);
  }
});
