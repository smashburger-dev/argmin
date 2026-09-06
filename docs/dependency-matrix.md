# Dependency-Matrix (KI-Lernplattform)

Stand: 2026-09-01 (S1B: Numbas/MathJax vollständig entfernt). Alle Versionen sind gepinnt und liegen lokal unter `ki-lernplattform/vendor/`. Kein CDN ist zur Laufzeit erforderlich. `vendor/licenses/THIRD_PARTY_NOTICES.json` ordnet jedem Public-Artefakt versionsgenaue Lizenztexte, Quell-URLs und Hashes zu.

## Produktive Abhängigkeiten

| Bibliothek | Version | Rolle | Lizenz (SPDX) | Lokale Dateien | Größe (ca.) | Geladen |
|---|---|---|---|---|---|---|
| KaTeX | 0.18.4 | Formeldarstellung (LaTeX → HTML) | MIT | `vendor/katex/dist/katex.min.*`, `dist/contrib/auto-render.min.js`, `dist/fonts/*.woff2` | ~1,3 MB inkl. Fonts | initial |
| JSXGraph | 1.13.2 | interaktive mathematische Visualisierungen | MIT ODER LGPL-3.0-or-later, MIT gewählt | `vendor/jsxgraph/jsxgraphcore.js`, `jsxgraph.css` | ~1,0 MB | bei Visualisierung |
| Pyodide | 314.0.5 | Python im Module-Web-Worker | MPL-2.0 | `vendor/pyodide/pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `pyodide-lock.json` | ~12 MB Core-Artefakte im Quellbaum | nur bei Codeaufgaben |
| CPython-Standardbibliothek | 3.14.2 | Python-Standardbibliothek in Pyodide | PSF-2.0 und im CPython-Lizenztext genannte Bestandteile | `vendor/pyodide/python_stdlib.zip` | ~2,4 MB | mit Pyodide |
| NumPy (Pyodide-Wheel) | 2.4.6 | NumPy-Aufgaben | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 laut Wheel-METADATA | `vendor/pyodide/numpy-2.4.6-*.whl` | ~2,8 MB | on demand via `loadPackage` |
| SymPy (Pyodide-Wheel) | 1.14.0 | exakte Algebra im CAS-Adapter-Fallback | BSD-3-Clause AND MIT | `vendor/pyodide/sympy-1.14.0-*.whl` | ~4,0 MB | on demand |
| mpmath (Pyodide-Wheel) | 1.4.1 | SymPy-Abhängigkeit | BSD-3-Clause | `vendor/pyodide/mpmath-1.4.1-*.whl` | ~0,4 MB | mit SymPy |
| MathLive | 0.110.0 | mathematische Eingabe (`<math-field>`, virtuelle Tastatur, ascii-math-Ausgabe) | MIT | `vendor/mathlive/mathlive.min.mjs`, `fonts/*.woff2`, `LICENSE.txt`, `package.json` | ~1,1 MB | nur bei Term-Aufgaben (algebraic-expression) |

Quellen der Downloads: `tools/vendor_fetch.sh` (npm-Registry-Tarballs, Pyodide-GitHub-Release `pyodide-core-314.0.5.tar.bz2`, jsdelivr-Spiegel der Pyodide-Wheels mit Abgleich gegen `pyodide-lock.json`, MathLive-npm-Tarball 0.110.0 mit SHA-256-Pin `3d8ce458805388d65b2a6743eafbb712afbdd77793255f0a010b20d27513217d`). ts-fsrs 5.4.1 wurde am 2026-09-02 in S1A vollständig entfernt (vormals manuell vendorter npm-Tarball, ADR-0008).

## Build-, UI- und QA-Abhängigkeiten ab 2026-08-29

Alle Einträge sind in `package-lock.json` exakt aufgelöst. `npm audit` meldete beim Installationsgate 0 bekannte Vulnerabilities in 175 aufgelösten Paketen.

| Paket | Version | Rolle | Lizenz | Laufzeitstatus |
|---|---:|---|---|---|
| TypeScript | 7.0.2 | nativer Typchecker für die parallele UI | Apache-2.0 | nur Entwicklung |
| Vite | 8.2.2 | statischer UI-Build mit Rolldown | MIT | nur Build/Dev-Server |
| Preact | 10.29.8 | Komponentenlaufzeit des parallelen Shells | MIT | im Next-Bundle |
| `@preact/preset-vite` | 2.10.6 | offizielles Preact-/Vite-Preset | MIT | nur Build/Dev |
| CodeMirror | 6.0.2 | Browser-Codeeditor | MIT | ab Codeworkspace |
| `@codemirror/lang-python` | 6.2.1 | Python-Syntax und Sprache | MIT | ab Codeworkspace |
| markdown-it | 15.0.0 | Markdown ohne Raw-HTML | MIT | nur Content-Compiler |
| Ajv | 8.20.0 | JSON-Schema-2020-12-Validierung | MIT | nur Content-Compiler |
| ajv-formats | 3.0.1 | Datums- und Standardformate für Ajv | MIT | nur Content-Compiler |
| Playwright Test | 1.62.1 | Chromium-, Firefox- und WebKit-E2E | Apache-2.0 | nur Tests; Browser im lokalen Cache |
| `@axe-core/playwright` | 4.13.0 | automatisierte Accessibility-Regeln | MPL-2.0 | nur Tests |
| `@types/markdown-it` | 14.2.0 | Markdown-Typen | MIT | nur Entwicklung |
| `@types/node` | 26.2.0 | Node-Typen für Config und Tools | MIT | nur Entwicklung |

## Bewusst nicht übernommen (Begründung in ADR-0002/0005)

| System | Lizenz | Grund der Ablehnung |
|---|---|---|
| STACK | GPL-3.0 | Moodle/PHP-Server nötig; kein Offline-Statik-Betrieb. Dient als Referenzmodell für Answer Tests / Potential Response Trees. |
| WeBWorK | GPL/Artistic (dual) | Perl-Server + Datenbank nötig. |
| H5P | GPL-3.0 | PHP-Bibliothek für CMS-Anbindung; keine reine Browser-Prüfung von Algebratests. |
| Moodle CodeRunner | GPL-2.0 | Moodle-Frage-Typ; Sandbox-Infrastruktur nötig. |
| PrairieLearn | AGPL-3.0 | Node-Server mit Datenbank; kein statischer Offline-Betrieb. |
| nbgrader | BSD-3-Clause | braucht Jupyter(-Hub)-Server-Dateisystem; in JupyterLite nicht funktionsfähig (offenes Issue jupyterlite#160, Community-Konsens im Jupyter-Forum). |
| Cortex Compute Engine | MIT | ~2,7 MB Bundle; eigenes CAS wird nicht neu erfunden (Auftragsregel); SymPy deckt den Bedarf. Wiedervorlage falls SymPy-Weg scheitert. |
| JupyterLite | BSD-3-Clause | aufgeschoben (ADR-0005): Release-Archiv ist statisch vendorbar, Integration aber erst nach Woche-5-Pilot und mit Noas Freigabe. |

## Entwicklung/Tests (lokal, keine Installation erfolgt)

| Werkzeug | Nutzung | Status |
|---|---|---|
| poppler (`pdfinfo`, `pdftotext`, `pdffonts`) | PDF-Audit Stufe 1 | vorhanden |
| `pdfplumber` 0.11.9 | Deep-Inspektion einzelner Seiten | vorhanden (anaconda-python3) |
| Node.js (`node --test`) | Unit-Tests für Grader/Generatoren/Schema | Systemnode prüfen |
| Chrome via chrome-devtools-MCP | echte Browserverifikation (Desktop/Mobile/Offline) | vorhanden |
| Playwright, axe-core, Surya, Marker, Docling, mlx-whisper | nicht installiert | Rückfrage bei Noa, s. Abschlussbericht |
