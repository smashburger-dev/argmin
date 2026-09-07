import { useEffect, useState } from 'preact/hooks';
import type { CatalogData, Lesson } from '../app/types';
import { getLesson, loadSources } from '../adapters/content-repository';
import { MathMarkup } from './MathMarkup';
import { VisualizationBlock } from './VisualizationBlock';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from './Button';
import { activityLabel, difficultyLabelFor } from './exercise-context';

export function LessonView({ catalog, lessonId }: { catalog: CatalogData; lessonId: string }) {
  const lessonIndex = catalog.lessons.findIndex((item) => item.lessonId === lessonId);
  const summary = catalog.lessons[lessonIndex];
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ sourceId: string; title: string; canonicalUrl: string }> | null>(null);
  useEffect(() => {
    let live = true;
    loadSources().then((all) => { if (live) setSources(all); }).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    let live = true;
    setLesson(null);
    setLoadError(null);
    getLesson(lessonId)
      .then((body) => { if (live) setLesson(body); })
      .catch((error: Error) => { if (live) setLoadError(error.message); });
    return () => { live = false; };
  }, [lessonId]);
  if (!summary) return <section class="view"><h1 tabIndex={-1}>Lektion nicht gefunden</h1></section>;
  const homeModule = catalog.learningModules.find((module) => module.lessonIds.includes(lessonId));
  const placed = (homeModule?.placements || [])
    .filter((placement) => placement.role === 'curated' && placement.definitionId)
    .map((placement) => catalog.exercises.find((exercise) => exercise.definitionId === placement.definitionId))
    .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise));
  const relatedExercises = placed.length
    ? placed
    : catalog.exercises.filter((exercise) => exercise.competencyIds.some((id) => summary.competencyIds.includes(id)));
  const sourceLinks = summary.sourceRefs.map((reference) => ({ reference, source: (sources || []).find((source) => source.sourceId === reference.sourceId) })).filter((item) => item.source);
  // Didaktische Reihenfolge sitzt im Modul (S4B): Vor/Zurück folgt der
  // Modulreihenfolge, wenn die Lektion ein Zuhause hat, sonst den Nachbarn.
  const moduleOrder = (homeModule?.lessonIds || []).filter((id) => catalog.lessons.some((lesson) => lesson.lessonId === id));
  const modulePosition = moduleOrder.indexOf(lessonId);
  const neighbor = (id: string | undefined) => catalog.lessons.find((lesson) => lesson.lessonId === id);
  const previous = modulePosition > 0 ? neighbor(moduleOrder[modulePosition - 1]) : catalog.lessons[lessonIndex - 1];
  const next = modulePosition >= 0 && modulePosition < moduleOrder.length - 1 ? neighbor(moduleOrder[modulePosition + 1]) : catalog.lessons[lessonIndex + 1];
  return (
    <section class="view lesson-view" aria-labelledby="lesson-title">
      <Breadcrumbs items={[
        { href: '#/learn', label: 'Lernen' },
        ...(homeModule ? [{ href: `#/module/${homeModule.moduleId}`, label: homeModule.title }] : []),
        { label: summary.title },
      ]} />
      <header class="lesson-header">
        <p class="eyebrow">Lektion · {summary.estimatedMinutes} Min.</p>
        <h1 id="lesson-title" tabIndex={-1}>{summary.title}</h1>
        <div class="objectives" aria-labelledby="objectives-title"><h2 id="objectives-title">Danach kannst du</h2><ul>{summary.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></div>
      </header>
      <article class="lesson-prose" aria-busy={!lesson && !loadError}>
        {loadError && <p role="alert" class="content-error">Lektion konnte nicht geladen werden: {loadError}</p>}
        {!loadError && !lesson && <p role="status">Lektionsinhalt wird geladen.</p>}
        {lesson?.blocks.map((block) => <section class={`lesson-block lesson-block-${block.type}`} key={block.blockId}>
          {block.type === 'visualization' && block.viz
            ? <VisualizationBlock id={block.visualizationId || block.blockId} spec={block.viz} />
            : <MathMarkup html={block.html} />}
        </section>)}
      </article>
      <section class="lesson-tasks" aria-labelledby="practice-title" data-tour="lesson-tasks">
        <p class="card-kicker">Direkt prüfen</p>
        <h2 id="practice-title">Passende Aufgaben</h2>
        {relatedExercises.length > 0
          ? <>
              <div data-tour="lesson-cta">
                <Button variant="primary" class="lesson-cta" href={routeForDefinition(relatedExercises[0]!)}><span>Jetzt prüfen:&nbsp;</span><MathMarkup inline html={relatedExercises[0]!.title || activityLabel(relatedExercises[0]!.activityType)} /></Button>
              </div>
              <div class="side-cards">{relatedExercises.slice(1, 5).map((exercise) => <article class="side-card" key={exercise.definitionId}><p class="card-kicker">{difficultyLabelFor(exercise.difficulty)}{exercise.masteryEligible ? ' · Kompetenzbeleg' : ''}</p><strong><MathMarkup inline html={exercise.title || activityLabel(exercise.activityType)} /></strong><span>{exercise.estimatedMinutes} Min.</span><Button size="sm" href={routeForDefinition(exercise)}>Öffnen</Button></article>)}</div>
            </>
          : <p>Zu dieser Lektion gibt es noch keine Aufgaben. Sie kommen bald, lies in Ruhe weiter.</p>}
        {homeModule && <a class="text-link" href={`#/module/${homeModule.moduleId}`}>Alle Aufgaben im Modul →</a>}
      </section>
      {sourceLinks.length ? (
        <details class="policy lesson-sources">
          <summary>Quellen ({sourceLinks.length})</summary>
          <ul>{sourceLinks.map(({ reference, source }) => source && <li key={`${reference.sourceId}:${reference.locator}`}><a href={source.canonicalUrl} target="_blank" rel="noreferrer">{source.title}<span>{reference.role} · {reference.locator}</span></a></li>)}</ul>
        </details>
      ) : null}
      <nav class="lesson-pagination" aria-label="Lektionsnavigation" data-tour="lesson-next">
        {previous ? <a href={`#/lesson/${previous.lessonId}`}><span>Zurück</span><strong>{previous.title}</strong></a> : <span />}
        {next
          ? <a href={`#/lesson/${next.lessonId}`}><span>Weiter</span><strong>{next.title}</strong></a>
          : homeModule
            ? <a href={`#/module/${homeModule.moduleId}`}><span>Zurück zum Modul</span><strong>{homeModule.title}</strong></a>
            : <span />}
      </nav>
    </section>
  );
}
