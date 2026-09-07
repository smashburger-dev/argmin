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
| `f-algebra-both-sides-01` | `transform-linear-equation-isolate / collect-x-terms-both-sides`, gelöscht |
| `f-algebra-debug-01` | `classify-error-hypothesis / base-vs-exponent-confusion`, gelöscht |
| `f-algebra-equivalence-01` | `transform-linear-equation-isolate / divide-both-sides-fully`, gelöscht |
| `f-algebra-final-boss-01` | `transform-expression-simplify-canonical / distribute-sign-constant-chain`, gelöscht |
| `f-meta-error-log-01` | `classify-error-hypothesis / error-journal-next-test`, gelöscht |
| `f-gauss-operation-choice-01` | `classify-row-operation-validity / row-operation-choice-contract`, gelöscht |
| `f-linalg-column-choice-01` | `classify-column-combination / column-choice-authored`, gelöscht |
| `f-linalg-column-vector-01` | `formula-scalar-product / column-vector-authored`, gelöscht |
| `f-linalg-final-boss-01` | `construct-matvec-shape-contract / final-boss-authored`, gelöscht |
| `f-linalg-rank-system-debug-01` | `classify-rank-solution-case / rank-system-authored`, gelöscht |
| `f-linalg-shape-debug-01` | `classify-column-combination / shape-debug-authored`, gelöscht |

Alle elf Definitionen sind damit entweder in statisch kompatible Fälle
überführt oder durch passende Laufzeitfamilien abgedeckt. Die vier
Linalg-Lektionen werden durch die Module `lm-linalg-matrices`,
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
- **D2:** Die authored Definitionen werden als statische Familienfälle oder
  kind-kompatible Laufzeitfälle geführt. Die drei zuletzt geprüften Linalg-
  Definitionen verwenden passende `python-code`-, `single-choice`- bzw.
  `vector`-Familien.
- **D3:** Die Roadmap-/Wochenansicht bleibt in S4E1 als getestete Legacy-
  Projektion bestehen. Ihre Ablösung ist nicht Teil dieses Schnitts.
- **D4:** Die wochenbasierte Coverage-Matrix bleibt unverändert. Der
  Kompetenz-/Familien-Katalog ist die moderne Quelle; eine Matrix-Ablösung
  bleibt einem späteren Schritt vorbehalten.

## Test- und Gate-Erwartungen

Die neun umgestellten Tests verwenden
`tests/fixtures/legacy-oracle.json`. Die Fixture ist auf die tatsächlich
gelesenen Übungen und Felder reduziert (1.937 Zeilen), behält
`weeks.wNN.exercises[]` bei und trägt den Hinweis, dass sie aus
`content/exercises` am Commit `7fd26b8` eingefroren wurde. Die ursprünglichen
Wochenquellen bleiben byte-identisch. Der Compiler zählt in `256 Aufgaben`
weiterhin Legacy-/authored-Definitionen, nicht die zusätzlich erzeugten
Familien-Aktivitäten. Familien-Titel fallen auf den bereinigten Prompt zurück;
ein Case-Slug wird nie learner-sichtbar.

## Fallout und Gates

| Lauf | Ergebnis | Ursache |
| --- | --- | --- |
| erster vollständiger Node-Lauf | 29 Fehler | alte authored-/Coverage-/Modul-Seam-Annahmen nach der Migration |
| korrigierter vollständiger Node-Lauf | 1 Fehler, 1 übersprungen | erlaubter SymPy-Hostfehler: `No module named 'sympy'`; 1.098 Tests, 1.096 bestanden |
| `npm run coverage:build` | bestanden | 46 Kompetenzen, 39 Themen; Artefakte aktualisiert |
| `npm run typecheck` | bestanden | Coverage-Check und TypeScript ohne Fehler |
| `npm run build:release` | bestanden | 953 Dateien, Public-Bundle validiert |
| `npm run test:e2e` | 74 bestanden, 57 fehlgeschlagen, 91 übersprungen | vollständiger Lauf: erwartete `59 Min.`-Prüfung; ein flüchtiger Chromium-Source-Card-Fehler (isoliert bestanden); Firefox-/WebKit-Host- bzw. Browser-Baselines |

Die Inhaltsvalidierung behält die bekannte Baseline von 14 fehlenden Library-
oder Local-Path-Zielen und zwei Hinweisen. Die Route-Smokes liefen gegen den
aktuellen Entwicklungsserver auf Port 4173; bekannte Browser-Baselines werden
getrennt von S4E1-Regressionsfehlern berichtet.
