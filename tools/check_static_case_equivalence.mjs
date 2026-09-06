#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const beforePath = process.argv[2] || '/home/ubuntu/static-before.json';
const before = JSON.parse(readFileSync(beforePath, 'utf8'));
const docs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const doc of docs) registerStaticCases(doc.familyId, doc.cases);
const registry = configureExerciseFamilies(docs);

for (const entry of before) {
  const instance = registry.instantiate(entry.familyId, 0, entry.difficultyProfile, entry.caseId);
  const actual = {
    parameters: Object.fromEntries(Object.entries(instance.parameters).filter(([key]) => !['caseId', 'difficulty'].includes(key))),
    expected: instance.expectedAnswer,
    prompt: instance.prompt,
    fullSolution: instance.fullSolution,
    ...(entry.body.choices ? { choices: instance.choices } : {}),
    ...(entry.body.activityType ? { activityType: instance.activityType } : {}),
    ...(entry.body.graderId ? { graderId: instance.graderId } : {}),
    ...(entry.body.traceTable ? { traceTable: instance.traceTable } : {}),
    ...(entry.body.rubric ? { rubric: instance.rubric } : {}),
  };
  const expected = { ...entry.body };
  assert.deepEqual(actual, expected, `${entry.familyId}:${entry.caseId}`);
}
console.log(`Static equivalence passed: ${before.length} cases`);
