// Feedback-rule target contract (Session-B review fix): a `choice === 'x'`
// rule fires only on WRONG answers, so it must never target the correct
// choice, and every targeted id must exist in the exercise's choices.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packDir = join(root, 'content/exercises');

test('no feedback rule targets the correct choice; every choice target exists', () => {
  const offenders = [];
  const catalog = JSON.parse(readFileSync(join(root, 'content/catalog.json'), 'utf8'));
  const weekPacks = catalog.legacy?.exerciseFiles || [];
  const packs = weekPacks.map((f) => join(root, f.replace(/^(?:content\/)?/, 'content/')));
  for (const packPath of packs) {
    const pack = JSON.parse(readFileSync(packPath, 'utf8'));
    for (const ex of pack.exercises || []) {
      const rules = ex.feedbackRules || [];
      if (!rules.length || !ex.expectedAnswer?.correctChoice) continue;
      const ids = new Set((ex.choices || []).map((c) => c.id));
      for (const rule of rules) {
        const target = String(rule.if).match(/^choice === '(.+?)'$/)?.[1];
        if (!target) continue;
        if (!ids.has(target)) offenders.push(`${ex.exerciseId}: rule targets nonexistent choice '${target}'`);
        if (target === ex.expectedAnswer.correctChoice) offenders.push(`${ex.exerciseId}: rule targets the CORRECT choice '${target}' (fires only on wrong answers)`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});
