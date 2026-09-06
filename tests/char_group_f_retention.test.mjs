// Characterization tests, group F — retention and compatibility contracts
// (Session B safety net). These tests pin TODAY's behavior of:
//   F1  ReviewScheduler timelines (expanding ladder +2/+5/+11 weeks,
//       repeat-last, consolidate import policy, exact-expiry mastery)
//   F2  post-course behavior (no W39/course-end gate anywhere in the
//       scheduling core — reviews keep extending at t0 + 400 days)
//   F3  EvidenceEngine freshness (freshnessDays, evidence-expired,
//       delayedHitRequired learning->retained, instance-scoped
//       solution-reveal disqualification)
//   F4  IndexedDB import/export compatibility as data-form tests
//       (schemaVersion 1/2/3 payloads, migration, offline tool)
//   F5  UI status language (structural: stateLabels, review sort field
//       names, progress snapshot shape)
// All time is injected; no IndexedDB, no network, no wall clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DAY_MS, WEEK_MS, DEFAULT_REVIEW_PARAMS,
  reviewStateFromAttempts, buildReviewQueueEntries,
} from '../assets/js/core/review_scheduler.js';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';
import * as progressStoreNs from '../assets/js/core/progress_store.js';
const { SCHEMA_VERSION, validateImportPayload, progress } = progressStoreNs;
import { migratePayloadToV3 } from '../assets/js/core/progress_migration.mjs';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import { CompetencyGraph } from '../assets/js/domain/competency_graph.mjs';
import { PlanEngine } from '../assets/js/domain/plan_engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.parse('2026-01-05T10:00:00.000Z'); // Monday
const iso = (ms) => new Date(ms).toISOString();

// Scheduler attempt fixture (same shape as tests/review_scheduler.test.mjs).
const hitAt = (tsMs, over = {}) => ({
  exerciseId: 'w05-e1', seed: 511, answer: '1', correct: true,
  hintsUsed: 0, revealedSolution: false, masteryEligible: true,
  ts: iso(tsMs), ...over,
});
const ladderHits = (start = T0) => {
  const t2 = start + 2 * WEEK_MS;
  const t3 = t2 + 5 * WEEK_MS;
  const t4 = t3 + 11 * WEEK_MS;
  return [hitAt(start), hitAt(t2), hitAt(t3), hitAt(t4)];
};

// --- F1: ReviewScheduler timeline contracts -----------------------------------

test('F1 ladder: 1st hit +2w, 2nd +5w, 3rd +11w, 4th+ repeats +11w (exact ms)', () => {
  const t2 = T0 + 2 * WEEK_MS;
  const t3 = t2 + 5 * WEEK_MS;
  const t4 = t3 + 11 * WEEK_MS;
  const t5 = t4 + 11 * WEEK_MS;
  const t6 = t5 + 11 * WEEK_MS;

  const s1 = reviewStateFromAttempts([hitAt(T0)], T0);
  assert.equal(s1.qualified, true);
  assert.equal(s1.qualifiedHitCount, 1);
  assert.equal(s1.validUntilMs, T0 + 2 * WEEK_MS);
  assert.equal(s1.nextDueMs, s1.validUntilMs, 'nextDueMs === validUntilMs');
  assert.equal(s1.consolidated, false);

  const s2 = reviewStateFromAttempts([hitAt(T0), hitAt(t2)], t2);
  assert.equal(s2.qualifiedHitCount, 2);
  assert.equal(s2.validUntilMs, t2 + 5 * WEEK_MS);

  const s3 = reviewStateFromAttempts([hitAt(T0), hitAt(t2), hitAt(t3)], t3);
  assert.equal(s3.qualifiedHitCount, 3);
  assert.equal(s3.validUntilMs, t3 + 11 * WEEK_MS);

  const s4 = reviewStateFromAttempts([...ladderHits()], t4);
  assert.equal(s4.qualifiedHitCount, 4);
  assert.equal(s4.consolidated, false, 'default policy is repeat-last');
  assert.equal(s4.validUntilMs, t4 + 11 * WEEK_MS);

  const s6 = reviewStateFromAttempts([...ladderHits(), hitAt(t5), hitAt(t6)], t6);
  assert.equal(s6.qualifiedHitCount, 6);
  assert.equal(s6.consolidated, false);
  assert.equal(s6.validUntilMs, t6 + 11 * WEEK_MS, 'repeat-last keeps +11w forever');
});

test('F1 consolidate: old-import policy nulls validity only once the ladder is exceeded', () => {
  const params = { ...DEFAULT_REVIEW_PARAMS, postLadderPolicy: 'consolidate' };
  // Exactly three hits: count (3) is NOT > slots.length (3) -> still timed.
  const atThree = reviewStateFromAttempts(ladderHits().slice(0, 3), T0, params);
  assert.equal(atThree.consolidated, false);
  assert.equal(atThree.validUntilMs, T0 + 2 * WEEK_MS + 5 * WEEK_MS + 11 * WEEK_MS);
  // Four hits: ladder exceeded -> consolidated, no deadline, no due date.
  const st = reviewStateFromAttempts(ladderHits(), T0, params);
  assert.equal(st.qualified, true);
  assert.equal(st.qualifiedHitCount, 4);
  assert.equal(st.validUntilMs, null);
  assert.equal(st.nextDueMs, null);
  assert.equal(st.consolidated, true);
});

test('F1 mastery: exact expiry moment is still mastered (nowMs <= validUntilMs)', () => {
  const due = T0 + 2 * WEEK_MS;
  const atBoundary = masteryFromAttempts([hitAt(T0)], due);
  assert.equal(atBoundary.mastered, true);
  assert.equal(atBoundary.reason, 'ok');
  assert.equal(atBoundary.validUntilMs, due);

  const after = masteryFromAttempts([hitAt(T0)], due + 1);
  assert.equal(after.mastered, false);
  assert.equal(after.reason, 'expired');
  assert.equal(after.validUntilMs, due);
  assert.equal(after.nextDueMs, due, 'expired mastery points at the missed due date');
});

test('F1 mastery: consolidated history never expires (import compatibility)', () => {
  const params = { ...DEFAULT_REVIEW_PARAMS, postLadderPolicy: 'consolidate' };
  const farFuture = T0 + 4000 * WEEK_MS;
  const s = masteryFromAttempts(ladderHits(), farFuture, params);
  assert.equal(s.mastered, true);
  assert.equal(s.reason, 'ok');
  assert.equal(s.consolidated, true);
  assert.equal(s.validUntilMs, undefined);
});

// --- F2: post-course behavior (no course-end gate) -----------------------------

const COURSE_END_MS = T0 + 400 * DAY_MS; // ~57 weeks, far beyond roadmap week 39

test('F2 post-course: repeat-last keeps extending hits far beyond the course end', () => {
  const postCourseHit = COURSE_END_MS + 3 * DAY_MS;
  const st = reviewStateFromAttempts([...ladderHits(), hitAt(postCourseHit)], postCourseHit + 1);
  assert.equal(st.qualified, true);
  assert.equal(st.qualifiedHitCount, 5);
  assert.equal(st.consolidated, false);
  assert.equal(st.validUntilMs, postCourseHit + 11 * WEEK_MS);

  const m = masteryFromAttempts([...ladderHits(), hitAt(postCourseHit)], postCourseHit + 10 * WEEK_MS);
  assert.equal(m.mastered, true, 'validity after the course end follows the ladder, not the calendar');
});

test('F2 post-course: review queue entries keep appearing at nowMs = t0 + 400 days', () => {
  const now = COURSE_END_MS;
  const entries = buildReviewQueueEntries([
    // Fresh post-course hit -> future due date.
    ...ladderHits().map((a, i) => (i === 3 ? { ...a, ts: iso(T0 + 18 * WEEK_MS) } : a)),
    hitAt(now, { seed: 777 }),
    // Long-overdue single hit -> entry still exists (time prunes nothing).
    { ...hitAt(T0), exerciseId: 'w05-e2', seed: 42 },
    // Never qualified -> no entry.
    { ...hitAt(T0, { correct: false }), exerciseId: 'w05-e3' },
  ], now);
  const byId = new Map(entries.map((e) => [e.exerciseId, e]));

  assert.deepEqual([...byId.keys()].sort(), ['w05-e1', 'w05-e2']);
  const e1 = byId.get('w05-e1');
  assert.equal(e1.qualifiedHitCount, 5);
  assert.equal(e1.nextDueAt, iso(now + 11 * WEEK_MS));
  assert.equal(e1.consolidated, false);
  assert.equal(e1.mode, 'expanding');
  assert.equal(e1.updatedAt, iso(now));
  const e2 = byId.get('w05-e2');
  assert.equal(e2.nextDueAt, iso(T0 + 2 * WEEK_MS), 'overdue entry stays in the queue with its past date');
});

test('F2 structural: scheduling core has no course-end/week-39 gate tokens', () => {
  const schedulingCore = [
    'assets/js/core/review_scheduler.js',
    'assets/js/core/progress_store.js',
    'assets/js/core/progress_migration.mjs',
    'tools/migrate_attempts_v3.mjs',
  ].map((rel) => join(root, rel));
  const gateToken = /w39|kursende|course[-_ ]?complete|courseEnd|course_end|curriculumEnd/i;
  for (const file of schedulingCore) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, gateToken, `${file} must not gate scheduling on the course end`);
  }
});

// --- F3: EvidenceEngine freshness contracts ------------------------------------

const DAY = 86_400_000;
const competencies = [
  {
    competencyId: 'fresh77',
    evidencePolicy: { minimumIndependentHits: 1, minimumDistinctDefinitions: 1, freshnessDays: 77 },
  },
  {
    competencyId: 'delayed',
    evidencePolicy: {
      minimumIndependentHits: 2, minimumDistinctDefinitions: 2, minimumDelayDays: 3,
      delayedHitRequired: true, freshnessDays: 30,
    },
  },
  {
    competencyId: 'inst',
    evidencePolicy: { minimumIndependentHits: 2, minimumDistinctDefinitions: 1, freshnessDays: 30 },
  },
  { competencyId: 'noPolicy' },
];
const engine = new EvidenceEngine(competencies);
// Evidence event; without instanceId the key is definitionId:cycle:seed
// (cycle defaults to legacy). A different seed is an independent instance.
const ev = (competencyId, definitionId, seed, tsMs, over = {}) => ({
  competencyIds: [competencyId], definitionId, seed,
  occurredAt: iso(tsMs), correct: true, masteryEligible: true,
  evidenceEligible: true, hintsUsed: 0, ...over,
});

test('F3 freshness: freshnessDays 77 -> dueAt = lastQualified + 77 days; boundary stays demonstrated', () => {
  const result = engine.evaluateCompetency('fresh77', [ev('fresh77', 'd-1', 1, T0)], T0 + 1);
  assert.equal(result.state, 'demonstrated');
  assert.deepEqual(result.reasonCodes, []);
  assert.equal(result.dueAt, iso(T0 + 77 * DAY));

  // Expiry comparison is strict: at exactly dueAt the evidence is still fresh.
  const atBoundary = engine.evaluateCompetency('fresh77', [ev('fresh77', 'd-1', 1, T0)], T0 + 77 * DAY);
  assert.equal(atBoundary.state, 'demonstrated');
  assert.equal(atBoundary.dueAt, iso(T0 + 77 * DAY));

  // One ms later the competency flips to review_due.
  const expired = engine.evaluateCompetency('fresh77', [ev('fresh77', 'd-1', 1, T0)], T0 + 77 * DAY + 1);
  assert.equal(expired.state, 'review_due');
  assert.deepEqual(expired.reasonCodes, ['evidence-expired']);
  assert.equal(expired.evidenceCount, 1);
  assert.equal(expired.lastQualifiedAt, iso(T0));
  assert.equal(expired.dueAt, iso(T0 + 77 * DAY), 'dueAt reports the missed deadline');
});

test('F3 freshness: a later qualified hit restores demonstrated with a new dueAt', () => {
  const t1 = T0 + 80 * DAY;
  const renewed = engine.evaluateCompetency(
    'fresh77',
    [ev('fresh77', 'd-1', 1, T0), ev('fresh77', 'd-1', 2, t1)],
    t1 + DAY,
  );
  assert.equal(renewed.state, 'demonstrated');
  assert.deepEqual(renewed.reasonCodes, []);
  assert.equal(renewed.evidenceCount, 2);
  assert.equal(renewed.dueAt, iso(t1 + 77 * DAY));
  assert.equal(renewed.lastQualifiedAt, iso(t1));
});

test('F3 freshness: policy without freshnessDays defaults to 30 days', () => {
  const result = engine.evaluateCompetency('noPolicy', [ev('noPolicy', 'd-9', 1, T0)], T0 + 1);
  assert.equal(result.state, 'demonstrated');
  assert.equal(result.dueAt, iso(T0 + 30 * DAY));
});

test('F3 delayedHitRequired: learning -> retained exactly at minimumDelayDays', () => {
  const hitA = ev('delayed', 'd-1', 1, T0);
  const learning = engine.evaluateCompetency('delayed', [hitA], T0 + DAY);
  assert.equal(learning.state, 'learning');
  assert.deepEqual(learning.reasonCodes, [
    'insufficient-independent-hits', 'insufficient-distinct-definitions', 'delayed-hit-missing',
  ]);

  // Gap of minimumDelayDays - 1 ms: still learning.
  const justShort = engine.evaluateCompetency(
    'delayed', [hitA, ev('delayed', 'd-2', 2, T0 + 3 * DAY - 1)], T0 + 3 * DAY,
  );
  assert.equal(justShort.state, 'learning');
  assert.ok(justShort.reasonCodes.includes('delayed-hit-missing'));

  // Gap of exactly minimumDelayDays (3): retained.
  const retained = engine.evaluateCompetency(
    'delayed', [hitA, ev('delayed', 'd-2', 2, T0 + 3 * DAY)], T0 + 3 * DAY + 1,
  );
  assert.equal(retained.state, 'retained');
  assert.deepEqual(retained.reasonCodes, []);
  assert.equal(retained.evidenceCount, 2);
  assert.equal(retained.distinctDefinitionCount, 2);
  assert.equal(retained.dueAt, iso(T0 + 3 * DAY + 30 * DAY));

  // A retained competency expires into review_due the same way.
  const due = engine.evaluateCompetency(
    'delayed', [hitA, ev('delayed', 'd-2', 2, T0 + 3 * DAY)], T0 + 33 * DAY + 1,
  );
  assert.equal(due.state, 'review_due');
  assert.deepEqual(due.reasonCodes, ['evidence-expired']);
});

test('F3 instances: a revealed solution disqualifies only its instance, not its definition', () => {
  const revealed = ev('inst', 'd-1', 100, T0, {
    eventType: 'solution-revealed', revealedSolution: true, correct: false, evidenceEligible: false,
  });
  // Same definition d-1, different seeds -> independent qualified instances.
  const events = [
    revealed,
    ev('inst', 'd-1', 200, T0 + DAY),
    ev('inst', 'd-1', 300, T0 + 2 * DAY),
  ];
  const ok = engine.evaluateCompetency('inst', events, T0 + 3 * DAY);
  assert.equal(ok.state, 'demonstrated');
  assert.equal(ok.evidenceCount, 2);
  assert.equal(ok.distinctDefinitionCount, 1, 'two instances of one definition satisfy minimumDistinctDefinitions 1');
  assert.deepEqual(ok.disqualifiedInstanceIds, ['d-1:legacy:100']);

  // With only one surviving instance the competency drops back to learning.
  const thin = engine.evaluateCompetency(
    'inst', [revealed, ev('inst', 'd-1', 200, T0 + DAY)], T0 + 2 * DAY,
  );
  assert.equal(thin.state, 'learning');
  assert.deepEqual(thin.reasonCodes, ['insufficient-independent-hits']);
  assert.deepEqual(thin.disqualifiedInstanceIds, ['d-1:legacy:100']);
});

// --- F4: IndexedDB compatibility (structural + data-form tests) -----------------

const legacyAttempt = (over = {}) => ({
  id: 42, exerciseId: 'w05-e1', seed: 511, answer: '1', correct: true,
  masteryEligible: true, hintsUsed: 0, revealedSolution: false,
  ts: '2026-08-20T10:00:00.000Z', ...over,
});
const migrationContext = {
  installationId: 'install-1',
  contentVersion: 'content-2026-08',
  competencyIdsByExercise: new Map([['w05-e1', ['c-linalg-matrices']]]),
  nowIso: '2026-08-29T12:00:00.000Z',
};
const payloadStores = (attempts) => ({
  weeks: [{ weekId: 'w05', selfMarked: true }],
  attempts,
  journal: [],
  settings: [{ key: 'theme', value: 'light' }],
  meta: [{ k: 'note', v: 'x' }],
  reviewQueue: [],
  plans: [],
  drafts: [],
});

test('F4 structural: SCHEMA_VERSION export and SUPPORTED_SCHEMA_VERSIONS [3] in source', () => {
  assert.equal(SCHEMA_VERSION, 3);
  const source = readFileSync(join(root, 'assets/js/core/progress_store.js'), 'utf8');

  const versionsMatch = source.match(/const SUPPORTED_SCHEMA_VERSIONS = \[([^\]]+)\]/);
  assert.ok(versionsMatch, 'SUPPORTED_SCHEMA_VERSIONS declaration found');
  const versions = versionsMatch[1]
    .split(',')
    .map((part) => part.trim())
    .map((part) => (part === 'SCHEMA_VERSION' ? SCHEMA_VERSION : Number(part)));
  assert.deepEqual(versions, [3], 'in-app import accepts only schemaVersion 3');
  // The constant is deliberately NOT exported — document that Node tests must
  // go through validateImportPayload instead of importing it.
  assert.equal('SUPPORTED_SCHEMA_VERSIONS' in progressStoreNs, false);
  assert.equal('STORE_VALIDATORS' in progressStoreNs, false);
});

test('F4 structural: store catalog (validators, created stores, import/export shape)', () => {
  const source = readFileSync(join(root, 'assets/js/core/progress_store.js'), 'utf8');
  const expectedStores = ['weeks', 'attempts', 'journal', 'settings', 'meta', 'reviewQueue', 'plans', 'drafts'];

  const block = source.slice(source.indexOf('const STORE_VALIDATORS'), source.indexOf('\n};', source.indexOf('const STORE_VALIDATORS')));
  const validatorKeys = [...block.matchAll(/^  ([a-zA-Z]+): \{/gm)].map((m) => m[1]);
  assert.deepEqual(validatorKeys, expectedStores, 'STORE_VALIDATORS covers exactly the eight stores');

  // The upgrade path guards every store with objectStoreNames.contains(...) —
  // that guard list is the authoritative store catalog; each store must also
  // have a createObjectStore call.
  const guarded = [...source.matchAll(/objectStoreNames\.contains\('([^']+)'\)/g)].map((m) => m[1]);
  assert.deepEqual(guarded, expectedStores, 'onupgradeneeded touches exactly the eight stores');
  for (const store of expectedStores) {
    assert.match(source, new RegExp(`createObjectStore\\('${store}'`), `object store ${store} is created on upgrade`);
  }

  const importStores = source.match(/const stores = \[([^\]]+)\]/);
  assert.ok(importStores, 'importAll transaction store list found');
  assert.deepEqual(
    importStores[1].split(',').map((s) => s.trim().replace(/'/g, '')),
    expectedStores,
    'importAll writes the same eight stores',
  );

  assert.match(
    source,
    /data: \{ weeks, attempts, journal, settings, meta, reviewQueue, plans, drafts \}/,
    'exportAll payload shape (JSON export form)',
  );
  assert.match(source, /schemaVersion: SCHEMA_VERSION, exportedAt: new Date\(\)\.toISOString\(\)/);
});

test('F4 node: the store module loads without IndexedDB and exports progress = null', () => {
  // Documents why exportAll/importAll are browser-only: in Node the module
  // intentionally degrades to a null progress singleton instead of throwing.
  assert.equal(progress, null);
});

test('F4 data form: only schemaVersion 3 payloads pass validateImportPayload', () => {
  const v1 = {
    schemaVersion: 1, exportedAt: '2026-08-20T00:00:00.000Z',
    data: {
      weeks: [{ weekId: 'w05', selfMarked: true }],
      attempts: [legacyAttempt()], journal: [], settings: [], meta: [],
    },
  };
  const v2 = { ...v1, schemaVersion: 2, data: { ...v1.data, reviewQueue: [{ exerciseId: 'w05-e1', nextDueAt: '2026-09-01T00:00:00.000Z' }] } };
  const v3Attempt = {
    ...legacyAttempt(), eventId: 'legacy:install-1:42', installationId: 'install-1',
    eventType: 'attempt', activityId: 'w05-e1', activityVersion: 'legacy-unknown',
    definitionId: 'w05-e1', instanceId: 'w05-e1:legacy:511', cycleId: 'legacy',
    competencyIds: ['c-linalg-matrices'], contentVersion: 'content-2026-08',
    occurredAt: '2026-08-20T10:00:00.000Z', recordedAt: '2026-08-29T12:00:00.000Z',
    evidenceEligible: true, exclusionCode: null,
  };
  const v3 = {
    schemaVersion: 3, exportedAt: '2026-08-29T12:00:00.000Z',
    data: payloadStores([v3Attempt]),
  };

  assert.equal(validateImportPayload(v1).ok, false, 'v1 JSON is not an in-app import');
  assert.equal(validateImportPayload(v2).ok, false, 'v2 JSON is not an in-app import');
  const { ok, errors } = validateImportPayload(v3);
  assert.equal(ok, true, `v3 import form accepted: ${JSON.stringify(errors)}`);
  assert.equal(validateImportPayload({ ...v3, schemaVersion: 0 }).ok, false);
  assert.equal(validateImportPayload({ ...v3, schemaVersion: 4 }).ok, false);
});

test('F4 data form: v1 and v2 migrate to the v3 event form and re-validate', () => {
  for (const schemaVersion of [1, 2]) {
    const payload = {
      schemaVersion, exportedAt: '2026-08-24T00:00:00.000Z',
      data: {
        weeks: [{ weekId: 'w05', selfMarked: true }],
        attempts: [legacyAttempt()], journal: [], settings: [], meta: [],
        reviewQueue: [{ exerciseId: 'w05-e1', nextDueAt: '2026-09-01T00:00:00.000Z' }],
      },
    };
    const migrated = migratePayloadToV3(payload, migrationContext);
    assert.equal(migrated.schemaVersion, 3);
    const [event] = migrated.data.attempts;
    assert.equal(event.eventId, 'legacy:install-1:42');
    assert.equal(event.eventType, 'attempt');
    assert.equal(event.evidenceEligible, true);
    assert.equal(event.exclusionCode, null);
    assert.equal(event.contentVersion, 'pre-v3', 'legacy imports are stamped pre-v3');
    const { ok, errors } = validateImportPayload(migrated);
    assert.equal(ok, true, `migrated ${schemaVersion} payload re-validates: ${JSON.stringify(errors)}`);
  }
});

test('F4 data form: v3 payloads pass through without the pre-v3 stamp', () => {
  const v3 = {
    schemaVersion: 3, exportedAt: '2026-08-29T12:00:00.000Z',
    data: payloadStores([legacyAttempt()]), // missing event fields -> normalized in place
  };
  const migrated = migratePayloadToV3(v3, migrationContext);
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.data.attempts[0].contentVersion, 'content-2026-08', 'v3 keeps the migration context version');
  const { ok, errors } = validateImportPayload(migrated);
  assert.equal(ok, true, JSON.stringify(errors));
});

test('F4 tool: migrate_attempts_v3.mjs turns a v1 export into a valid schema-3 file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ki-char-f-'));
  const input = join(dir, 'v1.json');
  const output = join(dir, 'v3.json');
  try {
    writeFileSync(input, JSON.stringify({
      schemaVersion: 1, exportedAt: '2026-08-20T00:00:00.000Z',
      data: {
        weeks: [], attempts: [legacyAttempt()], journal: [], settings: [], meta: [],
      },
    }));
    execFileSync(process.execPath, [join(root, 'tools/migrate_attempts_v3.mjs'), input, output]);
    const migrated = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(migrated.schemaVersion, 3);
    assert.equal(migrated.data.attempts.length, 1);
    assert.deepEqual(migrated.data.attempts[0].competencyIds, []);
    assert.equal(migrated.data.attempts[0].evidenceEligible, false);
    assert.equal(migrated.data.attempts[0].exclusionCode, 'legacy-unmapped');
    const { ok, errors } = validateImportPayload(migrated);
    assert.equal(ok, true, JSON.stringify(errors));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- F5: UI status language (structural assertions over the TS sources) ---------

const STATE_KEYS = ['demonstrated', 'learning', 'retained', 'review_due', 'unassessed'];

test('F5 stateLabels: exactly the five canonical learner states, labeled in German', () => {
  const source = readFileSync(join(root, 'src/ui/views.tsx'), 'utf8');
  const block = source.slice(source.indexOf('const stateLabels'), source.indexOf('};', source.indexOf('const stateLabels')));
  const entries = [...block.matchAll(/^\s{2}([a-z_]+): '([^']+)',$/gm)];
  const keys = entries.map((m) => m[1]).sort();
  assert.deepEqual(keys, STATE_KEYS, 'stateLabels has exactly unassessed/learning/demonstrated/review_due/retained');
  for (const [, key, label] of entries) {
    assert.match(label, /^[A-ZÄÖÜ]/, `label for ${key} is a capitalized German string`);
  }
  assert.match(source, /\{stateLabels\[state\]\}/, 'views render the label through the state key');
});

test('F5 types: EvidenceState union matches stateLabels exactly (no orphan status)', () => {
  const source = readFileSync(join(root, 'src/app/types.ts'), 'utf8');
  const match = source.match(/export type EvidenceState = ([^;]+);/);
  assert.ok(match, 'EvidenceState type exported in src/app/types.ts');
  const states = [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(states, STATE_KEYS);
});

test('F5 plan adapter: reviews reach the planner as dueAt from DueReview.nextDueAt', () => {
  const source = readFileSync(join(root, 'src/adapters/learning-plan.ts'), 'utf8');
  // Documents today's field name: the queue stores nextDueAt, the plan sorts
  // by dueAt. Catalog-foreign reviews are filtered before the map (dead-link
  // fix), so the map runs over the actionable subset.
  assert.match(source, /dueAt: review\.nextDueAt/);
  assert.match(source, /actionableReviews\.map\(\(review\) =>/);
});

test('F5 plan behavior: PlanEngine sorts reviews by dueAt (empty first, then date, activityId tiebreak)', () => {
  const graph = new CompetencyGraph([{ competencyId: 'f-a', requires: [] }]);
  const planner = new PlanEngine(graph, { reviewBudgetRatio: 1 });
  const plan = planner.build({
    goalCompetencyIds: ['f-a'],
    availableMinutes: 100,
    availableDays: 1,
    evidenceByCompetency: { 'f-a': { state: 'retained' } },
    activities: [
      { activityId: 'r-b', type: 'review', competencyIds: ['f-a'], estimatedMinutes: 10, dueAt: iso(T0 + 8 * WEEK_MS) },
      { activityId: 'r-none', type: 'review', competencyIds: ['f-a'], estimatedMinutes: 10 },
      { activityId: 'r-a2', type: 'review', competencyIds: ['f-a'], estimatedMinutes: 10, dueAt: iso(T0 + 22 * WEEK_MS) },
      { activityId: 'r-c', type: 'review', competencyIds: ['f-a'], estimatedMinutes: 10, dueAt: iso(T0 + DAY) },
      { activityId: 'r-a1', type: 'review', competencyIds: ['f-a'], estimatedMinutes: 10, dueAt: iso(T0 + 22 * WEEK_MS) },
    ],
  });
  assert.deepEqual(
    plan.items.filter((item) => item.type === 'review').map((item) => item.activityId),
    ['r-none', 'r-c', 'r-b', 'r-a1', 'r-a2'],
    'sort key: String(dueAt || "") localeCompare, then activityId',
  );
});

test('F5 local-progress: snapshot exposes dueReviews + evidenceStates with documented field names', () => {
  const source = readFileSync(join(root, 'src/adapters/local-progress.ts'), 'utf8');
  const dueReview = source.slice(source.indexOf('export interface DueReview'), source.indexOf('}', source.indexOf('export interface DueReview')));
  assert.match(dueReview, /exerciseId: string;/);
  assert.match(dueReview, /nextDueAt: string;/);
  assert.match(dueReview, /qualifiedHitCount: number;/);

  const snapshot = source.slice(source.indexOf('export interface ProgressSnapshot'), source.indexOf('}', source.indexOf('export interface ProgressSnapshot')));
  assert.match(snapshot, /dueReviews: DueReview\[\]/);
  assert.match(snapshot, /evidenceStates: Record<string, EvidenceState>/);

  // Behavior wiring: evaluateLearningState feeds both projections from
  // attempts, and a fresh install reports every competency as unassessed.
  assert.match(source, /evaluateLearningState\(attempts, catalog, \{ reviewParams \}/);
  assert.match(source, /entry\.nextDueAt <= nowIso/);
  assert.match(source, /evaluated\.evidenceByCompetency/);
  assert.match(source, /\[item\.competencyId, 'unassessed'\]/);
});

// --- v3 import time-field validation (Session-B review fix) -------------------

const tsFixture = () => ({
  eventId: 'legacy:install-9:7', installationId: 'install-9',
  exerciseId: 'w05-e1', seed: 511, answer: '1', correct: true, hintsUsed: 0,
  eventType: 'attempt', activityId: 'w05-e1', activityVersion: 'legacy-unknown',
  definitionId: 'w05-e1', instanceId: 'w05-e1:legacy:511', cycleId: 'legacy',
  competencyIds: ['c-linalg-matrices'], contentVersion: 'content-2026-08',
  occurredAt: '2026-08-20T10:00:00.000Z', recordedAt: '2026-08-29T12:00:00.000Z',
  evidenceEligible: true, exclusionCode: null, masteryEligible: true, revealedSolution: false,
});

test('F4 import: a v3 attempt with an unparseable optional ts is rejected', () => {
  const { ok, errors } = validateImportPayload({
    schemaVersion: 3,
    data: {
      weeks: [], journal: [], settings: [], meta: [], reviewQueue: [], plans: [], drafts: [],
      attempts: [{ ...tsFixture(), ts: 'not-a-date' }],
    },
  });
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('ts ist ungültig')), errors.join(' | '));
});

test('F4 import: a v3 attempt with a valid ts passes (ts stays optional)', () => {
  const { ok } = validateImportPayload({
    schemaVersion: 3,
    data: {
      weeks: [], journal: [], settings: [], meta: [], reviewQueue: [], plans: [], drafts: [],
      attempts: [{ ...tsFixture(), ts: '2026-08-20T09:59:55.000Z' }],
    },
  });
  assert.equal(ok, true);
});
