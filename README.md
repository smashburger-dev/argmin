# KI-Lernplattform

Öffentliche, deutschsprachige Lernplattform mit einem kompetenzbasierten Katalog. Foundations, Lineare Algebra/NumPy, klassisches ML, Deep-Learning- und GenAI-Grundlagen bilden den ausgearbeiteten Kern; die Capstone-Inhalte bleiben Draft. Kein CDN ist zur Laufzeit erforderlich. Fortschritt bleibt in IndexedDB.

## Starten

```bash
cd ki-lernplattform
npm ci
npm run dev:next
# Browser: http://127.0.0.1:4173/index.html#/today
```

Nicht über `file://` öffnen (Module-Worker und Fetch brauchen einen Origin). Die TypeScript-Quellen laufen nur über Vite; `python3 -m http.server` startet die App nicht.

## Testen und Bauen

```bash
node --test tests/                          # Unit-, Property- und Contract-Tests
npm run typecheck                           # TypeScript-7-Prüfung des neuen Shells
npm run build:release                       # kombinierter Static-Build nach build-next/, mit Manifest und Lizenzen
npm run test:e2e                            # Dev-Server: Chromium, Firefox, WebKit und axe-core
npm run test:e2e:build                      # gebaute Ausgabe: Chromium inklusive Pyodide
npm run test:project-runner                 # sicherer pytest-Runner-Vertrag ohne pytest-Installation
npm run verify:release                      # alle Release-Gates in fester Reihenfolge
node tools/migrate_legacy_content.mjs       # Legacy-Exercise-zu-Kompetenz-Mapping erneuern
node tools/compile_content.mjs                 # reproduzierbares Public-Content-Bundle
npm run coverage:build                    # maschinenlesbare Matrix und lesbaren Bericht erneuern
npm run coverage:check                    # veraltete Coverage-Artefakte ablehnen
node tools/validate_content.mjs             # Content-, Leak-, Lizenz- und Bundle-Prüfung
node tools/validate_content.mjs --dir build-next # Release-Bundle prüfen
node tools/build_search_index.mjs           # privaten Autoren-Suchindex neu bauen
python3 tools/pdf_audit.py audit            # reproducibler PDF-Audit (docs/pdf-catalog.json, pdfinfo-Abgleich)
python3 tools/pdf_audit.py selftest         # gezielter Test der Seitenzählung
python3 tools/pdf_audit.py mml-map          # MML-Kapitelanker aus TOC
tools/vendor_fetch.sh                       # Vendoring auffrischen (gepinnte Versionen + SHA-256)
```

Browser-Spikes (Nachweis der Integrationen): `spikes/katex-jsxgraph-spike.html`, `spikes/pyodide-spike.html`.

## Aufbau

```
index.html, src/      Preact-Einstieg und TypeScript-Lernfluss
assets/js/core/       Repository, ExerciseRuntime, Grader, Legacy-Adapter, ProgressStore, ReviewScheduler
assets/js/domain/     Kompetenzgraph, Evidence, Diagnose, Planung, Aufgabenregistry und statischer Tutor
assets/js/runtime/    isolierter Pyodide-Module-Worker plus Host-Runner
content/              public-first Katalog, Kompetenzen, Tracks, Milestones und Legacy-Inhalte
schemas/              JSON-Schema-2020-12-Verträge für den neuen Content-Kern
vendor/               gepinnte Runtimes plus maschinenlesbare Drittanbieter-Notices
docs/                 ADRs, Dependency-Matrix, Lizenzregister, PDF-Katalog, Authoring-Guide
tools/                Compiler, Migration, Public-Transformation, Audit und Browser-Abnahme
tests/                Unit-, Property-, Contract- und Negativtests
build-next/           kombinierter Release-Build mit Preact-Shell
```

## Grader

| Schlüssel | Technik | Äquivalenzgarantie |
|---|---|---|
| `deterministic` | JS (exakte Ganzzahlen, komponentenweise; Parsons-Reihenfolge, Code-Trace-Werte, Ausgabe-Vergleich) | exakt |
| `pyodide` | Python im Module-Worker, lauflokaler Namensraum, Tests, Zeit- und Outputlimit | Tests gegen Referenzsolver |
| `pyodide-sympy` | SymPy `simplify(expand(a)-expand(b))==0` (implizite Multiplikation für MathLive-ascii-math) | exakt für polynomiale/rationale Terme |
| `manual-rubric` | Selbst-Einschätzung gegen Rubric | kein Mastery-Nachweis |

Ein LLM ist nie verbindlicher Grader. Mathematische Eingabe: MathLive 0.110.0 (vendored, `<math-field>` + virtuelle Tastatur, ascii-math-Ausgabe); Darstellung weiter mit KaTeX.

## Fortschritt & Daten

IndexedDB `ki-lernplattform` nutzt schemaVersion 3 mit `weeks`, `attempts`, `journal`, `reviewQueue`, `settings`, `meta`, `plans` und `drafts`. Attempts tragen globale Event-IDs, Aufgaben- und Inhaltsfassungen, Kompetenz-IDs, Instanz und Zyklus. Der In-App-Import nimmt nur schema-3-Exporte; `reviewQueue` wird immer neu abgeleitet. Alte v1/v2-Exportdateien lassen sich ohne Überschreiben mit `node tools/migrate_attempts_v3.mjs alt.json neu.json` separat nach schema 3 überführen.

Mastery ist zeitlich bedingt (ADR-0008). Die lokale Default-Heuristik plant +2/+5/+11 Wochen und kann in den Einstellungen überschrieben werden; sie ist kein wissenschaftlich optimales Dosierungsschema. Kompetenzfrische und Review-Queue bleiben getrennte, sichtbare Zeitachsen. Das frühere FSRS-Experiment wurde in S1A vollständig entfernt.

## Codeworkspace und lokales Projekt

Der neue Shell lädt CodeMirror erst auf einer Lab-Route. Pyodide akzeptiert einzelne Programme oder bis zu 50 sichere relative Textdateien. Jeder Lauf erhält neue Globals, ein neues Arbeitsverzeichnis und bereinigte benutzerdefinierte Python-Module.

Das erste lokale Projekt liegt unter `content/projects/foundations-data-checker/`. `tools/learner_project_check.py` führt ein festes `python -m pytest` ohne Shell aus und schreibt einen atomaren Report. Der Browser prüft diesen Report als Selbstbericht. Er wird nicht als verbindlicher Mastery-Nachweis behandelt. Der Runner installiert pytest nicht selbst.

## Lizenzen

Eigene Software steht unter MIT in `LICENSE`. Eigenständig entwickelte Lerninhalte unter `content/` stehen unter CC BY 4.0 in `LICENSE-CONTENT.md`. Drittanbieter behalten ihre jeweiligen Lizenzen. Der kombinierte Build erzeugt zusätzlich eine gehashte Notice für die 18 produktiv gebündelten npm-Pakete.

## Dokumentation

- Architekturentscheidungen: `docs/adr/0001` bis `0014`
- Lizenzen & Inhaltsklassen: `docs/license-register.md`
- Abhängigkeiten & Versionen: `docs/dependency-matrix.md`
- Coverage-Matrix: `content/coverage-matrix.json`, lesbar in `docs/coverage-report.md`
- Fach-, Methodik- und kritische Reviews: `content/reviews/core.json`, im UI unter `#/quality`
- PDF-Inventar: `docs/pdf-catalog.md` (+ `docs/pdf-catalog.json`)
- Aufgaben-Autoring: `docs/authoring-guide.md`

## Begrenzungen des Pilots

Der aktuelle Public-Kern umfasst 46 eigene deutsche Lektionen, 267 öffentliche Aufgaben mit Generatoren und Pyodide-Testverträgen, vier lokale Projekte und fünf statische Fehlerkarten. Alle 39 Roadmap-Wochen sind detailliert; seit Session B (ADR-0015) besitzt jede der 46 Kompetenzen einen frischen Instanzvariationspfad über die zentrale Seed-Generator-Registry. Neue Lektionen und die Forschungs-/Capstone-Inhalte tragen bis zur unabhängigen didaktischen Freigabe den Status `draft`; Solver- und Browserverifikation erhöhen keinen Release-Status. Deep-Learning- und GenAI-Inhalte laufen ehrlich als NumPy-Toy-Systeme (ADR-0013); Frameworks und echte LLM-Inferenz bleiben Lektüre bzw. lokale Projekte. JupyterLite bleibt aufgeschoben (ADR-0007).
