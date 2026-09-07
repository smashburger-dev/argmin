import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileContent,
  validateCompetencyGraph,
  validateCompiledContent,
  validateSourceDocument,
} from '../tools/compile_content.mjs';
import { expectedPublicCounts } from './helpers/content_counts.mjs';
import { catalogRoot, discoverJson } from '../tools/content_roots.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('public compiler is deterministic and excludes private-only legacy content', () => {
  const first = compileContent({ projectRoot: root, profile: 'public' });
  const second = compileContent({ projectRoot: root, profile: 'public' });
  assert.equal(first.contentVersion, second.contentVersion);
  assert.match(first.contentVersion, /^[a-f0-9]{64}$/);
  assert.match(first.contractVersion, /^[a-f0-9]{64}$/);
  assert.equal(first.profile, 'public');
  assert.equal(first.locale, 'de');
  const expectedCounts = expectedPublicCounts(root);
  assert.equal(first.competencies.length, expectedCounts.competencies);
  assert.equal(first.tracks.length, expectedCounts.tracks);
  assert.equal(first.lessons.length, expectedCounts.lessons);
  assert.equal(first.learningModules.length, expectedCounts.modules);
  assert.equal(first.projects.length, expectedCounts.projects);
  assert.equal(first.explanations.length, expectedCounts.explanations);
  assert.equal(first.lessons.every((lesson) => lesson.blocks.every((block) => block.html?.length > 0)), true);
  assert.doesNotMatch(JSON.stringify(first.lessons), /<script|href=\\"javascript:/i);
  assert.equal(first.familyActivities.length, expectedCounts.exercises);
  for (const competencyId of ['c-python-control-flow', 'c-python-collections', 'c-python-files-errors', 'c-testing-debugging', 'c-git-basics']) {
    assert.ok(first.familyActivities.filter((activity) => activity.competencyIds.includes(competencyId)).length >= 2, `${competencyId} needs two evidence activities`);
  }
  const foundations = first.milestones.find((milestone) => milestone.milestoneId === 'ms-foundations');
  for (const competencyId of foundations.competencyIds) {
    const policy = first.competencies.find((competency) => competency.competencyId === competencyId).evidencePolicy;
    const eligible = first.familyActivities.filter((activity) => activity.competencyIds.includes(competencyId) && activity.masteryEligible);
    const modernEligible = first.familyActivities.filter((activity) => activity.competencyIds.includes(competencyId) && activity.masteryEligible);
    assert.ok(
      eligible.length + modernEligible.length >= policy.minimumDistinctDefinitions,
      `${competencyId} cannot satisfy its milestone evidence policy`,
    );
  }
  assert.equal(first.familyActivities.some((activity) => activity.definitionId === 'w05-e7'), false);
  assert.doesNotMatch(JSON.stringify(first), /library-private|private-extracts|locatorPath|localPath|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/);
});

test('competency validator rejects unknown prerequisites and cycles', () => {
  assert.throws(
    () => validateCompetencyGraph([{ competencyId: 'c-a', requires: ['c-missing'] }]),
    /unbekannte Voraussetzung.*c-missing/i,
  );
  assert.throws(
    () => validateCompetencyGraph([
      { competencyId: 'c-a', requires: ['c-b'] },
      { competencyId: 'c-b', requires: ['c-a'] },
    ]),
    /Zyklus.*c-a.*c-b|Zyklus.*c-b.*c-a/i,
  );
});

test('compiled content rejects unknown competency references and incompatible public rights', () => {
  const unknownCompetency = compileContent({ projectRoot: root, profile: 'public' });
  unknownCompetency.families[0].cases[0].competencyIds = ['c-missing'];
  assert.throws(() => validateCompiledContent(unknownCompetency), /unbekannte Kompetenz c-missing/);

  const incompatibleRights = compileContent({ projectRoot: root, profile: 'public' });
  incompatibleRights.sourceRights[0].commercialUseAllowed = false;
  assert.throws(() => validateCompiledContent(incompatibleRights), /Rechte nicht public-kompatibel/);
});

test('JSON Schema validation rejects malformed source documents', () => {
  const source = readJson(join(root, 'content/competencies/core.json'));
  delete source.competencies[0].title;
  assert.throws(() => validateSourceDocument('competency', source, root), /title/);
});

test('all declared schemas use JSON Schema 2020-12', () => {
  const names = [
    'catalog', 'competency', 'track', 'milestone', 'lesson', 'learning-module',
    'exercise-family', 'explanation-card', 'project', 'source-rights',
  ];
  for (const name of names) {
    const schema = readJson(join(root, `schemas/${name}.schema.json`));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.additionalProperties, false);
  }
});

test('content can grow by one lesson and one exercise without touching counters', () => {
  // Growth-counter rule: the derived expectations track the catalog, so a
  // future content phase must not edit any hardcoded number in tests. This
  // test proves the property by actually growing a copy of the catalog.
  const growRoot = mkdtempSync(join(tmpdir(), 'ki-grow-'));
  try {
    cpSync(join(root, 'content'), join(growRoot, 'content'), { recursive: true });
    cpSync(join(root, 'schemas'), join(growRoot, 'schemas'), { recursive: true });
    const before = expectedPublicCounts(root);

    mkdirSync(join(growRoot, 'content/lessons/growth'), { recursive: true });
    writeFileSync(join(growRoot, 'content/lessons/growth/extra.md'), '# Zusatzlektion\n\nEin Absatz.\n');
    const seedLesson = JSON.parse(readFileSync(join(root, 'content/lessons/foundations/algebra.json'), 'utf8'));
    const extraLesson = { ...seedLesson, lessonId: 'l-growth-extra', title: 'Zusatzlektion', blocks: [{ blockId: 'b1', type: 'worked-example', contentRef: 'lessons/growth/extra.md' }] };
    writeFileSync(join(growRoot, 'content/lessons/growth/extra.json'), JSON.stringify(extraLesson));

    const seedFamily = JSON.parse(readFileSync(join(root, 'content/families/classify-attention-roles.json'), 'utf8'));
    const extraFamily = {
      ...seedFamily,
      familyId: 'growth-family',
      cases: [{
        ...seedFamily.cases[0],
        caseId: 'growth-extra-01',
        sourceLineage: ['growth'],
      }],
    };
    writeFileSync(join(growRoot, 'content/families/growth-family.json'), JSON.stringify(extraFamily));
    const growthModulePath = join(growRoot, 'content/modules/git-basics.json');
    const growthModule = JSON.parse(readFileSync(growthModulePath, 'utf8'));
    growthModule.placements.push({
      placementId: 'p-growth-extra',
      role: 'curated',
      familyId: 'growth-family',
      caseId: 'growth-extra-01',
      seed: 0,
      difficulty: extraFamily.cases[0].difficultyProfile,
      estimatedMinutes: 5,
      lessonId: 'l-foundations-git',
      masteryEligible: false,
    });
    writeFileSync(growthModulePath, JSON.stringify(growthModule));

    const after = expectedPublicCounts(growRoot);
    assert.equal(after.lessons, before.lessons + 1, 'derived lesson count must follow the catalog');
    assert.equal(after.exercises, before.exercises + 1, 'derived activity count must follow the catalog');
    const grown = compileContent({ projectRoot: growRoot, profile: 'public' });
    assert.equal(grown.lessons.length, after.lessons, 'compiled bundle grows with the catalog without counter edits');
    assert.equal(grown.familyActivities.length, after.exercises);
    assert.ok(grown.lessons.some((lesson) => lesson.lessonId === 'l-growth-extra'));
    assert.ok(grown.familyActivities.some((activity) => activity.definitionId === 'growth-family:growth-extra-01'));
  } finally {
    rmSync(growRoot, { recursive: true, force: true });
  }
});

test('golden path 1 compiles git basics from one author file with derived duration', () => {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const module = bundle.learningModules.find((item) => item.moduleId === 'lm-git-basics');
  assert.ok(module, 'lm-git-basics must be discovered without a catalog file list');
  assert.equal(module.durationOverridden, false);
  assert.equal(module.derivedMinutes, 63);
  assert.equal(module.estimatedMinutes, 63);
  assert.deepEqual(module.lessonIds, ['l-foundations-git']);
  assert.equal(module.placements.filter((item) => item.role === 'curated').length, 4);
  assert.equal(module.placements.filter((item) => item.role === 'practice-space').length, 2);
  assert.equal(bundle.learningModules.length, expectedPublicCounts(root).modules);
});

test('compiler rejects orphan files under a declared content root', () => {
  const orphanRoot = mkdtempSync(join(tmpdir(), 'ki-orphan-'));
  try {
    cpSync(join(root, 'content'), join(orphanRoot, 'content'), { recursive: true });
    cpSync(join(root, 'schemas'), join(orphanRoot, 'schemas'), { recursive: true });
    writeFileSync(join(orphanRoot, 'content/lessons/stray.txt'), 'orphan');
    assert.throws(
      () => compileContent({ projectRoot: orphanRoot, profile: 'public', cache: 'none' }),
      /Verwaiste Dateien unter lessons: lessons\/stray\.txt/,
    );
  } finally {
    rmSync(orphanRoot, { recursive: true, force: true });
  }
});

test('a new exercise is a family placement without catalog, UI, ledger or build-list edits', () => {
  const placeRoot = mkdtempSync(join(tmpdir(), 'ki-place-'));
  try {
    cpSync(join(root, 'content'), join(placeRoot, 'content'), { recursive: true });
    cpSync(join(root, 'schemas'), join(placeRoot, 'schemas'), { recursive: true });
    const modulePath = join(placeRoot, 'content/modules/git-basics.json');
    const module = JSON.parse(readFileSync(modulePath, 'utf8'));
    module.placements.push({
      placementId: 'p-git-next-action-seed-7',
      role: 'curated',
      familyId: 'classify-git-operation',
      caseId: 'diff-unstaged',
      seed: 7,
      difficulty: 'core',
      masteryEligible: true,
    });
    writeFileSync(modulePath, JSON.stringify(module));
    const catalogBefore = readFileSync(join(root, 'content/catalog.json'), 'utf8');
    const catalogAfter = readFileSync(join(placeRoot, 'content/catalog.json'), 'utf8');
    assert.equal(catalogAfter, catalogBefore);
    const bundle = compileContent({ projectRoot: placeRoot, profile: 'public', cache: 'none' });
    const compiled = bundle.learningModules.find((item) => item.moduleId === 'lm-git-basics');
    assert.ok(compiled.placements.some((item) => item.placementId === 'p-git-next-action-seed-7'));
    assert.equal(compiled.placements.find((item) => item.placementId === 'p-git-next-action-seed-7').definitionId, undefined);
    module.placements.push({
      placementId: 'p-unknown-family',
      role: 'curated',
      familyId: 'classify-no-such-family',
      caseId: 'diff-unstaged',
      seed: 1,
      difficulty: 'core',
      masteryEligible: true,
    });
    writeFileSync(modulePath, JSON.stringify(module));
    assert.throws(
      () => compileContent({ projectRoot: placeRoot, profile: 'public', cache: 'none' }),
      /Unbekannte Familie classify-no-such-family/,
    );
  } finally {
    rmSync(placeRoot, { recursive: true, force: true });
  }
});
