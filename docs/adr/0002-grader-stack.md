# ADR-0002: Grader-Stack — Numbas, Pyodide-Worker, deterministic, manual-rubric

Status: Angenommen. Datum: 2026-08-24.

## Entscheidung
Vier verbindliche GraderAdapter, gewählt nach Aufgabentyp:

| Adapter | Einsatz | Äquivalenz-/Prüfgarantie |
|---|---|---|
| `deterministic` (JS) | Auswahl, Numerik mit Toleranz, Vektoren/Matrizen mit ganzzahligen Einträgen, Zuordnungen | Exakte Vergleiche (exakte rationale Darstellung via Bruch-Arithmetik, komponentenweise, dimensionsgeprüft); Toleranz nur wo explizit gesetzt |
| `numbas` | strukturierte Mathematik-Prüfung mit Teilschritten | `numberentry`: Intervall exakt. `jme`-Teile: **numerisches Sampling** über Variablenbereiche (Quelle: `runtime/scripts/jme.js`, `compare()` mit vsetRangePoints=5, Range [0,1], absdiff/reldiff/dp/sigfig) — kein symbolischer Beweis; für Polynome im Pilot durch Anheben von `vsetrangepoints` und breiteren Bereich abgeschwächt, dokumentiert |
| `pyodide` | Python-/NumPy-Aufgaben | Ausführung gegen getrennten Testcode; Tests sind didaktisch verborgen, nicht sicher geheim |
| `pyodide-sympy` (CAS-Adapter auf Pyodide) | algebraische Äquivalenz, exakte rationale Gleichheit | `sympify`-Parse beider Seiten (exakt, keine Float-Literale) + `simplify(expand(a)-expand(b))==0`; deckt rationale und polynomiale Äquivalenz exakt ab. Grenze: trigonometrische Identitäten können `None`/lange Formen geben → Aufgabe dann als Numbas-Sampling oder Numerik mit dokumentierter Garantie ausführen |
| `manual-rubric` | Begründungen, Interpretation, Paperkritik | Selbst-Einschätzung gegen sichtbare Rubric; zählt nie als Mastery-Nachweis, nur als Bearbeitungsnachweis |

Ein LLM-Grader ist **niemals** verbindlicher Grader für Mathematik, Code, Beweise oder Gates (Auftragsregel; kein Ausnahmefall beantragt).

## Alternativen (geprüft und ausgeschlossen)
- **STACK** (GPL-3.0, Moodle/PHP-Server): Referenz für Answer Tests/PRT bleibt übernommen (Dokumentation), Betrieb ausgeschlossen — kein Offline-Statik-Betrieb.
- **WeBWorK** (GPL/Artistic, Perl+DB), **H5P** (GPL-3.0, PHP), **CodeRunner** (GPL-2.0, Moodle), **PrairieLearn** (AGPL-3.0, Node-Server+DB), **nbgrader** (BSD, braucht Jupyter-Server-Dateisystem; in JupyterLite nicht funktionsfähig, offenes Issue jupyterlite#160).
- **Eigener CAS-Grader in JS**: ausgeschlossen — Auftragsregel „CAS nicht neu erfinden"; SymPy über Pyodide ist der geprüfte Adapter (Spike-Beleg: `(x+2)(x+3) ↔ x²+5x+6` erkannt, `x²+5x+5` korrekt abgelehnt, 2026-08-24).
- **Cortex Compute Engine** (MIT): wiedervorgelegt, falls SymPy-Weg scheitert; Bundle ~2,7 MB, kein deutlich besseres Äquivalenzversprechen für unsere Typen.

## Getesteter Integrationsweg
- Numbas: lokale generische Runtime aus offiziellem Compiler (`python3 bin/numbas.py --generic -l de-DE … --mathjax-4-url ../mathjax4`), `<numbas-exam source_url="…" scorm="false">`, Ereignisse `numbas:loaded`/`numbas:event:*` am Element (Quelle: numbas.js 4088-4121, customElements.define Zeile 4273). Syntax des deutschen Test-Exams per Standalone-Compile validiert.
- **Spike-Ergebnis Numbas (Stand 2026-08-24, offen):** Die Einbettung lädt reproduzierbar ALLE Ressourcen offline (numbas.js, numbas.css, MathJax tex-svg + texhtml + numbas-mathjax, Exam-Quelle, Logo — Serverlog belegt), wirft keine JS-Fehler, Numbas.init_promise löst sich — aber `MathJax.startup.promise` löst sich in den verfügbaren Testbrowsern (IAB/Brave) nicht, sodass das Exam nie startet (`numbas:loaded` fehlt). Getestet am Original-Spike UND an der App-Einbettung. Folge: **verbindliche Pilot-Grader sind deterministic, pyodide, pyodide-sympy und manual-rubric.** Woche-5-Gate-Evidenz liegt auf e1/e2/e6 (deterministisch). e7 bleibt als `runtime-partial` verdrahtet; nächster Diagnoseschritt: Vergleich in einem nicht-automatisierten Browserprofil und Prüfung der SRE-Speech-Engine-Kette (Blob-Worker). Numbas bleibt Kandidat, sobald der Start bestätigt ist — die erwartete Richtung (ADR) gilt weiter, die Bestätigung steht aus.
- **Nachtrag 2026-08-24 (Abnahme-Lauf Woche-5-Pilot):** Isolierter Browserlauf (Chrome via chrome-devtools, frisches Profil) bestätigt den Fehler: `MathJax.startup.promise` hängt dauerhaft (Race > 10 s), `startup.document`/`startup.handler` bleiben null — die benutzerdefinierte `startup.ready()`-Kette (Constructed-Stylesheet-Adaptor) kommt nicht bis `defaultReady()`; `el.exam` wird nie gesetzt, `numbas:loaded` fehlt, keine Antwort/kein Score möglich. Die geforderte Nutzerkette (Exam lädt → `el.exam` gesetzt → Antwort eingegeben und bewertet → Score in IndexedDB → vollständiger Reload → keine externe Runtime-Ressource) ist damit nicht beweisbar. **Entscheidung: w05-e7 wird aus dem aktiven Curriculum entfernt** (`active: false`, klar als Forschungsartefakt gekennzeichnet; Exam-Datei und Spike bleiben im Privatbaum als Referenz). Die fachliche Funktion (Matrixprodukt-Eintrag, Term-Vereinfachung, System-Lösung) ist durch w05-e1/e5/e6 und die Übungsvarianten w05-e10 bis w05-e13 mit unterstützten Gradern abgedeckt. Kein aktiver Eintrag bleibt `runtime-partial`. Numbas/MathJax werden nicht mehr in den Public-Build ausgeliefert. Wiedervorlage nur mit einem Browserprofil, in dem die vollständige Nutzerkette nachweisbar läuft.
- **Nachtrag 2026-08-25 (Numbas reaktiviert, private-build-only):** Root-Cause
  in isolierter Diagnose (`research/numbas-diagnose/FINDINGS.md`) gefunden und
  behoben: L1 upstream-Defekt (startup.ready wirft an fehlendem
  MathJax._.ui.dialog im tex-svg-Bundle, VOR defaultReady), L2 adaptor.head()
  als Funktion, L3 vollständiger sre/-Baum nötig, L4 Exam muss als strict
  JSON (examparser.NumbasObject) eingebettet sein, L5 statisches
  defaultReady() VOR den optionalen Stylesheet-Patches (sonst kein Dokument,
  kein Typensatz). template-Generator baut diese Fixes jetzt ein. Menschentest
  2/2 bestanden; Plattform-Abnahme mit IndexedDB-Persistenz im selben Tag.
  e7 ist wieder aktiv — aber **private-build-only**: der Public-Build filtert
  Numbas-Aufgaben weiter heraus und liefert die Runtime nicht aus.
  Plattform-Abnahme bestanden: Laden, Typensatz, Bewertung (Score 1/4 via
  controls.submit), IndexedDB-Persistenz mit isTrusted-Gate gegen Junk-Attempts,
  Reload stabil.
- **Eingabe (Nachtrag 2026-08-24):** Mathematische Eingabe erfolgt seit dem Abnahme-Lauf über MathLive 0.110.0 (MIT, vendored, Pin siehe dependency-matrix.md) als `<math-field>` mit aufgabenspezifischer virtueller Tastatur; Ausgabe als `ascii-math` (beobachtete Formate in dependency-matrix.md), KaTeX bleibt für die Darstellung zuständig.
- Pyodide: siehe ADR-0003.

## Lizenz
Apache-2.0 (Numbas), MPL-2.0 (Pyodide), BSD-3 (NumPy/SymPy). Prüfungslogik in `assets/js/runtime/` ist eigene MIT-Note dieser Plattform.

## Offline-Fähigkeit, Bundle, Wartung, Aufwand, Rückbau
Offline vollständig (ADR-0001). Zuladen: Numbas-Exam +3 MB/+2 MB MathJax nur bei Numbas-Aufgaben; Pyodide nur bei Codeaufgaben. Beide Projekte aktiv gepflegt (2026er Releases). Aufwand: mittel (Pfad-/Ereignisdetailarbeit). Rückbau: Adapter einzeln entfernbar; ExerciseRuntime kennt Grader nur über Registry-Schlüssel.

- **Nachtrag 2026-09-01 (S1B-Retirement, Streamlining-Welle 1):** Numbas und sein MathJax-4-Runtimezweig sind vollständig entfernt. Fachgrund: `w05-e7` war der einzige Numbas-Grader und komponierte ausschließlich Inhalte, die zahlengleich in `w05-e1` (Matrixprodukt-Eintrag), `w05-e5` (Term-Vereinfachung, `pyodide-sympy`, exakt statt JME-Sampling) und `w05-e6` (System-Lösung) existieren; kein einzigartiges Lernziel. Entfernt: `vendor/numbas/`, `vendor/numbas-src/`, `vendor/mathjax4/`, Adapter, Template-Generator, Spikes, Exam-Dateien, Schema-Werte und die Local-Activity-Ersatzroute. Verbindliche Grader bleiben `deterministic`, `pyodide`, `pyodide-sympy` und `manual-rubric`. Bestehende v3-Attempts zu `w05-e7` bleiben lesbar und exportierbar, erzeugen keine Evidence mehr. Diagnose-Nachweise (L1-L5b): `research/numbas-diagnose/` (Vault, unversioniert). Das frühere Inventar ist nicht Bestandteil des öffentlichen Dokuments.
