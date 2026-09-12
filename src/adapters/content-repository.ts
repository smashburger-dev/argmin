import contentIndex from '@content-index';
import { familyChunks, lessonChunks, sectionChunks } from '@content-chunks';
import type { CatalogData, ExerciseSummary, LearningModule, Lesson, SourceSummary, ToolCard, VisualizationSummary } from '../app/types';

// ContentRepository (ADR-0013): the initial bundle carries only the catalog
// index (competencies, tracks, milestones, summaries). Lesson and exercise
// Bodies load per route through dynamic imports, so the initial chunk no
// longer grows linearly with content.

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
    summary?: string;
    contract: (Record<string, unknown> & { activityType?: string }) | null;
    cases: Array<{ caseId: string; difficultyProfile: string; masteryEligible: boolean }>;
  }>;
}

// Route-scoped heavy sections: own JSON chunks, loaders cached and deduped.
interface SectionIndex {
  sources: { sources: SourceSummary[] };
  tools: { tools: ToolCard[] };
  visualizations: { visualizations: VisualizationSummary[] };
}

type LessonBody = { lessonId: string; blocks: Lesson['blocks'] };
type FamilyCases = { familyId: string; cases: Array<Record<string, unknown>> };

export class ContentUnavailableError extends Error {
  constructor(public readonly contentId: string, kind: 'lesson' | 'exercise' | 'visualization', cause: unknown) {
    super(`Inhalt ${kind} ${contentId} konnte nicht geladen werden: ${String((cause as Error)?.message || cause)}`);
    this.name = 'ContentUnavailableError';
  }
}

const index = contentIndex as unknown as CompiledIndex;

const lessonCache = new Map<string, Lesson>();
const familyCache = new Map<string, FamilyCases>();
const pending = new Map<string, Promise<unknown>>();

function loadOnce<T>(key: string, run: () => Promise<T>): Promise<T> {
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;
  const promise = run().finally(() => { pending.delete(key); });
  pending.set(key, promise);
  return promise;
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
    parameters: {},
    choices: [],
    expectedAnswer: {},
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
    families: index.families.map((family) => ({
      familyId: family.familyId,
      summary: family.summary ?? '',
      activityType: family.contract?.activityType,
    })),
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

export async function loadSources(): Promise<SourceSummary[]> {
  return (await sectionFile('sources')).sources;
}
export async function loadTools(): Promise<ToolCard[]> {
  return (await sectionFile('tools')).tools;
}
export async function loadVisualizations(): Promise<VisualizationSummary[]> {
  return (await sectionFile('visualizations')).visualizations;
}

export async function getVisualization(visualizationId: string): Promise<VisualizationSummary> {
  const visualizations = await loadVisualizations();
  const visualization = visualizations.find((item) => item.visualizationId === visualizationId);
  if (!visualization) throw new ContentUnavailableError(visualizationId, 'visualization', new Error('Visualisierung existiert im Katalog nicht'));
  return visualization;
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
