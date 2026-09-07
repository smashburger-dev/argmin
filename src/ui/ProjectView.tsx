import { useEffect, useRef, useState } from 'preact/hooks';
import { validateProjectReport } from '../../assets/js/domain/project_report.mjs';
import type { CatalogData } from '../app/types';
import { recordProjectReport } from '../adapters/project-session';
import { Button } from './Button';

interface ValidationResult {
  ok: boolean;
  errors: string[];
  integrity: string;
  evidenceEligible: boolean;
}

interface CheckManifest {
  schemaVersion: number;
  projectId: string;
  projectVersion: string;
  testPaths: string[];
  requiredFiles: Array<{ path: string; sha256: string | null }>;
}

export function ProjectView({ catalog, projectId }: { catalog: CatalogData; projectId: string }) {
  const project = catalog.projects.find((item) => item.projectId === projectId);
  const projectDirectory = project?.projectId.replace(/^p-/, '') || '';
  const base = `./content/projects/${projectDirectory}/`;
  const [manifest, setManifest] = useState<CheckManifest | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const reportInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!project) return;
    let active = true;
    void fetch(`${base}check-manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Manifest nicht ladbar: ${response.status}`);
        return response.json();
      })
      .then((value) => { if (active) setManifest(value as CheckManifest); })
      .catch((error) => {
        if (active) setValidation({ ok: false, errors: [String(error.message || error)], integrity: 'invalid', evidenceEligible: false });
      });
    return () => { active = false; };
  }, [base, project]);
  if (!project) return <section class="view"><h1 tabIndex={-1}>Projekt nicht gefunden</h1></section>;

  const importReport = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (!manifest) throw new Error('Check-Manifest ist noch nicht geladen.');
      const report = JSON.parse(await file.text());
      setReportStatus(typeof report.status === 'string' ? report.status : null);
      const result = validateProjectReport(report, manifest) as ValidationResult;
      setValidation(result);
      await recordProjectReport(project, report, result.ok);
    } catch (error) {
      setReportStatus(null);
      const message = error instanceof SyntaxError ? 'Datei ist kein gültiges JSON.' : error instanceof Error ? error.message : String(error);
      setValidation({ ok: false, errors: [message], integrity: 'invalid', evidenceEligible: false });
    }
  };

  return (
    <section class="view" aria-labelledby="project-title">
      <header class="view-header">
        <p class="eyebrow">Lokales Projekt · Version {project.version}</p>
        <h1 id="project-title" tabIndex={-1}>{project.title}</h1>
        <p class="lede">{project.description}</p>
      </header>
      <div class="project-grid">
        <section class="project-panel" aria-labelledby="files-title">
          <p class="card-kicker">Schritt 1</p>
          <h2 id="files-title">Starterdateien speichern</h2>
          <p>Lege die Dateien mit derselben Ordnerstruktur in einem eigenen lokalen Projektordner ab.</p>
          <ul class="download-list">{project.starterFiles.map((path) => <li key={path}><a href={`${base}${path}`} download>{path}</a></li>)}</ul>
        </section>
        <section class="project-panel" aria-labelledby="run-title">
          <p class="card-kicker">Schritt 2</p>
          <h2 id="run-title">Festes Prüfkommando starten</h2>
          <p>Der Runner verwendet keine Shell und reicht keine Befehle aus Content an das Betriebssystem weiter.</p>
          <pre class="command-block">python3 tools/learner_project_check.py{`\n`}  --project /pfad/zum/projekt{`\n`}  --manifest /pfad/zum/projekt/check-manifest.json{`\n`}  --output /pfad/zum/projekt/report.json</pre>
          <p class="project-note">Fehlt pytest in deiner Python-Umgebung, lautet der Reportstatus <code>tool-missing</code>.</p>
        </section>
      </div>
      <section class="report-panel" aria-labelledby="report-title">
        <div><p class="card-kicker">Schritt 3</p><h2 id="report-title">Report lokal prüfen</h2><p>Die Datei wird nur in diesem Browser gelesen und nicht hochgeladen.</p></div>
        <Button variant="secondary" type="button" disabled={!manifest} onClick={() => reportInput.current?.click()}>{manifest ? 'Report auswählen' : 'Manifest wird geladen'}</Button>
        <input ref={reportInput} id="report-file" type="file" aria-label="Report auswählen" accept="application/json,.json" disabled={!manifest} onChange={importReport} />
        <div class="report-result" role="status">
          {validation?.ok && <><strong>Report strukturell gültig</strong><p>Status: {reportStatus}. Integrität: Selbstbericht. Kein automatischer Mastery-Nachweis.</p></>}
          {validation && !validation.ok && <><strong>Report abgelehnt</strong><ul>{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul></>}
        </div>
      </section>
      <section class="deliverables" aria-labelledby="deliverables-title"><h2 id="deliverables-title">Abgabe</h2><ul>{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </section>
  );
}
