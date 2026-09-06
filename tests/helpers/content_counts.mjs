// Independent re-derivation of the public content counts from declared
// content roots (growth-counter rule, ADR-0013 inherited-debt C).
// Tests use these instead of hardcoded numbers so content can grow without
// meaningless counter edits. This helper intentionally mirrors the documented
// public filter of tools/compile_content.mjs — it is the independent check
// that the compiler actually applies that filter.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogRoot, discoverJson, discoverProjects } from '../../tools/content_roots.mjs';

export function expectedPublicCounts(projectRoot) {
  const contentRoot = join(projectRoot, 'content');
  const read = (path) => JSON.parse(readFileSync(join(contentRoot, path), 'utf8'));
  const catalog = read('catalog.json');

  const collection = (files, property) => files.flatMap((file) => read(file)[property]);
  const objects = (files) => files.map((file) => read(file));

  const competencies = collection(discoverJson(contentRoot, catalogRoot(catalog, 'competencies')), 'competencies')
    .filter((item) => item.releaseStatus !== 'local-only');
  const tracks = collection(discoverJson(contentRoot, catalogRoot(catalog, 'tracks')), 'tracks')
    .filter((item) => item.releaseStatus !== 'local-only');
  const milestones = collection(discoverJson(contentRoot, catalogRoot(catalog, 'milestones')), 'milestones')
    .filter((item) => item.releaseStatus !== 'local-only');
  const tools = collection(discoverJson(contentRoot, catalogRoot(catalog, 'tools')), 'tools')
    .filter((item) => item.releaseStatus !== 'local-only');
  const reviews = collection(discoverJson(contentRoot, catalogRoot(catalog, 'reviews')), 'reviews');
  const lessons = objects(discoverJson(contentRoot, catalogRoot(catalog, 'lessons')))
    .filter((item) => item.releaseStatus !== 'local-only');
  const explanations = objects(discoverJson(contentRoot, catalogRoot(catalog, 'explanations')))
    .filter((item) => item.releaseStatus !== 'local-only');
  const projects = objects(discoverProjects(contentRoot, catalogRoot(catalog, 'projects')))
    .filter((item) => item.releaseStatus !== 'local-only');
  const modules = objects(discoverJson(contentRoot, catalogRoot(catalog, 'modules')))
    .filter((item) => item.releaseStatus !== 'local-only');

  const legacyExercises = catalog.legacy.exerciseFiles
    .flatMap((file) => read(file).exercises || [])
    .filter((exercise) => exercise.active !== false);
  const authoredExercises = objects(discoverJson(contentRoot, catalogRoot(catalog, 'exerciseDefinitions')))
    .filter((item) => item.active !== false && item.releaseStatus !== 'local-only');

  return {
    competencies: competencies.length,
    tracks: tracks.length,
    milestones: milestones.length,
    tools: tools.length,
    reviews: reviews.length,
    lessons: lessons.length,
    explanations: explanations.length,
    projects: projects.length,
    modules: modules.length,
    exercises: legacyExercises.length + authoredExercises.length,
    curriculumWeeks: read(catalog.legacy.curriculumFile).weeks.length,
  };
}
