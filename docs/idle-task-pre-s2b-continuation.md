# Idle-Task Continuation: S4A-v2 fertigstellen und Pre-S2B-Branch abnehmen

Stand: 2026-09-02

## Auftrag

Setze den abgebrochenen Idle-Task exakt am letzten grünen Integrationsstand fort. Wiederhole keine abgeschlossenen Abschnitte 0 bis 5. Vervollständige S4A-v2 mit sieben Domänen-Shards, unabhängigen Reviewer-Subagents, Cross-Domain-Gegenprüfung, vollständiger Disposition aller offenen Punkte, Dokumentation und Clean-Checkout-Vollabnahme.

Bereite anschließend S2B, S3A, S3B, S4B und S4C mit aktuellen, getrennten Folgeprompts vor. Implementiere diese Sessions noch nicht.

## Rolle und Modelle

Du bist der Orchestrator mit GPT-5.6 Sol XHigh. Nutze GLM 5.3 Flash High für technische, fachliche und didaktische Implementer sowie Reviewer. Nutze GLM Flash Max nur für:

- den finalen adversarialen Cross-Domain-Review von S4A-v2,
- den finalen adversarialen Review des gesamten Integrationsbranches.

Kein Reviewer prüft seinen eigenen Shard. Schreibende Agents erhalten explizite, disjunkte `OWNED PATHS`. Gemeinsame Schemas, Assembler, kanonische Registry, Cross-Domain-Entscheidungen, Git-Integration und finale Konfliktauflösung bleiben beim Orchestrator.

Vor Änderungen `shrink-complexity full` anwenden. Vor Tests `affected-test-runner` und `fast-then-full` lesen. Für Fehler `diagnosing-bugs` verwenden. Keine neue Dependency und keine globale oder User-Level-Installation.

## Git-Freigaben und Verbote

Noa hat lokale Einzelcommits auf dem bestehenden Integrationsbranch genehmigt.

Genehmigt:

- S4A-v2-Fertigstellungscommit,
- Dokumentations- und Handoff-Commit,
- kleine bestätigte Korrekturcommits, falls ein Gate einen echten Fehler findet,
- zweiter frischer Worktree für Clean-Checkout-Verifikation.

Nicht genehmigt:

- Merge oder Fast-forward nach `main`,
- Push,
- Force-Push,
- Rebase oder Amend bestehender Commits,
- Löschen oder Zurücksetzen vorhandener Worktrees, Branches, Commits oder ungetrackter WIP-Artefakte,
- Implementierung von S2B, S3A, S3B, S4B oder S4C,
- Änderung der Generator-Baseline,
- Änderung von Produktionscode, Content oder Produktschemas innerhalb von S4A-v2.

Das unerlaubt installierte User-Level-Paket `jsonschema` darf installiert bleiben, wird aber nicht verwendet. Nutze ausschließlich das vorhandene Ajv.

## Verbindlicher Startpunkt

Arbeitsverzeichnis:

`/Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform`

Branch:

`streamline/integration-pre-s2b`

Erwarteter HEAD:

`9421d62c0555cd30b943c1c149f127f74a21ef74`

Erwarteter Commitstapel:

1. `50254e1` S0R Clean-Checkout-Pyodide-Verträge
2. `33bf9e8` S1B Numbas-/MathJax-Retirement
3. `2599f32` S1B-Härtung
4. `4301763` S1A FSRS-Retirement
5. `9e46f47` S2A Preact-Parität
6. `e447cc0` S2A-Integrationshärtung
7. `8ed7102` S4A-v1-Artefakte
8. `9421d62` S4A-v1-Baseline-Reproduktion

Erwarteter Arbeitsbaum:

- keine Änderung an getrackten Dateien,
- ausschließlich ungetracktes `research/streamlining/s4a-v2/`.

Wenn HEAD, Branch oder Arbeitsbaum davon abweichen, stoppe vor jedem Schreibzugriff und berichte die Differenz. Verwirf oder lösche keine vorhandene WIP-Datei.

## Pflichtlektüre

Lies vollständig:

- `AGENTS.md`
- den aktuellen Masterplan aus `/Users/no8/Desktop/life/Lifemaxxing/ki-lernplattform/docs/streamlining-umbauplan.md`
- den ersten Idle-Task aus `/Users/no8/Desktop/life/Lifemaxxing/ki-lernplattform/docs/idle-task-pre-s2b-integration.md`
- `docs/session-2026-09-01-s0-baseline.md`
- `docs/session-2026-09-01-s1a-fsrs-inventory.md`
- `docs/session-2026-09-01-s1b-numbas-inventory.md`
- `docs/session-2026-09-01-s2a-preact-parity.md`
- `docs/session-2026-09-01-s4a-content-taxonomy.md`
- `research/streamlining/s4a/summary.md`
- `research/streamlining/s4a/migration-matrix.json` über eine speichereffiziente Analyse, nicht als vollständigen Chat-Dump
- alle vorhandenen Dateien unter `research/streamlining/s4a-v2/`

Sessionberichte sind Behauptungen. Git, Quellcode, Schema-Validierung und reproduzierbare Gates sind Ground Truth.

## Bereits abgeschlossen, nicht wiederholen

Die folgenden Arbeiten sind abgeschlossen und bleiben unverändert:

- S0R und Clean-Checkout-Tracking der Pyodide-Vertragsquellen,
- Numbas- und MathJax-Entfernung samt Tombstone-Härtung,
- FSRS-Entfernung bei unverändertem Expanding-Scheduler,
- S2A-Journal, Settings-Hydration, Seed, Mastery, Worked Example, Migration und Browser-Flake-Fixes,
- archivierte Review-Einträge ohne tote Links,
- Local-private-Lesepfad-Playwright-Vertrag,
- S4A-v1 mit 268 Baseline-Definitionen,
- reproduzierbarer S4A-v1-Lauf gegen `1998d57` über `--source-root`.

S2B und S3 wurden nicht begonnen.

## Aktueller S4A-v2-WIP

Vorhanden sind mindestens:

- `archetypes.json`
- `assemble-v2.mjs`
- `canonical-families.json`
- vier Designentwürfe
- adversarialer Designvergleich
- Forschungsbasis
- sieben eingefrorene v1-Inputs
- `taxonomy.schema.json`
- `shards/_example.json`

Noch nicht vorhanden:

- die sieben echten Domänen-Shards,
- `family-model.md`,
- vollständige exakte Familienmitgliedschaften,
- finale `migration-matrix-v2.json`,
- `feedback-disposition.json`,
- `decision-queue.json`,
- unabhängige Reviewberichte je Domäne,
- Cross-Domain-Gegenprüfung,
- S4A-v2-Commit,
- einfache Statusdokumentation,
- finaler Clean-Checkout-Lauf.

Der aktuelle erwartete Assemblerfehler lautet: sieben Domänen-Shards fehlen. Dieser Fehler ist der Startzustand, kein neuer Defekt.

## Kontext- und Übergaberegel

Dieser Auftrag ist groß. Arbeite trotzdem nicht bis zu einem ungesicherten Kontextabbruch. Der erste verpflichtende Abschluss ist Commit 8 nach vollständig geprüftem S4A-v2. Wenn der verbleibende Kontext danach nicht sicher für Dokumentation und Vollabnahme reicht, schreibe einen Digest und einen exakten Continuation-Prompt für Blöcke G bis I und stoppe mit sauberem Arbeitsbaum. Stoppe niemals mit nur teilweise geschriebenen oder ungeprüften Domänen-Shards. Wenn der Kontext bereits vor Commit 8 knapp wird, schließe zuerst den aktuellen Block mit reproduzierbarem Gate ab und dokumentiere exakt die noch fehlenden Blöcke.

# Arbeitsblock A: WIP-Vertrag vor dem Shard-Dispatch härten

Prüfe alle bestehenden v2-Dateien als WIP, nicht als Wahrheit. Korrigiere vor dem Dispatch die bestätigten strukturellen Probleme.

## A1. Mitgliedschaft als Ground Truth

`canonical-families.json` enthält derzeit teilweise nur erwartete Mengen und unvollständige `memberSourceIds`. Das ist keine ausreichende Familienwahrheit.

Ziel:

- Jeder der 268 `sourceId`s wird durch genau einen atomaren Case- oder einen ausdrücklich zusammengesetzten Placement-Vertrag abgedeckt.
- Domänen-Shards deklarieren die tatsächliche Zuordnung.
- Der Assembler leitet Familienmitgliedschaften, Domänen und Mengen aus den Shards ab.
- `expectedMemberCount` darf nur als überprüfte Erwartung dienen, nie fehlende Mitglieder ersetzen.
- Keine manuell gepflegte Domänenzählung neben einer ableitbaren Mitgliedschaft.

## A2. Atomare Aufgaben gegen zusammengesetzte Sequenzen

Das aktuelle Schema verlangt für jeden Eintrag genau eine `CognitiveFamily`. Das ist für zusammengesetzte Aufgaben nicht immer ehrlich.

Prüfe eine Schema-Variante mit zwei klaren Formen:

1. `atomicCase`: genau eine CognitiveFamily, ein TaskArchetype und ein CaseTemplate.
2. `compositePlacement`: geordnete Komponenten aus mehreren atomaren CaseTemplates plus Sequenz-, Teilscore- oder Synthesevertrag.

Beide Formen bleiben vollständige schema-valide Entries. Auch Composite Placements müssen `persistence`, `humanReview`, `uncertaintyDispositions` und `feedbackDispositions` tragen. Passe `assemble-v2.mjs` bereits in Block A an beide Formen an. Der Assembler muss Identität, Feedback, Persistenz, Claims und vollständige Komponentenreferenzen bei atomaren und zusammengesetzten Entries fail-closed prüfen. Erweitere `_example.json` oder erstelle zwei Beispiele und führe einen gezielten Assembler-/Schema-Selbsttest über beide Formen aus.

Nutze die QTI-Trennung zwischen Item und Section/Test nur als Modellanalogie, nicht als Dependency.

`w05-e7` ist der Pflichtgegenfall:

- keine erfundene 65. kognitive Familie nur zur Aufnahme einer retired Mehrteilsequenz,
- historische Definition bleibt in v1 und v2 sichtbar,
- Status `retired` nach expliziter S1B-Freigabe,
- Komponenten verweisen fachlich auf die erhaltenen Aufgabenpfade von `w05-e1`, `w05-e5` und `w05-e6`,
- historische Attempts und Evidence bleiben erhalten,
- kein zukünftiger GraderAdapter und kein ausführbarer Review-Link.

Prüfe, ob weitere Baseline-Definitionen echte Composite Placements sind. Erzeuge keine Composite-Form nur zur bequemeren Zusammenfassung.

## A3. TaskArchetypes

Prüfe die zehn vorhandenen Archetypen. Ergänze ein maschinenlesbares `status`-Feld mit mindestens `active` und `historical-retired`. `numbas-exam-retired` ist keine zukünftige Graderklasse. Der Assembler prüft, dass aktive CaseTemplates nur aktive Archetypen mit einem realen GraderAdapter binden und retired Placements keinen aktiven Grader vortäuschen.

Die aktive Registry muss die aktuellen Antwort- und Graderverträge vollständig abdecken. Unbekannte aktive Archetypen bleiben fail-closed.

## A4. Kanonische Namen

Behebe alle Namensdiskrepanzen zwischen Designprosa, Registry und künftigen Shards:

- genau eine kanonische `familyId` je CognitiveFamily,
- Aliase nur als explizite Migrationsmetadaten,
- keine stillen Varianten wie `trace-assignment-state` gegen `assignment-state-trace`,
- keine Tippfehler wie `reflect-guided-seasure`,
- Namensschema maschinengeprüft.

## A5. Bekannte Grenzfälle

Vor dem Dispatch als offene Prüfaufträge im Schema oder Reviewer-Briefing festhalten:

- 18 gegen 19 behauptete domänenübergreifende Familien,
- unvollständige oder leere `domains`,
- unvollständige `memberSourceIds`,
- `w17-e2` ohne bestätigten Merge-Zielpfad,
- `w37-e1` mit kompetenzübergreifender Merge-Frage,
- Grenzziehung `formula-ratio-percent-metric` gegen `aggregate-confusion-metric`, besonders `w26-e4`, `w33-e2`, `w34-e2`,
- Composite-Aufgaben und mehrteilige Sequenzen,
- sechs v1-`familyContractVariants` zwischen statischen und geseedeten Verträgen.

## A6. Forschungs- und Designbasis

Behalte die begründete Referenzrichtung:

- Evidence-Centered Design: Claim, Evidence, Task und Assembly,
- Automatic Item Generation: Cognitive Model, Item Model und Instanz,
- PrairieLearn: Seeded Variant sowie Generate, Parse und Grade,
- STACK: Question Tests, Answer Notes und Response Trees,
- QTI: Item gegen Section/Test.

Dokumentiere ausdrücklich, was nicht übernommen wird: Runtime, XML-Format, Serverarchitektur, CAS oder neue Dependency.

Erzeuge oder vervollständige `research/streamlining/s4a-v2/family-model.md`, bevor die sieben Shards geschrieben werden.

Stop-Gate A:

- Schema kompiliert mit dem vorhandenen Ajv im Strict-Modus,
- `_example.json` bildet atomaren und zusammengesetzten Fall korrekt ab oder es existieren zwei getrennte Beispiele,
- gezielter Schema-/Assembler-Selbsttest validiert beide Entry-Formen einschließlich Persistenz, Feedback und Komponentenreferenzen,
- Assembler meldet danach nur noch erwartungsgemäß fehlende echte Shards,
- alle bekannten Grenzfälle stehen als explizite Reviewanforderung,
- keine Produktions- oder Contentdatei verändert.

# Arbeitsblock B: sieben Domänen-Shards durch Implementer

Dispatch sieben GLM-Flash-High-Implementer. Jeder erhält genau einen v1-Input, relevante Content-/Codebelege und genau einen `OWNED PATH`.

| Domäne | Eingaben | OWNED PATH |
|---|---:|---|
| Foundations | 49 | `research/streamlining/s4a-v2/shards/foundations.json` |
| Lineare Algebra | 26 | `research/streamlining/s4a-v2/shards/linear-algebra.json` |
| Data und ML | 61 | `research/streamlining/s4a-v2/shards/data-ml.json` |
| Deep Learning | 24 | `research/streamlining/s4a-v2/shards/deep-learning.json` |
| Transformer und LLM | 30 | `research/streamlining/s4a-v2/shards/transformer-llm.json` |
| GenAI-Systeme | 24 | `research/streamlining/s4a-v2/shards/genai-systems.json` |
| Research und Capstone | 54 | `research/streamlining/s4a-v2/shards/research-capstone.json` |

Jeder Implementer muss:

1. jeden eigenen `sourceId` genau einmal abdecken,
2. die aktuelle v1-Evidence lesen,
3. FamilyGroup, CognitiveFamily, TaskArchetype, CaseTemplate oder Composite Placement, Difficulty, Placement und Persistenz begründen,
4. Familien nicht nur nach Prompttext oder Themenworten mergen,
5. gemeinsame Lösung, Referenzmodell, Invarianten und Fehlerhypothesen prüfen,
6. jeden Singleton begründen,
7. jede v1-Unsicherheit disponieren,
8. jede Human-Review-Markierung disponieren, ohne menschliche Releasefreigabe vorzutäuschen,
9. jedes Feedbackvorkommen einem Zielpfad zuordnen,
10. historische IDs erhalten oder Merge-/Retire-Metadaten ausfüllen,
11. keine Produktionsdatei ändern,
12. keine Installation ausführen.

Erlaubte Dispositionen bleiben die im Schema definierten Werte. `resolved-by-review-council` darf ein Implementer nicht allein vergeben. Ergänze dafür im Schema ein Pflichtfeld `councilReviewRef`, sobald diese Disposition verwendet wird. Der Assembler akzeptiert sie nur, wenn der referenzierte unabhängige Reviewbericht existiert und den betroffenen `sourceId` ausdrücklich behandelt.

Stop-Gate B:

- alle sieben Dateien existieren,
- jede besteht einzeln gegen das Schema,
- Domänenmengen lauten 49, 26, 61, 24, 30, 24 und 54,
- insgesamt 268 eindeutige IDs,
- kein Implementer hat außerhalb seines Pfads geschrieben.

# Arbeitsblock C: sieben unabhängige Domänenreviews

Dispatch nach Abschluss von Block B sieben neue Reviewer-Subagents. Kein Reviewer darf der Implementer desselben Shards sein. Reviewer arbeiten zunächst read-only und schreiben ausschließlich ihren Bericht.

| Review | OWNED PATH |
|---|---|
| Foundations | `research/streamlining/s4a-v2/reviews/foundations-review.md` |
| Lineare Algebra | `research/streamlining/s4a-v2/reviews/linear-algebra-review.md` |
| Data und ML | `research/streamlining/s4a-v2/reviews/data-ml-review.md` |
| Deep Learning | `research/streamlining/s4a-v2/reviews/deep-learning-review.md` |
| Transformer und LLM | `research/streamlining/s4a-v2/reviews/transformer-llm-review.md` |
| GenAI-Systeme | `research/streamlining/s4a-v2/reviews/genai-systems-review.md` |
| Research und Capstone | `research/streamlining/s4a-v2/reviews/research-capstone-review.md` |

Jeder Reviewer prüft:

- vollständige ID-Abdeckung,
- fachliche Kohärenz jeder Familie,
- zu breite und zu enge Familien,
- tatsächlich gemeinsames Referenzmodell,
- kompatible oder bewusst getrennte TaskArchetypes,
- parametrische statt programmatisch verzweigte Variation,
- Fehlerhypothesen und Feedback-Zielpfade,
- Difficulty-Monotonie,
- Primary Claim und Co-Evidence,
- Persistenz- und ID-Sicherheit,
- Singleton-Begründungen,
- Human-Review- und Unsicherheitsdispositionen,
- Composite-Entscheidungen.

Jedes Finding enthält Schweregrad, sourceIds, verletzte Regel, Beleg und kleinste Korrektur. Keine pauschalen Freigaben.

Der Orchestrator bestätigt oder widerlegt jedes Finding gegen Quellen. Bestätigte Findings werden danach durch klar zugewiesene Korrekturagents in den jeweiligen Shards behoben. Reviewerberichte bleiben unverändert als Auditspur.

Stop-Gate C:

- sieben unabhängige Berichte vorhanden,
- jedes High/Critical Finding entschieden,
- bestätigte Findings korrigiert,
- alle sieben Shards erneut schema-valide,
- keine Domänen-ID verloren oder dupliziert.

# Arbeitsblock D: Cross-Domain-Council

Nach den Domänenkorrekturen folgen mindestens vier unabhängige Querschnittsreviews.

## D1. Familienarchitektur

Prüft alle shardübergreifenden CognitiveFamilies:

- exakte Mitglieder statt erwarteter Counts,
- einheitliche Familienbeschreibung,
- identische oder kompatible Referenzautorität,
- einheitliche Fehlerhypothesen,
- Domänen werden abgeleitet,
- Singletonquote und tatsächliche Kompression,
- kein Merge allein wegen gleicher Interaktion.

Löst die 18/19-Diskrepanz aus den tatsächlichen Mitgliedschaften.

## D2. Grader-, Archetyp- und Feedbackaudit

Prüft:

- alle 623 Feedbackregeln,
- 275 heute konsumierbare Regeln bleiben verhaltensstabil,
- 348 heute unkonsumierte Regeln erhalten exakt einen Zielpfad,
- 273 Python-Regeln bekommen `checkId`-/Answer-Note-, Hint-, Solution- oder begründeten Retire-Pfad,
- 72 deterministische Off-Grammar-Regeln,
- 3 SymPy-Regeln,
- kein Feedbackpfad behauptet Wirkung ohne Runtime-Konsumenten,
- kein LLM wird Grader.

## D3. Persistenz-, Merge- und Retire-Audit

Prüft:

- alle 262 Preserve-IDs,
- fünf Merge-Kandidaten,
- `w17-e2` Zielpfad,
- `w37-e1` durch zwei zusätzliche unabhängige Reviewer plus Gegenreview,
- `w05-e7` als retired Composite Placement,
- historische Attempts und Evidence,
- keine neue ID wird Attempt-Schlüssel,
- keine Generator-Baseline wird verändert.

## D4. Claims, Difficulty und Didaktik

Prüft:

- Primary Claims und Co-Evidence,
- Difficulty nicht nur als alte Zahl,
- monotone Schwierigkeit innerhalb der CaseTemplates,
- Darstellung gegen tatsächliche kognitive Anforderung,
- alle 57 Human-Review-Markierungen,
- alle 235 Unsicherheitsdatensätze,
- keine Agentenentscheidung wird als menschliche Releasefreigabe ausgegeben.

Jeder Querschnittsreview verändert keine Shards und besitzt genau einen disjunkten Berichtspfad:

- D1: `research/streamlining/s4a-v2/reviews/cross-families-review.md`
- D2: `research/streamlining/s4a-v2/reviews/cross-grading-feedback-review.md`
- D3: `research/streamlining/s4a-v2/reviews/cross-persistence-review.md`
- D4: `research/streamlining/s4a-v2/reviews/cross-claims-difficulty-review.md`

Bestätigte Findings werden durch getrennte Korrekturcommits oder einen klar abgegrenzten Korrekturschritt behoben. Jede Verwendung von `resolved-by-review-council` referenziert einen dieser oder einen domänenspezifischen Reviewbericht über `councilReviewRef`.

Stop-Gate D:

- alle Cross-Domain-Familien besitzen vollständige, abgeleitete Mitgliedschaften,
- alle sechs bekannten Inkonsistenzklassen sind entschieden,
- alle High/Critical Findings geschlossen oder mit Noa-Entscheidung blockiert,
- kein stiller Familienalias,
- alle 268 Quellen weiterhin genau einmal abgedeckt.

# Arbeitsblock E: finale v2-Artefakte und Assembler

Nach allen Korrekturen:

1. Leite `canonical-families.json` aus den bestätigten Shards ab oder validiere seine vollständige Mitgliedschaft im Assembler gegen sie. Der Assembler prüft für jede Familie exakte `memberSourceIds`, abgeleitete Domänen, Counts, kanonischen Namen und shardübergreifend identische Verträge. Kein leerer oder partieller Membership-Eintrag darf bestehen.
2. Leite `domains` und Counts aus tatsächlichen Placements ab.
3. Generiere mit `assemble-v2.mjs --write`:
   - `migration-matrix-v2.json`,
   - `feedback-disposition.json`,
   - `decision-queue.json`.
4. Erzeuge `v1-v2-comparison.md` mit:
   - 256 v1-Familien gegen finale CognitiveFamilies,
   - FamilyGroups,
   - aktive und historische TaskArchetypes,
   - CaseTemplates,
   - atomare und Composite Placements,
   - Singletonquote,
   - Wiederverwendung je Familie,
   - erwartete Code-, Content- und Testreduktion,
   - offene Noa- und empirische Entscheidungen.
5. Führe den Assembler ohne `--write` erneut aus und beweise Byte-Frische.

Vollständigkeitsgates:

- 268 Baseline-Definitionen genau einmal,
- alle sieben Domänenmengen korrekt,
- 57 Human-Review-Markierungen disponiert,
- 235 Unsicherheiten disponiert,
- 623 Feedbackvorkommen vollständig,
- 275 konsumierbare Feedbackregeln geschützt,
- 348 unkonsumierte Regeln mit Zielpfad,
- fünf Merge-Kandidaten einzeln behandelt,
- `w05-e7` und `w37-e1` einzeln behandelt,
- jede Singleton-CognitiveFamily begründet,
- `canonical-families.json` durch den Assembler vollständig gegen alle Shards validiert,
- jede `resolved-by-review-council`-Disposition mit existierendem `councilReviewRef`,
- keine Produktions-, Content-, Produkt-Schema- oder Generatoränderung.

Kompressionsregel:

Es gibt keine erzwungene Zielzahl. Das Ergebnis muss aber substanziell weniger echte CognitiveFamilies als die 256 v1-Familien zeigen. Die vorhandene 64er-Liste ist eine Hypothese, kein zu verteidigender Sollwert. Jede Split- oder Merge-Entscheidung folgt Evidence Claim, Lösung, ausführbarer Autorität, Invarianten und Fehlerhypothesen.

# Arbeitsblock F: finaler adversarialer S4A-v2-Review

Nutze GLM Flash Max read-only für den gesamten v2-Stand.

Prüffragen:

- Sind Familien fachlich zu breit oder nur umbenannte Themencontainer?
- Sind vermeintliche Singletons tatsächlich CaseTemplates bestehender Familien?
- Sind TaskArchetype und CognitiveFamily wirklich orthogonal?
- Ist jede Familie später mit einem Generator-/Solver-/Property-Test-Vertrag implementierbar?
- Sind Composite Placements sauber von atomaren Items getrennt?
- Sind alle Feedbackpfade ehrlich und implementierbar?
- Bleiben IDs, Attempts und Evidence stabil?
- Behauptet irgendeine Agentenentscheidung menschliche Freigabe?
- Sind v1 und v2 reproduzierbar?

Nur bestätigte Findings korrigieren. Danach Blöcke C bis E betroffen erneut prüfen.

Erzeuge vor Commit 8 den Digest `docs/session-2026-09-02-s4a-v2-family-review.md` mit finalen Zahlen, Reviewerbefunden, bestätigten Korrekturen, verbleibenden Noa-/Empirieentscheidungen und reproduzierbaren Befehlen.

Commit 8:

`design(learning-platform): complete S4A v2 exercise family taxonomy`

Der Commit umfasst ausschließlich `research/streamlining/s4a-v2/` und den S4A-v2-Sessiondigest. Kein Produktionscode.

# Arbeitsblock G: Dokumentation und verständliche Erklärung

Übernimm die aktuellen Dokumente aus dem Haupt-Checkout in den Integrationsbranch, ohne den Haupt-Checkout zu verändern:

- `docs/streamlining-umbauplan.md`
- `docs/idle-task-pre-s2b-integration.md`
- `docs/idle-task-pre-s2b-continuation.md`

Aktualisiere Status, Commit-SHAs, Metriken und offene Abhängigkeiten.

Erzeuge oder vervollständige:

- `docs/session-2026-09-02-i0-integration-final.md`
- `docs/streamlining-status-einfach.md`

Der bereits mit Commit 8 versionierte S4A-v2-Digest wird in diesen Dokumenten referenziert, aber nicht still umgeschrieben.

Die einfache Erklärung beantwortet ohne unnötigen Jargon:

1. Was war vor dem Streamlining doppelt oder schwer wartbar?
2. Was hat S0 gesichert?
3. Was wurde mit Numbas und FSRS entfernt und warum?
4. Was hat S2A in Preact vereinheitlicht?
5. Was leistet das Journal und welche Browserfehler wurden behoben?
6. Was war S4A-v1 und warum war 256 Familien noch kein gutes Zielmodell?
7. Wie strukturiert S4A-v2 CognitiveFamilies, TaskArchetypes, CaseTemplates und Placements?
8. Wie viele Familien, Archetypen und Templates gibt es jetzt und warum?
9. Was ist im Code bereits zentralisiert und was ist bisher nur entworfen?
10. Welche offenen Noa-, Human-Review- oder empirischen Entscheidungen bleiben?
11. Was macht S2B als Nächstes?
12. Was machen S3A und S3B danach?
13. Wie führen S4B und S4C zu LearningModules, Synthese-Lektionen und leicht erweiterbaren Aufgabenvarianten?
14. Was wurde noch nicht gebaut, insbesondere Timeline, S4C-Runtime und massenhafte Lektionsgenerierung?

Fakten, Unsicherheiten und Zukunftsannahmen trennen.

# Arbeitsblock H: nächste Sessions vorbereiten, nicht implementieren

Erzeuge im Integrationsdigest aktuelle, getrennte Copy-Paste-Prompts für:

1. S2B: Preact als einziger Einstieg, Legacy-Shell und ersetzte CDP-Treiber kontrolliert löschen.
2. S3A: LearningPolicy mit gemeinsamer Instance-, Zeit-, Hint- und Eligibility-Normalisierung bei getrennten Review-/Evidence-Projektionen.
3. S3B: LearningLedger mit genau einem Event-Builder und stabilem v3-Vertrag.
4. S4B: LearningModule und normalisiertes Authoring-Modell.
5. S4C: ExerciseFamily-Runtime auf Basis der finalen S4A-v2-Taxonomie.

Zusätzlich erstelle für S2B eine aktuelle read-only Lösch- und Caller-Matrix. Sie ist nur eine Entscheidungsvorlage. Keine Legacy-Datei löschen.

Jeder Folgeprompt enthält:

- exakten Startcommit,
- Scope und Nichtziele,
- relevante Artefakte,
- OWNED PATHS,
- Fast- und Full-Gates,
- Lösch- und Commitfreigaben als offen,
- Stopbedingungen.

Commit 9:

`docs(learning-platform): finalize pre-S2B integration handoff`

# Arbeitsblock H2: adversarialer Review des gesamten Commitstapels

Nutze GLM Flash Max read-only über den vollständigen Integrationsdiff `1998d57..Commit 9`, nicht nur über S4A-v2.

Prüfe mindestens:

- S0R-Clean-Checkout-Vertrag,
- Numbas- und FSRS-Retirement ohne Revival- oder Notice-Lücke,
- S2A-Persistenz, Journal, archivierte Reviews, Local-private-Link und Browserverträge,
- S4A-v1/v2-Reproduzierbarkeit,
- unerwartete Scope-Ausweitung,
- Public-Build-, Lizenz- und Privacy-Garantien,
- aktuelle v3-IDs, Attempts und Evidence,
- Widersprüche zwischen Digests, Masterplan und Code,
- Freigabereife für S2B.

Nur bestätigte Findings korrigieren. Jede Korrektur erhält einen eigenen kleinen Commit oder wird vor Commit 9 eingearbeitet, wenn der Review noch vor dessen Finalisierung läuft. Danach betroffene Gates erneut ausführen. Kein ungeklärtes High/Critical Finding darf in die Clean-Checkout-Abnahme gehen.

# Arbeitsblock I: vollständige Clean-Checkout-Abnahme

Erzeuge aus Commit 9 einen zweiten frischen Verifikationsworktree. Kopiere keine ignorierten Contract-Dateien, Receipts oder Buildartefakte hinein.

Wenn lokale Bibliothekspfade nötig sind, verwende nur die dokumentierten, ignorierten `library/`- und `library-private/`-Symlinks. Tracke oder verändere sie nicht.

Beende keine fremden Server. Nutze einen freien Port und beende nur eigene Prozesse.

Führe mindestens aus:

- `node --test tests/`
- `npm run test:project-runner`
- `npm run coverage:check`
- `npm run typecheck`
- `npm run build:release`
- `npm run test:e2e`
- `npm run test:e2e:build`
- Compile public und local-private
- Root- und Legacy-Validierung
- Public-Build und Public-Validierung
- Open-Core-Export-Test
- beide noch vorhandenen CDP-Acceptance-Flows
- Local-private-Lesepfad-Test
- S4A-v1-Reproduktion gegen `1998d57`
- S4A-v2-Assembler und Schema-Validierung
- `npm audit`
- `git diff --check`
- Prüfung auf unerwartete getrackte Änderungen nach allen Gates

Messe gegen S0:

- Runtime-LOC,
- Tool-LOC,
- Test-LOC,
- Node-Testzahl und Laufzeit,
- E2E-Zahlen,
- Initial-JS gzip,
- Public-Dateizahl,
- aktuelle Definitionen,
- S4A-v1- und v2-Familienzahlen,
- aktive TaskArchetypes,
- CaseTemplates und Composite Placements.

Wenn ein technisches Gate rot ist, stoppe und behebe nur den bestätigten Root Cause. S4A-v2-Forschungsartefakte dürfen keinen Produktionsbuild beeinflussen.

## Endzustand

Der Task ist erst abgeschlossen, wenn:

- Branch `streamline/integration-pre-s2b` auf Commit 9 oder bestätigten Korrekturcommits sauber ist,
- `main` weiterhin auf `1998d57` steht,
- kein Push erfolgt ist,
- bestehende Worktrees und Branches nicht gelöscht wurden,
- alle sieben Implementer-Shards und sieben unabhängigen Reviews vorhanden sind,
- Cross-Domain- und Max-Review abgeschlossen sind,
- S4A-v2 vollständig und reproduzierbar ist,
- Clean Checkout vollständig grün ist,
- einfache Erklärung und fünf Folgeprompts vorliegen,
- S2B und S3 nicht begonnen wurden.

## Finaler Bericht

Melde:

- finalen Commitstapel ab `9421d62`,
- alle bestätigten und widerlegten Reviewer-Findings,
- finale FamilyGroups, CognitiveFamilies, aktive/historische TaskArchetypes, CaseTemplates und Composite Placements,
- Dispositionen 57/235/348,
- v1-v2-Kompression und erwartete spätere Code-/Testreduktion,
- vollständige Gate-Ergebnisse,
- S0-gegen-Endstand-Metriken,
- offene Noa- und empirische Entscheidungen,
- Freigabereife und exakte Blocker für S2B,
- Voraussetzungen für S3A, S3B, S4B und S4C,
- Pfade zu allen Handoff-Dokumenten.

Kein Merge nach `main`, kein Push und keine Implementierung der Folgesessions.
