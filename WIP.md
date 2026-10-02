# Woran gerade gearbeitet wird

Für Menschen und KI-Agenten. Pro Punkt: Ziel, Dateien, Prüfung, fertig-wenn. Regeln in [AGENTS.md](AGENTS.md), PRs in [CONTRIBUTING.md](CONTRIBUTING.md).

Für Agenten zum Kopieren:

> Lies AGENTS.md und WIP.md. Übernimm Punkt N aus WIP.md. Halte dich an die dort genannten Dateien und Prüfbefehle, ändere keine Grader und kein IndexedDB-Schema, erzeuge Release-Bäume nur über die Build-Tools.

## 1. Kontinuierlich: Aufgaben, Lektüren, Fehler

**Ziel:** Neue Aufgabenfälle oder -familien, neue Lektüren-Einträge, gefundene Fehler beheben. Laufender Betrieb, kein Enddatum.

**Wo:** Aufgaben in `content/families/` (neue Familien zusätzlich in `assets/js/domain/` registrieren), Lektionen in `content/lessons/`, Lektüren in `content/sources.json` und Rechte in `content/source-rights.json`. Fehler überall — zuerst reproduzieren, dann an der Wurzel beheben. Der [Autoren-Leitfaden](docs/authoring-guide.md) erklärt den Aufbau von Inhalten.

**Regeln:** Lerntexte deutsch, Identifier englisch. Jede Aufgabe behält eine deterministische Prüfung — kein Fall ohne nachvollziehbaren Grader. `challengeEligible` nur setzen, wenn der Challenge-Vertrag erfüllt ist.

**Fertig, wenn:** `node tools/compile_content.mjs && node tools/validate_content.mjs` und `node --test tests/` grün sind; bei UI-Änderungen zusätzlich `npm run typecheck` und die betroffenen Playwright-Specs.

## Wie Aufgaben und Varianten funktionieren

- Familie: `content/families/<familyId>.json`. Statische Cases können `variants[]` tragen. Der Seed wählt deterministisch (`variantOf` in `assets/js/domain/family_registry.mjs`). Seed 0 ist der Basis-Fall.
- Schema: `schemas/exercise-family-cases.schema.json`. Generator-Familien liegen in `assets/js/domain/*_generators.mjs`.
- Inhaltsänderung: `node tools/compile_content.mjs && node tools/validate_content.mjs` und `node --test tests/`.
- Zu wenige Instanzen: `node tools/audit_variants.mjs`. Golden Corpus nur bewusst neu schreiben: `node tests/family_golden_corpus.test.mjs --write-family-golden`.

## Ideen ohne Termin

- Fortschritt zwischen Geräten ohne Pflicht-Account (heute: JSON-Export/Import). Erst als Issue.
- Barrierefreiheit: Tastatur, Screenreader, Kontraste.
- Lektionstexte, die noch wie ein Skript klingen, in Du-Ansprache bringen (`content/lessons/`, `docs/authoring-guide.md`). Fachliches bleibt.

## Was nicht ansteht

Neue Themenbereiche, Mehrsprachigkeit, Accounts, LLM-basierte Bewertung. Gern als Issue, nicht als PR ohne Absprache.
