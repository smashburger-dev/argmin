import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertCodePrerequisites,
  assertTrackClosure,
  assertTrackPrerequisiteOrder,
  deriveLearningGraph,
  moduleRequires,
  orderModulesForTrack,
} from '../assets/js/domain/module_order.mjs';
import { compileContent, moduleCodeSignals } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const track = {
  trackId: 'track',
  competencyIds: ['c-first', 'c-second', 'c-third'],
};

function module(moduleId, competencyIds, requires = [], trackIds = ['track'], title = moduleId) {
  return { moduleId, competencyIds, requires, trackIds, title };
}

test('orders prerequisite modules before dependent modules', () => {
  const result = orderModulesForTrack([
    module('dependent', ['c-second'], ['c-first']),
    module('prerequisite', ['c-first']),
  ], track);
  assert.deepEqual(result.map((item) => item.moduleId), ['prerequisite', 'dependent']);
});

test('uses track competency order as a deterministic tie-break', () => {
  const result = orderModulesForTrack([
    module('third', ['c-third']),
    module('first', ['c-first']),
    module('second', ['c-second']),
  ], track);
  assert.deepEqual(result.map((item) => item.moduleId), ['first', 'second', 'third']);
});

test('keeps unknown dependencies and cycles in deterministic order', () => {
  const result = orderModulesForTrack([
    module('zeta', ['c-third'], ['c-first', 'c-unknown']),
    module('alpha', ['c-first'], ['c-second']),
    module('beta', ['c-second'], ['c-first']),
  ], track);
  assert.deepEqual(result.map((item) => item.moduleId), ['alpha', 'beta', 'zeta']);
});

// --- Derived membership -----------------------------------------------------

const competencies = [
  { competencyId: 'c-a', requires: [] },
  { competencyId: 'c-b', requires: ['c-a'] },
  { competencyId: 'c-c', requires: ['c-b'] },
];

test('moduleRequires is the union of competency prerequisites minus own', () => {
  assert.deepEqual(moduleRequires({ moduleId: 'm', competencyIds: ['c-b'] }, competencies), ['c-a']);
  assert.deepEqual(moduleRequires({ moduleId: 'm', competencyIds: ['c-b', 'c-c'] }, competencies), ['c-a']);
});

test('deriveLearningGraph injects trackIds and requires from the two authored sources', () => {
  const tracks = [
    { trackId: 't-one', competencyIds: ['c-a', 'c-b'] },
    { trackId: 't-two', competencyIds: ['c-c'] },
  ];
  const modules = [
    { moduleId: 'm-ab', competencyIds: ['c-a', 'c-b'] },
    { moduleId: 'm-c', competencyIds: ['c-c'] },
  ];
  const graph = competencies.map((item) => ({ ...item }));
  deriveLearningGraph(tracks, modules, graph);
  assert.deepEqual(graph.find((item) => item.competencyId === 'c-b').trackIds, ['t-one']);
  assert.deepEqual(modules.find((item) => item.moduleId === 'm-ab').trackIds, ['t-one']);
  assert.deepEqual(modules.find((item) => item.moduleId === 'm-c').trackIds, ['t-two']);
  assert.deepEqual(modules.find((item) => item.moduleId === 'm-c').requires, ['c-b']);
});

// --- Learning-path gates ----------------------------------------------------

const gateModule = (moduleId, competencyIds, requires = [], trackIds = ['track']) => ({
  moduleId, competencyIds, requires, trackIds, title: moduleId,
});

test('gate closure: a track must contain the transitive prerequisites it lists', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-a', 'c-b', 'c-c'] }];
  const modules = [gateModule('m-a', ['c-a']), gateModule('m-b', ['c-b']), gateModule('m-c', ['c-c'])];
  assert.doesNotThrow(() => assertTrackClosure(tracks, modules, competencies));
  const open = [{ trackId: 'track', competencyIds: ['c-a', 'c-c'] }];
  assert.throws(
    () => assertTrackClosure(open, [gateModule('m-a', ['c-a']), gateModule('m-c', ['c-c'])], competencies),
    /track: fehlende Voraussetzungen im Track: c-b/,
  );
});

test('gate closure: every listed competency needs a teaching module', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-a', 'c-b'] }];
  assert.throws(
    () => assertTrackClosure(tracks, [gateModule('m-a', ['c-a'])], competencies),
    /track: c-b wird von keinem Modul gelehrt/,
  );
});

test('gate closure: a module may not teach partly inside a track', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-a', 'c-b'] }];
  const modules = [gateModule('m-a', ['c-a']), gateModule('half', ['c-b', 'c-c'])];
  assert.throws(
    () => assertTrackClosure(tracks, modules, competencies),
    /track: Modul half lehrt c-b, aber c-c fehlt im Track/,
  );
});

test('gate order: a taught prerequisite must sit at an earlier track position', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-a', 'c-b'] }];
  const ordered = [gateModule('teacher', ['c-a']), gateModule('learner', ['c-b'], ['c-a'])];
  assert.doesNotThrow(() => assertTrackPrerequisiteOrder(ordered, tracks, competencies));
  // c-c needs c-b transitively through c-a: track lists c-c first and the
  // learner carries no requires-edge, so the tie-break puts it first.
  const late = [{ trackId: 'track', competencyIds: ['c-c', 'c-a', 'c-b'] }];
  const modules = [gateModule('learner', ['c-c']), gateModule('teacher-a', ['c-a']), gateModule('teacher-b', ['c-b'], ['c-a'])];
  assert.throws(
    () => assertTrackPrerequisiteOrder(modules, late, competencies),
    /track: learner \(Position 1\) braucht c-b, das erst an Position 3 gelehrt wird/,
  );
});

const languageCompetencies = [
  { competencyId: 'c-python-basics', requires: [] },
  { competencyId: 'c-python-mid', requires: ['c-python-basics'] },
  { competencyId: 'c-python-app', requires: ['c-python-mid'] },
  { competencyId: 'c-numpy-basics', requires: ['c-python-basics'] },
  { competencyId: 'c-unrelated', requires: [] },
];

test('gate code: code usage needs the competency in the module closure', () => {
  const modules = [gateModule('coding', ['c-python-app'])];
  assert.doesNotThrow(() => assertCodePrerequisites(modules, languageCompetencies,
    () => ({ needsPython: true, needsNumpy: false })));
  assert.throws(
    () => assertCodePrerequisites([gateModule('lone', ['c-unrelated'])], languageCompetencies,
      () => ({ needsPython: true, needsNumpy: false })),
    /lone: Python-Code verlangt c-python-basics, das nicht im Kompetenzgraph des Moduls liegt/,
  );
  assert.throws(
    () => assertCodePrerequisites([gateModule('lone', ['c-unrelated'])], languageCompetencies,
      () => ({ needsPython: false, needsNumpy: true })),
    /lone: NumPy verlangt c-numpy-basics, das nicht im Kompetenzgraph des Moduls liegt/,
  );
});

test('moduleCodeSignals: a lesson python block using NumPy sets needsNumpy', () => {
  const sources = new Map([['l-x', ['Intro\n```python\nimport numpy as np\nnp.array([1])\n```\nEnde']]]);
  const signals = moduleCodeSignals({ moduleId: 'm', lessonIds: ['l-x'], placements: [] }, sources);
  assert.deepEqual(signals, { needsPython: true, needsNumpy: true });
  const plain = moduleCodeSignals({ moduleId: 'm', lessonIds: ['l-y'], placements: [] },
    new Map([['l-y', ['```python\nprint(1)\n```']]]));
  assert.deepEqual(plain, { needsPython: true, needsNumpy: false });
});

test('the real catalog passes all learning-path gates', () => {
  const bundle = compileContent({ projectRoot: root, cache: 'none' });
  const markdownSources = new Map();
  for (const lesson of bundle.lessons) {
    markdownSources.set(lesson.lessonId, (lesson.blocks || [])
      .filter((block) => block.contentRef?.endsWith('.md'))
      .map((block) => readFileSync(join(root, 'content', block.contentRef), 'utf8')));
  }
  assertTrackClosure(bundle.tracks, bundle.learningModules, bundle.competencies);
  assertTrackPrerequisiteOrder(bundle.learningModules, bundle.tracks, bundle.competencies);
  assertCodePrerequisites(bundle.learningModules, bundle.competencies,
    (module) => moduleCodeSignals(module, markdownSources));
});
