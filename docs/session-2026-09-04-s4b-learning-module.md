# S4B: LearningModule

Stand: 2026-09-04. Branch `streamline/integration-pre-s2b` nach S3B `94fc786`. Kein Commit.

## Completed

LearningModule ist die kanonische Komposition. Die Woche bleibt Legacy-Brücke und wurde nicht erweitert.

- Schema `schemas/learning-module.schema.json`, Katalog-Manifest deklariert Wurzeln statt Dateilisten
- Discovery und Orphan-Check: `tools/content_roots.mjs`
- Dauer, Placement-Regeln, Reverse-Index: `assets/js/domain/learning_module.mjs`
- Compiler lädt nur unter deklarierten Wurzeln, sortiert deterministisch, lehnt verwaiste Dateien ab
- Public-Build kopiert `content/modules/*.json` per Verzeichnisregel, keine Dateiliste pro Modul
- Golden Path 1: `content/modules/git-basics.json` (eine Autorendatei). Lektion `l-foundations-git`, vier kuratierte Placements auf bestehende Definitionen, ein Übungsplatz `classify-git-next-action`
- UI: `#/module/lm-git-basics`, Karten unter Lernen und Kompetenz, Lektion zeigt kuratierte Placements statt Kompetenzschnittmenge
- Finding `research-fresh-window` an S3A angepasst (Content-Hash bewusst)

Gates: Schema/Compiler/Orphan grün. `validate_content` grün. Public-Build und Next-Validierung grün. Golden Path 1 Chromium grün. Node 916 pass / 1 skip. `tsc --noEmit` grün. `build:release` grün (JS 78.4 KiB gzip).

## Decisions

1. **Zugehörigkeit.** Nur das LearningModule listet Lektionen, Placements und Projekte. Tracks bekommen keine `moduleIds`. Reverse-Index wird abgeleitet. Unplatzierte Lektionen bleiben Bausteine, keine Orphans.
2. **Orphans.** Datei unter einer deklarierten Wurzel ohne Rolle ist ein Fehler. Die Woche bleibt über `legacy.exerciseFiles` gelistet und wird nicht entdeckt.
3. **Neue Aufgabe.** Placement ist `familyId` + `caseId` + `seed` + `difficulty`. Ohne `definitionId` keine JSON-Kopie. Laufende Instanz bleibt S4C. Test beweist: nur die Moduldatei ändert sich, nicht Katalog, UI, Ledger oder Buildliste.
4. **Übungsplatz.** Rolle `practice-space` zählt nicht zur Dauer. Produktidee (kuratiert pro Lektüre, Varianten en masse) steht im Authoring-Modell, Generatoren nicht.
5. **Dauer.** Summe aus Lektionen, kuratierten Placements und Projekten. Override nur explizit. `lm-git-basics` = 59 Min.
6. **Milestones.** Bleiben Abschlussnachweise, keine zweite Komposition.
7. **Bearbeitungsnachweis.** Bleibt. `masteryEligible` kommt von der Definition. Kuratiertes Placement ohne `definitionId` muss das Flag selbst tragen. `masteryFromAttempts` unangetastet.
8. **research-fresh-window.** Textauflage ausgeführt, nicht vertagt. `instanceId` gewinnt, Fallback `definitionId:cycleId:seed`. Zweiteiliger Evidence-Fallback ist tot.

## Review-Fixes (vor Commit)

- ModuleView lädt faul per `lazy` + Suspense wie Exercise-/LabView. Ohne das stünde der Einstieg bei 78.4.
- Vor/Zurück in der Lektion folgt der Modulreihenfolge, wenn die Lektion ein Modul-Zuhause hat, sonst den Nachbarn (Discovery sortiert alphabetisch, didaktische Ordnung sitzt im Modul).
- Build-Validatoren (`validate_next_build`, `build_public`) akzeptieren Punkte in Vite-Chunknamen (`jsxRuntime.module-<hash>.js`). Eingrenzung bleibt: nur `assets/`, nur `.js`/`.css`, keine Unterverzeichnisse, Marker-Scan unverändert.

## Auflagen, Vorschlag an Noa

**w05-e3 Zuhause.** `l-linalg-matrices`. Die Aufgabe ist `u⊤v` an konkreten Vektoren. Der Claim `c-linalg-independence` bleibt bis S4D2. Alternative, falls der Claim das Zuhause sein soll: `l-linalg-independence`.

**w05-e15 Zuhause.** `l-linalg-matrices` (Spaltenbild `b = Ax`). Tracing ist die Tätigkeit, Matrizen der Stoff. `c-python-reading` bleibt Co-Evidence.

**Capstone.** `l-capstone-baseline` für Hash/Ledger/Doppel-Lauf (w34). `l-capstone-pipeline` für Freeze, Manifest, Verdict (w37 und Folgewoche). Das Milestone bleibt der Abschlussnachweis, kein Sammelmodul.

**c-genai-security in Woche 37.** Mit-Beleg an `w37-e1` bleibt. Ersatz-Evidence liegt schon in der Woche: `w37-e4`, `w37-e5`, `w37-e6` (mastery-fähig, `c-genai-security` in `skillIds`). S4D7 macht sie zum primären Beleg. `w37-e1` bleibt Bearbeitungsnachweis plus Co-Evidence.

**Bearbeitungsnachweis-IDs (38, binden in S4D).** w01-e1, w01-e2, w02-e3, w03-e2, w06-e1 bis w39-e1 (je erste Wochenaufgabe). Plus Rubrik w01-e11 und w05-e9, schon `reviewEligible: false`.

## Open

- S4C: Familien-Runtime, Falltypen, Seed, Profil instantiieren
- S4D: Fachmigration, W05-Merges als Varianten, w17-e2 nur mit Claim-Umzug, Prozent-Grenzen, Kopier- vs Teil-Architektur
- S4E: Wochenquellen löschen
- Globale Lektionsreihenfolge folgt jetzt dem Dateipfad, nicht mehr der alten Katalogliste. Didaktische Reihenfolge sitzt im Modul
- Initial-JS 78.1 KiB gzip (Einstieg 73.7 + preloadter jsxRuntime-Chunk 4.4), über dem S0-Soll 77.5, unter dem Validator 150. ModuleView lädt faul wie Exercise-/LabView (Review-Fix). S5/S6
- Coverage-Matrix neu geschrieben, weil Discovery die Definitionsreihenfolge ändert

## Next session start

```bash
cd /Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform
git log -1 --oneline
node --test tests/content_compiler.test.mjs tests/learning_module.test.mjs
```

S4B-Commit braucht Noas Ja. S4C nicht beginnen, bis das Modul committet und S4C freigegeben ist.
