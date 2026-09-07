import type { CatalogData } from '../app/types';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { Button } from './Button';
import { Breadcrumbs } from './Breadcrumbs';
import { activityLabel, difficultyLabelFor } from './exercise-context';

export function ModuleView({ catalog, moduleId }: { catalog: CatalogData; moduleId: string }) {
  const module = catalog.learningModules.find((item) => item.moduleId === moduleId);
  if (!module) return <section class="view"><h1 tabIndex={-1}>Modul nicht gefunden</h1></section>;
  const lessonById = new Map(catalog.lessons.map((item) => [item.lessonId, item]));
  const exerciseById = new Map(catalog.exercises.map((item) => [item.definitionId, item]));
  const competencyById = new Map(catalog.competencies.map((item) => [item.competencyId, item]));
  const curated = module.placements.filter((item) => item.role === 'curated');
  const practice = module.placements.filter((item) => item.role === 'practice-space');
  return (
    <section class="view" aria-labelledby="module-title">
      <header class="view-header">
        <Breadcrumbs items={[{ href: '#/learn', label: 'Lernen' }, { label: module.title }]} />
        <p class="eyebrow">Modul · {module.estimatedMinutes} Min.</p>
        <h1 id="module-title" tabIndex={-1}>{module.title}</h1>
        <p class="lede">{module.description}</p>
      </header>
      <p class="requires">Kompetenz: {module.competencyIds.map((id) => competencyById.get(id)?.title ?? id).join(', ')}</p>
      {module.lessonIds.length > 0 && (
        <section class="activity-section" aria-labelledby="module-lesson-title">
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
      <section class="activity-section" aria-labelledby="module-curated-title">
        <div class="section-heading">
          <div><p class="eyebrow">Kuratiert</p><h2 id="module-curated-title">Aufgaben</h2></div>
          <span>{curated.length}</span>
        </div>
        {curated.length > 0
          ? <div class="activity-list">{curated.map((placement) => {
              const exercise = placement.definitionId
                ? exerciseById.get(placement.definitionId)
                : catalog.exercises.find((item) => item.familyId === placement.familyId && item.caseId === placement.caseId);
              const family = catalog.families?.find((item) => item.familyId === placement.familyId);
              const title = `${activityLabel(exercise?.activityType || family?.activityType)} · ${difficultyLabelFor(placement.difficulty)}`;
              const href = exercise ? routeForDefinition(exercise) : null;
              const familyHref = !exercise && placement.familyId
                ? `#/family/${placement.familyId}/${placement.caseId || '-'}/${placement.seed ?? '-'}/${placement.difficulty}`
                : null;
              return (
                <article class="activity-card" key={placement.placementId}>
                  <div>
                    <p class="card-kicker">{difficultyLabelFor(placement.difficulty)} · {exercise?.masteryEligible ? 'Kompetenzbeleg möglich' : 'Übung'}</p>
                    <h3>{title}</h3>
                    <p>{exercise
                      ? (exercise.masteryEligible ? 'Kann als Kompetenzbeleg zählen.' : 'Bearbeitungsnachweis, kein Mastery-Beleg.')
                      : 'Jede Öffnung erzeugt eine neue Variante.'}</p>
                  </div>
                  {href
                    ? <Button href={href}>Aufgabe öffnen</Button>
                    : familyHref
                      ? <Button href={familyHref}>Variante öffnen</Button>
                      : <span class="muted">Bald verfügbar</span>}
                </article>
              );
            })}</div>
          : <div class="empty-state"><h2>Keine kuratierten Aufgaben</h2><p>Dieses Modul hat noch keine Platzierung.</p></div>}
      </section>
      {practice.length > 0 && (
        <section class="activity-section" aria-labelledby="module-practice-title">
          <div class="section-heading">
            <div><p class="eyebrow">Übungsplatz</p><h2 id="module-practice-title">Frei üben</h2></div>
            <span>{practice.length}</span>
          </div>
          <div class="activity-list">{practice.map((placement) => (
            <article class="activity-card" key={placement.placementId}>
              <div>
                <p class="card-kicker">{difficultyLabelFor(placement.difficulty)} · Übung</p>
                <h3>{catalog.families?.find((family) => family.familyId === placement.familyId)?.summary || 'Freie Aufgabe'}</h3>
                <p>Jede Öffnung erzeugt eine neue Variante.</p>
              </div>
              {placement.familyId
                ? <Button href={`#/family/${placement.familyId}/-/-/${placement.difficulty}`}>Üben</Button>
                : <span class="muted">Bald verfügbar</span>}
            </article>
          ))}</div>
        </section>
      )}
    </section>
  );
}
