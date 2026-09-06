import test from 'node:test';
import { expectedPublicCounts } from './helpers/content_counts.mjs';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CompetencyGraph } from '../assets/js/domain/competency_graph.mjs';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import { DiagnosticEngine } from '../assets/js/domain/diagnostic_engine.mjs';
import { PlanEngine } from '../assets/js/domain/plan_engine.mjs';
import { ExerciseRegistry } from '../assets/js/domain/exercise_registry.mjs';
import { StaticTutor, buildTutorPrompt } from '../assets/js/domain/tutor_engine.mjs';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 1);
const competencies = [
  { competencyId: 'c-a', requires: [], evidencePolicy: { minimumIndependentHits: 2, minimumDistinctDefinitions: 2, delayedHitRequired: true, minimumDelayDays: 1, freshnessDays: 30 } },
  { competencyId: 'c-b', requires: ['c-a'], evidencePolicy: { minimumIndependentHits: 1, minimumDistinctDefinitions: 1, delayedHitRequired: false, minimumDelayDays: 0, freshnessDays: 30 } },
  { competencyId: 'c-c', requires: ['c-b'], evidencePolicy: { minimumIndependentHits: 1, minimumDistinctDefinitions: 1, delayedHitRequired: false, minimumDelayDays: 0, freshnessDays: 30 } },
];

const hit = (competencyId, definitionId, instanceId, occurredAt, extra = {}) => ({
  eventType: 'attempt', competencyIds: [competencyId], definitionId, instanceId,
  occurredAt: new Date(occurredAt).toISOString(), correct: true, evidenceEligible: true,
  hintsUsed: 0, revealedSolution: false, ...extra,
});

test('competency graph resolves prerequisite paths and unlocked nodes deterministically', () => {
  const graph = new CompetencyGraph(competencies);
  assert.deepEqual(graph.topologicalOrder(), ['c-a', 'c-b', 'c-c']);
  assert.deepEqual(graph.pathTo(['c-c']), ['c-a', 'c-b', 'c-c']);
  assert.deepEqual(graph.unlocked({ 'c-a': 'retained', 'c-b': 'unassessed', 'c-c': 'unassessed' }), ['c-a', 'c-b']);
  assert.deepEqual(graph.explainUnlock('c-c', { 'c-a': 'retained', 'c-b': 'learning' }), {
    competencyId: 'c-c', unlocked: false, missingPrerequisiteIds: ['c-b'],
  });
});

test('evidence engine requires independent delayed evidence and expires it', () => {
  const engine = new EvidenceEngine(competencies);
  const first = engine.evaluateCompetency('c-a', [hit('c-a', 'd-1', 'i-1', t0)], t0 + DAY);
  assert.equal(first.state, 'learning');
  assert.deepEqual(first.reasonCodes, ['insufficient-independent-hits', 'insufficient-distinct-definitions', 'delayed-hit-missing']);

  const events = [hit('c-a', 'd-1', 'i-1', t0), hit('c-a', 'd-2', 'i-2', t0 + 2 * DAY)];
  const retained = engine.evaluateCompetency('c-a', events, t0 + 3 * DAY);
  assert.equal(retained.state, 'retained');
  assert.equal(retained.evidenceCount, 2);
  assert.equal(retained.distinctDefinitionCount, 2);

  const due = engine.evaluateCompetency('c-a', events, t0 + 33 * DAY);
  assert.equal(due.state, 'review_due');
  assert.deepEqual(due.reasonCodes, ['evidence-expired']);
});

test('a revealed solution disqualifies only its instance', () => {
  const engine = new EvidenceEngine(competencies);
  const events = [
    hit('c-a', 'd-1', 'i-1', t0, { eventType: 'solution-revealed', correct: false, evidenceEligible: false, revealedSolution: true }),
    hit('c-a', 'd-1', 'i-1', t0 + DAY),
    hit('c-a', 'd-2', 'i-2', t0 + 2 * DAY),
    hit('c-a', 'd-3', 'i-3', t0 + 3 * DAY),
  ];
  const result = engine.evaluateCompetency('c-a', events, t0 + 4 * DAY);
  assert.equal(result.state, 'retained');
  assert.equal(result.evidenceCount, 2);
  assert.deepEqual(result.disqualifiedInstanceIds, ['i-1']);
});

test('diagnosis recommends due reviews and the earliest weak prerequisite with reasons', () => {
  const graph = new CompetencyGraph(competencies);
  const engine = new DiagnosticEngine(graph);
  const result = engine.diagnose({
    goalCompetencyIds: ['c-c'],
    evidenceByCompetency: {
      'c-a': { state: 'review_due' },
      'c-b': { state: 'learning' },
      'c-c': { state: 'unassessed' },
    },
  });
  assert.deepEqual(result.recommendations.slice(0, 2), [
    { type: 'review', competencyId: 'c-a', reasonCodes: ['review-due', 'goal-prerequisite'] },
    { type: 'lesson', competencyId: 'c-b', reasonCodes: ['weak-competency', 'goal-prerequisite'] },
  ]);
  assert.equal(result.recommendations.some((item) => item.competencyId === 'c-c'), false);
});

test('weekly plan is deterministic, respects budget, review cap and prerequisites', () => {
  const graph = new CompetencyGraph(competencies);
  const planner = new PlanEngine(graph, { reviewBudgetRatio: 0.35 });
  const request = {
    goalCompetencyIds: ['c-c'],
    availableMinutes: 45,
    availableDays: 3,
    evidenceByCompetency: {
      'c-a': { state: 'retained' },
      'c-b': { state: 'unassessed' },
      'c-c': { state: 'unassessed' },
    },
    activities: [
      { activityId: 'r-a', type: 'review', competencyIds: ['c-a'], estimatedMinutes: 10, dueAt: '2026-01-01T00:00:00.000Z' },
      { activityId: 'l-b', type: 'lesson', competencyIds: ['c-b'], estimatedMinutes: 20 },
      { activityId: 'e-b', type: 'exercise', competencyIds: ['c-b'], estimatedMinutes: 15 },
      { activityId: 'l-c', type: 'lesson', competencyIds: ['c-c'], estimatedMinutes: 20 },
    ],
  };
  const first = planner.build(request);
  const second = planner.build(request);
  assert.deepEqual(first, second);
  assert.equal(first.totalMinutes, 45);
  assert.deepEqual(first.items.map((item) => item.activityId), ['r-a', 'l-b', 'e-b']);
  assert.equal(first.items.some((item) => item.activityId === 'l-c'), false);
  assert.equal(first.days.length, 3);
  assert.equal(first.days.flatMap((day) => day.items).length, 3);
});

test('exercise registry indexes definitions and instantiates legacy families', () => {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const registry = new ExerciseRegistry(bundle.exerciseDefinitions);
  assert.equal(registry.size, expectedPublicCounts(root).exercises);
  assert.ok(registry.forCompetency('c-algebra-basics').some((item) => item.definitionId === 'w01-e8'));
  const instance = registry.instantiate('w01-e8', 811);
  assert.equal(instance.expectedAnswer.value, 9);
  assert.match(instance.prompt, /Löse/);
  assert.throws(() => new ExerciseRegistry([bundle.exerciseDefinitions[0], bundle.exerciseDefinitions[0]]), /doppelte Definition/);
});

test('static tutor selects bounded hints and prompt export forbids authoritative grading', () => {
  const tutor = new StaticTutor([
    {
      explanationId: 'x-sign', competencyIds: ['c-a'], diagnosticCodes: ['wrong-sign'],
      helpLevel: 2, body: 'Prüfe zuerst das Vorzeichen.', steps: ['Markiere den negativen Term.'],
      example: 'x - 2', counterexample: 'x + 2', sourceRefs: ['open-source'], followUpActivityIds: ['e-a'], revealsSolution: false,
    },
    {
      explanationId: 'x-sign-solution', competencyIds: ['c-a'], diagnosticCodes: ['wrong-sign'],
      helpLevel: 6, body: 'Vollständiger Lösungsweg.', steps: [], sourceRefs: ['open-source'],
      followUpActivityIds: ['e-a'], revealsSolution: true,
    },
  ]);
  const response = tutor.respond({ competencyIds: ['c-a'], diagnosticCodes: ['wrong-sign'], helpLevel: 2 });
  assert.equal(response.explanationId, 'x-sign');
  assert.equal(response.advisory, true);
  assert.equal(response.revealsSolution, false);
  assert.equal(response.example, 'x - 2');
  assert.equal(response.counterexample, 'x + 2');
  assert.throws(() => new StaticTutor([{ explanationId: 'x-bad', competencyIds: ['c-a'], diagnosticCodes: ['x'], helpLevel: 2, body: 'Lösung', steps: [], sourceRefs: [], followUpActivityIds: [], revealsSolution: true }]), /Lösung.*Hilfestufe 6/);

  const prompt = buildTutorPrompt({ task: 'Löse 2x=4', learnerAttempt: 'x=4', diagnosticCodes: ['division-missing'], helpLevel: 2 });
  assert.match(prompt, /keine vollständige Lösung/i);
  assert.match(prompt, /nicht verbindlich bewerten/i);
  assert.match(prompt, /x=4/);
});

test('compiled Foundations explanation cards resolve through the static tutor', () => {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const tutor = new StaticTutor(bundle.explanations);
  const response = tutor.respond({ competencyIds: ['c-python-control-flow'], diagnosticCodes: ['wrong-order'], helpLevel: 2 });
  assert.equal(response.explanationId, 'x-control-order');
  assert.equal(response.revealsSolution, false);
  assert.deepEqual(response.followUpActivityIds, ['f-control-parsons-01']);
  assert.deepEqual(response.sourceRefs, ['py-tutorial-official-3.14']);
  assert.match(response.counterexample, /return/);
  assert.equal(bundle.explanations.every((card) => !card.revealsSolution || card.helpLevel === 6), true);
});
