import { useMemo } from 'preact/hooks';
import type { CatalogData } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { buildWeeklyLearningPlan, type LearningPlanItem } from '../adapters/learning-plan';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';
import { Button } from './Button';
import { Carousel } from './Carousel';
import { learnerExerciseLabel, minutesLabel } from './learner-labels';

function reasonLabel(item: LearningPlanItem) {
  if (item.reasonCodes.includes('review-due')) return 'Fälliger Review';
  if (item.reasonCodes.includes('strengthen-competency')) return 'Kompetenz stärken';
  return 'Kompetenz aufbauen';
}

function itemTitle(item: LearningPlanItem, exerciseById: Map<string, CatalogData['exercises'][number]>) {
  return item.type === 'exercise' || item.type === 'review'
    ? learnerExerciseLabel(exerciseById.get(item.activityId))
    : item.title;
}

function PlanItem({ item, exerciseById }: {
  item: LearningPlanItem;
  exerciseById: Map<string, CatalogData['exercises'][number]>;
}) {
  return (
    <li>
      <a href={item.route}>
        <strong>{itemTitle(item, exerciseById)}</strong>
        <span>{item.estimatedMinutes} Min. · {reasonLabel(item)}</span>
      </a>
    </li>
  );
}

function PlanDay({ day, exerciseById }: {
  day: { day: number; minutes: number; items: LearningPlanItem[] };
  exerciseById: Map<string, CatalogData['exercises'][number]>;
}) {
  return (
    <article class="plan-day">
      <p class="card-kicker">Tag {day.day} · {day.minutes} Min.</p>
      <ol>
        {day.items.map((item) => <PlanItem item={item} exerciseById={exerciseById} key={item.activityId} />)}
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
      <a class="text-link" href="#/project/p-foundations-data-checker">CLI-Projekt öffnen</a>
    </article>
  );
}

function FollowUpCard({ executableReviews, nextNonReview, exerciseById }: {
  executableReviews: Array<{ exerciseId: string }>;
  nextNonReview: LearningPlanItem | undefined;
  exerciseById: Map<string, CatalogData['exercises'][number]>;
}) {
  if (executableReviews.length > 0) {
    return nextNonReview ? (
      <article class="status-card">
        <p class="card-kicker">Nächster Schritt danach</p>
        <h2>{itemTitle(nextNonReview, exerciseById)}</h2>
        <p>{reasonLabel(nextNonReview)}</p>
        <a class="text-link" href={nextNonReview.route}>Öffnen</a>
      </article>
    ) : null;
  }
  return (
    <article class="status-card">
      <p class="card-kicker">Wiederholen</p>
      <h2>Keine Reviews fällig</h2>
      <p>Fällige Aufgaben-Reviews erscheinen hier, sobald ein Abruf ansteht.</p>
      <a class="text-link" href="#/review">Review-Queue öffnen</a>
    </article>
  );
}

function recommendation(
  progress: ProgressSnapshot,
  plan: ReturnType<typeof buildWeeklyLearningPlan>,
  reviews: Array<{ exerciseId: string }>,
  exerciseById: Map<string, CatalogData['exercises'][number]>,
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
      title: itemTitle(firstItem, exerciseById),
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
  const { executable: executableReviews } = partitionReviewQueue(progress.dueReviews, exerciseById.keys());
  const primary = recommendation(progress, plan, executableReviews, exerciseById);
  const nextNonReview = plan.days.flatMap((day) => day.items).find((item) => item.type !== 'review');
  return (
    <section class="view" aria-labelledby="today-title">
      <header class="view-header">
        <p class="eyebrow">Dein Lernfenster</p>
        <h1 id="today-title" tabIndex={-1}>Heute</h1>
      </header>
      <div class="today-grid">
        <article class="primary-card">
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
        <FollowUpCard executableReviews={executableReviews} nextNonReview={nextNonReview} exerciseById={exerciseById} />
      </div>
      <section class="weekly-plan" aria-labelledby="weekly-plan-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Deterministischer Vorschlag</p>
            <h2 id="weekly-plan-title">Dein Wochenplan</h2>
          </div>
          <span>{plan.totalMinutes} von {plan.availableMinutes} Min. · <a href="#/settings">Budget anpassen</a></span>
        </div>
        <details class="policy">
          <summary>Wie entsteht der Plan?</summary>
          <p>Bis zu 35 Prozent des Budgets sind für fällige Reviews reserviert. Die Quote und Reviewabstände sind konfigurierbare Produktheuristiken.</p>
        </details>
        {plan.days.some((day) => day.items.length) ? (
          <Carousel label="Wochenplan-Tage">
            {plan.days.filter((day) => day.items.length).map((day) => <PlanDay day={day} exerciseById={exerciseById} key={day.day} />)}
          </Carousel>
        ) : (
          <div class="empty-state">
            <h3>Kein Plan im aktuellen Budget</h3>
            <p>Erhöhe das Wochenbudget oder wähle den nächsten Bereich frei im Katalog.</p>
          </div>
        )}
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
