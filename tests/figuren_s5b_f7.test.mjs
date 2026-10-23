import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadPyodide } from '../vendor/pyodide/pyodide.mjs';
import { gradeSceneBuild } from '../assets/js/core/scene_build_grader.mjs';
import { figureHintFor, hintSpec, hintTexts } from '../assets/js/figures/kit/hints.mjs';
import { KMEANS_PIZZA_TRACE } from '../assets/js/figures/objects/kmeans-pizza-trace.mjs';
import { generate as generateLearningRate } from '../assets/js/core/procedural/pick-learning-rate.mjs';
import { configureExerciseFamilies, EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import { scenes } from '../assets/js/figures/scenes/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('pick-learning-rate accepts each stable eta and reports an executed run', () => {
  const exercise = generateLearningRate({ seed: 0, caseId: 'stable-convergent-rate', difficulty: 'core' });
  const accepted = exercise.parameters.etaValues.filter((eta) => gradeSceneBuild(exercise, {
    kind: 'scene-build', schemaVersion: 1, form: { eta }, steps: [],
  }).correct);
  assert.deepEqual(accepted, [0.075, 0.125]);
  const result = gradeSceneBuild(exercise, { kind: 'scene-build', schemaVersion: 1, form: { eta: 0.125 }, steps: [] });
  assert.equal(result.simulation.steps.length, exercise.parameters.maxSteps + 1);
  assert.equal(result.fields.every((field) => field.correct), true);
});

test('pick-learning-rate registry varies mastery-eligible seeds and keeps multiple valid choices', async () => {
  await configureExerciseFamilies();
  const family = EXERCISE_FAMILIES.get('pick-learning-rate');
  assert.equal(family.authorityMode, 'seeded');
  assert.equal(family.masteryEligible, true);
  const tasks = Array.from({ length: 10 }, (_, seed) =>
    EXERCISE_FAMILIES.instantiate('pick-learning-rate', seed, 'core', 'stable-convergent-rate'));
  assert.ok(new Set(tasks.map((task) => JSON.stringify(task.parameters))).size > 1);
  for (const task of tasks) {
    const valid = task.parameters.etaValues.filter((eta) => gradeSceneBuild(task, {
      kind: 'scene-build', schemaVersion: 1, form: { eta }, steps: [],
    }).correct);
    assert.ok(valid.length >= 2);
  }
});

test('kmeans-pizza trace equals the vendored canonical Python reference', async () => {
  const family = JSON.parse(await readFile(resolve(root, 'content/families/fit-pca-kmeans-pipeline.json'), 'utf8'));
  const reference = family.cases.find((item) => item.caseId === 'pca-eigh-projection').expected.referenceSolver;
  assert.equal(createHash('sha256').update(reference).digest('hex'), KMEANS_PIZZA_TRACE.solverSha256);
  const py = await loadPyodide({ indexURL: resolve(root, 'vendor/pyodide') + '/' });
  await py.loadPackage(resolve(root, 'vendor/pyodide/numpy-2.4.6-cp314-cp314-pyemscripten_2026_0_wasm32.whl'));
  const snapshots = JSON.parse(await py.runPythonAsync(`${reference}
import json
X=[[0.,0.],[1.,0.],[10.,10.],[11.,10.]]
P=[[-4.,-2.],[-2.,-1.],[-1.,-.5],[1.,.5],[2.,1.],[4.,2.]]
json.dumps({"rounds":[{"round":n,"assignments":kmeans(X,2,0,iters=n)[0].tolist(),"centers":kmeans(X,2,0,iters=n)[1].tolist()} for n in (1,2,3)],"pca":pca(P,2)["components"].tolist()})`));
  assert.deepEqual(snapshots.rounds.map(({ assignments, centers }) => ({ assignments, centers })), KMEANS_PIZZA_TRACE.rounds.map(({ assignments, centers }) => ({ assignments, centers })));
  assert.deepEqual(snapshots.rounds[1].assignments, snapshots.rounds[2].assignments);
  assert.deepEqual(snapshots.rounds[1].centers, snapshots.rounds[2].centers);
  const eigenTheta = Math.atan(Math.abs(snapshots.pca[0][1] / snapshots.pca[0][0]));
  assert.ok(Math.abs(eigenTheta - Math.atan(0.5)) < 1e-12);
  assert.ok(Math.abs(eigenTheta - 0.46) < 0.005);
  const eigenFigure = JSON.parse(await readFile(resolve(root, 'content/lessons/data-ml/eigen-direction.viz.json'), 'utf8'));
  assert.equal(eigenFigure.checkpoint.expected, 3);
  const pcaScene = scenes['pca-shadow'];
  assert.ok(Math.abs(pcaScene.predictValue(pcaScene.model({ theta: 0.2 }), 'step-1') - eigenTheta) < 1e-12);
  assert.ok(Math.abs(pcaScene.predictValue(pcaScene.model({ theta: 1.2 }), 'step-1') - eigenTheta) < 1e-12);
  const kmeansScene = scenes['kmeans-pizza'];
  const beatText = kmeansScene.beatIds.map((_, index) => {
    const state = kmeansScene.build(kmeansScene.model({}), kmeansScene.pose({}, index, 0));
    return state.flatMap((item) => (item.prims ?? []).flatMap((prim) => (prim.runs ?? []).map((run) => run.text ?? ''))).join(' ');
  });
  assert.match(beatText[0], /A|B/);
  assert.match(beatText[0], /Zentren: \(10; 10\) und \(11; 10\)/);
  assert.match(beatText[1], /Gruppenmitteln/);
  assert.match(beatText[2], /Neue Zentren: erneut zuordnen/);
  assert.match(beatText[3], /Konvergenz/);
});

test('neighbor figures are independent of each target case and answer', async () => {
  const catalog = JSON.parse(await readFile(resolve(root, 'content/figure-hints.json'), 'utf8')).hints;
  for (const entry of catalog.filter((item) => item.source === 'neighbor')) {
    const scene = scenes[entry.scene];
    assert.ok(scene, `registered hint scene ${entry.scene}`);
    const first = { familyId: entry.familyId, caseId: entry.caseIds?.[0] ?? 'case-a', instanceId: 'target-a', parameters: { weight: 0.1, classification: 'unique' } };
    const second = { ...first, caseId: 'case-b', instanceId: 'target-b', parameters: { weight: 9.7, classification: 'none' } };
    assert.deepEqual(hintSpec(entry, scene, first), hintSpec(entry, scene, second));
  }
  const pca = scenes['pca-shadow'];
  assert.ok(Math.abs(pca.predictValue(pca.model({ theta: 0.46 }), 'step-1') - 0.46) < 0.02);
});

test('F3/F4, F7, and row-operation families resolve to concrete safe neighbors', async () => {
  const entries = JSON.parse(await readFile(resolve(root, 'content/figure-hints.json'), 'utf8')).hints;
  const keys = entries.flatMap((entry) => (entry.caseIds ?? []).map((caseId) => `${entry.familyId}/${caseId}`));
  for (const key of [
    'classify-rank-solution-case/echelon-read-rank-case',
    'classify-rank-solution-case/rank-system-authored',
    'formula-det2-independence/det2-seeded-columns',
    'transform-rank-dependence-rowops/rank-3x3-staircase',
    'optimize-gradient-update-rule/sign-and-scale-of-update',
    'optimize-sgd-step-pure-update/pure-train-step',
  ]) assert.ok(keys.includes(key), `missing hint for ${key}`);

  const curves = entries.filter((entry) => entry.familyId === 'classify-training-curve');
  assert.equal(curves.length, 1);
  assert.deepEqual(curves[0].caseIds.sort(), ['training-curve-diagnosis', 'training-curve-overfit', 'training-curve-underfit']);
  assert.equal(curves[0].neighborParams.shape, 'all');
  assert.doesNotMatch(`${curves[0].title} ${curves[0].caption}`, /underfit|overfit/i);
  const curveScene = scenes[curves[0].scene];
  const curveItems = curveScene.build(curveScene.model(curves[0].neighborParams), { phase: 0 }, 'hint');
  assert.match(hintTexts(curveItems).join(' '), /Underfitting.*Stabil.*Overfitting/);

  for (const entry of entries.filter((item) => item.familyId.startsWith('optimize-')
    || item.familyId === 'classify-training-curve')) {
    const scene = scenes[entry.scene];
    const model = scene.model(entry.neighborParams, { mode: 'hint' });
    const items = scene.build(model, { phase: 0 }, 'hint');
    assert.doesNotMatch(hintTexts(items).join(' '), /\d/);
  }
});

