import type { CatalogData, ExercisePlacement, ExerciseSummary, LearningModule, Lesson } from '../app/types';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';

export const activityTypeLabels = {
  'single-choice': 'Konzeptfrage',
  numeric: 'Rechenaufgabe',
  vector: 'Rechenaufgabe',
  'algebraic-expression': 'Rechenaufgabe',
  'predict-output': 'Ablauf nachvollziehen',
  'code-trace': 'Ablauf nachvollziehen',
  'python-code': 'Programmieraufgabe',
  parsons: 'Code ordnen',
  'short-rationale': 'Begründung',
} as const;

export function activityLabel(activityType: string | undefined) {
  return (activityType && activityTypeLabels[activityType as keyof typeof activityTypeLabels]) || 'Aufgabe';
}

export const difficultyLabels = {
  intro: 'Einstieg',
  core: 'Kern',
  stretch: 'Vertiefung',
  challenge: 'Herausforderung',
} as const;

export function difficultyLabelFor(difficulty: string | number | undefined) {
  return difficultyLabels[String(difficulty) as keyof typeof difficultyLabels] || 'Aufgabe';
}

export interface ExerciseContext {
  module?: LearningModule;
  lesson?: Lesson;
  title: string;
  summary: string;
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
  activityType: string;
};

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

function familyFor(catalog: CatalogData, familyId: string) {
  return catalog.families?.find((family) => family.familyId === familyId);
}

function placementRoute(catalog: CatalogData, placement: ExercisePlacement | undefined) {
  if (!placement) return null;
  const exercise = placement.definitionId
    ? catalog.exercises.find((item) => item.definitionId === placement.definitionId)
    : exerciseFor(catalog, placement.familyId, placement.caseId);
  if (exercise) return { href: routeForDefinition(exercise), title: activityLabel(exercise.activityType) };
  if (!placement.caseId) return null;
  const family = familyFor(catalog, placement.familyId);
  return {
    href: `#/family/${placement.familyId}/${placement.caseId}/${placement.seed ?? 0}/${placement.difficulty}`,
    title: activityLabel(family?.activityType),
  };
}

function nextPlacement(catalog: CatalogData, module: LearningModule | undefined, current: ExercisePlacement | undefined) {
  if (!module || !current) return undefined;
  const start = module.placements.indexOf(current);
  return module.placements.slice(start + 1).find((placement) => placement.role === 'curated');
}

export function randomVariantSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function getExerciseContext(catalog: CatalogData, instance: ExerciseInstance, summary: string, nextSeed?: number): ExerciseContext {
  const match = findPlacement(catalog, instance);
  const module = match?.module;
  const placement = match?.placement;
  const lessonId = placement?.lessonId ?? module?.lessonIds[0];
  const lesson = lessonId ? catalog.lessons.find((item) => item.lessonId === lessonId) : undefined;
  const next = placementRoute(catalog, nextPlacement(catalog, module, placement));
  const family = familyFor(catalog, instance.familyId);
  return {
    module,
    lesson,
    title: activityLabel(instance.activityType),
    summary: family?.summary ?? summary ?? '',
    difficultyLabel: difficultyLabelFor(instance.difficulty),
    lessonHref: lesson ? `#/lesson/${lesson.lessonId}` : undefined,
    moduleHref: module ? `#/module/${module.moduleId}` : undefined,
    nextVariantHref: `#/family/${instance.familyId}/${instance.caseId || '-'}/${nextSeed ?? '-'}/${instance.difficulty}`,
    nextTaskHref: next?.href,
    nextTaskTitle: next?.title,
  };
}
