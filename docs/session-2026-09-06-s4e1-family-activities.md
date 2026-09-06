# S4E1 — Familien-Aktivitäten als Katalog-Aufgaben

## Umfang

Der moderne Katalog baut seine Aufgabenliste aus kuratierten
Familien-Platzierungen in Lernmodulen. Jede Aktivität erhält die stabile ID
`${familyId}:${caseId}` und wird beim Kompilieren über die zentrale
Familienregistrierung instanziiert. Die Legacy-Definitionen bleiben für direkte
`#/exercise/:id`- und `#/lab/:id`-URLs sowie für die 39-Wochen-Projektion im
Bundle erhalten.

Familien-Aktivitäten sind im Index nur als leichte Zusammenfassungen enthalten;
die vollständigen Instanzen werden weiterhin über die Familienroute erzeugt.
Generatorbasierte Familien öffnen bei fälliger Wiederholung eine frische
Variante mit Seed `-`, statische Fälle bleiben auf ihrer festen Fallroute.

## Content-Migration

| Authored definition | Ergebnis |
| --- | --- |
| `f-algebra-both-sides-01` | gelöscht; bereits durch Algebra-Familien abgedeckt |
| `f-algebra-debug-01` | gelöscht; bereits durch Algebra-Familien abgedeckt |
| `f-algebra-equivalence-01` | gelöscht; bereits durch Algebra-Familien abgedeckt |
| `f-algebra-final-boss-01` | gelöscht; bereits durch Algebra-Familien abgedeckt |
| `f-meta-error-log-01` | `classify-error-hypothesis / error-journal-next-test`, gelöscht |
| `f-gauss-operation-choice-01` | `classify-row-operation-validity / row-operation-choice-contract`, gelöscht |
| `f-linalg-column-choice-01` | `classify-column-combination / column-choice-authored`, gelöscht |
| `f-linalg-column-vector-01` | nicht migriert: authored `vector`, Zielfamilie erwartet `single-choice`; Datei bleibt |
| `f-linalg-final-boss-01` | nicht migriert: authored `python-code`, Zielfamilie erwartet `single-choice`; Datei bleibt |
| `f-linalg-rank-system-debug-01` | `classify-rank-solution-case / rank-system-authored`, gelöscht |
| `f-linalg-shape-debug-01` | nicht migriert: authored `single-choice`, Zielfamilie erwartet `parsons`; Datei bleibt |

Die drei inkompatiblen Definitionen wurden absichtlich nicht umgedeutet. Die
vier Linalg-Lektionen werden durch die Module `lm-linalg-matrices`,
`lm-linalg-systems`, `lm-linalg-gauss`, `lm-linalg-independence` und
`lm-linalg-numpy-shape-contracts` abgedeckt. Statische Fälle stehen in der
Reihenfolge Vektoren, Matrizen, Systeme und Synthese; seeded Familien sind als
Übungsraum-Platzierungen ergänzt.

`w05-e15` ist als
`trace-assignment-state / column-picture-trace` mit unveränderten authored
Feldern, der Kompetenzzuordnung `c-linalg-matrices` plus
`c-python-reading`, `intro` und Mastery-Eignung migriert. Die Visualisierung
verweist auf die neue Familienroute.

Der bestehende Fall
`transform-power-log-exponent / integer-base-power` reproduziert bei Seed
`833` den Wert `2`. Eine zusätzliche `w01-e10`-Lineage wurde nicht erfunden,
weil die JavaScript-Familie keine entsprechende JSON-Lineage-Notiz führt.
`w01-e11` bleibt gemäß D1 fallengelassen.

## Entscheidungen D1–D4

- **D1:** `w01-e11` wird nicht in eine Familie überführt; die Wochenreflexion
  gehört ins Fehlerjournal und nicht in eine autoritativ bewertete Familie.
- **D2:** Die sieben kompatiblen authored Definitionen werden als statische
  Familienfälle geführt; drei inkompatible Linalg-Fälle bleiben mit ihrer
  ursprünglichen Definition erhalten.
- **D3:** Die Roadmap-/Wochenansicht bleibt in S4E1 als getestete Legacy-
  Projektion bestehen. Ihre Ablösung ist nicht Teil dieses Schnitts.
- **D4:** Die wochenbasierte Coverage-Matrix bleibt unverändert. Der
  Kompetenz-/Familien-Katalog ist die moderne Quelle; eine Matrix-Ablösung
  bleibt einem späteren Schritt vorbehalten.

## Test- und Gate-Erwartungen

Die Legacy-Orakeltests verwenden `tests/fixtures/legacy-oracle.json`; die
ursprünglichen Wochenquellen bleiben byte-identisch. Der Compiler zählt in
`259 Aufgaben` weiterhin Legacy-/authored-Definitionen, nicht die zusätzlich
erzeugten Familien-Aktivitäten.

Die Inhaltsvalidierung behält die bekannte Baseline von 14 fehlenden Library-
oder Local-Path-Zielen und zwei Hinweisen. Ein vollständiger Gate-Lauf sowie
die Route-Smokes werden nach diesem Digest ausgeführt; bekannte Baseline-
Fehler werden getrennt von S4E1-Regressionsfehlern berichtet.
