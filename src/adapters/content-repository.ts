import contentIndex from '@content-index';
import { exerciseChunks, familyChunks, lessonChunks, sectionChunks } from '@content-chunks';
import type { CatalogData, ExerciseSummary, LearningModule, Lesson, LegacyWeekSummary, ReviewRecord, SourceSummary, ToolCard } from '../app/types';

// ContentRepository (ADR-0013): the initial bundle carries only the catalog
// index (competencies, tracks, milestones, summaries). Lesson and exercise
// bodies load per route through profile-local dynamic imports, so the initial
// chunk no longer grows linearly with content. Both build profiles (public,
// local-private) resolve @content-index/@content-chunks through the vite
// alias; this module is the single shared runtime adapter.

interface CompiledIndex {
  catalogId: string;
  catalogVersion: string;
  competencies: CatalogData['competencies'];
  tracks: CatalogData['tracks'];
  milestones: CatalogData['milestones'];
  lessons: Array<Lesson & { blocks: never[] }>;
  explanations: CatalogData['explanations'];
  projects: CatalogData['projects'];
  learningModules?: LearningModule[];
  exerciseDefinitions: Array<Partial<ExerciseSummary> & Pick<ExerciseSummary, 'definitionId' | 'competencyIds' | 'activityType' | 'estimatedMinutes' | 'difficulty' | 'graderId'>>;
  familyActivities: Array<{
    definitionId: string;
    familyId: string;
    caseId: string;
    seed: number;
    difficulty: string;
    title: string;
    activityType: string;
    competencyIds: string[];
    estimatedMinutes: number;
    masteryEligible: boolean;
    seeded: boolean;
    moduleId: string;
    lessonId: string | null;
  }>;
  families: Array<{
    familyId: string;
    contract: Record<string, unknown> | null;
    cases: Array<{ caseId: string; difficultyProfile: string; masteryEligible: boolean }>;
  }>;
}

// Route-scoped heavy sections: own JSON chunks, loaders cached and deduped.
interface SectionIndex {
  roadmap: { legacyProjection: { weeks: LegacyWeekSummary[] } };
  sources: { sources: SourceSummary[] };
  tools: { tools: ToolCard[] };
  reviews: { reviews: ReviewRecord[] };
}

type LessonBody = { lessonId: string; blocks: Lesson['blocks'] };
type ExerciseBody = Partial<ExerciseSummary> & { definitionId: string };
type FamilyCases = { familyId: string; cases: Array<Record<string, unknown>> };

const EMPTY_EXERCISE_BODY = {
  parameters: {},
  choices: [],
  expectedAnswer: {},
  tolerancePolicy: {},
  hints: [],
  feedbackRules: [],
  fullSolution: '',
  workedExample: null,
  rubric: null,
  typicalErrors: null,
} as const;

function mergeExerciseBody(summary: ExerciseSummary, body: ExerciseBody): ExerciseSummary {
  return {
    ...summary,
    ...EMPTY_EXERCISE_BODY,
    ...body,
    starterCode: (body.parameters as { starterCode?: string } | undefined)?.starterCode,
    packages: (body.parameters as { packages?: string[] } | undefined)?.packages ?? [],
  } as ExerciseSummary;
}

export class ContentUnavailableError extends Error {
  constructor(public readonly contentId: string, kind: 'lesson' | 'exercise', cause: unknown) {
    super(`Inhalt ${kind} ${contentId} konnte nicht geladen werden: ${String((cause as Error)?.message || cause)}`);
    this.name = 'ContentUnavailableError';
  }
}

const index = contentIndex as unknown as CompiledIndex;

const lessonCache = new Map<string, Lesson>();
const exerciseCache = new Map<string, ExerciseSummary>();
const familyCache = new Map<string, FamilyCases>();
const pending = new Map<string, Promise<unknown>>();

function loadOnce<T>(key: string, run: () => Promise<T>): Promise<T> {
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;
  const promise = run().finally(() => { pending.delete(key); });
  pending.set(key, promise);
  return promise;
}

function toExerciseSummary(exercise: CompiledIndex['exerciseDefinitions'][number]): ExerciseSummary {
  return {
    definitionId: exercise.definitionId,
    version: exercise.version ?? 1,
    title: exercise.title ?? exercise.definitionId,
    prompt: (exercise as { promptSnippet?: string }).promptSnippet ?? '',
    activityType: exercise.activityType,
    graderId: exercise.graderId,
    generatorId: exercise.generatorId ?? null,
    referenceSolverId: exercise.referenceSolverId ?? null,
    competencyIds: exercise.competencyIds,
    estimatedMinutes: exercise.estimatedMinutes,
    difficulty: exercise.difficulty,
    deterministicSeed: exercise.deterministicSeed ?? 0,
    masteryEligible: exercise.masteryEligible ?? false,
    active: exercise.active ?? true,
    releaseStatus: exercise.releaseStatus ?? 'draft',
    legacyWeekId: exercise.legacyWeekId ?? null,
    testedSeedCount: exercise.testedSeedCount ?? 0,
    parameters: {},
    choices: [],
    expectedAnswer: {},
    tolerancePolicy: {},
    hints: [],
    feedbackRules: [],
    fullSolution: '',
    workedExample: null,
    rubric: null,
    typicalErrors: null,
    starterCode: undefined,
    packages: [],
  } as ExerciseSummary;
}

function toFamilySummary(activity: CompiledIndex['familyActivities'][number]): ExerciseSummary {
  return {
    definitionId: activity.definitionId,
    version: 1,
    title: activity.title,
    prompt: activity.title,
    activityType: activity.activityType,
    graderId: 'family',
    generatorId: null,
    referenceSolverId: null,
    competencyIds: activity.competencyIds,
    estimatedMinutes: activity.estimatedMinutes,
    difficulty: activity.difficulty,
    deterministicSeed: activity.seed,
    masteryEligible: activity.masteryEligible,
    active: true,
    releaseStatus: 'draft',
    legacyWeekId: null,
    parameters: {},
    choices: [],
    expectedAnswer: {},
    tolerancePolicy: {},
    hints: [],
    feedbackRules: [],
    fullSolution: '',
    workedExample: null,
    rubric: null,
    typicalErrors: null,
    testedSeedCount: 0,
    starterCode: undefined,
    packages: [],
    familyId: activity.familyId,
    caseId: activity.caseId,
    seed: activity.seed,
    seeded: activity.seeded,
  };
}

export function loadCatalog(): CatalogData {
  return {
    catalogId: index.catalogId,
    version: index.catalogVersion,
    competencies: index.competencies,
    tracks: index.tracks,
    milestones: index.milestones,
    learningModules: index.learningModules ?? [],
    lessons: index.lessons,
    exercises: index.familyActivities.map(toFamilySummary),
    explanations: index.explanations,
    projects: index.projects,
  };
}

export function loadFamilyIndex() {
  return index.families;
}

export async function loadFamilyCases(familyId: string): Promise<FamilyCases | null> {
  const cached = familyCache.get(familyId);
  if (cached) return cached;
  const loader = familyChunks[familyId];
  if (!loader) return null;
  const body = await loadOnce(`family:${familyId}`, () => loader()) as {
    default: FamilyCases;
  };
  familyCache.set(familyId, body.default);
  return body.default;
}

async function sectionFile<K extends keyof SectionIndex>(name: K): Promise<SectionIndex[K]> {
  const loader = sectionChunks[name];
  if (!loader) throw new Error(`Content-Sektion ${name} fehlt im Chunk-Mapping`);
  const body = (await loadOnce(`section:${name}`, () => loader())) as { default: SectionIndex[K] };
  return body.default;
}

export async function loadRoadmapWeeks(): Promise<LegacyWeekSummary[]> {
  return (await sectionFile('roadmap')).legacyProjection.weeks;
}
export async function loadSources(): Promise<SourceSummary[]> {
  return (await sectionFile('sources')).sources;
}
export async function loadTools(): Promise<ToolCard[]> {
  return (await sectionFile('tools')).tools;
}
export async function loadReviews(): Promise<ReviewRecord[]> {
  return (await sectionFile('reviews')).reviews;
}

export async function getLesson(lessonId: string): Promise<Lesson> {
  const cached = lessonCache.get(lessonId);
  if (cached) return cached;
  const summary = index.lessons.find((lesson) => lesson.lessonId === lessonId);
  if (!summary) throw new ContentUnavailableError(lessonId, 'lesson', new Error('Lektion existiert im Katalog nicht'));
  const loader = lessonChunks[lessonId];
  if (!loader) throw new ContentUnavailableError(lessonId, 'lesson', new Error('kein Content-Chunk registriert'));
  try {
    const body = await loadOnce(`lesson:${lessonId}`, () => loader()) as { default: LessonBody };
    const lesson: Lesson = { ...summary, blocks: body.default.blocks };
    lessonCache.set(lessonId, lesson);
    return lesson;
  } catch (cause) {
    throw new ContentUnavailableError(lessonId, 'lesson', cause);
  }
}

export async function getExercise(definitionId: string): Promise<ExerciseSummary> {
  const cached = exerciseCache.get(definitionId);
  if (cached) return cached;
  const summary = toExerciseSummary(index.exerciseDefinitions.find((exercise) => exercise.definitionId === definitionId)
    ?? (() => { throw new ContentUnavailableError(definitionId, 'exercise', new Error('Aufgabe existiert im Katalog nicht')); })());
  const loader = exerciseChunks[definitionId];
  if (!loader) throw new ContentUnavailableError(definitionId, 'exercise', new Error('kein Content-Chunk registriert'));
  try {
    const body = await loadOnce(`exercise:${definitionId}`, () => loader()) as { default: ExerciseBody };
    const exercise = mergeExerciseBody(summary, body.default);
    exerciseCache.set(definitionId, exercise);
    return exercise;
  } catch (cause) {
    throw new ContentUnavailableError(definitionId, 'exercise', cause);
  }
}
