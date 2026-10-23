import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const corpus = JSON.parse(readFileSync(resolve('tests/fixtures/scene-build-golden-corpus.json'), 'utf8'));

test('scene-build attempts survive IndexedDB and JSON replacement import with ordered steps', async ({ page }) => {
  await page.goto('/');
  const actual = await page.evaluate(async (entries) => {
    const storePath = '/assets/js/core/progress_store.js';
    const eventPath = '/assets/js/domain/learning_event.mjs';
    const graderPath = '/assets/js/core/graders.js';
    const { progress, validateImportPayload, SCHEMA_VERSION } = await import(/* @vite-ignore */ storePath);
    const { buildLearningEvent } = await import(/* @vite-ignore */ eventPath);
    const { graders } = await import(/* @vite-ignore */ graderPath);
    for (const [index, entry] of entries.entries()) {
      const outcome = await graders.deterministic.grade({
        activityType: 'scene-build', parameters: entry.parameters,
        expectedAnswer: { kind: 'scene-properties', model: entry.model },
      }, entry.answer);
      if (!outcome.correct) throw new Error(`Golden scene ${entry.id} failed in the browser`);
      await progress.addAttempt(buildLearningEvent({
        exerciseId: `${entry.id}:seeded`, activityType: 'scene-build', cycleId: 's4a-roundtrip', seed: index,
        eventType: 'attempt', answer: entry.answer, masteryEligible: true, correct: outcome.correct,
        competencyIds: ['c-foundations-algebra'],
      }));
    }
    const first = JSON.parse(JSON.stringify(await progress.exportAll()));
    if (!validateImportPayload(first).ok) throw new Error('Export is not importable');
    await progress.importAll(first);
    const second = JSON.parse(JSON.stringify(await progress.exportAll()));
    const damaged = structuredClone(second);
    damaged.data.attempts[0].answer.schemaVersion = 99;
    let rejected = false;
    try { await progress.importAll(damaged); } catch { rejected = true; }
    const afterRejected = JSON.parse(JSON.stringify(await progress.exportAll()));
    return {
      schema: SCHEMA_VERSION, before: first.data.attempts, after: second.data.attempts,
      afterRejected: afterRejected.data.attempts, rejected,
      reviews: second.data.reviewQueue.map((entry: { exerciseId: string }) => entry.exerciseId).sort(),
    };
  }, corpus.cases);
  expect(actual.schema).toBe(3);
  expect(actual.before).toHaveLength(corpus.cases.length);
  expect(actual.after).toEqual(actual.before);
  expect(actual.after.map((entry: { answer: unknown }) => entry.answer)).toEqual(corpus.cases.map((entry: { answer: unknown }) => entry.answer));
  expect(actual.rejected).toBe(true);
  expect(actual.afterRejected).toEqual(actual.after);
  expect(actual.reviews).toEqual(corpus.cases.map((entry: { id: string }) => `${entry.id}:seeded`).sort());
});
