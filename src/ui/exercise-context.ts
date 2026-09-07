import type { CatalogData, ExercisePlacement, ExerciseSummary, LearningModule, Lesson } from '../app/types';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';

export const difficultyLabels = {
  intro: 'Einstieg',
  core: 'Kern',
  stretch: 'Vertiefung',
  challenge: 'Herausforderung',
} as const;

export interface ExerciseContext {
  module?: LearningModule;
  lesson?: Lesson;
  title: string;
  difficultyLabel: string;
  lessonHref?: string;
  moduleHref?: string;
  nextVariantHref: string;
  nextTaskHref?: string;
  nextTaskTitle?: string;
}

type ExerciseInstance = {
  familyId: string;
  caseId?: string;
  difficulty: string;
  seed: number;
};

function shorten(value: string, maxLength = 90) {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${cut.slice(0, boundary > 30 ? boundary : maxLength - 1)}…`;
}

function matchesPlacement(placement: ExercisePlacement, instance: ExerciseInstance) {
  return placement.familyId === instance.familyId
    && (!placement.caseId || placement.caseId === instance.caseId);
}

function findPlacement(catalog: CatalogData, instance: ExerciseInstance) {
  const matches = catalog.learningModules.flatMap((module) => module.placements
    .filter((placement) => matchesPlacement(placement, instance))
    .map((placement) => ({ module, placement })));
  return matches.sort(({ placement: left }, { placement: right }) => (
    Number(right.role === 'curated') - Number(left.role === 'curated')
  ))[0];
}

function exerciseFor(catalog: CatalogData, familyId: string, caseId?: string): ExerciseSummary | undefined {
  return catalog.exercises.find((exercise) => exercise.familyId === familyId && exercise.caseId === caseId);
}

function placementRoute(catalog: CatalogData, placement: ExercisePlacement | undefined) {
  if (!placement) return null;
  const exercise = placement.definitionId
    ? catalog.exercises.find((item) => item.definitionId === placement.definitionId)
    : exerciseFor(catalog, placement.familyId, placement.caseId);
  if (exercise) return { href: routeForDefinition(exercise), title: exercise.title };
  if (!placement.caseId) return null;
  return {
    href: `#/family/${placement.familyId}/${placement.caseId}/${placement.seed ?? 0}/${placement.difficulty}`,
    title: catalog.families?.find((family) => family.familyId === placement.familyId)?.summary || 'Nächste Aufgabe',
  };
}

function nextPlacement(catalog: CatalogData, module: LearningModule | undefined, current: ExercisePlacement | undefined) {
  if (!module || !current) return undefined;
  const start = module.placements.indexOf(current);
  return module.placements.slice(start + 1).find((placement) => placement.role === 'curated');
}

export function getExerciseContext(catalog: CatalogData, instance: ExerciseInstance, summary: string): ExerciseContext {
  const match = findPlacement(catalog, instance);
  const module = match?.module;
  const placement = match?.placement;
  const lessonId = placement?.lessonId ?? module?.lessonIds[0];
  const lesson = lessonId ? catalog.lessons.find((item) => item.lessonId === lessonId) : undefined;
  const exercise = exerciseFor(catalog, instance.familyId, instance.caseId);
  const next = placementRoute(catalog, nextPlacement(catalog, module, placement));
  return {
    module,
    lesson,
    title: shorten(exercise?.title || summary || 'Aufgabe'),
    difficultyLabel: difficultyLabels[instance.difficulty as keyof typeof difficultyLabels] || instance.difficulty,
    lessonHref: lesson ? `#/lesson/${lesson.lessonId}` : undefined,
    moduleHref: module ? `#/module/${module.moduleId}` : undefined,
    nextVariantHref: `#/family/${instance.familyId}/${instance.caseId || '-'}/-/${instance.difficulty}`,
    nextTaskHref: next?.href,
    nextTaskTitle: next?.title,
  };
}
