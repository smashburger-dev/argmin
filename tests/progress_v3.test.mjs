import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  migratePayloadToV3,
  normalizeAttemptV3,
} from '../assets/js/core/progress_migration.mjs';
import { validateImportPayload } from '../assets/js/core/progress_store.js';

const context = {
  installationId: 'install-1',
  contentVersion: 'pre-v3',
  competencyIdsByExercise: new Map([
    ['w05-e1', ['c-linalg-matrices']],
    ['w05-e3', ['c-linalg-independence']],
  ]),
  nowIso: '2026-08-29T12:00:00.000Z',
};

const legacyAttempt = (over = {}) => ({
  id: 42,
  exerciseId: 'w05-e1',
  seed: 511,
  answer: '1',
  correct: true,
  masteryEligible: true,
  hintsUsed: 0,
  revealedSolution: false,
  ts: '2026-08-20T10:00:00.000Z',
  ...over,
});

test('legacy attempts normalize to stable versioned learning events', () => {
  const event = normalizeAttemptV3(legacyAttempt(), context);
  assert.equal(event.eventId, 'legacy:install-1:42');
  assert.equal(event.installationId, 'install-1');
  assert.equal(event.eventType, 'attempt');
  assert.equal(event.activityId, 'w05-e1');
  assert.equal(event.definitionId, 'w05-e1');
  assert.equal(event.activityVersion, 'legacy-unknown');
  assert.equal(event.contentVersion, 'pre-v3');
  assert.equal(event.cycleId, 'legacy');
  assert.equal(event.instanceId, 'w05-e1:legacy:511');
  assert.deepEqual(event.competencyIds, ['c-linalg-matrices']);
  assert.equal(event.occurredAt, '2026-08-20T10:00:00.000Z');
  assert.equal(event.recordedAt, '2026-08-29T12:00:00.000Z');
  assert.equal(event.evidenceEligible, true);
  assert.equal(event.exclusionCode, null);
});

test('legacy help and unknown exercises remain visible but cannot become evidence', () => {
  const help = normalizeAttemptV3(legacyAttempt({ id: 43, event: 'hint-2', correct: false }), context);
  assert.equal(help.eventType, 'hint-used');
  assert.equal(help.evidenceEligible, false);
  assert.equal(help.exclusionCode, 'assistance-event');

  const unknown = normalizeAttemptV3(legacyAttempt({ id: 44, exerciseId: 'w99-e1', evidenceEligible: true }), context);
  assert.deepEqual(unknown.competencyIds, []);
  assert.equal(unknown.evidenceEligible, false);
  assert.equal(unknown.exclusionCode, 'legacy-unmapped');
});

test('in-app import rejects v2 JSON; the offline tool still migrates it', () => {
  const payload = {
    schemaVersion: 2,
    exportedAt: '2026-08-24T00:00:00.000Z',
    data: {
      weeks: [{ weekId: 'w05', selfMarked: true }],
      attempts: [legacyAttempt()],
      journal: [{ id: 1, exerciseId: 'w05-e1', errorType: 'wrong-value' }],
      settings: [{ key: 'theme', value: 'light' }],
      meta: [{ k: 'migrated', v: { found: false } }],
      reviewQueue: [{ exerciseId: 'w05-e1', nextDueAt: '2026-09-01T00:00:00.000Z' }],
    },
  };
  const rejected = validateImportPayload(payload);
  assert.equal(rejected.ok, false);
  assert.ok(rejected.errors.some((error) => /schemaVersion/.test(error)));
  const migrated = migratePayloadToV3(payload, context);
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.data.attempts.length, 1);
  assert.equal(migrated.data.attempts[0].eventId, 'legacy:install-1:42');
  assert.deepEqual(migrated.data.plans, []);
  assert.deepEqual(migrated.data.drafts, []);
  assert.deepEqual(migrated.data.weeks, payload.data.weeks);
  assert.deepEqual(migrated.data.journal, payload.data.journal);
  assert.equal(validateImportPayload(migrated).ok, true);
});

test('offline migration tool writes a separate schema-3 export', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ki-progress-v3-'));
  const input = join(dir, 'v2.json');
  const output = join(dir, 'v3.json');
  try {
    writeFileSync(input, JSON.stringify({
      schemaVersion: 2,
      exportedAt: context.nowIso,
      data: {
        weeks: [], attempts: [legacyAttempt()], journal: [], settings: [], meta: [], reviewQueue: [],
      },
    }));
    execFileSync(process.execPath, [
      fileURLToPath(new URL('../tools/migrate_attempts_v3.mjs', import.meta.url)),
      input, output, '--installation-id', 'tool-install',
    ]);
    const migrated = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(migrated.schemaVersion, 3);
    assert.equal(migrated.data.attempts[0].eventId, 'legacy:tool-install:42');
    assert.deepEqual(migrated.data.plans, []);
    assert.deepEqual(migrated.data.drafts, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('schema 3 accepts canonical non-week activity ids', () => {
  const event = normalizeAttemptV3(legacyAttempt({ exerciseId: 'f-collections-choice-01' }), {
    ...context,
    competencyIdsByExercise: new Map([['f-collections-choice-01', ['c-python-collections']]]),
  });
  const payload = {
    schemaVersion: 3,
    exportedAt: context.nowIso,
    data: {
      weeks: [], attempts: [event], journal: [], settings: [], meta: [], plans: [], drafts: [],
      reviewQueue: [{ exerciseId: 'f-collections-choice-01', nextDueAt: '2026-09-01T00:00:00.000Z' }],
    },
  };
  const result = validateImportPayload(payload);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test('schema 3 import validation rejects duplicate or incomplete event ids', () => {
  const event = normalizeAttemptV3(legacyAttempt(), context);
  const payload = {
    schemaVersion: 3,
    exportedAt: context.nowIso,
    data: {
      weeks: [], attempts: [event, { ...event }], journal: [], settings: [], meta: [],
      reviewQueue: [], plans: [], drafts: [],
    },
  };
  const duplicate = validateImportPayload(payload);
  assert.equal(duplicate.ok, false);
  assert.ok(duplicate.errors.some((error) => /doppelte eventId/.test(error)));
  payload.data.attempts = [{ ...event, eventId: '' }];
  const incomplete = validateImportPayload(payload);
  assert.equal(incomplete.ok, false);
  assert.ok(incomplete.errors.some((error) => /eventId/.test(error)));
});
