# S4D8a: Statische Fälle als Content, generischer Adapter

Stand: 2026-09-06. Branch `devin/1788706319-s4d8a-static-cases` auf `f94601e` (S4D7).

## Gebaut

- `content/families/*.json` (14 Dateien, 21 Fälle) mit Schema
  `schemas/exercise-family-cases.schema.json`; Root `families` im Katalog.
  Statik-only-Familien tragen den Vertrag in der JSON, gemischte Familien
  nur ihre statischen Fälle.
- Registry-Adapter in `assets/js/domain/family_registry.mjs`:
  `registerStaticCases`, `staticCaseBody`, `staticFamilySpec`; Profil pro
  Fall (wirft bei fremdem Profil), `masteryEligible` pro Fall, kein
  Übungsraum für Statik-only-Familien. `configureExerciseFamilies` in
  `exercise_registry.mjs` baut die Registry aus JS-Specs plus JSON-Verträgen.
- Compiler liefert Familien-Metadaten im Index und Fallkörper als
  `split/families/<id>.json`-Chunks; `FamilyExerciseView` lädt den Chunk vor
  `instantiate`. Registry bleibt im faulen Chunk.
- Gelöscht: alle `*_STATIC`-Objekte, acht Statik-only-Verträge/Generatoren
  in `foundations_linalg_families.mjs`, per-Fall-Statiktests; ersetzt durch
  `tests/static_case_families.test.mjs` (Vertragstest über alle JSON-Fälle).

## Verhalten

- Instanzen der 21 Fälle deep-equal zum JS-Stand (Prüfskript, außerhalb des
  Repos), außer beabsichtigt: Profil (E2) und `masteryEligible` (E3).
- Generator-Golden-Corpus byte-identisch; die vier seeded Linalg-Familien
  per-Familie digest-identisch. Linalg-Fixture auf verbliebene Familien
  rebaselined.

## Gates

Suite 1017/1020 (1 Fehler: Host-`sympy`, Baseline), Typecheck, Build
(JS 81,8 KiB gzip, vorher 115,6), `validate_content` 14 Baseline-Fehler,
Playwright Familie/Modul chromium+firefox grün bis auf den vorbestehenden
`59 Min.`-Fehler in `learning-module.spec.ts` (auf `f94601e` ebenso rot).

## Messung (E8)

Runtime-LOC 12.079 → 11.721 (−358); Test-LOC 17.216 → 17.183 (−33);
Content-JSON +995 Zeilen. Kein Linalg-Modul vorhanden (Familien ohne
`lm-linalg-*`), offen für S4D-Linalg-Modulschnitt.

## Offen

S4D8 W06 Datenbereinigung (erstes Data/ML-Modul), Linalg-Modul,
`learning-module.spec.ts`-Dauer-Erwartung, S5A Test-Cleanup, S5B Public-Profil.
