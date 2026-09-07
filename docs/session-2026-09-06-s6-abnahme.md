# S6 – Abnahme des Streamlinings: LOC-Messung, Taxonomie-Erklärung, Performance-Baseline

Stand: Produkt-HEAD nach Merge von PR #27 (`d872245`), Vergleichsbasis S0 = `f94601e`.

## 1. LOC-Messung (Endstand vs. Start)

Zählformel für alle Werte (ohne `vendor/`, `node_modules/`, `build*/`):

```bash
find <bereich> -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.tsx' \) \
  -not -path '*/vendor/*' -not -path '*/node_modules/*' -not -path '*/build*/*' -print0 | xargs -0 cat | wc -l
```

| Bereich | S0 (`f94601e`) | S6 (`d872245`) | Δ |
| --- | ---: | ---: | ---: |
| Runtime (`assets/js` + `src`) | 12.079 | 11.986 | −93 (−0,8 %) |
| davon `assets/js` | — | 9.741 | |
| davon `src` (UI) | — | 2.245 | |
| Tools (`tools/`) | 3.340 | 1.810 | −1.530 (−46 %) |
| Tests (`tests/`) | 18.331 | 7.693 | −10.638 (−58 %) |
| Content-JSON (`content/`) | 52.591 | 24.609 | −27.982 (−53 %) |
| Module | 10 | 49 | +39 |
| Wochenquellen (`wNN.json`) | 39 | 0 | −39 |
| Familien (`content/families/*.json`) | — | 107 | |

Einordnung: Runtime ist praktisch gleich groß geblieben, obwohl 39 Wochenquellen
und ~3.000 Zeilen Content-in-JS verschwunden sind – der Platz wurde von den in
S4D neu gebauten Familien-Generatoren (Data/ML, DL, Transformer, GenAI, Capstone)
belegt, die vorher gar nicht existierten. Die Zielzahl 7.268 aus dem alten Plan
war nie belegt (siehe E8) und wird nicht weiter verfolgt; die geltende Regel bleibt
„so tief wie möglich ohne Verhaltensänderung“, nachgewiesen über Golden-Corpus-,
Content-Bundle- und Release-Tree-Hash.

Größte Runtime-Dateien (Kandidaten für einen späteren Pass, nur mit Hash-Nachweis):
`foundations_construct_families.mjs` 1.432, `data_ml_families.mjs` 1.051,
`foundations_trace_families.mjs` 993, `foundations_fresh_generators.mjs` 749,
`progress_store.js` 524 (IndexedDB, eigener Pass), `graders.js` 479.

## 2. Taxonomie – so ist der Inhalt organisiert

Vier Ebenen, von oben nach unten:

1. **Kompetenz** (`content/competencies/`, 46 Stück, z. B. `c-ml-logistic`):
   das, was ein Lernender können soll. Fortschritt wird pro Kompetenz gemessen.
2. **Modul** (`content/modules/`, 49 Stück, z. B. `lm-ml-logistic`): ein Kapitel
   mit Lektion, das Aktivitäten an eine oder mehrere Kompetenzen hängt.
3. **Familie** (`content/families/*.json`, 107 Stück): eine *Klasse* von Aufgaben
   mit einem festen Vertrag (Aufgabentyp, Antwortformat, Grader). Beispiel
   `aggregate-confusion-metric` = „rechne etwas aus TP/FP/FN/TN“.
4. **Fall** (Eintrag in `cases`, 187 statische + 37 seeded Falltypen): eine konkrete
   Aufgabe. Statische Fälle sind fest (Ankreuzfrage, Code-Trace, Python-Aufgabe
   mit Tests); seeded Fälle haben einen Generator im JS und liefern pro Seed eine
   neue Variante mit unabhängig berechneter Lösung.

Der Name einer Familie sagt, *was der Lernende tut* (Verb-Präfix), nicht *worüber*:

| Präfix | Familien | Tätigkeit |
| --- | ---: | --- |
| `classify` | 39 | einordnen/entscheiden (Ankreuz-Diagnosen) |
| `optimize` | 10 | Hyperparameter/Konfiguration wählen |
| `validate` | 9 | prüfen, ob etwas korrekt/konsistent ist |
| `trace` | 8 | Programm-/Zustandsverlauf vorhersagen |
| `construct` | 8 | etwas bauen (Code, Formel, Struktur) |
| `formula`, `fit`, `aggregate` | je 7 | rechnen: Formel anwenden, Modell anpassen, Kennzahl bilden |
| `transform`, `reproduce` | je 5 | umformen; Ergebnis mit Python nachbauen |
| `rank`, `compose` | je 1 | ordnen; zusammensetzen |

Schwierigkeit: jeder Fall trägt genau **ein** Profil (`intro` / `core` / `stretch` /
`challenge`, Entscheidung E2). Ein Aufruf mit falschem Profil wird abgelehnt statt
eine Scheinvariante zu zeigen (so gewollt, siehe Browser-Test zu PR #1).

### Warum so viele „Singletons“?

Verteilung der statischen Fälle pro Familie:

```
1 Fall: 70 Familien   2 Fälle: 20   3 Fälle: 9   4 Fälle: 4   6: 2   7: 1   15: 1
```

70 der 107 Familien haben heute genau einen Fall. Das ist eine Folge der
Migration, kein Designfehler: die Legacy hatte pro Woche 5–8 Einzelaufgaben, und
jede bekam die Familie, in die sie *fachlich* gehört – auch wenn dort noch keine
zweite Aufgabe liegt. Vorteile: (a) der Vertrag (Aufgabentyp + Grader) ist
festgelegt, eine neue Aufgabe dieser Art ist eine JSON-Datei ohne Code; (b) die
Kompetenz-Zuordnung ist sauber; (c) Sammelbecken wie `aggregate-confusion-metric`
(15 Fälle aus W11/W28/W29/W33) zeigen, wie es aussieht, wenn Inhalt nachwächst.
Nachteil: im Familienpicker wirken 70 Einträge dünn. Empfehlung: **nicht
zusammenlegen**, sondern in der Content-Phase auffüllen (siehe 4); Singletons
mit identischem Vertrag können dann fallweise fusioniert werden, wenn es sich
nach dem Auffüllen noch lohnt.

## 3. Performance-Baseline (Release-Build, lokal serviert)

Messung: `node tools/perf_baseline.mjs <url> [route]` gegen
`python3 -m http.server -d build-next`, headless Chromium, `view` = Zeit von
Navigation bis `<main>` sichtbaren Text hat, `cold` = HTTP-Cache aus,
`warm` = zweiter Aufruf im gleichen Browser, `cpu=4x` = CPU-Drosselung auf ¼.
Netzwerk ist localhost – reale Downloadzeiten kommen obendrauf (siehe Payload).

| Route | cpu 1× cold | cpu 1× warm | cpu 4× cold | cpu 4× warm | Bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Start (`#/`) | 96 ms | 58 ms | 250 ms | 169 ms | 0,49 MB |
| Modul (`#/module/lm-foundations-algebra`) | 110 ms | 56 ms | 238 ms | 169 ms | 0,50 MB |
| Familie seeded (Gleichung, KaTeX) | 146 ms | 91 ms | 436 ms | 405 ms | 1,41 MB |
| Familie Python (Editor) | 130 ms | 98 ms | 475 ms | 369 ms | 1,15 MB |
| Pyodide-Worker bis `ready` (ohne Pakete) | 1.356 ms | — | 1.452 ms | — | ≈13,4 MB roh / ≈6,3 MB gzip |

Payload-Anatomie (roh → gzip):

- `index-*.js` (App-Shell inkl. Katalog/Kompetenzen/Lektionen): 486 KB → 98 KB
- `FamilyExerciseView-*.js` (alle Familien-Generatoren + CodeMirror): 659 KB → 211 KB
- KaTeX 266 KB, CSS 28 KB
- `content/content-bundle.json` (1,7 MB) wird von der App **nicht** geladen –
  Content kommt über die Build-Aliase (`@content-index`, `@content-chunks`) in die JS-Chunks.
- Pyodide-Init: `pyodide.asm.wasm` 9,6 MB → 3,6 MB, `python_stdlib.zip` 2,5 MB,
  `pyodide.asm.mjs` 1,25 MB → 0,26 MB. Erst beim ersten „Antwort prüfen“ einer
  Python-Aufgabe (lazy in `graders.js`). numpy (+2,9 MB) und sympy (+4,1 MB) zusätzlich, nur bei Bedarf.

### Einschätzung: Wo ist „ein Vielfaches“ drin, wo nicht?

- **Seitenaufbau (Start, Modul, Familie):** 60–150 ms bei normaler CPU, < 0,5 s bei
  4× Drosselung. Das ist bereits im Bereich „sofort“; ein Vielfaches ist hier
  nicht mehr spürbar. Realer Hebel ist nur der Download beim ersten Besuch
  (≈ 310 KB gzip für eine Familie), d. h. Hosting mit gzip/brotli + Cache-Header.
- **`FamilyExerciseView` 211 KB gzip** ist der einzige echte UI-Kandidat: er
  bündelt alle 107 Familien-Generatoren *und* CodeMirror, obwohl eine
  Ankreuzfrage weder Editor noch Data/ML-Generatoren braucht. Aufteilung
  (CodeMirror nur für Python-Fälle, Generatoren nach Domäne) würde die
  Erstladung einer Familie grob halbieren – messbar, aber kein Vielfaches,
  weil die Shell (98 KB) bleibt.
- **Pyodide** ist der einzige Ladeprozess im Sekundenbereich: ~1,4 s Init auf
  localhost plus ≈6 MB Download beim ersten Mal. Physikalisch nicht viel kleiner
  zu bekommen (WASM-Interpreter + Stdlib). Mögliche Hebel, jeweils ohne
  Verhaltensänderung: (a) Worker beim Öffnen einer Python-Aufgabe vorwärmen
  statt erst beim Prüfen (gefühlt 0 s Wartezeit beim Klick), (b) Service-Worker/
  Cache-Header, damit der Download nur einmal anfällt, (c) Pakete nicht
  vorladen (ist schon so).
- **IndexedDB-Initialisierung** taucht in keinem Wert als Kostenfaktor auf.

**Fazit:** Ein Performance-Pass ist kein Blocker für die Content-Phase. Zwei
gezielte, kleine Maßnahmen lohnen sich trotzdem und sind unabhängig vom Content:
(1) `FamilyExerciseView` splitten (CodeMirror + Generatoren lazy), (2) Pyodide
beim Öffnen einer Python-Aufgabe vorwärmen. Beides ohne Hash-relevante Änderung an
Content, Gradern oder IndexedDB. Alles darüber hinaus (Service-Worker,
Brotli-Precompression) ist Hosting-Konfiguration, nicht Code.

## 4. Content-Roadmap (Skizze, zur Freigabe)

Kosten pro Baustein nach dem Streamlining:

| Baustein | Aufwand | Code |
| --- | --- | --- |
| Neuer statischer Fall in bestehender Familie | 1 JSON-Eintrag | 0 Zeilen |
| Neue statische Familie (neuer Vertrag) | 1 JSON-Datei | 0 Zeilen |
| Neue seeded Variante in bestehender Familie | Generator-Funktion + Tabelleneintrag | 15–40 Zeilen |
| Neue seeded Familie | Generator + Solver + Tabelleneintrag | 60–150 Zeilen |
| Neues Lektionsmaterial | JSON in `content/lessons/` | 0 Zeilen |

Vorgeschlagene Reihenfolge:

1. **C1 Singletons auffüllen** – die 70 Ein-Fall-Familien auf ≥ 3 Fälle bringen,
   priorisiert nach Kompetenzen mit den wenigsten Aktivitäten (Compiler liefert
   die Kompetenz×Familie-Abdeckung, D4). Reiner JSON-Content.
2. **C2 Seeded-Ausbau** – für rechenlastige Kompetenzen (Data/ML-Kennzahlen,
   Linalg, Algebra) je 1–2 zusätzliche Generatoren, damit jeder Kompetenzbalken
   einen Übungsraum mit unendlichen Varianten hat. Golden Corpus wächst mit.
3. **C3 Lektionsmaterial** – Lektionen von „Aufgabenliste“ zu „Erklärung +
   Beispiel + Aufgaben“ ausbauen; Format bleibt JSON, Rendering existiert.
4. **C4 Authoring** – ein `tools/new_case.mjs`, das aus Familien-ID + Antwort ein
   validiertes JSON-Skelett erzeugt, damit auch ein lokaler Agent ohne
   Repo-Wissen Fälle anlegen kann.

Danach UI-Rework (Button-Spacing, die großen UI-Komponenten) mit genug Inhalt
zum Beurteilen; IndexedDB-Pass nur bei Bedarf und nur mit Migrationstests.
