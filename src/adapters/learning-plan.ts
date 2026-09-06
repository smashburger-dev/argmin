import { CompetencyGraph } from '../../assets/js/domain/competency_graph.mjs';
import { PlanEngine } from '../../assets/js/domain/plan_engine.mjs';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import type { CatalogData } from '../app/types';
import type { ProgressSnapshot } from './local-progress';

export interface LearningPlanItem {
  activityId: string;
  type: string;
  competencyIds: string[];
  estimatedMinutes: number;
  reasonCodes: string[];
  route: string;
  title: string;
  /** Task-review due date (expanding slots). Distinct from the aggregated
   *  competency freshness deadline — two separate timelines (ADR-0015). */
  reviewDueAt?: string;
}

export interface WeeklyLearningPlan {
  availableMinutes: number;
  totalMinutes: number;
  unallocatedMinutes: number;
  reviewMinutes: number;
  reviewOverflowCount: number;
  days: Array<{ day: number; minutes: number; items: LearningPlanItem[] }>;
}

export function buildWeeklyLearningPlan(catalog: CatalogData, progress: ProgressSnapshot): WeeklyLearningPlan {
  const graph = new CompetencyGraph(catalog.competencies);
  const planner = new PlanEngine(graph);
  const track = catalog.tracks.find((item) => item.trackId === progress.trackId) || catalog.tracks[0];
  const evidenceByCompetency = Object.fromEntries(catalog.competencies.map((competency) => [competency.competencyId, { state: progress.evidenceStates[competency.competencyId] || 'unassessed' }]));
  const exerciseById = new Map(catalog.exercises.map((item) => [item.definitionId, item]));
  // Due reviews for exercises the catalog no longer carries (imported
  // history) have no actionable route — scheduling them would burn review
  // budget on a dead #/learn link, so they are filtered before planning.
  const actionableReviews = progress.dueReviews.filter((review) => exerciseById.has(review.exerciseId));
  const activities = [
    ...catalog.lessons.map((lesson) => ({ activityId: lesson.lessonId, type: 'lesson', competencyIds: lesson.competencyIds, estimatedMinutes: lesson.estimatedMinutes })),
    ...catalog.exercises.map((exercise) => ({ activityId: exercise.definitionId, type: 'exercise', competencyIds: exercise.competencyIds, estimatedMinutes: exercise.estimatedMinutes })),
    ...catalog.projects.map((project) => ({ activityId: project.projectId, type: 'project', competencyIds: project.competencyIds, estimatedMinutes: project.estimatedMinutes ?? 90 })),
    ...actionableReviews.map((review) => {
      const exercise = exerciseById.get(review.exerciseId);
      return { activityId: review.exerciseId, type: 'review', competencyIds: exercise?.competencyIds || [], estimatedMinutes: exercise?.estimatedMinutes || 10, dueAt: review.nextDueAt };
    }),
  ];
  const plan = planner.build({
    goalCompetencyIds: track?.competencyIds || catalog.competencies.map((item) => item.competencyId),
    availableMinutes: progress.weeklyMinutes,
    availableDays: 7,
    evidenceByCompetency,
    activities,
  });
  const lessonById = new Map(catalog.lessons.map((item) => [item.lessonId, item]));
  const projectById = new Map(catalog.projects.map((item) => [item.projectId, item]));
  const decorate = (item: Omit<LearningPlanItem, 'route' | 'title'> & { dueAt?: string }): LearningPlanItem => {
    const lesson = lessonById.get(item.activityId);
    const exercise = exerciseById.get(item.activityId);
    const project = projectById.get(item.activityId);
    const { dueAt, ...rest } = item;
    const baseRoute = lesson ? `#/lesson/${lesson.lessonId}`
      : exercise ? routeForDefinition(exercise)
      : project ? `#/project/${project.projectId}` : '#/learn';
    return {
      ...rest,
      route: dueAt && exercise?.familyId
        ? `#/family/${exercise.familyId}/${exercise.caseId}/-/${exercise.difficulty ?? 'core'}`
        : baseRoute,
      title: lesson?.title || exercise?.title || project?.title || item.activityId,
      ...(dueAt ? { reviewDueAt: dueAt } : {}),
    };
  };
  return { ...plan, days: plan.days.map((day: { day: number; minutes: number; items: Array<Omit<LearningPlanItem, 'route' | 'title'>> }) => ({ ...day, items: day.items.map(decorate) })) };
}
