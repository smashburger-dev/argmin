# Idle-Task: gemeinsamer grüner Stand vor S2B und S3

Stand: 2026-09-02

## Auftrag

Erzeuge aus den isolierten Ergebnissen S0R, S1A, S1B, S2A und S4A einen einzigen grünen, lokalen Integrationsbranch. Löse dabei die bestätigten offenen Integrationspunkte. Vertiefe anschließend die konservative S4A-v1-Taxonomie zu einem wirklich wiederverwendbaren S4A-v2-Familienmodell.

Implementiere weder S2B noch S3, S4B oder S4C. Lösche die Legacy-Shell und die CDP-Treiber noch nicht. Ändere keine Generator-Baseline.

## Rolle und Modelle

Du bist der Orchestrator mit GPT-5.6 Sol XHigh. Nutze GLM 5.3 Flash High für technische, didaktische und analytische Subagents. Nutze GLM Flash Max nur für den finalen adversarialen Review des Integrationsdiffs und der S4A-v2-Architektur.

Schreibende Subagents erhalten explizite, disjunkte `OWNED PATHS`. Gemeinsame Interfaces, Git-Integration, Schemas, Package-Scripts, Build-Entrypoints, zentrale Registries und finale Konfliktauflösung bleiben beim Orchestrator.

Vor Codeänderungen `shrink-complexity full` anwenden. Vor Tests `affected-test-runner` und `fast-then-full` lesen. Für echte Fehler `diagnosing-bugs` verwenden. Alle Projektregeln in `AGENTS.md` gelten.

## Autorisierte Git-Aktionen

Noa hat ausdrücklich genehmigt:

- lokale Einzelcommits für S0R, S1B-Fix, S1A, S2A, S4A-v1, S4A-v2 und Integrationsdokumentation,
- lokale Branches als Recovery-Refs,
- Cherry-picks dieser Einzelcommits in einen neuen Integrationsbranch,
- konfliktauflösende Integrationscommits.

Nicht genehmigt:

- Merge oder Fast-forward nach `main`,
- Push,
- Force-Push,
- Rebase oder Amend bestehender Commits,
- Löschen bestehender Branches oder Worktrees,
- Änderungen außerhalb der KI-Lernplattform,
- weitere globale oder User-Level-Installationen.

Der bestehende S1B-Commit `f257b57` bleibt unverändert und erhält einen Follow-up-Commit. Das unerlaubt durch einen S4A-Agent installierte User-Level-Paket `jsonschema` darf installiert bleiben. Verlasse dich nicht darauf; verwende das im Repository vorhandene Ajv. Führe keine weitere Systemänderung aus.

## Pflichtlektüre

Lies vor dem ersten Schreibzugriff vollständig:

- `/Users/no8/Desktop/life/Lifemaxxing/ki-lernplattform/AGENTS.md`
- `/Users/no8/Desktop/life/Lifemaxxing/ki-lernplattform/docs/streamlining-umbauplan.md`
- `/Users/no8/Desktop/life/Lifemaxxing/ki-lernplattform/docs/session-2026-09-01-s0-baseline.md`
- `/Users/no8/Desktop/life/Lifemaxxing-s1a-1998d57/ki-lernplattform/docs/session-2026-09-01-s1a-fsrs-inventory.md`
- `/Users/no8/Desktop/life/Lifemaxxing-s1b-1998d57/ki-lernplattform/docs/session-2026-09-01-s1b-numbas-inventory.md`
- `/Users/no8/Desktop/life/Lifemaxxing-s2a-1998d57/ki-lernplattform/docs/session-2026-09-01-s2a-preact-parity.md`
- `/Users/no8/Desktop/life/Lifemaxxing-s4a-1998d57/ki-lernplattform/docs/session-2026-09-01-s4a-content-taxonomy.md`
- `/Users/no8/Desktop/life/Lifemaxxing-s4a-1998d57/ki-lernplattform/research/streamlining/s4a/summary.md`
- die S4A-v1-Matrix und ihr Schema

Behandle Sessionberichte als Behauptungen. Git-Trees, Diffs, Quellcode und reproduzierbare Gates sind die Ground Truth.

## Ausgangszustand

- `main` zeigt auf `1998d57`.
- Der Haupt-Checkout enthält einen uncommitteten Diff nur an `docs/streamlining-umbauplan.md`. Übernimm die aktuelle Fassung später in den Integrationsbranch, ändere den Haupt-Checkout aber nicht.
- S1A ist detached auf `1998d57` und enthält nur einen uncommitteten Inventar-Digest.
- S1B ist detached auf `f257b57`, Worktree sauber.
- S2A ist detached auf `1998d57` mit zehn geänderten Produkt-/Testdateien plus Digest, kein Commit.
- S4A ist detached auf `1998d57` mit zwölf Analyse-/Digestartefakten, kein Commit.
- S0R wurde noch nicht ausgeführt.

Bestehende Worktrees nicht löschen:

- `/Users/no8/Desktop/life/Lifemaxxing-s1a-1998d57`
- `/Users/no8/Desktop/life/Lifemaxxing-s1b-1998d57`
- `/Users/no8/Desktop/life/Lifemaxxing-s2a-1998d57`
- `/Users/no8/Desktop/life/Lifemaxxing-s4a-1998d57`

## Endergebnis

Der Task ist erst abgeschlossen, wenn:

1. ein neuer lokaler Branch `streamline/integration-pre-s2b` in einem eigenen frischen Worktree existiert,
2. jeder Arbeitsschritt einen eigenen nachvollziehbaren Commit besitzt,
3. S0R, der unveränderte S1B-Commit, S1B-Fix, S1A, S2A, S2A-Integrationsfix, S4A-v1, S4A-v2 und die Abschlussdokumentation integriert sind,
4. ein zweiter frischer Verifikationsworktree ausschließlich aus dem finalen Integrationscommit vollständig grün ist,
5. `main` unverändert auf `1998d57` zeigt,
6. kein Push erfolgt ist,
7. eine einfache deutsche Erklärung des bisherigen Streamlinings und der nächsten Schritte vorliegt.

## Arbeitsprinzip

Dieser Idle-Task enthält mehrere interne Arbeitsabschnitte. Jeder Abschnitt endet mit:

- eigenem Commit,
- Fast Gate,
- dokumentiertem Ergebnis,
- sauberem Arbeitsbaum.

Bei einem roten Gate stoppen. Nicht mit dem nächsten Abschnitt fortfahren. Keine Metrik durch höhere Timeouts, Sleeps, schwächere Assertions, gelöschte Validierung oder Code-Golf erzwingen.

Wenn der Kontext vor S4A-v2 knapp wird, beende zuerst die technische Integration vollständig grün und schreibe einen exakten Continuation-Prompt für S4A-v2 auf demselben Branch. S4A-v2 darf nicht verkürzt oder still ausgelassen werden.

# Abschnitt 0: Branch- und Recovery-Sicherheit

1. Verifiziere alle oben genannten Worktrees, SHAs und Diffs.
2. Erzeuge lokale Recovery-Refs für die detached Ergebnisse, ohne ihre Historie umzuschreiben.
3. Committe S2A in seiner eigenen Worktree als eigenen Source-Commit. Vorher Diff, sensible Daten und Scope prüfen.
4. Committe S4A-v1 in seiner eigenen Worktree als eigenen Analyse-Commit. Keine v2-Änderung dort hineinmischen.
5. Sichere den S1A-Inventar-Digest in einem eigenen lokalen Commit oder übernimm ihn später unverändert in den S1A-Commit.
6. Erzeuge einen neuen frischen Worktree ab `1998d57` für `streamline/integration-pre-s2b`.
7. Arbeite ab dann nur im Integrationsworktree. Die Quellworktrees bleiben unangetastete Recovery-Quellen.

Stop-Gate:

- alle Source-Commits und Recovery-Refs sind erreichbar,
- kein fremder Workspace-Diff ist enthalten,
- kein Branch und Worktree wurde gelöscht,
- `main` steht weiterhin auf `1998d57`.

# Abschnitt 1: S0R Clean-Checkout-Repair

Problem: Die Root-Ignore-Regel `*Contract*` blendet fünf Pyodide-Vertragsdateien aus. Der Baseline-Commit referenziert `tools/pyodide_contract_matrix.mjs`, trackt die Datei aber nicht. Bisherige grüne Gates hingen von ignorierten lokalen Dateien ab.

Quelldateien, die gezielt getrackt werden müssen:

- `tools/pyodide_contract_matrix.mjs`
- `tests/pyodide_contract_matrix.test.mjs`
- `tests/e2e/pyodide-contracts.spec.ts`

Generierte Dateien, die ignoriert bleiben:

- `tests/e2e/pyodide-contract-matrix.json`
- `tests/e2e/pyodide-contract-receipt.json`

Anforderungen:

1. Prüfe die drei lokalen Quelldateien, bevor du sie übernimmst. Kopiere sie nicht blind.
2. Ergänze in der Projekt-`.gitignore` exakte Negationen nur für diese drei Quelldateien. Root-`.gitignore` nicht ändern und kein breites `!**/*contract*` verwenden.
3. Beide E2E-Einstiege erzeugen die Matrix deterministisch vor Playwright.
4. Die Node-Suite darf in einem sauberen Checkout vor dem ersten Browserlauf nicht an einem fehlenden Receipt scheitern. Ein fehlendes Receipt wird klar als nicht ausgeführter Browserbeweis behandelt, nicht als bestandener Browserbeweis.
5. Der Playwright-Spec bleibt autoritativ für Referenzlösung, gebrochenen Gegenfall, Timeout und Worker-Neustart.
6. Matrix und Receipt bleiben generierte Artefakte.
7. Ändere keinen Pyodide-Sicherheitsvertrag.

Commit 1: eigener S0R-Commit.

Stop-Gate in einem zweiten frischen Worktree dieses Commits:

- `git ls-tree` enthält die drei Quelldateien,
- keine ignorierte Quelldatei wurde manuell kopiert,
- Node-Suite läuft aus dem Clean Checkout,
- Open-Core-Export-Test läuft,
- beide E2E-Einstiege erzeugen ihre Matrix,
- Pyodide-Browservertrag läuft,
- `git diff --check` ist sauber.

# Abschnitt 2: S1B übernehmen und härten

1. Cherry-picke `f257b57` unverändert nach dem S0R-Commit.
2. Nimm keine Pyodide-Datei über den S1B-Digest ein zweites Mal auf. S0R besitzt diesen Fix.
3. Erstelle direkt danach einen S1B-Follow-up-Commit mit folgenden Korrekturen.

Korrekturen:

- Entferne die tote Erzeugung von `w05-e7.exam` aus `tests/validate_locatorpath.test.mjs`.
- Stelle `/numbas-src/i` als Tombstone in `tools/content_policy.mjs` und im Source-Scan von `tools/build_public.mjs` wieder her.
- Sorge mit einem synthetischen Negativtest dafür, dass `grader: "numbas"`, `type: "numbas-exam"` und `examFile`-Revival fail-closed als retired abgelehnt werden.
- Behalte die Schema-Enums ohne Numbas.
- Entferne die drei toten Numbas-Icon-Ausnahmen aus der Projekt-`.gitignore`.
- Ersetze die harten Nullverträge, die jede zukünftige Local-only-Aufgabe verbieten. Der Vertrag lautet: Local-only darf bewusst im lokalen Profil existieren, aber nie in Public gelangen. Prüfe das mit synthetischer Fixture oder bestehendem Overlay-Vertrag.
- Korrigiere den S1B-Digest: tatsächliche Testzahlen, tatsächlicher Pyodide-Dateistatus, Commit `f257b57` und die Evidence-Semantik.

Persistenzentscheidung:

- Historische `w05-e7`-Attempts bleiben gespeichert und exportierbar.
- Bereits gespeicherte Kompetenz-IDs dürfen weiterhin die damalige Evidence tragen.
- Keine Attempts löschen und keine Evidence rückwirkend entwerten.
- Ein nicht mehr ausführbarer Review darf später keinen toten Link erzeugen. Die generische UI-Lösung folgt nach S2A-Integration.

Fachentscheidung:

- Numbas bleibt entfernt.
- Die fachlichen Teilziele von `w05-e7` sind durch `w05-e1`, `w05-e5` und `w05-e6` erhalten.
- Das alte mehrteilige Format wird nicht in dieser Integrationssession neu gebaut. S4A-v2 hält es als Case-/Placement-Entscheidung sichtbar.

Commit 2 ist der vorhandene S1B-Commit. Commit 3 ist der S1B-Fix.

Stop-Gate:

- S1B-Fast-Tests,
- Compile public und local-private mit 267 Definitionen,
- Root-, Legacy- und Public-Validierung,
- Coverage,
- Public-Build,
- Open-Core-Test,
- negativer Numbas-Tombstone-Test,
- kein Numbas-Runtimepfad vorhanden,
- historische Erwähnungen und Tombstone-Tests sind erlaubt.

# Abschnitt 3: S1A Variante A ausführen

Noa hat Variante A freigegeben.

Arbeite inhaltsverankert auf dem nach S1B grünen Integrationsstand, nicht anhand alter Zeilennummern.

Entferne:

- `vendor/ts-fsrs/`,
- FSRS-spezifischen Code in `review_scheduler.js`,
- `fsrsThreshold`,
- `fsrsReviewState`,
- `attemptToRating`,
- `schedulerModeFor`,
- FSRS-spezifische Tests, Notices und aktive Dokumentationsbehauptungen.

Schreibe `mode: 'expanding'` direkt in den Queue-Eintrag. Behalte unverändert:

- `postLadderPolicy`,
- Expanding-Slots,
- Mastery-Hint-Schwelle,
- Instance-Key-Vertrag,
- Import und Neubau bestehender Queue-Einträge.

Historische FSRS-Evidence in Baseline-Dokumenten darf als historisch markiert bleiben. Alte Queue-Felder werden nicht gelöscht; sie werden beim Refresh aus Attempts neu abgeleitet.

Commit 4: S1A FSRS-Retirement.

Stop-Gate:

- alle S1A-Scheduler-/Mastery-/Retention-Tests,
- Expanding-Ausgaben semantisch identisch,
- Notices und Public-Allowlist konsistent,
- Node-Suite, Typecheck und Release-Build mindestens im Fast-then-full-Checkpoint,
- keine aktive FSRS-Runtime oder unklare produktive Referenz.

# Abschnitt 4: S2A integrieren und offene Punkte schließen

1. Cherry-picke den zuvor gesicherten S2A-Source-Commit.
2. Erwarte Konflikte in `src/ui/App.tsx`, `src/ui/views.tsx` und `tests/e2e/next-shell.spec.ts`.
3. Konfliktregel:
   - S1B gewinnt bei Entfernung von `LocalActivityView`, `local-activity`, Numbas-Texten und w05-e7-E2E.
   - S2A gewinnt bei Journal, Settings-Hydration, Seed, Mastery, Worked Example, Migration, Pyodide-Verträgen, Roadmap ohne Wochenlinks und entferntem Preact-Week-Routing.
4. Nach Auflösung dürfen `LocalActivityView`, geroutetes `local-activity` und geroutetes `WeekView` nicht wiederauferstehen.

Schließe zwei offene S2A-Punkte:

## Archivierte Reviews

Implementiere einen generischen Vertrag für ReviewQueue-Einträge, deren `exerciseId` im aktuellen Katalog nicht mehr existiert:

- Attempt-Historie und historische Evidence bleiben erhalten.
- Kein Link auf eine nicht vorhandene Aufgabe.
- Ausführbare und archivierte Reviews werden getrennt gezählt.
- Die UI erklärt knapp, dass der Inhalt nicht mehr verfügbar ist, die Historie aber erhalten bleibt.
- Kein Hardcode auf `w05-e7` oder Numbas.
- Gezielter Test mit unbekannter Definition-ID.

## Local-private-Lesepfad

Ersetze den letzten einzigartigen CDP-W4-Vertrag in der bestehenden Playwright-Infrastruktur:

- lokales Privatprofil verwenden,
- lokale Lesefassung antwortet über HTTP mit 200,
- Link öffnet in neuem Tab,
- `target="_blank"` und `rel="noopener"`,
- keine private Pfadangabe im Public-Build,
- kein zweites E2E-Framework.

Behalte S2As Root-Cause-Fixes A, B und C. Keine zusätzlichen Sleeps oder pauschalen Timeout-Erhöhungen.

Commit 5: unveränderter S2A-Source-Commit. Commit 6: Konfliktauflösung und Integrationshärtung.

Mittelgate nach Commit 6:

- fokussierte Journal-, Settings-, Review-, Migration- und Pyodide-Tests,
- vollständige Node-Suite,
- Typecheck,
- Release-Build,
- vollständiger Dev-E2E-Lauf,
- vollständiger Chromium-Build-E2E-Lauf,
- Local-private-Lesepfad-Test,
- manueller Browsercheck am Build,
- keine wiederauferstandenen Wochen- oder Numbas-Routen.

# Abschnitt 5: S4A-v1 als historische Loss-Prevention-Basis integrieren

1. Cherry-picke den gesicherten S4A-v1-Source-Commit unverändert.
2. S4A-v1 beschreibt ausdrücklich den Baseline-Commit `1998d57` mit 268 Definitionen, inklusive der später retired `w05-e7`.
3. Ändere die v1-Matrix nicht auf 267 und schreibe ihre historischen Entscheidungen nicht um.
4. Mache ihre Reproduktion nach S1B explizit möglich. `assemble.mjs` darf im Integrationsbranch nicht versehentlich den aktuellen 267er Contentbaum als 268er Baseline behandeln.
5. Nutze einen expliziten `--source-root`- oder gleichwertigen Baseline-Modus. Dokumentiere den reproduzierbaren Lauf gegen eine saubere Arbeitskopie von `1998d57`.
6. Verwende ausschließlich das bereits vorhandene Ajv. Das User-Level-Paket `jsonschema` ist weder nötig noch Teil des Projekts.

Commit 7: S4A-v1-Artefakte plus nur die minimale Baseline-Reproduktionshärtung.

Stop-Gate:

- exakt 268 Baseline-Einträge,
- 256 v1-Familien,
- 57 Human-Review-Markierungen,
- 235 Unsicherheiten,
- 623 Feedbackregeln,
- 275 konsumierbar,
- 348 nicht konsumierbar,
- 72 deterministische Regeln außerhalb der Grammatik,
- 0 fehlende oder doppelte IDs,
- aktueller Produktbaum darf unabhängig davon 267 Definitionen enthalten.

# Abschnitt 6: S4A-v2 Deep Family Review

Dieser Abschnitt ist ein eigener Arbeitsblock und eigener Commit. Wenn der Kontext knapp wird, erstelle einen Continuation-Prompt und setze auf demselben grünen Integrationsbranch fort. Verkürze den Abschnitt nicht.

## Forschungsbasis

Prüfe aktuelle Primärdokumentation und etablierte Muster. Nutze sie als Designreferenz, nicht als Dependency:

- Evidence-Centered Design: Claims, Evidence Model, Task Model und Assembly Model.
- Automatic Item Generation: Cognitive Model, Item Model und generierte Instanzen.
- PrairieLearn: unabhängige Questions, Seeded Variants sowie Generate, Parse und Grade.
- STACK: Question Tests, Answer Notes und Potential Response Trees für diagnostisches Feedback.
- QTI 3: Trennung von Assessment Item, Section und Test/Assembly.
- Numbas-Dokumentation darf nur als historische Referenz für Variablen, Randomisierung und mehrteilige Markierung dienen. Numbas bleibt aus dem Produkt entfernt.

Dokumentiere ausdrücklich, was nicht übernommen wird: QTI-XML, PrairieLearn-Runtime, STACK-CAS, Numbas-Runtime, Serverabhängigkeit oder neue externe Bibliothek.

## Design-it-twice

Lasse mindestens drei unabhängige GLM-Flash-Architekturagents radikal verschiedene Familienmodelle entwerfen:

1. Cognitive-first: gemeinsamer Lösungs- und Denkvertrag als Familie.
2. Interaction-first: Input-, Grader- und Feedbackprotokoll als Hauptstruktur.
3. Competency-/Module-first: Evidence Claim und Lernplatzierung als Hauptstruktur.

Ein vierter Agent prüft ein orthogonales Modell, bei dem kognitive Familie und TaskArchetype getrennte Achsen sind. Vergleiche Depth, Locality, Authoring-Touchpoints, Testbarkeit und tatsächliche Kompression. Nutze GLM Flash Max für den adversarialen Vergleich. Wähle begründet ein Modell oder einen Hybrid.

## Erwartetes Zielmodell

Prüfe bevorzugt diese orthogonale Hierarchie, übernimm sie aber nicht ungeprüft:

- `CompetencyClaim`: welche Fähigkeit nachgewiesen werden soll.
- `FamilyGroup`: grobe fachliche Großfamilie.
- `CognitiveFamily`: gemeinsamer Lösungsweg, Invarianten und Referenzmodell.
- `TaskArchetype`: Interaktion, Antwortform, Graderklasse und Evidence-Art. Diese Achse darf orthogonal zur CognitiveFamily sein.
- `CaseTemplate`: manipulierbare Variablen, Darstellung, Randfälle und diagnostische Fehlerklassen.
- `DifficultyProfile`: kognitive Anforderung, nicht bloß heutige Zahl 1 bis 5.
- `ExercisePlacement`: Nutzung in LearningModule/Lektion, Mastery-/Review-Policy und gewünschte Schwierigkeit.
- `SeededInstance`: deterministischer Seed, konkrete Parameter und Solvererwartung.

Eine CognitiveFamily darf mehrere TaskArchetypes nutzen, wenn der gemeinsame Lösungs- und Evidence-Vertrag wirklich derselbe bleibt. Ein CaseTemplate bindet immer an einen konkreten unterstützten GraderAdapter. Unterschiede werden damit nicht durch 256 Familien erzwungen, aber auch nicht in einer riesigen Sammelfamilie versteckt.

## Vollständiger Review aller 268 Definitionen

Erzeuge neue v2-Artefakte. Überschreibe S4A-v1 nicht.

Für jede der 268 Baseline-Definitionen:

- ordne CompetencyClaim, FamilyGroup, CognitiveFamily, TaskArchetype, CaseTemplate, DifficultyProfile und künftige Placement-Regeln zu,
- dokumentiere den gemeinsam nutzbaren Solver-/Grader-/Generatorvertrag,
- prüfe alle bisherigen Vergleichskandidaten erneut,
- begründe jede verbleibende Singleton-CognitiveFamily anhand von Lösungsweg, Evidence Claim, Invarianten und Graderanforderung,
- erhalte historische IDs oder definiere eine Merge-/Retire-Map,
- markiere `w05-e7` als nach Noas Freigabe in S1B retired, ohne die historische Matrixzeile zu löschen,
- behalte frühere `w05-e7`-Evidence und verhindere nur tote ausführbare Reviews,
- prüfe `w37-e1` durch mindestens zwei unabhängige Reviewer plus adversarialen Gegenreview.

Es gibt keine erzwungene Zielzahl. Das Ergebnis muss aber deutlich mehr Wiederverwendung zeigen als 256 CognitiveFamilies für 268 Definitionen. Jede nicht erreichte Kompression braucht eine konkrete fachliche Begründung. Melde mindestens:

- Anzahl FamilyGroups,
- Anzahl CognitiveFamilies,
- Anzahl TaskArchetypes,
- Anzahl CaseTemplates,
- Anzahl Placements,
- Anteil Singleton-CognitiveFamilies,
- potenzielle Code-, Content- und Testreduktion pro Familie.

## Alle 57 Human-Reviews und 235 Unsicherheiten

Gehe jeden Eintrag durch. Keine Sammelantwort.

Jeder Eintrag erhält eine Disposition:

- `resolved-with-code-evidence`,
- `resolved-with-source-evidence`,
- `resolved-by-review-council`,
- `requires-noa-decision`,
- `requires-empirical-data`,
- `deferred-to-s4b`,
- `deferred-to-s4c`,
- `deferred-to-domain-migration`.

Für jede nicht endgültig aufgelöste Frage müssen Eigentümer, exakte Entscheidung, benötigter Beleg und spätestes Gate genannt werden. Eine Agentenbewertung darf nicht fälschlich als menschliche didaktische Releasefreigabe gelten. Erzeuge eine nach Risiko priorisierte Entscheidungsqueue für Noa.

## Alle 348 nicht konsumierten Feedbackregeln

Entscheide für jedes Vorkommen oder jede nachweislich identische Regelgruppe einen Zielpfad:

- deklarativer Feedback-Predicate im künftigen Familienvertrag,
- Answer Note beziehungsweise Testdiagnose aus autoritativem Grader-/Pyodide-Test,
- Eingabevalidierung,
- generischer Hinweis,
- Worked Solution,
- redaktionelle Diagnose ohne Graderanspruch,
- retire-after-intent-extraction.

Die 275 bereits konsumierbaren Regeln bleiben verhaltensstabil. S4A-v2 löscht oder implementiert keine Runtime-Regel. Es liefert den vollständigen, maschinenlesbaren Zielvertrag für S4C.

Erzeuge mindestens:

- `research/streamlining/s4a-v2/family-model.md`
- `research/streamlining/s4a-v2/taxonomy.schema.json`
- domänenspezifische v2-Shards mit disjunkten OWNED PATHS
- `research/streamlining/s4a-v2/migration-matrix-v2.json`
- `research/streamlining/s4a-v2/feedback-disposition.json`
- `research/streamlining/s4a-v2/decision-queue.json`
- reproduzierbaren Assembler/Validator mit Ajv
- kurze Gegenüberstellung v1 gegen v2

Commit 8: S4A-v2 Deep Family Review.

Stop-Gate:

- alle 268 Definitionen genau einmal,
- alle 57 Human-Review-Markierungen disponiert,
- alle 235 Unsicherheiten disponiert,
- alle 348 nicht konsumierten Regeln mit Zielpfad,
- alle fünf Merge-Kandidaten und beide hohen Entscheidungen einzeln behandelt,
- keine Produktionsdatei, kein Produktschema, kein Generator und keine Generator-Baseline geändert,
- v1 bleibt reproduzierbar,
- v2 ist schema-valide und reproduzierbar,
- finaler adversarialer Review ohne ungeklärtes High/Critical Finding.

# Abschnitt 7: Dokumentation und einfache Erklärung

Übernimm die aktuellen Fassungen von `docs/streamlining-umbauplan.md` und `docs/idle-task-pre-s2b-integration.md` aus dem Haupt-Checkout in den Integrationsbranch, ohne den Haupt-Checkout zu ändern. Aktualisiere im Masterplan Status, Commit-SHAs, Metriken und offene Abhängigkeiten. Bewahre den ausgeführten Idle-Task als nachvollziehbares Integrationsprotokoll auf.

Erzeuge `docs/streamlining-status-einfach.md` in verständlichem Deutsch. Zielgruppe ist eine technisch interessierte Person ohne tiefe Codekenntnis.

Die Erklärung muss beantworten:

1. Warum war die Plattform schwer wartbar?
2. Was hat S0 gesichert?
3. Warum wurden Numbas und FSRS entfernt?
4. Was hat S2A in der neuen Preact-Oberfläche vereinheitlicht?
5. Was hat S4A-v1 inventarisiert?
6. Wie macht S4A-v2 aus Einzelaufgaben echte wiederverwendbare Familien?
7. Was ist jetzt tatsächlich zentralisiert und was noch nicht?
8. Welche technische Schuld oder Unsicherheit bleibt?
9. Was macht S2B als Nächstes?
10. Was machen S3A und S3B danach?
11. Wie führen S4B und S4C später zu LearningModules, Synthese-Lektionen und leicht erweiterbaren Aufgabenvarianten?
12. Was wurde ausdrücklich noch nicht gebaut, insbesondere Timeline und massenhafte Lektionsgenerierung?

Keine Erfolgsbehauptung ohne Messwert oder Gate. Fakten, Unsicherheit und spätere Annahmen trennen.

Commit 9: Masterplan, einfache Erklärung und Integrationsdigest.

# Abschnitt 8: vollständige Abnahme im Clean Checkout

Erzeuge aus dem finalen Integrationscommit einen zweiten frischen Verifikationsworktree. Kopiere keine ignorierten Vertragsdateien oder Buildartefakte hinein.

Falls lokale Bibliothekspfade für Root-Validierung nötig sind, verwende die dokumentierten `library/`- und `library-private/`-Symlinks als ignorierte Umgebungshilfe. Ändere oder tracke sie nicht.

Ports 8765 und 8970 können durch fremde Prozesse belegt sein. Beende keine fremden Prozesse. Verwende einen freien Port wie 8771 für selbst gestartete Server und beende nur eigene Prozesse.

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
- Prüfung, dass der Clean Checkout nach den Gates keine unerwarteten getrackten Änderungen enthält

Zusätzlich messen und gegen S0 berichten:

- Runtime-LOC,
- Tool-LOC,
- Test-LOC,
- Node-Testzahl und Laufzeit,
- E2E-Zahlen,
- Initial-JS gzip,
- Public-Dateizahl,
- Anzahl Definitionen,
- Anzahl CognitiveFamilies, TaskArchetypes und CaseTemplates.

Vor Abschluss GLM Flash Max für einen adversarialen Review des gesamten Commitstapels und der S4A-v2-Architektur einsetzen. Nur bestätigte Findings reparieren und danach betroffene sowie vollständige Gates erneut ausführen.

## Finaler Bericht

Melde:

- finalen Branch und Commit-SHAs in Reihenfolge,
- Ergebnis jedes Stop-Gates,
- Konflikte und ihre konkrete Auflösung,
- S0-gegen-Integration-Metriken,
- S4A-v1-gegen-v2-Kompression,
- offene Noa-Entscheidungen,
- exakte Blocker oder Freigabereife für S2B,
- exakte Voraussetzungen für S3A/S3B,
- Pfade zum Masterplan, einfachen Statusdokument und Integrationsdigest.

Kein Merge nach `main`, kein Push und kein Löschen der Quellworktrees. Stoppe nach dem grünen Integrationsbranch.
