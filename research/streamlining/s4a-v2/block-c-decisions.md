# Block-C-Entscheide (S4A-v2 Domänenreviews)

Stand: 2026-09-03. Alle sieben Domänenreviews liegen vor, alle mit Urteil
coral, keine Critical-Findings. Der Orchestrator hat jedes High- und
Medium-Finding an den Quellen nachgeprüft. Bestätigte Findings sind unten
mit Korrektur verzeichnet, widerlegte gibt es keine. Reviewberichte bleiben
unverändert als Auditspur. Shard-Korrekturen: 8 Moves, 1 Vertragserweiterung,
1 mergeInto-Umschreibung, 1 caseId-Rückbenennung.

## Bestätigt und korrigiert (Shards + Registry)

1. Foundations-F1 (high), Capstone-F1 (high): `w02-e1`, `w31-e3` sind
   Slice-Traces und verletzen den Diagnosetest in `trace-assignment-state`.
   Beide nach `trace-collection-state` verschoben. Die Slice-Achse existiert
   dort wörtlich. Eigene Quellenprüfung: `w02-e1` slicet und joint Strings,
   `w31-e3` slicet und normalisiert. Keine der vier alten Hypothesen deckt das.
2. Foundations-F2 (medium): `w01-e6` enthält keine einzige Zuweisung und liegt
   jetzt in `trace-call-composition` (Prozedurtest bestanden, 2. Archetyp der
   Familie mit Nähe-Dokumentation).
3. Deep-F1 (high): `w20-e3` (Ceil-Arithmetik, Float-Darstellung) bildet die neue
   Familie `trace-training-loop-count` (Registry adoptiert, Count 1).
4. Transformer-F1 (high): `w24-e3` (Greedy-Decode-Leser) nach
   `optimize-decode-greedy-loop` zum implementierenden Geschwister `w24-e4`
   (2. Archetyp, vom Reviewer ausdrücklich gestützt).
5. Linalg-F1 (high): `f-linalg-column-choice-01` (reines Nachrechnen, keine
   Elimination) bildet die neue Singleton-Familie
   `classify-column-combination` (Registry adoptiert, Count 1).
6. Data-F1 (medium): `w13-e4` (Gruppen-Fehlerraten, kein Confusion-Objekt) nach
   `aggregate-grouped-metrics-report` (3→4). Eigene Quellenprüfung bestätigt.
7. Capstone-F3 (medium): `w34-e2` (Ledger-Raten, kein Confusion-Objekt) nach
   `formula-ratio-percent-metric` (7→8). Richtigstellung (D2-F2): `w34-e2`
   ist `numeric-exact`, nicht code-test; einziges code-test-Mitglied der
   Familie bleibt `w26-e4`.
8. GenAI-F1 (medium): `aggregate-retrieval-ranking-metric` um die MRR-Achse
   erweitert (solutionPath, 3 neue Hypothesen aus den `w27-e6`-Regeln). Kein
   Split: das Ranking trägt beide Mitglieder, die Evaluations-Schritte sind für
   `w27-e5` vakuös-parametrisch (Präzedenz DL `w19-e4`/`w19-e5`). Shards und
   Registry byte-gleich nachgezogen.
9. Capstone-F2 (medium): `mergeInto` von `w37-e1` zeigt auf die vorgeschlagene
   Familie `classify-freeze-purpose`. Der Merge selbst bleibt Noa-Entscheid,
   die ID bleibt lesbar. Erste Zweitprüfung stützt den Split und das neue Ziel.
10. Deep-F4 (low): `caseId` von `w18-e4` auf den v1-Wert
    `single-layer-valueerror-contract` zurückgesetzt (kollisionsfrei verifiziert).

## Bestätigt ohne Shard-Eingriff (Council-Dokumentation)

11. Linalg-F2, Foundations-F3: `rationale-note` (nicht-autoritativ) teilt sich
    je eine Familie mit autoritativen Mitgliedern (`w05-e9`, `w01-e11`).
    Entscheid: dokumentierte Ausnahme statt zwei neuer Singletons. Begründung:
    korpusweit genau 2 Quellen dieser Archetypklasse, beide
    `reviewEligible: false`, Freitext ist prinzipiell nicht grammatikfähig.
    Splits würden das ohnehin fragmentierte System (131 Familien) weiter
    aufblähen. D1 prüft diesen Entscheid.
12. Transformer-F2: `w26-e4` bleibt in `formula-ratio-percent-metric` (kein
    Confusion-Objekt, kein Metrikselektor). Registry-Hypothesenzeile bei
    `aggregate-confusion-metric` wird in D1 bereinigt.
13. Deep-F2, Capstone-F4: `w21-e3`, `w38-e3` bleiben in
    `trace-assignment-state` mit festgehaltener Dehnung. Keine Verhaltenswirkung.
14. Deep-F3, GenAI-F4: Singleton- und Split-Begründungen stehen in den
    Reviewberichten und wandern bei der Registry-Adoption in die Einträge.
    Keine Shard-Textfelder dafür vorgesehen (Schema hat keine
    Begründungsfelder an Entries).
15. Transformer-F3/F4: wie 13, zusätzlich Registry-Prosa-Notiz für D1.
16. Bearbeitungsnachweis-Semantik (Foundations-F6, Data-F2, Transformer-F5,
    Capstone-F6): Das Shard-Modell hat kein Mastery-Feld. Alle betroffenen
    `currentDefinitionId`s wandern als S4B-Auflage in den Integrationsdigest,
    nicht in die Shards.

## Registry-Reconciliation (mechanisch, D1 prüft)

17. Alle 67 abgeleiteten Nicht-Registry-Familien adoptiert, 20 Count-Erwartungen
    auf abgeleitete Werte gesetzt, 2 tote Hypothesen ohne Mitglieder entfernt:
    `classify-unsupervised-method` (Mitglieder in `fit-pca-kmeans-pipeline`
    verifiziert), `classify-tensor-broadcast` (`w18-e1` in
    `validate-shape-contract` verifiziert). Registry: 131 Familien, Summe 267
    (nach D2/D3-Nachträgen: 132 Familien, 76 Singletons, Summe weiter 267).
    (atomic-cases; `w05-e7` ist Composite ohne Familie).
18. Offene D1-Materie: Singleton-Quote 74/131, Merges
    (`trace-dict-state-update`, `classify-test-attitude`-Grenze),
    18/19-Auflösung aus den Mitgliedschaften, Noa-Queues
    (`w05-e11/12/13`, `w17-e2` mit `c-ml-repro`-Migration, `w37-e1` mit zweiter
    Zweitprüfung, Prozent-Grenzen, Kopier-Architekturen).

## Nachträge aus Block D (D2, D3)

19. D2-F1 (medium, bestätigt): `w37-e3` (Tupel-Recall, kein Confusion-Objekt,
    gleicher Defekttyp wie Nr. 6/7) nach `formula-ratio-percent-metric` (8→9,
    2. output-predict-Mitglied). `aggregate-confusion-metric` 13→12.
20. D3-F1 (high, bestätigt) / D3-F2 (medium, bestätigt): Block-C-Punkt 9 hatte
    einen inkohärenten Zwischenzustand erzeugt (`familyId` scope vs.
    `mergeInto` purpose ohne Registry-Eintrag, Entscheidungstexte mit alter
    v1-Frage). Repariert: `w37-e1` steht in der adoptierten Singleton-Familie
    `classify-freeze-purpose` (Registry Count 1), `classify-freeze-scope`
    2→1, `mergeInto` zeigt auf die existierende Familie. Die drei
    Noa-Entscheidungstexte (humanReview + 2 uncertainties, weiter
    `requires-noa-decision`, Owner Noa, Gate S4D7) fragen jetzt die aktuelle
    Frage (Singleton-Ziel vs. Scope-Erweiterung). Der Merge selbst bleibt
    Noa-Entscheid; die ID bleibt lesbar.
21. D2-F3 (info, entschieden ohne Eingriff): `hypothesisMemberSourceIds`
    bleiben eingefrorene Design-Hypothesen (Ableitung und Audit stehen in der
    Registry-`derivationNote` von Block E sowie in der Git-Historie). Kein Sync
    auf abgeleitete Mitglieder.

## Verifikation nach Korrektur

- `assemble-v2.mjs`: alle Assertions grün (268 Entries, Registry sauber,
  Persistenz 262/5/1, Feedback 623=275+348 mit Zielpfaden).
- `selftest.mjs`: 27/27. Zwei Checks an Council-Beschlüsse angepasst
  (Sandbox-Leere-Test, Registry-Summe gegen atomic-cases statt 64/268-Pin).
- Gate-B-Skript: 268 eindeutige IDs, Mengen je Domäne exakt.
- Kein `lint`-Skript im Projekt vorhanden; Branch-Prüfung per Selbsttest und
  Assembler. Produktions-, Content- und Produkt-Schemadateien unverändert.

## Anhang: eingefrorene Design-Hypothesen (Stand vor D1-L1-Strip, 2026-09-03)

- aggregate-confusion-metric (erwartet 11): hypo war [w11-e2, w11-e3, w11-e4, w11-e5, w13-e4, w26-e4, w28-e2, w28-e3, w28-e6, w29-e4, w29-e5, w29-e6, w30-e2, w33-e4, w33-e5, w33-e6, w34-e3, w34-e5, w37-e5], gestrichen [w13-e4, w26-e4, w28-e6, w29-e5, w29-e6, w30-e2, w33-e5, w33-e6, w34-e3, w34-e5, w37-e5]
- classify-freeze-scope (erwartet 1): hypo war [w35-e1, w37-e1], gestrichen [w37-e1]
- trace-assignment-state (erwartet 18): hypo war [f-code-reading-output-01, f-python-state-trace-01, w01-e3, w01-e4, w01-e6, w01-e7, w02-e1, w05-e15, w15-e3, w17-e3, w20-e3, w21-e3, w31-e3, w32-e3], gestrichen [w01-e6, w02-e1, w20-e3, w31-e3]
- transform-system-2x2-elimination (erwartet 4): hypo war [f-linalg-column-choice-01, f-linalg-column-vector-01, f-linalg-final-boss-01, f-linalg-solve-system-01, w05-e11, w05-e6], gestrichen [f-linalg-column-choice-01, f-linalg-final-boss-01]

Gestrichene Familien: 4. Volle Originale stehen in den Domänenreviews und v1-Inputs.

## Nachträge aus D1 (alle bestätigt und umgesetzt)

22. D1-H1 (high): `w34-e3` (Ledger-Quoten, kein Confusion-Objekt, strukturell
    wie `w34-e2`) nach `formula-ratio-percent-metric` (9→10).
    `aggregate-confusion-metric` 12→11. Quelle verifiziert.
23. D1-L1 (low): Stale `hypothesisMemberSourceIds` gestrichen (4 Familien),
    Originale im Anhang unten archiviert. Revidiert den D2-F3-Entscheid
    (Einfrieren): D1 als Architektur-Review wiegt schwerer, Git hält WIP nicht
    fest, irreführende Starthilfen schaden S4C-Implementern konkret.
24. D1-L2 (low, ohne Eingriff): `mergeInto`-Selbstziel bei `w37-e1` folgt der
    `w05-e11`/`w17-e2`-Konvention (Ziel = Heimat-Familie, Vollzug erst S4D).
    In family-model Abschnitt 10b festgehalten.
25. D1-L3 (low): Token-Multimengen-Halbsatz in Confusion-Solution/Reference
    aufgenommen (Registry + alle 11 Mitglieder byte-gleich). Schließt die
    GenAI-F2-Auflage.
26. D1-L4 (low, ohne Merge): `classify-test-attitude` vs.
    `classify-error-hypothesis` bleiben getrennt (Drei-Test-Begründung des
    Reviews übernommen); Grenze in family-model Abschnitt 10b festgehalten.
27. D1 bestätigt: 15 shardübergreifende Familien (eigene Zählung reproduziert),
    beide Hypothesen-Entfernungen waisenfrei, alle drei neuen Familien
    tragfähig, kein weiterer Merge möglich, Noa-Queues unberührt.

## Nachtrag 2026-09-03 (Noa, nicht Assembler)

28. Noa bestätigt die Council-Trennung: `w37-e1` merget nicht mit `w34-e1`,
    Heimat `classify-freeze-purpose`, ID bleibt lesbar. Ersatzevidenz
    `c-genai-security` in Woche 37 bleibt S4D7. Shards und
    `decision-queue.json` werden erst in S4D7 umgestellt. Protokoll:
    `noa-decisions.md`.
