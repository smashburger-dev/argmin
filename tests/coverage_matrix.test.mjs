import test from 'node:test';
import { expectedPublicCounts } from './helpers/content_counts.mjs';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoverageArtifacts } from '../tools/build_coverage_matrix.mjs';
import { compileContent } from '../tools/compile_content.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { matrix, markdown } = buildCoverageArtifacts(root);

test('coverage artifacts are current and cover every competency and roadmap topic', () => {
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'content/coverage-matrix.json'), 'utf8')), matrix);
  assert.equal(readFileSync(join(root, 'docs/coverage-report.md'), 'utf8'), markdown);
  assert.equal(matrix.competencies.length, expectedPublicCounts(root).competencies);
  assert.equal(matrix.roadmapTopics.length, 39);
  assert.deepEqual(matrix.roadmapTopics.map((topic) => topic.weekNumber), Array.from({ length: 39 }, (_, index) => index + 1));
});

test('coverage matrix separates release blockers from supplements and human gates (ADR-0016)', () => {
  for (const competency of matrix.competencies) {
    for (const field of ['releaseGaps', 'localSupplements', 'privateSupplements', 'humanReviewRequired', 'empiricalUnknowns']) {
      assert.ok(Array.isArray(competency[field]), `${competency.competencyId}: ${field} fehlt`);
    }
    // Supplements never masquerade as release blockers.
    for (const flag of competency.localSupplements) assert.ok(!competency.releaseGaps.includes(flag));
    for (const flag of competency.privateSupplements) assert.ok(!competency.releaseGaps.includes(flag));
    // Withheld private readings only block when no public reading remains.
    if (competency.privateSupplements.includes('private-source-reference-withheld')) {
      assert.ok(competency.publicReadingCount > 0, `${competency.competencyId}: private supplement without public reading`);
    }
  }
  assert.equal(matrix.summary.competenciesWithoutFreshVariation, 2);
  assert.equal(matrix.summary.releaseBlockingCompetencies, 6);
  assert.equal(matrix.summary.releaseBlockingTopics, 0);
  // Existence pins hold for the source tree; the public-only open-core export
  // legitimately ships zero supplements (visibility invariants still asserted).
  const treeHasPrivateSources = JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8'))
    .sources.some((source) => source.contentClass === 'private');
  // S1B profile contract: local-only exercises may deliberately exist in the
  // local/private profile, so the source-tree matrix may count them as
  // supplements (>= 0, no upper bound) — but the public projection must stay
  // free of them (public-scoped compile assertion, not a repo-content zero).
  assert.ok(matrix.summary.competenciesWithLocalSupplements >= 0, 'local-only supplements are a local-profile concern');
  assert.deepEqual(
    compileContent({ projectRoot: root, profile: 'public' }).exerciseDefinitions
      .filter((exercise) => exercise.releaseStatus === 'local-only'),
    [],
    'public projection must not contain local-only exercises',
  );
  assert.equal(matrix.summary.competenciesWithPrivateSupplements > 0, treeHasPrivateSources, 'private supplements visible exactly when shipped');
  assert.ok(matrix.empiricalUnknowns.length >= 3, 'empirical unknowns are listed separately');
});

test('coverage matrix distinguishes public links, evidence, variation and difficulty tiers', () => {
  for (const competency of matrix.competencies) {
    assert.equal(typeof competency.lessonLinkedPublicReadingCount, 'number');
    assert.equal(typeof competency.publicExerciseCount, 'number');
    assert.equal(typeof competency.evidenceDimensions.independentEvidence, 'boolean');
    assert.equal(typeof competency.evidenceDimensions.delayedReview, 'boolean');
    assert.equal(typeof competency.generatedVariation.supported, 'boolean');
    assert.deepEqual(Object.keys(competency.difficultyCoverage), ['basic', 'core', 'advanced', 'finalBoss']);
  }
  const systems = matrix.competencies.find((item) => item.competencyId === 'c-linalg-systems');
  assert.equal(systems.publicExerciseCount, 0);
  assert.equal(systems.evidenceDimensions.independentEvidence, false);
  assert.deepEqual(systems.generatedVariation.definitionIds, []);
  const algebra = matrix.competencies.find((item) => item.competencyId === 'c-algebra-basics');
  assert.equal(algebra.lessonLinkedPublicReadingCount, 2);
  assert.equal(algebra.knownGaps.includes('no-lesson-linked-public-reading'), false);
  assert.ok(algebra.generatedVariation.definitionIds.includes('w01-e8'));
});

test('roadmap coverage exposes local-only and future-definition gaps', () => {
  const weekFive = matrix.roadmapTopics.find((topic) => topic.topicId === 'w05');
  assert.ok(weekFive.publicExerciseCount >= 15);
  // S1B profile contract: local-only activities may ship in the local
  // profile (>= 0, no upper bound); the flag tracks the count derivation.
  assert.ok(weekFive.localOnlyExerciseCount >= 0, 'w05 may ship local-only supplements in the local profile');
  assert.equal(weekFive.localSupplements.includes('contains-local-only-activity'), weekFive.localOnlyExerciseCount > 0);
  // ADR-0016: week tier coverage joins through the topic competencies, so
  // the advanced/final-boss definitions anchored elsewhere still count.
  assert.ok(!weekFive.releaseGaps.includes('no-advanced-activity'));
  assert.ok(!weekFive.releaseGaps.includes('no-final-boss-or-project'));
  const weekOne = matrix.roadmapTopics.find((topic) => topic.topicId === 'w01');
  assert.ok(!weekOne.releaseGaps.includes('no-advanced-activity'));
  assert.ok(!weekOne.releaseGaps.includes('no-final-boss-or-project'));
  const weekTwo = matrix.roadmapTopics.find((topic) => topic.topicId === 'w02');
  // ADR-0014: W2-W4 integrate existing foundations content as detailed weeks
  // with competencies, readings and exercises (no synthetic projects for
  // w02/w03 — the no-project gap stays documented).
  assert.equal(weekTwo.detailed, true);
  assert.ok(!weekTwo.knownGaps.includes('outline-only'));
  assert.ok(!weekTwo.knownGaps.includes('no-topic-competencies'));
  assert.ok(weekTwo.topicCompetencyIds.includes('c-python-control-flow'));
  const weekThirtyOne = matrix.roadmapTopics.find((topic) => topic.topicId === 'w31');
  assert.ok(weekThirtyOne.reviewCompetencyIds.includes('c-genai-rag'));
  assert.equal(matrix.roadmapTopics.every((topic) => topic.undefinedCompetencyIds.length === 0), true);
});

test('local-only exercises stay local: public excludes them, local keeps them, supplements never block (S1B profile contract)', () => {
  // Synthetic NON-Numbas local-only definition (deterministic grader): the
  // local-private profile may deliberately ship local-only exercises, the
  // public profile must filter them, and the matrix must classify them as
  // supplements — never as release blockers.
  const localOnlyRoot = mkdtempSync(join(tmpdir(), 'ki-coverage-local-only-'));
  try {
    cpSync(join(root, 'content'), join(localOnlyRoot, 'content'), { recursive: true });
    cpSync(join(root, 'schemas'), join(localOnlyRoot, 'schemas'), { recursive: true });
    const definitionPath = join(localOnlyRoot, 'content/exercise-definitions/foundations/control-choice.json');
    const definition = JSON.parse(readFileSync(definitionPath, 'utf8'));
    definition.releaseStatus = 'local-only';
    writeFileSync(definitionPath, JSON.stringify(definition));
    // Clean the milestone references the way an author would: the public
    // bundle drops the definition, so a stale reference must break loudly.
    const catalog = JSON.parse(readFileSync(join(localOnlyRoot, 'content/catalog.json'), 'utf8'));
    for (const file of discoverJson(join(localOnlyRoot, 'content'), catalogRoot(catalog, 'milestones'))) {
      const milestonePath = join(localOnlyRoot, 'content', file);
      const doc = JSON.parse(readFileSync(milestonePath, 'utf8'));
      for (const milestone of doc.milestones) {
        milestone.exerciseDefinitionIds = milestone.exerciseDefinitionIds.filter((id) => id !== 'f-control-choice-01');
      }
      writeFileSync(milestonePath, JSON.stringify(doc));
    }
    const publicBundle = compileContent({ projectRoot: localOnlyRoot, profile: 'public', cache: 'none' });
    assert.equal(
      publicBundle.exerciseDefinitions.some((exercise) => exercise.definitionId === 'f-control-choice-01'),
      false,
      'lokale Aufgabe darf nicht ins Public-Bundle gelangen',
    );
    assert.equal(publicBundle.exerciseDefinitions.some((exercise) => exercise.releaseStatus === 'local-only'), false);
    const localBundle = compileContent({ projectRoot: localOnlyRoot, profile: 'local-private', cache: 'none' });
    const localOnly = localBundle.exerciseDefinitions.find((exercise) => exercise.definitionId === 'f-control-choice-01');
    assert.ok(localOnly, 'Profil local-private muss die local-only Aufgabe behalten');
    assert.equal(localOnly.releaseStatus, 'local-only');
    const localMatrix = buildCoverageArtifacts(localOnlyRoot).matrix;
    for (const competencyId of ['c-python-control-flow']) {
      const competency = localMatrix.competencies.find((item) => item.competencyId === competencyId);
      assert.ok(competency.localSupplements.includes('contains-local-only-activity'), `${competencyId} muss die local-only Aufgabe als Supplement führen`);
      assert.ok(!competency.releaseGaps.includes('contains-local-only-activity'), `${competencyId}: local-only darf nie blocken`);
    }
    assert.ok(localMatrix.summary.competenciesWithLocalSupplements >= 1, 'Matrix zählt local-only Supplements (>= 0, keine Obergrenze)');
  } finally {
    rmSync(localOnlyRoot, { recursive: true, force: true });
  }
});

test('week-project mapping is explicit, owned by the project, and fail-closed', () => {
  const curriculumWeekIds = new Set(JSON.parse(readFileSync(join(root, 'content/curriculum.json'), 'utf8')).weeks.map((week) => week.weekId));
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const projectsWithWeek = bundle.projects.filter((project) => project.legacyWeekId);
  assert.ok(projectsWithWeek.length >= 2, 'expected projects to own explicit week references');
  for (const project of projectsWithWeek) {
    assert.ok(curriculumWeekIds.has(project.legacyWeekId), `${project.projectId} references unknown week ${project.legacyWeekId}`);
  }
  const w17 = matrix.roadmapTopics.find((topic) => topic.weekNumber === 17);
  assert.ok(w17.projectIds.includes('p-ml-repro-comparison'), 'w17 must expose its competency-bound project through the explicit mapping');
  assert.ok(!w17.knownGaps.includes('no-project'), 'w17 no-project flag must clear once the mapping exists');
  // ADR-0016: multi-week projects appear in their actual phase weeks as
  // continued (shared) instead of "missing project".
  const w36 = matrix.roadmapTopics.find((topic) => topic.weekNumber === 36);
  assert.deepEqual(w36.sharedProjectIds, ['p-rag-capstone']);
  assert.ok(!w36.releaseGaps.includes('no-final-boss-or-project'));
  const w4 = matrix.roadmapTopics.find((topic) => topic.weekNumber === 4);
  assert.ok(w4.projectIds.includes('p-foundations-data-checker'), 'w4 must expose the foundations CLI project');

  // Fail-closed: an unknown week reference must break coverage generation.
  const brokenRoot = mkdtempSync(join(tmpdir(), 'ki-coverage-'));
  try {
    cpSync(join(root, 'content'), join(brokenRoot, 'content'), { recursive: true });
    cpSync(join(root, 'schemas'), join(brokenRoot, 'schemas'), { recursive: true });
    const projectPath = join(brokenRoot, 'content/projects/ml-repro-comparison/project.json');
    const project = JSON.parse(readFileSync(projectPath, 'utf8'));
    project.legacyWeekId = 'w99';
    writeFileSync(projectPath, JSON.stringify(project));
    assert.throws(() => buildCoverageArtifacts(brokenRoot), /referenziert keine Roadmap-Woche/);
  } finally {
    rmSync(brokenRoot, { recursive: true, force: true });
  }
});
