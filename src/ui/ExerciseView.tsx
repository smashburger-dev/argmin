import { useEffect, useMemo, useState } from 'preact/hooks';
import { StaticTutor } from '../../assets/js/domain/tutor_engine.mjs';
import { routeForDefinition } from '../../assets/js/domain/activity_route.mjs';
import { drawFreshSeed } from '../../assets/js/domain/fresh_seed.mjs';
import { parseSeedQuery } from '../../assets/js/domain/review_route.mjs';
import type { CatalogData, ExerciseSummary } from '../app/types';
import { findLegacyExerciseSummary, getExercise, loadSources } from '../adapters/content-repository';
import { gradeAndRecord, instantiateExercise, recordAssistance, recordWorkedExample, startNewExerciseCycle, type GradeOutcome } from '../adapters/exercise-session';
import { AnswerControls } from './AnswerControls';
import { MathMarkup } from './MathMarkup';

interface TutorResponse {
  body: string;
  example: string | null;
  counterexample: string | null;
  steps: string[];
  sourceRefs: string[];
  followUpActivityIds: string[];
}

interface TutorEngine {
  respond(input: { competencyIds: string[]; diagnosticCodes: string[]; helpLevel: number }): TutorResponse;
}


function masteryStatus(outcome: GradeOutcome | null) {
  if (!outcome?.correct) return null;
  if (!outcome.masteryEligible) return 'Status: Diagnose-/Reflexionsaufgabe — dieser Versuch zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis.';
  return outcome.reviewDueAt
    ? `Status: Mastery nachgewiesen, gültig bis ${new Date(outcome.reviewDueAt).toLocaleDateString('de-DE')}.`
    : 'Status: Mastery-Nachweis gespeichert.';
}

function WorkedExample({ exercise }: { exercise: ExerciseSummary }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [completionResults, setCompletionResults] = useState<Record<number, boolean>>({});
  const [studyStatus, setStudyStatus] = useState('');
  const example = exercise.workedExample as { title?: string; steps?: Array<{ subgoalLabel?: string; text?: string; completion?: { prompt: string; answer: string } }> } | null;
  if (!example?.steps?.length) return null;
  const study = async () => {
    setOpen(true);
    try {
      await recordWorkedExample(exercise);
      setStudyStatus('Beispiel-Studium erfasst. Das ist kein Mastery-Versuch und sperrt keinen späteren Nachweis.');
    } catch {
      setStudyStatus('Beispiel geöffnet, aber der lokale Lernstand konnte nicht gespeichert werden.');
    }
  };
  const compare = (index: number, expected: string) => {
    const normalize = (value: string) => value.trim().replace(/\s+/g, '').toLocaleLowerCase('de');
    setCompletionResults((current) => ({ ...current, [index]: normalize(answers[index] || '') === normalize(expected) }));
  };
  if (!open) return <section class="worked-example-callout"><p class="card-kicker">Vor dem eigenen Versuch</p><h2>{example.title || 'Gelöstes Beispiel'}</h2><button class="button button-secondary" type="button" onClick={() => void study()}>Beispiel studieren</button></section>;
  return <section class="worked-example-callout" aria-labelledby="worked-example-title"><p class="card-kicker">Gelöstes Beispiel</p><h2 id="worked-example-title">{example.title || 'Lösungsweg untersuchen'}</h2><p role="status">{studyStatus}</p><ol class="worked-example-steps">{example.steps.map((step, index) => <li key={`${step.subgoalLabel}-${index}`}><strong>{step.subgoalLabel || `Schritt ${index + 1}`}</strong>{step.text ? <MathMarkup html={step.text} /> : null}{step.completion ? <div class="completion-check"><label class="answer-field"><span>{step.completion.prompt}</span><input value={answers[index] || ''} onInput={(event) => setAnswers((current) => ({ ...current, [index]: event.currentTarget.value }))} /></label><button class="button button-quiet" type="button" onClick={() => compare(index, step.completion!.answer)}>Vergleichen</button>{index in completionResults ? <p role="status">{completionResults[index] ? 'Richtig — weiter mit dem nächsten Teilziel.' : 'Noch nicht — schau dir die Zeile darüber noch einmal an.'}</p> : null}</div> : null}</li>)}</ol></section>;
}

export function ExerciseView({ catalog, exerciseId }: { catalog: CatalogData; exerciseId: string }) {
  // `?seed=N` (review routes, ADR-0015) forces a fresh instance for
  // generator-backed exercises; without a generator it is a safe no-op.
  // Parsing is strict (digits only) so a broken parameter never coerces
  // to instance 0.
  const [pureId = '', query] = String(exerciseId).split('?');
  const seedParam = query !== undefined ? parseSeedQuery(query) : null;
  const seedOverride = seedParam !== null && Number.isSafeInteger(seedParam) ? seedParam >>> 0 : null;
  const summary = catalog.exercises.find((item) => item.definitionId === pureId) ?? findLegacyExerciseSummary(pureId);
  const [definition, setDefinition] = useState<ExerciseSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seed, setSeed] = useState(summary?.deterministicSeed ?? 0);
  useEffect(() => {
    let live = true;
    setDefinition(null);
    setLoadError(null);
    getExercise(pureId)
      .then((body) => {
        if (!live) return;
        setDefinition(body);
        setSeed(seedOverride !== null && body.generatorId ? seedOverride : body.deterministicSeed);
      })
      .catch((error: Error) => { if (live) setLoadError(error.message); });
    return () => { live = false; };
  }, [pureId, seedOverride]);
  const exercise = useMemo(() => definition ? instantiateExercise(definition, seed) : null, [definition, seed]);
  const [answer, setAnswer] = useState<unknown>(null);
  const [outcome, setOutcome] = useState<GradeOutcome | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cycleRevision, setCycleRevision] = useState(0);
  const tutor = useMemo(() => new StaticTutor(catalog.explanations) as unknown as TutorEngine, [catalog.explanations]);
  const [sources, setSources] = useState<Array<{ sourceId: string; title: string; canonicalUrl: string }> | null>(null);
  useEffect(() => {
    let live = true;
    loadSources().then((all) => { if (live) setSources(all); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!summary) return <section class="view"><h1 tabIndex={-1}>Aufgabe nicht gefunden</h1></section>;
  if (loadError) return <section class="view" aria-labelledby="exercise-title"><h1 id="exercise-title" tabIndex={-1}>{summary.title}</h1><p role="alert" class="content-error">Aufgabe konnte nicht geladen werden: {loadError}</p></section>;
  if (!exercise) return <section class="view" aria-labelledby="exercise-title" aria-busy="true"><h1 id="exercise-title" tabIndex={-1}>{summary.title}</h1><p role="status">Aufgabe wird geladen.</p></section>;
  if (exercise.activityType === 'python-code') return <section class="view"><h1 tabIndex={-1}>Codeaufgabe</h1><a class="button button-primary" href={`#/lab/${exercise.definitionId}`}>Im Codeworkspace öffnen</a></section>;
  const tutorResponse = outcome && !outcome.correct && outcome.errorType
    ? tutor.respond({ competencyIds: exercise.competencyIds, diagnosticCodes: [outcome.errorType], helpLevel: 2 })
    : null;
  const masteryNote = masteryStatus(outcome);

  const check = async () => {
    setBusy(true);
    try {
      setOutcome(await gradeAndRecord(exercise, answer, hintsUsed));
      setAttempted(true);
    } catch (error) {
      setOutcome({ correct: false, verdictText: error instanceof Error ? error.message : String(error), errorType: 'runtime-error' });
    } finally {
      setBusy(false);
    }
  };
  const revealHint = async () => {
    const next = Math.min(exercise.hints.length, hintsUsed + 1);
    setHintsUsed(next);
    await recordAssistance(exercise, next);
  };
  const revealSolution = async () => {
    if (!window.confirm('Lösung ansehen? Diese Instanz kann danach keinen Kompetenznachweis mehr liefern.')) return;
    setSolutionVisible(true);
    await recordAssistance(exercise, hintsUsed, true);
  };
  const newCycle = async () => {
    await startNewExerciseCycle(exercise.definitionId);
    setAnswer(null);
    setOutcome(null);
    setHintsUsed(0);
    setAttempted(false);
    setSolutionVisible(false);
    if (exercise.generatorId) setSeed((value) => drawFreshSeed(exercise.generatorId ?? '', value));
    setCycleRevision((value) => value + 1);
  };

  return (
    <section class="view exercise-view" aria-labelledby="exercise-title">
      <header class="view-header"><p class="eyebrow">Kompetenzaufgabe · {exercise.definitionId} · {exercise.estimatedMinutes} Min.{exercise.generatorId ? ` · Seed ${seed}` : ''}</p><h1 id="exercise-title" tabIndex={-1}>{exercise.title}</h1><div class="lede"><MathMarkup html={exercise.prompt} /></div></header>
      <WorkedExample exercise={exercise} />
      <div class="exercise-layout">
        <section class="exercise-work" aria-label="Antwortbereich">
          <AnswerControls key={`${exercise.definitionId}:${cycleRevision}`} exercise={exercise} onAnswer={setAnswer} />
          <div class="exercise-actions"><button class="button button-primary" type="button" disabled={busy} onClick={() => void check()}>{busy ? 'Prüft…' : 'Antwort prüfen'}</button><button class="button button-secondary" type="button" onClick={() => void newCycle()}>{exercise.generatorId ? 'Neue Variante starten' : 'Neuen sauberen Versuch starten'}</button></div>
        </section>
        <aside class="exercise-feedback">
          <p class="card-kicker">Feedback</p>
          {!outcome && <p>Prüfe zuerst eine eigene Antwort. Hinweise bleiben an diese Instanz gebunden.</p>}
          {outcome && <div role="status" aria-atomic="true" class={outcome.correct ? 'feedback-box correct' : 'feedback-box incorrect'}><h2>{outcome.verdictText}</h2>{outcome.diagnosis && <p>{outcome.diagnosis}</p>}{masteryNote && <p class="mastery-note">{masteryNote}</p>}</div>}
          {tutorResponse && <div class="tutor-card"><strong>Nächster prüfbarer Schritt</strong><MathMarkup html={tutorResponse.body} />{tutorResponse.steps.length > 0 && <ol>{tutorResponse.steps.map((step) => <li key={step}>{step}</li>)}</ol>}{tutorResponse.example ? <div class="tutor-example"><b>Beispiel</b><MathMarkup html={tutorResponse.example} /></div> : null}{tutorResponse.counterexample ? <div class="tutor-example counterexample"><b>Gegenbeispiel</b><MathMarkup html={tutorResponse.counterexample} /></div> : null}{tutorResponse.sourceRefs.length ? <ul class="tutor-links">{tutorResponse.sourceRefs.map((sourceId) => { const source = (sources || []).find((item) => item.sourceId === sourceId); return source ? <li key={sourceId}><a href={source.canonicalUrl} target="_blank" rel="noreferrer">Quelle: {source.title}</a></li> : null; })}</ul> : null}{tutorResponse.followUpActivityIds.length ? <ul class="tutor-links">{tutorResponse.followUpActivityIds.map((activityId) => { const followUp = catalog.exercises.find((item) => item.definitionId === activityId) ?? findLegacyExerciseSummary(activityId); return followUp ? <li key={activityId}><a href={routeForDefinition(followUp)}>Danach: {followUp.title}</a></li> : null; })}</ul> : null}</div>}
          <div class="hint-stack">{exercise.hints.slice(0, hintsUsed).map((hint, index) => <p key={hint}><strong>Hinweis {index + 1}</strong>{hint}</p>)}</div>
          {hintsUsed < exercise.hints.length && <button class="text-button" type="button" onClick={() => void revealHint()}>Nächsten Hinweis öffnen</button>}
          {attempted && !solutionVisible && <button class="text-button" type="button" onClick={() => void revealSolution()}>Lösung dieser Instanz anzeigen</button>}
          {solutionVisible && <div class="solution-panel"><h2>Lösung</h2><MathMarkup html={exercise.fullSolution} /><p>Diese Instanz zählt nicht mehr als unabhängiger Kompetenznachweis.</p></div>}
        </aside>
      </div>
      <a class="text-link" href={`#/competency/${exercise.competencyIds[0]}`}>Zurück zur Kompetenz</a>
    </section>
  );
}
