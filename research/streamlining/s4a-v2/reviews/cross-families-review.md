# Cross-Domain-Review Familienarchitektur (S4A-v2, Block D1)

- **Datum:** 2026-09-03, ca. 11:20–11:40 CEST
- **Reviewer:** Cross-Domain-Reviewer Familienarchitektur (read-only; Skriptauswertungen via `node`, `/tmp`-Skripte)
- **Stand:** `block-c-decisions.md`, alle 7 Domänenreviews, `family-model.md`, `canonical-families.json`, `archetypes.json`, alle 7 Shards
- **Werkzeugläufe (eigene):** `assemble-v2.mjs` grün, `selftest.mjs` 27/27 grün (beide am Schluss erneut auf aktuellem Stand ausgeführt)

## Baseline-Hinweis: parallele Änderung während des Reviews

Alle 7 Shards plus `canonical-families.json` wurden während dieses Reviews (mtime 11:31, `block-c-decisions.md` 11:31:59) von fremder Hand umgeschrieben. Vier Block-C-Noa-Queues wurden dabei umgesetzt: `w37-e1` → neue Familie `classify-freeze-purpose`, `w37-e3` confusion → ratio, Registry-Reconcile (Erwartungssumme 267 → 268). Alle Zahlen unten gelten für den Stand danach: **132 Familien, 76 Singletons (57,6 %), 267 atomic-cases + 1 Composite**. Die erste Reviewhälfte lief auf 131/74; davon Betroffenes ist neu verifiziert, nicht übernommen.

## 1. Shardübergreifende Familien: Ableitung und Kohärenz

Abgeleitet aus den Shards (Familie zählt als shardübergreifend bei Mitgliedern aus >1 Domäne): **15 Familien**. Byte-Gleichheit der Verträge prüft der Assembler (grün); zusätzlich `multi-contract: none`, `multi-group: none` per Skript verifiziert. Kein stiller Familienalias: Token-Multiset-Check über alle 132 IDs ergibt **keine Kollision**.

| Familie | n | Domänen | Kohärenzurteil |
|---|---|---|---|
| trace-assignment-state | 18 | found+linalg+dml+dl+tf+cap | kohärent mit dokumentierter Dehnung (w21-e3, w38-e3, s. H-Bestätigungen) |
| aggregate-confusion-metric | 12 | dml+genai+cap | **1 Mitglied inkohärent (H1)** |
| aggregate-validate-and-count-records | 8 | found+cap | kohärent (alle 8 wörtlich vertragsgedeckt, Capstone-Prüfliste Punkt 5 bestätigt) |
| formula-ratio-percent-metric | 9 | dml+tf+genai+cap | kohärent (alle 9 einzeln verifiziert, inkl. w26-e4-, w34-e2-, w37-e3-Aufnahmen) |
| trace-collection-state | 3 | found+cap | kohärent (Slice-Achse trägt w02-e1, w31-e3 wörtlich) |
| übrige 10 (accumulator, grouped, fairness, count, gradient, pipeline, exception, expression-simplify, required-field, shape) | 2–6 | je 2–3 Domänen | ohne Befund |

## 2. Singletonquote und Kompression

76/132 Singletons, Kompression 256 → 132. Kein weiterer Merge geht durch; die drei Pflichtkandidaten plus Flächenscan:

- **trace-dict-state-update (2) + trace-collection-state (3): Merge abgelehnt.** Prozedurtest trägt eine Sammelschablone nur scheinbar; Referenzmodelltest scheitert: Dict-Update-Semantik (Überschreiben/del/setdefault/get-Standard) gegen Aliasing-Semantik (Mutation statt Kopie) ist keine parametrische Variation, sondern programmatische Verzweigung. Diagnosetest scheitert: die Hypothesenmengen sind disjunkt; eine Vereinigung zwänge jedem Mitglied eine Achse auf, die seine Quelle nie prüft (w03-e1 testet keine Mutation/Kopie, f-collection-step-trace-01 kein setdefault/del). Foundations-F4-Empfehlung damit widerlegt; Trennung bestätigt.
- **classify-test-attitude (1) gegen classify-error-hypothesis (2): kein Merge** (L4: Grenze schärfen statt mergen).
- **reflect-/rationale-note-Ausnahmen (Nr. 11): bestätigt** (s. Bestätigungen).
- **Flächenscan:** Alle übrigen classify-Singletons tragen je ein eigenes Konzeptsystem als Referenzmodell (Merge scheitert an Test 2 per Konstruktion). Alle trace-/construct-/fit-/formula-Singletons tragen je eigene Schleifenmechanik bzw. ausführbare Autorität (Merge scheitert an Test 1 oder 2). Die einzigen prozedurnahen Paare sind die zwei oben verworfenen.

## 3. 18/19-Diskrepanz: aufgelöst, Endwert 15

Beide Zahlen beschreiben die obsolete 64-Familien-Hypothese, nicht die abgeleiteten Mitgliedschaften. Die Größentabelle in `design-cognitive-first.md` markiert exakt 18 Familien als domänenübergreifend (durchgezählt); die „19" in der Prosa ist ein Dokumentationsfehler (so bereits `design-comparison.md`: „Doku-Fehler, kein Rechenfehler"). Brücke 18 → 15 aus den tatsächlichen Mitgliedschaften: 6 Hypothesen-XD-Familien sind heute domänenrein (softmax, decode, seeded-split, text-normalize, fit-predict durch Splits fragmentiert; error-journal, weil die Hypothese fälschlich linalg-Anteil annahm — w05-e9 gehört nach scalar-product), 3 Familien sind neu XD (collection-state durch Block-C-Moves, grouped-metrics und fairness-aggregation durch Splits/Zweitmitglieder). 18 − 6 + 3 = 15. Verbindlicher Endwert: **15**.

## 4. Tote Hypothesen: beide Entfernungen bestätigt

- **classify-unsupervised-method:** Kein verwaistes Mitglied möglich (alle 268 Quellen platziert, Assembler grün). Das einzige PCA/k-Means-Paar w16-e4/w16-e5 sitzt geschlossen in `fit-pca-kmeans-pipeline` (Data-Review: „PCA-Pipeline-Paar überzeugend"); die Klassifikationsseite decken `classify-task-type` (w09-e1, v1-Rationale nennt ausdrücklich überwacht-gegen-unüberwacht) und `classify-supervision-scaling` (w16-e3) ab. Entfernung korrekt.
- **classify-tensor-broadcast:** Das einzige putative Mitglied w18-e1 (im Design namentlich genannt) sitzt in `validate-shape-contract`; Fehlerachse „Broadcast-Regel falsch angewendet" deckt seine Quelle (Bias-als-formgebend-Fehlschluss, `deep-learning-v1.json` Z. 50) exakt; Trennungstests im Linalg-Review bestanden. Entfernung korrekt.

## 5. Neue Familien: Tragfähigkeit

- **classify-column-combination (f-linalg-column-choice-01): tragfähig.** Split aus elimination besteht alle drei Tests (keine Eliminationswahl, kein Rückeinsetzen, Choice statt Paar); Referenzmodell Spaltenbild eigenständig; Hypothesen decken die Quell-typicalErrors wörtlich.
- **trace-training-loop-count (w20-e3): tragfähig.** Kein Merge-Ziel: gegen formula-count-from-construction scheitern Referenzmodell (geschlossene Formel gegen Ceil-Loop mit Float-Ausgabe) und Diagnose (Aufrund-/`.0`-Achsen dort absent); gegen assignment-state scheitert die Diagnose (Deep-F1 bleibt richtig). w21-e3 gehört nicht dazu (kein Ceil, keine Loop-Zählung) und bleibt in assignment-state.
- **classify-freeze-purpose (w37-e1): tragfähig und während des Reviews umgesetzt.** Vertrag deckt alle drei w37-e1-Regeln (Hypothese „Freeze-Motiv falsch zugeordnet"); Drei-Test gegen freeze-scope besteht in allen drei Punkten (Aufzählen von Inhalten gegen Begründen des Zwecks, Scope-Zustände gegen Evaluationsvertrag über Zeit, Grenze gegen Motiv). Dies ist die zweite unabhängige Zweitprüfung nach §10 Punkt 4 im Sinne der Capstone-Erstprüfung; sie stimmt ihr zu (Empfehlung i). Offen bleibt nur der Noa-Endentscheid.

## Findings

| ID | Schweregrad | Familien / sourceIds | Verletzte Regel | Beleg | Kleinste Korrektur (nicht ausgeführt) |
|---|---|---|---|---|---|
| H1 | **high** | aggregate-confusion-metric (12→11), formula-ratio-percent-metric (9→10); sourceId w34-e3 | Prozedurtest + Referenzmodelltest (§4 Tests 1–2) | Quelle `content/exercises/w34.json` w34-e3: Tupel (kennung, retrieval_treffer, antwort_korrekt), Filter treffer/korrekt, zwei Quoten korrekt/treffer und korrekt/alle. Kein {tp,fp,fn,tn}-Objekt, kein Metrikselektor. Strukturell identisch mit w34-e2 (Ledger, naiv gegen bereinigt), das Block C zu Recht nach ratio verschob; Interaktion (predict statt numeric) ist ausdrücklich keine Familiengrenze (§4). Ratio-Schablone „Zähler und Nenner bestimmen, Verhältnisformel anwenden" läuft wörtlich durch; Fehler mappen auf „Falscher Nenner gewählt" und „Rundung falsch". | w34-e3 → formula-ratio-percent-metric (Shard-Edit + Registry-Count 12→11/9→10). |
| L1 | low | Registry-Hypothesenzeilen (Nr. 12): confusion, freeze-scope, assignment-state, elimination | Reconcile-Pflicht §5 (Starthilfen irreführend) | Skriptvergleich hypo-Liste gegen aktuelle Mitgliedschaft: confusion nennt noch w13-e4, w26-e4, w28-e6, w29-e5, w29-e6, w30-e2, w33-e5, w33-e6, w34-e5, w37-e5; freeze-scope noch w37-e1; assignment-state noch w01-e6, w02-e1, w20-e3, w31-e3; elimination noch f-linalg-column-choice-01, f-linalg-final-boss-01. Alle liegen längst in anderen Familien. | Stale-Einträge aus `hypothesisMemberSourceIds` streichen (Registry-Eintrag, Council). |
| L2 | low | classify-freeze-purpose; sourceId w37-e1 | Persistenzsemantik §8 | `persistence: merge-map-required, mergeInto: classify-freeze-purpose`, aber die eigene `familyId` ist bereits classify-freeze-purpose (Selbst-Ziel seit der Split-Umsetzung). Assembler grün, ID lesbar, keine Verhaltenswirkung. | Council klärt: Status als Dokumentation behalten oder auf preserve-id stellen. |
| L3 | low | aggregate-confusion-metric (Registry-Prosa) | GenAI-F2-Auflage (Zählobjekt schließt Token-Multimengen ein) | Registry-SOL/REF nennen weiter literal nur {tp,fp,fn,tn}; w28-e3 (Token-Multimengen) ist fachlich korrekt zugeordnet, die Prosa dokumentiert es nicht. | Einen Halbsatz in Registry-SOL/REF aufnehmen (Council). |
| L4 | low | classify-test-attitude (1), classify-error-hypothesis (2) | Registry-Grenzschärfe (F5-Auftrag „definieren oder mergen") | Quellenbefund: f-testing-choice-01 und f-meta-error-classify-01 fragen beide nach dem besten nächsten Schritt bei Off-by-one; f-algebra-debug-01 fragt nach der Diagnose selbst. Ein Merge scheitert am Diagnosetest (Vereinigung zwänge jedem Mitglied eine ungeprüfte Achse auf) und am Referenzmodelltest (Testhaltungen gegen Fehlerhypothesen/Debug-Prozess sind verschiedene Konzeptsysteme). | Kein Merge; Grenze in Registry-Doku festhalten: test-attitude = Haltung zur Testpraxis, error-hypothesis = Einordnung des Fehlerbilds. |

## Bestätigungen ohne Finding

- **w37-e3 → ratio** (während des Reviews umgesetzt): akzeptiert. Ratio-Schablone läuft durch (Recall je Gruppe, Mittelwert ×100 = Prozentüberführung), Fehler auf Nenner-/Rundungsachsen abbildbar; grouped-Alternative wäre gleichwertig gewesen, ratio erhält grouped archetyprein (code-test). Kein Einwand.
- **w38-e3 bleibt in assignment-state** (Nr. 13): bestätigt mit eigenem Beleg. Seine Fehler (Normierung, Fund- gegen Alphabet-Ordnung, leere-Liste-als-None) liegen in collection-state (Mutation/Kopie, Slice-Grenzen) auf keiner Achse, in assignment-state auf zwei adjazenten (print-order, state-object-confusion). Ein Move brächte keinen Diagnostikgewinn.
- **w21-e3 bleibt in assignment-state** (Deep-F2): bestätigt, Dehnung dokumentiert.
- **freeze-scope als neues Singleton** (w35-e1): Vertrag besteht fort, Split-Begründung (F2(i) + diese Zweitprüfung) erfüllt die Begründungspflicht; keine Aktion.
- **Alle übrigen Block-C-Moves** (w02-e1, w31-e3, w01-e6, w20-e3, w24-e3, f-linalg-column-choice-01, w13-e4, w34-e2, MRR-Erweiterung): in den abgeleiteten Mitgliedschaften verifiziert angekommen; keine Regression.

## Urteil

**Coral (nachbesserungsbedürftig, kein Blocker).**

Grün scheitert allein an H1: w34-e3 verletzt Prozedur- und Referenzmodelltest in der größten verbliebenen Container-Familie; der Geschwisterfall w34-e2 ist bereits nach ratio verschoben, die Korrektur ist eine Zeile Shard plus zwei Count-Anpassungen. Alles andere ist verifiziert: 15 shardübergreifende Familien mit exakten Mitgliedschaften (Tabelle §1), byte-gleiche Verträge ohne Alias, 18/19-Diskrepanz arithmetisch aufgelöst (15), beide Hypothesen-Entfernungen ohne Waisen bestätigt, alle drei neuen Familien tragfähig (freeze-purpose inklusive zweiter Zweitprüfung), kein weiterer Merge möglich (Drei-Test-Begründungen §2). Nach H1 plus L1–L4 (reine Registry-/Doku-Einträge, kein Shard-Risiko) ist der Familienstand grün-fähig; Noa-Queues (w37-e1-Endentscheid, w05-e11/12/13, w17-e2-Claim-Migration) bleiben unberührt bestehen.
