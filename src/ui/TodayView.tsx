import { useMemo } from 'preact/hooks';
import type { CatalogData } from '../app/types';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { buildWeeklyLearningPlan, type LearningPlanItem } from '../adapters/learning-plan';
import { partitionReviewQueue } from '../../assets/js/domain/review_partition.mjs';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { Button } from './Button';
import { Carousel } from './Carousel';
import { learnerExerciseLabel, minutesLabel } from './learner-labels';

const TODAY_BOOSTS = [
  'geht die Rechnung auf.',
  'bleibt kein Rest.',
  'wird der Nenner nicht null.',
  'folgt q.e.d.',
  'sitzt die Induktion.',
  'wird nicht geraten.',
  'löst du, was gestern klemmte.',
  'stimmt das Vorzeichen.',
  'knackst du erst den harten Brocken.',
  'wird aus Raten Wissen.',
  'gibt es keine halben Beweise.',
  'hältst du die Kette bis zum Ende.',
  'stimmt jede Umformung.',
  'wird jede Lücke geschlossen.',
  'läuft alles grün.',
  'kompiliert es beim ersten Mal.',
  'gilt: erst denken, dann tippen.',
  'trifft jede Schätzung.',
  'wird widerlegt, was wackelt.',
  'reicht ein Anlauf.',
];

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
  const covered = (item: CatalogData['milestones'][number]) =>
    item.competencyIds.filter((id) => ['demonstrated', 'retained'].includes(progress.evidenceStates[id] ?? '')).length;
  // Aktueller Milestone = erster nicht vollständig nachgewiesener in
  // Katalog-Reihenfolge; sind alle erfüllt, steht der letzte als erreicht da.
  const current = catalog.milestones.find((item) => covered(item) < item.competencyIds.length)
    ?? catalog.milestones[catalog.milestones.length - 1];
  if (!current) return null;
  const evidenceCount = covered(current);
  const total = current.competencyIds.length;
  const reached = evidenceCount >= total;
  const percent = total ? Math.round(evidenceCount / total * 100) : 0;
  return (
    <article class="status-card milestone-card">
      <p class="card-kicker">{reached ? 'Milestone erreicht' : 'Aktueller Milestone'}</p>
      <h2>{current.title}</h2>
      <p class="milestone-sub">{current.description}</p>
      <div class="meter meter-lg" aria-label={`${evidenceCount} von ${total} Kompetenzen`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} role="meter">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p class="meter-label">{evidenceCount} von {total} Kompetenzen{reached ? ' — erreicht.' : '.'}</p>
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
  if (executableReviews.length === 0) return null;
  return nextNonReview ? (
    <article class="status-card">
      <p class="card-kicker">Nächster Schritt danach</p>
      <h2>{itemTitle(nextNonReview, exerciseById, competencyById)}</h2>
      <p>{reasonLabel(nextNonReview)}</p>
      <a class="text-link" href={nextNonReview.route}>Öffnen</a>
    </article>
  ) : null;
}

function relativeDay(occurredAt: string) {
  const elapsedDays = Math.floor((Date.now() - Date.parse(occurredAt)) / 86400000);
  if (elapsedDays <= 0) return 'heute';
  if (elapsedDays === 1) return 'gestern';
  return `vor ${elapsedDays} Tagen`;
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
  const lastAttempt = progress.lastAttempt;
  const lastExercise = lastAttempt ? exerciseById.get(lastAttempt.definitionId) : undefined;
  const lastContext = lastAttempt && lastExercise
    ? catalog.learningModules.find((item) => item.placements.some((placement) => placement.definitionId === lastExercise.definitionId))?.title
      ?? catalog.competencies.find((item) => lastExercise.competencyIds.includes(item.competencyId))?.title
    : undefined;
  const resume = lastAttempt && lastExercise && lastContext
    ? { href: routeForDefinition(lastExercise), label: `Weitermachen: ${lastContext} · ${relativeDay(lastAttempt.occurredAt)}` }
    : null;
  return (
    <section class="view" aria-labelledby="today-title">
      <header class="view-header">
        <h1 id="today-title" tabIndex={-1}>Heute <span class="today-boost">{TODAY_BOOSTS[Math.floor(Date.now() / 86400000) % TODAY_BOOSTS.length]}</span></h1>
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
          {resume ? <a class="text-link resume-link" href={resume.href}>{resume.label}</a> : null}
        </article>
        <MilestoneCard catalog={catalog} progress={progress} />
        <FollowUpCard executableReviews={executableReviews} nextNonReview={nextNonReview} exerciseById={exerciseById} competencyById={competencyById} />
      </div>
      <section class="weekly-plan" aria-labelledby="weekly-plan-title" data-tour="today-plan">
        <div class="section-heading">
          <div>
            <h2 id="weekly-plan-title">Dein Wochenplan</h2>
          </div>
          <span>{plan.totalMinutes} von {plan.availableMinutes} Min. · <a href="#/settings">Budget anpassen</a></span>
        </div>
        {progress.attemptsCount === 0 ? <p class="plan-note">Vorläufiger Plan. Kurze Aufgaben liefern belastbarere Hinweise als Selbsteinschätzung allein. Nach der Diagnose fällt Nachgewiesenes heraus.</p> : null}
        {plan.days.some((day) => day.items.length) ? (
          <Carousel label="Wochenplan-Tage">
            {plan.days.filter((day) => day.items.length).map((day) => <PlanDay day={day} exerciseById={exerciseById} competencyById={competencyById} key={day.day} />)}
          </Carousel>
        ) : trackDone ? (
          <div class="empty-state">
            <h3>Pfad geschafft</h3>
            <p>Alle Kompetenzen in diesem Pfad sind nachgewiesen. Reviews halten sie frisch, oder du wechselst den Pfad in den <a href="#/settings">Einstellungen</a>.</p>
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
    </section>
  );
}
