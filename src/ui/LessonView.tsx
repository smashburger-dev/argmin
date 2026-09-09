import { useEffect, useMemo, useState } from 'preact/hooks';
import type { CatalogData, Lesson } from '../app/types';
import { getLesson, loadSources } from '../adapters/content-repository';
import { recordLessonOpened, recordModuleOpened } from '../adapters/local-progress';
import { MathMarkup } from './MathMarkup';
import { VisualizationBlock } from './VisualizationBlock';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from './Button';
import { activityLabel, difficultyLabelFor } from './exercise-context';

type LessonSegment = { heading: string | null; anchor: string | null; html: string };

function slugifyHeading(text: string): string {
  return text.toLocaleLowerCase('de').replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-+|-+$/g, '') || 'abschnitt';
}

function splitLessonHtml(html: string): LessonSegment[] {
  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = parsed.body.firstElementChild;
  if (!root) return [];
  const segments: LessonSegment[] = [];
  let nodes: ChildNode[] = [];
  let heading: string | null = null;
  const flush = () => {
    const holder = parsed.createElement('div');
    nodes.forEach((node) => holder.appendChild(node.cloneNode(true)));
    if (holder.textContent?.trim()) segments.push({ heading, anchor: null, html: holder.innerHTML });
    nodes = [];
  };
  for (const node of [...root.childNodes]) {
    if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() === 'h2') {
      flush();
      heading = ((node as HTMLElement).textContent ?? '').trim() || null;
      continue;
    }
    nodes.push(node);
  }
  flush();
  return segments;
}

const segmentKicker: Record<string, string> = {
  checkpoint: 'Checkpoint',
  exercise: 'Übung',
  'project-step': 'Projektschritt',
  reflection: 'Reflexion',
};

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
  useEffect(() => {
    if (!summary) return;
    void recordLessonOpened(lessonId).catch(() => {});
    const home = catalog.learningModules.find((item) => item.lessonIds.includes(lessonId));
    if (home) void recordModuleOpened(home.moduleId).catch(() => {});
  }, [lessonId, summary, catalog]);
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
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const previous = modulePosition > 0 ? neighbor(moduleOrder[modulePosition - 1]) : catalog.lessons[lessonIndex - 1];
  const next = modulePosition >= 0 && modulePosition < moduleOrder.length - 1 ? neighbor(moduleOrder[modulePosition + 1]) : catalog.lessons[lessonIndex + 1];
  const prose = useMemo(() => {
    const used = new Set<string>();
    const blocks = (lesson?.blocks ?? []).map((block) => {
      if (block.type === 'visualization' && block.viz) return { block, segments: null as LessonSegment[] | null };
      const segments = splitLessonHtml(typeof block.html === 'string' ? block.html : '');
      for (const segment of segments) {
        if (!segment.heading) continue;
        const base = slugifyHeading(segment.heading);
        let anchor = base;
        for (let suffix = 2; used.has(anchor); suffix += 1) anchor = `${base}-${suffix}`;
        used.add(anchor);
        segment.anchor = anchor;
      }
      return { block, segments };
    });
    return {
      blocks,
      toc: blocks.flatMap(({ segments }) => (segments ?? []).filter((segment) => segment.heading)),
      firstProse: blocks.findIndex(({ segments }) => segments !== null),
    };
  }, [lesson]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || prose.toc.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveAnchor(entry.target.id);
      }
    }, { rootMargin: '-25% 0px -65% 0px' });
    prose.toc
      .map((segment) => document.getElementById(segment.anchor!))
      .filter((element): element is HTMLElement => Boolean(element))
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [prose]);
  return (
    <section class="view lesson-view" aria-labelledby="lesson-title">
      <div class="lesson-layout">
      <Breadcrumbs items={[
        { href: '#/learn', label: 'Lernen' },
        ...(homeModule ? [{ href: `#/module/${homeModule.moduleId}`, label: homeModule.title }] : []),
        { label: summary.title },
      ]} />
      <header class="lesson-header">
        <p class="eyebrow">Lektion · {summary.estimatedMinutes} Min.</p>
        <h1 id="lesson-title" tabIndex={-1}>{summary.title}</h1>
        <p class="lesson-subtitle">{summary.objectives[0]}</p>
      </header>
      <div class="objectives-mini">
        <details class="objectives-drop-mini">
          <summary aria-label="Lernziele anzeigen: Danach kannst du" title="Danach kannst du">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
          </summary>
          <div class="objectives-panel" aria-label="Danach kannst du">
            <p><strong>Danach kannst du</strong></p>
            <ul>{summary.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
          </div>
        </details>
      </div>
      {prose.toc.length > 1 && (
        <nav class="lesson-toc" aria-label="Auf dieser Seite">
          <p class="toc-kicker">Lektion · {summary.estimatedMinutes} Min.</p>
          <div class="toc-links">
          {prose.toc.map((segment) => (
            <a
              key={segment.anchor!}
              href={`#${segment.anchor!}`}
              class={segment.anchor === activeAnchor ? 'is-active' : undefined}
              aria-current={segment.anchor === activeAnchor ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActiveAnchor(segment.anchor!);
                const smooth = typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                document.getElementById(segment.anchor!)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
              }}
            >{segment.heading}</a>
          ))}
          </div>
        </nav>
      )}
      <article class="lesson-prose" aria-busy={!lesson && !loadError}>
        {loadError && <p role="alert" class="content-error">Lektion konnte nicht geladen werden: {loadError}</p>}
        {!loadError && !lesson && <p role="status">Lektionsinhalt wird geladen.</p>}
        {prose.blocks.map(({ block, segments }, blockIndex) => {
          if (block.type === 'visualization' && block.viz) {
            return <VisualizationBlock key={block.blockId} id={block.visualizationId || block.blockId} spec={block.viz} />;
          }
          if (segments === null) return null;
          return segments.map((segment, index) => {
            const key = `${block.blockId}-${index}`;
            if (!segment.heading) {
              if (blockIndex === prose.firstProse && index === 0) {
                return <div class="lesson-lead" key={key}><MathMarkup html={segment.html} /></div>;
              }
              const kicker = segmentKicker[block.type];
              return <section class="lesson-section" key={key}>{kicker ? <p class="lesson-kicker">{kicker}</p> : null}<MathMarkup html={segment.html} /></section>;
            }
            return <section class="lesson-section" id={segment.anchor!} key={key}><p class="lesson-kicker lesson-kicker-num" aria-hidden="true" /><MathMarkup html={segment.html} /></section>;
          });
        })}
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
      </div>
    </section>
  );
}
