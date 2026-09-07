import type { CatalogData } from '../app/types';
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

export function ModuleView({ catalog, moduleId }: { catalog: CatalogData; moduleId: string }) {
  const module = catalog.learningModules.find((item) => item.moduleId === moduleId);
  const lessonById = new Map(catalog.lessons.map((item) => [item.lessonId, item]));
  const competencyById = new Map(catalog.competencies.map((item) => [item.competencyId, item]));
  const curated = module?.placements.filter((item) => item.role === 'curated') ?? [];
  const practice = module?.placements.filter((item) => item.role === 'practice-space') ?? [];
  useEffect(() => {
    if (module?.lessonIds.length === 1 && curated.length === 0) location.hash = `#/lesson/${module.lessonIds[0]}`;
  }, [module?.moduleId, module?.lessonIds, curated.length]);
  if (!module) return <section class="view"><h1 tabIndex={-1}>Modul nicht gefunden</h1></section>;
  const practiceByFamily = new Map(practice.map((item) => [item.familyId, item]));
  const curatedFamilies = new Set(curated.map((item) => item.familyId));
  const standalonePractice = practice.filter((item) => !curatedFamilies.has(item.familyId));
  const hasLessons = module.lessonIds.length > 0;
  const hasExercises = curated.length + practice.length > 0;
  const assignedPracticeFamilies = new Set<string>();
  return (
    <section class="view" aria-labelledby="module-title">
      <header class="view-header">
        <Breadcrumbs items={[{ href: '#/learn', label: 'Lernen' }, { label: module.title }]} />
        <p class="eyebrow">Modul · {module.estimatedMinutes} Min.</p>
        <h1 id="module-title" tabIndex={-1}>{module.title}</h1>
        <p class="lede">{module.description}</p>
      </header>
      <p class="requires">Kompetenz: {module.competencyIds.map((id) => competencyById.get(id)?.title ?? id).join(', ')}</p>
      <div class="module-sections">
        {hasLessons && (
          <section aria-labelledby="module-lesson-title">
            <div class="section-heading">
              <div><p class="eyebrow">Lesen</p><h2 id="module-lesson-title">Lektionen</h2></div>
              <span>{module.lessonIds.length}</span>
            </div>
            <div class="lesson-list">
              {module.lessonIds.map((lessonId) => {
                const lesson = lessonById.get(lessonId);
                return lesson
                  ? <a href={`#/lesson/${lesson.lessonId}`} key={lesson.lessonId}><span>{lesson.estimatedMinutes} Min.</span><strong>{lesson.title}</strong><p>{lesson.objectives[0]}</p></a>
                  : null;
              })}
            </div>
          </section>
        )}
        {hasExercises && (
          <section aria-labelledby="module-exercise-title" data-tour="module-tasks">
            <div class="section-heading">
              <div><p class="eyebrow">Üben</p><h2 id="module-exercise-title">Aufgaben & Üben</h2></div>
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
                return (
                  <article class="activity-card" key={placement.placementId}>
                    <div>
                      <p class="card-kicker">{difficultyLabelFor(placement.difficulty)} · {exercise?.masteryEligible ? 'Kompetenzbeleg möglich' : 'Übung'}</p>
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
                return (
                  <article class="activity-card" key={placement.placementId}>
                    <div>
                      <p class="card-kicker">Übungsplatz</p>
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
