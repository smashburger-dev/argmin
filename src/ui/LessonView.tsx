import { useEffect, useState } from 'preact/hooks';
import type { CatalogData, Lesson } from '../app/types';
import { getLesson, loadSources } from '../adapters/content-repository';
import { MathMarkup } from './MathMarkup';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';

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
  // S4D2: Übungsplätze des Heimatmoduls (Familien-Varianten en masse)
  // direkt aus der Lektion erreichbar: Lernen, Aufgaben, Üben.
  const practiceSpaces = (homeModule?.placements || []).filter((placement) => placement.role === 'practice-space' && placement.familyId);
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
      <header class="lesson-header">
        <div><p class="eyebrow">{homeModule ? <a href={`#/module/${homeModule.moduleId}`}>{homeModule.title}</a> : 'Lektion'} · {summary.estimatedMinutes} Min.</p><h1 id="lesson-title" tabIndex={-1}>{summary.title}</h1></div>
        <aside aria-labelledby="objectives-title"><h2 id="objectives-title">Danach kannst du</h2><ul>{summary.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></aside>
      </header>
      <div class="lesson-layout">
        <article class="lesson-prose" aria-busy={!lesson && !loadError}>
          {loadError && <p role="alert" class="content-error">Lektion konnte nicht geladen werden: {loadError}</p>}
          {!loadError && !lesson && <p role="status">Lektionsinhalt wird geladen.</p>}
          {lesson?.blocks.map((block) => <section class={`lesson-block lesson-block-${block.type}`} key={block.blockId}><MathMarkup html={block.html} /></section>)}
        </article>
        <aside class="lesson-side" aria-labelledby="practice-title">
          <p class="card-kicker">Direkt prüfen</p>
          <h2 id="practice-title">Passende Aufgaben</h2>
          {relatedExercises.length > 0
            ? <ul>{relatedExercises.slice(0, 5).map((exercise) => <li key={exercise.definitionId}><a href={routeForDefinition(exercise)}>{exercise.title}<span>{exercise.estimatedMinutes} Min.</span></a></li>)}</ul>
            : <p>Für diese neue Kompetenz werden die unabhängigen Aufgabenfamilien noch ergänzt.</p>}
          {practiceSpaces.length > 0 && <div class="lesson-practice"><h3>Übungsplatz</h3><ul>{practiceSpaces.map((placement) => <li key={placement.placementId}><a href={`#/family/${placement.familyId}/-/-/${placement.difficulty}`}>{placement.familyId}<span>Varianten en masse</span></a></li>)}</ul></div>}
          {sourceLinks.length ? <div class="lesson-sources"><h3>Weiterlesen und prüfen</h3><ul>{sourceLinks.map(({ reference, source }) => source && <li key={`${reference.sourceId}:${reference.locator}`}><a href={source.canonicalUrl} target="_blank" rel="noreferrer">{source.title}<span>{reference.role} · {reference.locator}</span></a></li>)}</ul></div> : null}
          <p class="lesson-note">Lies nicht alles noch einmal. Löse zuerst eine Aufgabe ohne Vorlage und kehre nur zur konkreten Lücke zurück.</p>
        </aside>
      </div>
      <nav class="lesson-pagination" aria-label="Lektionsnavigation">
        {previous ? <a href={`#/lesson/${previous.lessonId}`}><span>Zurück</span><strong>{previous.title}</strong></a> : <span />}
        {next ? <a href={`#/lesson/${next.lessonId}`}><span>Weiter</span><strong>{next.title}</strong></a> : <a href="#/project/p-foundations-data-checker"><span>Weiter</span><strong>CLI-Projekt</strong></a>}
      </nav>
    </section>
  );
}
