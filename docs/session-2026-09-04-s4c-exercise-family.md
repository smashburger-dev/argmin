# S4C: ExerciseFamily

Stand: 2026-09-04. Branch `streamline/integration-pre-s2b` auf S4B `c9b31d4`. Kein Commit.

## Completed

Familienvertrag, Falltypen und Schwierigkeitsprofile sind die Erweiterungsstelle für Aufgabenvariation. Die erste Runtime-Familie ist die kanonische S4A-Familie `classify-git-operation`, nicht eine 133. Taxonomie-ID.

- Schema `schemas/exercise-family.schema.json`
- Registry `instantiate(familyId, seed, difficulty, caseId?)` / `grade(instance, answer)` in `assets/js/domain/exercise_registry.mjs`
- Generator und Solver in `assets/js/core/foundations_fresh_generators.mjs` (nicht in `SEED_GENERATORS`)
- Compiler prüft Placements ohne `definitionId` gegen die Registry
- Golden Path 2: zwei kuratierte Placements in `content/modules/git-basics.json` ohne JSON-Kopie (`diff-unstaged` intro seed 7, `diff-staged` core seed 11). Übungsplatz zeigt dieselbe Familie
- Family-Baseline `tests/fixtures/exercise-family-golden-corpus.json` (512 Instanzen, seeds 0–63)
- Die 51er-Seed-Generator-Baseline ist unverändert

Gates: Registry-, Property-, Solver- und Negativtests grün. Compiler lehnt unbekannte Familien ohne `definitionId` ab. Golden Path 1 und 2 Chromium grün. Node 928 pass / 1 skip (open-core war rot, solange `build-next` alt war; nach `build:release` grün). `tsc --noEmit` grün. `build:release` grün, JS 78.1 KiB gzip.

## Decisions

1. **S4A-ID.** GP2 implementiert `classify-git-operation` (vier Quellen in der Taxonomie). Eine neue `classify-git-*`-ID hätte dieselbe Tokenmenge und denselben Lösungsweg gesplittet.
2. **Falltypen.** `diff-unstaged` und `diff-staged` sind echte Git-Entscheidungen. Seed rotiert die korrekte Position. stretch/challenge setzen einen Dateinamen; intro/core lassen diesen Schritt leer (vacuous-axis, im Vertrag dokumentiert).
3. **Keine UI.** ModuleView bleibt bei „Noch nicht instantiierbar“. Die Instanz entsteht über `instantiate` / `grade`, der Browser beweist das per dynamischem Import. ExerciseView, Ledger und Public-Allowlist sind unangetastet.
4. **Keine Seed-Registry.** Der Familien-Generator hat Falltyp und Profil, nicht nur Seed. Er gehört nicht in die 51er-Liste.
5. **Dauer.** Die zwei GP2-Placements haben kein `estimatedMinutes`, die Modulsumme bleibt 59. Zeitbudget ist S4D.
6. **Definition-Placements.** Die vier kuratierten Git-Karten mit `definitionId` behalten ihre S4B-`familyId`-Annotationen (`classify-git-status-command` usw.). Der Compiler prüft die Familie nur ohne `definitionId`.
7. **Council.** rationale-note zählt nicht in Property-Tests. Token-Multiset-Aliase fallen durch. `mergeInto` speichert die Heimat, merged nicht.

## Baseline-Diff

Neu, einmal gesetzt, offen:

- `tests/fixtures/exercise-family-golden-corpus.json`
- familyId `classify-git-operation`
- 2 Falltypen × 4 Profile × 64 Seeds = 512 Instanzen
- digest `c1457127654cf6ddd2826106f7525962608e4e11658c3c3682f188d13e773b31`
- Hash über `JSON.stringify(instantiate(...))`, LF-getrennt. Objektschlüsselreihenfolge ist die Instanzform, kein kosmetisches Umsortieren.

Unverändert: `tests/fixtures/generator-golden-corpus.json` (51 Familien, seeds 0–63). `genGitNextAction` unangetastet. `masteryFromAttempts` unangetastet. `research-fresh-window` unangetastet.

## Open

- S4D: Fachmigration, restliche 131 Familien, W05-Merges als Varianten, `w17-e2` nur mit Claim-Umzug
- ExerciseView öffnet Familieninstanzen noch nicht (keine UI in S4C)
- S4B-`familyId` auf Definition-Placements an die Taxonomie angleichen
- Minuten für GP2-Placements
- Initial-JS 78.1 KiB gzip, über S0-Soll 77.5, unter Validator 150. S5/S6
- `research/streamlining/s4a-v2/noa-decisions.md` lokal dirty, nicht mitcommitten

## Next session start

```bash
cd /Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform
git log -1 --oneline
node --test tests/exercise_family.test.mjs tests/content_compiler.test.mjs
```

S4C-Commit braucht Noas Ja. S4D nicht beginnen, bis die Familie committet ist.
