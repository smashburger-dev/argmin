// Session-B verification (ADR-0016 coverage semantics, ADR-0015 retention
// timelines): counterexample tests over perturbed temp roots and the pure
// retention seams. No product code is modified; every coverage perturbation
// copies content/ + schemas/ into a fresh mkdtemp root under /tmp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoverageArtifacts } from '../tools/build_coverage_matrix.mjs';
import { compileContent } from '../tools/compile_content.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';
import { buildLegacyMap } from '../tools/migrate_legacy_content.mjs';
import { freshReviewRoute } from '../assets/js/domain/review_route.mjs';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import {
  DEFAULT_REVIEW_PARAMS,
  WEEK_MS,
  buildReviewQueueEntries,
  buildReviewQueueEntry,
  reviewStateFromAttempts,
} from '../assets/js/core/review_scheduler.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- temp-root harness --------------------------------------------------------

/** Fresh content copy under /tmp with one perturbation applied. Curriculum and
 *  w01/w05 edits invalidate the legacy map hash, so the map is regenerated the
 *  same way `tools/migrate_legacy_content.mjs` does — this keeps the compile
 *  gate intact and isolates the perturbation itself. */
function makePerturbedRoot(label, mutate) {
  const tmp = mkdtempSync(join(tmpdir(), `ki-session-b-${label}-`));
  cpSync(join(root, 'content'), join(tmp, 'content'), { recursive: true });
  cpSync(join(root, 'schemas'), join(tmp, 'schemas'), { recursive: true });
  mutate(tmp);
  writeFileSync(join(tmp, 'content/legacy/exercise-competency-map.json'), `${JSON.stringify(buildLegacyMap(tmp), null, 2)}\n`);
  return tmp;
}

/** Fixture detection: the source tree ships private readings; a public-only
 *  open-core export ships none (S1B retired the last local-only exercise). */
const treeShipsPrivateSources = () => JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8'))
  .sources.some((source) => source.contentClass === 'private');

const editJson = (tmp, relativePath, mutateValue) => {
  const path = join(tmp, relativePath);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  mutateValue(value);
  writeFileSync(path, JSON.stringify(value));
};

function buildMatrix(tmp) {
  return buildCoverageArtifacts(tmp).matrix;
}

const competencyById = (matrix, competencyId) => matrix.competencies.find((item) => item.competencyId === competencyId);
const topicById = (matrix, weekId) => matrix.roadmapTopics.find((item) => item.topicId === weekId);

// Shared classifications reused across tests.
const baselineMatrix = buildCoverageArtifacts(root).matrix;

// --- 1. coverage tool: fail-closed and classification under perturbation -----

test('deactivating a milestone-referenced definition fails closed in the compiler', async () => {
  // Deactivating without cleaning the milestone reference must not silently
  // degrade coverage — the public bundle drops the definition and the
  // milestone reference breaks loudly.
  const tmp = makePerturbedRoot('dead-ref', (t) => {
    editJson(t, 'content/exercise-definitions/foundations/control-choice.json', (d) => { d.active = false; });
  });
  try {
    assert.throws(() => buildCoverageArtifacts(tmp), /unbekannte Aufgabe f-control-choice-01/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('deactivated definition resurfaces as release gaps, never as supplements', async () => {
  // Same deactivation, but the milestone references are cleaned up the way an
  // author would: now the report must classify the missing fresh variation
  // and advanced coverage as real release gaps.
  const tmp = makePerturbedRoot('inactive-def', (t) => {
    editJson(t, 'content/exercise-definitions/foundations/control-choice.json', (d) => { d.active = false; });
    const catalog = JSON.parse(readFileSync(join(t, 'content/catalog.json'), 'utf8'));
    for (const file of discoverJson(join(t, 'content'), catalogRoot(catalog, 'milestones'))) {
      editJson(t, join('content', file), (doc) => {
        for (const milestone of doc.milestones) {
          milestone.exerciseDefinitionIds = milestone.exerciseDefinitionIds.filter((id) => id !== 'f-control-choice-01');
        }
      });
    }
  });
  try {
    const matrix = await buildMatrix(tmp);
    const controlFlow = competencyById(matrix, 'c-python-control-flow');
    // Supplements stay supplements: the local-only activity and draft status
    // of the same competency must not leak into releaseGaps.
    assert.ok(controlFlow.publicExerciseCount >= 1);
    assert.ok(!controlFlow.releaseGaps.includes('contains-local-only-activity'));
    assert.equal(matrix.summary.competenciesWithoutFreshVariation, 2);
    assert.equal(matrix.summary.releaseBlockingCompetencies, 6);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('private source without public reading becomes a rights release blocker', async () => {
  // c-linalg-systems keeps its withheld mml-book unit reference, loses every
  // public reading (lesson refs emptied, public unit refs removed). ADR-0016
  // rule 1/3: private supplements block only when no public reading remains.
  const tmp = makePerturbedRoot('rights-block', (t) => {
    editJson(t, 'content/lessons/linear-algebra/systems.json', (lesson) => { lesson.sourceRefs = []; });
    // Self-contained fixture: ensure a private source exists (the public-only
    // open-core tree ships none), then keep exactly that reference.
    editJson(t, 'content/sources.json', (doc) => {
      if (!doc.sources.some((source) => source.sourceId === 'test-private-book')) {
        doc.sources.push({
          sourceId: 'test-private-book', title: 'Private Testlektüre', author: 'Test',
          canonicalUrl: 'https://example.invalid/book', contentClass: 'private',
          license: 'Alle Rechte vorbehalten (Testfixture)', extractionStatus: 'registered',
        });
      }
    });
    editJson(t, 'content/curriculum.json', (curriculum) => {
      const unit = curriculum.weeks.find((week) => week.weekId === 'w05')
        .learningUnits.find((item) => item.competencyId === 'c-linalg-systems');
      unit.sources = [{ sourceId: 'test-private-book', role: 'primary', locator: 'Kapitel 2' }];
    });
  });
  try {
    const matrix = await buildMatrix(tmp);
    const systems = competencyById(matrix, 'c-linalg-systems');
    assert.equal(systems.publicReadingCount, 0);
    assert.ok(systems.withheldPrivateReadingCount >= 1);
    assert.ok(systems.releaseGaps.includes('source-rights-block-publication'), 'no public reading left: rights flag must block');
    assert.ok(systems.releaseGaps.includes('no-public-reading'));
    assert.deepEqual(systems.privateSupplements, ['private-source-reference-withheld']);
    assert.ok(!systems.releaseGaps.includes('private-source-reference-withheld'), 'supplement flag itself never blocks');
    assert.equal(matrix.summary.releaseBlockingCompetencies, 6);
    assert.equal(matrix.summary.competenciesWithoutPublicReading, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('outline week is a release gap and moves the topic counters', async () => {
  const tmp = makePerturbedRoot('outline-week', (t) => {
    editJson(t, 'content/curriculum.json', (curriculum) => {
      curriculum.weeks.find((week) => week.weekId === 'w05').detailed = false;
    });
  });
  try {
    const matrix = await buildMatrix(tmp);
    const w05 = topicById(matrix, 'w05');
    assert.equal(w05.detailed, false);
    assert.ok(w05.releaseGaps.includes('outline-only'));
    assert.equal(matrix.summary.outlineOnlyTopics, 1);
    assert.equal(matrix.summary.releaseBlockingTopics, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('project with invalid legacyWeekId fails closed', async () => {
  const tmp = makePerturbedRoot('bad-week-ref', (t) => {
    editJson(t, 'content/projects/ml-repro-comparison/project.json', (project) => { project.legacyWeekId = 'w99'; });
  });
  try {
    assert.throws(() => buildCoverageArtifacts(tmp), /legacyWeekId w99 referenziert keine Roadmap-Woche/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('unknown week in phases.json fails closed (ADR-0016 continuation of the legacyWeekId contract)', async () => {
  // Session-B fix: phase weekIds now carry the same fail-closed contract as
  // legacyWeekId — a typo'd phase week breaks coverage generation instead of
  // silently removing the continuation mapping.
  const tmp = makePerturbedRoot('bad-phase-week', (t) => {
    editJson(t, 'content/projects/rag-capstone/phases.json', (doc) => {
      doc.phases.find((phase) => phase.phaseId === 'w36-integration').weekId = 'w99';
    });
  });
  try {
    assert.throws(() => buildMatrix(tmp), /Phase verweist auf unbekannte Roadmap-Woche w99/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// --- 4. week tier join --------------------------------------------------------

test('advanced definition anchored in another week still counts for its topic week', async () => {
  // f-git-merge-debug-01 is an advanced definition anchored at w03.
  // it from w01 (ADR-0016 rule 6) — and w20 gains it through the anchor.
  const tmp = makePerturbedRoot('cross-week-anchor', (t) => {
    editJson(t, 'content/exercise-definitions/foundations/git-merge-debug.json', (d) => { d.legacyWeekId = 'w20'; });
  });
  try {
    const matrix = await buildMatrix(tmp);
    const w03 = topicById(matrix, 'w03');
    const w20 = topicById(matrix, 'w20');
    assert.ok(w03.difficultyCoverage.advanced.includes('f-git-merge-debug-01'), 'topic-competency join must keep the def for w03');
    assert.ok(w20.difficultyCoverage.advanced.includes('f-git-merge-debug-01'), 'anchor week gains the def as well');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('week whose topic competencies lost every advanced definition keeps the gap', async () => {
  // w06's only advanced coverage is w06-e4 (difficulty 3) of its topic
  // competencies. Demoting it to core must surface no-advanced-activity as a
  // genuine release gap — the join must not mask a real hole.
  const tmp = makePerturbedRoot('no-advanced', (t) => {
    editJson(t, 'content/exercises/w06.json', (pack) => {
      pack.exercises.find((exercise) => exercise.exerciseId === 'w06-e4').difficulty = 2;
    });
  });
  try {
    const matrix = await buildMatrix(tmp);
    const w06 = topicById(matrix, 'w06');
    assert.deepEqual(w06.difficultyCoverage.advanced, []);
    assert.deepEqual(w06.releaseGaps, ['no-advanced-activity']);
    assert.deepEqual(w06.knownGaps, ['no-advanced-activity']);
    assert.ok(matrix.summary.releaseBlockingTopics >= 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// --- 2 + 3. semantics rules and summary consistency (baseline + perturbed) ----

const gapFields = ['releaseGaps', 'localSupplements', 'privateSupplements', 'humanReviewRequired', 'empiricalUnknowns'];

function assertSemanticInvariants(matrix, label) {
  for (const entry of [...matrix.competencies, ...matrix.roadmapTopics]) {
    const id = entry.competencyId || entry.topicId;
    // knownGaps is the union of the classified buckets (order-insensitive).
    const union = gapFields.flatMap((field) => entry[field]).sort();
    assert.deepEqual([...entry.knownGaps].sort(), union, `${label}/${id}: knownGaps must be the union of all buckets`);
    // Supplements never masquerade as release blockers.
    for (const flag of entry.localSupplements) assert.ok(!entry.releaseGaps.includes(flag), `${label}/${id}: ${flag} must not block`);
    for (const flag of entry.privateSupplements) assert.ok(!entry.releaseGaps.includes(flag), `${label}/${id}: ${flag} must not block`);
    // draft-content lives exclusively in humanReviewRequired.
    assert.ok(!entry.releaseGaps.includes('draft-content'), `${label}/${id}: draft-content is a human gate, not a gap`);
    assert.ok(!entry.localSupplements.includes('draft-content') && !entry.privateSupplements.includes('draft-content'));
    // contains-local-only-activity is never a release gap.
    assert.ok(!entry.releaseGaps.includes('contains-local-only-activity'), `${label}/${id}: local-only activity must not block`);
    if (entry.privateSupplements.includes('private-source-reference-withheld')) {
      // ADR-0016 rule 1: withheld private reading blocks only without public
      // reading — which must then surface source-rights-block-publication.
      if (entry.publicReadingCount === 0) {
        assert.ok(entry.releaseGaps.includes('source-rights-block-publication'), `${label}/${id}: rights blocker required`);
      } else {
        assert.ok(!entry.releaseGaps.includes('source-rights-block-publication'), `${label}/${id}: rights blocker with public reading present`);
      }
    }
  }
}

function assertSummaryConsistency(matrix, label) {
  const { competencies, roadmapTopics, summary } = matrix;
  const expected = {
    competencyCount: competencies.length,
    roadmapTopicCount: roadmapTopics.length,
    competenciesWithoutPublicReading: competencies.filter((item) => !item.publicReadingCount).length,
    competenciesWithoutLessonLinkedPublicReading: competencies.filter((item) => !item.lessonLinkedPublicReadingCount).length,
    competenciesWithoutIndependentEvidence: competencies.filter((item) => !item.evidenceDimensions.independentEvidence).length,
    competenciesWithoutFreshVariation: competencies.filter((item) => !item.generatedVariation.supported).length,
    outlineOnlyTopics: roadmapTopics.filter((item) => !item.detailed).length,
    topicsWithUndefinedCompetencies: roadmapTopics.filter((item) => item.undefinedCompetencyIds.length).length,
    releaseBlockingCompetencies: competencies.filter((item) => item.releaseGaps.length).length,
    releaseBlockingTopics: roadmapTopics.filter((item) => item.releaseGaps.length).length,
    competenciesWithLocalSupplements: competencies.filter((item) => item.localSupplements.length).length,
    competenciesWithPrivateSupplements: competencies.filter((item) => item.privateSupplements.length).length,
    competenciesAwaitingHumanReview: competencies.filter((item) => item.humanReviewRequired.length).length,
  };
  assert.deepEqual(summary, expected, `${label}: summary must equal the per-competency derivation`);
}

test('baseline matrix obeys the ADR-0016 semantics rules and consistent counters', () => {
  const matrix = baselineMatrix;
  assertSemanticInvariants(matrix, 'baseline');
  assertSummaryConsistency(matrix, 'baseline');
  // releaseBlockingTopics really counts only releaseGaps: baseline carries
  // visible supplements on topics and competencies yet blocks nothing.
  assert.equal(matrix.summary.releaseBlockingCompetencies, 6);
  assert.equal(matrix.summary.releaseBlockingTopics, 0);
  // S1B profile contract: local-only exercises may deliberately live in the
  // local/private profile (>= 0, no upper bound — the deactivated-definition
  // test above pins their supplement classification under perturbation).
  // What must never happen is a local-only exercise reaching the public
  // projection:
  assert.deepEqual(
    compileContent({ projectRoot: root, profile: 'public' }).exerciseDefinitions
      .filter((exercise) => exercise.releaseStatus === 'local-only'),
    [],
    'Public-Profil darf keine local-only Aufgaben enthalten',
  );
  assert.equal(matrix.summary.competenciesWithPrivateSupplements > 0, treeShipsPrivateSources(), 'private supplements visible exactly when shipped');
  for (const competency of matrix.competencies) {
    if (competency.privateSupplements.length) assert.ok(competency.publicReadingCount > 0);
  }
});

test('perturbed matrices keep semantics rules and summary counters consistent', () => {
  const cases = [
    ['inactive-def', 6, 0, (t) => {
      editJson(t, 'content/exercise-definitions/foundations/control-choice.json', (d) => { d.active = false; });
      const catalog = JSON.parse(readFileSync(join(t, 'content/catalog.json'), 'utf8'));
      for (const file of discoverJson(join(t, 'content'), catalogRoot(catalog, 'milestones'))) {
        editJson(t, join('content', file), (doc) => {
          for (const milestone of doc.milestones) {
            milestone.exerciseDefinitionIds = milestone.exerciseDefinitionIds.filter((id) => id !== 'f-control-choice-01');
          }
        });
      }
    }],
    ['rights-block', 6, 0, (t) => {
      editJson(t, 'content/lessons/linear-algebra/systems.json', (lesson) => { lesson.sourceRefs = []; });
      editJson(t, 'content/curriculum.json', (curriculum) => {
        const unit = curriculum.weeks.find((week) => week.weekId === 'w05')
          .learningUnits.find((item) => item.competencyId === 'c-linalg-systems');
        unit.sources = unit.sources.filter((reference) => reference.sourceId === 'mml-book');
      });
    }],
    ['outline-week', 6, 1, (t) => {
      editJson(t, 'content/curriculum.json', (curriculum) => {
        curriculum.weeks.find((week) => week.weekId === 'w05').detailed = false;
      });
    }],
  ];
  for (const [label, expectedBlockingCompetencies, expectedBlockingTopics, mutate] of cases) {
    const tmp = makePerturbedRoot(`rules-${label}`, mutate);
    try {
      const matrix = buildMatrix(tmp);
      assertSemanticInvariants(matrix, label);
      assertSummaryConsistency(matrix, label);
      assert.equal(matrix.summary.releaseBlockingCompetencies, expectedBlockingCompetencies, `${label}: blocking competencies`);
      assert.equal(matrix.summary.releaseBlockingTopics, expectedBlockingTopics, `${label}: blocking topics`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
});

// --- 5. retention adapters (node-testable seams) ------------------------------

test('freshReviewRoute appends a seed only for generator-backed exercise routes', () => {
  const exerciseRoute = '#/exercise/w01-e8';
  const seeded = freshReviewRoute(exerciseRoute, 'genLinearBothSides', 'w01-e8:2026-09-01T00:00:00.000Z');
  assert.match(seeded, /^#\/exercise\/w01-e8\?seed=\d{1,6}$/);
  // Deterministic per due key: one due period reopens the same instance.
  assert.equal(freshReviewRoute(exerciseRoute, 'genLinearBothSides', 'w01-e8:2026-09-01T00:00:00.000Z'), seeded);
  const nextPeriod = freshReviewRoute(exerciseRoute, 'genLinearBothSides', 'w01-e8:2026-11-17T00:00:00.000Z');
  assert.notEqual(nextPeriod, seeded, 'the next due period opens a different instance');
  // Gate 1: no generator — no seed (no-op, not a wrong link).
  assert.equal(freshReviewRoute(exerciseRoute, null, 'w01-e8:2026-09-01T00:00:00.000Z'), exerciseRoute);
  assert.equal(freshReviewRoute(exerciseRoute, undefined, 'k'), exerciseRoute);
  // Gate 2: generator, but not the exercise route — pass through unchanged.
  assert.equal(freshReviewRoute('#/lab/w05-e1', 'genX', 'k'), '#/lab/w05-e1');
  assert.equal(freshReviewRoute('#/lesson/l-foundations-algebra', 'genX', 'k'), '#/lesson/l-foundations-algebra');
  assert.equal(freshReviewRoute('https://example.org/', 'genX', 'k'), 'https://example.org/');
});

test('learning-plan decorate sets reviewDueAt only on reviews and seeds only exercise routes', async () => {
  const { buildWeeklyLearningPlan } = await import('../src/adapters/learning-plan.ts');
  const dueGen = '2026-09-01T00:00:00.000Z';
  const catalog = {
    competencies: [
      { competencyId: 'c-seed', requires: [] },
      { competencyId: 'c-plain', requires: [] },
    ],
    tracks: [{ trackId: 't1', competencyIds: ['c-seed', 'c-plain'] }],
    lessons: [{ lessonId: 'l1', competencyIds: ['c-seed'], estimatedMinutes: 10, title: 'Lektion' }],
    exercises: [
      { definitionId: 'ex-gen', activityType: 'numeric', generatorId: 'genX', competencyIds: ['c-seed'], estimatedMinutes: 8, title: 'Generiert' },
      { definitionId: 'ex-gen-lab', activityType: 'python-code', generatorId: 'genX', competencyIds: ['c-seed'], estimatedMinutes: 8, title: 'Lab' },
      { definitionId: 'ex-plain', activityType: 'numeric', generatorId: null, competencyIds: ['c-plain'], estimatedMinutes: 8, title: 'Ohne Generator' },
    ],
    projects: [],
  };
  const snapshot = {
    trackId: 't1',
    weeklyMinutes: 120,
    evidenceStates: { 'c-seed': 'learning', 'c-plain': 'unassessed' },
    dueReviews: [
      { exerciseId: 'ex-gen', nextDueAt: dueGen, qualifiedHitCount: 2 },
      { exerciseId: 'ex-gen-lab', nextDueAt: '2026-09-02T00:00:00.000Z', qualifiedHitCount: 2 },
      { exerciseId: 'ex-plain', nextDueAt: '2026-09-03T00:00:00.000Z', qualifiedHitCount: 2 },
    ],
  };
  const plan = buildWeeklyLearningPlan(catalog, snapshot);
  const items = plan.days.flatMap((day) => day.items);
  const byId = new Map(items.map((item) => [item.activityId, item]));
  const reviews = items.filter((item) => item.type === 'review');
  assert.equal(reviews.length, 3, 'all three due reviews scheduled');
  for (const review of reviews) {
    assert.ok(review.reasonCodes.includes('review-due'));
  }
  // Routes resolve by activity type: python-code opens the lab route, the
  // numeric definitions open the exercise route (never a wrong-type seed).
  assert.equal(byId.get('ex-gen-lab').route.startsWith('#/lab/ex-gen-lab'), true);
  assert.equal(byId.get('ex-plain').route, '#/exercise/ex-plain');
  // No generator: never a seed parameter, in any state of the fix.
  assert.ok(!byId.get('ex-plain').route.includes('?seed='));
  // Non-review items never carry the task-review field.
  const lesson = byId.get('l1');
  assert.ok(lesson, 'lesson scheduled for learning competency');
  assert.equal('reviewDueAt' in lesson, false, 'lesson must not look like a due review');
  assert.equal(lesson.route, '#/lesson/l1');
  // Contract (ADR-0015 #4/#5): review items carry the scheduler date and
  // generator-backed exercise reviews open a fresh instance. RED until
  // PlanEngine.build keeps `dueAt` on review items — currently the field is
  // dropped, so decorate never sets reviewDueAt and never seeds the route.
  assert.equal(byId.get('ex-gen').reviewDueAt, dueGen, 'review item must expose reviewDueAt');
  assert.equal(byId.get('ex-gen-lab').reviewDueAt, '2026-09-02T00:00:00.000Z');
  assert.equal(byId.get('ex-plain').reviewDueAt, '2026-09-03T00:00:00.000Z');
  assert.equal(byId.get('ex-gen').route, freshReviewRoute('#/exercise/ex-gen', 'genX', `ex-gen:${dueGen}`), 'generator-backed review must open a fresh instance');
  assert.match(byId.get('ex-gen').route, /^#\/exercise\/ex-gen\?seed=\d+$/);
  // The lab route stays unseeded even with a generator (route-prefix gate).
  assert.equal(byId.get('ex-gen-lab').route, '#/lab/ex-gen-lab');
});

test('local-progress snapshot: evidenceDueAt is null for unassessed competencies', async () => {
  const { loadProgressSnapshot } = await import('../src/adapters/local-progress.ts');
  const catalog = { competencies: [{ competencyId: 'c-a' }, { competencyId: 'c-b' }] };
  // In Node there is no IndexedDB, so the adapter takes its empty-snapshot
  // path — exactly the fresh-learner case where nothing was ever assessed.
  const snapshot = await loadProgressSnapshot(catalog);
  assert.equal(snapshot.attemptsCount, 0);
  assert.equal(snapshot.scheduledReviewCount, 0);
  assert.deepEqual(snapshot.dueReviews, []);
  assert.deepEqual(snapshot.evidenceDueAt, { 'c-a': null, 'c-b': null });
  assert.deepEqual(snapshot.evidenceStates, { 'c-a': 'unassessed', 'c-b': 'unassessed' });
});

test('EvidenceEngine drives evidenceDueAt: null unassessed, dated once qualified', () => {
  const competency = {
    competencyId: 'c-fresh',
    evidencePolicy: { minimumIndependentHits: 2, minimumDistinctDefinitions: 2, delayedHitRequired: true, minimumDelayDays: 7, freshnessDays: 30 },
  };
  const engine = new EvidenceEngine([competency]);
  const t0 = Date.UTC(2026, 0, 1);
  const hit = (definitionId, atMs) => ({
    definitionId, exerciseId: definitionId, competencyIds: ['c-fresh'],
    correct: true, masteryEligible: true, evidenceEligible: true, hintsUsed: 0,
    ts: new Date(atMs).toISOString(),
  });
  const events = [hit('d1', t0), hit('d2', t0 + 8 * 86_400_000)];
  const day = 86_400_000;
  // Unassessed: no events at all — dueAt null (adapter maps this to null).
  assert.equal(engine.evaluateCompetency('c-fresh', [], t0).dueAt, null);
  assert.equal(engine.evaluateCompetency('c-fresh', [], t0).state, 'unassessed');
  // Qualified and fresh: retained, with the competency-freshness deadline set.
  const fresh = engine.evaluateAll(events, t0 + day)['c-fresh'];
  assert.equal(fresh.state, 'retained');
  assert.equal(fresh.dueAt, new Date(t0 + 8 * day + 30 * day).toISOString());
  // Long after the deadline (t0+400d): review_due, deadline still reported.
  const expired = engine.evaluateAll(events, t0 + 400 * day)['c-fresh'];
  assert.equal(expired.state, 'review_due');
  assert.equal(expired.dueAt, new Date(t0 + 8 * day + 30 * day).toISOString());
});

// --- 6. post-course behavior (pure functions + source scan) -------------------

test('review scheduler keeps scheduling past any course horizon (repeat-last)', () => {
  const t0 = Date.UTC(2026, 0, 1);
  const day = 86_400_000;
  const hitAt = (atMs) => ({ exerciseId: 'ex-post', correct: true, masteryEligible: true, hintsUsed: 0, ts: new Date(atMs).toISOString() });
  // Ladder long finished, last qualified hit 390 days in — far past 39 weeks.
  const attempts = [0, 2, 5, 11, 22, 33, 390].map((days) => hitAt(t0 + days * day));
  const nowMs = t0 + 400 * day;
  assert.equal(DEFAULT_REVIEW_PARAMS.postLadderPolicy, 'repeat-last', 'repeat-last is the active policy');
  const state = reviewStateFromAttempts(attempts, nowMs);
  assert.equal(state.qualified, true);
  assert.equal(state.consolidated, false, 'repeat-last never consolidates');
  assert.equal(state.qualifiedHitCount, 7);
  assert.equal(state.validUntilMs, t0 + 390 * day + 11 * WEEK_MS);
  // The queue keeps growing: next due = last hit + final slot (11 weeks).
  const entry = buildReviewQueueEntry('ex-post', attempts, nowMs);
  assert.equal(entry.consolidated, false);
  assert.equal(entry.qualifiedHitCount, 7);
  assert.equal(entry.nextDueAt, new Date(t0 + 390 * day + 11 * WEEK_MS).toISOString());
  assert.ok(new Date(entry.nextDueAt).getTime() > t0 + 39 * WEEK_MS, 'due date lies beyond the 39-week projection');
  assert.equal(buildReviewQueueEntries(attempts, nowMs).length, 1);
  // A later hit at t0+400d pushes the deadline further out — no terminal state.
  const later = buildReviewQueueEntry('ex-post', [...attempts, hitAt(t0 + 400 * day)], nowMs);
  assert.equal(later.nextDueAt, new Date(t0 + 400 * day + 11 * WEEK_MS).toISOString());
});

test('no code path special-cases course end or week 39 in store, scheduler or planner', () => {
  const tokenRe = /w39|kursende|course[-_ ]?end|course[-_ ]?complete/i;
  const logicFiles = [
    'assets/js/core/progress_store.js',
    'assets/js/core/review_scheduler.js',
    'assets/js/domain/plan_engine.mjs',
  ];
  for (const relativePath of logicFiles) {
    const source = readFileSync(join(root, relativePath), 'utf8');
    const offending = source.split('\n').filter((line) => tokenRe.test(line));
    assert.deepEqual(offending, [], `${relativePath} must not special-case course end`);
  }
  // The next shell mentions course end only inside the honest prose
  // explanation (planning projection, no gate) — never as logic.
  const viewsTsx = readFileSync(join(root, 'src/ui/views.tsx'), 'utf8');
  const matching = viewsTsx.split('\n').filter((line) => tokenRe.test(line));
  for (const line of matching) {
    assert.ok(/Projektion|kein Enddatum|Planungsprojektion/.test(line), `views.tsx course-end mention must stay explanatory prose: ${line.trim()}`);
  }
  assert.ok(matching.length >= 1, 'post-course explanation expected in ProgressView');
});

// --- 7. UI language: separated timelines in both shells (source structure) ----

test('next shell labels separate task reviews from competency freshness', () => {
  const source = readFileSync(join(root, 'src/ui/views.tsx'), 'utf8');
  // Two distinct labels, not one shared "Review fällig".
  const taskLabel = 'Aufgaben-Review fällig';
  const freshnessLabel = 'Frische abgelaufen (neuer Nachweis nötig)';
  assert.ok(source.includes(taskLabel), 'ReviewView card kicker for task reviews');
  assert.ok(source.includes(freshnessLabel), 'stateLabels.review_due for competency freshness');
  assert.notEqual(taskLabel, freshnessLabel);
  assert.ok(source.includes('Kompetenz-Frische abgelaufen'), 'ProgressView stat counts expired competencies, not tasks');
  assert.ok(source.includes('Zwei getrennte Zeitachsen'), 'ProgressView explains the two timelines');
  assert.ok(source.includes('Kompetenz-Frische ist separat im Fortschritt sichtbar'), 'ReviewView points to the separate competency timeline');
  // ProgressView explains post-course continuation without a gate.
  assert.ok(source.includes('Reviews laufen weiter'));
  assert.ok(source.includes('Planungsprojektion und kein Enddatum'));
  assert.ok(source.includes('ohne künstliche Treffer zu erzeugen'));
});

test('review cards promise a fresh instance only for generator-backed tasks', () => {
  const source = readFileSync(join(root, 'src/ui/views.tsx'), 'utf8');
  assert.match(source, /freshReviewRoute\(route, definition\.generatorId,/);
  assert.match(source, /freshRoute !== route \? ' · öffnet eine frische Instanz' : ''/);
  assert.ok(source.includes('Aufgaben mit Variantengenerator öffnen bei jedem Review eine frische Instanz'));
});

// --- Session-B review fixes: plan hygiene + strict seed parsing ---------------

test('learning-plan drops due reviews whose exercise is not in the catalog (no dead #/learn links)', async () => {
  const { buildWeeklyLearningPlan } = await import('../src/adapters/learning-plan.ts');
  const catalog = {
    competencies: [{ competencyId: 'c-a', requires: [] }],
    tracks: [{ trackId: 't1', competencyIds: ['c-a'] }],
    lessons: [],
    exercises: [{ definitionId: 'ex-real', activityType: 'numeric', generatorId: null, competencyIds: ['c-a'], estimatedMinutes: 8, title: 'Real' }],
    projects: [],
  };
  const snapshot = {
    trackId: 't1',
    weeklyMinutes: 120,
    evidenceStates: { 'c-a': 'learning' },
    dueReviews: [
      { exerciseId: 'ex-real', nextDueAt: '2026-09-01T00:00:00.000Z', qualifiedHitCount: 1 },
      { exerciseId: 'old-exercise-xyz', nextDueAt: '2026-09-01T00:00:00.000Z', qualifiedHitCount: 1 },
    ],
  };
  const plan = buildWeeklyLearningPlan(catalog, snapshot);
  const items = plan.days.flatMap((day) => day.items);
  assert.ok(items.some((item) => item.activityId === 'ex-real'), 'catalog review is scheduled');
  const foreign = items.filter((item) => item.activityId === 'old-exercise-xyz');
  assert.equal(foreign.length, 0, 'foreign review must not consume review budget as a dead plan item');
  for (const item of items) {
    assert.notEqual(item.route, '#/learn', 'no plan item may fall through to the #/learn dead route');
  }
});

test('parseSeedQuery accepts only plain digits (no empty/hex/float coercion to seed 0)', async () => {
  const { parseSeedQuery } = await import('../assets/js/domain/review_route.mjs');
  assert.equal(parseSeedQuery('seed=12345'), 12345);
  assert.equal(parseSeedQuery('seed=0'), 0);
  assert.equal(parseSeedQuery('seed=4294967295'), 4294967295);
  assert.equal(parseSeedQuery('seed='), null, 'empty value must be a no-op, not seed 0');
  assert.equal(parseSeedQuery('seed=%20'), null, 'whitespace must be a no-op');
  assert.equal(parseSeedQuery('seed=0x10'), null, 'hex must be rejected');
  assert.equal(parseSeedQuery('seed=1e3'), null, 'exponent notation must be rejected');
  assert.equal(parseSeedQuery('seed=-5'), null, 'negative must be rejected');
  assert.equal(parseSeedQuery('seed=1.5'), null, 'float must be rejected');
  assert.equal(parseSeedQuery('seed=99999999999'), null, 'beyond uint32 must be rejected');
  assert.equal(parseSeedQuery('other=1'), null, 'missing seed param is a no-op');
  assert.equal(parseSeedQuery(''), null);
});
