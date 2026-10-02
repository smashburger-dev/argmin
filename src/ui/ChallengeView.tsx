import { useEffect, useMemo, useState } from 'preact/hooks';
import { progress as progressStore } from '../../assets/js/core/progress_store.js';
import { solvedChallengeCount } from '../../assets/js/domain/challenge_picker.mjs';
import { loadChallengeSet, type ChallengeAttemptRecord, type ChallengeSet } from '../adapters/challenge';
import { loadFamilyIndex } from '../adapters/content-repository';
import type { ProgressSnapshot } from '../adapters/local-progress';
import { activityLabel } from './exercise-context';
import { Button } from './Button';
import type { CatalogData } from '../app/types';

// Daily-challenge view (plan: .agents/plans/2026-09-09-challenge.md).
// Deliberately lazy-loaded via App.tsx: the challenge adapter chain
// (challenge.ts -> challenge_picker.mjs + content-repository) stays out of
// the eager bundle; challenge_picker is self-contained precisely so this
// chain never reaches the family-core chunk.
// The ProgressStore singleton (not the ProgressSnapshot prop) feeds
// loadChallengeSet, matching how local-progress.ts reads the store.

const definitionIdOf = (item: { familyId: string; caseId: string }) => `${item.familyId}:${item.caseId}`;

/** Challenge-flagged cases in the compiled catalog — distinguishes
 *  "catalog ships no challenges yet" (empty pool AND empty flag count)
 *  from "pool empty because no module is active". Also maps case keys to
 *  the compile-time display title and activity type for cases without a
 *  module placement (contract:null families expose neither otherwise). */
function flaggedCaseIndex(): { count: number; meta: Map<string, { title?: string; activityType?: string }> } {
  const meta = new Map<string, { title?: string; activityType?: string }>();
  let count = 0;
  for (const family of loadFamilyIndex()) {
    for (const entry of family.cases ?? []) {
      if (entry.challengeEligible !== true) continue;
      count += 1;
      meta.set(`${family.familyId}:${entry.caseId}`, { title: entry.title, activityType: entry.activityType });
    }
  }
  return { count, meta };
}

interface ChallengeViewState {
  set: ChallengeSet;
  /** definitionIds of today's items already solved in challenge context. */
  solvedIds: Set<string>;
  eligibleCount: number;
  /** Compiled display meta for flagged cases (key: familyId:caseId). */
  caseMeta: Map<string, { title?: string; activityType?: string }>;
}

function streakLabel(days: number) {
  return days === 1 ? '1 Tag in Folge' : `${days} Tage in Folge`;
}

export function ChallengeView({ catalog, progress }: { catalog: CatalogData; progress: ProgressSnapshot }) {
  const [state, setState] = useState<ChallengeViewState | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // `progress` (the snapshot) is a refresh signal: App re-renders it after
  // every learning-progress-changed event, so re-running the effect picks
  // up solves without a local event subscription.
  useEffect(() => {
    let live = true;
    const nowMs = Date.now();
    void (async () => {
      try {
        const [set, records] = await Promise.all([
          loadChallengeSet(progressStore, catalog, nowMs),
          progressStore ? progressStore.allOf('attempts') : Promise.resolve([]),
        ]);
        // Per-item solved state: solvedChallengeCount applied to a single
        // item yields 0|1 — reuses the authoritative predicate instead of
        // duplicating its context/correct/revealed rules in the view.
        const attempts = records as ChallengeAttemptRecord[];
        const solvedIds = new Set(
          set.items
            .filter((item) => solvedChallengeCount([item], attempts, nowMs) > 0)
            .map(definitionIdOf),
        );
        const flagged = flaggedCaseIndex();
        if (live) setState({ set, solvedIds, eligibleCount: flagged.count, caseMeta: flagged.meta });
      } catch (error) {
        if (live) setFailed(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => { live = false; };
  }, [catalog, progress]);

  const exerciseByKey = useMemo(
    () => new Map(catalog.exercises.map((exercise) => [`${exercise.familyId}:${exercise.caseId}`, exercise])),
    [catalog],
  );
  const familyById = useMemo(
    () => new Map((catalog.families ?? []).map((family) => [family.familyId, family])),
    [catalog],
  );
  const modulesByFamily = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const module of catalog.learningModules) {
      for (const placement of module.placements) {
        const titles = map.get(placement.familyId) ?? [];
        if (!titles.includes(module.title)) titles.push(module.title);
        map.set(placement.familyId, titles);
      }
    }
    return map;
  }, [catalog]);

  if (failed) {
    return (
      <section class="view" aria-labelledby="challenge-title">
        <header class="view-header"><h1 id="challenge-title" tabIndex={-1}>Challenge</h1></header>
        <p role="alert" class="content-error">Challenge-Set konnte nicht geladen werden: {failed}</p>
      </section>
    );
  }
  if (!state) {
    return (
      <section class="view" data-tour="challenge-view" aria-labelledby="challenge-title" aria-busy="true">
        <header class="view-header"><h1 id="challenge-title" tabIndex={-1}>Challenge</h1></header>
        <p role="status">Challenge-Set wird geladen.</p>
      </section>
    );
  }

  const { set, solvedIds, eligibleCount, caseMeta } = state;
  return (
    <section class="view challenge-view" data-tour="challenge-view" aria-labelledby="challenge-title">
      <header class="view-header">
        <p class="eyebrow">Festes Set pro Tag</p>
        <h1 id="challenge-title" tabIndex={-1}>Challenge</h1>
        <p class="lede">Jeden Tag ein deterministisch gezogenes Set schwerer Aufgaben aus deinen aktiven Modulen — ohne Wiederholung innerhalb des Fensters.</p>
      </header>
      {set.streak > 0 || set.items.length > 0 ? (
        <div class="challenge-meta">
          {set.streak > 0 ? <span class="challenge-stat"><strong>{set.streak}</strong> {set.streak === 1 ? 'Tag' : 'Tage'} in Folge</span> : null}
          {set.items.length > 0 ? <span class="challenge-stat"><strong>{set.solvedToday}</strong> von {set.items.length} heute gelöst</span> : null}
          {set.windowDays > 0 && (set.windowDays < 30 || set.shortfall)
            ? <span class="tag">Fenster {set.windowDays} Tage</span>
            : null}
        </div>
      ) : null}
      {set.items.length > 0 ? (
        <div class="challenge-grid">
          {set.items.map((item) => {
            const definitionId = definitionIdOf(item);
            const solved = solvedIds.has(definitionId);
            const exercise = exerciseByKey.get(definitionId);
            const family = familyById.get(item.familyId);
            const moduleTitles = modulesByFamily.get(item.familyId) ?? [];
            const meta = caseMeta.get(definitionId);
            return (
              <article class={solved ? 'challenge-card is-solved' : 'challenge-card'} key={definitionId}>
                <p class="card-kicker">
                  {moduleTitles.join(' · ') || 'Challenge'}
                  <span class="tag">
                    {activityLabel(exercise?.activityType ?? family?.activityType ?? meta?.activityType)}
                    {exercise?.estimatedMinutes ? ` · ~${exercise.estimatedMinutes} Min.` : ''}
                  </span>
                  {solved ? <span class="tag challenge-tag-solved">Gelöst</span> : null}
                </p>
                <h2>{meta?.title ?? exercise?.title ?? item.caseId}</h2>
                {family?.summary ? <p>{family.summary}</p> : null}
                <div class="actions">
                  <Button variant="primary" href={`#/family/${item.familyId}/${item.caseId}/${item.seed}/challenge?from=challenge`}>
                    {solved ? 'Nochmal lösen' : 'Challenge öffnen'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : eligibleCount === 0 ? (
        <div class="empty-state">
          <h3>Noch keine Challenges im Katalog</h3>
          <p>Der Katalog enthält aktuell keine als Challenge markierten Fälle. Sobald Module schwierige Varianten freigeben, erscheint hier dein Tages-Set.</p>
          <a class="text-link" href="#/learn">Zum Lernpfad →</a>
        </div>
      ) : (
        <div class="empty-state">
          <h3>{set.count === 0 ? 'Kein aktives Modul' : 'Alles im Fenster gespielt'}</h3>
          <p>{set.count === 0
            ? 'Challenges entstehen aus Modulen, mit denen du schon arbeitest. Starte ein Modul, damit der Pool sich füllt.'
            : `Alle verfügbaren Challenge-Fälle wurden innerhalb des ${set.windowDays}-Tage-Fensters schon gezogen — morgen gibt es ein neues Set.`}</p>
          <Button variant="primary" href="#/learn">Modul starten</Button>
        </div>
      )}
      {set.shortfall && set.items.length > 0 ? (
        <p class="plan-note">Heute sind nur {set.items.length} von {set.count} Challenges verfügbar — der Rest liegt im No-Repeat-Fenster. Fehlende Plätze werden nicht mit Wiederholungen aufgefüllt.</p>
      ) : null}
    </section>
  );
}

/** Quadrant card for TodayView's .today-grid. Mounted lazily so the
 *  challenge adapter chain never lands in the eager bundle. Returns null
 *  until the set is loaded and whenever
 *  there is nothing worth teasing — no skeleton, no layout shift cost for
 *  the common "no challenges" state. */
export function ChallengeTeaser({ catalog }: { catalog: CatalogData }) {
  const [set, setSet] = useState<ChallengeSet | null>(null);
  useEffect(() => {
    let live = true;
    void loadChallengeSet(progressStore, catalog)
      .then((next) => { if (live) setSet(next); })
      .catch(() => { /* teaser is optional — stay hidden on failure */ });
    return () => { live = false; };
  }, [catalog]);
  if (!set || (set.items.length === 0 && set.streak === 0)) return null;
  return (
    <article class="status-card challenge-teaser">
      <p class="card-kicker">Challenge</p>
      <h2>Tageschallenge</h2>
      <p class="meter-label">
        {set.items.length > 0 ? `${set.solvedToday} von ${set.items.length} heute gelöst` : null}
        {set.items.length > 0 && set.streak > 0 ? ' · ' : ''}
        {set.streak > 0 ? streakLabel(set.streak) : null}
      </p>
      <a class="text-link" href="#/challenge">Zum Tages-Set →</a>
    </article>
  );
}
