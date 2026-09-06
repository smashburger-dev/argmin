# Session A: technischer Abschlusslauf

## Completed

- Phase 0 verifiziert: 46 Kompetenzen, 46 kanonische Lektionen, 254 Public-Aufgaben, 94 Pyodide-Definitionen und 39 detaillierte Wochen. Die zuvor genannte Zahl von 51 Lektionen war veraltet.
- Open-Core-Export vervollständigt. Generatorquellen, dynamischer Numbas-Adapter, aktuelle Tests, Acceptance-Treiber, Pyodide-Matrix, Timing-Werkzeug und ADR-0012 bis ADR-0014 werden exportiert.
- Open-Core-Regression startet einen neuen Child-Prozess mit dem Exportziel als `cwd`, prüft echte Zielbaumimporte, Sicherheitsmarker und Zielbaumtests. Ein Frische-Gate lehnt veraltetes `build-next` ab.
- Temporärer unabhängiger Export unter `/tmp/ki-open-core-session-a-final` geprüft: 479 Quelldateien, Manifest 478/478 gültig, `npm ci`, 633 Node-Tests, 20 Python-Tests, Typecheck, Releasebuild und Produktionsbrowser grün. Das vorhandene Schwesterverzeichnis wurde nicht ersetzt.
- Gemeinsame Generatorregistry `assets/js/core/seed_generator_registry.mjs` eingeführt. Compiler, Adapter, Grader, Next und Legacy nutzen denselben Auflösungspfad. Unbekannte IDs und ungültige Seeds scheitern fail-closed.
- W31-W39 in der Legacy-UI verdrahtet. W35 `genPipelineStages` und W37 `genEvalRates` sind im Seed-Drift-Test enthalten.
- Public-Transform-Test auf alle 39 katalogregistrierten Wochenpakete erweitert. Der hartcodierte 26er-Zähler wurde entfernt; Counts, private Quellen, lokale Pfade, Numbas, inaktive Aufgaben, Lineage und Suchindex werden aus dem Katalog geprüft.
- Projekt-Releasevertrag aus `project.json` abgeleitet. Vier Projekte deklarieren Starter- und Solution-Dateien; der Buildvalidator prüft exakt 43 Projektdateien einschließlich `phases.json` und sieben Solution-Dateien. Fehlende, zusätzliche, private oder symlinkte Dateien scheitern.
- Projekt-Runner gehärtet: `project.json.allowedCommands` ist der kanonische Kommandoeigentümer. Interpreterersetzung, `shell=False`, begrenzte Umgebung, Hashabweichung, fehlende Dateien, ungültige Manifeste, Traversal, Symlinks, Tool-Missing, Timeout, Exitcode, stdout/stderr-Truncation und atomisches Reportschreiben sind getestet.
- RAG-Capstone mit echtem pytest 9.0.3 in einer temporären externen venv ausgeführt. Dasselbe wurde im Open-Core-Zielbaum wiederholt. Beide venvs wurden entfernt.
- Mobile- und Touch-Smokes für Galaxy-S5-Chromium- und iPhone-SE-WebKit-Emulation ergänzt. Navigation, Parsons, numerische Eingabe, MathLive-Fallback, CodeMirror-Fokus, JSON-Import, Fokusreihenfolge, Axe und 320-Pixel-Overflow auf elf Routen sind geprüft.
- Drei WebKit-Overflowfehler behoben: Projektseite, Quellenansicht und Lineare-Algebra-Lektion.
- Receipt-freier Pyodide-Runner-Smoke in Firefox und WebKit ergänzt: Python, NumPy, richtige und falsche Lösung, Timeout und Worker-Neustart.
- Chromium-Pyodide-Receipt um pro Definition gehashte Tests, Referenzsolver, Pakete und Contract-Daten erweitert. Ein alter Receipt mit gleichen IDs wird jetzt abgelehnt.
- Gemeldeter WebKit-Projektseitenflake in 60 Läufen nicht reproduziert: 35 Dev-Läufe, davon 25 unter CPU-Sättigung, 20 Produktionspreview-Läufe und 5 kalte Dev-Server-Starts. Keine Retries wurden ergänzt.
- Review-Ledger korrigiert: Runner-Randfälle und Git-/Testing-Frische stehen auf `implemented`, Quellenregister-Drift auf `partially-implemented`, 51 Lektionen auf 46 und Receipt 67 auf 94. Der kritische Gesamtprogramm-Review bleibt `blocked`.
- README-Baseline auf 46 Lektionen, 254 Public-Aufgaben, vier Projekte und 39 detaillierte Wochen aktualisiert.
- Finale Hauptprojekt-Gates: 633/633 Node-Tests; 20 Python-Tests mit einem erwarteten System-pytest-Skip; Coverage und Typecheck grün; Local- und Releasebuild grün; Dev-E2E 94 aktiv/77 erwartete Skips; Build-E2E 40 aktiv/17 erwartete Skips; beide CDP-Abnahmen grün; `npm audit` 0 Vulnerabilities; `git diff --check -- .` grün.

## Decisions

- Der Kompetenzkatalog bleibt kanonisch; die 39-Wochen-Roadmap bleibt Legacy-Projektion.
- Generatorauflösung hat eine gemeinsame Registry. Einzelne Verbraucher dürfen keine eigenen Spread-Listen mehr pflegen.
- Projektkommandos gehören dem jeweiligen `project.json`. Der Runner akzeptiert nur das eine exakt zum Check-Manifest passende pytest-Kommando.
- `solutionFiles` ist Teil des Projektvertrags. Public- und Next-Build leiten die Projektdateimenge aus Manifesten ab.
- Pyodide-Browserverifikation braucht Inhalts-Hashes, nicht nur Definition-IDs.
- Der vollständige Pyodide-Vertragslauf bleibt Chromium-eigen. Firefox und WebKit erhalten einen kleinen Runner-Smoke, keine vervielfachte 94er-Matrix.
- Mobile-Prüfungen sind Emulation. Sie belegen keine echten Geräte und keinen Screenreader.
- Alle didaktisch ungeprüften Inhalte bleiben Draft. Deterministische Grader bleiben autoritativ; Projektberichte bleiben nicht bindende Selbstberichte.

## Open

- Session B: 13 Kompetenzen ohne frische Instanzvariation.
- Collection-Step-Trace.
- Vollständige Coverage-Semantik.
- Retention-/Post-Course-Review-Umbau.
- Großer didaktischer Agentenreview und menschliche didaktische Freigabe.
- Performance-/LOC-Großrefactor.
- Echte iOS-/Android-Geräteprüfung und manueller Screenreader-Test.
- Der WebKit-Projektseitenflake blieb in 60 Läufen unsichtbar. CI-spezifische WebKit-Versionen und echte parallele CI-Last bleiben als Restunsicherheit.
- Der ungescopte `git diff --check` scheitert außerhalb dieses Projekts an `extension/creative-research-scout/lib/theme.js:22` wegen einer vorhandenen Leerzeile am Dateiende. Nicht in Session A ändern.
- Der temporäre Open-Core-Export liegt weiterhin unter `/tmp/ki-open-core-session-a-final`.
- Kein Commit und kein Push wurden erstellt.

## Next session start

1. Session B ausschließlich auf die 13 Fresh-Variation-Kompetenzen und den vereinbarten Inhaltsreview begrenzen.
2. Vor Änderungen `AGENTS.md`, `docs/coverage-report.md`, `content/reviews/core.json` und diesen Handoff lesen.
3. Keine technischen Release-/Runner-/Browser-Refactors erneut öffnen, solange kein roter Regressionstest vorliegt.
4. Generatorfamilien über `assets/js/core/seed_generator_registry.mjs` registrieren und für jede neue Familie Determinismus, Antwortraum, Solver-Übereinstimmung, Prompt-Leak, Grader-Parität und Seed-Drift testen.
5. Kein Release-Status über `draft` ohne Noas menschliche didaktische Freigabe anheben.
