import { useEffect, useMemo, useState } from 'preact/hooks';
import type { CatalogData, Competency, EvidenceState, SourceSummary } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { loadReviews, loadSources, loadTools } from '../adapters/content-repository';

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
  return <p role="alert" class="content-error">{view} konnten nicht geladen werden — bitte die Seite neu laden (Abschnittsdatei fehlt oder Verbindung unterbrochen).</p>;
}
import { buildFoundationsDiagnosis } from '../adapters/diagnosis';
import { buildWeeklyLearningPlan } from '../adapters/learning-plan';
import { exportProgressJson, importProgressJson } from '../adapters/progress-admin';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';

const minutesLabel = (minutes: number) => minutes >= 60
  ? `${Math.round(minutes / 60)} Std.`
  : `${minutes} Min.`;

export function TodayView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const foundation = catalog.milestones.find((item) => item.milestoneId === 'ms-foundations');
  const foundationStates = (foundation?.competencyIds || []).map((id) => progress.evidenceStates[id]);
  const foundationEvidence = foundationStates.filter((state) => state === 'demonstrated' || state === 'retained').length;
  const foundationPercent = foundationStates.length ? Math.round(foundationEvidence / foundationStates.length * 100) : 0;
  const plan = useMemo(() => buildWeeklyLearningPlan(catalog, progress), [catalog, progress]);
  const exerciseById = new Map(catalog.exercises.map((exercise) => [exercise.definitionId, exercise]));
  const { executable: executableReviews, archived: archivedReviews } = partitionReviewQueue(progress.dueReviews, exerciseById.keys());
  return (
    <section class="view" aria-labelledby="today-title">
      <header class="view-header">
        <p class="eyebrow">Dein Lernfenster</p>
        <h1 id="today-title" tabIndex={-1}>Heute</h1>
        <p class="lede">Eine klare nächste Handlung. Der gesamte Kurs bleibt frei zugänglich.</p>
      </header>
      <div class="today-grid">
        <article class="primary-card">
          <div>
            <p class="card-kicker">Empfohlen</p>
            <h2>Standort bestimmen</h2>
            <p>Starte mit kurzen Algebra- und Python-Ankern. Danach erklärt die Plattform jede Empfehlung.</p>
          </div>
          <div class="primary-card-footer">
            <span class="time-chip">15 bis 20 Min.</span>
            <a class="button button-primary" href="#/diagnostic">Diagnose starten</a>
          </div>
        </article>
        <article class="status-card">
          <p class="card-kicker">Wiederholen</p>
          <h2>{executableReviews.length || archivedReviews.length
            ? `${executableReviews.length} fällig${archivedReviews.length ? ` · ${archivedReviews.length} archiviert` : ''}`
            : 'Noch nichts fällig'}</h2>
          <p>{executableReviews.length
            ? `Als Nächstes: ${executableReviews.slice(0, 3).map((item) => item.exerciseId).join(', ')}.`
            : archivedReviews.length
              ? 'Alle fälligen Reviews betreffen entfernte Aufgaben. Nicht mehr verfügbar – Verlauf bleibt erhalten.'
              : 'Fällige Aufgaben-Reviews erscheinen hier; Aufgaben mit Variantengenerator öffnen dann eine frische Instanz.'}</p>
          <a class="text-link" href="#/review">Review-Queue öffnen</a>
        </article>
        <article class="status-card">
          <p class="card-kicker">Aktueller Milestone</p>
          <h2>{foundation?.title ?? 'Foundations'}</h2>
          <p>{foundation?.description}</p>
          <div class="meter" aria-label={`Foundations: ${foundationPercent} Prozent belegt`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={foundationPercent} role="meter">
            <span style={{ width: `${foundationPercent}%` }} />
          </div>
          <p class="meter-label">{foundationEvidence} von {foundationStates.length} Kompetenzen mit aktuellem Beleg.</p>
          <a class="text-link" href="#/project/p-foundations-data-checker">CLI-Projekt öffnen</a>
        </article>
        <article class="status-card compact-card">
          <p class="card-kicker">Wochenbudget</p>
          <p class="budget-number">{progress.weeklyMinutes} <span>Min.</span></p>
          <p>Das Budget ist editierbar. 600 Minuten sind keine Pflicht.</p>
          <a class="text-link" href="#/settings">Budget anpassen</a>
        </article>
      </div>
      <section class="weekly-plan" aria-labelledby="weekly-plan-title"><div class="section-heading"><div><p class="eyebrow">Deterministischer Vorschlag</p><h2 id="weekly-plan-title">Dein Wochenplan</h2></div><span>{plan.totalMinutes} von {plan.availableMinutes} Min. verplant</span></div><p class="plan-policy">Bis zu 35 Prozent des Budgets sind für fällige Reviews reserviert. Diese Quote und die Reviewintervalle sind konfigurierbare Produktheuristiken, keine optimalen Lernkonstanten.</p>{plan.days.some((day) => day.items.length) ? <div class="plan-days">{plan.days.filter((day) => day.items.length).map((day) => <article class="plan-day" key={day.day}><p class="card-kicker">Tag {day.day} · {day.minutes} Min.</p><ol>{day.items.map((item) => <li key={item.activityId}><a href={item.route}><strong>{item.title}</strong><span>{item.estimatedMinutes} Min. · {item.reasonCodes.includes('review-due') ? 'fälliger Review' : item.reasonCodes.includes('strengthen-competency') ? 'Kompetenz stärken' : 'Kompetenz aufbauen'}</span></a></li>)}</ol></article>)}</div> : <div class="empty-state"><h3>Kein Plan im aktuellen Budget</h3><p>Erhöhe das Wochenbudget oder wähle den nächsten Bereich frei im Katalog.</p></div>}</section>
      <aside class="reason-panel" aria-labelledby="reason-title">
        <p class="eyebrow">Warum dieser Start?</p>
        <h2 id="reason-title">Erst messen, dann empfehlen</h2>
        <ol>
          <li>Kurze Aufgaben liefern belastbarere Hinweise als Selbsteinschätzung allein.</li>
          <li>Fehlende Voraussetzungen werden vor neuen Themen sichtbar.</li>
          <li>Du kannst jede Empfehlung überspringen und direkt lernen.</li>
        </ol>
      </aside>
    </section>
  );
}

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

function CompetencyCard({ competency, all, state }: { competency: Competency; all: Map<string, Competency>; state: EvidenceState }) {
  return (
    <article class="competency-card">
      <div class="competency-meta">
        <span>{domainLabels[competency.domain] ?? competency.domain}</span>
        <span>{minutesLabel(competency.estimatedMinutes)}</span>
      </div>
      <h3>{competency.title}</h3>
      <p>{competency.description}</p>
      <div class="prerequisites">
        <span class={`state-dot state-${state}`} aria-hidden="true" />
        <span>{stateLabels[state]}</span>
      </div>
      {competency.requires.length > 0 && (
        <p class="requires">Voraussetzung: {competency.requires.map((id) => all.get(id)?.title ?? id).join(', ')}</p>
      )}
      <a class="card-link" href={`#/competency/${competency.competencyId}`} aria-label={`${competency.title} öffnen`}>Öffnen</a>
    </article>
  );
}

export function LearnView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const [activeTrack, setActiveTrack] = useState(progress.trackId);
  const [query, setQuery] = useState('');
  const byId = useMemo(() => new Map(catalog.competencies.map((item) => [item.competencyId, item])), [catalog.competencies]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('de');
    return catalog.competencies.filter((competency) => {
      const inTrack = competency.trackIds.includes(activeTrack);
      const searchable = `${competency.title} ${competency.description} ${domainLabels[competency.domain] ?? competency.domain}`.toLocaleLowerCase('de');
      return inTrack && (!needle || searchable.includes(needle));
    });
  }, [activeTrack, catalog.competencies, query]);
  const modules = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('de');
    return (catalog.learningModules || []).filter((module) => {
      const inTrack = module.trackIds.includes(activeTrack);
      const searchable = `${module.title} ${module.description}`.toLocaleLowerCase('de');
      return inTrack && (!needle || searchable.includes(needle));
    });
  }, [activeTrack, catalog.learningModules, query]);
  return (
    <section class="view" aria-labelledby="learn-title">
      <header class="view-header split-header">
        <div>
          <p class="eyebrow">Kompetenzkarte</p>
          <h1 id="learn-title" tabIndex={-1}>Lernen</h1>
          <p class="lede">Wähle frei oder folge der erklärten Empfehlung.</p>
        </div>
        <label class="search-field">
          <span>Kompetenzen suchen</span>
          <input
            type="search"
            placeholder="Python, Algebra, NumPy"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </header>
      <div class="track-strip" aria-label="Lernpfade">
        {catalog.tracks.map((track) => (
          <button
            type="button"
            class={track.trackId === activeTrack ? 'track-chip active' : 'track-chip'}
            aria-pressed={track.trackId === activeTrack}
            onClick={() => setActiveTrack(track.trackId)}
            key={track.trackId}
          >
            {track.title}
          </button>
        ))}
      </div>
      <nav class="catalog-links" aria-label="Weitere Katalogansichten"><a href="#/sources">Öffentliche Lektüren</a><a href="#/tools">Werkzeuge</a><a href="#/quality">Qualitätsreviews</a></nav>
      <div class="competency-summary" aria-live="polite">
        <strong>{visible.length}</strong>
        <span>sichtbare Kompetenzknoten</span>
        <span class="summary-separator" aria-hidden="true" />
        <strong>{catalog.milestones.length}</strong>
        <span>Milestones</span>
        <span class="summary-separator" aria-hidden="true" />
        <strong>{modules.length}</strong>
        <span>Module</span>
      </div>
      {modules.length > 0 && <section class="activity-section" aria-labelledby="learn-module-title"><div class="section-heading"><div><p class="eyebrow">LearningModule</p><h2 id="learn-module-title">Module in diesem Pfad</h2></div><span>{modules.length}</span></div><div class="lesson-list">{modules.map((module) => <a href={`#/module/${module.moduleId}`} key={module.moduleId}><span>{module.estimatedMinutes} Min.</span><strong>{module.title}</strong><p>{module.description}</p></a>)}</div></section>}
      {visible.length > 0
        ? <div class="competency-grid">{visible.map((competency) => <CompetencyCard competency={competency} all={byId} state={progress.evidenceStates[competency.competencyId] ?? 'unassessed'} key={competency.competencyId} />)}</div>
        : <div class="empty-state"><h2>Keine passende Kompetenz</h2><p>Ändere den Suchbegriff oder wähle einen anderen Lernpfad.</p></div>}
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
        <article class="status-card"><p class="card-kicker">Evidence-Policy</p><h2>{competency.evidencePolicy.minimumIndependentHits} Treffer</h2><p>{competency.evidencePolicy.minimumDistinctDefinitions} verschiedene Aufgabenfamilien{competency.evidencePolicy.delayedHitRequired ? ', davon ein verzögerter Abruf' : ''}. Fällige Aufgaben-Reviews dieser Kompetenz erscheinen in der Review-Ansicht — Kompetenz-Frische und Aufgaben-Review sind zwei getrennte Zeitachsen.</p></article>
      </div>
      {competency.requires.length > 0 && <aside class="prerequisite-panel"><h2>Voraussetzungen</h2><ul>{competency.requires.map((id) => <li key={id}><a href={`#/competency/${id}`}>{byId.get(id)?.title ?? id}</a><span>{stateLabels[progress.evidenceStates[id] ?? 'unassessed']}</span></li>)}</ul></aside>}
      {modules.length > 0 && <section class="activity-section" aria-labelledby="module-list-title"><div class="section-heading"><div><p class="eyebrow">Geordnete Komposition</p><h2 id="module-list-title">LearningModule</h2></div><span>{modules.length}</span></div><div class="lesson-list">{modules.map((module) => <a href={`#/module/${module.moduleId}`} key={module.moduleId}><span>{module.estimatedMinutes} Min.</span><strong>{module.title}</strong><p>{module.description}</p></a>)}</div></section>}
      {lessons.length > 0 && <section class="activity-section" aria-labelledby="lesson-list-title"><div class="section-heading"><div><p class="eyebrow">Verstehen und vormachen</p><h2 id="lesson-list-title">Lektionen</h2></div><span>{lessons.length} verfügbar</span></div><div class="lesson-list">{lessons.map((lesson) => <a href={`#/lesson/${lesson.lessonId}`} key={lesson.lessonId}><span>{lesson.estimatedMinutes} Min.</span><strong>{lesson.title}</strong><p>{lesson.objectives[0]}</p></a>)}</div></section>}
      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading"><div><p class="eyebrow">Üben und nachweisen</p><h2 id="activity-title">Aufgaben</h2></div><span>{exercises.length} verfügbar</span></div>
        {exercises.length > 0
          ? <div class="activity-list">{exercises.map((exercise) => <article class="activity-card" key={exercise.definitionId}><div><p class="card-kicker">{exercise.activityType} · {exercise.estimatedMinutes} Min.</p><h3>{exercise.prompt}</h3><p>{exercise.masteryEligible ? 'Kann als Kompetenzbeleg zählen.' : 'Diagnose oder Reflexion ohne Kompetenzbeleg.'}</p></div><a class="button button-secondary" href={routeForDefinition(exercise)}>{exercise.activityType === 'python-code' ? 'Im Codeworkspace öffnen' : 'Aufgabe öffnen'}</a></article>)}</div>
          : <div class="empty-state"><h2>Noch keine Aufgabenfamilie</h2><p>Diese Lücke bleibt im Foundations-Manifest sichtbar.</p></div>}
      </section>
    </section>
  );
}

export function ReviewFindingsView(_: { catalog: CatalogData }) {
  const reviews = useSection(loadReviews);
  if (reviews === 'failed') return <section class="view" aria-labelledby="reviews-title"><h1 id="reviews-title" tabIndex={-1}>Reviews</h1>{sectionError('Review-Befunde')}</section>;
  if (!reviews) return <section class="view" aria-labelledby="reviews-title"><h1 id="reviews-title" tabIndex={-1}>Reviews</h1><p role="status">Review-Befunde werden geladen.</p></section>;
  const blocked = reviews.filter((review) => review.status === 'blocked').length;
  const human = reviews.flatMap((review) => review.findings).filter((finding) => finding.humanReviewRequired).length;
  return <section class="view" aria-labelledby="reviews-title"><header class="view-header"><p class="eyebrow">Reproduzierbarer Qualitätsstand</p><h1 id="reviews-title" tabIndex={-1}>Reviews</h1><p class="lede">Die Fach- und Methodikreviews sind Befunde, keine automatische Freigabe. Evidenzpfade, Unsicherheit und Umsetzungsstatus bleiben sichtbar.</p></header><div class="stat-grid"><article><strong>{reviews.length}</strong><span>Reviews</span></article><article><strong>{blocked}</strong><span>blockierte Ausbauphasen</span></article><article><strong>{human}</strong><span>Human-Review-Pflichten</span></article></div><div class="review-findings-list">{reviews.map((review) => <details class="review-finding-card" key={review.reviewId}><summary><span><small>{review.status}</small><strong>{review.title}</strong></span><span>{review.findings.length} Befunde</span></summary><div class="review-finding-body"><p>{review.summary}</p><p class="muted">Scope: {review.scope}</p>{review.findings.map((finding) => <article class={`finding finding-${finding.severity}`} key={finding.findingId}><div class="finding-meta"><span>{finding.severity}</span><span>{finding.implementationStatus}</span>{finding.humanReviewRequired ? <span>Human Review</span> : null}</div><h2>{finding.findingId}</h2><p><strong>Empfehlung:</strong> {finding.recommendation}</p><p><strong>Umsetzung:</strong> {finding.suggestedImplementation}</p><p><strong>Unsicherheit:</strong> {finding.uncertainty || 'Keine zusätzliche Unsicherheit notiert.'}</p><p><strong>Evidenz:</strong> {finding.evidence.map((path) => <code key={path}>{path}</code>)}</p></article>)}</div></details>)}</div></section>;
}

export function ToolsView(_: { catalog: CatalogData }) {
  const tools = useSection(loadTools);
  if (tools === 'failed') return <section class="view" aria-labelledby="tools-title"><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1>{sectionError('Werkzeugkarten')}</section>;
  if (!tools) return <section class="view" aria-labelledby="tools-title"><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1><p role="status">Werkzeugkarten werden geladen.</p></section>;
  return <section class="view" aria-labelledby="tools-title"><header class="view-header"><p class="eyebrow">Runtimes, Prüfpfade und Arbeitsweisen</p><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1><p class="lede">Jedes Werkzeug hat einen sichtbaren Zweck, Grenzen und einen nativen Einstieg. Externe Repositories bleiben Quellen; sie werden nicht ungeprüft ausgeführt.</p></header><div class="tool-grid">{tools.map((tool) => <article class="tool-card" key={tool.toolId}><p class="card-kicker">{tool.kind} · {tool.toolId}</p><h2>{tool.title}</h2><p>{tool.summary}</p><h3>Kann</h3><ul>{tool.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>{tool.limitations.length ? <><h3>Grenzen</h3><ul>{tool.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></> : null}<div class="tool-actions">{tool.routes.map((route) => <a class="button button-secondary" key={route.href} href={route.href} target={route.type === 'external' ? '_blank' : undefined} rel={route.type === 'external' ? 'noreferrer' : undefined}>{route.label}</a>)}</div></article>)}</div></section>;
}

function sourceWeeksLabel(weeks: unknown) {
  if (Array.isArray(weeks) && weeks.length) return `Woche ${weeks.join(', ')}`;
  return 'Referenzkatalog';
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
        <div><dt>Status</dt><dd>{source.extractionStatus}</dd></div>
        <div><dt>Verwendet in</dt><dd>{sourceWeeksLabel(source.weeks)}</dd></div>
      </dl>
      <div class="source-actions">
        {external ? <a class="button button-secondary" href={source.canonicalUrl} target="_blank" rel="noreferrer">Originalquelle öffnen</a> : null}
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
          <p class="lede">Öffentliche Quellen und Referenzen begleiten die Lektionen. Eine Quelle ist noch keine Lernaktivität; ihre Rolle wird in Lektionen und Modulen ausgewiesen.</p>
        </div>
        <a class="button button-secondary" href="#/learn">Zum Kompetenzkatalog</a>
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
      <header class="view-header"><p class="eyebrow">Formative Standortbestimmung</p><h1 id="diagnostic-title" tabIndex={-1}>Diagnose</h1><p class="lede">Die Priorität folgt deinem lokalen Kompetenzzustand. Alle {catalog.competencies.length} Kompetenzen bleiben frei zugänglich.</p></header>
      {recommendations.length > 0
        ? <div class="diagnostic-grid">{recommendations.map((recommendation, index) => { const competency = labels.get(recommendation.competencyId); return <article class="diagnostic-card" key={recommendation.competencyId}><span>{String(index + 1).padStart(2, '0')} · {typeLabels[recommendation.type]}</span><h2>{competency?.title ?? recommendation.competencyId}</h2><p>{competency?.description}</p><small>{recommendation.reasonCodes.join(' · ')}</small><a href={`#/competency/${recommendation.competencyId}`}>Bereich ansehen</a></article>; })}</div>
        : <div class="empty-state"><h2>Foundations aktuell belegt</h2><p>Öffne Review für fällige Abrufe oder wähle frei den nächsten Lernpfad.</p></div>}
      <aside class="reason-panel"><p class="eyebrow">Auswertung</p><h2>Jede Empfehlung bleibt erklärbar</h2><p>Reason-Codes unterscheiden fehlende Evidence, schwache Kompetenz, fälligen Review und aktuellen Nachweis. Selbsteinschätzung allein öffnet oder schließt kein Gate.</p><a class="button button-primary" href={firstAnchor ? routeForDefinition(firstAnchor) : '#/learn'}>Ersten Algebra-Anker ausführen</a></aside>
    </section>
  );
}

export function ReviewView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const byId = new Map(catalog.exercises.map((exercise) => [exercise.definitionId, exercise]));
  const { executable, archived } = partitionReviewQueue(progress.dueReviews, byId.keys());
  return (
    <section class="view" aria-labelledby="review-title">
      <header class="view-header"><p class="eyebrow">Abruf statt Wiederlesen</p><h1 id="review-title" tabIndex={-1}>Review</h1><p class="lede">Fällige Aufgaben-Reviews aus allen Kompetenzen an einem Ort. Das ist die Aufgabe-Ebene: jede einzelne Aufgabe hat ihren eigenen Fälligkeitstermin aus den Expanding-Slots. Die aggregierte Kompetenz-Frische ist separat im Fortschritt sichtbar.</p></header>
      {progress.dueReviews.length === 0
        ? <div class="empty-state"><h2>Keine Aufgaben-Reviews fällig</h2><p>Nach einem unabhängigen Treffer plant die Plattform den nächsten Abruf. Aufgaben mit Variantengenerator öffnen bei jedem Review eine frische Instanz mit neuen Werten.</p><a class="button button-secondary" href="#/learn">Inhalte erkunden</a></div>
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
          <div class="review-list">
            {executable.map((review) => {
              const definition = byId.get(review.exerciseId);
              if (!definition) return null; // unreachable after the partition; keeps the type narrowing honest
              const route = routeForDefinition(definition);
              const freshRoute = definition.familyId && definition.seeded
                ? `#/family/${definition.familyId}/-/-/${definition.difficulty ?? 'core'}`
                : route;
              return <article class="review-card" key={review.exerciseId}><div><p class="card-kicker">Aufgaben-Review fällig</p><h2>{definition.title ?? review.exerciseId}</h2><p>fällig seit {new Date(review.nextDueAt).toLocaleDateString('de-DE')}{freshRoute !== route ? ' · öffnet eine frische Instanz' : ''}</p></div><a class="button button-primary" href={freshRoute}>Wiederholen</a></article>;
            })}
            {archived.map((review) => (
              <article class="review-card" key={review.exerciseId}>
                <div>
                  <p class="card-kicker">Archivierter Aufgaben-Review</p>
                  <h2>{review.exerciseId}</h2>
                  <p>Nicht mehr verfügbar – Verlauf bleibt erhalten. Die Aufgabenfamilie wurde aus dem Katalog entfernt; Versuche, Belege und Review-Termine bleiben lokal gespeichert.</p>
                </div>
              </article>
            ))}
          </div>
        </>}
    </section>
  );
}

export function ProgressView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const states = Object.values(progress.evidenceStates);
  const demonstrated = states.filter((state) => state === 'demonstrated').length;
  const retained = states.filter((state) => state === 'retained').length;
  const due = states.filter((state) => state === 'review_due').length;
  const learning = states.filter((state) => state === 'learning').length;
  const unassessed = states.filter((state) => state === 'unassessed').length;
  const freshnessDue = Object.entries(progress.evidenceDueAt).filter(([, value]) => value && new Date(value).getTime() <= Date.now()).length;
  return (
    <section class="view" aria-labelledby="progress-title">
      <header class="view-header"><p class="eyebrow">Belege statt Punkte</p><h1 id="progress-title" tabIndex={-1}>Fortschritt</h1><p class="lede">Lokale Lernereignisse werden als aktueller Kompetenzzustand und fällige Reviews zusammengefasst.</p></header>
      <div class="stat-grid">
        <article><strong>{progress.attemptsCount}</strong><span>Lernereignisse</span></article>
        <article><strong>{demonstrated}</strong><span>direkt nachgewiesen</span></article>
        <article><strong>{retained}</strong><span>verzögert bestätigt</span></article>
        <article><strong>{learning}</strong><span>im Aufbau</span></article>
        <article><strong>{due}</strong><span>Kompetenz-Frische abgelaufen</span></article>
        <article><strong>{unassessed}</strong><span>noch ungeprüft</span></article>
      </div>
      <p class="plan-policy"><strong>Zwei getrennte Zeitachsen:</strong> <strong>Aufgaben-Review</strong> meint eine einzelne Aufgabe mit eigenem Fälligkeitstermin aus den Expanding-Slots (Woche+2/+5/+11). <strong>Kompetenz-Frische</strong> meint den aggregierten Nachweis über unabhängige Treffer verschiedener Aufgabefamilien — sie läuft auf die kompetenzspezifische Frist ({freshnessDue} Kompetenzen derzeit überschritten) und wird dann als „Review fällig“ markiert, bis ein neuer qualifizierter Treffer sie erneuert.</p>
      <section class="activity-section" aria-labelledby="journal-title">
        <h2 id="journal-title">Fehlerjournal ({progress.journal.length})</h2>
        {progress.journal.length
          ? <ul class="journal-list">{progress.journal.slice(-10).reverse().map((entry, index) => <li key={entry.id ?? index}>{entry.ts.slice(0, 16)} · {entry.exerciseId} · {entry.errorType}</li>)}</ul>
          : <p>Noch keine Journaleinträge.</p>}
      </section>
      <section class="post-course" aria-labelledby="post-course-title">
        <div class="section-heading"><div><p class="eyebrow">Nach dem letzten Kursblock</p><h2 id="post-course-title">Reviews laufen weiter</h2></div></div>
        <p>Der Planer plant fällige Reviews weiter ein, ohne künstliche Treffer zu erzeugen. Aktuell sind {progress.dueReviews.length} Aufgaben-Reviews fällig und {progress.scheduledReviewCount} Aufgaben insgesamt in der Review-Planung. Ein qualifizierter Treffer — richtig, höchstens ein Hinweis, keine vorherige Lösungsanzeige — erneuert jeweils die Gültigkeit.</p>
      </section>
      {progress.attemptsCount === 0 && <div class="empty-state"><h2>Noch keine Evidence</h2><p>Beginne mit der Diagnose oder öffne eine der {catalog.competencies.length} Kompetenzen.</p><a class="button button-primary" href="#/diagnostic">Diagnose starten</a></div>}
    </section>
  );
}

export function SettingsView({ catalog, progress, onSave }: {
  catalog: CatalogData;
  progress: ProgressSnapshot;
  onSave: (weeklyMinutes: number, trackId: string, reviewSlotsWeeks: number[]) => Promise<void>;
}) {
  const [status, setStatus] = useState('');
  const downloadProgress = async () => {
    const blob = new Blob([await exportProgressJson()], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'ki-lernplattform-fortschritt.json';
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
  return (
    <section class="view" aria-labelledby="settings-title">
      <header class="view-header"><p class="eyebrow">Lokal und übersteuerbar</p><h1 id="settings-title" tabIndex={-1}>Einstellungen</h1><p class="lede">Zielpfad, Zeitbudget und optionale Adapter bleiben unter deiner Kontrolle.</p></header>
      <form class="settings-panel" onSubmit={async (event) => {
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
        <button class="button button-primary" type="submit">Lokal speichern</button>
        <p class="save-status" role="status">{status}</p>
      </form>
      <section class="settings-panel transfer-panel" aria-labelledby="transfer-title"><div><p class="card-kicker">Portable lokale Daten</p><h2 id="transfer-title">Fortschritt exportieren oder importieren</h2><p>Der Export enthält das versionierte Schema. Ein Import wird vor jeder Schreibtransaktion vollständig validiert und ersetzt Daten erst nach deiner Bestätigung.</p></div><div class="transfer-actions"><button class="button button-secondary" type="button" onClick={() => void downloadProgress()}>JSON exportieren</button><label class="button button-secondary" for="progress-import">JSON importieren</label><input id="progress-import" type="file" accept="application/json,.json" onChange={(event) => { void importProgress(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></div></section>
    </section>
  );
}

export function PlaceholderView({ title }: { title: string }) {
  return <section class="view"><header class="view-header"><p class="eyebrow">Freier Zugriff</p><h1 tabIndex={-1}>{title}</h1><p class="lede">Dieser Lernfluss wird im parallelen UI-Schnitt aufgebaut.</p></header><a class="button button-secondary" href="#/learn">Zur Kompetenzkarte</a></section>;
}
