// S3A contract: one LearningPolicy for identity, time, hints and reveal.
// ReviewScheduler and EvidenceEngine keep their projections; they must not
// reimplement these rules. Differentials at the bottom prove both engines
// now read the same event the same way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstanceId } from '../assets/js/core/exercise_runtime.js';
import {
  reviewStateFromAttempts, attemptInstanceKey, isQualifiedHit as reviewIsQualifiedHit,
} from '../assets/js/core/review_scheduler.js';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import {
  MASTERY_MAX_HINTS, clampMaxHints, instanceKey, eventTimeMs,
  isSolutionReveal, isQualifiedHit,
} from '../assets/js/domain/learning_policy.mjs';

const T0 = Date.UTC(2026, 0, 5);
const later = T0 + 7 * 86_400_000;

const event = (over = {}) => ({
  exerciseId: 'ex-1',
  definitionId: 'ex-1',
  competencyIds: ['c-a'],
  cycleId: 'cyc-1',
  seed: 7,
  correct: true,
  masteryEligible: true,
  evidenceEligible: true,
  hintsUsed: 0,
  revealedSolution: false,
  ts: new Date(T0).toISOString(),
  occurredAt: new Date(T0).toISOString(),
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

test('hint cap is 1; settings and engine constructors cannot raise it', () => {
  assert.equal(MASTERY_MAX_HINTS, 1);
  assert.equal(clampMaxHints(0), 0);
  assert.equal(clampMaxHints(1), 1);
  assert.equal(clampMaxHints(2), 1);
  assert.equal(clampMaxHints(-1), 1);
  assert.equal(clampMaxHints(99), 1);
  assert.equal(clampMaxHints('x'), 1);
});

test('instanceId wins; fallback is definition, cycle, seed', () => {
  assert.equal(instanceKey({ instanceId: 'pinned', definitionId: 'd', cycleId: 'c', seed: 1 }), 'pinned');
  assert.equal(instanceKey({ definitionId: 'd', exerciseId: 'e', cycleId: 'c', seed: 9 }), 'd:c:9');
  assert.equal(instanceKey({ exerciseId: 'e', cycleId: 'c', seed: 9 }), 'e:c:9');
  assert.equal(instanceKey({ exerciseId: 'e', seed: 9 }), 'e:legacy:9');
  assert.equal(instanceKey({ exerciseId: 'e', cycleId: 'c' }), 'e:c:0');
  assert.equal(instanceKey({}), 'unknown:legacy:0');
  assert.equal(instanceKey(null), 'unknown:legacy:0');
  assert.equal(attemptInstanceKey({ exerciseId: 'e', cycleId: 'c', seed: 9 }), 'e:c:9');
  assert.equal(
    instanceKey({ definitionId: 'ex-1', cycleId: 'cyc-1', seed: 7 }),
    buildInstanceId('ex-1', 'cyc-1', 7),
  );
});

test('occurredAt is canonical; garbage is skipped; missing time may fall back', () => {
  assert.equal(eventTimeMs({ occurredAt: new Date(later).toISOString(), ts: new Date(T0).toISOString() }), later);
  assert.equal(eventTimeMs({ occurredAt: 'nope', ts: new Date(T0).toISOString() }), T0);
  assert.equal(eventTimeMs({ ts: 'nope', occurredAt: new Date(later).toISOString() }), later);
  assert.equal(eventTimeMs({ occurredAt: later }), later);
  assert.equal(eventTimeMs({ ts: T0 }), T0);
  assert.equal(eventTimeMs({}, T0), T0);
  assert.equal(eventTimeMs({ occurredAt: 'nope', ts: 'also-nope' }, null), null);
});

test('a qualified hit is correct, eligible, and within the hint cap', () => {
  assert.equal(isQualifiedHit(event({ hintsUsed: 1 })), true);
  assert.equal(isQualifiedHit(event({ hintsUsed: 2 })), false);
  assert.equal(isQualifiedHit(event({ correct: false })), false);
  assert.equal(isQualifiedHit(event({ masteryEligible: false })), false);
  assert.equal(isQualifiedHit(event({ evidenceEligible: false })), false);
  assert.equal(isQualifiedHit(event({ hintsUsed: 2 }), { maxHints: 99 }), false);
  assert.equal(reviewIsQualifiedHit(event({ hintsUsed: 1 })), true);
  assert.equal(reviewIsQualifiedHit(event({ evidenceEligible: false })), false);
});

test('solution reveal is the flag or the event type, and it is per instance', () => {
  assert.equal(isSolutionReveal(event({ revealedSolution: true })), true);
  assert.equal(isSolutionReveal(event({ eventType: 'solution-revealed' })), true);
  assert.equal(isSolutionReveal(event()), false);
});

test('both engines follow occurredAt when ts disagrees', () => {
  const row = event({
    instanceId: 'ex-1:cyc-1:7',
    ts: new Date(T0).toISOString(),
    occurredAt: new Date(later).toISOString(),
  });
  const review = reviewStateFromAttempts([row], later + 1);
  assert.equal(review.lastQualifiedAtMs, later);

  const evidence = new EvidenceEngine([competency]).evaluateCompetency('c-a', [row], later + 1);
  assert.equal(evidence.lastQualifiedAt, new Date(later).toISOString());
});

test('without instanceId both engines use definition:cycle:seed', () => {
  const hit = event();
  delete hit.instanceId;
  const reveal = event({
    correct: false,
    evidenceEligible: false,
    revealedSolution: true,
    eventType: 'solution-revealed',
    ts: new Date(T0 + 1).toISOString(),
    occurredAt: new Date(T0 + 1).toISOString(),
  });
  delete reveal.instanceId;

  assert.equal(instanceKey(hit), 'ex-1:cyc-1:7');
  const review = reviewStateFromAttempts([hit, reveal], T0 + 2);
  assert.equal(review.qualified, false);

  const evidence = new EvidenceEngine([competency]).evaluateCompetency('c-a', [hit, reveal], T0 + 2);
  assert.deepEqual(evidence.disqualifiedInstanceIds, ['ex-1:cyc-1:7']);
  assert.equal(evidence.evidenceCount, 0);
});

test('a later cycle stays open after a reveal on the same seed', () => {
  const c1 = 'ex-1:cyc-1:7';
  const c2 = 'ex-1:cyc-2:7';
  const attempts = [
    event({ instanceId: c1 }),
    event({
      instanceId: c1,
      ts: new Date(T0 + 1).toISOString(),
      occurredAt: new Date(T0 + 1).toISOString(),
      correct: false,
      revealedSolution: true,
      eventType: 'solution-revealed',
    }),
    event({
      instanceId: c2,
      ts: new Date(T0 + 2).toISOString(),
      occurredAt: new Date(T0 + 2).toISOString(),
    }),
  ];
  const open = reviewStateFromAttempts(attempts, T0 + 3, undefined, c2);
  assert.equal(open.locked, false);
  assert.equal(open.qualified, true);
});
