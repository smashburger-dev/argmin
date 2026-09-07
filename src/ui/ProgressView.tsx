import type { CatalogData, EvidenceState } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';
import { Button } from './Button';
import { learnerExerciseLabel } from './learner-labels';

const evidencedStates: EvidenceState[] = ['demonstrated', 'retained'];

function hasEvidence(state: EvidenceState | undefined) {
  return state === 'demonstrated' || state === 'retained';
}

export function moduleState(competencyIds: string[], states: Record<string, EvidenceState>) {
  const moduleStates = competencyIds.map((id) => states[id] ?? 'unassessed');
  if (moduleStates.some((state) => state === 'review_due')) return 'Fällig';
  if (moduleStates.length > 0 && moduleStates.every((state) => evidencedStates.includes(state))) return 'Nachgewiesen';
  if (moduleStates.some((state) => state === 'learning' || state === 'demonstrated')) return 'Im Aufbau';
  return '';
}

function ModuleProgress({ module, progress }: {
  module: CatalogData['learningModules'][number];
  progress: ProgressSnapshot;
}) {
  const evidenced = module.competencyIds.filter((id) => hasEvidence(progress.evidenceStates[id])).length;
  const percent = module.competencyIds.length ? Math.round(evidenced / module.competencyIds.length * 100) : 0;
  const state = moduleState(module.competencyIds, progress.evidenceStates);
  return (
    <a class="module-progress" href={`#/module/${module.moduleId}`}>
      <span class="module-progress-copy">
        <strong>{module.title}</strong>
        <small>{evidenced} von {module.competencyIds.length} Kompetenzen nachgewiesen · {module.estimatedMinutes} Min.</small>
      </span>
      <span class="module-progress-meter">
        <span class={`meter ${state === 'Fällig' ? 'meter-warning' : ''}`} aria-label={`${module.title}: ${percent} Prozent belegt`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} role="meter">
          <span style={{ width: `${percent}%` }} />
        </span>
        {state ? <span class={`tag ${state === 'Fällig' ? 'tag-warning' : ''}`}>{state}</span> : null}
      </span>
    </a>
  );
}

function formatJournalDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(date);
}

function journalExerciseLabel(exercise: CatalogData['exercises'][number] | undefined) {
  return exercise ? learnerExerciseLabel(exercise) : 'Entfernte Aufgabe';
}

export function ProgressView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const exerciseById = new Map(catalog.exercises.map((exercise) => [exercise.definitionId, exercise]));
  const { executable: executableReviews } = partitionReviewQueue(progress.dueReviews, exerciseById.keys());
  const demonstrated = catalog.competencies.filter((item) => hasEvidence(progress.evidenceStates[item.competencyId])).length;
  const percent = catalog.competencies.length ? Math.round(demonstrated / catalog.competencies.length * 100) : 0;
  const dueCompetencies = catalog.competencies.filter((item) => progress.evidenceStates[item.competencyId] === 'review_due');
  const track = catalog.tracks.find((item) => item.trackId === progress.trackId) ?? catalog.tracks[0];
  const trackModules = catalog.learningModules.filter((module) => track?.trackId && module.trackIds.includes(track.trackId));
  const otherModules = catalog.learningModules.filter((module) => module.trackIds.length === 0);
  const journal = progress.journal.slice(-10).reverse();
  return (
    <section class="view" aria-labelledby="progress-title">
      <header class="view-header">
        <p class="eyebrow">Belege statt Punkte</p>
        <h1 id="progress-title" tabIndex={-1}>Fortschritt</h1>
        <p class="lede">Was du nachgewiesen hast, was fällig ist — alles lokal in diesem Browser.</p>
      </header>
      <section class="progress-summary" aria-label="Fortschrittsübersicht">
        <div class="progress-summary-stats">
          <div><strong>{demonstrated} von {catalog.competencies.length}</strong><span>Kompetenzen nachgewiesen</span></div>
          <div><strong>{executableReviews.length}</strong><span>Reviews fällig</span></div>
          <div><strong>{progress.attemptsCount}</strong><span>Lernereignisse</span></div>
        </div>
        <div class="meter" aria-label={`${percent} Prozent Kompetenzen nachgewiesen`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} role="meter">
          <span style={{ width: `${percent}%` }} />
        </div>
      </section>
      {dueCompetencies.length > 0 ? (
        <section class="activity-section" aria-labelledby="due-title">
          <div class="section-heading">
            <div><p class="eyebrow">Kompetenz-Frische</p><h2 id="due-title">Fällig</h2></div>
            <Button variant="secondary" href="#/review">Review-Queue öffnen ({executableReviews.length})</Button>
          </div>
          <ul class="due-list">
            {dueCompetencies.map((competency) => <li key={competency.competencyId}><a href={`#/competency/${competency.competencyId}`}>{competency.title}</a><span>Nachweis auffrischen</span></li>)}
          </ul>
        </section>
      ) : null}
      {progress.attemptsCount === 0 ? (
        <div class="empty-state">
          <h2>Hier ist noch alles offen</h2>
          <p>Sobald du deine erste Aufgabe löst, siehst du hier deinen Fortschritt. Starte mit der kurzen Einstufung oder wähle eine der {catalog.competencies.length} Kompetenzen.</p>
          <Button variant="primary" href="#/diagnostic">Einstufung starten</Button>
        </div>
      ) : null}
      <section class="activity-section" aria-labelledby="modules-title">
        <div class="section-heading">
          <div><p class="eyebrow">Lernpfad</p><h2 id="modules-title">Module</h2></div>
          <span>{track?.title ?? 'Alle Module'}</span>
        </div>
        <div class="module-progress-list">
          {trackModules.map((module) => <ModuleProgress module={module} progress={progress} key={module.moduleId} />)}
          {otherModules.length > 0 ? <h3 class="module-group-title">Weitere Module</h3> : null}
          {otherModules.map((module) => <ModuleProgress module={module} progress={progress} key={module.moduleId} />)}
        </div>
      </section>
      <details class="journal">
        <summary>Fehlerjournal ({progress.journal.length})</summary>
        {journal.length > 0 ? (
          <ul>
            {journal.map((entry, index) => <li key={entry.id ?? index}>{formatJournalDate(entry.ts)} · {journalExerciseLabel(exerciseById.get(entry.exerciseId))} · {entry.errorType}</li>)}
          </ul>
        ) : <p>Noch keine Einträge — Fehler, die du beim Üben machst, landen hier, damit du sie gezielt wiederholen kannst.</p>}
      </details>
      <details class="policy">
        <summary>Wie wird gezählt?</summary>
        <p>Aufgaben-Review ist ein Termin pro Aufgabe; Reviewabstände kommen aus den Einstellungen. Kompetenz-Nachweis basiert auf unabhängigen Treffern aus verschiedenen Familien und läuft nach kompetenzspezifischer Frist ab.</p>
      </details>
    </section>
  );
}
