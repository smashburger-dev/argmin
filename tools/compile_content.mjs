#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  adaptLegacyExercise,
  hasLegacyGenerator,
  hasLegacyReferenceSolver,
} from '../assets/js/core/legacy_exercise_adapter.mjs';
import { buildLegacyMap } from './migrate_legacy_content.mjs';
import { createPublicLegacyContent, sanitizePublicValue } from './public_content.mjs';
import { renderMarkdown } from './markdown_content.mjs';
import { validateCompetencyGraph } from '../assets/js/domain/competency_graph.mjs';
import { assertFamilyPlacement, configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import {
  assertModuleBindings,
  compileLearningModule,
  indexLearningModules,
} from '../assets/js/domain/learning_module.mjs';
import {
  assertNoOrphans,
  catalogRoot,
  discoverJson,
  discoverProjects,
  jsonOnlyClaims,
  lessonClaims,
  listRootFiles,
  projectPackageClaims,
} from './content_roots.mjs';

export { validateCompetencyGraph };

const defaultProjectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaNames = [
  'catalog', 'competency', 'track', 'milestone', 'lesson', 'learning-module',
  'exercise-definition', 'exercise-family', 'exercise-family-cases', 'explanation-card', 'project', 'tool-card', 'review-findings', 'source-rights',
];
const profiles = new Set(['public', 'local-private']);
const privateMarkers = /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};
const uniqueBy = (items, key, label) => {
  const seen = new Set();
  for (const item of items) {
    const id = item?.[key];
    if (!id || seen.has(id)) throw new Error(`${label}: fehlende oder doppelte ID ${id || '(leer)'}`);
    seen.add(id);
  }
  return seen;
};
const mergeUnique = (base, extra, key, label) => {
  const ids = new Set(base.map((item) => item[key]));
  for (const item of extra) {
    if (!item?.[key] || ids.has(item[key])) throw new Error(`${label}: Overlay-Kollision ${item?.[key] || '(leer)'}`);
    ids.add(item[key]);
  }
  return [...base, ...extra];
};

function resolveContentPath(contentRoot, path, allowedExtensions = ['.json']) {
  if (typeof path !== 'string' || !allowedExtensions.some((extension) => path.endsWith(extension)) || isAbsolute(path) || path.split(/[\\/]/).includes('..')) {
    throw new Error(`Ungültiger Katalogpfad ${JSON.stringify(path)}`);
  }
  const absolute = resolve(contentRoot, path);
  if (absolute !== contentRoot && !absolute.startsWith(contentRoot + sep)) throw new Error(`Katalogpfad verlässt content/: ${path}`);
  if (!existsSync(absolute)) throw new Error(`Katalogdatei fehlt: ${path}`);
  return absolute;
}

const schemaCache = new Map(); // keyed by schema-content hash: in-process schema edits invalidate

function schemaContracts(projectRoot) {
  if (schemaCache.has(projectRoot)) return schemaCache.get(projectRoot);
  const hash = createHash('sha256');
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  const validators = new Map();
  for (const name of schemaNames) {
    const path = join(projectRoot, `schemas/${name}.schema.json`);
    const source = readFileSync(path);
    const schema = JSON.parse(source);
    if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema' || schema.additionalProperties !== false) {
      throw new Error(`Schema ${name} ist kein striktes JSON Schema 2020-12`);
    }
    validators.set(name, ajv.compile(schema));
    hash.update(name).update('\0').update(source).update('\0');
  }
  const contracts = { contractVersion: hash.digest('hex'), validators };
  schemaCache.set(projectRoot, contracts);
  return contracts;
}

export function validateSourceDocument(schemaName, value, projectRoot = defaultProjectRoot) {
  const validator = schemaContracts(projectRoot).validators.get(schemaName);
  if (!validator) throw new Error(`Unbekanntes Schema ${schemaName}`);
  if (!validator(value)) {
    const details = validator.errors
      .slice(0, 5)
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    throw new Error(`${schemaName}: ${details}`);
  }
  return true;
}

function loadCollection(contentRoot, files, property, schemaName, projectRoot) {
  const items = [];
  for (const file of files) {
    const value = readJson(resolveContentPath(contentRoot, file));
    validateSourceDocument(schemaName, value, projectRoot);
    items.push(...value[property]);
  }
  return items;
}

function loadObjects(contentRoot, files, idField, schemaName, projectRoot) {
  return files.map((file) => {
    const value = readJson(resolveContentPath(contentRoot, file));
    validateSourceDocument(schemaName, value, projectRoot);
    if (!value[idField]) throw new Error(`${file}: ${idField} fehlt`);
    return value;
  });
}

function assertJsonRoot(contentRoot, dir, jsonFiles) {
  assertNoOrphans(dir, listRootFiles(contentRoot, dir), jsonOnlyClaims(jsonFiles));
}

function projectPath(projectDirectory, path) {
  const absolute = resolve(projectDirectory, path);
  if (absolute !== projectDirectory && !absolute.startsWith(projectDirectory + sep)) throw new Error(`Projektpfad verlässt das Paket: ${path}`);
  return absolute;
}

function assertUniqueCheckpoints(lessons) {
  for (const lesson of lessons) {
    lesson.blocks.forEach((block, index) => {
      if (block.type === 'checkpoint' && lesson.blocks.some((other, otherIndex) => otherIndex !== index && other.contentRef === block.contentRef)) {
        throw new Error(`${lesson.lessonId}: Checkpoint-Block referenziert dasselbe Dokument wie ein anderer Block (${block.contentRef})`);
      }
    });
  }
}

function compileLessonContent(contentRoot, lessons) {
  return lessons.map((lesson) => ({
    ...lesson,
    blocks: lesson.blocks.map((block) => {
      if (!block.contentRef.endsWith('.md')) throw new Error(`${lesson.lessonId}: Content-Referenz muss auf Markdown zeigen`);
      const source = readFileSync(resolveContentPath(contentRoot, block.contentRef, ['.md']), 'utf8');
      const html = renderMarkdown(source).replace(/^<h1>[^<]*<\/h1>\n/, '');
      return { ...block, html };
    }),
  }));
}

function validateProjectPackages(contentRoot, files, projects) {
  projects.forEach((project, index) => {
    if (project.runnerMode === 'browser') return;
    const sourceFile = resolveContentPath(contentRoot, files[index]);
    const directory = dirname(sourceFile);
    for (const path of project.starterFiles) {
      if (!existsSync(projectPath(directory, path))) throw new Error(`${project.projectId}: Starterdatei fehlt: ${path}`);
    }
    for (const path of project.solutionFiles) {
      if (!existsSync(projectPath(directory, path))) throw new Error(`${project.projectId}: Lösungsdatei fehlt: ${path}`);
    }
    const manifestPath = projectPath(directory, 'check-manifest.json');
    if (!existsSync(manifestPath)) throw new Error(`${project.projectId}: check-manifest.json fehlt`);
    const manifest = readJson(manifestPath);
    if (manifest.schemaVersion !== 1 || manifest.projectId !== project.projectId || String(manifest.projectVersion) !== String(project.version)) {
      throw new Error(`${project.projectId}: Check-Manifest-Identität stimmt nicht`);
    }
    const expectedArgs = ['-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', ...(manifest.testPaths || [])];
    const command = project.allowedCommands.find((item) => item.program === 'python');
    if (!command || JSON.stringify(command.args) !== JSON.stringify(expectedArgs)) throw new Error(`${project.projectId}: pytest-Kommando stimmt nicht`);
    for (const required of manifest.requiredFiles || []) {
      const path = projectPath(directory, required.path);
      if (!existsSync(path)) throw new Error(`${project.projectId}: Pflichtdatei fehlt: ${required.path}`);
      if (required.sha256) {
        const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
        if (actual !== required.sha256) throw new Error(`${project.projectId}: Hash stimmt nicht: ${required.path}`);
      }
    }
  });
}

function validEvidencePolicy(policy) {
  return Number.isInteger(policy.minimumIndependentHits) && policy.minimumIndependentHits >= 1
    && Number.isInteger(policy.minimumDistinctDefinitions) && policy.minimumDistinctDefinitions >= 1
    && policy.minimumDistinctDefinitions <= policy.minimumIndependentHits
    && typeof policy.delayedHitRequired === 'boolean'
    && Number.isInteger(policy.minimumDelayDays) && policy.minimumDelayDays >= 0
    && Number.isInteger(policy.freshnessDays) && policy.freshnessDays >= 1;
}

function validateCompetencies(bundle, ids) {
  for (const competency of bundle.competencies) {
    if (!ids.rights.has(competency.rightsId)) throw new Error(`${competency.competencyId}: unbekannte Rechte ${competency.rightsId}`);
    if (!validEvidencePolicy(competency.evidencePolicy || {})) throw new Error(`${competency.competencyId}: ungueltige Evidence-Policy`);
    for (const trackId of competency.trackIds || []) if (!ids.tracks.has(trackId)) throw new Error(`${competency.competencyId}: unbekannter Track ${trackId}`);
    for (const relation of competency.relations || []) {
      if (!ids.competencies.has(relation.competencyId)) throw new Error(`${competency.competencyId}: unbekannte Relation ${relation.competencyId}`);
    }
  }
}

function validateTracksAndMilestones(bundle, ids) {
  for (const track of bundle.tracks) {
    for (const competencyId of track.competencyIds || []) if (!ids.competencies.has(competencyId)) throw new Error(`${track.trackId}: unbekannte Kompetenz ${competencyId}`);
    for (const milestoneId of track.milestoneIds || []) if (!ids.milestones.has(milestoneId)) throw new Error(`${track.trackId}: unbekannter Milestone ${milestoneId}`);
  }
  for (const milestone of bundle.milestones) {
    for (const competencyId of milestone.competencyIds || []) if (!ids.competencies.has(competencyId)) throw new Error(`${milestone.milestoneId}: unbekannte Kompetenz ${competencyId}`);
    for (const lessonId of milestone.lessonIds || []) if (!ids.lessons.has(lessonId)) throw new Error(`${milestone.milestoneId}: unbekannte Lektion ${lessonId}`);
    for (const definitionId of milestone.exerciseDefinitionIds || []) if (!ids.exercises.has(definitionId)) throw new Error(`${milestone.milestoneId}: unbekannte Aufgabe ${definitionId}`);
    for (const projectId of milestone.projectIds || []) if (!ids.projects.has(projectId)) throw new Error(`${milestone.milestoneId}: unbekanntes Projekt ${projectId}`);
    for (const coverage of milestone.coverage || []) if (!ids.competencies.has(coverage.competencyId)) throw new Error(`${milestone.milestoneId}: unbekannte Coverage-Kompetenz ${coverage.competencyId}`);
  }
}

// Error messages name the offending id (pinned diagnostics): keep loops explicit.
function checkReferences(entity, label, values, idSet, kind) {
  for (const id of values) {
    if (!idSet.has(id)) throw new Error(`${label}: unbekannte ${kind} ${id}`);
  }
}

function validateLessons(bundle, ids) {
  for (const lesson of bundle.lessons) {
    if (!ids.rights.has(lesson.rightsId)) throw new Error(`${lesson.lessonId}: unbekannte Rechte ${lesson.rightsId}`);
    checkReferences(lesson, lesson.lessonId, [...(lesson.competencyIds || []), ...(lesson.requires || [])], ids.competencies, 'Kompetenz');
    for (const reference of lesson.sourceRefs || []) if (!ids.sources.has(reference.sourceId)) throw new Error(`${lesson.lessonId}: unbekannte Quelle ${reference.sourceId}`);
  }
}

function validateExercises(bundle, ids) {
  for (const exercise of bundle.exerciseDefinitions) {
    if (!ids.rights.has(exercise.rightsId)) throw new Error(`${exercise.definitionId}: unbekannte Rechte ${exercise.rightsId}`);
    if (!hasLegacyGenerator(exercise.generatorId)) throw new Error(`${exercise.definitionId}: unbekannter Generator ${exercise.generatorId}`);
    if (!hasLegacyReferenceSolver(exercise.referenceSolverId)) throw new Error(`${exercise.definitionId}: unbekannter Referenzsolver ${exercise.referenceSolverId}`);
    checkReferences(exercise, exercise.definitionId, exercise.competencyIds || [], ids.competencies, 'Kompetenz');
    if (bundle.profile === 'public' && (!exercise.active || exercise.releaseStatus === 'local-only')) {
      throw new Error(`${exercise.definitionId}: private Aufgabe im Public-Bundle`);
    }
  }
}

function validateToolsExplanationsProjects(bundle, ids) {
  for (const tool of bundle.tools) {
    if (!ids.rights.has(tool.rightsId)) throw new Error(`${tool.toolId}: unbekannte Rechte ${tool.rightsId}`);
    checkReferences(tool, tool.toolId, tool.competencyIds || [], ids.competencies, 'Kompetenz');
    for (const sourceId of tool.sourceRefs || []) if (!ids.sources.has(sourceId)) throw new Error(`${tool.toolId}: unbekannte Quelle ${sourceId}`);
    if (bundle.profile === 'public' && (tool.availability !== 'public' || tool.releaseStatus === 'local-only')) throw new Error(`${tool.toolId}: lokales Werkzeug im Public-Bundle`);
  }
  for (const explanation of bundle.explanations) {
    if (!ids.rights.has(explanation.rightsId)) throw new Error(`${explanation.explanationId}: unbekannte Rechte ${explanation.rightsId}`);
    checkReferences(explanation, explanation.explanationId, explanation.competencyIds || [], ids.competencies, 'Kompetenz');
    for (const sourceId of explanation.sourceRefs || []) if (!ids.sources.has(sourceId)) throw new Error(`${explanation.explanationId}: unbekannte Quelle ${sourceId}`);
    for (const activityId of explanation.followUpActivityIds || []) if (!ids.exercises.has(activityId)) throw new Error(`${explanation.explanationId}: unbekannte Folgeaktivität ${activityId}`);
  }
  for (const project of bundle.projects) {
    if (!ids.rights.has(project.rightsId)) throw new Error(`${project.projectId}: unbekannte Rechte ${project.rightsId}`);
    checkReferences(project, project.projectId, [...(project.competencyIds || []), ...(project.requires || [])], ids.competencies, 'Kompetenz');
  }
}

function validateSourceRights(bundle) {
  for (const rights of bundle.sourceRights) {
    if (!rights.allowedProfiles?.includes(bundle.profile)) throw new Error(`${rights.sourceId}: Profil ${bundle.profile} nicht erlaubt`);
    if (bundle.profile === 'public' && (rights.redistributionAllowed !== true || rights.commercialUseAllowed !== true || rights.derivativesAllowed !== true)) {
      throw new Error(`${rights.sourceId}: Rechte nicht public-kompatibel`);
    }
  }
}

function validateLearningModules(bundle, ids) {
  indexLearningModules(bundle.learningModules || []);
  for (const module of bundle.learningModules || []) {
    assertModuleBindings(module, ids);
    for (const placement of module.placements || []) assertFamilyPlacement(placement);
  }
}

export function validateCompiledContent(bundle) {
  if (!profiles.has(bundle.profile)) throw new Error(`Unbekanntes Buildprofil ${bundle.profile}`);
  const ids = {
    rights: uniqueBy(bundle.sourceRights, 'sourceId', 'Quellenrechte'),
    sources: uniqueBy(bundle.sources, 'sourceId', 'Quellen'),
    competencies: uniqueBy(bundle.competencies, 'competencyId', 'Kompetenzen'),
    tracks: uniqueBy(bundle.tracks, 'trackId', 'Tracks'),
    milestones: uniqueBy(bundle.milestones, 'milestoneId', 'Milestones'),
    lessons: uniqueBy(bundle.lessons, 'lessonId', 'Lektionen'),
    exercises: uniqueBy(bundle.exerciseDefinitions, 'definitionId', 'Aufgaben'),
    projects: uniqueBy(bundle.projects, 'projectId', 'Projekte'),
    explanations: uniqueBy(bundle.explanations, 'explanationId', 'Erklärungen'),
    modules: uniqueBy(bundle.learningModules || [], 'moduleId', 'LearningModules'),
  };
  uniqueBy(bundle.tools, 'toolId', 'Werkzeuge');
  uniqueBy(bundle.reviews, 'reviewId', 'Reviews');
  validateCompetencyGraph(bundle.competencies);
  validateCompetencies(bundle, ids);
  validateTracksAndMilestones(bundle, ids);
  validateToolsExplanationsProjects(bundle, ids);
  validateLessons(bundle, ids);
  validateExercises(bundle, ids);
  validateLearningModules(bundle, ids);
  validateSourceRights(bundle);
  if (bundle.profile === 'public' && privateMarkers.test(JSON.stringify(bundle))) {
    throw new Error('Public-Bundle enthält privaten Marker');
  }
  return true;
}

// In-process memoization: compileContent is pure and deterministic per
// input state but runs dozens of times per build chain. The fingerprint
// hashes every input that can change the output (content/, schemas/, tool
// and generator sources); hits return a structuredClone.
const compileCache = new Map();
function compileInputFingerprint(projectRoot, profile, overlayPath) {
  const hash = createHash('sha256');
  hash.update(`${projectRoot}\u0000${profile}\u0000${overlayPath ?? ''}`);
  if (overlayPath) {
    const overlayFile = resolve(overlayPath);
    if (existsSync(overlayFile)) {
      hash.update('overlay');
      hash.update(readFileSync(overlayFile));
    }
  }
  const codeRoot = join(projectRoot, 'tools');
  const codeFiles = [];
  if (existsSync(codeRoot)) {
    (function walkTools(d) {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, entry.name);
        if (entry.isDirectory()) walkTools(p);
        else if (entry.name.endsWith('.mjs')) codeFiles.push(p);
      }
    })(codeRoot);
    codeFiles.sort();
  }
  for (const dir of ['content', 'schemas', 'assets/js/core', 'assets/js/domain']) {
    const base = join(projectRoot, dir);
    if (!existsSync(base)) { hash.update(dir); continue; }
    const paths = [];
    (function walk(d) {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else paths.push(p);
      }
    })(base);
    for (const p of paths.sort()) {
      hash.update(relative(projectRoot, p));
      hash.update(readFileSync(p));
    }
  }
  for (const f of codeFiles) {
    hash.update(relative(projectRoot, f));
    hash.update(readFileSync(f));
  }
  return hash.digest('hex');
}

export function compileContent({ projectRoot = defaultProjectRoot, profile = 'public', overlayPath = null, cache = 'memo' } = {}) {
  if (!profiles.has(profile)) throw new Error(`Unbekanntes Buildprofil ${profile}`);
  if (overlayPath && profile !== 'local-private') throw new Error('Ein Overlay ist nur im Profil local-private erlaubt');
  let fingerprint = null;
  if (cache === 'memo') {
    fingerprint = compileInputFingerprint(projectRoot, profile, overlayPath);
    if (compileCache.has(fingerprint)) return structuredClone(compileCache.get(fingerprint));
  }
  const contractVersion = schemaContracts(projectRoot).contractVersion;
  const contentRoot = join(projectRoot, 'content');
  const catalog = readJson(join(contentRoot, 'catalog.json'));
  validateSourceDocument('catalog', catalog, projectRoot);

  const competencyFiles = discoverJson(contentRoot, catalogRoot(catalog, 'competencies'));
  const trackFiles = discoverJson(contentRoot, catalogRoot(catalog, 'tracks'));
  const milestoneFiles = discoverJson(contentRoot, catalogRoot(catalog, 'milestones'));
  const toolFiles = discoverJson(contentRoot, catalogRoot(catalog, 'tools'));
  const reviewFiles = discoverJson(contentRoot, catalogRoot(catalog, 'reviews'));
  const lessonFiles = discoverJson(contentRoot, catalogRoot(catalog, 'lessons'));
  const explanationFiles = discoverJson(contentRoot, catalogRoot(catalog, 'explanations'));
  const projectFiles = discoverProjects(contentRoot, catalogRoot(catalog, 'projects'));
  const exerciseDefinitionFiles = discoverJson(contentRoot, catalogRoot(catalog, 'exerciseDefinitions'));
  const moduleFiles = discoverJson(contentRoot, catalogRoot(catalog, 'modules'));
  const familyFiles = discoverJson(contentRoot, catalogRoot(catalog, 'families'));

  const sourceRightsDocument = readJson(resolveContentPath(contentRoot, catalog.sourceRightsFile));
  validateSourceDocument('source-rights', sourceRightsDocument, projectRoot);
  let sourceRights = sourceRightsDocument.sources;
  const sourcesDocument = readJson(resolveContentPath(contentRoot, catalog.sourcesFile));
  let sources = sourcesDocument.sources || [];
  let competencies = loadCollection(contentRoot, competencyFiles, 'competencies', 'competency', projectRoot);
  let tracks = loadCollection(contentRoot, trackFiles, 'tracks', 'track', projectRoot);
  let milestones = loadCollection(contentRoot, milestoneFiles, 'milestones', 'milestone', projectRoot);
  let tools = loadCollection(contentRoot, toolFiles, 'tools', 'tool-card', projectRoot);
  const reviews = loadCollection(contentRoot, reviewFiles, 'reviews', 'review-findings', projectRoot);
  let lessons = loadObjects(contentRoot, lessonFiles, 'lessonId', 'lesson', projectRoot);
  let explanations = loadObjects(contentRoot, explanationFiles, 'explanationId', 'explanation-card', projectRoot);
  let projects = loadObjects(contentRoot, projectFiles, 'projectId', 'project', projectRoot);
  const authoredDefinitions = loadObjects(contentRoot, exerciseDefinitionFiles, 'definitionId', 'exercise-definition', projectRoot);
  let learningModules = loadObjects(contentRoot, moduleFiles, 'moduleId', 'learning-module', projectRoot);
  const families = familyFiles.map((file) => {
    const value = readJson(resolveContentPath(contentRoot, file));
    validateSourceDocument('exercise-family-cases', value, projectRoot);
    if (value.familyId !== file.split('/').pop().replace(/\.json$/, '')) {
      throw new Error(`${file}: familyId stimmt nicht mit Dateinamen überein`);
    }
    const caseIds = value.cases.map((item) => item.caseId);
    if (new Set(caseIds).size !== caseIds.length) {
      throw new Error(`${value.familyId}: Fall doppelt`);
    }
    registerStaticCases(value.familyId, value.cases);
    return value;
  });
  configureExerciseFamilies(families);
  validateProjectPackages(contentRoot, projectFiles, projects);
  assertUniqueCheckpoints(lessons);

  assertJsonRoot(contentRoot, catalogRoot(catalog, 'competencies'), competencyFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'tracks'), trackFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'milestones'), milestoneFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'tools'), toolFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'reviews'), reviewFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'explanations'), explanationFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'exerciseDefinitions'), exerciseDefinitionFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'modules'), moduleFiles);
  assertJsonRoot(contentRoot, catalogRoot(catalog, 'families'), familyFiles);
  assertNoOrphans(catalogRoot(catalog, 'lessons'), listRootFiles(contentRoot, catalogRoot(catalog, 'lessons')), lessonClaims(lessonFiles, lessons));
  assertNoOrphans(
    catalogRoot(catalog, 'projects'),
    listRootFiles(contentRoot, catalogRoot(catalog, 'projects')),
    projectPackageClaims(contentRoot, projectFiles),
  );

  const legacyExercisePacks = catalog.legacy.exerciseFiles.map((file) => readJson(resolveContentPath(contentRoot, file)));
  const exerciseDefinitions = [];
  for (const pack of legacyExercisePacks) {
    for (const exercise of pack.exercises || []) exerciseDefinitions.push(adaptLegacyExercise(exercise, pack.weekId));
  }
  for (const definition of exerciseDefinitions) validateSourceDocument('exercise-definition', definition, projectRoot);
  const allDefinitions = [...exerciseDefinitions, ...authoredDefinitions];
  let definitions = profile === 'public'
    ? allDefinitions
      .filter((exercise) => exercise.active && exercise.releaseStatus !== 'local-only')
      .map(sanitizePublicValue)
    : allDefinitions;
  sourceRights = sourceRights.filter((rights) => rights.allowedProfiles?.includes(profile));
  competencies = competencies.filter((item) => item.releaseStatus !== 'local-only');
  tracks = tracks.filter((item) => item.releaseStatus !== 'local-only');
  milestones = milestones.filter((item) => item.releaseStatus !== 'local-only');
  tools = profile === 'public' ? tools.filter((item) => item.releaseStatus !== 'local-only') : tools;
  lessons = lessons.filter((item) => item.releaseStatus !== 'local-only');
  explanations = explanations.filter((item) => item.releaseStatus !== 'local-only');
  projects = projects.filter((item) => item.releaseStatus !== 'local-only');
  learningModules = learningModules.filter((item) => item.releaseStatus !== 'local-only');

  const overlays = [];
  if (overlayPath) {
    const overlay = readJson(resolve(overlayPath));
    if (overlay.schemaVersion !== 1 || !overlay.overlayId) throw new Error('Overlay ist ungültig');
    validateSourceDocument('source-rights', { schemaVersion: 1, sources: overlay.sourceRights || [] }, projectRoot);
    validateSourceDocument('competency', { schemaVersion: 1, locale: 'de', competencies: overlay.competencies || [] }, projectRoot);
    validateSourceDocument('track', { schemaVersion: 1, locale: 'de', tracks: overlay.tracks || [] }, projectRoot);
    validateSourceDocument('milestone', { schemaVersion: 1, locale: 'de', milestones: overlay.milestones || [] }, projectRoot);
    for (const lesson of overlay.lessons || []) validateSourceDocument('lesson', lesson, projectRoot);
    for (const definition of overlay.exerciseDefinitions || []) validateSourceDocument('exercise-definition', definition, projectRoot);
    for (const explanation of overlay.explanations || []) validateSourceDocument('explanation-card', explanation, projectRoot);
    for (const project of overlay.projects || []) validateSourceDocument('project', project, projectRoot);
    for (const module of overlay.learningModules || []) validateSourceDocument('learning-module', module, projectRoot);
    overlays.push(overlay.overlayId);
    sourceRights = mergeUnique(sourceRights, overlay.sourceRights || [], 'sourceId', 'Quellenrechte');
    competencies = mergeUnique(competencies, overlay.competencies || [], 'competencyId', 'Kompetenzen');
    tracks = mergeUnique(tracks, overlay.tracks || [], 'trackId', 'Tracks');
    milestones = mergeUnique(milestones, overlay.milestones || [], 'milestoneId', 'Milestones');
    lessons = mergeUnique(lessons, overlay.lessons || [], 'lessonId', 'Lektionen');
    definitions = mergeUnique(definitions, overlay.exerciseDefinitions || [], 'definitionId', 'Aufgaben');
    explanations = mergeUnique(explanations, overlay.explanations || [], 'explanationId', 'Erklärungen');
    projects = mergeUnique(projects, overlay.projects || [], 'projectId', 'Projekte');
    learningModules = mergeUnique(learningModules, overlay.learningModules || [], 'moduleId', 'LearningModules');
  }

  lessons = compileLessonContent(contentRoot, lessons);
  learningModules = learningModules.map((module) => compileLearningModule(module, {
    lessons,
    definitions,
    projects,
  }));
  const expectedMap = buildLegacyMap(projectRoot);
  const storedMap = readJson(join(contentRoot, 'legacy/exercise-competency-map.json'));
  if (JSON.stringify(storedMap) !== JSON.stringify(expectedMap)) throw new Error('Legacy-Mapping ist veraltet; tools/migrate_legacy_content.mjs ausführen');
  const curriculum = readJson(resolveContentPath(contentRoot, catalog.legacy.curriculumFile));
  const legacyContent = profile === 'public'
    ? createPublicLegacyContent({ curriculum, sources: sourcesDocument, exercisePacks: legacyExercisePacks })
    : { curriculum, sources: sourcesDocument };
  sources = legacyContent.sources.sources || [];
  const projectionCurriculum = legacyContent.curriculum;
  const bundle = {
    schemaVersion: 1,
    catalogId: catalog.catalogId,
    catalogVersion: catalog.version,
    contractVersion,
    contentVersion: '',
    profile,
    locale: catalog.locale,
    overlays,
    sourceRights,
    sources,
    competencies,
    tracks,
    milestones,
    tools,
    reviews,
    lessons,
    exerciseDefinitions: definitions,
    explanations,
    projects,
    learningModules,
    families,
    legacyProjection: {
      curriculumId: projectionCurriculum.id,
      schemaVersion: projectionCurriculum.schemaVersion,
      totalWeeks: projectionCurriculum.totalWeeks,
      phases: projectionCurriculum.phases,
      weeks: projectionCurriculum.weeks,
      authoredWeekIds: legacyExercisePacks.map((pack) => pack.weekId),
      exerciseCompetencyMap: storedMap,
    },
  };
  validateCompiledContent(bundle);
  const hashInput = { ...bundle, contentVersion: undefined };
  bundle.contentVersion = createHash('sha256').update(JSON.stringify(canonicalize(hashInput))).digest('hex');
  if (fingerprint !== null) compileCache.set(fingerprint, structuredClone(bundle));
  return bundle;
}

// --- split content delivery (ADR-0013) ----------------------------------------
// The next shell must not grow its initial chunk linearly with lessons and
// exercises. compileContent output is therefore additionally split into:
//   index.json              catalog without lesson bodies and exercise bodies
//   lessons/<lessonId>.json full lesson incl. rendered blocks
//   exercises/<defId>.json  full exercise definition (tests, solutions, hints)
//   chunks.ts               profile-local module mapping ids to dynamic
//                           imports, consumed through the @content-chunks alias
// Only ids matching SAFE_CHUNK_ID may become file names; everything else fails
// closed so a hostile id can never escape the split directory.

const SAFE_CHUNK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,96}$/;
const EXERCISE_BODY_FIELDS = [
  'prompt', 'parameters', 'choices', 'expectedAnswer', 'tolerancePolicy', 'hints',
  'feedbackRules', 'fullSolution', 'workedExample', 'rubric', 'typicalErrors',
  // sourceLineage is provenance detail for the exercise view (ADR-0014 Teil 5):
  // summaries keep ids/metadata only, the lineage text rides in the body chunk.
  'sourceLineage',
];

// List views show a short prompt snippet; the full prompt stays in the
// per-exercise body chunk. Without this, the index (and with it the initial
// chunk) grows linearly with prompt text.
function promptSnippet(prompt, maxLength = 110) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const boundary = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('$'));
  return `${cut.slice(0, boundary > 40 ? boundary : maxLength)} …`;
}

// Route-scoped index sections: four heavy sections ship as sidecar chunks
// loaded through sectionChunks, keeping them out of the initial bundle.
const SECTION_FIELDS = {
  roadmap: 'legacyProjection',
  sources: 'sources',
  tools: 'tools',
  reviews: 'reviews',
};

export function buildSplitArtifacts(bundle) {
  const { legacyProjection, sources, tools, reviews, ...lightBundle } = bundle;
  const sections = { roadmap: { legacyProjection }, sources: { sources }, tools: { tools }, reviews: { reviews } };
  const index = {
    ...lightBundle,
    lessons: bundle.lessons.map((lesson) => ({ ...lesson, blocks: [] })),
    exerciseDefinitions: bundle.exerciseDefinitions.map((exercise) => {
      const summary = Object.fromEntries(Object.entries(exercise).filter(([field]) => !EXERCISE_BODY_FIELDS.includes(field)));
      summary.promptSnippet = promptSnippet(exercise.prompt);
      return summary;
    }),
    families: bundle.families.map((family) => ({
      familyId: family.familyId,
      contract: family.contract,
      cases: family.cases.map(({ caseId, difficultyProfile, masteryEligible }) => ({
        caseId, difficultyProfile, masteryEligible,
      })),
    })),
  };
  const lessonBodies = bundle.lessons.map((lesson) => {
    if (!SAFE_CHUNK_ID.test(lesson.lessonId)) throw new Error(`unsichere Lektions-ID für Chunk: ${lesson.lessonId}`);
    return { id: lesson.lessonId, body: { lessonId: lesson.lessonId, blocks: lesson.blocks } };
  });
  const exerciseBodies = bundle.exerciseDefinitions.map((exercise) => {
    if (!SAFE_CHUNK_ID.test(exercise.definitionId)) throw new Error(`unsichere Aufgaben-ID für Chunk: ${exercise.definitionId}`);
    const body = Object.fromEntries(Object.entries(exercise).filter(([field]) => EXERCISE_BODY_FIELDS.includes(field)));
    return { id: exercise.definitionId, body: { definitionId: exercise.definitionId, ...body } };
  });
  const familyBodies = bundle.families.map((family) => {
    if (!SAFE_CHUNK_ID.test(family.familyId)) throw new Error(`unsichere Familien-ID für Chunk: ${family.familyId}`);
    return { id: family.familyId, body: family };
  });
  const duplicateIds = new Set();
  const seen = new Set();
  for (const id of [...lessonBodies.map((item) => item.id), ...exerciseBodies.map((item) => item.id), ...familyBodies.map((item) => item.id)]) {
    if (seen.has(id)) duplicateIds.add(id);
    seen.add(id);
  }
  if (duplicateIds.size) throw new Error(`Chunk-ID-Kollision: ${[...duplicateIds].join(', ')}`);
  const chunks = [
    `// Generated by tools/compile_content.mjs — do not edit (profile: ${bundle.profile}).`,
    `// Maps content ids to lazily imported JSON chunks so route content stays`,
    `// out of the initial JavaScript budget.`,
    `export const lessonChunks: Record<string, () => Promise<{ default: unknown }>> = {`,
    ...lessonBodies.map(({ id }) => `  ${JSON.stringify(id)}: () => import('./lessons/${id}.json'),`),
    '};',
    `export const exerciseChunks: Record<string, () => Promise<{ default: unknown }>> = {`,
    ...exerciseBodies.map(({ id }) => `  ${JSON.stringify(id)}: () => import('./exercises/${id}.json'),`),
    '};',
    `export const familyChunks: Record<string, () => Promise<{ default: unknown }>> = {`,
    ...familyBodies.map(({ id }) => `  ${JSON.stringify(id)}: () => import('./families/${id}.json'),`),
    '};',
    `export const sectionChunks: Record<string, () => Promise<{ default: unknown }>> = {`,
    ...Object.keys(SECTION_FIELDS).map((name) => `  ${JSON.stringify(name)}: () => import('./sections/${name}.json'),`),
    '};',
    '',
  ].join('\n');
  return { index, sections, lessonBodies, exerciseBodies, familyBodies, chunks };
}

export function writeSplitArtifacts(bundle, splitDir) {
  const { index, sections, lessonBodies, exerciseBodies, familyBodies, chunks } = buildSplitArtifacts(bundle);
  rmSync(splitDir, { recursive: true, force: true });
  mkdirSync(join(splitDir, 'lessons'), { recursive: true });
  mkdirSync(join(splitDir, 'exercises'), { recursive: true });
  mkdirSync(join(splitDir, 'sections'), { recursive: true });
  mkdirSync(join(splitDir, 'families'), { recursive: true });
  for (const [name, body] of Object.entries(sections)) {
    writeFileSync(join(splitDir, 'sections', `${name}.json`), JSON.stringify(body, null, 2) + '\n');
  }
  writeFileSync(join(splitDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  for (const { id, body } of lessonBodies) writeFileSync(join(splitDir, 'lessons', `${id}.json`), JSON.stringify(body, null, 2) + '\n');
  for (const { id, body } of exerciseBodies) writeFileSync(join(splitDir, 'exercises', `${id}.json`), JSON.stringify(body, null, 2) + '\n');
  for (const { id, body } of familyBodies) writeFileSync(join(splitDir, 'families', `${id}.json`), JSON.stringify(body, null, 2) + '\n');
  writeFileSync(join(splitDir, 'chunks.ts'), chunks);
  return { index, lessonBodies, exerciseBodies, familyBodies };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const valueAfter = (flag, fallback = null) => {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : fallback;
  };
  const profile = valueAfter('--profile', 'public');
  const overlayPath = valueAfter('--overlay');
  const output = resolve(valueAfter('--out', join(defaultProjectRoot, `.content-build/${profile}/content-bundle.json`)));
  const bundle = compileContent({ projectRoot: defaultProjectRoot, profile, overlayPath });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(bundle, null, 2) + '\n');
  const splitDir = join(dirname(output), 'split');
  writeSplitArtifacts(bundle, splitDir);
  console.log(`Content-Bundle geschrieben: ${relative(defaultProjectRoot, output)} (${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.exerciseDefinitions.length} Aufgaben)`);
  console.log(`Split-Content geschrieben: ${relative(defaultProjectRoot, splitDir)} (${bundle.lessons.length} Lektionen, ${bundle.exerciseDefinitions.length} Aufgaben)`);
}
