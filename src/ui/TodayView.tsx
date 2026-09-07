import { useMemo } from 'preact/hooks';
import type { CatalogData } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { buildWeeklyLearningPlan, type LearningPlanItem } from '../adapters/learning-plan';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { Button } from './Button';
import { Carousel } from './Carousel';
import { activityLabel, difficultyLabelFor } from './exercise-context';
import { learnerExerciseLabel, minutesLabel } from './learner-labels';

function reasonLabel(item: LearningPlanItem) {
  if (item.reasonCodes.includes('review-due')) return 'Fälliger Review';
  if (item.reasonCodes.includes('strengthen-competency')) return 'Kompetenz stärken';
  return 'Kompetenz aufbauen';
}

function itemTitle(
  item: LearningPlanItem,
  exerciseById: Map<string, CatalogData['exercises'][number]>,
  competencyById: Map<string, CatalogData['competencies'][number]>,
) {
  if (item.type !== 'exercise' && item.type !== 'review') return item.title;
  const exercise = exerciseById.get(item.activityId);
  const base = learnerExerciseLabel(exercise);
  const competency = exercise?.competencyIds.map((id) => competencyById.get(id)?.title).find(Boolean);
  return competency ? `${base} · ${competency}` : base;
}

function PlanItem({ item, exerciseById, competencyById }: {
  item: LearningPlanItem;
  exerciseById: Map<string, CatalogData['exercises'][number]>;
  competencyById: Map<string, CatalogData['competencies'][number]>;
}) {
  return (
    <li>
      <a href={item.route}>
        <strong>{itemTitle(item, exerciseById, competencyById)}</strong>
        <span>{item.estimatedMinutes} Min. · {reasonLabel(item)}</span>
      </a>
    </li>
  );
}

function PlanDay({ day, exerciseById, competencyById }: {
  day: { day: number; minutes: number; items: LearningPlanItem[] };
  exerciseById: Map<string, CatalogData['exercises'][number]>;
  competencyById: Map<string, CatalogData['competencies'][number]>;
}) {
  return (
    <article class="plan-day">
      <p class="card-kicker">Tag {day.day} · {day.minutes} Min.</p>
      <ol>
        {day.items.map((item) => <PlanItem item={item} exerciseById={exerciseById} competencyById={competencyById} key={item.activityId} />)}
      </ol>
    </article>
  );
}

function MilestoneCard({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const foundation = catalog.milestones.find((item) => item.milestoneId === 'ms-foundations');
  const competencyIds = foundation?.competencyIds ?? [];
  const evidenceCount = competencyIds.filter((id) => ['demonstrated', 'retained'].includes(progress.evidenceStates[id] ?? '')).length;
  const percent = competencyIds.length ? Math.round(evidenceCount / competencyIds.length * 100) : 0;
  return (
    <article class="status-card">
      <p class="card-kicker">Aktueller Milestone</p>
      <h2>{foundation?.title ?? 'Foundations'}</h2>
      <p>{foundation?.description}</p>
      <div class="meter" aria-label={`Foundations: ${percent} Prozent belegt`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} role="meter">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p class="meter-label">{evidenceCount} von {competencyIds.length} Kompetenzen mit aktuellem Beleg.</p>
      <a class="text-link" href="#/learn">Im Lernpfad weiter →</a>
    </article>
  );
}

function FollowUpCard({ executableReviews, nextNonReview, exerciseById, competencyById }: {
  executableReviews: Array<{ exerciseId: string }>;
  nextNonReview: LearningPlanItem | undefined;
  exerciseById: Map<string, CatalogData['exercises'][number]>;
  competencyById: Map<string, CatalogData['competencies'][number]>;
}) {
  if (executableReviews.length > 0) {
    return nextNonReview ? (
      <article class="status-card">
        <p class="card-kicker">Nächster Schritt danach</p>
        <h2>{itemTitle(nextNonReview, exerciseById, competencyById)}</h2>
        <p>{reasonLabel(nextNonReview)}</p>
        <a class="text-link" href={nextNonReview.route}>Öffnen</a>
      </article>
    ) : null;
  }
  return (
    <article class="status-card">
      <p class="card-kicker">Wiederholen</p>
      <h2>Nichts zu wiederholen</h2>
      <p>Gut so. Sobald eine Aufgabe zur Wiederholung dran ist, erscheint sie hier.</p>
      <a class="text-link" href="#/review">Review-Queue öffnen</a>
    </article>
  );
}

function relativeDay(occurredAt: string) {
  const elapsedDays = Math.floor((Date.now() - Date.parse(occurredAt)) / 86400000);
  if (elapsedDays <= 0) return 'heute';
  if (elapsedDays === 1) return 'gestern';
  return `vor ${elapsedDays} Tagen`;
}

function LastWorkedCard({ progress, exerciseById, catalog }: {
  progress: ProgressSnapshot;
  exerciseById: Map<string, CatalogData['exercises'][number]>;
  catalog: CatalogData;
}) {
  const lastAttempt = progress.lastAttempt;
  const exercise = lastAttempt ? exerciseById.get(lastAttempt.definitionId) : undefined;
  if (!lastAttempt || !exercise) return null;
  const module = catalog.learningModules.find((item) => item.placements.some((placement) => placement.definitionId === exercise.definitionId));
  const competency = catalog.competencies.find((item) => exercise.competencyIds.includes(item.competencyId));
  return (
    <article class="status-card">
      <p class="card-kicker">Zuletzt bearbeitet</p>
      <h2>{activityLabel(exercise.activityType)} · {difficultyLabelFor(exercise.difficulty)}</h2>
      <p>{module?.title ?? competency?.title} · {relativeDay(lastAttempt.occurredAt)}</p>
      <a class="text-link" href={routeForDefinition(exercise)}>Weitermachen</a>
    </article>
  );
}

function recommendation(
  progress: ProgressSnapshot,
  plan: ReturnType<typeof buildWeeklyLearningPlan>,
  reviews: Array<{ exerciseId: string }>,
  exerciseById: Map<string, CatalogData['exercises'][number]>,
  competencyById: Map<string, CatalogData['competencies'][number]>,
) {
  if (reviews.length > 0) {
    const minutes = reviews.slice(0, 3).reduce((total, review) => total + (exerciseById.get(review.exerciseId)?.estimatedMinutes ?? 10), 0);
    return {
      kicker: 'Wiederholen',
      title: `${reviews.length} Reviews fällig`,
      text: 'Kurze Abrufe halten Nachweise frisch.',
      href: '#/review',
      action: 'Reviews starten',
      time: minutesLabel(minutes),
    };
  }
  if (progress.attemptsCount === 0) {
    return {
      kicker: 'Empfohlen',
      title: 'Standort bestimmen',
      text: 'Starte mit kurzen Algebra- und Python-Ankern. Danach erklärt die Plattform jede Empfehlung.',
      href: '#/diagnostic',
      action: 'Diagnose starten',
      time: '15 bis 20 Min.',
    };
  }
  const firstItem = plan.days.flatMap((day) => day.items)[0];
  if (firstItem) {
    return {
      kicker: 'Weiterlernen',
      title: itemTitle(firstItem, exerciseById, competencyById),
      text: reasonLabel(firstItem),
      href: firstItem.route,
      action: 'Öffnen',
      time: `${firstItem.estimatedMinutes} Min.`,
    };
  }
  return {
    kicker: 'Frei wählen',
    title: 'Alles im Budget erledigt',
    text: 'Wähle frei den nächsten Bereich im Kompetenzkatalog.',
    href: '#/learn',
    action: 'Katalog öffnen',
    time: '',
  };
}

export function TodayView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const plan = useMemo(() => buildWeeklyLearningPlan(catalog, progress), [catalog, progress]);
  const exerciseById = new Map(catalog.exercises.map((exercise) => [exercise.definitionId, exercise]));
  const competencyById = new Map(catalog.competencies.map((competency) => [competency.competencyId, competency]));
  const { executable: executableReviews } = partitionReviewQueue(progress.dueReviews, exerciseById.keys());
  const activeTrack = catalog.tracks.find((item) => item.trackId === progress.trackId) ?? catalog.tracks[0];
  const trackDone = activeTrack ? activeTrack.competencyIds.every((id) => ['demonstrated', 'retained'].includes(progress.evidenceStates[id] ?? '')) : false;
  const primary = recommendation(progress, plan, executableReviews, exerciseById, competencyById);
  const nextNonReview = plan.days.flatMap((day) => day.items).find((item) => item.type !== 'review');
  return (
    <section class="view" aria-labelledby="today-title">
      <header class="view-header">
        <p class="eyebrow">Dein Lernfenster</p>
        <h1 id="today-title" tabIndex={-1}>Heute</h1>
      </header>
      <div class="today-grid">
        <article class="primary-card" data-tour="today-primary">
          <div>
            <p class="card-kicker">{primary.kicker}</p>
            <h2>{primary.title}</h2>
            <p>{primary.text}</p>
          </div>
          <div class="actions">
            {primary.time ? <span class="time-chip">{primary.time}</span> : null}
            <Button variant="primary" href={primary.href}>{primary.action}</Button>
          </div>
        </article>
        <MilestoneCard catalog={catalog} progress={progress} />
        <FollowUpCard executableReviews={executableReviews} nextNonReview={nextNonReview} exerciseById={exerciseById} competencyById={competencyById} />
        <LastWorkedCard progress={progress} exerciseById={exerciseById} catalog={catalog} />
      </div>
      <section class="weekly-plan" aria-labelledby="weekly-plan-title" data-tour="today-plan">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Vorschlag für die Woche</p>
            <h2 id="weekly-plan-title">Dein Wochenplan</h2>
          </div>
          <span>{plan.totalMinutes} von {plan.availableMinutes} Min. · <a href="#/settings">Budget anpassen</a></span>
        </div>
        {progress.attemptsCount === 0 ? <p class="plan-note">Vorläufiger Plan — nach der Diagnose wird er genauer.</p> : null}
        {plan.days.some((day) => day.items.length) ? (
          <Carousel label="Wochenplan-Tage">
            {plan.days.filter((day) => day.items.length).map((day) => <PlanDay day={day} exerciseById={exerciseById} competencyById={competencyById} key={day.day} />)}
          </Carousel>
        ) : trackDone ? (
          <div class="empty-state">
            <h3>Pfad geschafft</h3>
            <p>Alle Kompetenzen in diesem Pfad sind nachgewiesen. Reviews halten sie frisch — oder du wechselst den Pfad in den <a href="#/settings">Einstellungen</a>.</p>
          </div>
        ) : (
          <div class="empty-state">
            <h3>Kein Plan im aktuellen Budget</h3>
            <p>Gib dir in den Einstellungen etwas mehr Zeit pro Woche oder such dir unter Lernen einfach das nächste Thema aus.</p>
          </div>
        )}
        <details class="policy">
          <summary>Wie entsteht der Plan?</summary>
          <p>Der Plan verteilt dein Wochenbudget aus den Einstellungen auf die Tage. Bis zu 35 Prozent davon sind für Wiederholungen reserviert, der Rest für neue Lektionen und Aufgaben. Wiederholungsabstände kannst du in den Einstellungen anpassen.</p>
        </details>
      </section>
      {progress.attemptsCount === 0 ? (
        <aside class="reason-panel" aria-labelledby="reason-title">
          <p class="eyebrow">Warum dieser Start?</p>
          <h2 id="reason-title">Erst messen, dann empfehlen</h2>
          <ol>
            <li>Kurze Aufgaben liefern belastbarere Hinweise als Selbsteinschätzung allein.</li>
            <li>Fehlende Voraussetzungen werden vor neuen Themen sichtbar.</li>
            <li>Du kannst jede Empfehlung überspringen und direkt lernen.</li>
          </ol>
        </aside>
      ) : null}
    </section>
  );
}
