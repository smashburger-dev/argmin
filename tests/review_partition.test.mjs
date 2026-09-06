// Focused tests for the archived-review partition: due-review entries whose
// exerciseId (definition id) no longer exists in the current catalog are
// archived. Presentation-only — stored entries pass through unchanged, so
// attempt history, evidence, and exports stay untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionReviewQueue } from '../assets/js/domain/review_partition.mjs';

const due = (exerciseId, over = {}) => ({
  exerciseId,
  nextDueAt: '2026-09-01T08:00:00.000Z',
  qualifiedHitCount: 2,
  ...over,
});

const knownEntry = due('known-a');
const otherKnownEntry = due('known-b');
const unknownEntry = due('retired-definition');

test('executable entries pass through unchanged when all definition ids are known', () => {
  const entries = [knownEntry, otherKnownEntry];
  const { executable, archived } = partitionReviewQueue(entries, ['known-a', 'known-b', 'known-c']);
  assert.deepEqual(executable, entries, 'ausführbare Einträge müssen unverändert und in Reihenfolge durchgereicht werden');
  assert.deepEqual(archived, [], 'bei bekannten Definitions-IDs darf nichts archiviert werden');
  assert.equal(executable[0], knownEntry, 'es werden dieselben Objekte weitergereicht, nicht Kopien oder Umschreibungen');
});

test('an unknown definition id is recognized and separated', () => {
  const { executable, archived } = partitionReviewQueue([knownEntry, unknownEntry], ['known-a', 'known-b']);
  assert.deepEqual(executable, [knownEntry], 'nur Einträge mit bekannter Definitions-ID bleiben ausführbar');
  assert.deepEqual(archived, [unknownEntry], 'Einträge mit unbekannter Definitions-ID müssen als archiviert erkannt werden');
});

test('archived entries produce no exercise link', () => {
  // Mirrors ReviewView: a route is only ever built from a resolved catalog
  // definition, so an archived entry can never yield a #/exercise/<id> href.
  const byId = new Map([['known-a', { definitionId: 'known-a' }], ['known-b', { definitionId: 'known-b' }]]);
  const { executable, archived } = partitionReviewQueue([knownEntry, unknownEntry], byId.keys());
  const routeFor = (entry) => {
    const definition = byId.get(entry.exerciseId);
    return definition ? `#/exercise/${definition.definitionId}` : null;
  };
  assert.ok(executable.every((entry) => typeof routeFor(entry) === 'string'), 'ausführbare Einträge erhalten eine Aufgaben-Route');
  for (const entry of archived) {
    assert.equal(byId.has(entry.exerciseId), false, 'archivierte Einträge haben keine Katalog-Definition');
    assert.equal(routeFor(entry), null, 'für archivierte Einträge darf keine #/exercise-Route entstehen');
  }
});

test('partition keeps the relative order inside both groups', () => {
  const { executable, archived } = partitionReviewQueue(
    [unknownEntry, knownEntry, due('known-c'), due('other-retired')],
    ['known-a', 'known-b', 'known-c'],
  );
  assert.deepEqual(executable.map((entry) => entry.exerciseId), ['known-a', 'known-c'], 'Reihenfolge der ausführbaren Einträge bleibt erhalten');
  assert.deepEqual(archived.map((entry) => entry.exerciseId), ['retired-definition', 'other-retired'], 'Reihenfolge der archivierten Einträge bleibt erhalten');
});

test('boundary: an empty queue partitions into two empty groups', () => {
  const result = partitionReviewQueue([], ['known-a']);
  assert.deepEqual(result.executable, [], 'leere Queue bleibt ohne ausführbare Einträge');
  assert.deepEqual(result.archived, [], 'leere Queue bleibt ohne archivierte Einträge');
});

test('boundary: every entry is archived when no definition id is known', () => {
  const entries = [unknownEntry, due('other-retired')];
  const { executable, archived } = partitionReviewQueue(entries, []);
  assert.deepEqual(executable, [], 'ohne bekannte Definitions-IDs ist kein Eintrag ausführbar');
  assert.deepEqual(archived, entries, 'alle Einträge werden archiviert und dabei nicht umgeschrieben');
});

test('defensive inputs: missing exerciseId, Set, Map#keys, null', () => {
  const broken = due(undefined);
  assert.deepEqual(partitionReviewQueue([broken], new Set(['known-a'])).archived, [broken], 'Einträge ohne exerciseId gelten als archiviert');
  const byId = new Map([['known-a', { definitionId: 'known-a' }]]);
  assert.deepEqual(partitionReviewQueue([knownEntry], byId.keys()).executable, [knownEntry], 'Map#keys() wird als Quelle bekannter IDs akzeptiert (Aufrufform der ReviewView)');
  assert.deepEqual(partitionReviewQueue(null, null), { executable: [], archived: [] }, 'null-Eingaben werden toleriert');
});
