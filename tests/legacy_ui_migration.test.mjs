import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';
import { instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import {
  routeForDefinition,
  supportedNewUiActivityTypes,
} from '../assets/js/domain/activity_route.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicBundle = compileContent({ projectRoot: root, profile: 'public' });
const publicLegacy = publicBundle.exerciseDefinitions.filter((definition) => definition.legacyWeekId);

test('all public legacy definitions resolve inside the new UI', () => {
  // Growth-counter rule: the legacy-definition count derives from the
  // catalog week packs (public filter), never from a hardcoded number.
  const catalog = JSON.parse(readFileSync(join(root, 'content/catalog.json'), 'utf8'));
  const packLegacy = catalog.legacy.exerciseFiles
    .flatMap((file) => JSON.parse(readFileSync(join(root, 'content', file), 'utf8')).exercises || [])
    .filter((exercise) => exercise.active !== false).length;
  // ADR-0014: authored definitions consciously assigned to a roadmap week
  // (legacyWeekId) count as legacy-projected definitions as well.
  const authoredLegacy = discoverJson(join(root, 'content'), catalogRoot(catalog, 'exerciseDefinitions'))
    .map((file) => JSON.parse(readFileSync(join(root, 'content', file), 'utf8')))
    .filter((definition) => definition.legacyWeekId && definition.active !== false
      && definition.releaseStatus !== 'local-only').length;
  const expectedLegacy = packLegacy + authoredLegacy;
  assert.equal(publicLegacy.length, expectedLegacy);
  for (const definition of publicLegacy) {
    const route = routeForDefinition(definition);
    assert.match(route, /^#\/(exercise|lab)\//, `${definition.definitionId} escaped to ${route}`);
    assert.doesNotMatch(route, /index\.html|legacy/);
    assert.equal(supportedNewUiActivityTypes.has(definition.activityType), true, `${definition.activityType} is not implemented`);
  }
});

test('native instantiation preserves seeds, generators, solvers and source lineage', () => {
  const generated = publicBundle.exerciseDefinitions.find((definition) => definition.definitionId === 'w01-e8');
  const first = instantiateLegacyExercise(generated, 8101);
  const repeated = instantiateLegacyExercise(generated, 8101);
  const fresh = instantiateLegacyExercise(generated, 8102);
  assert.equal(first.seed, 8101);
  assert.equal(first.deterministicSeed, 8101);
  assert.equal(first.generatorId, 'genLinearEquation');
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first.parameters, fresh.parameters);
  assert.deepEqual(first.sourceLineage, generated.sourceLineage);

  const solved = publicBundle.exerciseDefinitions.find((definition) => definition.definitionId === 'w05-e6');
  const instance = instantiateLegacyExercise(solved, solved.deterministicSeed);
  assert.equal(instance.referenceSolverId, 'solveLinear2');
  assert.deepEqual(instance.expectedAnswer.solution, [1, 3]);
  assert.deepEqual(instance.sourceLineage, solved.sourceLineage);
});
