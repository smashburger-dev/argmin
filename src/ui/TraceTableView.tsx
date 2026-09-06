import { useState } from 'preact/hooks';
import { familyEventInput, familyHint } from '../../assets/js/domain/exercise_registry.mjs';
import { gradeTraceTable } from '../../assets/js/core/foundations_trace_families.mjs';
import { learningLedger } from '../../assets/js/core/learning_ledger.mjs';
import { progress } from '../../assets/js/core/progress_store.js';

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
  prompt: string;
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

export function TraceTableView({ instance, summary }: { instance: TraceTableInstance; summary?: string }) {
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

  return (
    <section class="view" aria-labelledby="trace-title">
      <header class="view-header">
        <p class="eyebrow">{instance.familyId} · {instance.caseId} · Seed {instance.seed}</p>
        <h1 id="trace-title" tabIndex={-1}>Zustandstabelle</h1>
      </header>
      <p>{instance.prompt}</p>
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
      <button class="button button-primary" disabled={busy || revealed || verdict?.correct === true} onClick={submit}>Tabelle prüfen</button>
      {' '}
      <button class="button" disabled={revealed || verdict?.correct === true} onClick={() => void (async () => {
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
      })()}>Lösung zeigen</button>
      {failed ? <p role="alert" class="content-error">{failed}</p> : null}
      {verdict && verdict.correct ? <h2>Richtig, alle Zustände stimmen.</h2> : null}
      {verdict && !verdict.correct && verdict.firstBadRow !== null
        ? <h2>Zeile {verdict.firstBadRow + 1} stimmt noch nicht{verdict.firstBadVar ? ` (${verdict.firstBadVar})` : ''}. Prüfe die Zuweisung in dieser Zeile.</h2>
        : null}
      {revealed ? <p>Offenlegung, kein Beleg. Versuche die nächste Variante aus dem Kopf.</p> : null}
      <div class="hint-stack">{shownHints.map((hint) => <p key={hint}><strong>Hinweis</strong> {hint}</p>)}</div>
      {shownHints.length < 2 && !revealed && verdict?.correct !== true ? <button class="text-button" type="button" onClick={() => void openHint()}>Hinweis öffnen</button> : null}
      {verdict?.correct === true && masteryNote ? <p>Kann als Kompetenzbeleg zählen.</p> : null}
      {verdict?.correct === true && reviewDueAt ? <p>Nächstes Review: {reviewDueAt}</p> : null}
      <p><a href="#/learn">Zurück zum Lernen</a></p>
    </section>
  );
}
