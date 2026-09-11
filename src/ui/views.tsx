import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CatalogData, Competency, EvidenceState, SourceSummary } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { loadSources, loadTools } from '../adapters/content-repository';
import { Button } from './Button';
import { Carousel } from './Carousel';
import { MathMarkup } from './MathMarkup';
import { readThemePreference, saveThemePreference, type ThemePreference } from '../app/theme';

/** Loads a route-scoped content section once per session. null while the
 *  sidecar chunk is in flight — views render an honest loading state. */
/** Loads a route-scoped section once per session. Returns the section, or
 *  null while loading, or 'failed' when the chunk could not be fetched — a
 *  failed dynamic import poisons the module map, so the honest recovery is a
 *  visible error with a reload hint instead of a permanent loading state. */
type SectionState<T> = T | null | 'failed';
function useSection<T>(load: () => Promise<T>): SectionState<T> {
  const [value, setValue] = useState<SectionState<T>>(null);
  useEffect(() => {
    let live = true;
    load()
      .then((section) => { if (live) setValue(section); })
      .catch(() => { if (live) setValue('failed'); });
    return () => { live = false; };
  }, [load]);
  return value;
}

function sectionError(view: string) {
  return <p role="alert" class="content-error">{view} konnten nicht geladen werden. Bitte lade die Seite neu (Abschnittsdatei fehlt oder Verbindung unterbrochen).</p>;
}
import { buildFoundationsDiagnosis } from '../adapters/diagnosis';
import { exportProgressJson, importProgressJson } from '../adapters/progress-admin';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';
import { orderModulesForTrack } from '../../assets/js/domain/module_order.mjs';
import { countLabel, learnerExerciseLabel, minutesLabel, reasonCodeLabel } from './learner-labels';
import { moduleState } from './ProgressView';

const stateLabels = {
  unassessed: 'Noch nicht geprüft',
  learning: 'Im Aufbau',
  demonstrated: 'Nachgewiesen',
  review_due: 'Frische abgelaufen (neuer Nachweis nötig)',
  retained: 'Verzögert bestätigt',
};

const domainLabels: Record<string, string> = {
  mathematics: 'Mathematik',
  programming: 'Python',
  metacognition: 'Lernpraxis',
  'linear-algebra': 'Lineare Algebra',
  data: 'Datenarbeit',
  tooling: 'Werkzeuge',
};

function ModuleCard({ module, step, total, credited, states, trackTitle }: {
  module: CatalogData['learningModules'][number];
  step: number;
  total: number;
  credited: number;
  states: Record<string, EvidenceState>;
  trackTitle?: string;
}) {
  const state = moduleState(module.competencyIds, states);
  const competencyLabel = module.competencyIds.length === 1 ? 'Kompetenz' : 'Kompetenzen';
  const percent = total > 0 ? Math.round((credited / total) * 100) : 0;
  return (
    <a class="module-card-link" href={`#/module/${module.moduleId}`}>
      <span class="module-step" aria-hidden="true">{step}</span>
      <div>
        {trackTitle ? <p class="card-kicker">{trackTitle}</p> : null}
        <strong>{module.title}</strong>
        <p>{module.description}</p>
      </div>
      <span class="module-meta">{module.estimatedMinutes} Min. · {module.competencyIds.length} {competencyLabel} {state ? <span class="tag">{state}</span> : null} <span class={credited > 0 ? 'tag tag-progress' : 'tag'} style={credited > 0 ? { background: `linear-gradient(90deg, var(--accent-soft) ${percent}%, transparent ${percent}%)` } : undefined}>{credited > 0 ? `${credited} von ${countLabel(total, 'Aufgabe', 'Aufgaben')}` : countLabel(total, 'Aufgabe', 'Aufgaben')}</span></span>
    </a>
  );
}

const historyKindLabels: Record<string, string> = { module: 'Modul', lesson: 'Lektion', attempt: 'Aufgabe' };

export function LearnView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const [query, setQuery] = useState('');
  const [restFilter, setRestFilter] = useState<string | null>(null);
  const track = catalog.tracks.find((item) => item.trackId === progress.trackId) ?? catalog.tracks[0];
  const modules = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('de');
    const matching = (catalog.learningModules || []).filter((module) => {
      const searchable = `${module.title} ${module.description}`.toLocaleLowerCase('de');
      return !needle || searchable.includes(needle);
    });
    return track ? orderModulesForTrack(matching, track) : matching;
  }, [catalog.learningModules, query, track]);
  const exerciseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const module of catalog.learningModules || []) {
      counts.set(module.moduleId, catalog.exercises.filter((exercise) => exercise.competencyIds.some((id) => module.competencyIds.includes(id))).length);
    }
    return counts;
  }, [catalog.exercises, catalog.learningModules]);
  const creditedCounts = useMemo(() => {
    const credited = new Set(progress.creditedDefinitions);
    const counts = new Map<string, number>();
    for (const module of catalog.learningModules || []) {
      counts.set(module.moduleId, catalog.exercises.filter((exercise) => credited.has(exercise.definitionId) && exercise.competencyIds.some((id) => module.competencyIds.includes(id))).length);
    }
    return counts;
  }, [catalog.exercises, catalog.learningModules, progress.creditedDefinitions]);
  const trackFacts = useMemo(() => {
    const inTrack = (catalog.learningModules || []).filter((module) => track && module.trackIds.includes(track.trackId));
    const minutes = inTrack.reduce((total, module) => total + module.estimatedMinutes, 0);
    return { count: inTrack.length, minutes };
  }, [catalog.learningModules, track]);
  const restModules = useMemo(() => {
    const rest = catalog.tracks.filter((item) => item.trackId !== track?.trackId
      && (restFilter === null || item.trackId === restFilter));
    return rest.flatMap((restTrack) => orderModulesForTrack(catalog.learningModules || [], restTrack)
      .map((module, index) => ({ module, track: restTrack, step: index + 1 })));
  }, [catalog.learningModules, catalog.tracks, track, restFilter]);
  const restFacts = useMemo(() => {
    const unique = new Map(restModules.map((entry) => [entry.module.moduleId, entry.module]));
    const modules = [...unique.values()];
    return { count: modules.length, minutes: modules.reduce((total, module) => total + module.estimatedMinutes, 0) };
  }, [restModules]);
  const historyCards = useMemo(() => {
    const modulesById = new Map((catalog.learningModules || []).map((module) => [module.moduleId, module]));
    const lessonsById = new Map(catalog.lessons.map((lesson) => [lesson.lessonId, lesson]));
    const exercisesById = new Map(catalog.exercises.map((exercise) => [exercise.definitionId, exercise]));
    return progress.history.flatMap((entry) => {
      if (entry.kind === 'module') {
        const module = modulesById.get(entry.id);
        return module ? [{ kind: 'module', title: module.title, href: `#/module/${module.moduleId}`, key: `module:${entry.id}` }] : [];
      }
      if (entry.kind === 'lesson') {
        const lesson = lessonsById.get(entry.id);
        return lesson ? [{ kind: 'lesson', title: lesson.title, href: `#/lesson/${lesson.lessonId}`, key: `lesson:${entry.id}` }] : [];
      }
      const exercise = exercisesById.get(entry.id);
      return exercise ? [{ kind: 'attempt', title: learnerExerciseLabel(exercise), href: routeForDefinition(exercise), key: `attempt:${entry.id}` }] : [];
    });
  }, [catalog, progress.history]);
  return (
    <section class="view learn-view" aria-labelledby="learn-title">
      <header class="view-header split-header">
        <h1 id="learn-title" tabIndex={-1}>{track ? <>Dein Lernpfad: <span class="track-name-accent">{track.title}</span></> : 'Lernpfade'}</h1>
        <label class="search-field omni-search">
          <span class="visually-hidden">Module suchen</span>
          <input
            type="search"
            placeholder="Module suchen …"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </header>
      <section class="activity-section learn-rail" aria-labelledby="learn-module-title" data-tour="learn-rail">
        {modules.length > 0 ? (
          <>
          <h2 class="visually-hidden" id="learn-module-title">Module in diesem Pfad</h2>
          <Carousel label="Module in diesem Pfad" arrows fades prevLabel="Vorherige Module" nextLabel="Weitere Module">
            {modules.map((module, index) => (
              <ModuleCard module={module} step={index + 1} total={exerciseCounts.get(module.moduleId) ?? 0} credited={creditedCounts.get(module.moduleId) ?? 0} states={progress.evidenceStates} key={module.moduleId} />
            ))}
          </Carousel>
          </>
        ) : <div class="empty-state"><h2 id="learn-module-title">Kein passendes Modul</h2><p>Ändere den Suchbegriff oder wähle einen anderen Lernpfad.</p></div>}
      </section>
      {track ? (
        <div class="track-below">
          <p>{track.description}</p>
          <span>{trackFacts.count} {trackFacts.count === 1 ? 'Modul' : 'Module'} · {minutesLabel(trackFacts.minutes)} · {track.competencyIds.length} Kompetenzen</span>
        </div>
      ) : null}
      <section class="activity-section learn-history" aria-labelledby="learn-history-title">
        <div class="section-heading">
          <div><h2 id="learn-history-title">Zuletzt geöffnet</h2></div>
          <span>{historyCards.length} {historyCards.length === 1 ? 'Eintrag' : 'Einträge'}</span>
        </div>
        {historyCards.length > 0 ? (
          <Carousel label="Zuletzt geöffnet" arrows fades prevLabel="Ältere Einträge" nextLabel="Neuere Einträge">
            {historyCards.map((card) => (
              <a class="history-card" href={card.href} key={card.key}>
                <p class="card-kicker">{historyKindLabels[card.kind]}</p>
                <strong>{card.title}</strong>
              </a>
            ))}
          </Carousel>
        ) : <div class="empty-state"><h2>Noch keine Geschichte</h2><p>Sobald du Module, Lektionen oder Aufgaben öffnest, erscheinen sie hier.</p></div>}
      </section>
      <section class="activity-section learn-rest" aria-labelledby="learn-rest-title">
        <div class="learn-rest-head">
          <div>
            <h2 id="learn-rest-title">Erkunde die restlichen Lernpfade</h2>
          </div>
          <div class="track-strip" role="group" aria-label="Andere Lernpfade" data-tour="learn-tracks">
            {catalog.tracks.filter((item) => item.trackId !== track?.trackId).map((item) => (
              <button
                type="button"
                class={item.trackId === restFilter ? 'track-chip active' : 'track-chip'}
                aria-pressed={item.trackId === restFilter}
                onClick={() => setRestFilter((current) => current === item.trackId ? null : item.trackId)}
                key={item.trackId}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
        <Carousel label="Module der restlichen Lernpfade" arrows fades prevLabel="Vorherige Module" nextLabel="Weitere Module">
          {restModules.map(({ module, track: restTrack, step }) => (
            <ModuleCard module={module} step={step} total={exerciseCounts.get(module.moduleId) ?? 0} credited={creditedCounts.get(module.moduleId) ?? 0} states={progress.evidenceStates} trackTitle={restFilter ? undefined : restTrack.title} key={`${restTrack.trackId}:${module.moduleId}`} />
          ))}
        </Carousel>
        <div class="track-below">
          <span>{restFacts.count} {restFacts.count === 1 ? 'Modul' : 'Module'} · {minutesLabel(restFacts.minutes)}</span>
        </div>
      </section>
    </section>
  );
}

export function CompetencyView({ catalog, progress, competencyId }: {
  catalog: CatalogData;
  progress: ProgressSnapshot;
  competencyId: string;
}) {
  const competency = catalog.competencies.find((item) => item.competencyId === competencyId);
  if (!competency) return <PlaceholderView title="Kompetenz nicht gefunden" />;
  const byId = new Map(catalog.competencies.map((item) => [item.competencyId, item]));
  const exercises = catalog.exercises.filter((exercise) => exercise.competencyIds.includes(competencyId));
  const lessons = catalog.lessons.filter((lesson) => lesson.competencyIds.includes(competencyId));
  const modules = (catalog.learningModules || []).filter((module) => module.competencyIds.includes(competencyId));
  const state = progress.evidenceStates[competencyId] ?? 'unassessed';
  return (
    <section class="view" aria-labelledby="competency-title">
      <header class="view-header">
        <p class="eyebrow">{domainLabels[competency.domain] ?? competency.domain}</p>
        <h1 id="competency-title" tabIndex={-1}>{competency.title}</h1>
        <p class="lede">{competency.description}</p>
      </header>
      <div class="competency-detail-grid">
        <article class="status-card"><p class="card-kicker">Aktueller Zustand</p><h2>{stateLabels[state]}</h2><p>Dieser Zustand wird aus unabhängigen Versuchen, Hilfen und Aktualität abgeleitet.{progress.evidenceDueAt[competencyId] ? ` Kompetenz-Frische ${state === 'review_due' ? 'abgelaufen seit' : 'gültig bis'} ${new Date(String(progress.evidenceDueAt[competencyId])).toLocaleDateString('de-DE')}.` : ''}</p></article>
        <article class="status-card"><p class="card-kicker">Evidence-Policy</p><h2>{competency.evidencePolicy.minimumIndependentHits} Treffer</h2><p>{competency.evidencePolicy.minimumDistinctDefinitions} verschiedene Aufgabenfamilien{competency.evidencePolicy.delayedHitRequired ? ', davon ein verzögerter Abruf' : ''}. Fällige Aufgaben-Reviews dieser Kompetenz erscheinen in der Review-Ansicht. Kompetenz-Frische und Aufgaben-Review sind zwei getrennte Zeitachsen.</p></article>
      </div>
      {competency.requires.length > 0 && <aside class="prerequisite-panel"><h2>Voraussetzungen</h2><ul>{competency.requires.map((id) => <li key={id}><a href={`#/competency/${id}`}>{byId.get(id)?.title ?? id}</a><span>{stateLabels[progress.evidenceStates[id] ?? 'unassessed']}</span></li>)}</ul></aside>}
      {modules.length > 0 && <section class="activity-section" aria-labelledby="module-list-title"><div class="section-heading"><div><h2 id="module-list-title">Module in diesem Pfad</h2></div><span>{modules.length}</span></div><div class="lesson-list">{modules.map((module) => <a href={`#/module/${module.moduleId}`} key={module.moduleId}><span>{module.estimatedMinutes} Min.</span><strong>{module.title}</strong><p>{module.description}</p></a>)}</div></section>}
      {lessons.length > 0 && <section class="activity-section" aria-labelledby="lesson-list-title"><div class="section-heading"><div><h2 id="lesson-list-title">Lektionen</h2></div><span>{lessons.length} verfügbar</span></div><div class="lesson-list">{lessons.map((lesson) => <a href={`#/lesson/${lesson.lessonId}`} key={lesson.lessonId}><span>{lesson.estimatedMinutes} Min.</span><strong>{lesson.title}</strong><p>{lesson.objectives[0]}</p></a>)}</div></section>}
      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading"><div><p class="eyebrow">Üben und nachweisen</p><h2 id="activity-title">Aufgaben</h2></div><span>{exercises.length} verfügbar</span></div>
        {exercises.length > 0
          ? <div class="activity-list">{exercises.map((exercise) => <article class="activity-card" key={exercise.definitionId}><div><p class="card-kicker">{exercise.estimatedMinutes} Min.</p><h3>{learnerExerciseLabel(exercise)}</h3><p>{exercise.title ? <MathMarkup inline html={exercise.title} /> : (exercise.masteryEligible ? 'Kann als Kompetenzbeleg zählen.' : 'Diagnose oder Reflexion ohne Kompetenzbeleg.')}</p></div><Button href={routeForDefinition(exercise)}>{exercise.activityType === 'python-code' ? 'Im Codeworkspace öffnen' : 'Aufgabe öffnen'}</Button></article>)}</div>
          : <div class="empty-state"><h2>Noch keine Aufgabenfamilie</h2><p>Diese Lücke bleibt im Foundations-Manifest sichtbar.</p></div>}
      </section>
    </section>
  );
}

export function ToolsView(_: { catalog: CatalogData }) {
  const tools = useSection(loadTools);
  if (tools === 'failed') return <section class="view" aria-labelledby="tools-title"><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1>{sectionError('Werkzeugkarten')}</section>;
  if (!tools) return <section class="view" aria-labelledby="tools-title"><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1><p role="status">Werkzeugkarten werden geladen.</p></section>;
  return <section class="view" aria-labelledby="tools-title"><header class="view-header"><p class="eyebrow">Runtimes, Prüfpfade und Arbeitsweisen</p><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1><p class="lede">Jedes Werkzeug nennt Zweck, Grenzen und Einstieg.</p></header><div class="tool-grid">{tools.map((tool) => <article class="tool-card" key={tool.toolId}><p class="card-kicker">{tool.kind} · {tool.toolId}</p><h2>{tool.title}</h2><p>{tool.summary}</p><h3>Kann</h3><ul>{tool.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>{tool.limitations.length ? <><h3>Grenzen</h3><ul>{tool.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></> : null}<div class="actions">{tool.routes.map((route) => <Button key={route.href} href={route.href} target={route.type === 'external' ? '_blank' : undefined} rel={route.type === 'external' ? 'noreferrer' : undefined}>{route.label}</Button>)}</div></article>)}</div></section>;
}

function SourceModuleUsage({ modules }: { modules: SourceSummary['usedInModules'] }) {
  if (!modules.length) return <>Referenzkatalog</>;
  return (
    <>
      {modules.map((module, index) => (
        <span key={module.moduleId}>
          {index > 0 ? ', ' : null}
          <a class="text-link" href={`#/module/${module.moduleId}`}>{module.title}</a>
        </span>
      ))}
    </>
  );
}

function SourceCard({ source }: { source: SourceSummary }) {
  const external = /^https?:\/\//.test(source.canonicalUrl);
  return (
    <article class="source-card" id={`source-${source.sourceId}`}>
      <p class="card-kicker">{source.contentClass} · {source.sourceId}</p>
      <h2>{source.title}</h2>
      <p>{source.author}</p>
      <dl>
        <div><dt>Lizenz</dt><dd>{source.license}</dd></div>
        <div><dt>Verwendet in</dt><dd><SourceModuleUsage modules={source.usedInModules || []} /></dd></div>
      </dl>
      <div class="actions">
        {external ? <Button href={source.canonicalUrl} target="_blank" rel="noreferrer">Originalquelle öffnen</Button> : null}
        {!external ? <span class="muted">Kein Direktlink in diesem Profil</span> : null}
      </div>
    </article>
  );
}

export function SourcesView(_: { catalog: CatalogData }) {
  const sources = useSection(loadSources);
  if (sources === 'failed') return <section class="view" aria-labelledby="sources-title"><h1 id="sources-title" tabIndex={-1}>Lektüren</h1>{sectionError('Quellen')}</section>;
  if (!sources) return <section class="view" aria-labelledby="sources-title"><h1 id="sources-title" tabIndex={-1}>Lektüren</h1><p role="status">Quellen werden geladen.</p></section>;
  return (
    <section class="view" aria-labelledby="sources-title">
      <header class="view-header split-header">
        <div>
          <p class="eyebrow">Quellen und Referenzen</p>
          <h1 id="sources-title" tabIndex={-1}>Lektüren</h1>
          <p class="lede">Öffentliche Quellen begleiten die Lektionen.</p>
        </div>
        <Button href="#/learn">Zum Kompetenzkatalog</Button>
      </header>
      <div class="source-grid">{sources.map((source) => <SourceCard source={source} key={source.sourceId} />)}</div>
    </section>
  );
}

export function DiagnosticView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const recommendations = buildFoundationsDiagnosis(catalog, progress).slice(0, 4);
  const labels = new Map(catalog.competencies.map((item) => [item.competencyId, item]));
  const typeLabels = { review: 'Kompetenz-Frische fällig', lesson: 'Kompetenz stärken', diagnostic: 'Evidence fehlt' };
  const firstAnchor = catalog.exercises.find((exercise) => exercise.definitionId === 'transform-linear-equation-isolate:two-step-fixed-instance');
  return (
    <section class="view" aria-labelledby="diagnostic-title">
      <header class="view-header"><p class="eyebrow">Standortbestimmung</p><h1 id="diagnostic-title" tabIndex={-1}>Diagnose</h1><p class="lede">Die Priorität folgt deinem lokalen Kompetenzzustand. Alle {catalog.competencies.length} Kompetenzen bleiben frei zugänglich.</p></header>
      {recommendations.length > 0
        ? <div class="diagnostic-grid">{recommendations.map((recommendation, index) => { const competency = labels.get(recommendation.competencyId); return <article class="diagnostic-card" key={recommendation.competencyId}><span>{String(index + 1).padStart(2, '0')} · {typeLabels[recommendation.type]}</span><h2>{competency?.title ?? recommendation.competencyId}</h2><p>{competency?.description}</p><small>{recommendation.reasonCodes.map(reasonCodeLabel).join(' · ')}</small><a href={`#/competency/${recommendation.competencyId}`}>Bereich ansehen</a></article>; })}</div>
        : <div class="empty-state"><h2>Foundations aktuell belegt</h2><p>Öffne Review für fällige Abrufe oder wähle frei den nächsten Lernpfad.</p></div>}
      <aside class="reason-panel"><p class="eyebrow">Auswertung</p><h2>Jede Empfehlung bleibt erklärbar</h2><p>Reason-Codes unterscheiden fehlende Evidence, schwache Kompetenz, fälligen Review und aktuellen Nachweis. Selbsteinschätzung allein öffnet oder schließt kein Gate.</p><Button variant="primary" href={firstAnchor ? routeForDefinition(firstAnchor) : '#/learn'}>Ersten Algebra-Anker ausführen</Button></aside>
    </section>
  );
}

export function ReviewView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const byId = new Map(catalog.exercises.map((exercise) => [exercise.definitionId, exercise]));
  const { executable, archived } = partitionReviewQueue(progress.dueReviews, byId.keys());
  return (
    <section class="view" aria-labelledby="review-title" data-tour="review-view">
      <header class="view-header"><p class="eyebrow">Abruf statt Wiederlesen</p><h1 id="review-title" tabIndex={-1}>Review</h1><p class="lede">Fällige Abrufe aus allen Kompetenzen an einem Ort.</p></header>
      {progress.dueReviews.length === 0
        ? <div class="empty-state"><h2>Keine Aufgaben-Reviews fällig</h2><p>Nach einem Treffer plant die Plattform den nächsten Abruf.</p><Button href="#/learn">Inhalte erkunden</Button></div>
        : <>
          <div class="competency-summary" aria-live="polite">
            <strong>{executable.length}</strong>
            <span>fällig</span>
            {archived.length > 0 && <>
              <span class="summary-separator" aria-hidden="true" />
              <strong>{archived.length}</strong>
              <span>archiviert</span>
            </>}
          </div>
          <div class="review-list" data-tour="review-queue">
            {executable.map((review) => {
              const definition = byId.get(review.exerciseId);
              if (!definition) return null; // unreachable after the partition; keeps the type narrowing honest
              const route = routeForDefinition(definition);
              const freshRoute = definition.familyId && definition.seeded
                ? `#/family/${definition.familyId}/-/-/${definition.difficulty ?? 'core'}`
                : route;
              return <article class="review-card" key={review.exerciseId}><div><h2>{learnerExerciseLabel(definition)}</h2><p>fällig seit {new Date(review.nextDueAt).toLocaleDateString('de-DE')}{freshRoute !== route ? ' · öffnet eine frische Instanz' : ''}</p></div><Button variant="primary" href={freshRoute}>Wiederholen</Button></article>;
            })}
            {archived.map((review) => (
              <article class="review-card" key={review.exerciseId}>
                <div>
                  <h2>{review.exerciseId}</h2>
                  <p>Nicht mehr verfügbar. Der Verlauf bleibt erhalten. Die Aufgabenfamilie wurde aus dem Katalog entfernt; Versuche, Belege und Review-Termine bleiben lokal gespeichert.</p>
                </div>
              </article>
            ))}
          </div>
        </>}
    </section>
  );
}

export function SettingsView({ catalog, progress, onSave, onRestartTour }: {
  catalog: CatalogData;
  progress: ProgressSnapshot;
  onSave: (weeklyMinutes: number, trackId: string, reviewSlotsWeeks: number[]) => Promise<void>;
  onRestartTour: () => void;
}) {
  const [status, setStatus] = useState('');
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference);
  const importInput = useRef<HTMLInputElement>(null);
  const downloadProgress = async () => {
    const blob = new Blob([await exportProgressJson()], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'argmin-fortschritt.json';
    link.click();
    URL.revokeObjectURL(href);
    setStatus('Export erstellt.');
  };
  const importProgress = async (file: File | undefined) => {
    if (!file || !window.confirm('Importieren? Der aktuelle lokale Fortschritt wird vollständig durch die geprüfte Datei ersetzt.')) return;
    try {
      await importProgressJson(await file.text());
      setStatus('Import abgeschlossen.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const chooseTheme = (preference: ThemePreference) => {
    setThemePreference(preference);
    saveThemePreference(preference);
  };
  return (
    <section class="view" aria-labelledby="settings-title">
      <header class="view-header"><p class="eyebrow">Lokal</p><h1 id="settings-title" tabIndex={-1}>Einstellungen</h1><p class="lede">Pfad, Zeitbudget und Darstellung bleiben unter deiner Kontrolle.</p></header>
      <section class="settings-panel" aria-labelledby="theme-title">
        <div><p class="card-kicker">Darstellung</p><h2 id="theme-title">Farbschema</h2><p>Wähle, ob die Oberfläche dem System folgt oder hell beziehungsweise dunkel bleibt.</p></div>
        <div class="segmented" role="radiogroup" aria-label="Farbschema">
          {([['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']] as const).map(([value, label]) => (
            <button type="button" role="radio" aria-checked={themePreference === value} class={themePreference === value ? 'is-active' : undefined} onClick={() => chooseTheme(value)}>{label}</button>
          ))}
        </div>
      </section>
      <form class="settings-panel" data-tour="settings-form" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const slots = String(data.get('reviewSlots')).split(/[;,\s]+/).filter(Boolean).map(Number);
        await onSave(Number(data.get('weeklyMinutes')), String(data.get('trackId')), slots);
        setStatus('Lokal gespeichert.');
      }}>
        <label><span>Wochenbudget in Minuten</span><input name="weeklyMinutes" type="number" min={30} max={2400} step={15} defaultValue={progress.weeklyMinutes} /></label>
        <label><span>Primärer Lernpfad</span><select name="trackId" defaultValue={progress.trackId}>{catalog.tracks.map((track) => <option value={track.trackId} key={track.trackId}>{track.title}</option>)}</select></label>
        <label><span>Reviewabstände in Wochen</span><input name="reviewSlots" type="text" inputMode="numeric" defaultValue={progress.reviewSlotsWeeks.join(', ')} aria-describedby="review-slots-note" /></label>
        <p id="review-slots-note" class="privacy-note">Aufsteigend, zum Beispiel 2, 5, 11. Das sind lokale Planungsheuristiken. Die kompetenzspezifische Evidence-Frische bleibt ein getrennt sichtbarer Status.</p>
        <p class="privacy-note">Fortschritt bleibt standardmäßig in diesem Browser. Es werden keine API-Schlüssel oder Telemetriedaten gespeichert.</p>
        <Button variant="primary" type="submit">Lokal speichern</Button>
        <p class="save-status" role="status">{status}</p>
      </form>
      <section class="settings-panel" aria-labelledby="tour-settings-title">
        <div><p class="card-kicker">Orientierung</p><h2 id="tour-settings-title">Rundgang</h2><p>Die kurze Tour zeigt, wo was liegt.</p></div>
        <div class="actions"><Button variant="secondary" type="button" onClick={onRestartTour}>Rundgang erneut starten</Button></div>
      </section>
      <section class="settings-panel" aria-labelledby="transfer-title"><div><p class="card-kicker">Portable lokale Daten</p><h2 id="transfer-title">Fortschritt exportieren oder importieren</h2><p>Der Export enthält das versionierte Schema. Ein Import wird vor jeder Schreibtransaktion vollständig validiert und ersetzt Daten erst nach deiner Bestätigung.</p></div><div class="actions"><Button variant="secondary" type="button" onClick={() => void downloadProgress()}>JSON exportieren</Button><Button variant="secondary" type="button" onClick={() => importInput.current?.click()}>JSON importieren</Button><input ref={importInput} id="progress-import" type="file" aria-label="JSON importieren" accept="application/json,.json" onChange={(event) => { void importProgress(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></div></section>
    </section>
  );
}

export function PlaceholderView({ title }: { title: string }) {
  return <section class="view"><header class="view-header"><p class="eyebrow">Verlaufen?</p><h1 tabIndex={-1}>{title}</h1><p class="lede">Diese Adresse gibt es hier nicht.</p></header><Button href="#/learn">Zur Kompetenzkarte</Button></section>;
}
