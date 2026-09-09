#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { sanitizePublicValue } from './public_content.mjs';
import { renderMarkdown } from './markdown_content.mjs';
import { compileExpression, compileTemplate } from '../assets/js/domain/expression_eval.mjs';
import { validateCompetencyGraph } from '../assets/js/domain/competency_graph.mjs';
import { assertFamilyPlacement, configureExerciseFamilies, EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
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
  readJson,
} from './content_roots.mjs';

export { validateCompetencyGraph };

const defaultProjectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaNames = [
  'catalog', 'competency', 'track', 'milestone', 'lesson', 'learning-module',
  'exercise-family', 'exercise-family-cases', 'explanation-card', 'project', 'tool-card', 'source-rights', 'visualization',
];
const privateMarkers = /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i;
const CATALOG_ROOTS = { competencies: ['competencies', 'competency'], tracks: ['tracks', 'track'], milestones: ['milestones', 'milestone'], tools: ['tools', 'tool-card'] };
const CATALOG_OBJECTS = { lessons: ['lessons', 'lessonId', 'lesson'], explanations: ['explanations', 'explanationId', 'explanation-card'], learningModules: ['modules', 'moduleId', 'learning-module'] };
const CATALOG_ASSERTION_ROOTS = ['competencies', 'tracks', 'milestones', 'tools', 'explanations', 'learningModules', 'families'];

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
  if (schemaName === 'exercise-family-cases') {
    validateChoiceContracts(value);
    validateChallengeContracts(value);
  }
  return true;
}

function validateChoiceContracts(document) {
  for (const item of document.cases || []) {
    validateChoiceContract(`${document.familyId}:${item.caseId}`, item);
    for (const [index, variant] of (item.variants || []).entries()) {
      validateChoiceContract(`${document.familyId}:${item.caseId}:variant-${index + 1}`, variant);
    }
  }
}

function validateChallengeContracts(document) {
  for (const item of document.cases || []) {
    if (item.challengeEligible !== true) continue;
    const label = `${document.familyId}:${item.caseId}`;
    if (item.difficultyProfile !== 'challenge') {
      throw new Error(`${label}: E_CHALLENGE_CONTRACT challengeEligible verlangt difficultyProfile challenge`);
    }
    if (item.masteryEligible !== true) {
      throw new Error(`${label}: E_CHALLENGE_CONTRACT challengeEligible verlangt masteryEligible`);
    }
    if (!Array.isArray(item.hints) || item.hints.length === 0) {
      throw new Error(`${label}: E_CHALLENGE_CONTRACT challengeEligible verlangt nicht-leere hints`);
    }
    if (typeof item.fullSolution !== 'string' || item.fullSolution.length === 0) {
      throw new Error(`${label}: E_CHALLENGE_CONTRACT challengeEligible verlangt fullSolution`);
    }
    if (!Array.isArray(item.sourceLineage) || item.sourceLineage.length === 0) {
      throw new Error(`${label}: E_CHALLENGE_CONTRACT challengeEligible verlangt gesetzte sourceLineage`);
    }
  }
}

function validateChoiceContract(label, item) {
  const hasChoices = Object.hasOwn(item, 'choices');
  const correctChoice = item.expected?.correctChoice;
  const hasCorrectChoice = typeof correctChoice === 'string';
  if (hasChoices !== hasCorrectChoice) {
    throw new Error(`${label}: choices und expected.correctChoice müssen gemeinsam vorhanden sein`);
  }
  if (!hasChoices) return;
  const correct = item.choices.filter((choice) => choice.correct === true);
  if (correct.length !== 1 || correct[0].id !== correctChoice) {
    throw new Error(`${label}: choices brauchen genau eine korrekte Antwort passend zu expected.correctChoice`);
  }
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

function compileLessonContent(contentRoot, lessons, projectRoot, families) {
  const visualizationIds = new Map();
  return lessons.map((lesson) => ({
    ...lesson,
    blocks: lesson.blocks.map((block) => {
      if (block.type === 'visualization') {
        if (!block.contentRef.endsWith('.viz.json')) throw new Error(`${lesson.lessonId}: Visualisierungsreferenz muss auf .viz.json zeigen`);
        const specPath = resolveContentPath(contentRoot, block.contentRef, ['.viz.json']);
        const spec = readJson(specPath);
        validateSourceDocument('visualization', spec, projectRoot);
        const visualizationId = block.contentRef.split('/').pop().slice(0, -'.viz.json'.length);
        if (!/^[a-z0-9][a-z0-9-]*$/.test(visualizationId)) throw new Error(`${lesson.lessonId}: Ungültige Visualisierungs-ID ${visualizationId}`);
        const previous = visualizationIds.get(visualizationId);
        if (previous) throw new Error(`Visualisierungs-ID ${visualizationId} doppelt: ${previous} und ${lesson.lessonId}`);
        visualizationIds.set(visualizationId, lesson.lessonId);
        validateVisualizationExpressions(spec, lesson.lessonId, visualizationId);
        return { ...block, html: '', viz: spec, visualizationId };
      }
      if (!block.contentRef.endsWith('.md')) throw new Error(`${lesson.lessonId}: Content-Referenz muss auf Markdown oder .viz.json zeigen`);
      const source = readFileSync(resolveContentPath(contentRoot, block.contentRef, ['.md']), 'utf8');
      const html = renderMarkdown(source)
        .replace(/^<h1>[^<]*<\/h1>\n/, '');
      validateLessonExerciseLinks(lesson.lessonId, html, families);
      return { ...block, html };
    }),
  }));
}

export function validateLessonExerciseLinks(lessonId, html, families) {
  for (const match of html.matchAll(/href="(#\/family\/([^/"]+)\/([^/"]+)\/[^"]+)"/g)) {
    const [, href, familyId, caseId] = match;
    const family = families.find((candidate) => candidate.familyId === familyId);
    if (!family || !family.cases.some((item) => item.caseId === caseId)) {
      throw new Error(`${lessonId}: Unbekannter Familienfall ${href}`);
    }
  }
  const legacy = html.match(/href="(#\/exercise\/[^"]+)"/);
  if (legacy) throw new Error(`${lessonId}: Legacy-Aufgabenlink ${legacy[1]} ist nicht erlaubt`);
}

function validateVisualizationExpressions(spec, lessonId, visualizationId) {
  const names = (spec.sliders || []).map((slider) => slider.name);
  for (const slider of spec.sliders || []) {
    if (!(slider.range[0] < slider.range[1])) {
      throw new Error(`${lessonId}:${visualizationId}: Slider ${slider.name} benötigt min < max`);
    }
    if (slider.value < slider.range[0] || slider.value > slider.range[1]) {
      throw new Error(`${lessonId}:${visualizationId}: Slider ${slider.name} value liegt außerhalb des Bereichs`);
    }
  }
  const compileValue = (value) => {
    if (typeof value === 'number') return;
    compileExpression(value, names);
  };
  const compileCoord = (coord) => coord.forEach(compileValue);
  for (const object of spec.objects) {
    if (object.kind === 'functiongraph') {
      compileExpression(object.expr, [...names, 'x']);
      if (!/\bx\b/.test(object.expr)) throw new Error(`${lessonId}/${visualizationId}: functiongraph "${object.expr}" verwendet x nicht`);
      (object.domain || []).forEach(compileValue);
    } else if (object.kind === 'point') {
      compileCoord(object.at);
    } else if (object.kind === 'arrow' || object.kind === 'segment') {
      compileCoord(object.from);
      compileCoord(object.to);
    } else if (object.kind === 'text') {
      compileCoord(object.at);
      compileTemplate(object.text, names);
    } else {
      object.points.forEach(compileCoord);
    }
  }
  return `${lessonId}:${visualizationId}`;
}

function validateProjectPackages(contentRoot, files, projects) {
  projects.forEach((project, index) => validateProjectPackage(contentRoot, files[index], project));
}

function validateProjectPackage(contentRoot, file, project) {
  if (project.runnerMode === 'browser') return;
  const sourceFile = resolveContentPath(contentRoot, file);
  const directory = dirname(sourceFile);
  validateProjectFiles(directory, project.projectId, project.starterFiles, 'Starterdatei');
  validateProjectFiles(directory, project.projectId, project.solutionFiles, 'Lösungsdatei');
  const manifestPath = projectPath(directory, 'check-manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`${project.projectId}: check-manifest.json fehlt`);
  const manifest = readJson(manifestPath);
  if (manifest.schemaVersion !== 1 || manifest.projectId !== project.projectId || String(manifest.projectVersion) !== String(project.version)) throw new Error(`${project.projectId}: Check-Manifest-Identität stimmt nicht`);
  const expectedArgs = ['-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', ...(manifest.testPaths || [])];
  const command = project.allowedCommands.find((item) => item.program === 'python');
  if (!command || JSON.stringify(command.args) !== JSON.stringify(expectedArgs)) throw new Error(`${project.projectId}: pytest-Kommando stimmt nicht`);
  validateManifestFiles(directory, project.projectId, manifest.requiredFiles || []);
}

function validateProjectFiles(directory, projectId, files, label) {
  for (const path of files) if (!existsSync(projectPath(directory, path))) throw new Error(`${projectId}: ${label} fehlt: ${path}`);
}

function validateManifestFiles(directory, projectId, files) {
  for (const required of files) {
    const path = projectPath(directory, required.path);
    if (!existsSync(path)) throw new Error(`${projectId}: Pflichtdatei fehlt: ${required.path}`);
    if (!required.sha256) continue;
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (actual !== required.sha256) throw new Error(`${projectId}: Hash stimmt nicht: ${required.path}`);
  }
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
    checkReferences(track, track.trackId, track.competencyIds || [], ids.competencies, 'Kompetenz');
    checkReferences(track, track.trackId, track.milestoneIds || [], ids.milestones, 'Milestone');
  }
  for (const milestone of bundle.milestones) {
    checkReferences(milestone, milestone.milestoneId, milestone.competencyIds || [], ids.competencies, 'Kompetenz');
    checkReferences(milestone, milestone.milestoneId, milestone.lessonIds || [], ids.lessons, 'Lektion');
    checkReferences(milestone, milestone.milestoneId, milestone.projectIds || [], ids.projects, 'Projekt');
    checkReferences(
      milestone,
      milestone.milestoneId,
      (milestone.coverage || []).map((coverage) => coverage.competencyId),
      ids.competencies,
      'Coverage-Kompetenz',
    );
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

function validateToolsExplanationsProjects(bundle, ids) {
  for (const tool of bundle.tools) {
    validateTool(tool, bundle.profile, ids);
  }
  for (const explanation of bundle.explanations) {
    validateExplanation(explanation, ids);
  }
  for (const project of bundle.projects) {
    validateProject(project, ids);
  }
}

function validateTool(tool, profile, ids) {
  assertRights(tool, tool.toolId, ids);
  checkReferences(tool, tool.toolId, tool.competencyIds || [], ids.competencies, 'Kompetenz');
  checkReferences(tool, tool.toolId, tool.sourceRefs || [], ids.sources, 'Quelle');
  if (profile === 'public' && (tool.availability !== 'public' || tool.releaseStatus === 'local-only')) throw new Error(`${tool.toolId}: lokales Werkzeug im Public-Bundle`);
}

function validateExplanation(explanation, ids) {
  assertRights(explanation, explanation.explanationId, ids);
  checkReferences(explanation, explanation.explanationId, explanation.competencyIds || [], ids.competencies, 'Kompetenz');
  checkReferences(explanation, explanation.explanationId, explanation.sourceRefs || [], ids.sources, 'Quelle');
}

function validateProject(project, ids) {
  assertRights(project, project.projectId, ids);
  checkReferences(project, project.projectId, [...(project.competencyIds || []), ...(project.requires || [])], ids.competencies, 'Kompetenz');
}

function assertRights(entity, id, ids) {
  if (!ids.rights.has(entity.rightsId)) throw new Error(`${id}: unbekannte Rechte ${entity.rightsId}`);
}

function validateSourceRights(bundle) {
  for (const rights of bundle.sourceRights) {
    if (!rights.allowedProfiles?.includes(bundle.profile)) throw new Error(`${rights.sourceId}: Profil ${bundle.profile} nicht erlaubt`);
    if (bundle.profile === 'public' && (rights.redistributionAllowed !== true || rights.commercialUseAllowed !== true || rights.derivativesAllowed !== true)) {
      throw new Error(`${rights.sourceId}: Rechte nicht public-kompatibel`);
    }
  }
}

function validateSources(sources) {
  for (const source of sources) {
    if (source.contentClass !== 'open' && source.contentClass !== 'link-only') continue;
    if (!/^https:\/\//.test(source.canonicalUrl || '')) {
      throw new Error(`${source.sourceId}: öffentliche Quelle braucht eine HTTPS-URL`);
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
  if (bundle.profile !== 'public') throw new Error(`Unbekanntes Buildprofil ${bundle.profile}`);
  for (const family of bundle.families || []) registerStaticCases(family.familyId, family.cases || []);
  configureExerciseFamilies(bundle.families || []);
  const ids = {
    rights: uniqueBy(bundle.sourceRights, 'sourceId', 'Quellenrechte'), sources: uniqueBy(bundle.sources, 'sourceId', 'Quellen'),
    competencies: uniqueBy(bundle.competencies, 'competencyId', 'Kompetenzen'), tracks: uniqueBy(bundle.tracks, 'trackId', 'Tracks'),
    milestones: uniqueBy(bundle.milestones, 'milestoneId', 'Milestones'), lessons: uniqueBy(bundle.lessons, 'lessonId', 'Lektionen'),
    projects: uniqueBy(bundle.projects, 'projectId', 'Projekte'), explanations: uniqueBy(bundle.explanations, 'explanationId', 'Erklärungen'),
    modules: uniqueBy(bundle.learningModules || [], 'moduleId', 'LearningModules'),
  };
  validateFamilyReferences(bundle.families || [], ids.competencies);
  uniqueBy(bundle.tools, 'toolId', 'Werkzeuge');
  validateCompetencyGraph(bundle.competencies);
  validateCompetencies(bundle, ids);
  validateTracksAndMilestones(bundle, ids);
  validateToolsExplanationsProjects(bundle, ids);
  validateLessons(bundle, ids);
  validateLearningModules(bundle, ids);
  validateSourceRights(bundle);
  validateSources(bundle.sources);
  if (bundle.profile === 'public' && privateMarkers.test(JSON.stringify(bundle))) {
    throw new Error('Public-Bundle enthält privaten Marker');
  }
  return true;
}

function validateFamilyReferences(families, competencies) {
  for (const family of families) {
    checkReferences(family.contract, family.familyId, family.contract?.competencyIds || [], competencies, 'Kompetenz');
    for (const item of family.cases || []) {
      checkReferences(item, `${family.familyId}:${item.caseId}`, item.competencyIds || [], competencies, 'Kompetenz');
    }
  }
}

// In-process memoization: compileContent is pure and deterministic per
// input state but runs dozens of times per build chain. The fingerprint
// hashes every input that can change the output (content/, schemas/, tool
// and generator sources); hits return a structuredClone.
const compileCache = new Map();
function compileInputFingerprint(projectRoot) {
  const hash = createHash('sha256');
  hash.update(projectRoot);
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

export function compileContent({ projectRoot = defaultProjectRoot, cache = 'memo' } = {}) {
  let fingerprint = null;
  if (cache === 'memo') {
    fingerprint = compileInputFingerprint(projectRoot);
    if (compileCache.has(fingerprint)) {
      const cached = compileCache.get(fingerprint);
      configureExerciseFamilies(cached.families || []);
      return structuredClone(cached);
    }
  }
  const contractVersion = schemaContracts(projectRoot).contractVersion;
  const contentRoot = join(projectRoot, 'content');
  const catalog = readJson(join(contentRoot, 'catalog.json'));
  validateSourceDocument('catalog', catalog, projectRoot);
  const files = discoverCatalogFiles(contentRoot, catalog);
  const entities = loadCatalogEntities(contentRoot, catalog, files, projectRoot);
  validateLoadedCatalog(contentRoot, catalog, files, entities);
  filterPublicEntities(entities);
  const bundle = compileCatalogBundle(contentRoot, projectRoot, catalog, contractVersion, entities);
  validateCompiledContent(bundle);
  const hashInput = { ...bundle, contentVersion: undefined };
  bundle.contentVersion = createHash('sha256').update(JSON.stringify(canonicalize(hashInput))).digest('hex');
  if (fingerprint !== null) compileCache.set(fingerprint, structuredClone(bundle));
  return bundle;
}

function discoverCatalogFiles(contentRoot, catalog) {
  const lessonFiles = discoverJson(contentRoot, catalogRoot(catalog, 'lessons')).filter((file) => !file.endsWith('.viz.json'));
  return {
    ...Object.fromEntries(Object.keys(CATALOG_ROOTS).map((key) => [key, discoverJson(contentRoot, catalogRoot(catalog, key))])),
    ...Object.fromEntries(Object.keys(CATALOG_OBJECTS).map((key) => [key, discoverJson(contentRoot, catalogRoot(catalog, CATALOG_OBJECTS[key][0]))])),
    lessons: lessonFiles,
    projects: discoverProjects(contentRoot, catalogRoot(catalog, 'projects')),
    families: discoverJson(contentRoot, catalogRoot(catalog, 'families')),
  };
}

function loadCatalogEntities(contentRoot, catalog, files, projectRoot) {
  const sourceRightsDocument = readJson(resolveContentPath(contentRoot, catalog.sourceRightsFile));
  validateSourceDocument('source-rights', sourceRightsDocument, projectRoot);
  const sourcesDocument = readJson(resolveContentPath(contentRoot, catalog.sourcesFile));
  const collections = Object.fromEntries(Object.entries(CATALOG_ROOTS).map(([key, [property, schemaName]]) => [key, loadCollection(contentRoot, files[key], property, schemaName, projectRoot)]));
  const objects = Object.fromEntries(Object.entries(CATALOG_OBJECTS).map(([key, [, idField, schemaName]]) => [key, loadObjects(contentRoot, files[key], idField, schemaName, projectRoot)]));
  const projects = loadObjects(contentRoot, files.projects, 'projectId', 'project', projectRoot);
  const families = files.families.map((file) => loadFamilyDocument(contentRoot, file, projectRoot));
  return {
    sourceRights: sourceRightsDocument.sources,
    sources: sourcesDocument.sources || [],
    ...collections,
    lessons: objects.lessons,
    explanations: objects.explanations,
    projects,
    learningModules: objects.learningModules,
    families,
  };
}

function loadFamilyDocument(contentRoot, file, projectRoot) {
  const value = readJson(resolveContentPath(contentRoot, file));
  validateSourceDocument('exercise-family-cases', value, projectRoot);
  if (value.familyId !== file.split('/').pop().replace(/\.json$/, '')) throw new Error(`${file}: familyId stimmt nicht mit Dateinamen überein`);
  const caseIds = value.cases.map((item) => item.caseId);
  if (new Set(caseIds).size !== caseIds.length) throw new Error(`${value.familyId}: Fall doppelt`);
  registerStaticCases(value.familyId, value.cases);
  return value;
}

function validateLoadedCatalog(contentRoot, catalog, files, entities) {
  configureExerciseFamilies(entities.families);
  validateProjectPackages(contentRoot, files.projects, entities.projects);
  assertUniqueCheckpoints(entities.lessons);
  assertCatalogRoots(contentRoot, catalog, files);
  assertCatalogOrphans(contentRoot, catalog, files, entities);
}

function assertCatalogRoots(contentRoot, catalog, files) {
  for (const key of CATALOG_ASSERTION_ROOTS) {
    const rootKey = CATALOG_OBJECTS[key]?.[0] || key;
    assertJsonRoot(contentRoot, catalogRoot(catalog, rootKey), files[key]);
  }
}

function assertCatalogOrphans(contentRoot, catalog, files, entities) {
  assertNoOrphans(catalogRoot(catalog, 'lessons'), listRootFiles(contentRoot, catalogRoot(catalog, 'lessons')), lessonClaims(files.lessons, entities.lessons));
  assertNoOrphans(catalogRoot(catalog, 'projects'), listRootFiles(contentRoot, catalogRoot(catalog, 'projects')), projectPackageClaims(contentRoot, files.projects));
}

function filterPublicEntities(entities) {
  entities.sources = sanitizePublicValue(entities.sources.filter((source) => source.contentClass !== 'private'));
  for (const key of ['competencies', 'tracks', 'milestones', 'tools', 'lessons', 'explanations', 'projects', 'learningModules']) {
    entities[key] = entities[key].filter((item) => item.releaseStatus !== 'local-only');
  }
}

function compileCatalogBundle(contentRoot, projectRoot, catalog, contractVersion, entities) {
  entities.learningModules = entities.learningModules.map((module) => compileLearningModule(module, { lessons: entities.lessons, definitions: [], projects: entities.projects }));
  entities.lessons = compileLessonContent(contentRoot, entities.lessons, projectRoot, entities.families);
  const familyActivities = buildFamilyActivities(entities.learningModules, entities.families);
  const visualizations = entities.lessons.flatMap((lesson) => lesson.blocks
    .filter((block) => block.type === 'visualization' && block.viz && block.visualizationId)
    .map((block) => ({ visualizationId: block.visualizationId, lessonId: lesson.lessonId, spec: block.viz })));
  return {
    schemaVersion: 1, catalogId: catalog.catalogId, catalogVersion: catalog.version, contractVersion, contentVersion: '',
    profile: 'public', locale: catalog.locale, overlays: [], sourceRights: entities.sourceRights, sources: entities.sources,
    competencies: entities.competencies, tracks: entities.tracks, milestones: entities.milestones, tools: entities.tools,
    lessons: entities.lessons, visualizations, familyActivities, explanations: entities.explanations, projects: entities.projects,
    learningModules: entities.learningModules, families: entities.families,
  };
}

// --- split content delivery (ADR-0013) ----------------------------------------
// Lesson and family bodies stay out of the initial index and are loaded by id.

const SAFE_CHUNK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,96}$/;
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

function stripPromptMarkup(prompt, maxLength = 80) {
  const text = String(prompt || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const boundary = cut.lastIndexOf(' ');
  return `${cut.slice(0, boundary > 30 ? boundary : maxLength)} …`;
}

function buildFamilyActivities(learningModules, families) {
  const familyDocuments = new Map(families.map((family) => [family.familyId, family]));
  const activities = [];
  const seen = new Set();
  for (const module of learningModules || []) {
    for (const placement of module.placements || []) {
      const activity = buildFamilyActivity(placement, module, familyDocuments, seen);
      if (activity) activities.push(activity);
    }
  }
  return activities;
}

function buildFamilyActivity(placement, module, familyDocuments, seen) {
  if (placement.role !== 'curated' || !placement.familyId || !placement.caseId) return null;
  const definitionId = `${placement.familyId}:${placement.caseId}`;
  if (seen.has(definitionId)) return null;
  const family = EXERCISE_FAMILIES.get(placement.familyId);
  if (!family) throw new Error(`Unbekannte Familie ${placement.familyId}`);
  const instance = EXERCISE_FAMILIES.instantiate(placement.familyId, placement.seed ?? 0, placement.difficulty, placement.caseId);
  const familyDocument = familyDocuments.get(placement.familyId);
  const familyTitle = familyDocument?.contract?.summary || family.summary;
  const staticCase = familyDocument?.cases?.some((entry) => entry.caseId === placement.caseId);
  const title = instance.title || stripPromptMarkup(instance.prompt, 80) || familyTitle;
  seen.add(definitionId);
  return {
    definitionId, familyId: placement.familyId, caseId: placement.caseId, seed: placement.seed ?? 0, difficulty: placement.difficulty, title,
    activityType: instance.kind ?? instance.activityType, competencyIds: [...(instance.competencyIds || [])],
    estimatedMinutes: placement.estimatedMinutes ?? 8, masteryEligible: instance.masteryEligible === true,
    seeded: !staticCase && family.authorityMode === 'seeded', moduleId: module.moduleId, lessonId: placement.lessonId ?? null,
  };
}

// Route-scoped index sections: four heavy sections ship as sidecar chunks
// loaded through sectionChunks, keeping them out of the initial bundle.
const SECTION_FIELDS = {
  sources: 'sources',
  tools: 'tools',
  visualizations: 'visualizations',
};

export function buildSplitArtifacts(bundle) {
  const { sources, tools, visualizations, ...lightBundle } = bundle;
  const sections = { sources: { sources }, tools: { tools }, visualizations: { visualizations } };
  const index = {
    ...lightBundle,
    lessons: bundle.lessons.map((lesson) => ({ ...lesson, blocks: [] })),
    familyActivities: bundle.familyActivities,
    families: bundle.families.map((family) => ({
      familyId: family.familyId,
      summary: family.contract?.summary || '',
      contract: family.contract,
      cases: family.cases.map(({ caseId, difficultyProfile, masteryEligible, challengeEligible }) => ({
        caseId, difficultyProfile, masteryEligible, ...(challengeEligible === true ? { challengeEligible: true } : {}),
      })),
    })),
  };
  const lessonBodies = bundle.lessons.map((lesson) => {
    if (!SAFE_CHUNK_ID.test(lesson.lessonId)) throw new Error(`unsichere Lektions-ID für Chunk: ${lesson.lessonId}`);
    return { id: lesson.lessonId, body: { lessonId: lesson.lessonId, blocks: lesson.blocks } };
  });
  const familyBodies = bundle.families.map((family) => {
    if (!SAFE_CHUNK_ID.test(family.familyId)) throw new Error(`unsichere Familien-ID für Chunk: ${family.familyId}`);
    return { id: family.familyId, body: family };
  });
  const duplicateIds = new Set();
  const seen = new Set();
  for (const id of [...lessonBodies.map((item) => item.id), ...familyBodies.map((item) => item.id)]) {
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
    `export const familyChunks: Record<string, () => Promise<{ default: unknown }>> = {`,
    ...familyBodies.map(({ id }) => `  ${JSON.stringify(id)}: () => import('./families/${id}.json'),`),
    '};',
    `export const sectionChunks: Record<string, () => Promise<{ default: unknown }>> = {`,
    ...Object.keys(SECTION_FIELDS).map((name) => `  ${JSON.stringify(name)}: () => import('./sections/${name}.json'),`),
    '};',
    '',
  ].join('\n');
  return { index, sections, lessonBodies, familyBodies, chunks };
}

export function writeSplitArtifacts(bundle, splitDir) {
  const { index, sections, lessonBodies, familyBodies, chunks } = buildSplitArtifacts(bundle);
  rmSync(splitDir, { recursive: true, force: true });
  mkdirSync(join(splitDir, 'lessons'), { recursive: true });
  mkdirSync(join(splitDir, 'sections'), { recursive: true });
  mkdirSync(join(splitDir, 'families'), { recursive: true });
  for (const [name, body] of Object.entries(sections)) {
    writeFileSync(join(splitDir, 'sections', `${name}.json`), JSON.stringify(body, null, 2) + '\n');
  }
  writeFileSync(join(splitDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  for (const { id, body } of lessonBodies) writeFileSync(join(splitDir, 'lessons', `${id}.json`), JSON.stringify(body, null, 2) + '\n');
  for (const { id, body } of familyBodies) writeFileSync(join(splitDir, 'families', `${id}.json`), JSON.stringify(body, null, 2) + '\n');
  writeFileSync(join(splitDir, 'chunks.ts'), chunks);
  return { index, lessonBodies, familyBodies };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const outputFlag = process.argv.indexOf('--out');
  const output = resolve(outputFlag >= 0
    ? process.argv[outputFlag + 1]
    : join(defaultProjectRoot, '.content-build/public/content-bundle.json'));
  const bundle = compileContent({ projectRoot: defaultProjectRoot });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(bundle, null, 2) + '\n');
  const splitDir = join(dirname(output), 'split');
  writeSplitArtifacts(bundle, splitDir);
  console.log(`Content-Bundle geschrieben: ${relative(defaultProjectRoot, output)} (${bundle.competencies.length} Kompetenzen, ${bundle.lessons.length} Lektionen, ${bundle.familyActivities.length} Aktivitäten)`);
  console.log(`Split-Content geschrieben: ${relative(defaultProjectRoot, splitDir)} (${bundle.lessons.length} Lektionen, ${bundle.familyActivities.length} Aktivitäten)`);
}
