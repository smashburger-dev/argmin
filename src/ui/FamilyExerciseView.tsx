import { useEffect, useState } from 'preact/hooks';
import { EXERCISE_FAMILIES, configureExerciseFamilies, familyEventInput, familyHint } from '../../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../../assets/js/domain/family_registry.mjs';
import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import { progress } from '../../assets/js/core/progress_store.js';
import { loadFamilyCases, loadFamilyIndex } from '../adapters/content-repository';
import { AnswerControls } from './AnswerControls';
import { CodeEditor } from './CodeEditor';
import { MathMarkup } from './MathMarkup';
import { TraceTableView } from './TraceTableView';

// S4D0: öffnet kuratierte Familien-Placements ohne definitionId.
// Route: #/family/:familyId/:caseId/:seed/:difficulty, '-' heißt Zufall.
// S4D2: Antwort-Inputs je Aktivitätstyp,
// domänenspezifische Hinweise mit Ledger-Zählung, Offenlegung mit
// Mastery-Disqualifikation. Trace-Tabelle bleibt eigene Variante.
function parseFamilyRef(ref: string): {
  familyId: string;
  caseId?: string;
  seed: number;
  difficulty: string;
} {
  const [familyId = '', casePart = '', seedPart = '', difficulty = ''] = String(ref).split('/');
  if (!familyId) throw new Error('Familie fehlt.');
  if (!difficulty) throw new Error('Profil fehlt.');
  const caseId = casePart && casePart !== '-' ? casePart : undefined;
  const seed = seedPart === '-' || seedPart === ''
    ? Math.floor(Math.random() * 2 ** 31)
    : /^\d+$/.test(seedPart)
      ? Number(seedPart) >>> 0
      : (() => { throw new Error(`Seed ungültig: ${seedPart}`); })();
  return { familyId, caseId, seed, difficulty };
}

configureExerciseFamilies(loadFamilyIndex());

export function FamilyExerciseView({ familyRef }: { familyRef: string }) {
  const [answer, setAnswer] = useState<unknown>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [shownHints, setShownHints] = useState<string[]>([]);
  const [reviewDueAt, setReviewDueAt] = useState<string | null>(null);
  const [masteryNote, setMasteryNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [instance, setInstance] = useState<ReturnType<typeof EXERCISE_FAMILIES.instantiate> | null>(null);
  const [summary, setSummary] = useState('');

  let parsed: ReturnType<typeof parseFamilyRef> | null = null;
  let parseError: unknown = null;
  try {
    parsed = parseFamilyRef(familyRef);
  } catch (error) {
    parseError = error;
  }

  useEffect(() => {
    let active = true;
    setInstance(null);
    setFailed(null);
    if (!parsed) return () => { active = false; };
    void (async () => {
      try {
        const body = await loadFamilyCases(parsed.familyId);
        if (body) registerStaticCases(parsed.familyId, body.cases);
        const next = EXERCISE_FAMILIES.instantiate(parsed.familyId, parsed.seed, parsed.difficulty, parsed.caseId);
        if (!active) return;
        setSummary(EXERCISE_FAMILIES.get(parsed.familyId)?.summary ?? '');
        setAnswer(typeof next.parameters?.starterCode === 'string' ? next.parameters.starterCode : null);
        setInstance(next);
      } catch (error) {
        if (active) setFailed(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => { active = false; };
  }, [familyRef]);

  if (parseError) {
    return <section class="view"><h1 tabIndex={-1}>Variante nicht gefunden</h1><p role="alert" class="content-error">{parseError instanceof Error ? parseError.message : String(parseError)}</p></section>;
  }
  if (!instance) {
    return <section class="view"><h1 tabIndex={-1}>{failed ? 'Variante nicht gefunden' : 'Variante wird geladen'}</h1>{failed ? <p role="alert" class="content-error">{failed}</p> : <p>Bitte kurz warten.</p>}</section>;
  }

  // S4D1: Trace-Tabelle als Interaktionsvariante, sobald der Generator
  // Zustände kennt (instance.traceTable). Sonst normale Familienübung.
  if (instance.traceTable) {
    return <TraceTableView instance={{ ...instance, traceTable: instance.traceTable }} summary={summary} />;
  }

  const recordAssistance = async (eventType: string, event: string, hintsUsed: number, revealedSolution: boolean) => {
    if (!learningLedger) return;
    await learningLedger.record({
      ...familyEventInput(instance),
      eventType,
      event,
      hintsUsed,
      revealedSolution,
    });
  };

  const submit = async () => {
    if (answer === null || answer === undefined || answer === '' || busy || solutionVisible) return;
    setBusy(true);
    setFailed(null);
    try {
      const result = await EXERCISE_FAMILIES.grade(instance, answer);
      const input = familyEventInput(instance);
      const hintsUsed = shownHints.length;
      if (learningLedger) {
        await learningLedger.record({
          ...input,
          eventType: 'attempt',
          answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
          hintsUsed,
          correct: Boolean(result.correct),
          masteryEligible: input.masteryEligible,
          errorType: result.errorType ?? null,
        });
      }
      setCorrect(Boolean(result.correct));
      setErrorType(result.errorType ?? null);
      setVerdict(result.verdictText || (result.correct ? 'Richtig.' : 'Nicht richtig.'));
      if (result.correct && input.masteryEligible) setMasteryNote(true);
      if (result.correct && progress) {
        const entry = (await progress.reviewQueueAll()).find((item: { exerciseId: string }) => item.exerciseId === input.definitionId);
        setReviewDueAt(entry?.nextDueAt ?? null);
      }
    } catch (error) {
      setFailed(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const openHint = async () => {
    const level = shownHints.length + 1;
    const hint = familyHint(
      {
        summary,
        activityType: instance.activityType,
        choices: instance.choices,
        parameters: instance.parameters,
        expectedAnswer: instance.expectedAnswer,
        traceTable: instance.traceTable,
      },
      { level, answer, correct },
    );
    if (!hint) return;
    setShownHints((current) => [...current, hint]);
    await recordAssistance('hint-used', `hint-${level}`, level, false);
  };

  const revealSolution = async () => {
    if (!instance.fullSolution) return;
    if (!window.confirm('Lösung ansehen? Diese Variante kann danach keinen Kompetenznachweis mehr liefern.')) return;
    setSolutionVisible(true);
    await recordAssistance('solution-revealed', 'solution-revealed', shownHints.length, true);
  };

  const isCode = instance.activityType === 'python-code';
  const starterCode = isCode && instance.parameters && typeof instance.parameters.starterCode === 'string'
    ? instance.parameters.starterCode
    : '';

  return (
    <section class="view" aria-labelledby="family-title">
      <header class="view-header">
        <p class="eyebrow">{instance.familyId} · {instance.caseId} · Seed {instance.seed}</p>
        <h1 id="family-title" tabIndex={-1}>Variante üben</h1>
      </header>
      <div class="lede"><MathMarkup html={instance.prompt} /></div>
      {isCode
        ? <CodeEditor initialValue={starterCode} onChange={(value: string) => setAnswer(value)} />
        : <AnswerControls exercise={instance} onAnswer={setAnswer} />}
      <button class="button button-primary" disabled={busy || solutionVisible} onClick={submit}>Antwort prüfen</button>
      {failed ? <p role="alert" class="content-error">{failed}</p> : null}
      {verdict ? <h2>{verdict}</h2> : null}
      {correct === true && masteryNote ? <p>Kann als Kompetenzbeleg zählen.</p> : null}
      {correct === true && reviewDueAt ? <p>Nächstes Review: {reviewDueAt}</p> : null}
      {correct === false && errorType ? <p>Fehlertyp: {errorType}</p> : null}
      <div class="hint-stack">{shownHints.map((hint) => <p key={hint}><strong>Hinweis</strong> {hint}</p>)}</div>
      {shownHints.length < 2 && !solutionVisible ? <button class="text-button" type="button" onClick={() => void openHint()}>Hinweis öffnen</button> : null}
      {!solutionVisible && instance.fullSolution ? <button class="text-button" type="button" onClick={() => void revealSolution()}>Lösung dieser Variante anzeigen</button> : null}
      {solutionVisible && instance.fullSolution ? <div class="solution-panel"><h2>Lösung</h2><MathMarkup html={instance.fullSolution} /><p>Diese Variante zählt nicht mehr als unabhängiger Kompetenznachweis.</p></div> : null}
      <p><a href="#/learn">Zurück zum Lernen</a></p>
    </section>
  );
}
