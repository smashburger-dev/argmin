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
  const journal = progress.journal.slice(-10).reverse();
  return (
    <section class="view" aria-labelledby="progress-title">
      <header class="view-header">
        <p class="eyebrow">Belege statt Punkte</p>
        <h1 id="progress-title" tabIndex={-1}>Fortschritt</h1>
        <p class="lede">Was du nachgewiesen hast und was fällig ist. Alles bleibt lokal in diesem Browser.</p>
      </header>
      <section class="progress-summary" aria-label="Fortschrittsübersicht" data-tour="progress-overview">
        <div class="meter" aria-label={`${percent} Prozent Kompetenzen nachgewiesen`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} role="meter">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div class="progress-summary-stats">
          <div><strong>{demonstrated} von {catalog.competencies.length}</strong><span>Kompetenzen nachgewiesen</span></div>
          <div><strong>{executableReviews.length}</strong><span>Reviews fällig</span></div>
          <div><strong>{progress.attemptsCount}</strong><span>Lernereignisse</span></div>
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
      <details class="journal">
        <summary>Fehlerjournal ({progress.journal.length})</summary>
        {journal.length > 0 ? (
          <ul>
            {journal.map((entry, index) => <li key={entry.id ?? index}>{formatJournalDate(entry.ts)} · {journalExerciseLabel(exerciseById.get(entry.exerciseId))} · {entry.errorType}</li>)}
          </ul>
        ) : <p>Noch keine Einträge. Fehler, die du beim Üben machst, landen hier, damit du sie gezielt wiederholen kannst.</p>}
      </details>
      <details class="policy">
        <summary>Wie wird gezählt?</summary>
        <p>Aufgaben-Review ist ein Termin pro Aufgabe; Reviewabstände kommen aus den Einstellungen. Kompetenz-Nachweis basiert auf unabhängigen Treffern aus verschiedenen Familien und läuft nach kompetenzspezifischer Frist ab.</p>
      </details>
    </section>
  );
}
