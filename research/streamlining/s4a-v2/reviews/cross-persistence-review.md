# Cross-Domain-Review Persistenz (D3, S4A-v2 Block D)

Stand: 2026-09-03. Geprüft: korrigierte Shards (7 Dateien, 268 Entries), block-c-decisions.md, family-model.md (2026-09-02), alle 7 Domänenreviews plus w37-e1-second-review.md, canonical-families.json (131 Familien), assemble-v2.mjs und selftest.mjs im Trockenlauf. Eigene Skriptauswertungen gegen v1-Inputs, Shards und Registry. Ich habe nichts geändert.

## Urteil

Kein grüner Persistenz-Stand. Der Assembler ist grün (262 preserve-id, 5 merge-map-required, 1 retire-blocked, selftest 27/27). Die ID-Sicherheit hält überall. Aber w37-e1 trägt eine inkohärente Merge-Map: familyId behauptet scope, mergeInto verspricht purpose, purpose existiert nirgends, und die Noa-Entscheidungstexte fragen nach der alten v1-Frage. Noa kann auf dieser Basis nicht entscheiden. Zwei Findings, beide an w37-e1. Alles andere besteht.

## Geprüft und bestanden

1. Preserve-IDs. 262 Entries mit status preserve-id. Shard-sourceIds sind mengengleich mit v1 (Assembler erzwingt das). v1 currentDefinitionId gleicht sourceId bei allen 268. Das Shard-Schema kennt kein currentDefinitionId-Feld (nur status, mergeInto, note), die Stabilität folgt also aus preserve-id plus unveränderter sourceId. Alle 267 caseIds sind eindeutig und kollidieren mit keiner sourceId. Keine abgeleitete ID wird Attempt-Schlüssel.
2. w05-e11, w05-e12, w05-e13. mergeInto zeigt auf die eigene Familie (transform-system-2x2-elimination, zweimal formula-scalar-product). Die Falltypen bleiben als eigene caseIds erhalten (addition-elimination-pair neben substitution-elimination-pair, entry-c11-negative-factors und dot-product-double-negative neben den Geschwistern). humanReview und targetAction stehen je auf requires-noa-decision mit vollständigem Quartett (owner Noa, decision, evidence, latestGate S4D2). Kein Merge vollzogen, IDs lesbar.
3. w17-e2. mergeInto formula-metric-spread-range, Familie mit 2 Mitgliedern (w12-e2, w17-e2), Registry-Erwartung 2. competencyClaim primary c-ml-repro mit coEvidence c-ml-cv. Die Doppelkompetenz-Erhaltung steht als Freigabebedingung in reasons, decision und evidence (latestGate S4D3). Quartett vollständig. Kein Merge vollzogen.
4. w05-e7. composite-placement, status retired, historicalArchetypeId numbas-exam-retired, reviewEligible false, kein graderAdapter im Entry, feedbackDispositions leer, note nennt die S1B-Freigabe. Komponenten w05-e1, w05-e5, w05-e6 existieren alle als atomic-case im selben Shard. Kein Shard löscht eine Quelle (268/268). Kein councilReviewRef, keine URL, also kein toter Review-Link. Einen S2A archived-review-Vertrag gibt es in diesem Checkout nicht, ich habe nur Konsistenz geprüft.
5. Generator-Baseline. Kein Shard enthält Generatorcode. authorityMode steht korpusweit exakt: 51 seeded genau bei v1 solverContract.kind seed-generator, Rest static. Das schließt die sechs familyContractVariant-Paare ein (w05-e1 static neben f-linalg-matmul-entry-01 seeded verifiziert).
6. v3-Schlüsselstabilität. Kein Rename einer sourceId. caseId-Umbenennungen (etwa w17-e2 repro-report-spread zu repro-report-fold-spread, capstone DE zu EN) betreffen nur abgeleitete IDs, nie Attempt-Schlüssel. Alle 5 Merges haben eine Map, der Retire ist blockiert.

## Findings

### D3-F1, high, w37-e1: mergeInto zeigt auf eine Familie, die es nicht gibt, und widerspricht der eigenen familyId

Verletzte Regel: family-model Abschnitt 8 verlangt ein konkretes mergeInto, bevor eine ID fällt. Abschnitt 5 erklärt die Registry für kanonisch.

Beleg: shards/research-capstone.json, Eintrag w37-e1: familyId classify-freeze-scope, persistence.mergeInto classify-freeze-purpose. canonical-families.json enthält classify-freeze-purpose nullmal (131 Familien, grep 0), kein Shard hat ein Mitglied dieser Familie. Der Eintrag behauptet Mitgliedschaft in scope und Austritt nach purpose zugleich. Die zweite Zweitprüfung (reviews/w37-e1-second-review.md, Abschnitt 3) beschreibt genau diesen Zustand. Block C Punkt 9 hat nur den Zeiger umgeschrieben, familyId, Registry und Evidence-Prosa blieben stehen.

Kleinste Korrektur: Council entscheidet Singleton gegen Erweiterung. Bei Singleton: Familie classify-freeze-purpose mit Hypothese Freeze-Motiv falsch zugeordnet in die Registry adoptieren und w37-e1 dorthin verschieben. Bei Erweiterung: mergeInto zurück auf classify-freeze-scope schreiben und den Familienvertrag um die Motiv-Achse ergänzen. Beides nicht selbst ausführen, beides braucht Noa.

### D3-F2, medium, w37-e1: Entscheidungstexte fragen nach der falschen Frage und nennen das falsche Ziel

Verletzte Regel: Offene Dispositionen brauchen tragfähige evidence (Abschnitt 9). Die evidence muss den Entscheidungsgegenstand korrekt beschreiben.

Beleg: shards/research-capstone.json, Eintrag w37-e1, humanReview.evidence wörtlich: mergeInto zeigt als konkretes v2-Ziel auf classify-freeze-scope (Fall neben w35-e1). Das Feld persistence.mergeInto sagt classify-freeze-purpose. Die HR decision fragt: Merge über die Kompetenzgrenze freigeben (w37-e1 als zweiter Fall neben w34-e1) oder Trennung bestätigen. Die Folgefrage aus Capstone-F2 (Singleton purpose gegen Erweiterung von scope) steht in keiner decision. Formal ist das Quartett vollständig (owner, decision, evidence, latestGate S4D7 je dreimal), inhaltlich entscheidet Noa damit über die überholte v1-Frage.

Kleinste Korrektur: decision und evidence in humanReview und beiden uncertainties auf die Nachfolgefrage umschreiben (Singleton purpose gegen Erweiterung von scope, Ersatzevidenz c-genai-security bleibt Bestandteil). Quartett dabei vollständig halten. Nicht selbst ausführen.

## Hinweise ohne Finding-Status

- Der w34-e1-Spiegel (requires-noa-decision, semanticClassification) bleibt bis Noas Entscheid pflichtig. w34-e1 selbst ist preserve-id und korrekt platziert. Das folgt der zweiten Zweitprüfung gegen die erste.
- migration-matrix-v2.json, feedback-disposition.json und decision-queue.json liegen in diesem Checkout nicht vor (Trockenlauf ohne --write). Die Queue habe ich ersatzweise aus den Dispositionen abgeleitet: alle fünf Merge-Kandidaten tragen requires-noa-decision mit vollständigem Quartett.

## Reproduzierbarkeit

node research/streamlining/s4a-v2/assemble-v2.mjs (grün, Persistenz 262/5/1), node research/streamlining/s4a-v2/selftest.mjs (27/27). Dazu eigene python3-Auswertungen: preserve-Count und sourceId-Mengen, mergeInto-Ziele gegen Registry und Shard-Mitgliedschaften, Quartett-Vollständigkeit aller Noa-Dispositionen, authorityMode gegen v1 solverContract.kind korpusweit (51/51), caseId-Eindeutigkeit und Kollisionsfreiheit gegen sourceIds, w05-e7-Komponenten und Grader-Freiheit, Block-C-Spotchecks (w02-e1, w31-e3, w01-e6, w20-e3, w24-e3, column-choice, w13-e4, w34-e2, w18-e4 alle wie beschlossen).
