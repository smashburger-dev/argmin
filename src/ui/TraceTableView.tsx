import { useState } from 'preact/hooks';
import { familyEventInput, familyHint } from '../../assets/js/domain/exercise_registry.mjs';
import { gradeTraceTable } from '../../assets/js/core/foundations_trace_families.mjs';
import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import { progress } from '../../assets/js/core/progress_store.js';
import { MathMarkup } from './MathMarkup';
import { Button } from './Button';
import { ExerciseFrame } from './ExerciseFrame';
import { getExerciseContext } from './exercise-context';
import type { CatalogData } from '../app/types';

// S4D1: Trace-Tabelle als Interaktionsvariante von output-predict-lines.
// Kein neuer Archetyp: Lösungsweg und Evidence bleiben gleich, nur die
// Eingabe ist eine Zustandstabelle statt getippter Ausgabezeilen.
// Erwartet eine Familien-Instanz mit traceTable (Trace-Familien liefern
// das Feld, sobald der Generator Zustände kennt; sonst fällt die Ansicht
// auf die normale Familienübung zurück).
export interface TraceTableData {
  lines: string[];
  stateVars: string[];
  expectedStates: Array<Record<string, string>>;
}

export interface TraceTableInstance {
  familyId: string;
  caseId: string;
  seed: number;
  difficulty: string;
  activityType: string;
  prompt: string;
  parameters?: { snippet?: unknown };
  traceTable: TraceTableData;
  fullSolution?: string;
}

export interface TraceTableVerdict {
  correct: boolean;
  firstBadRow: number | null;
  firstBadVar: string | null;
}

function emptyStates(rows: number, vars: string[]): Array<Record<string, string>> {
  return Array.from({ length: rows }, () => Object.fromEntries(vars.map((name) => [name, ''])));
}

export function TraceTableView({ catalog, instance, summary }: { catalog: CatalogData; instance: TraceTableInstance; summary?: string }) {
  const table = instance.traceTable;
  const rows = table.lines.length;
  const [cells, setCells] = useState<Array<Record<string, string>>>(() => emptyStates(rows, table.stateVars));
  const [verdict, setVerdict] = useState<TraceTableVerdict | null>(null);
  const [shownHints, setShownHints] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewDueAt, setReviewDueAt] = useState<string | null>(null);
  const [masteryNote, setMasteryNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const setCell = (row: number, name: string, value: string) => {
    setCells((prev) => prev.map((entry, index) => (index === row ? { ...entry, [name]: value } : entry)));
  };

  const openHint = async () => {
    const level = shownHints.length + 1;
    const hint = familyHint(
      { summary, activityType: 'predict-output', traceTable: table },
      { level, firstBadRow: verdict && !verdict.correct ? verdict.firstBadRow : null },
    );
    if (!hint) return;
    setShownHints((current) => [...current, hint]);
    if (learningLedger) {
      await learningLedger.record({
        ...familyEventInput(instance as never),
        eventType: 'hint-used',
        event: `hint-${level}`,
        hintsUsed: level,
        revealedSolution: false,
      });
    }
  };

  const submit = async () => {
    if (busy || revealed) return;
    setBusy(true);
    setFailed(null);
    try {
      const result = gradeTraceTable(table, cells) as TraceTableVerdict;
      const input = familyEventInput(instance as never);
      if (learningLedger) {
        await learningLedger.record({
          ...input,
          eventType: 'attempt',
          answer: JSON.stringify(cells),
          hintsUsed: shownHints.length,
          correct: result.correct,
          masteryEligible: input.masteryEligible,
          errorType: result.correct || result.firstBadRow === null
            ? null
            : `trace-row-${result.firstBadRow + 1}`,
        });
      }
      setVerdict(result);
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

  const ctx = getExerciseContext(catalog, instance, summary || 'Aufgabe');
  const feedback = failed
    ? <p role="alert" class="content-error">{failed}</p>
    : verdict?.correct
      ? <div class="feedback-box correct">
          <p class="feedback-title">Richtig, alle Zustände stimmen.</p>
          {masteryNote ? <p class="feedback-detail">Kann als Kompetenzbeleg zählen.</p> : null}
          {reviewDueAt ? <p class="feedback-detail">Nächstes Review: {new Date(reviewDueAt).toLocaleDateString('de-DE')}</p> : null}
        </div>
      : verdict
        ? <div class="feedback-box incorrect">
            <p class="feedback-title">Zeile {verdict.firstBadRow === null ? '?' : verdict.firstBadRow + 1} stimmt noch nicht{verdict.firstBadVar ? ` (${verdict.firstBadVar})` : ''}.</p>
            <p class="feedback-detail">Prüfe die Zuweisung in dieser Zeile.</p>
          </div>
        : revealed
          ? <div class="feedback-box incorrect"><p class="feedback-title">Offenlegung, kein Beleg.</p><p class="feedback-detail">Versuche die nächste Variante aus dem Kopf.</p></div>
          : null;
  const answer = (
    <>
      <p>Trage nach jeder Zeile die Werte aller Variablen ein. Noch unbelegte Zellen bleiben leer.</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Zeile</th>
            {table.stateVars.map((name) => <th scope="col" key={name}><code>{name}</code></th>)}
          </tr>
        </thead>
        <tbody>
          {table.lines.map((line, row) => (
            <tr key={row} aria-current={verdict && !verdict.correct && verdict.firstBadRow === row ? 'true' : undefined}>
              <th scope="row"><code>{line}</code></th>
              {table.stateVars.map((name) => (
                <td key={name}>
                  <input
                    type="text"
                    aria-label={`Zeile ${row + 1}, ${name}`}
                    value={revealed ? String(table.expectedStates[row]?.[name] ?? '') : (cells[row]?.[name] ?? '')}
                    disabled={revealed || (verdict?.correct === true)}
                    onInput={(event) => setCell(row, name, (event.target as HTMLInputElement).value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
  return (
    <ExerciseFrame
      ctx={ctx}
      eyebrow={`${ctx.difficultyLabel} · Variante ${instance.seed}`}
      prompt={<MathMarkup html={instance.prompt} />}
      snippet={typeof instance.parameters?.snippet === 'string' ? instance.parameters.snippet : undefined}
      answer={answer}
      actions={
        <>
          <Button variant="primary" disabled={busy || revealed || verdict?.correct === true} onClick={submit}>Tabelle prüfen</Button>
          {shownHints.length < 2 && !revealed && verdict?.correct !== true ? <Button variant="secondary" disabled={busy} onClick={() => void openHint()}>Hinweis {shownHints.length + 1}/2</Button> : null}
          {!revealed && verdict?.correct !== true ? <Button variant="ghost" onClick={() => void (async () => {
            if (!window.confirm('Lösung ansehen? Diese Variante kann danach keinen Kompetenznachweis mehr liefern.')) return;
            setRevealed(true);
            setVerdict(null);
            if (learningLedger) {
              await learningLedger.record({
                ...familyEventInput(instance as never),
                eventType: 'solution-revealed',
                event: 'solution-revealed',
                hintsUsed: shownHints.length,
                revealedSolution: true,
              });
            }
          })()}>Lösung anzeigen</Button> : null}
        </>
      }
      feedback={feedback}
      hints={shownHints}
      solution={revealed ? <div class="solution-panel"><h2>Lösung</h2><p>Die erwarteten Zustände stehen jetzt in der Tabelle.</p></div> : undefined}
      done={revealed || verdict?.correct === true}
    />
  );
}
