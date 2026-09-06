# ADR-0011: Open-Core-Release-Kandidat ohne Remote-Veröffentlichung

Status: Angenommen als lokaler Release-Kandidat. Datum: 2026-08-29. Die Abnahmemetriken unten sind ein historischer Snapshot; aktuelle Coverage steht in `docs/coverage-report.md`.

Nachtrag 2026-09-03 (S2B): `index.html` ist der Preact-Einstieg. `next.html` und der Legacy-Shell entfallen. Die Datei- und Größenangaben unten bleiben der Snapshot vom 2026-08-29.

## Entscheidung

Eigene Software steht unter MIT in `LICENSE`. Eigenständig entwickelte distributierbare Lerninhalte stehen unter CC BY 4.0 in `LICENSE-CONTENT.md`. Vendor-Dateien und gebündelte npm-Pakete behalten ihre Upstream-Lizenzen.

`npm run build:release` erzeugt `build-next/` als kombinierten statischen Baum. Er enthält:

- die bestehende Legacy-App als `index.html`;
- den neuen Kompetenz-Shell als `next.html`;
- das Public-Content-Bundle mit aktuell 46 Kompetenzen, 16 Lektionen, 51 Aufgaben, fünf Erklärkarten, sieben Werkzeugkarten, 14 Review-Datensätzen und einem Projekt;
- Pyodide und die drei erlaubten Python-Pakete;
- die Starterdateien des CLI-Datenprüfers;
- gehashte Notices für neun vendorte Komponenten und 18 produktiv gebündelte npm-Pakete;
- ein exaktes Pfad- und SHA-256-Manifest.

Der Legacy-Einstieg bleibt Standard, weil der neue Shell bestehende W1-/W5-Aufgabentypen teilweise noch an die Legacy-App übergibt. `next.html` ersetzt `index.html` erst nach vollständiger Funktionsparität.

## Build-Gates

Der Release-Befehl führt den Content-Compiler vor Vite aus. Vite importiert nur das bereinigte Public-Bundle. Danach baut `tools/build_public.mjs` den fail-closed Baum und legt die validierten Vite-Dateien darüber.

`tools/validate_content.mjs` prüft Content, private Marker, beide Lizenznotices, Dateimenge und Hashes. `tools/validate_next_build.mjs` prüft CSP, interne Scriptpfade, Pyodide- und Projektdateien sowie Größenbudgets. Der initiale Next-JavaScript-Entry muss unter 150 KiB gzip bleiben. Jeder Lazy-Chunk muss unter 250 KiB gzip bleiben.

Playwright prüft den Dev-Server in Chromium, Firefox und WebKit. Ein weiterer Chromium-Lauf prüft den gebauten Baum einschließlich Pyodide.

## Verifizierter Stand

Der finale lokale Lauf bestand 138 Node-Tests, vier Python-Tests, TypeScript sowie 22 Cross-Browser-Tests. Zwei Pyodide-Tests wurden in Firefox und WebKit absichtlich übersprungen und separat in Chromium ausgeführt. Acht Chromium-Tests liefen anschließend gegen den gebauten Baum. Beide Legacy-CDP-Abnahmen bestanden.

`build-next/` enthält 177 Dateien mit 25.294.364 Bytes und keine Symlinks. Der initiale Next-Entry liegt bei 57,7 KiB gzip, der CodeMirror-Lazy-Chunk bei 154,4 KiB gzip. `npm audit` meldete null bekannte Vulnerabilities in 175 aufgelösten Paketen. Zwei aufeinanderfolgende Builds erzeugten für `PUBLIC-BUILD.md` denselben SHA-256 `763174a0c891400fd49619d00ea9e3538498c087ca5cdf7d0c9ee4dc4e797627`.

Der bereinigte Quellbaum liegt unter `/Users/no8/Desktop/life/ki-lernplattform-open`. Er enthält 248 Quelldateien einschließlich Manifest, keine Symlinks, keine benannten privaten Quell-IDs und kein `.git`. Direkt dort bestanden 117 Node-Tests, vier Python-Tests, TypeScript, der vollständige Release-Build und acht Chromium-Tests gegen das gebaute Artefakt. Das Quellmanifest deckt 247 Dateien mit SHA-256 ab und ignoriert nur die in `.gitignore` genannten Installations-, Cache- und Buildverzeichnisse.

## Grenzen

- Die neuen Lektionen bleiben bis zu einer unabhängigen menschlichen Prüfung `draft`.
- Der Rechner hat kein pytest. Der lokale Runner meldet deshalb `tool-missing`. Seine Standardbibliothekstests und die Referenzimplementierung sind grün.
- Projekt-Reports sind Selbstberichte und keine Mastery-Evidence oder Zertifikate.
- Ein sauberes Schwester-Repository und jeder Remote-Push brauchen eine eigene Freigabe. Dieser ADR erstellt weder Repository noch Commit noch Push.
