// Characterization tests (group E): coverage-matrix data facts that the
// knownGaps semantics rework (releaseGaps / localSupplements /
// privateSupplements / humanReviewRequired / empiricalUnknowns) MUST keep
// deriving identical numbers from.
//
// Sources are the checked-in artifacts only — content/coverage-matrix.json,
// content/projects/*/project.json, content/projects/rag-capstone/phases.json,
// content/curriculum.json. Nothing here rebuilds or regenerates the matrix.
// The frozen numbers are today's reference values (catalog 2026.08.31), not
// a statement that current flag semantics are the goal state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relativePath) => JSON.parse(readFileSync(join(root, relativePath), 'utf8'));

const matrix = readJson('content/coverage-matrix.json');
const curriculum = readJson('content/curriculum.json');
const curriculumWeekIds = new Set(curriculum.weeks.map((week) => week.weekId));
const competencies = matrix.competencies;
const competencyById = new Map(competencies.map((competency) => [competency.competencyId, competency]));
const topics = matrix.roadmapTopics;
const topicById = new Map(topics.map((topic) => [topic.topicId, topic]));

const projectFiles = readdirSync(join(root, 'content/projects'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readJson(join('content/projects', entry.name, 'project.json')));

const withCompetencyGap = (gap) => competencies.filter((competency) => competency.knownGaps.includes(gap));
const withTopicGap = (gap) => topics.filter((topic) => topic.knownGaps.includes(gap));
const weekRange = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, index) => `w${String(from + index).padStart(2, '0')}`);

// Frozen reference values (characterization of catalog 2026.08.31).
const EXPECTED_COMPETENCY_COUNT = 46;
const EXPECTED_TOPIC_COUNT = 39;
const NO_FRESH_VARIATION_IDS = [
  'c-git-basics',
  'c-linalg-gauss',
  'c-linalg-independence',
  'c-linalg-matrices',
  'c-meta-learning',
  'c-numpy-basics',
  'c-python-basics',
  'c-python-collections',
  'c-python-control-flow',
  'c-python-files-errors',
  'c-python-functions',
  'c-python-reading',
  'c-testing-debugging',
];
const PRIVATE_WITHHELD_COUNTS = {
  'c-algebra-basics': 1,
  'c-linalg-gauss': 1,
  'c-linalg-independence': 1,
  'c-linalg-matrices': 1,
  'c-linalg-systems': 1,
  'c-python-basics': 1,
  'c-python-functions': 1,
};
const TOPIC_WITHHELD_COUNTS = { w01: 3, w05: 4 };
const PROJECT_WEEKS = {
  'p-foundations-data-checker': 'w04',
  'p-ml-repro-comparison': 'w17',
  'p-rag-secure-prototype': 'w30',
  'p-rag-capstone': 'w39',
};
const NO_PROJECT_WEEKS = ['w01', 'w02', 'w03', ...weekRange(5, 16), ...weekRange(18, 29), ...weekRange(31, 38)];
const NO_ADVANCED_ACTIVITY_WEEKS = ['w01', 'w05'];
const NO_FINAL_BOSS_OR_PROJECT_WEEKS = ['w01', 'w02', 'w03', 'w05'];

test('matrix invariants: sizes, summary consistency, and complete public reading coverage', () => {
  assert.equal(matrix.summary.competencyCount, EXPECTED_COMPETENCY_COUNT);
  assert.equal(competencies.length, EXPECTED_COMPETENCY_COUNT);
  assert.equal(new Set(competencies.map((competency) => competency.competencyId)).size, EXPECTED_COMPETENCY_COUNT);
  assert.equal(matrix.summary.roadmapTopicCount, EXPECTED_TOPIC_COUNT);
  assert.equal(topics.length, EXPECTED_TOPIC_COUNT);
  assert.deepEqual(
    topics.map((topic) => topic.topicId),
    weekRange(1, 39),
  );

  // Summary counters must equal the per-item derivations.
  assert.equal(matrix.summary.competenciesWithoutPublicReading, competencies.filter((c) => c.publicReadingCount === 0).length);
  assert.equal(matrix.summary.competenciesWithoutPublicReading, 0);
  assert.equal(
    matrix.summary.competenciesWithoutLessonLinkedPublicReading,
    competencies.filter((c) => c.lessonLinkedPublicReadingCount === 0).length,
  );
  assert.equal(matrix.summary.competenciesWithoutLessonLinkedPublicReading, 0);
  assert.equal(
    matrix.summary.competenciesWithoutIndependentEvidence,
    competencies.filter((c) => c.evidenceDimensions.independentEvidence === false).length,
  );
  assert.equal(matrix.summary.competenciesWithoutIndependentEvidence, 1);
  assert.equal(
    matrix.summary.competenciesWithoutFreshVariation,
    competencies.filter((c) => c.generatedVariation.supported === false).length,
  );
  assert.equal(matrix.summary.competenciesWithoutFreshVariation, 2);
  assert.equal(matrix.summary.outlineOnlyTopics, topics.filter((topic) => topic.detailed === false).length);
  assert.equal(matrix.summary.outlineOnlyTopics, 0);
  assert.equal(matrix.summary.topicsWithUndefinedCompetencies, topics.filter((topic) => topic.undefinedCompetencyIds.length > 0).length);
  assert.equal(matrix.summary.topicsWithUndefinedCompetencies, 0);

  // Every competency has complete public reading (0 without public reading).
  for (const competency of competencies) {
    assert.ok(competency.publicReadingCount >= 1, `${competency.competencyId} has no public reading`);
    assert.ok(competency.lessonLinkedPublicReadingCount >= 1, `${competency.competencyId} has no lesson-linked public reading`);
    assert.ok(competency.readings.length >= 1);
    assert.equal(competency.publicReadingCount, competency.readings.length);
  }

  // No outline weeks, no undefined competency references, no dangling week anchors.
  assert.deepEqual(withTopicGap('outline-only'), []);
  assert.deepEqual(withTopicGap('undefined-competency-reference'), []);
  const referencedIds = topics.flatMap((topic) => [...topic.topicCompetencyIds, ...topic.reviewCompetencyIds]);
  for (const competencyId of referencedIds) {
    assert.ok(competencyById.has(competencyId), `topic references unknown competency ${competencyId}`);
  }
  for (const competency of competencies) {
    for (const weekId of competency.roadmapWeekIds) {
      assert.ok(curriculumWeekIds.has(weekId), `${competency.competencyId} anchors unknown week ${weekId}`);
    }
  }
});

test('supplement separation: withheld private readings never appear as reading rows', () => {
  // Key invariant for the privateSupplements split: the matrix reading rows
  // are public-only; withheld material exists only as a counter.
  let readingRows = 0;
  for (const competency of competencies) {
    for (const reading of competency.readings) {
      readingRows += 1;
      assert.equal(reading.publicEligible, true, `${competency.competencyId}/${reading.sourceId} leaked a non-public reading row`);
    }
  }
  for (const topic of topics) {
    for (const reading of topic.readings) {
      readingRows += 1;
      assert.equal(reading.publicEligible, true, `${topic.topicId}/${reading.sourceId} leaked a non-public reading row`);
    }
  }
  assert.ok(readingRows > 300, 'expected a substantial reading-row baseline');
});

test('no-fresh-instance-variation is resolved: the former 13-competency set now has seeded fresh paths', () => {
  // Session B (ADR-0015): each of the 13 formerly flagged competencies now
  // owns at least one public definition with a registered seed generator.
  const flagged = withCompetencyGap('no-fresh-instance-variation').map((competency) => competency.competencyId);
  assert.deepEqual(flagged, ['c-algebra', 'c-linalg-systems']);
  for (const competencyId of NO_FRESH_VARIATION_IDS.filter((id) => !['c-algebra', 'c-linalg-systems'].includes(id))) {
    const competency = competencyById.get(competencyId);
    assert.ok(competency, `competency ${competencyId} disappeared`);
    assert.equal(competency.generatedVariation.supported, true, `${competencyId} still has no fresh variation`);
    assert.ok(competency.generatedVariation.definitionIds.length >= 1, `${competencyId} lists no generated family`);
  }

  // The flag is exactly equivalent to generatedVariation.supported === false,
  // and the summary counter is derived from the same predicate — now zero.
  const unsupported = competencies.filter((competency) => competency.generatedVariation.supported === false).map((c) => c.competencyId);
  assert.deepEqual(unsupported, ['c-algebra', 'c-linalg-systems']);
  for (const competency of competencies) {
    const hasGeneratedFamily = competency.generatedVariation.definitionIds.length > 0;
    assert.equal(competency.generatedVariation.supported, hasGeneratedFamily, competency.competencyId);
  }
});

test('private-source-reference-withheld competencies still ship full public reading', () => {
  const flagged = withCompetencyGap('private-source-reference-withheld');
  // The pinned 7-competency fixture exists only in the source tree; the
  // public-only open-core export ships no private sources at all.
  const treeHasPrivateSources = JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8'))
    .sources.some((source) => source.contentClass === 'private');
  assert.deepEqual(
    flagged.map((competency) => competency.competencyId).sort(),
    treeHasPrivateSources ? Object.keys(PRIVATE_WITHHELD_COUNTS) : [],
  );
  for (const competency of flagged) {
    assert.equal(competency.withheldPrivateReadingCount, PRIVATE_WITHHELD_COUNTS[competency.competencyId], competency.competencyId);
    assert.ok(competency.publicReadingCount > 0, `${competency.competencyId} is withheld-only`);
    assert.ok(competency.lessonLinkedPublicReadingCount >= 1, `${competency.competencyId} has no lesson-linked public reading`);
  }
  // Competencies without the flag carry no withheld count.
  for (const competency of competencies) {
    if (!competency.knownGaps.includes('private-source-reference-withheld')) {
      assert.equal(competency.withheldPrivateReadingCount, 0, competency.competencyId);
    }
  }

  // Topic level: exactly w01 and w05, with all topic readings public.
  const flaggedTopics = withTopicGap('private-source-reference-withheld');
  assert.deepEqual(
    Object.fromEntries(flaggedTopics.map((topic) => [topic.topicId, topic.withheldPrivateReadingCount])),
    treeHasPrivateSources ? TOPIC_WITHHELD_COUNTS : {},
  );
  for (const topic of flaggedTopics) {
    assert.ok(topic.readings.length >= 1, `${topic.topicId} lost its public readings`);
    assert.ok(topic.readings.every((reading) => reading.publicEligible === true));
  }
});

test('source-rights-block-publication never fires: no real rights blocker exists today', () => {
  assert.deepEqual(withCompetencyGap('source-rights-block-publication'), []);
  assert.deepEqual(withTopicGap('source-rights-block-publication'), []);
  // The trigger condition (withheld > 0 AND zero public readings) never holds.
  for (const competency of competencies) {
    assert.ok(!(competency.withheldPrivateReadingCount > 0 && competency.publicReadingCount === 0), competency.competencyId);
  }
  for (const topic of topics) {
    assert.ok(!(topic.withheldPrivateReadingCount > 0 && topic.readings.length === 0), topic.topicId);
  }
});

test('contains-local-only-activity is a local supplement, never a public gap (S1B profile contract)', () => {
  // Local-only exercises may deliberately exist in the local/private profile.
  // In the public-gap-analysis matrix the flag must stay a supplement: never
  // a release blocker, never without its local-only counter, and never at
  // the cost of public coverage on the same row.
  for (const competency of withCompetencyGap('contains-local-only-activity')) {
    assert.ok(competency.localSupplements.includes('contains-local-only-activity'), competency.competencyId);
    assert.ok(!competency.releaseGaps.includes('contains-local-only-activity'), `${competency.competencyId}: local-only darf nie blocken`);
    assert.ok(competency.localOnlyExerciseCount >= 1, `${competency.competencyId}: Flag ohne local-only Aufgabe`);
    assert.ok(competency.publicExerciseCount >= 1, `${competency.competencyId}: local-only darf keine öffentliche Aufgabe verdrängen`);
  }
  for (const topic of withTopicGap('contains-local-only-activity')) {
    assert.ok(topic.localSupplements.includes('contains-local-only-activity'), topic.topicId);
    assert.ok(!topic.releaseGaps.includes('contains-local-only-activity'), `${topic.topicId}: local-only darf nie blocken`);
    assert.ok(topic.localOnlyExerciseCount >= 1, `${topic.topicId}: Flag ohne local-only Aufgabe`);
    assert.ok(topic.publicExerciseCount >= 1, `${topic.topicId}: local-only darf keine öffentliche Aufgabe verdrängen`);
  }
});

test('projects own their week binding: exact legacyWeekId map, all fail-closed valid', () => {
  assert.equal(projectFiles.length, 4);
  assert.deepEqual(
    projectFiles.map((project) => project.projectId).sort(),
    [...Object.keys(PROJECT_WEEKS)].sort(),
  );
  for (const project of projectFiles) {
    assert.equal(project.legacyWeekId, PROJECT_WEEKS[project.projectId], project.projectId);
    // Data basis of the fail-closed check in tools/build_coverage_matrix.mjs.
    assert.ok(curriculumWeekIds.has(project.legacyWeekId), `${project.projectId} references unknown week ${project.legacyWeekId}`);
  }

  // The matrix exposes the project exactly on the bound weeks, nowhere else.
  const boundWeeks = Object.values(PROJECT_WEEKS);
  for (const [projectId, weekId] of Object.entries(PROJECT_WEEKS)) {
    const topic = topicById.get(weekId);
    assert.deepEqual(topic.projectIds, [projectId], weekId);
    assert.ok(!topic.knownGaps.includes('no-project'), `${weekId} no-project flag must stay cleared`);
  }
  const weeksWithProjects = topics.filter((topic) => topic.projectIds.length > 0).map((topic) => topic.topicId);
  assert.deepEqual([...weeksWithProjects].sort(), [...boundWeeks].sort());

  // Competency join is by competencyIds (not by week): every bound competency
  // of a project carries the projectId in its own matrix row.
  for (const project of projectFiles) {
    for (const competencyId of project.competencyIds) {
      const competency = competencyById.get(competencyId);
      assert.ok(competency, `${project.projectId} binds unknown competency ${competencyId}`);
      assert.ok(competency.projectIds.includes(project.projectId), `${competencyId} missing project ${project.projectId}`);
    }
  }
});

test('multi-week capstone: single legacyWeekId anchor plus explicit phase-to-week contract', () => {
  const capstone = projectFiles.find((project) => project.projectId === 'p-rag-capstone');
  assert.ok(capstone);
  // legacyWeekId is ONE value: the final capstone week.
  assert.equal(capstone.legacyWeekId, 'w39');

  const phases = readJson('content/projects/rag-capstone/phases.json');
  assert.equal(phases.projectId, capstone.projectId);
  assert.deepEqual(
    phases.phases.map((phase) => phase.weekId),
    weekRange(35, 39),
  );
  assert.deepEqual(
    phases.phases.map((phase) => phase.testFile),
    [
      'tests/test_w35_scope.py',
      'tests/test_w36_pipeline.py',
      'tests/test_w37_eval_redteam.py',
      'tests/test_w38_repro.py',
      'tests/test_w39_artifacts.py',
    ],
  );
  for (const phase of phases.phases) {
    assert.ok(phase.phaseId && phase.titel && phase.deliverable, `${phase.weekId} phase contract incomplete`);
    assert.ok(curriculumWeekIds.has(phase.weekId), `phase references unknown week ${phase.weekId}`);
  }
  // The last phase week is the project's single legacyWeekId anchor.
  assert.equal(phases.phases.at(-1).weekId, capstone.legacyWeekId);

  // The capstone competency itself is anchored across all five weeks.
  const capstoneCompetency = competencyById.get('c-capstone-pipeline');
  assert.ok(capstoneCompetency);
  assert.deepEqual(capstoneCompetency.roadmapWeekIds, weekRange(35, 39));

  // ADR-0016 (goal state reached in Session B): w35-w38 report the capstone
  // as a continued (shared) project via the phase-to-week mapping instead of
  // a missing project.
  for (const weekId of weekRange(35, 38)) {
    const topic = topicById.get(weekId);
    assert.deepEqual(topic.projectIds, [], weekId);
    assert.deepEqual(topic.sharedProjectIds, ['p-rag-capstone'], weekId);
    assert.ok(!topic.knownGaps.includes('no-project'), `${weekId} no longer carries no-project`);
    assert.ok(!topic.releaseGaps.includes('no-final-boss-or-project'), `${weekId} continues a final-boss project`);
  }
});

test('week flags after ADR-0016: no-project removed, tier coverage joins through topic competencies', () => {
  // Rule 4: not every week needs a project — the flag is gone entirely;
  // weeks without any project simply report an empty project list.
  const noProject = withTopicGap('no-project');
  assert.deepEqual(noProject, []);
  for (const topic of topics) {
    assert.ok(Array.isArray(topic.projectIds), `${topic.topicId} projectIds missing`);
    assert.ok(Array.isArray(topic.sharedProjectIds), `${topic.topicId} sharedProjectIds missing`);
  }

  // Rule 7: advanced/final-boss coverage of a week joins BOTH through
  // legacyWeekId anchors and through the topic competencies — the former
  // w01/w05 false positives are cleared.
  assert.deepEqual(withTopicGap('no-advanced-activity'), []);
  assert.deepEqual(withTopicGap('no-final-boss-or-project'), []);
  for (const weekId of NO_ADVANCED_ACTIVITY_WEEKS) {
    const topic = topicById.get(weekId);
    assert.ok(topic.difficultyCoverage.advanced.length >= 1, `${weekId} lost its advanced coverage join`);
  }

  // The former w01-w03/w05 final-boss false positives are cleared the same
  // way: competency-level final-boss exercises count for their topic weeks.
  for (const weekId of NO_FINAL_BOSS_OR_PROJECT_WEEKS) {
    const topic = topicById.get(weekId);
    assert.ok(topic.difficultyCoverage.finalBoss.length >= 1 || topic.projectIds.length >= 1 || topic.sharedProjectIds.length >= 1, `${weekId} lost its final-boss/project coverage join`);
  }
});

test('coverage:check passes against the checked-in artifacts and fails closed on drift', () => {
  const stdout = execFileSync(process.execPath, ['tools/build_coverage_matrix.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(stdout, /Coverage aktuell: 46 Kompetenzen, 39 Themen/);

  // Fail-closed drift detection: a perturbed matrix copy must make --check
  // exit non-zero instead of silently passing (temp root, repo untouched).
  const driftRoot = mkdtempSync(join(tmpdir(), 'ki-coverage-char-'));
  try {
    cpSync(join(root, 'content'), join(driftRoot, 'content'), { recursive: true });
    cpSync(join(root, 'schemas'), join(driftRoot, 'schemas'), { recursive: true });
    mkdirSync(join(driftRoot, 'docs'), { recursive: true });
    cpSync(join(root, 'docs/coverage-report.md'), join(driftRoot, 'docs/coverage-report.md'));
    const driftMatrixPath = join(driftRoot, 'content/coverage-matrix.json');
    const driftMatrix = JSON.parse(readFileSync(driftMatrixPath, 'utf8'));
    driftMatrix.summary.competencyCount += 1;
    writeFileSync(driftMatrixPath, `${JSON.stringify(driftMatrix, null, 2)}\n`);
    assert.throws(
      () =>
        execFileSync(process.execPath, [join(root, 'tools/build_coverage_matrix.mjs'), '--check', `--root=${driftRoot}`], {
          cwd: root,
          encoding: 'utf8',
        }),
      (error) => error.status !== 0 && /veraltet/.test(String(error.message)),
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
  }
});
