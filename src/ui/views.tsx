import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CatalogData, Competency, EvidenceState, SourceSummary } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { loadSources, loadTools } from '../adapters/content-repository';
import { Button } from './Button';
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
  return <p role="alert" class="content-error">{view} konnten nicht geladen werden — bitte die Seite neu laden (Abschnittsdatei fehlt oder Verbindung unterbrochen).</p>;
}
import { buildFoundationsDiagnosis } from '../adapters/diagnosis';
import { exportProgressJson, importProgressJson } from '../adapters/progress-admin';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';
import { orderModulesForTrack } from '../../assets/js/domain/module_order.mjs';
import { learnerExerciseLabel, minutesLabel } from './learner-labels';
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

export function LearnView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const [activeTrack, setActiveTrack] = useState(progress.trackId);
  const [query, setQuery] = useState('');
  const track = catalog.tracks.find((item) => item.trackId === activeTrack) ?? catalog.tracks[0];
  const modules = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('de');
    const matching = (catalog.learningModules || []).filter((module) => {
      const searchable = `${module.title} ${module.description}`.toLocaleLowerCase('de');
      return !needle || searchable.includes(needle);
    });
    return track ? orderModulesForTrack(matching, track) : matching;
  }, [catalog.learningModules, query, track]);
  return (
    <section class="view" aria-labelledby="learn-title">
      <header class="view-header split-header">
        <div>
          <p class="eyebrow">Lernpfad</p>
          <h1 id="learn-title" tabIndex={-1}>Lernen</h1>
          <p class="lede">Module in sinnvoller Reihenfolge — du kannst jederzeit frei springen.</p>
        </div>
        <label class="search-field">
          <span>Module suchen</span>
          <input
            type="search"
            placeholder="Algebra, Tensoren, RAG"
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
      <section class="activity-section" aria-labelledby="learn-module-title">
        <div class="section-heading">
          <div><p class="eyebrow">Lernpfad</p><h2 id="learn-module-title">Module in diesem Pfad</h2></div>
          <span>{modules.length}</span>
        </div>
        {modules.length > 0 ? (
          <ol class="module-path">
            {modules.map((module, index) => {
              const state = moduleState(module.competencyIds, progress.evidenceStates) || 'Im Aufbau';
              const competencyLabel = module.competencyIds.length === 1 ? 'Kompetenz' : 'Kompetenzen';
              return (
                <li key={module.moduleId}>
                  <a href={`#/module/${module.moduleId}`}>
                    <span class="module-step" aria-hidden="true">{index + 1}</span>
                    <div>
                      <strong>{module.title}</strong>
                      <p>{module.description}</p>
                    </div>
                    <span class="module-meta">{module.estimatedMinutes} Min. · {module.competencyIds.length} {competencyLabel} <span class="tag">{state}</span></span>
                  </a>
                </li>
              );
            })}
          </ol>
        ) : <div class="empty-state"><h2>Kein passendes Modul</h2><p>Ändere den Suchbegriff oder wähle einen anderen Lernpfad.</p></div>}
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
        <article class="status-card"><p class="card-kicker">Evidence-Policy</p><h2>{competency.evidencePolicy.minimumIndependentHits} Treffer</h2><p>{competency.evidencePolicy.minimumDistinctDefinitions} verschiedene Aufgabenfamilien{competency.evidencePolicy.delayedHitRequired ? ', davon ein verzögerter Abruf' : ''}. Fällige Aufgaben-Reviews dieser Kompetenz erscheinen in der Review-Ansicht — Kompetenz-Frische und Aufgaben-Review sind zwei getrennte Zeitachsen.</p></article>
      </div>
      {competency.requires.length > 0 && <aside class="prerequisite-panel"><h2>Voraussetzungen</h2><ul>{competency.requires.map((id) => <li key={id}><a href={`#/competency/${id}`}>{byId.get(id)?.title ?? id}</a><span>{stateLabels[progress.evidenceStates[id] ?? 'unassessed']}</span></li>)}</ul></aside>}
      {modules.length > 0 && <section class="activity-section" aria-labelledby="module-list-title"><div class="section-heading"><div><p class="eyebrow">Module</p><h2 id="module-list-title">Module in diesem Pfad</h2></div><span>{modules.length}</span></div><div class="lesson-list">{modules.map((module) => <a href={`#/module/${module.moduleId}`} key={module.moduleId}><span>{module.estimatedMinutes} Min.</span><strong>{module.title}</strong><p>{module.description}</p></a>)}</div></section>}
      {lessons.length > 0 && <section class="activity-section" aria-labelledby="lesson-list-title"><div class="section-heading"><div><p class="eyebrow">Lektionen</p><h2 id="lesson-list-title">Lektionen</h2></div><span>{lessons.length} verfügbar</span></div><div class="lesson-list">{lessons.map((lesson) => <a href={`#/lesson/${lesson.lessonId}`} key={lesson.lessonId}><span>{lesson.estimatedMinutes} Min.</span><strong>{lesson.title}</strong><p>{lesson.objectives[0]}</p></a>)}</div></section>}
      <section class="activity-section" aria-labelledby="activity-title">
        <div class="section-heading"><div><p class="eyebrow">Üben und nachweisen</p><h2 id="activity-title">Aufgaben</h2></div><span>{exercises.length} verfügbar</span></div>
        {exercises.length > 0
          ? <div class="activity-list">{exercises.map((exercise) => <article class="activity-card" key={exercise.definitionId}><div><p class="card-kicker">{exercise.estimatedMinutes} Min.</p><h3>{learnerExerciseLabel(exercise)}</h3><p>{exercise.masteryEligible ? 'Kann als Kompetenzbeleg zählen.' : 'Diagnose oder Reflexion ohne Kompetenzbeleg.'}</p></div><Button href={routeForDefinition(exercise)}>{exercise.activityType === 'python-code' ? 'Im Codeworkspace öffnen' : 'Aufgabe öffnen'}</Button></article>)}</div>
          : <div class="empty-state"><h2>Noch keine Aufgabenfamilie</h2><p>Diese Lücke bleibt im Foundations-Manifest sichtbar.</p></div>}
      </section>
    </section>
  );
}

export function ToolsView(_: { catalog: CatalogData }) {
  const tools = useSection(loadTools);
  if (tools === 'failed') return <section class="view" aria-labelledby="tools-title"><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1>{sectionError('Werkzeugkarten')}</section>;
  if (!tools) return <section class="view" aria-labelledby="tools-title"><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1><p role="status">Werkzeugkarten werden geladen.</p></section>;
  return <section class="view" aria-labelledby="tools-title"><header class="view-header"><p class="eyebrow">Runtimes, Prüfpfade und Arbeitsweisen</p><h1 id="tools-title" tabIndex={-1}>Werkzeuge</h1><p class="lede">Jedes Werkzeug hat einen sichtbaren Zweck, Grenzen und einen nativen Einstieg. Externe Repositories bleiben Quellen; sie werden nicht ungeprüft ausgeführt.</p></header><div class="tool-grid">{tools.map((tool) => <article class="tool-card" key={tool.toolId}><p class="card-kicker">{tool.kind} · {tool.toolId}</p><h2>{tool.title}</h2><p>{tool.summary}</p><h3>Kann</h3><ul>{tool.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>{tool.limitations.length ? <><h3>Grenzen</h3><ul>{tool.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></> : null}<div class="actions">{tool.routes.map((route) => <Button key={route.href} href={route.href} target={route.type === 'external' ? '_blank' : undefined} rel={route.type === 'external' ? 'noreferrer' : undefined}>{route.label}</Button>)}</div></article>)}</div></section>;
}

function sourceWeeksLabel(weeks: unknown) {
  if (Array.isArray(weeks) && weeks.length) return `Referenzabschnitte ${weeks.join(', ')}`;
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
          <p class="lede">Öffentliche Quellen und Referenzen begleiten die Lektionen. Eine Quelle ist noch keine Lernaktivität; ihre Rolle wird in Lektionen und Modulen ausgewiesen.</p>
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
      <header class="view-header"><p class="eyebrow">Formative Standortbestimmung</p><h1 id="diagnostic-title" tabIndex={-1}>Diagnose</h1><p class="lede">Die Priorität folgt deinem lokalen Kompetenzzustand. Alle {catalog.competencies.length} Kompetenzen bleiben frei zugänglich.</p></header>
      {recommendations.length > 0
        ? <div class="diagnostic-grid">{recommendations.map((recommendation, index) => { const competency = labels.get(recommendation.competencyId); return <article class="diagnostic-card" key={recommendation.competencyId}><span>{String(index + 1).padStart(2, '0')} · {typeLabels[recommendation.type]}</span><h2>{competency?.title ?? recommendation.competencyId}</h2><p>{competency?.description}</p><small>{recommendation.reasonCodes.join(' · ')}</small><a href={`#/competency/${recommendation.competencyId}`}>Bereich ansehen</a></article>; })}</div>
        : <div class="empty-state"><h2>Foundations aktuell belegt</h2><p>Öffne Review für fällige Abrufe oder wähle frei den nächsten Lernpfad.</p></div>}
      <aside class="reason-panel"><p class="eyebrow">Auswertung</p><h2>Jede Empfehlung bleibt erklärbar</h2><p>Reason-Codes unterscheiden fehlende Evidence, schwache Kompetenz, fälligen Review und aktuellen Nachweis. Selbsteinschätzung allein öffnet oder schließt kein Gate.</p><Button variant="primary" href={firstAnchor ? routeForDefinition(firstAnchor) : '#/learn'}>Ersten Algebra-Anker ausführen</Button></aside>
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
        ? <div class="empty-state"><h2>Keine Aufgaben-Reviews fällig</h2><p>Nach einem unabhängigen Treffer plant die Plattform den nächsten Abruf. Aufgaben mit Variantengenerator öffnen bei jedem Review eine frische Instanz mit neuen Werten.</p><Button href="#/learn">Inhalte erkunden</Button></div>
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
              return <article class="review-card" key={review.exerciseId}><div><p class="card-kicker">Aufgaben-Review fällig</p><h2>{learnerExerciseLabel(definition)}</h2><p>fällig seit {new Date(review.nextDueAt).toLocaleDateString('de-DE')}{freshRoute !== route ? ' · öffnet eine frische Instanz' : ''}</p></div><Button variant="primary" href={freshRoute}>Wiederholen</Button></article>;
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

export function SettingsView({ catalog, progress, onSave }: {
  catalog: CatalogData;
  progress: ProgressSnapshot;
  onSave: (weeklyMinutes: number, trackId: string, reviewSlotsWeeks: number[]) => Promise<void>;
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
      <header class="view-header"><p class="eyebrow">Lokal und übersteuerbar</p><h1 id="settings-title" tabIndex={-1}>Einstellungen</h1><p class="lede">Zielpfad, Zeitbudget und optionale Adapter bleiben unter deiner Kontrolle.</p></header>
      <section class="settings-panel" aria-labelledby="theme-title">
        <div><p class="card-kicker">Darstellung</p><h2 id="theme-title">Farbschema</h2><p>Wähle, ob die Oberfläche dem System folgt oder hell beziehungsweise dunkel bleibt.</p></div>
        <div class="segmented" role="radiogroup" aria-label="Farbschema">
          {([['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']] as const).map(([value, label]) => (
            <button type="button" role="radio" aria-checked={themePreference === value} class={themePreference === value ? 'is-active' : undefined} onClick={() => chooseTheme(value)}>{label}</button>
          ))}
        </div>
      </section>
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
        <Button variant="primary" type="submit">Lokal speichern</Button>
        <p class="save-status" role="status">{status}</p>
      </form>
      <section class="settings-panel" aria-labelledby="transfer-title"><div><p class="card-kicker">Portable lokale Daten</p><h2 id="transfer-title">Fortschritt exportieren oder importieren</h2><p>Der Export enthält das versionierte Schema. Ein Import wird vor jeder Schreibtransaktion vollständig validiert und ersetzt Daten erst nach deiner Bestätigung.</p></div><div class="actions"><Button variant="secondary" type="button" onClick={() => void downloadProgress()}>JSON exportieren</Button><Button variant="secondary" type="button" onClick={() => importInput.current?.click()}>JSON importieren</Button><input ref={importInput} id="progress-import" type="file" aria-label="JSON importieren" accept="application/json,.json" onChange={(event) => { void importProgress(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></div></section>
    </section>
  );
}

export function PlaceholderView({ title }: { title: string }) {
  return <section class="view"><header class="view-header"><p class="eyebrow">Freier Zugriff</p><h1 tabIndex={-1}>{title}</h1><p class="lede">Dieser Lernfluss wird im parallelen UI-Schnitt aufgebaut.</p></header><Button href="#/learn">Zur Kompetenzkarte</Button></section>;
}
