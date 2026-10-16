import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertCodePrerequisites,
  assertModuleRequires,
  assertTrackCoverage,
  assertTrackPrerequisiteOrder,
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

// --- Learning-path gates ----------------------------------------------------

const competencies = [
  { competencyId: 'c-a', requires: [] },
  { competencyId: 'c-b', requires: ['c-a'] },
  { competencyId: 'c-c', requires: ['c-b'] },
];

const gateModule = (moduleId, competencyIds, requires = [], trackIds = ['track']) => ({
  moduleId, competencyIds, requires, trackIds, title: moduleId,
});

test('gate a: module requires must equal the union of competency prerequisites', () => {
  assert.doesNotThrow(() => assertModuleRequires([gateModule('m', ['c-b'], ['c-a'])], competencies));
  assert.throws(
    () => assertModuleRequires([gateModule('m', ['c-b'], [])], competencies),
    /m: requires .*weicht vom Kompetenzgraph ab.*c-a/,
  );
});

test('gate b: a module must not teach a competency outside its track list', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-a', 'c-b'] }];
  assert.doesNotThrow(() => assertTrackCoverage([gateModule('m', ['c-b'], [], ['track'])], tracks));
  assert.throws(
    () => assertTrackCoverage([gateModule('m', ['c-b', 'c-c'], [], ['track'])], tracks),
    /track: Modul m lehrt c-c, das der Track nicht führt/,
  );
});

test('gate c: a taught prerequisite must sit at an earlier track position', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-a', 'c-b'] }];
  const ordered = [gateModule('teacher', ['c-a']), gateModule('learner', ['c-b'], ['c-a'])];
  assert.doesNotThrow(() => assertTrackPrerequisiteOrder(ordered, tracks, competencies));
  // c-c needs c-b transitively through c-a: track lists c-c first, teaches c-a
  // but not c-b, so no requires-edge orders the pair and the tie-break wins.
  const late = [{ trackId: 'track', competencyIds: ['c-c', 'c-a'] }];
  const modules = [gateModule('teacher', ['c-a']), gateModule('learner', ['c-c'], ['c-b'])];
  assert.throws(
    () => assertTrackPrerequisiteOrder(modules, late, competencies),
    /track: learner \(Position 1\) braucht c-a, das erst an Position 2 gelehrt wird/,
  );
});

const languageCompetencies = [
  { competencyId: 'c-python-basics', requires: [] },
  { competencyId: 'c-python-mid', requires: ['c-python-basics'] },
  { competencyId: 'c-python-app', requires: ['c-python-mid'] },
  { competencyId: 'c-numpy-basics', requires: ['c-python-basics'] },
  { competencyId: 'c-unrelated', requires: [] },
];

test('gate d: code usage needs the competency in the closure and earlier in every track', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-python-basics', 'c-python-app'] }];
  const modules = [
    gateModule('basics', ['c-python-basics']),
    gateModule('coding', ['c-python-app'], ['c-python-mid']),
  ];
  assert.doesNotThrow(() => assertCodePrerequisites(modules, tracks, languageCompetencies,
    (m) => ({ needsPython: m.moduleId === 'coding', needsNumpy: false })));
  // Track without any teacher for the prerequisite.
  const orphan = [{ trackId: 'empty', competencyIds: ['c-python-app'] }];
  assert.throws(
    () => assertCodePrerequisites([gateModule('coding', ['c-python-app'], ['c-python-mid'], ['empty'])], orphan, languageCompetencies,
      () => ({ needsPython: true, needsNumpy: false })),
    /empty: coding nutzt Python-Code, aber c-python-basics wird nicht gelehrt/,
  );
  // Teacher exists in the track but the tie-break sorts it behind the consumer.
  const late = [{ trackId: 'late', competencyIds: ['c-python-app', 'c-python-basics'] }];
  const lateModules = modules.map((m) => ({ ...m, trackIds: ['late'] }));
  assert.throws(
    () => assertCodePrerequisites(lateModules, late, languageCompetencies,
      () => ({ needsPython: true, needsNumpy: false })),
    /late: coding nutzt Python-Code, aber c-python-basics wird erst an Position 2 gelehrt/,
  );
  // NumPy competency missing from the module's competency closure entirely.
  assert.throws(
    () => assertCodePrerequisites([gateModule('lone', ['c-unrelated'])], [], languageCompetencies,
      () => ({ needsPython: false, needsNumpy: true })),
    /lone: NumPy verlangt c-numpy-basics, das nicht im Kompetenzgraph des Moduls liegt/,
  );
});

test('gate d: the module that teaches the competency itself satisfies the check', () => {
  const tracks = [{ trackId: 'track', competencyIds: ['c-python-basics'] }];
  const modules = [gateModule('teach-python', ['c-python-basics'])];
  assert.doesNotThrow(() => assertCodePrerequisites(modules, tracks, languageCompetencies,
    () => ({ needsPython: true, needsNumpy: false })));
});

test('the real catalog passes all learning-path gates', () => {
  const bundle = compileContent({ projectRoot: root, cache: 'none' });
  const markdownSources = new Map();
  for (const lesson of bundle.lessons) {
    markdownSources.set(lesson.lessonId, (lesson.blocks || [])
      .filter((block) => block.contentRef?.endsWith('.md'))
      .map((block) => readFileSync(join(root, 'content', block.contentRef), 'utf8')));
  }
  assertModuleRequires(bundle.learningModules, bundle.competencies);
  assertTrackCoverage(bundle.learningModules, bundle.tracks);
  assertTrackPrerequisiteOrder(bundle.learningModules, bundle.tracks, bundle.competencies);
  assertCodePrerequisites(bundle.learningModules, bundle.tracks, bundle.competencies,
    (module) => moduleCodeSignals(module, markdownSources));
});
