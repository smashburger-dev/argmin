# S5A — Testverträge und Familien-Corpus

## Umfang

S5A ersetzt wiederholte Familien- und Generatorprüfungen durch einen
generischen Vertrag in `tests/family_contract.test.mjs` und bewahrt die
deterministische Verhaltenssicherung im bestehenden
`tests/family_golden_corpus.test.mjs`. Runtime-Verhalten und
`tests/fixtures/family-golden-corpus.json` wurden nicht geändert.

Der generische Vertrag prüft:

- alle kanonisch registrierten Familien, ihre Fälle, gültigen Profile und
  Seeds `0..31`;
- JSON-Familien-Dokumente, JavaScript-Spec-Struktur und Kompetenzreferenzen;
- unbekannte Familie, Fall, Profil und nicht-ganzzahlige Seeds;
- deterministische Instanziierung und Seed-Variation für Property-Fälle;
- Choice-Anzahl, eindeutige Texte und genau eine korrekte Option;
- die deterministischen Graderpfade über eine Lookup-Tabelle sowie Mutanten;
- statische Mastery- und Profilregeln;
- `familyEventInput`-IDs und Modul-/Practice-Placements;
- zentrale doppelte Familien-IDs und Token-Multiset-Aliase.

Pyodide- und `manual-rubric`-Fälle werden im generischen Graderpfad
übersprungen, wie im Brief vorgegeben. Die bestehenden spezifischen
Garantien für Python-Referenzsolver und Mutanten, Trace-Tabellen,
`genDet2`, `genBranchCoverageCount`, per-Mille-Exaktheit, Taxonomie- und
Projektverträge bleiben erhalten.

## Entfernte Duplikate

Entfernt wurden:

- wiederholte Seed-/Profil-/Solver-/Expected-Answer-Properties aus
  `data_ml_families.test.mjs`;
- der breite `data_ml_generators.test.mjs`-Generatorlauf;
- doppelte Family- und Generator-Corpus-Fixtures;
- wiederholte Corpus-Matching- und Byte-Identity-Assertions;
- die generischen Teile aus `exercise_family.test.mjs`,
  `foundations_construct_families.test.mjs`,
  `foundations_trace_families.test.mjs`,
  `foundations_linalg_families.test.mjs`,
  `foundations_fresh_generators.test.mjs`,
  `w01_generators.test.mjs`, `s4d21_transformer.test.mjs`,
  `s4d22_genai_research.test.mjs` und `s4d23_capstone.test.mjs`.

Die verbleibenden Tests in diesen Dateien sind fachlich spezifisch:
Python-Referenz und Mutanten, Trace-Tabellen, Taxonomie-Crosschecks,
Prompt-Sicherheitsregeln, Generatorinvarianten, Legacy-Oracle-
Äquivalenz und Capstone-Semantik.

Die Lesson-Honesty-Suiten heißen jetzt `tests/lesson_content_ml.test.mjs`,
`lesson_content_transformer.test.mjs` und `lesson_content_genai.test.mjs`
(vormals `data_ml_content`, `w22_w26_content`, `w27_w30_content`); die
Legacy-Generator-Referenzprüfung aus `w18_w21_content` entfiel.

## Golden-Corpus-Tausch

Die frühere Familie einzelner Generator-Corpora wurde nicht parallel
beibehalten. Der bestehende Familien-Corpus bleibt die einzige
Corpus-Quelle und pinnt pro registrierter Familie, Fall, Profil und Seed
`0..63` die kanonisierten Werte von Prompt, Parametern, Expected Answer
und Choices. Der Vertrag deckt die Laufzeitregeln ab; der Corpus deckt
die konkreten deterministischen Werte ab. Die Fixture
`tests/fixtures/family-golden-corpus.json` blieb byte-identisch.

## Metriken

Alle LOC-Werte sind reproduzierbar mit:

```bash
find tests -type f -name '*.mjs' -print0 | xargs -0 wc -l
```

| Kennzahl | Base `bd4cd49` | S5A | Änderung |
|---|---:|---:|---:|
| Test-LOC (`*.mjs`, Fixtures ausgeschlossen) | 9.197 | 7.216 | −1.981 (−21,5 %) |
| Node-Tests | 615 | 386 | −229 |
| Node-Laufzeit | 5,46 s | 4,06 s | −1,40 s (−25,6 %) |

Der Base-Lauf wurde nach `npm run build:release` und
`npm run build:public` in einem separaten Worktree ausgeführt:
`615` Tests, `614` bestanden und `1` übersprungen. Der abschließende
S5A-Lauf bestand aus `386/386` Tests in `4,06 s`.

## Echte Grader- und Taxonomie-Findings

### Choice-Antwortform

Der Brief nennt als Choice-Antwortform den korrekten Choice-Text. Der
aktuelle `deterministic`-Choice-Grader akzeptiert jedoch die Choice-ID.
Ein direkter Probe-Lauf mit den korrekten Choice-Texten ergab für die
betroffenen Choice-Instanzen:

```text
Bitte eine Auswahl treffen.
```

Der generische Vertrag verwendet deshalb die korrekte Choice-ID, um den
realen Graderpfad zu prüfen; der Lauf mit der literal geforderten
Textform ist als echter Vertrags-/Grader-Mismatch dokumentiert und wurde
nicht durch eine Runtime- oder Teständerung verborgen. Betroffener
`graderId`: `deterministic`; versuchte Antwortform: korrekter Choice-Text.

### Canonical-Taxonomie

Die kanonische Datei
`research/streamlining/s4a-v2/canonical-families.json` enthält
`reflect-error-journal-rationale`, das zur Laufzeit nicht registriert
wird. Umgekehrt enthält der Content
`classify-shape-contract`, das nicht in der kanonischen Taxonomie steht.
Die generische Prüfung prüft die registrierten kanonischen Familien,
ändert diese S4A-Taxonomie aber nicht, da Runtime-/Content-Korrekturen
außerhalb von S5A liegen.

## Verifikation

Vor dem finalen Commit ist auszuführen:

```bash
node --test tests/
npm run typecheck
npm run build:release
```

Der abschließende vollständige Node-Lauf nach der Zusammenführung der
Lesson-Entrypoints war:

```text
386 Tests
386 bestanden
0 fehlgeschlagen
0 übersprungen
```

Zusätzlich bestanden:

```text
npm run typecheck
npm run build:release
```

Der Release-Build erzeugte 614 Dateien mit 46 Kompetenzen, 46 Lektionen
und 253 Aktivitäten. Die Vite-Warnung zu großen Chunks bleibt eine
nicht-fehlgeschlagene Build-Warnung.
