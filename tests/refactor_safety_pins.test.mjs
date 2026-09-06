// Refactor safety pins: characterization tests that freeze behavior the
// shrink-complexity refactor must not change. Each test drives the real
// derivation functions (no reimplementations) with injected time and I/O.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';
import { reviewStateFromAttempts } from '../assets/js/core/review_scheduler.js';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import { CompetencyGraph } from '../assets/js/domain/competency_graph.mjs';
import { PlanEngine } from '../assets/js/domain/plan_engine.mjs';
import { ContentRepository } from '../assets/js/core/content_repository.js';
import { validateNextBuild } from '../tools/validate_next_build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 5); // Monday

// (a) -------------------------------------------------------------------------

test('same seed in a new cycle is an independent instance (reveal in cycle 1 does not lock cycle 2)', () => {
  const attempt = (tsMs, over = {}) => ({
    exerciseId: 'ex', seed: 7, answer: '42', correct: true,
    hintsUsed: 0, revealedSolution: false, masteryEligible: true,
    ts: new Date(tsMs).toISOString(), ...over,
  });
  // Real derivation shape: a correct attempt in cycle c1, then the solution
  // reveal event on that same c1 instance, then a correct attempt on the
  // same seed in the new cycle c2.
  const attempts = [
    attempt(t0, { instanceId: 'ex:c1:7' }),
    attempt(t0 + 1, { instanceId: 'ex:c1:7', answer: null, correct: false, revealedSolution: true, event: 'solution' }),
    attempt(t0 + 2, { instanceId: 'ex:c2:7' }),
  ];

  const st = reviewStateFromAttempts(attempts, t0 + 3, undefined, 'ex:c2:7');
  assert.equal(st.locked, false, 'c2 instance must not inherit the c1 lock');
  assert.equal(st.qualified, true);
  assert.equal(st.qualifiedHitCount, 1, 'only the c2 hit survives; the c1 hit is disqualified per instance');
  assert.equal(st.lastQualifiedAtMs, t0 + 2);

  const mastery = masteryFromAttempts(attempts, t0 + 3, undefined, 'ex:c2:7');
  assert.equal(mastery.mastered, true);
  assert.equal(mastery.reason, 'ok');
  assert.equal(mastery.locked, false);

  // The c2 hit also stands on its own when no current instance is pinned.
  const unpinned = reviewStateFromAttempts(attempts, t0 + 3);
  assert.equal(unpinned.locked, false);
  assert.equal(unpinned.qualified, true);
});

// (b) -------------------------------------------------------------------------

test('a later ineligible attempt does not revoke an earlier qualified hit on the same instance', () => {
  const engine = new EvidenceEngine([
    { competencyId: 'c-e', requires: [], evidencePolicy: { minimumIndependentHits: 1, minimumDistinctDefinitions: 1, delayedHitRequired: false, minimumDelayDays: 0, freshnessDays: 30 } },
  ]);
  const hit = (occurredAtMs, over = {}) => ({
    eventType: 'attempt', competencyIds: ['c-e'], definitionId: 'd-1', instanceId: 'i1',
    occurredAt: new Date(occurredAtMs).toISOString(), correct: true, evidenceEligible: true,
    masteryEligible: true, hintsUsed: 0, revealedSolution: false, ...over,
  });
  const events = [
    hit(t0),
    hit(t0 + DAY, { correct: false, evidenceEligible: true }), // later wrong answer on the SAME instance
  ];

  const result = engine.evaluateCompetency('c-e', events, t0 + 2 * DAY);
  assert.notEqual(result.state, 'learning');
  assert.ok(['demonstrated', 'retained'].includes(result.state), `expected a qualified state, got ${result.state}`);
  assert.equal(result.evidenceCount, 1, 'the earlier qualified hit survives and is not overwritten');
  assert.equal(result.lastQualifiedAt, new Date(t0).toISOString());
  assert.deepEqual(result.reasonCodes, []);
});

// (c) -------------------------------------------------------------------------

test('PlanEngine does not plan strengthening items for review_due competencies (renewal runs through the review timeline only)', () => {
  const graph = new CompetencyGraph([{ competencyId: 'c-r', requires: [] }]);
  const planner = new PlanEngine(graph, { reviewBudgetRatio: 0.35 });
  const request = (state) => ({
    goalCompetencyIds: ['c-r'],
    availableMinutes: 60,
    availableDays: 1,
    evidenceByCompetency: { 'c-r': { state } },
    activities: [
      { activityId: 'l-r', type: 'lesson', competencyIds: ['c-r'], estimatedMinutes: 20 },
      { activityId: 'e-r', type: 'exercise', competencyIds: ['c-r'], estimatedMinutes: 15 },
      { activityId: 'r-r', type: 'review', competencyIds: ['c-r'], estimatedMinutes: 10, dueAt: new Date(t0).toISOString() },
    ],
  });

  const plan = planner.build(request('review_due'));
  assert.deepEqual(plan.items.map((item) => item.type), ['review'], 'only the due review item is planned');
  assert.equal(plan.items[0].activityId, 'r-r');
  assert.deepEqual(plan.items[0].reasonCodes, ['review-due']);
  assert.equal(plan.items.some((item) => item.reasonCodes.includes('strengthen-competency')), false);
  assert.equal(plan.items.some((item) => item.type === 'lesson' || item.type === 'exercise'), false);

  // Control: the same activities ARE planned once the state is unsatisfied —
  // the gate is the review_due state, not the budget or the graph.
  const strengthening = planner.build(request('learning'));
  assert.deepEqual(strengthening.items.map((item) => item.activityId), ['r-r', 'l-r', 'e-r']);
  assert.equal(strengthening.items.some((item) => item.reasonCodes.includes('strengthen-competency')), true);
});

// (d) -------------------------------------------------------------------------

// Minimal Next-build tree, mirroring tests/next_build_validator.test.mjs
// (non-unified profile: only index.html plus assets/<name>.js|css are legal).
function buildFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ki-next-pins-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"><div id="app"></div><script type="module" src="./assets/app.js"></script>');
  writeFileSync(join(dir, 'assets/app.js'), 'document.querySelector("#app").textContent = "ok";');
  writeFileSync(join(dir, 'assets/app.css'), ':root{color:#111;background:#fff}');
  return dir;
}

test('next build budget gates fire: initial JS > 150 KiB and lazy chunk > 250 KiB are rejected', () => {
  // Random bytes are incompressible under gzip, so the gzipped size tracks
  // the written size (ADR-0013 budgets are gzip budgets).
  const initialDir = buildFixture();
  const lazyDir = buildFixture();
  try {
    writeFileSync(join(initialDir, 'assets/app.js'), randomBytes(200 * 1024));
    assert.throws(() => validateNextBuild(initialDir), /Initiales JavaScript-Budget überschritten/);

    // The lazy chunk is not referenced by index.html, so it only hits the
    // per-chunk cap, not the initial-entry budget.
    writeFileSync(join(lazyDir, 'assets/lazy-big.js'), randomBytes(300 * 1024));
    assert.throws(() => validateNextBuild(lazyDir), /Lazy-JavaScript-Chunk zu groß: assets\/lazy-big\.js/);
  } finally {
    rmSync(initialDir, { recursive: true, force: true });
    rmSync(lazyDir, { recursive: true, force: true });
  }
});

// (e) -------------------------------------------------------------------------

test('content-repository caches chunks and dedupes in-flight loads', async () => {
  // The parallel TS adapter (src/adapters/content-repository.ts) resolves
  // @content-index/@content-chunks through a vite alias and cannot be
  // imported under plain node --test — pin its cache + in-flight dedupe
  // semantics at the source level (same technique as
  // tests/generator_registry.test.mjs), and pin the behavioral caching on
  // the legacy ContentRepository, which is plain node-importable.
  const adapterSource = readFileSync(join(root, 'src/adapters/content-repository.ts'), 'utf8');
  assert.match(adapterSource, /const inFlight = pending\.get\(key\)/);
  assert.match(adapterSource, /if \(inFlight\) return inFlight/);
  assert.match(adapterSource, /lessonCache\.set\(lessonId, lesson\)/);
  assert.match(adapterSource, /exerciseCache\.set\(definitionId, exercise\)/);

  const bodies = {
    'content/exercises/w01.json': {
      schemaVersion: 1,
      weekId: 'w01',
      exercises: [{ definitionId: 'w01-e1', competencyIds: ['c-w01'] }],
    },
    'content/catalog.json': {
      schemaVersion: 1,
      catalogId: 'catalog-test',
      exerciseDefinitionFiles: ['exercise-definitions/foundations/git-next-action.json'],
    },
    'content/exercise-definitions/foundations/git-next-action.json': {
      definitionId: 'f-git-next-action-01',
      competencyIds: ['c-git'],
      activityType: 'numeric',
    },
  };
  const fetches = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path) => {
    fetches.push(path);
    const json = bodies[path];
    if (!json) return { ok: false, status: 404, json: async () => { throw new Error('not found'); } };
    return { ok: true, status: 200, json: async () => json };
  };
  try {
    // The legacy repository caches at MODULE level; node --test runs several
    // test files in one process, so earlier files may have populated the
    // cache. Import a pristine module instance (query busts the ESM cache)
    // so fetch counts are deterministic.
    const { ContentRepository: FreshRepository } = await import(`../assets/js/core/content_repository.js?pin=${Math.random()}`);
    const repository = new FreshRepository();

    const firstWeek = await repository.exercisesForWeek('w01');
    const secondWeek = await repository.exercisesForWeek('w01');
    assert.deepEqual(secondWeek, firstWeek);
    assert.equal(fetches.filter((path) => path === 'content/exercises/w01.json').length, 1, 'week pack must be fetched once and served from cache');

    const firstDefinition = await repository.exerciseDefinition('f-git-next-action-01');
    const secondDefinition = await repository.exerciseDefinition('f-git-next-action-01');
    assert.equal(firstDefinition.definitionId, 'f-git-next-action-01');
    assert.deepEqual(secondDefinition, firstDefinition);
    assert.equal(fetches.filter((path) => path === 'content/catalog.json').length, 1, 'catalog must be fetched once');
    assert.equal(fetches.filter((path) => path === 'content/exercise-definitions/foundations/git-next-action.json').length, 1, 'definition file must be fetched once');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
