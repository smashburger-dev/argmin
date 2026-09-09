import type { CatalogData } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { recordModuleOpened } from '../adapters/local-progress';
import { useEffect } from 'preact/hooks';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { Button } from './Button';
import { Breadcrumbs } from './Breadcrumbs';
import { MathMarkup } from './MathMarkup';
import { activityLabel, difficultyLabelFor } from './exercise-context';

function exerciseForPlacement(catalog: CatalogData, placement: CatalogData['learningModules'][number]['placements'][number]) {
  return placement.definitionId
    ? catalog.exercises.find((item) => item.definitionId === placement.definitionId)
    : catalog.exercises.find((item) => item.familyId === placement.familyId && item.caseId === placement.caseId);
}

function routeForPlacement(catalog: CatalogData, placement: CatalogData['learningModules'][number]['placements'][number]) {
  const exercise = exerciseForPlacement(catalog, placement);
  if (exercise) return routeForDefinition(exercise);
  if (!placement.familyId) return null;
  return `#/family/${placement.familyId}/${placement.caseId || '-'}/${placement.seed ?? '-'}/${placement.difficulty}`;
}

export function ModuleView({ catalog, moduleId, progress }: { catalog: CatalogData; moduleId: string; progress: ProgressSnapshot }) {
  const opened = new Set(progress.openedLessons);
  const attemptsFor = (definitionId: string | undefined) => (definitionId ? progress.attemptCounts[definitionId] ?? 0 : 0);
  const attemptsForFamily = (familyId: string | undefined) => {
    if (!familyId) return 0;
    const prefix = `${familyId}:`;
    return Object.entries(progress.attemptCounts).reduce((total, [id, count]) => total + (id.startsWith(prefix) ? count : 0), 0);
  };
  const attemptLabel = (count: number) => (count === 1 ? '1 Versuch' : `${count} Versuche`);
  const module = catalog.learningModules.find((item) => item.moduleId === moduleId);
  const lessonById = new Map(catalog.lessons.map((item) => [item.lessonId, item]));
  const competencyById = new Map(catalog.competencies.map((item) => [item.competencyId, item]));
  const curated = module?.placements.filter((item) => item.role === 'curated') ?? [];
  const practice = module?.placements.filter((item) => item.role === 'practice-space') ?? [];
  useEffect(() => {
    if (module?.lessonIds.length === 1 && curated.length === 0) location.hash = `#/lesson/${module.lessonIds[0]}`;
  }, [module?.moduleId, module?.lessonIds, curated.length]);
  useEffect(() => {
    if (module) void recordModuleOpened(module.moduleId).catch(() => {});
  }, [module]);
  if (!module) return <section class="view"><h1 tabIndex={-1}>Modul nicht gefunden</h1></section>;
  const practiceByFamily = new Map(practice.map((item) => [item.familyId, item]));
  const curatedFamilies = new Set(curated.map((item) => item.familyId));
  const standalonePractice = practice.filter((item) => !curatedFamilies.has(item.familyId));
  const hasLessons = module.lessonIds.length > 0;
  const hasExercises = curated.length + practice.length > 0;
  const assignedPracticeFamilies = new Set<string>();
  return (
    <section class="view" aria-labelledby="module-title">
      <header class="view-header split-header">
        <div>
          <Breadcrumbs items={[{ href: '#/learn', label: 'Lernen' }, { label: module.title }]} />
          <p class="eyebrow">Modul · {module.estimatedMinutes} Min.</p>
          <h1 id="module-title" tabIndex={-1}>{module.title}</h1>
          <p class="lede">{module.description}</p>
        </div>
        <p class="module-competence"><span>Kompetenz</span><strong>{module.competencyIds.map((id) => competencyById.get(id)?.title ?? id).join(', ')}</strong></p>
      </header>
      <div class="module-sections">
        {hasLessons && (
          <section aria-labelledby="module-lesson-title">
            <div class="section-heading">
              <div><h2 id="module-lesson-title">Lektionen</h2></div>
              <span>{module.lessonIds.length}</span>
            </div>
            <div class="lesson-list">
              {module.lessonIds.map((lessonId) => {
                const lesson = lessonById.get(lessonId);
                const isOpen = lesson ? opened.has(lesson.lessonId) : false;
                return lesson
                  ? <a href={`#/lesson/${lesson.lessonId}`} key={lesson.lessonId} class={isOpen ? 'has-progress' : undefined}><span>{lesson.estimatedMinutes} Min.{isOpen ? <> · <span class="progress-marker">Geöffnet</span></> : null}</span><strong>{lesson.title}</strong><p>{lesson.objectives[0]}</p></a>
                  : null;
              })}
            </div>
          </section>
        )}
        {hasExercises && (
          <section aria-labelledby="module-exercise-title" data-tour="module-tasks">
            <div class="section-heading">
              <div><h2 id="module-exercise-title">Aufgaben & Üben</h2></div>
              <span>{curated.length + standalonePractice.length}</span>
            </div>
            <div class="activity-list">
              {curated.map((placement) => {
                const exercise = exerciseForPlacement(catalog, placement);
                const practicePlacement = placement.familyId && practiceByFamily.has(placement.familyId) && !assignedPracticeFamilies.has(placement.familyId)
                  ? practiceByFamily.get(placement.familyId)
                  : undefined;
                if (practicePlacement && placement.familyId) assignedPracticeFamilies.add(placement.familyId);
                const href = routeForPlacement(catalog, placement);
                const tries = attemptsFor(exercise?.definitionId);
                return (
                  <article class={tries > 0 ? 'activity-card has-progress' : 'activity-card'} key={placement.placementId}>
                    <div>
                      <p class="card-kicker">{difficultyLabelFor(placement.difficulty)} · {exercise?.masteryEligible ? 'Kompetenzbeleg möglich' : 'Übung'}{tries > 0 ? <> · <span class="progress-marker">{attemptLabel(tries)}</span></> : null}</p>
                      <h3>{exercise?.title ? <MathMarkup inline html={exercise.title} /> : `${activityLabel(exercise?.activityType)} · ${difficultyLabelFor(placement.difficulty)}`}</h3>
                    </div>
                    <div class="actions vertical">
                      {href ? <Button variant="primary" href={href}>Aufgabe öffnen</Button> : <span class="muted">Bald verfügbar</span>}
                      {practicePlacement && <Button variant="ghost" href={`#/family/${practicePlacement.familyId}/-/-/${practicePlacement.difficulty}`}>Neue Variante</Button>}
                    </div>
                  </article>
                );
              })}
              {standalonePractice.map((placement) => {
                const family = catalog.families?.find((item) => item.familyId === placement.familyId);
                const tries = attemptsForFamily(placement.familyId);
                return (
                  <article class={tries > 0 ? 'activity-card has-progress' : 'activity-card'} key={placement.placementId}>
                    <div>
                      <p class="card-kicker">Übungsplatz{tries > 0 ? <> · <span class="progress-marker">{attemptLabel(tries)}</span></> : null}</p>
                      <h3>{activityLabel(family?.activityType)} · {difficultyLabelFor(placement.difficulty)}</h3>
                      <p>Jede Öffnung erzeugt eine neue Variante.</p>
                    </div>
                    {placement.familyId
                      ? <Button variant="primary" href={`#/family/${placement.familyId}/-/-/${placement.difficulty}`}>Üben</Button>
                      : <span class="muted">Bald verfügbar</span>}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
