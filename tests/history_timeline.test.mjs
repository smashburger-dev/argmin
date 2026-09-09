import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistoryTimeline } from '../assets/js/domain/history_timeline.mjs';

test('history mixes attempts, modules and lessons by time', () => {
  const timeline = buildHistoryTimeline({
    attempts: [
      { definitionId: 'fam-a:case-1', occurredAt: '2026-09-08T10:00:00.000Z' },
      { definitionId: 'fam-b:case-2', occurredAt: '2026-09-09T10:00:00.000Z' },
    ],
    moduleTouch: { 'mod-old': Date.parse('2026-09-07T10:00:00.000Z') },
    lessonTouch: { 'les-mid': Date.parse('2026-09-08T12:00:00.000Z') },
    recentLessons: ['les-mid'],
  });
  assert.deepEqual(timeline.map((entry) => entry.id), ['fam-b:case-2', 'les-mid', 'fam-a:case-1', 'mod-old']);
  assert.deepEqual(timeline.map((entry) => entry.kind), ['attempt', 'lesson', 'attempt', 'module']);
});

test('history dedupes attempts, caps the length and drops junk', () => {
  const timeline = buildHistoryTimeline({
    attempts: [
      { definitionId: 'fam-a:case-1', occurredAt: '2026-09-09T10:00:00.000Z' },
      { definitionId: 'fam-a:case-1', occurredAt: '2026-09-08T10:00:00.000Z' },
      { definitionId: 'fam-b:case-2', occurredAt: '2026-09-09T09:00:00.000Z' },
      { definitionId: '', occurredAt: '2026-09-09T11:00:00.000Z' },
      { definitionId: 'fam-c:case-3', occurredAt: 'kein-datum' },
    ],
    moduleTouch: { 'mod-x': Number.NaN },
    limit: 2,
  });
  assert.deepEqual(timeline.map((entry) => entry.id), ['fam-a:case-1', 'fam-b:case-2']);
});

test('legacy lesson opens without timestamps land at the end', () => {
  const timeline = buildHistoryTimeline({
    attempts: [{ definitionId: 'fam-a:case-1', occurredAt: '2026-09-09T10:00:00.000Z' }],
    lessonTouch: {},
    recentLessons: ['les-legacy'],
  });
  assert.deepEqual(timeline.map((entry) => entry.id), ['fam-a:case-1', 'les-legacy']);
  assert.equal(timeline[1].at, 0);
});
