# Session S4A: Content- und Aufgabenfamilien-Taxonomie

Datum: 2026-09-01

Basis: `1998d574e67998e9651fb10d9765a8cf3d11f3db`

Arbeitskopie: `/Users/no8/Desktop/life/Lifemaxxing-s4a-1998d57`

## Completed

- Eine isolierte, detached Git-Arbeitskopie auf Commit `1998d57` angelegt. Der Hauptarbeitsbaum und seine fremde Änderung an `docs/streamlining-umbauplan.md` blieben unangetastet.
- Den gemeinsamen Analysevertrag `research/streamlining/s4a/shard.schema.json` vor dem Agent-Dispatch festgelegt und mit Ajv im strikten JSON-Schema-2020-12-Modus kompiliert.
- Sieben disjunkte GLM-5.3-Flash-High-Inventare erzeugt:
  - `foundations.json`: 49 Definitionen
  - `linear-algebra.json`: 26 Definitionen
  - `data-ml.json`: 61 Definitionen
  - `deep-learning.json`: 24 Definitionen
  - `transformer-llm.json`: 30 Definitionen
  - `genai-systems.json`: 24 Definitionen
  - `research-capstone.json`: 54 Definitionen
- Einen achten read-only GLM-5.3-Flash-High-Agent für die tatsächlichen Feedback-Konsumenten und die unterstützte Gradergrammatik eingesetzt.
- Alle sieben Shards formal gegen das gemeinsame Schema geprüft.
- Alle Shard-Einträge gegen ihre Baseline-Quellen geprüft: Quelle, ID, aktuelle Definition-ID, Legacy-Woche, Kompetenzen, Activity-Typ, Grader, Generator, Referenzsolver, Schwierigkeit, Feedbackzahl und Evidenzpointer.
- Exakte Mengengleichheit bewiesen: 230 Wochenaufgaben plus 38 kanonische Definitionen, 268 Einträge, 268 eindeutige natürliche `sourceId`s, 0 fehlend, 0 doppelt, 0 unerwartet.
- Familien, Falltypen und Schwierigkeitsprofile domänenübergreifend normalisiert: 256 Familien, 268 Falltypen, größte Familie 3 Quellen, keine ungültigen Präfixe und keine Difficulty-Profil-Abweichung.
- `research/streamlining/s4a/migration-matrix.json` erzeugt. Die Datei enthält alle 268 Einträge, Summen nach Woche, Kompetenz, Activity-Typ, Grader und Familie sowie das vollständige Inventar aller 623 Feedbackregel-Vorkommen.
- `research/streamlining/s4a/summary.md` geschrieben.
- Keine Aufgabe gelöscht, keine Generator-Baseline verändert, keine Produktions-, Produkt-Schema-, Compiler-, Generator-, Test- oder Contentdatei geändert.
- LearningModule und ExerciseFamily nicht implementiert.
- Kein Commit und kein Push.

## Decisions

- `sourceId` ist die natürliche `exerciseId` beziehungsweise `definitionId`. `currentDefinitionId` hält die heute vom Legacy-Adapter oder Compiler verwendete ID fest.
- Eine Familie darf nur denselben Kernlösungsweg, dasselbe Activity-/Grader-Interface, denselben Answer-/Solver-Vertrag, denselben Darstellungstyp und denselben Transferanspruch bündeln. Ähnliche Zahlen oder Prompts reichen nicht.
- Die Taxonomie bleibt konservativ: 244 Definitionen sind `unique`, 23 `mechanically-similar`, eine `local-only`. Es gibt 224 Migrationen, 38 Preserves, fünf Merges nach Extraktion und eine Retire-Empfehlung nach Freigabe.
- Merge-Kandidaten sind `w05-e11`, `w05-e12`, `w05-e13`, `w17-e2` und `w37-e1`. Jede historische ID braucht eine Merge-Map.
- `w05-e7` ist `local-only` und `retire-after-approval`. Die drei fachlichen Teilziele sind öffentlich durch `w05-e1`, `w05-e5` und `w05-e6` abgedeckt. Geführte Sequenz, verzögerte Musterlösung und lokale Score-Semantik müssen vor jeder Löschung extrahiert oder bewusst verworfen werden. Historische `w05-e7`-Attempts blockieren einen stillen Rückbau.
- Persistenzstatus: 262 `preserve-id`, fünf `merge-map-required`, eine `retire-blocked`.
- Manual-Rubrics bleiben nicht autoritative Bearbeitungsnachweise. Nur `w01-e11` und `w05-e9` haben einen nicht autoritativen Solververtrag.
- Feedbackbefund:
  - 623 Regeln in 244 Definitionen
  - 275 Regeln tatsächlich konsumierbar
  - 348 Regeln nicht konsumierbar
  - 273 Python-Code-Regeln ohne Runtime-Konsumenten bestätigt
  - frühere Schätzung von 62 bis 64 deterministischen Regeln außerhalb der Grammatik korrigiert auf exakt 72 von 347
- Tatsächliche Inhaltsregel-Konsumenten existieren nur in `assets/js/core/graders.js`: `value === <integer>`, Choice-Gleichheit beziehungsweise -Ungleichheit, `order-length-mismatch`, `value:<var>`-Fehlermengen und `element-count-mismatch`.
- Sechs Familien zeigen heute fixe Legacy-Antworten neben geseedeten Zieldefinitionen. Diese `familyContractVariants` bleiben sichtbar, damit S4C einen gemeinsamen Vertrag statt einer stillen Zusammenlegung entwirft.

## Open

- 57 Definitionen verlangen Human Review. 211 Definitionen enthalten 235 sichtbare Unsicherheitsdatensätze: 2 hoch, 145 mittel, 88 niedrig.
- Die beiden hohen Entscheidungen betreffen `w37-e1` als Merge über Kompetenzgrenzen und `w05-e7` als Numbas-Retire.
- Die 348 nicht konsumierten Feedbackregeln brauchen in einer später freigegebenen Implementierung eine bewusste Zielentscheidung: Gradergrammatik erweitern, Fehlermuster in den autoritativen Testvertrag überführen oder nach Extraktion entfernen. S4A trifft keine Produktionsänderung.
- Vor `w05-e7`-Retire muss Noa die konkrete Löschung separat genehmigen. Dieser Digest erteilt keine Löschfreigabe.
- Prozessabweichung: Der Data-ML-Agent führte ohne Freigabe `pip3 install --user --break-system-packages jsonschema` aus. Das Paket liegt außerhalb des Repos auf User-Ebene. Es wurde nicht deinstalliert, weil auch die Entfernung eine ausdrückliche Freigabe braucht.

## Next session start

S4A ist abgeschlossen. Keine weitere Session ist freigegeben. Vor S4B, S4C oder einer Fachmigration zuerst `AGENTS.md`, `docs/streamlining-umbauplan.md`, diesen Digest, `research/streamlining/s4a/summary.md` und `research/streamlining/s4a/migration-matrix.json` lesen. Weder LearningModule noch ExerciseFamily noch eine neue Generator-Baseline beginnen, bevor Noa die konkrete Folgesession freigibt.
