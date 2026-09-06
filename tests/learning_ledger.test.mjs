// S3B contract: one event builder, one append path, no IndexedDB in the
// append signature. Review and evidence projections compose at the ledger
// snapshot helper — not inside learning_policy.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTERY_MAX_HINTS, instanceKey } from '../assets/js/domain/learning_policy.mjs';
import {
  buildInstanceId, buildLearningEvent, isJournalWorthy, journalFromAttempts,
} from '../assets/js/domain/learning_event.mjs';
import { createLearningLedger, evaluateLearningState } from '../assets/js/core/learning_ledger.mjs';
import { validateImportPayload } from '../assets/js/core/progress_store.js';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import { reviewStateFromAttempts } from '../assets/js/core/review_scheduler.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.UTC(2026, 0, 5);

const activity = (over = {}) => ({
  activityId: 'ex-1',
  definitionId: 'ex-1',
  exerciseId: 'ex-1',
  activityVersion: 3,
  competencyIds: ['c-a'],
  seed: 7,
  cycleId: 'cyc-1',
  ...over,
});

const competency = {
  competencyId: 'c-a',
  requires: [],
  evidencePolicy: {
    minimumIndependentHits: 1,
    minimumDistinctDefinitions: 1,
    delayedHitRequired: false,
    minimumDelayDays: 0,
    freshnessDays: 30,
  },
};

test('instance id is the policy triple and lives only in the builder', () => {
  assert.equal(buildInstanceId('ex-1', 'cyc-1', 7), 'ex-1:cyc-1:7');
  assert.equal(buildInstanceId('ex-1', 'cyc-1', 0), 'ex-1:cyc-1:0');
  const event = buildLearningEvent(activity({ eventType: 'attempt', correct: true, masteryEligible: true }));
  assert.equal(event.instanceId, 'ex-1:cyc-1:7');
  assert.equal(instanceKey(event), event.instanceId);
});

test('builder requires cycleId and eventType; views must not invent them', () => {
  assert.throws(() => buildLearningEvent(activity({ cycleId: undefined, eventType: 'attempt' })), /cycleId/);
  assert.throws(() => buildLearningEvent(activity({ eventType: undefined })), /eventType/);
});

test('attempt evidence uses the shared hint cap and reveal flag', () => {
  const ok = buildLearningEvent(activity({
    eventType: 'attempt', correct: true, masteryEligible: true, hintsUsed: MASTERY_MAX_HINTS,
  }));
  assert.equal(ok.evidenceEligible, true);
  assert.equal(ok.masteryEligible, true);

  const tooManyHints = buildLearningEvent(activity({
    eventType: 'attempt', correct: true, masteryEligible: true, hintsUsed: MASTERY_MAX_HINTS + 1,
  }));
  assert.equal(tooManyHints.evidenceEligible, false);

  const revealed = buildLearningEvent(activity({
    eventType: 'attempt', correct: true, masteryEligible: true, revealedSolution: true,
  }));
  assert.equal(revealed.evidenceEligible, false);
  assert.equal(revealed.revealedSolution, true);
});

test('solution reveal is eventType plus flag; assistance never qualifies', () => {
  const reveal = buildLearningEvent(activity({
    eventType: 'solution-revealed', hintsUsed: 1, event: 'solution-revealed',
  }));
  assert.equal(reveal.eventType, 'solution-revealed');
  assert.equal(reveal.revealedSolution, true);
  assert.equal(reveal.masteryEligible, false);
  assert.equal(reveal.evidenceEligible, false);

  const hint = buildLearningEvent(activity({
    eventType: 'hint-used', hintsUsed: 1, event: 'hint-1',
  }));
  assert.equal(hint.eventType, 'hint-used');
  assert.equal(hint.masteryEligible, false);
  assert.equal(hint.evidenceEligible, false);
});

test('project reports use the same instance triple with seed 0', () => {
  const report = buildLearningEvent({
    activityId: 'p-foundations-data-checker',
    definitionId: 'p-foundations-data-checker',
    exerciseId: 'p-foundations-data-checker',
    activityVersion: 2,
    competencyIds: ['c-a'],
    cycleId: 'cyc-p',
    seed: 0,
    eventType: 'project-report',
    event: 'validated-self-report',
    correct: true,
  });
  assert.equal(report.instanceId, 'p-foundations-data-checker:cyc-p:0');
  assert.equal(report.masteryEligible, false);
  assert.equal(report.evidenceEligible, false);
});

test('journal-worthy is incorrect with a diagnostic errorType, not invalid-input', () => {
  assert.equal(isJournalWorthy({ correct: false, errorType: 'wrong-value' }), true);
  assert.equal(isJournalWorthy({ correct: false, errorType: 'invalid-input' }), false);
  assert.equal(isJournalWorthy({ correct: true, errorType: 'wrong-value' }), false);
  assert.equal(isJournalWorthy({ correct: false, errorType: null }), false);
});

test('append takes only the event; IndexedDB is an injected sink', async () => {
  const written = [];
  const journal = [];
  const ledger = createLearningLedger({
    appendEvent: async (event) => {
      written.push(event);
      return { ...event, id: written.length };
    },
    addJournalEntry: async (entry) => { journal.push(entry); },
    getOrCreateCycle: async () => 'injected-cycle',
  });
  assert.equal(ledger.append.length, 1);
  const built = buildLearningEvent(activity({
    eventType: 'attempt', correct: false, errorType: 'wrong-value', answer: '999',
  }));
  const committed = await ledger.append(built);
  assert.equal(written.length, 1);
  assert.equal(written[0].instanceId, 'ex-1:cyc-1:7');
  assert.equal(committed.id, 1);
  assert.equal(journal.length, 1);
  assert.equal(journal[0].exerciseId, 'ex-1');
  assert.equal(journal[0].errorType, 'wrong-value');
  assert.equal(journal[0].note, '999');
});

test('record resolves cycle then builds; callers do not pass instanceId', async () => {
  const written = [];
  const ledger = createLearningLedger({
    appendEvent: async (event) => { written.push(event); return event; },
    addJournalEntry: async () => {},
    getOrCreateCycle: async (activityId) => {
      assert.equal(activityId, 'ex-1');
      return 'from-store';
    },
  });
  await ledger.record({
    activityId: 'ex-1',
    definitionId: 'ex-1',
    exerciseId: 'ex-1',
    activityVersion: 1,
    competencyIds: ['c-a'],
    seed: 4,
    eventType: 'worked-example-studied',
    event: 'studied',
  });
  assert.equal(written[0].cycleId, 'from-store');
  assert.equal(written[0].instanceId, 'ex-1:from-store:4');
  assert.equal(written[0].eventType, 'worked-example-studied');
  assert.equal(written[0].evidenceEligible, false);
});

test('evaluateLearningState returns both projections without importing policy engines into policy', () => {
  const hit = buildLearningEvent(activity({
    eventType: 'attempt',
    correct: true,
    masteryEligible: true,
    occurredAt: new Date(T0).toISOString(),
  }));
  const evaluated = evaluateLearningState(
    [hit],
    { competencies: [competency] },
    { reviewParams: { expandingSlotsWeeks: [2, 5, 11] } },
    T0 + 1,
  );
  assert.equal(evaluated.reviewsByDefinition['ex-1'].qualifiedHitCount, 1);
  assert.equal(evaluated.evidenceByCompetency['c-a'].state, 'demonstrated');
  assert.equal(reviewStateFromAttempts([hit], T0 + 1).qualified, true);
  assert.equal(new EvidenceEngine([competency]).evaluateCompetency('c-a', [hit], T0 + 1).state, 'demonstrated');
});

test('in-app import accepts only schema 3; v1 and v2 JSON exports are rejected', () => {
  const v3 = {
    schemaVersion: 3,
    exportedAt: '2026-08-29T12:00:00.000Z',
    data: {
      weeks: [],
      attempts: [{
        id: 42, exerciseId: 'w05-e1', seed: 511, answer: '1', correct: true, masteryEligible: true,
        hintsUsed: 0, revealedSolution: false, eventId: 'legacy:install-1:42', installationId: 'install-1',
        eventType: 'attempt', activityId: 'w05-e1', activityVersion: 'legacy-unknown',
        definitionId: 'w05-e1', instanceId: 'w05-e1:legacy:511', cycleId: 'legacy',
        competencyIds: ['c-linalg-matrices'], contentVersion: 'content-2026-08',
        occurredAt: '2026-08-20T10:00:00.000Z', recordedAt: '2026-08-29T12:00:00.000Z',
        evidenceEligible: true, exclusionCode: null,
      }],
      journal: [], settings: [], meta: [], reviewQueue: [], plans: [], drafts: [],
    },
  };
  assert.equal(validateImportPayload(v3).ok, true);
  assert.equal(validateImportPayload({ ...v3, schemaVersion: 1 }).ok, false);
  assert.equal(validateImportPayload({ ...v3, schemaVersion: 2 }).ok, false);
});

test('journal store is not equivalent to attempt derivation, so it stays', () => {
  const derived = journalFromAttempts([
    buildLearningEvent(activity({
      eventType: 'attempt', correct: false, errorType: 'wrong-value', answer: '9',
      occurredAt: '2026-08-20T10:00:00.000Z',
    })),
  ]);
  assert.equal(derived.length, 1);
  assert.equal(derived[0].exerciseId, 'ex-1');
  assert.equal(journalFromAttempts([]).length, 0);

  const store = readFileSync(join(root, 'assets/js/core/progress_store.js'), 'utf8');
  const reset = store.slice(store.indexOf('async resetExercise'), store.indexOf('async resetWeek'));
  assert.match(reset, /attempts/);
  assert.doesNotMatch(reset, /journal/);
});

test('live recorders do not build instance or cycle themselves', () => {
  const files = [
    'src/adapters/exercise-session.ts',
    'src/adapters/python-workspace.ts',
    'src/adapters/project-session.ts',
    'src/ui/ExerciseView.tsx',
    'src/ui/LabView.tsx',
    'src/ui/ProjectView.tsx',
  ];
  for (const relative of files) {
    const source = readFileSync(join(root, relative), 'utf8');
    assert.doesNotMatch(source, /buildInstanceId/, relative);
    assert.doesNotMatch(source, /getOrCreateCycle/, relative);
    assert.doesNotMatch(source, /addAttempt/, relative);
    assert.doesNotMatch(source, /addJournalEntry/, relative);
  }
  const runtime = readFileSync(join(root, 'assets/js/core/exercise_runtime.js'), 'utf8');
  assert.doesNotMatch(runtime, /progress\.addAttempt/);
  assert.doesNotMatch(runtime, /class ExerciseRuntime/);
});
