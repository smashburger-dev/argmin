import { useEffect, useRef, useState } from 'preact/hooks';
import type { CatalogData, ExerciseSummary } from '../app/types';
import { getExercise } from '../adapters/content-repository';
import { loadCodeDraft, saveCodeDraft } from '../adapters/local-progress';
import { checkPython, runPython, type WorkspaceResult } from '../adapters/python-workspace';
import { CodeEditor } from './CodeEditor';

export function LabView({ catalog, exerciseId }: { catalog: CatalogData; exerciseId: string }) {
  const summary = catalog.exercises.find((item) => item.definitionId === exerciseId);
  const [exercise, setExercise] = useState<ExerciseSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialCode, setInitialCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<WorkspaceResult | null>(null);
  const [busy, setBusy] = useState<'run' | 'check' | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    let active = true;
    setExercise(null);
    setLoadError(null);
    setInitialCode(null);
    getExercise(exerciseId)
      .then((body) => { if (active) setExercise(body); })
      .catch((error: Error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [exerciseId]);

  useEffect(() => {
    if (!exercise) return;
    let active = true;
    void loadCodeDraft(exercise.definitionId).then((draft) => {
      if (!active) return;
      const value = draft ?? exercise.starterCode ?? '';
      setInitialCode(value);
      setCode(value);
    });
    return () => { active = false; };
  }, [exercise]);

  const latestDraft = useRef<{ id: string | null; code: string }>({ id: null, code: '' });
  useEffect(() => {
    if (!exercise || initialCode === null) return;
    latestDraft.current = { id: exercise.definitionId, code };
    const timer = setTimeout(() => { void saveCodeDraft(exercise.definitionId, code); }, 350);
    return () => clearTimeout(timer);
  }, [code, exercise, initialCode]);
  // Leaving the route before the debounce fires must still persist the
  // latest draft instead of silently dropping the last keystrokes; the
  // unmount-only flush reads the ref so it does not fire per keystroke.
  useEffect(() => () => {
    const { id, code: draft } = latestDraft.current;
    if (id !== null) void saveCodeDraft(id, draft);
  }, []);

  if (loadError) {
    return <section class="view"><header class="view-header"><p class="eyebrow">Codeworkspace</p><h1 tabIndex={-1}>{summary?.title ?? 'Lab'}</h1></header><p role="alert" class="content-error">Aufgabe konnte nicht geladen werden: {loadError}</p></section>;
  }
  if (!exercise) {
    return <section class="view" aria-busy="true"><header class="view-header"><p class="eyebrow">Codeworkspace</p><h1 tabIndex={-1}>{summary?.title ?? 'Lab'}</h1></header><p role="status">Aufgabe wird geladen.</p></section>;
  }
  if (exercise.activityType !== 'python-code') {
    return <section class="view"><header class="view-header"><p class="eyebrow">Codeworkspace</p><h1 tabIndex={-1}>Lab nicht gefunden</h1></header><a class="button button-secondary" href="#/learn">Zur Kompetenzkarte</a></section>;
  }
  const primaryCompetency = catalog.competencies.find((item) => item.competencyId === exercise.competencyIds[0]);
  const labTitle = exercise.title || (primaryCompetency ? `${primaryCompetency.title}: Lab` : 'Python-Lab');

  const execute = async (mode: 'run' | 'check') => {
    setBusy(mode);
    setResult(null);
    try {
      setResult(mode === 'run' ? await runPython(exercise, code) : await checkPython(exercise, code));
    } catch (error) {
      setResult({
        ok: false,
        phase: 'load',
        stdout: '',
        stderr: '',
        stdoutTruncated: false,
        stderrTruncated: false,
        testResults: [],
        errorType: error instanceof Error ? error.name : 'WorkspaceError',
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: 0,
      });
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    const value = exercise.starterCode ?? '';
    setInitialCode(value);
    setCode(value);
    setEditorKey((value) => value + 1);
    setResult(null);
  };

  return (
    <section class="view lab-view" aria-labelledby="lab-title">
      <header class="view-header">
        <p class="eyebrow">Browser-Codeworkspace · {exercise.definitionId}</p>
        <h1 id="lab-title" tabIndex={-1}>{labTitle}</h1>
        <p class="lede">{exercise.prompt}</p>
      </header>
      <div class="lab-layout">
        <section class="editor-panel" aria-labelledby="editor-title">
          <div class="panel-bar"><h2 id="editor-title">main.py</h2><span>Draft lokal gespeichert</span></div>
          {initialCode === null ? <p class="editor-loading" role="status">Editor wird geladen.</p> : <CodeEditor key={editorKey} initialValue={initialCode} onChange={setCode} />}
          <p id="editor-help" class="editor-help">Tab wechselt aus dem Editor. Nutze die sichtbaren Schaltflächen zum Ausführen und Prüfen.</p>
          <div class="lab-actions">
            <button class="button button-secondary" type="button" disabled={busy !== null || initialCode === null} onClick={() => void execute('run')}>{busy === 'run' ? 'Läuft…' : 'Code ausführen'}</button>
            <button class="button button-primary" type="button" disabled={busy !== null || initialCode === null} onClick={() => void execute('check')}>{busy === 'check' ? 'Prüft…' : 'Antwort prüfen'}</button>
            <button class="text-button" type="button" disabled={busy !== null} onClick={reset}>Startercode wiederherstellen</button>
          </div>
        </section>
        <section class="output-panel" aria-labelledby="output-title">
          <div class="panel-bar"><h2 id="output-title">Ausgabe und Tests</h2>{result && <span>{Math.round(result.durationMs)} ms</span>}</div>
          {!result && <div class="output-empty"><p>Führe den Code aus, um stdout und Fehler zu sehen. Prüfen startet zusätzlich die deterministischen Tests.</p></div>}
          {result && <div class="output-content">
            <p role="status" aria-atomic="true" class={result.correct === true ? 'verdict passed' : result.correct === false || !result.ok ? 'verdict failed' : 'verdict'}>{result.verdictText ?? (result.ok ? 'Code lief fehlerfrei.' : 'Code konnte nicht ausgeführt werden.')}</p>
            {result.stdout && <div><h3>stdout{result.stdoutTruncated ? ' · gekürzt' : ''}</h3><pre>{result.stdout}</pre></div>}
            {result.stderr && <div><h3>stderr{result.stderrTruncated ? ' · gekürzt' : ''}</h3><pre>{result.stderr}</pre></div>}
            {result.errorMessage && <div><h3>{result.errorType ?? 'Fehler'}</h3><pre>{result.errorMessage}</pre></div>}
            {result.testResults.length > 0 && <ul class="test-results">{result.testResults.map((test) => <li class={test.passed ? 'passed' : 'failed'} key={test.name}><strong>{test.passed ? 'Bestanden' : 'Fehlgeschlagen'}</strong><span>{test.name}</span>{test.detail && <small>{test.detail}</small>}</li>)}</ul>}
          </div>}
        </section>
      </div>
      <a class="text-link" href={`#/competency/${exercise.competencyIds[0]}`}>Zurück zu {primaryCompetency?.title ?? 'Kompetenz'}</a>
    </section>
  );
}
