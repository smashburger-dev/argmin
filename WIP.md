# Woran gerade gearbeitet wird

Für Menschen und KI-Agenten. Pro Punkt: Ziel, Dateien, Prüfung, fertig-wenn. Regeln in [AGENTS.md](AGENTS.md), PRs in [CONTRIBUTING.md](CONTRIBUTING.md).

Für Agenten zum Kopieren:

> Lies AGENTS.md und WIP.md. Übernimm Punkt N aus WIP.md. Halte dich an die dort genannten Dateien und Prüfbefehle, ändere keine Grader und kein IndexedDB-Schema, erzeuge Release-Bäume nur über die Build-Tools.

## 1. Frontend Rework

**Ziel:** Color Rework und ein ruhigeres Layout. Kein Design-System-Umbau.

**Wo:** `src/ui/` (App-Shell, Heute, Lernen, Lektion, Aufgabe, Fortschritt, Einstellungen), `src/styles/next.css`, `src/app/theme.ts`, `src/ui/Button.tsx`. Screenshots in `docs/media/` nur anfassen, wenn sich der sichtbare Stand wirklich ändert.

**Regeln:** Lerntexte und Aufgabeninhalte nicht umschreiben. Grader und IndexedDB unverändert. Hell und Dunkel beide prüfen. Tastaturfokus und `:focus-visible` behalten.

**Fertig, wenn:** `npm run typecheck` und `npm run test:e2e -- --project=chromium` grün sind und die geänderten Screens in `npm run dev:next` (Desktop und schmales Viewport) durchgeklickt wurden.

## 2. Intro / Tour

**Ziel:** Beim ersten Öffnen eine kurze, wegklickbare Tour: Heute, Lernen, Review; Varianten kommen vom Seed; Fortschritt bleibt lokal. Kein Tutorial-Roman, drei bis fünf Schritte.

**Wo:** `src/ui/App.tsx`, `src/ui/TodayView.tsx`, `src/styles/next.css`. Gesehen-Flag in `localStorage`, nicht in IndexedDB (kein Schema-Bump). Playwright in `tests/e2e/`.

**Regeln:** Deutsch, Du-Ansprache wie im README. Tour blockiert Lernen nicht. Nochmal anzeigen geht über die Einstellungen. Kein Account, kein Netz.

**Fertig, wenn:** Compile/Validierung unnötig (kein Content). `npm run typecheck`, ein Playwright-Test für Erstbesuch und Skip, und einmal selbst im Browser: leerer Storage → Tour → Skip bzw. zu Ende klicken → Reload ohne Tour.

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
