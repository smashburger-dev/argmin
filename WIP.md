# Woran gerade gearbeitet wird

Diese Datei ist für Menschen und für KI-Agenten gedacht. Jeder Punkt sagt, was das Ziel ist, wo die Daten liegen, wie man prüft und wann es fertig ist. Such dir einen Punkt aus, öffne ein Issue mit „Ich übernehme X“ und leg los. Regeln für Code und Inhalte stehen in [AGENTS.md](AGENTS.md), der Weg zum Pull Request in [CONTRIBUTING.md](CONTRIBUTING.md).

Für Agenten zum Kopieren:

> Lies AGENTS.md und WIP.md. Übernimm Punkt N aus WIP.md. Halte dich an die dort genannten Dateien und Prüfbefehle, ändere keine Grader und kein IndexedDB-Schema, erzeuge Release-Bäume nur über die Build-Tools.

## Wie Aufgaben und Varianten funktionieren

- Eine Aufgabenfamilie ist eine JSON-Datei unter `content/families/<familyId>.json` mit einem `contract` und einer Liste `cases`. Jeder Case hat `caseId`, `difficultyProfile`, `parameters`, `expected` und je nach Typ `choices`, `prompt`, `hints`, `fullSolution`.
- Statische Cases können ein Array `variants[]` tragen. Jede Variante überschreibt Felder des Basis-Cases (`parameters`, `expected`, `choices`, `prompt`, `hints`, `fullSolution`). Aus Basis plus Varianten wählt der Seed deterministisch eine aus (`assets/js/domain/family_registry.mjs`, Funktion `variantOf`).
- Schema: `schemas/exercise-family-cases.schema.json`. Generator-Familien (Zahlen aus dem Seed statt fester Tabellen) liegen in `assets/js/domain/*_generators.mjs`.
- Compile und Validierung prüfen unter anderem, dass Choice-Cases genau eine richtige Antwort haben und `expected.correctChoice` dazu passt.

Prüfbefehle für jede Inhaltsänderung:

```bash
node tools/compile_content.mjs && node tools/validate_content.mjs
node --test tests/
```

Welche Cases noch zu wenige Varianten haben, zeigt `node tools/audit_variants.mjs` (eine Zeile pro Case und Profil mit weniger als 10 verschiedenen Instanzen über die Seeds 0 bis 199; Stand heute 314 Zeilen).

Verändert sich die Ausgabe einer Familie, muss der Golden Corpus neu erzeugt werden: `node tests/family_golden_corpus.test.mjs --write-family-golden`. Nur bewusst tun und im PR erwähnen.

## 1. Konzeptfragen auf mindestens 10 Varianten

**Ziel:** Alle `single-choice`-Cases bekommen `variants[]` mit mindestens 9 zusätzlichen, inhaltlich verschiedenen Fragen derselben Idee. 12 Familien sind schon fertig (Vorbild: `content/families/classify-matrix-shape.json`), rund 60 Cases fehlen noch.

**Wo:** `content/families/classify-*.json`, `content/families/aggregate-*.json` mit `"activityType": "single-choice"` und ohne `variants`. Finden:

```bash
grep -L '"variants"' $(grep -l '"single-choice"' content/families/*.json)
```

**Regeln:** Zahlen selbst nachrechnen (z. B. mit NumPy), Distraktoren müssen plausibel falsch sein, Sprache Deutsch, Schwierigkeit des Basis-Cases beibehalten. Pro PR etwa 10 bis 15 Familien.

**Fertig, wenn:** die Familie in `node tools/audit_variants.mjs` nicht mehr auftaucht und Compile, Validierung und `node --test tests/` grün sind.

## 2. Coding-Aufgaben auf mindestens 10 Varianten

**Ziel:** Statische `python-code`-Cases parametrisieren: Eingabedaten, Konstanten und Namen aus dem Seed, erwartete Ausgabe deterministisch aus einer Referenzlösung. Rund 100 Cases, in Blöcken von etwa 30.

**Wo:** `content/families/*.json` mit `"activityType": "python-code"` und ohne `variants`. Referenz für seedbare Coding-Familien: `assets/js/domain/*_generators.mjs`. Ausführung und Prüfung: `assets/js/runtime/pyodide_runner.js`, `assets/js/core/graders.js` (nicht ändern, nur nutzen).

**Regeln:** Erwartete Ausgaben nie von Hand tippen, sondern berechnen. Aufgaben mit fester Spezifikation („schreibe genau diese Funktion“) auslassen und im PR nennen. Tests dürfen nicht länger als heute laufen.

**Fertig, wenn:** jeder Block seine eigenen Golden-Corpus-Einträge hat, `npm run test:e2e -- --project=chromium` grün ist und mindestens eine Aufgabe des Blocks im Browser (`npm run dev:next`) durchgespielt wurde.

## 3. Varianten für Ablauf-, Parsons- und Vektor-Aufgaben

**Ziel:** Die rund 40 statischen Cases der Typen `code-trace`, `predict-output`, `parsons` und `vector` bekommen ebenfalls Varianten.

**Wo:** gleiche Suche wie oben mit dem jeweiligen `activityType`. Ansichten: `src/ui/TraceTableView.tsx`, `src/ui/FamilyExerciseView.tsx`. Bei `parsons` müssen alle Varianten dieselbe Zeilenzahl und eine eindeutige Reihenfolge haben.

**Fertig, wenn:** wie Punkt 1, zusätzlich ein Playwright-Test pro Typ (`tests/e2e/`) mit zwei verschiedenen Seeds.

## 4. Erklärungen verständlicher machen

**Ziel:** Lektionstexte, die noch wie ein Skript klingen, in die Sprache des README bringen: Du-Ansprache, kurze Sätze, ein Beispiel vor der Formel.

**Wo:** `content/lessons/<bereich>/*.md`, Regeln in `docs/authoring-guide.md`. Kein Code nötig.

**Fertig, wenn:** Compile und Validierung grün sind und die Lektion in `npm run dev:next` gelesen wurde. Fachliche Aussagen dürfen sich nicht ändern; wenn doch, im PR begründen.

## Ideen ohne Termin

- Fortschritt zwischen Geräten synchronisieren (heute: JSON-Export/Import in den Einstellungen). Braucht ein Konzept ohne Pflicht-Account, bitte erst als Issue diskutieren.
- Barrierefreiheits-Review der Oberfläche (Tastatur, Screenreader, Kontraste).

## Was nicht ansteht

Neue Themenbereiche, Mehrsprachigkeit, Accounts, LLM-basierte Bewertung. Vorschläge dazu gern als Issue, aber bitte nicht als PR ohne Absprache.
