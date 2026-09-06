# ADR-0013: Content-Delivery-P0 und Runtime für Woche 18 bis 30

Status: Angenommen (NumPy-first-Fortsetzung nach ADR-Default; Content-Delivery ohne neue Abhängigkeit). Datum: 2026-08-31.

## Kontext

Zwei Entscheidungen fallen zusammen, weil sie dieselbe Wachstumsfrage betreffen:
Die Plattform soll W18–W30 (Deep Learning, Transformer/LLM-Grundlagen, RAG,
Evaluation, defensive GenAI-Sicherheit) mit 13 Kompetenzen ausbauen, und der
bisherige Content-Delivery-Ansatz backt das gesamte kompilierte Content-Bundle
statisch in das initiale JavaScript — W6–W17 hatte den Initial-Chunk auf
179,4 KiB gzip getrieben und das Budget auf 200 KiB anheben müssen. Vier
Untersuchungen liegen vor (Evidenz-Recherche, Runtime-Architektur,
Rechte-Audit, Lernmethodik); diese ADR integriert deren belegte Befunde.

## Teil 1: Content-Delivery (P0)

### Problem [VERIFIED, eigene Messung 2026-08-30/31]

- `src/adapters/static-catalog.ts` importierte `@content-bundle` statisch;
  Vite legte das komplette Bundle (722.968 B raw / 142,1 KiB gzip) in den
  Entry-Chunk. Shell-Anteil nur ~37 KiB gzip.
- W18–W30 (+~200 Aufgaben, +13 Lektionen) würden den Entry-Chunk linear
  auf geschätzt 220–260 KiB gzip treiben [INFERENCE aus Medianen:
  752 B/Aufgabe-Summary, 739 B/Lektions-Summary].

### Untersuchte Designs

1. **Schlanker Katalogindex plus route-spezifische JSON-Dateien** über
   dynamische Imports (Vite-Code-Splitting; gehashte Chunks im bestehenden
   Asset-Pipeline-Kanal).
2. **Aufgeteilte, dynamisch importierte Content-Chunks** pro Lektion/Aufgabe
   (Teilmenge von 1, kombiniert mit 1 angewendet).
3. **Gemeinsames ContentRepository mit Public- und Local-Adapter**: ein
   Repository-Modul (`src/adapters/content-repository.ts`), Profil-Trennung
   bleibt allein im Vite-Alias (`@content-index`, `@content-chunks` je
   Modus), niemals im Laufzeitcode — ein Public-Build kann Private-Chunks
   referenzlos nicht einbetten.

**Entscheidung: 1+2+3 kombiniert.** `tools/compile_content.mjs` emittiert
neben dem Vollbundle ein `split/`-Verzeichnis: `index.json` (Katalog,
Kompetenzen, Tracks, Milestones, Quellen, Wochenprojektion,
Lektions-Metadaten ohne Blöcke, Aufgaben-Summaries ohne Bodies und ohne
vollen Prompt — nur ein ≤-120-Zeichen-Snippet), `lessons/<id>.json`,
`exercises/<id>.json` und ein profil-lokales `chunks.ts` mit dynamischen
Imports. Chunk-IDs müssen `[A-Za-z0-9][A-Za-z0-9._-]{0,96}` entsprechen
(fail-closed), Kollisionsprüfung inklusive. Der Entry-Chunk lädt nur den
Index; Lektions-/Aufgaben-Bodies laden route-spezifisch mit Cache,
In-flight-Dedupe und sichtbarem, testbarem Fehlerzustand (`role="alert"`).

### Messwerte [VERIFIED, je 7 Läufe, Chromium, lokaler python3-http-Server, Median (min–max)]

| Metrik | Vorher (Vollbundle statisch) | Nachher (Index + Lazy-Chunks) |
|---|---|---|
| Initiales JS gzip | 179,4 KiB | 91,1 KiB |
| Gesamte Next-JS gzip | 327,6 KiB (Entry+LabView) | verteilt: Entry 91,1 + Lazy-Chunks je < 3 KiB |
| `#/today` Zeit bis sichtbarer H1 | 72 ms (70–189) | 61 ms (57–174) |
| `#/today` Zeit bis nutzbarer Navigation | 76 ms (73–193) | 65 ms (60–178) |
| Erster Lektionsöffnungsvorgang | 19 ms (18–47) | 27 ms (24–52) |
| Erste Aufgabenöffnung | 13 ms (8–20) | 7 ms (4–13) |
| `#/today` warm (Reload) | 7 ms (6–11) | 11 ms (7–12) |
| Übertragene Bytes Erstnutzung (JS/CSS/JSON) | ≈ 1.008 KiB | ≈ 718 KiB |
| Externe Requests | 0 | 0 |

Interpretation: `#/today` ist im Median nicht langsamer (eher schneller);
Lektionsöffnung kostet +8 ms Median für den Lazy-Fetch (lokaler Server,
warm < 5 ms) — der messbar bessere Kompromiss, da der erste Screen nicht
auf Content wartet. Offline bleibt erhalten: alle Chunks sind same-origin
statisch (E2E-Test „loads exclusively from its own origin"), kein CDN, kein
Service-Worker nötig. Fehlerzustände: Chunks-Fehler rendern eine sichtbare
`role="alert"`-Meldung (E2E-Test mit Route-Abort verifiziert).

Budget [VERIFIED in `tools/validate_next_build.mjs`]: Initial wieder
150 KiB gzip (nicht weiter erhöht); Lazy-Chunks bleiben auf 250 KiB gzip
pro Chunk begrenzt. Wachstumsprognose: +200 Aufgaben-Summaries ohne
Prompt ≈ +25 KiB gzip → Entry ~116 KiB, weiterhin unter Budget [INFERENCE].

### Abgelehnt (Teil 1)

- Budget erneut anheben statt Architektur zu ändern (explizit verboten).
- `fetch()`-basiertes Laden aus einem koperten Content-Verzeichnis: hätte
  Dev-Server-Middleware, Kopierlogik in build_public und manuelle
  Hash-/Cache-Verwaltung erfordert; dynamische Imports bleiben in der
  geprüften Vite-Pipeline mit gleichen Fail-closed-Gates.
- `import.meta.glob`: Glob-Muster müssten beide Profil-Verzeichnisse
  abdecken → Risiko, privaten Content in den Public-Build einzubetten.

## Teil 2: Runtime W18–W30

### Verifizierte Ausgangslage

- torch, TensorFlow, JAX sind weder im gepinnten Lock 314.0.5 noch im
  aktuellen Stable-Lock 314.0.6 (jsDelivr, 2026-08-31) verfügbar
  [VERIFIED]. Whitelist bleibt `numpy, sympy, mpmath`.
- Grader-Contract: Tests als Python-String nach Lernendencode im selben
  Namensraum, `__check`, Host-Timeout 60 s mit Terminate/Restart [VERIFIED].
- Mastery nur über `deterministic`/`pyodide`/`pyodide-sympy`;
  Manual-Rubrics nie bindend [VERIFIED].

### Entscheidung: NumPy-first-Hybrid fortsetzen (OPTION A)

1. **Browserübungen (pyodide, packages `["numpy"]` oder `[]`)** für W18
   (Tensoren/Layer/Forward mit Dimensionsverträgen), W19 (Backprop),
   W20 (kleine Trainingsschleifen), W22 (Attention), W23 (Tokenizer),
   W24 (Toy-Inferenz), W27 (Retrieval), W28 (deterministische Metriken),
   W29 (defensive Regelklassifikation).
2. **Autograd ehrlich (Variante b):** Lernende implementieren analytische
   Gradientenfunktionen; der numerische Check lebt im Test und wird aus dem
   Lernenden-Forward berechnet (zentrale Differenz, float64, h=1e-5,
   `allclose(atol=1e-6, rtol=1e-4)`, Kink-freie Testinputs). Ein
   Value-Objekt-Graph (micrograd-Stil) ist nur Lese-/Parsons-Material.
   Framework-Autograd (`torch.autograd`) ist Lese-/Vorhersagekompetenz.
3. **Training klein und synthetisch:** Tabular-Daten statt FashionMNIST
   (keine Modellgewichte/Datensätze im Build), `np.random.default_rng(seed)`
   in Lernendencode und Tests, Lernkurven als Zahlenlisten (kein Bildkanal),
   Properties statt hardcodeder Arrays.
4. **Attention:** kleine Matrizen, stabiles zeilenweises Softmax, Maske via
   `-inf` vor Softmax, Handrechnung in der Lektion, Code gegen in-Test-
   Referenz.
5. **Tokenizer:** Zeich/Wort/Subword plus Mini-BPE mit gepinnten Regeln:
   Merges als Funktion von (Korpus, Anzahl, Tie-Break = lexikographisch
   kleinstes Paar), End-of-Word-Marker, Round-Trip-Property
   `decode(encode(s)) == s`.
6. **Toy-Inferenz (W24):** Pipeline Tokenizer → Forward (Fixtur-Gewichte als
   Literale) → Logits → Greedy-Decoding mit festen Outputs; ausdrückliche
   Abgrenzung: Toy-Modell mit gestellten Gewichten demonstriert
   Pipeline-Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt
   lokales Projekt/Lektüre.
7. **W21, W25, W26:** keine Browser-Vortäuschung. W21 (Ablation/Save-Load)
   und W25 (echtes Fine-Tuning) werden als lokale Projekte/Rubrics geführt;
   browserfähige Teilkompetenzen (Dropout-Forward mit fester Maske,
   Weight-Decay-Schritt, LoRA-ΔW = B·A-Mathematik, Freeze-/Trainable-Logik,
   Head-only-FT am Toy-MLP) sind eigenständige mastery-fähige Aufgaben.
   W26 (Paper-Synthese) bekommt deterministische Rech-/Struktur-Aufgaben
   plus Manual-Rubric als Arbeitsevidenz; Papierkarten öffnen nie allein
   Mastery.
8. **W30:** neues Runner-Projekt `content/projects/rag-secure-prototype/`
   nach W17-Muster (pytest, Manifest, Selbstbericht ohne Mastery).
9. **Autoringregel Generativ-Evidenz:** Von den zwei unabhängigen
   Mastery-Treffern pro Kompetenz muss mindestens einer generativ sein
   (python-code oder numeric mit Referenzsolver), reine single-choice-Hits
   allein öffnen keine Synthese-Kompetenz.

### Ehrlichkeits-Fixes mit dieser ADR umgesetzt

- Kompetenztexte von `c-dl-autograd`, `c-dl-inference`, `c-dl-finetuning`,
  `c-genai-rag`, `c-genai-prototype` so umformuliert, dass keine
  Framework-/LLM-Ausführung behauptet wird (Muster: pandas-Fix in ADR-0012).
- `c-dl-regularization.requires` um `c-ml-cv` ergänzt (faire Ablation ohne
  CV-Voraussetzung widerspricht dem Wochenzeil-DAG; gleicher Fehlertyp wie
  Methodik-F3 in ADR-0012).
- Curriculum-Overclaims bereinigt: Phase-p5-Tag `pytorch` → `numpy`,
  W20-Aufgabe „FashionMNIST- oder Tabular-Modell" → ehrliches
  Tabular-Netz, Phase-p6-Artefakt „Kleines NLP-/LLM-Demo" → Toy-Demo ohne
  LLM-Lauf.
- `docs/authoring-guide.md`: difficulty 1–5 mit Tier-Semantik (1 Basic,
  2 Core, 3 Advanced, 4–5 Final Boss) und toleranzbasierte Dezimalzahlen
  als numeric-Muster dokumentiert.

## Rechte [VERIFIED durch Rechte-Audit 2026-08-31, Primärseiten]

- **APPROVED (Wiederverwendung/Adaption mit Notice):** Karpathy micrograd/
  nanoGPT (MIT), HF transformers/tokenizers-Doku (Apache-2.0),
  PyTorch-Doku inkl. Reproducibility-Notes (BSD-Stil), NIST AI RMF/AI 600-1
  (US-Regierungswerk, public information), MITRE ATLAS-Daten (Apache-2.0),
  OpenAI Cookbook (MIT), Chain-of-Thought- und ReAct-Paper (CC BY 4.0),
  ACL-Anthology-Papers ab 2016 (CC BY 4.0).
- **LINK-ONLY:** alle übrigen arXiv-Papers (non-exclusive-distrib), OWASP
  GenAI LLM Top 10 (CC BY-SA 4.0 — ShareAlike kollidiert mit CC BY 4.0;
  aktive Fassung: 2026er Release vom 04.08.2026), d2l.ai (CC BY-SA 4.0),
  Deep Learning Book (MIT-Press-Vertrag), IIR-Book Kap. 8 (Cambridge UP;
  Metrik-Formeln als eigene Mathematik mit Zitation), BLEU/ROUGE-Papers
  (CC BY-NC-SA 3.0), Karpathy-Blog/YouTube (keineReuse-Lizenz), Google SAIF,
  AI-Incident-Database-Inhalte, Modell-Lizenztexte (Llama, Gemma).
- **LOCAL-ONLY:** Nielsen NN/DL-Buch (CC BY-NC 3.0 — kommerzielle Nutzung
  ausgeschlossen; nur privater Lesepfad).
- **Korrektur:** Der bestehende NumPy-Doku-Eintrag „docs CC BY-SA 3.0" ist
  am aktuellen Stand nicht belegbar (Lizenzseiten 404) — Code BSD-3 ist
  verifiziert, Docs-Textlizenz wird als unverified geführt; Nutzung nur als
  Referenz/Link. RAGAS (Apache-2.0) nur als Lektüre mit ausdrücklicher
  Einordnung „LLM-getriebene Metriken — kein autoritativer Grader".

## Sicherheitsgrenzen

W29/W30 lehren defensive GenAI-Sicherheit: Erkennungs- und
Verteidigungskompetenz (Regelklassifikation synthetischer Injektions-
Beispiele, Threat-Model-Entscheidungen, Least-Privilege-Policy-Prüfung,
Datenabfluss-Grenzierung). Keine Exploit-Entwicklung, keine
Credential-Suche, keine operationsfähigen Angriffsketten gegen fremde
Systeme; Red-Team ausschließlich gegen den eigenen Prototyp als
Arbeitsevidenz ohne Mastery.

## Unsicherheiten [UNKNOWN]

- RAM-Bedarf von numpy-lastigen W18–W30-Läufen im Worker auf
  Zielgeräten (nicht gemessen; Schätzung 60–120 MiB WASM [INFERENCE]).
- Laufzeit der schwersten Browseraufgaben (Trainingsschleife, BPE):
  geschätzt 1–5 s [INFERENCE]; CDP-Acceptance misst `durationMs` nach.
- Generator-Stream-Stabilität über künftige numpy-Upgrades (durch
  gepinnte 2.4.6 entschärft; Tests nutzen Properties statt Arrays).
- Retentions-/Evidence-Policy-Werte (14/77 Tage, 2 Treffer) bleiben
  unkalibrierte Produktheuristiken.
- Ob Lernende Toy-Inferenz-Kompetenz auf echte Systeme transferieren,
  ist eine didaktische Annahme [INFERENCE].

## Rückfallplan

Alle W18–W30-Inhalte sind additive Dateien (Wochenpakete, Lektionen,
Aufgaben-Definitionen, Projektordner, Generator-Modul, Quelleneinträge).
Rollback = diese Dateien löschen und Katalog-/Curriculum-/Coverage-Einträge
zurücknehmen. Content-Delivery-Rollback = Alias `@content-bundle` wieder
eintragen und `static-catalog.ts` aus der Historie restaurieren (Budget
müsste dann erneut verhandelt werden). Worker, Whitelist, Vendor und
Build-Gates bleiben unberührt.

## Neubewertungskriterien

- Vendoring neuer Wheels (auch pandas B-lite aus ADR-0012) bleibt ohne
  Noas ausdrückliche Freigabe blockiert; Freigabevorlage bleibt in ADR-0012.
- Ein Wechsel auf torch/tf/jax ist nur neu zu bewerten, wenn diese im
  offiziellen Pyodide-Lock erscheinen UND Noa Vendoring + RAM-Messung
  freigibt.
- Content-Delivery ist neu zu bewerten, wenn der Entry-Chunk trotz
  Snippet-Diät wieder > 130 KiB gzip driftet (dann Index weiter
  dietätieren, z. B. Reviews/Tools lazy).
