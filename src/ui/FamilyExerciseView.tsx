import { lazy, Suspense } from 'preact/compat';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { EXERCISE_FAMILIES, configureExerciseFamilies, familyEventInput, familyHint } from '../../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../../assets/js/domain/family_registry.mjs';
import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import { progress } from '../../assets/js/core/progress_store.js';
import { loadFamilyCases, loadFamilyIndex } from '../adapters/content-repository';
import { AnswerControls, FadingPrompt } from './AnswerControls';
import { MathMarkup } from './MathMarkup';
import { Button } from './Button';
import { TraceTableView } from './TraceTableView';
import { ExerciseFrame } from './ExerciseFrame';
import { formatGermanDate } from './format';
import { getExerciseContext, randomVariantSeed } from './exercise-context';
import type { CatalogData } from '../app/types';

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
  from?: string;
} {
  // Query suffix rides inside the hash route (#/family/.../challenge?from=challenge)
  // — split it off before the segment parse so 'from' stays a flag, not a
  // difficulty segment.
  const [path = '', query = ''] = String(ref).split('?');
  const [familyId = '', casePart = '', seedPart = '', difficulty = ''] = path.split('/');
  if (!familyId) throw new Error('Familie fehlt.');
  if (!difficulty) throw new Error('Schwierigkeitsstufe fehlt.');
  const caseId = casePart && casePart !== '-' ? casePart : undefined;
  const seed = seedPart === '-' || seedPart === ''
    ? randomVariantSeed()
    : /^\d+$/.test(seedPart)
      ? Number(seedPart) >>> 0
      : (() => { throw new Error(`Startwert ungültig: ${seedPart}`); })();
  const from = new URLSearchParams(query).get('from') ?? undefined;
  return { familyId, caseId, seed, difficulty, from };
}

// CodeMirror rides in its own lazy chunk: it only ships when a python-code
// task actually opens. If that chunk cannot load (e.g. offline before the
// service worker cached it), the plain textarea keeps the exercise usable.
const CodeEditor = lazy(async () => {
  try {
    const module = await import('./CodeEditor');
    return { default: module.CodeEditor };
  } catch {
    return {
      default: ({ initialValue, onChange }: { initialValue: string; onChange: (value: string) => void }) => (
        <textarea
          class="code-editor-plain"
          rows={14}
          value={initialValue}
          aria-label="Python-Codeeditor"
          aria-describedby="editor-help"
          onInput={(event) => onChange((event.target as HTMLTextAreaElement).value)}
        />
      ),
    };
  }
});

configureExerciseFamilies(loadFamilyIndex());

export function FamilyExerciseView({ catalog, familyRef }: { catalog: CatalogData; familyRef: string }) {
  const [answer, setAnswer] = useState<unknown>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [shownHints, setShownHints] = useState<string[]>([]);
  const [reviewDueAt, setReviewDueAt] = useState<string | null>(null);
  const [masteryNote, setMasteryNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [instance, setInstance] = useState<ReturnType<typeof EXERCISE_FAMILIES.instantiate> | null>(null);
  const [summary, setSummary] = useState('');
  // Frischer Seed pro geladener Variante: Der Link bekommt einen konkreten
  // Seed, damit jeder Klick die Route ändert. Ein literal '-' in der URL
  // würde nach dem ersten Klick Same-Hash-Navigation ohne Reload bedeuten.
  const nextSeed = useMemo(() => randomVariantSeed(), [familyRef]);

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
    return <TraceTableView catalog={catalog} instance={{ ...instance, traceTable: instance.traceTable }} summary={summary} nextSeed={nextSeed} />;
  }

  // Stay-in-challenge flow: ?from=challenge tags ledger events with
  // context 'challenge' (drives streak/solved counts in the picker) and
  // retargets the frame's back button to the challenge overview.
  const fromChallenge = parsed?.from === 'challenge';
  const eventExtra = fromChallenge ? { context: 'challenge' } : {};

  const recordAssistance = async (eventType: string, event: string, hintsUsed: number, revealedSolution: boolean) => {
    if (!learningLedger) return;
    await learningLedger.record({
      ...familyEventInput(instance, eventExtra),
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
      const input = familyEventInput(instance, eventExtra);
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
      setDiagnosis(result.diagnosis ?? null);
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
        hints: instance.hints,
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

  // Hint-Leiter: Level 1 = Familien-Summary, danach authored hints
  // (familyHint serviert sie in Reihenfolge); ohne authored hints bleibt
  // Level 2 der generische Aktivitäts-Hint. Max = Summary + Leiterlänge.
  const maxHintLevel = 1 + Math.max(1, Array.isArray(instance.hints) ? instance.hints.length : 0);
  const isCode = instance.activityType === 'python-code';
  // worked-example-fading: der Prompt IST die Antwortfläche — die [[gap]]-
  // Marker werden inline zu Inputs. Der Prompt-Slot rendert daher das
  // interaktive Widget, der Answer-Bereich bleibt leer.
  const isFading = instance.activityType === 'worked-example-fading';
  const starterCode = isCode && instance.parameters && typeof instance.parameters.starterCode === 'string'
    ? instance.parameters.starterCode
    : '';

  const ctx = getExerciseContext(catalog, instance, summary, nextSeed);
  // Stay inside the challenge window: a fresh variant keeps the context flag,
  // and the "next task" slot points at the remaining daily set instead of the
  // module flow.
  if (fromChallenge) {
    ctx.nextVariantHref = `${ctx.nextVariantHref}?from=challenge`;
    ctx.nextTaskHref = '#/challenge';
    ctx.nextTaskTitle = 'Tages-Set';
  }
  const feedback = failed
    ? <p role="alert" class="content-error">{failed}</p>
    : verdict
      ? <div class={`feedback-box ${correct ? 'correct' : 'incorrect'}`}>
          <p class="feedback-title">{verdict}</p>
          {diagnosis ? <p class="feedback-detail"><MathMarkup html={diagnosis} inline /></p> : null}
          {!correct && Array.isArray(instance.typicalErrors) && instance.typicalErrors.length > 0
            ? <div class="feedback-detail">
                <p>Typische Fehler:</p>
                <ul>{instance.typicalErrors.map((item: string, index: number) => <li key={index}><MathMarkup html={item} inline /></li>)}</ul>
              </div>
            : null}
          {masteryNote ? <p class="feedback-detail">Kann als Kompetenzbeleg zählen.</p> : null}
          {reviewDueAt ? <p class="feedback-detail">Nächstes Review: {formatGermanDate(reviewDueAt)}</p> : null}
          {errorType ? <p class="feedback-detail">Fehlertyp: {errorType}</p> : null}
          {fromChallenge && correct === true
            ? <div class="actions"><Button variant="primary" href="#/challenge">Nächste Challenge</Button></div>
            : null}
        </div>
      : null;
  return (
    <ExerciseFrame
      ctx={ctx}
      eyebrow={`${ctx.difficultyLabel} · Variante ${instance.seed}`}
      prompt={isFading
        ? <FadingPrompt key={instance.instanceId} exercise={instance} onAnswer={setAnswer} />
        : <MathMarkup html={instance.prompt} />}
      snippet={!isCode && !isFading && typeof instance.parameters?.snippet === 'string' ? instance.parameters.snippet : undefined}
      answer={isCode
        ? <Suspense fallback={<p class="editor-loading">Editor wird geladen …</p>}><CodeEditor initialValue={starterCode} onChange={(value: string) => setAnswer(value)} /></Suspense>
        : isFading ? null : <AnswerControls exercise={instance} onAnswer={setAnswer} />}
      actions={
        <>
          <Button variant="primary" disabled={busy || solutionVisible} onClick={submit}>Antwort prüfen</Button>
          {shownHints.length < maxHintLevel && !solutionVisible ? <Button variant="secondary" disabled={busy} onClick={() => void openHint()}>Hinweis {shownHints.length + 1}/{maxHintLevel}</Button> : null}
          {!solutionVisible && instance.fullSolution ? <Button variant="ghost" onClick={() => void revealSolution()}>Lösung anzeigen</Button> : null}
        </>
      }
      feedback={feedback}
      hints={shownHints}
      solution={solutionVisible && instance.fullSolution
        ? <div class="solution-panel"><h2>Lösung</h2><MathMarkup html={instance.fullSolution} /><p>Diese Variante zählt nicht mehr als unabhängiger Kompetenznachweis.</p></div>
        : undefined}
      done={correct === true || solutionVisible}
      backHref={fromChallenge ? '#/challenge' : undefined}
      backLabel={fromChallenge ? 'Zur Challenge' : undefined}
    />
  );
}
