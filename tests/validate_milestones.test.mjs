import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { ARTIFACT_KINDS, validateMilestoneArtifacts } from '../tools/validate_milestones.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicBundle = compileContent({ projectRoot: root, profile: 'public' });

test('real catalog covers every requiredArtifact in milestone coverage', () => {
  const { rows, violations } = validateMilestoneArtifacts(publicBundle);
  const coverageRows = publicBundle.milestones.reduce((count, milestone) => count + milestone.coverage.length, 0);
  assert.equal(rows.length, coverageRows);
  assert.deepEqual(violations, []);
});

function syntheticBundle(requiredArtifacts, overrides = {}) {
  return {
    milestones: [{ milestoneId: 'ms-x', title: 'X', coverage: [{ competencyId: 'c-x', status: 'new', requiredArtifacts }] }],
    lessons: [],
    learningModules: [],
    familyActivities: [],
    projects: [],
    ...overrides,
  };
}

test('empty catalog flags every required artifact kind', () => {
  const { violations } = validateMilestoneArtifacts(syntheticBundle(ARTIFACT_KINDS));
  assert.equal(violations.length, ARTIFACT_KINDS.length);
  assert.deepEqual(violations.map((v) => v.artifact).sort(), [...ARTIFACT_KINDS].sort());
  assert.ok(violations.every((v) => v.milestoneId === 'ms-x' && v.competencyId === 'c-x'));
});

test('unknown artifact kinds are violations, not silently skipped', () => {
  const { violations } = validateMilestoneArtifacts(syntheticBundle(['mentor-session']));
  assert.equal(violations.length, 1);
  assert.equal(violations[0].artifact, 'mentor-session');
  assert.equal(violations[0].known, false);
});

test('artifact predicates discriminate roles, difficulty and lesson binding', () => {
  const coreActivity = {
    definitionId: 'fam-x:core-case', familyId: 'fam-x', caseId: 'core-case', seed: 0,
    competencyIds: ['c-x'], masteryEligible: true, difficulty: 'core', lessonId: null, moduleId: 'lm-x',
  };
  const bundle = syntheticBundle(ARTIFACT_KINDS, {
    lessons: [{ lessonId: 'l-x', competencyIds: ['c-x'], blocks: [{ blockId: 'b1', type: 'worked-example', html: '<p>Text</p>' }] }],
    learningModules: [{ moduleId: 'lm-x', competencyIds: ['c-x'], lessonIds: ['l-x'], projectIds: [], placements: [] }],
    familyActivities: [coreActivity],
    projects: [],
  });
  // lesson + evidence-families + delayed-review pass via the core activity;
  // diagnostic (nothing formative), guided-practice (no lesson binding) and
  // project-step (no project link) fail.
  let { violations } = validateMilestoneArtifacts(bundle);
  assert.deepEqual(violations.map((v) => v.artifact).sort(), ['diagnostic', 'guided-practice', 'project-step']);

  // An intro placement bound to the lesson is the formative anchor and the
  // guided practice; a module project covers project-step.
  bundle.familyActivities.push({ ...coreActivity, definitionId: 'fam-x:intro-case', caseId: 'intro-case', difficulty: 'intro', lessonId: 'l-x' });
  bundle.learningModules[0].projectIds.push('p-x');
  bundle.projects.push({ projectId: 'p-x', competencyIds: ['c-x'] });
  ({ violations } = validateMilestoneArtifacts(bundle));
  assert.deepEqual(violations, []);
});

test('diagnostic also passes via non-mastery activity or lesson checkpoint', () => {
  const formative = syntheticBundle(['diagnostic'], {
    lessons: [{ lessonId: 'l-x', competencyIds: ['c-x'], blocks: [{ blockId: 'b1', type: 'worked-example', html: '' }] }],
    familyActivities: [{ definitionId: 'fam-x:fc', competencyIds: ['c-x'], masteryEligible: false, difficulty: 'stretch', lessonId: null }],
  });
  assert.deepEqual(validateMilestoneArtifacts(formative).violations, []);
  const checkpoint = syntheticBundle(['diagnostic'], {
    lessons: [{ lessonId: 'l-x', competencyIds: ['c-x'], blocks: [{ blockId: 'b1', type: 'checkpoint', html: '<p>Check</p>' }] }],
  });
  assert.deepEqual(validateMilestoneArtifacts(checkpoint).violations, []);
});
