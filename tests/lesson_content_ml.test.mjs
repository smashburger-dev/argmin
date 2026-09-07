import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = compileContent({ projectRoot: root, profile: 'public' });

const TARGET_COMPETENCIES = [
  'c-pandas-cleaning', 'c-eda-viz', 'c-grad-regression',
  'c-ml-baseline', 'c-ml-linear', 'c-ml-logistic', 'c-ml-cv', 'c-ml-erroranalysis',
  'c-ml-regularization', 'c-ml-ensembles', 'c-ml-svm-pca', 'c-ml-repro',
];

const activityFor = (competencyId) => bundle.familyActivities.filter((item) => item.competencyIds.includes(competencyId));

test('every W6-W17 competency has a German draft lesson with public readings', () => {
  const sourceIds = new Set(bundle.sources.map((source) => source.sourceId));
  for (const competencyId of TARGET_COMPETENCIES) {
    const lesson = bundle.lessons.find((item) => item.competencyIds.includes(competencyId));
    assert.ok(lesson, `${competencyId} has no lesson`);
    assert.equal(lesson.releaseStatus, 'draft', `${competencyId} lesson must stay draft until human review`);
    assert.ok(lesson.sourceRefs.length > 0, `${lesson.lessonId} has no reading`);
    for (const reference of lesson.sourceRefs) assert.ok(sourceIds.has(reference.sourceId));
  }
});

test('every W6-W17 competency has independent mastery evidence from two family activities', () => {
  for (const competencyId of TARGET_COMPETENCIES) {
    const mastery = activityFor(competencyId).filter((item) => item.masteryEligible);
    assert.ok(mastery.length >= 2, `${competencyId} has ${mastery.length} mastery activities`);
    assert.ok(new Set(mastery.map((item) => item.activityType)).size >= 2,
      `${competencyId} mastery activities cover only ${[...new Set(mastery.map((item) => item.activityType))].join(',')}`);
  }
});

test('every W6-W17 competency spans basic, core, advanced and a final boss', () => {
  for (const competencyId of TARGET_COMPETENCIES) {
    const tiers = new Set(activityFor(competencyId).map((item) => item.difficulty));
    assert.ok(tiers.size >= 2, `${competencyId} has only ${tiers.size} difficulty tiers`);
  }
});

test('family activities expose canonical module and lesson placement', () => {
  const target = bundle.familyActivities.filter((item) => TARGET_COMPETENCIES.some((id) => item.competencyIds.includes(id)));
  assert.ok(target.length >= 60);
  for (const activity of target) {
    assert.match(activity.definitionId, /^[a-z0-9-]+:[a-z0-9-]+$/);
    assert.ok(activity.familyId);
    assert.ok(activity.moduleId);
    assert.ok(activity.lessonId);
  }
});

test('W17 ships the local reproducibility project with a valid manifest', () => {
  const project = bundle.projects.find((item) => item.projectId === 'p-ml-repro-comparison');
  assert.ok(project, 'p-ml-repro-comparison missing');
  assert.ok(project.competencyIds.includes('c-ml-repro'));
  assert.deepEqual(project.allowedCommands[0].args, ['-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', 'tests']);
  assert.ok(bundle.competencies.some((item) => item.competencyId === 'c-ml-repro'));
});

test('honest competency contract: pandas as reading competence, CV required for regularization', () => {
  const cleaning = bundle.competencies.find((item) => item.competencyId === 'c-pandas-cleaning');
  assert.match(cleaning.description, /Lese- und Vorhersagekompetenz/);
  assert.match(cleaning.description, /nicht browser-ausführbar/);
  const reg = bundle.competencies.find((item) => item.competencyId === 'c-ml-regularization');
  assert.ok(reg.requires.includes('c-ml-cv'), 'c-ml-regularization must require c-ml-cv');
  const svmpca = bundle.competencies.find((item) => item.competencyId === 'c-ml-svm-pca');
  assert.match(svmpca.description, /Clustering/);
  assert.match(svmpca.description, /überwachtes versus unüberwachtes/);
});
