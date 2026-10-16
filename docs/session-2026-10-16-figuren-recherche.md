# Recherche: eigene animierte Figuren für jede Lektion

Stand 16.10.2026, Basis `main` bei `ab622d9` (0.9.2). Reine Recherche, kein Code geändert. Folgeauftrag: `docs/handoff-figuren-s1.md`.

## Ergebnis in drei Sätzen

argmin bekommt ein eigenes Figurensystem („Werkbank“, Arbeitstitel): Preact-SVG-Szenen ohne neue Runtime-Abhängigkeit, bei denen ein reines Modell jede Zahl und jede Bewegung liefert, die Lernenden schrittweise selbst weiterschalten und vor dem Aufdecken eine Vorhersage abgeben. Die Bildsprache übernimmt die stärkste Idee des anatomy-Skills (das Objekt ist die Erklärung) und koppelt sie an das, was argmin schon hat: jede Lektion besitzt eine Analogie („Das Bild dahinter“), und genau dieses Objekt wird animiert und verwandelt sich dann in die formale Darstellung. JSXGraph bleibt für Funktionsplots; Lottie, Rive, GSAP und Motion Canvas passen nicht zu CSP, Vendoring oder Lizenzregeln.

## 1. Ausgangslage im Repo

| Fakt | Quelle |
|---|---|
| 50 Lektionen, davon 24 mit mindestens einer Visualisierung, 26 ohne | `content/lessons/**`, Auswertung dieser Session |
| 27 Visualisierungen, alle JSXGraph, deklarativ als `.viz.json` (Slider, Funktionsgraph, Punkt, Pfeil, Text, Polygon, Kurve) | `schemas/visualization.schema.json`, `src/ui/VisualizationBlock.tsx` |
| Viz-Checkpoints (Zahl/Vektor, deterministischer Grader, keine Persistenz) sind gebaut | `assets/js/core/viz_checkpoint_grader.mjs` |
| Ein Visualisierungsblock steht immer am Ende eines Markdown-Blocks; für Platzierung im Text wird das Markdown in mehrere Blöcke geteilt | `src/ui/LessonView.tsx`, Beispiel `content/lessons/linear-algebra/systems.json` |
| CSP: `script-src 'self'`, kein `unsafe-eval`, kein `wasm-unsafe-eval` im Hauptdokument | `index.html` Zeile 9 |
| Runtimes nur vendored, mit SPDX und Hash in `vendor/licenses/THIRD_PARTY_NOTICES.json`, sonst bricht der Public-Build | `docs/license-register.md`, `tools/build_public.mjs` |
| Design-Tokens als CSS-Variablen, hell und dunkel: Papier `#efe5dc`, Violett `#6d3fd4`, Mono-Schrift | `src/styles/next.css` Zeilen 2 bis 26 |
| Jede Lektion hat eine tragende Analogie mit „Wo der Vergleich hinkt“ | Stilregeln `docs/authoring-guide.md` §9 |
| Älterer Plan zu Vorhersage-Widgets (teilweise umgesetzt als Checkpoints) | `docs/content-review/plan-interaktive-elemente.md` |
| Code-gerenderte Videos laufen über ganglion; Szenenvertrag „Frame ist reine Funktion von t“ | `/Users/no8/Desktop/life/Lifemaxxing/ganglion/docs/RENDER_ENGINE.md` |

Grenze von JSXGraph: Es zeichnet Funktionen und Geometrie gut, aber keine Objekte (Mixer, Namensschild, Fließband), keine Schrittfolgen mit Beschriftung und keine Tabellen-, Code- oder Tensor-Darstellungen. Genau die fehlen den 26 Lektionen ohne Visualisierung.

## 2. Was die Forschung sagt

| Befund | Zahl | Folge für argmin |
|---|---|---|
| Animation schlägt statische Bilder im Mittel, aber nur mäßig (Höffler und Leutner 2007, 26 Studien) | d = 0,37; darstellend statt dekorativ d = 0,40; prozedurales Wissen d = 1,06 | Nur animieren, was sich wirklich verändert (Prozess, Algorithmus, Ablauf). Keine Deko-Bewegung. |
| Neuere Meta-Analyse, 61 Studien, N = 7036 (Berney und Bétrancourt 2016) | g = 0,23; ohne Begleittext g = 0,88 | Die Figur muss allein tragen; Text gehört in Beat-Beschriftungen, nicht daneben verdoppelt. |
| Congruence- und Apprehension-Prinzip (Tversky, Morrison, Bétrancourt 2002) | qualitativ | Viele Animationen sind zu schnell oder zu komplex; kontinuierliche Vorgänge werden als diskrete Schritte gedacht. Also Schritte statt Film. |
| Segmenting, lernergesteuert (Mayer) | Median d = 0,98 (3 von 3 Tests); Meta-Analyse 56 Studien: kleiner bis mittlerer Effekt, weniger Last | Jede Szene besteht aus Beats mit „Weiter“, nicht aus einem Endlos-Loop. |
| Pretraining (Mayer) | Median d = 0,92 (7 von 7) | Begriffe zuerst benennen: die Analogie-Szene kommt vor der formalen Szene. |
| Signaling (Schneider, Beege, Nebel, Rey 2018, 103 Studien) | Behalten g = 0,53, Transfer g = 0,33 | Pro Beat genau ein hervorgehobenes Element (ein Akzent, wie bei anatomy „one lit part“). |
| Wie Lernende eine Visualisierung nutzen, wirkt stärker als was sie zeigt (Hundhausen, Douglas, Stasko 2002, 24 Studien); Engagement-Taxonomie (Naps u. a. 2002: ansehen, antworten, verändern, konstruieren) | qualitativ, konsistent | Jede Figur braucht mindestens „antworten“: Vorhersage vor dem Aufdecken. Die vorhandenen Checkpoints sind der Anfang. |
| Programmvisualisierung (Python Tutor, Notional-Machine-Forschung) | etabliert | Für Python-Lektionen: Namen zeigen auf Objekte, Rahmen pro Aufruf, Schritt vor und zurück. Passt wörtlich zur Analogie „Namensschilder statt Kisten“. |
| WCAG 2.2.2 Pause, Stop, Hide | Pflicht ab 5 s automatischer Bewegung | Kein Autoplay über 5 s ohne Pause; unter `prefers-reduced-motion` springt jeder Beat direkt an sein Ende. |

Unsicherheit: Die Effektgrößen stammen aus Laborstudien mit meist kurzen Lerneinheiten. Für argmin selbst messen wir nichts (keine Telemetrie, Produktvertrag). Bewertet wird deshalb über Expertenreview, Checkpoint-Antworten im Browser des Lernenden und Noas Urteil.

## 3. Was wir vom anatomy-Skill übernehmen und was nicht

Quelle: `~/.claude/skills/anatomy` (MIT, Ryan 2026, 0 Abhängigkeiten, Kit `kit/iso-kit.ts` ca. 840 Zeilen).

Übernehmen:
- **Das Objekt ist die Erklärung.** Bei argmin ist das Objekt schon festgelegt: die Analogie der Lektion. Die Figur zeigt das Objekt, lässt es arbeiten und blendet dann in die Formel- oder Code-Darstellung über. Wo die Analogie hinkt, zeigt die Figur genau diese Stelle (z. B. negative Portion im Smoothie-Mixer wird als „Geisterportion“ markiert).
- **Truth first.** Ein reines Modul liefert alle Zahlen; Anzeige, Bewegung und Beschriftung lesen daraus. Für argmin heißt das: wo möglich derselbe Solver wie in den Aufgabenfamilien (Gauß, Softmax, Gini, BPE).
- **Karte als Rahmen.** Fig-Nummer, Titel, Interaktionshinweis, Live-Anzeige; Beschriftungen außerhalb der Zeichnung.
- **Ruhige Bewegung.** Zeitbasiert, exponentielles Folgen oder kritisch gedämpfte Feder, eine Schleife pro Figur, Attribute über Refs setzen statt neu rendern, Stopp außerhalb des Viewports, reduzierte Bewegung respektieren (`references/motion.md`).
- **Prüfen wie ein Kritiker.** Screenshots in beiden Themes und bei 375 px, Zoom auf Details, automatische Prüfungen (bei uns: Label-Überlappung, Kontrast, Determinismus, axe).
- Optional das Kit selbst: `iso-kit.ts` (Projektion, `extrude`, Schattierung, Painter's Order) kann mit Lizenzhinweis nach `src/figures/kit/` übernommen werden, wenn die Stilwahl auf isometrisch fällt. Es wäre Quellcode, keine Runtime, braucht aber trotzdem den MIT-Hinweis im Notice-Register.

Nicht übernehmen:
- WebGL-Shader und anatomys separater 3D-Modus: Unsere Kamera ist von Anfang an eine echte 3D-Kamera mit drehbaren Winkeln (§6), gezeichnet als SVG. WebGL kommt erst, wenn eine Szene es nachweislich braucht.
- Die Detaildichte von 40 bis 150 Teilen pro Figur für alle 50 Lektionen: zu teuer und lenkt bei Lernfiguren ab (Coherence-Prinzip). Detail gehört an die Analogie-Objekte; die Tafel mit Formeln, Matrizen und Code bleibt glatt und ruhig.
- Text-Verbot in der Zeichnung: bei Code, Tabellen und Tensoren ist Text der Gegenstand. Regel stattdessen: Text nur, wo er Inhalt ist, nie als Erklärpfeil.

## 4. Technikvergleich

| Option | Lizenz | CSP und Vendoring | Passung | Urteil |
|---|---|---|---|---|
| Eigene Preact-SVG-Szenen mit eigener rAF-Schleife | eigener Code | keine neue Runtime | volle Kontrolle über Stil, Theme über CSS-Variablen, Text bleibt DOM (Screenreader, KaTeX daneben möglich) | **Gewählt** |
| JSXGraph (vorhanden) | MIT gewählt | vendored | Funktionsplots und Geometrie | **Behalten** für Plots, nicht für Objekte |
| Motion (motion.dev), `animate` mini 3,2 kB, hybrid 22 kB | MIT | vendorbar | Tweens, Federn, Sequenzen; wir brauchen aber modellgetriebene Werte, keine Tweens | Nicht nötig; nur falls eigene Federn/Sequenzen zu viel Code werden |
| GSAP | „Standard No Charge“, proprietär, Webflow kann kündigen, Verbot für konkurrierende Visual-Builder | vendorbar | stark | **Abgelehnt** (Lizenz nicht frei, widerspricht Lizenzregister) |
| Lottie (`lottie_light`) | MIT | Voll-Build nutzt `eval` für Expressions, nur Light-Build ohne `eval` | Designer-Assets aus After Effects, keine modellgetriebenen Zahlen | **Abgelehnt** |
| Rive | Runtime MIT, Editor proprietär | WASM braucht `wasm-unsafe-eval` im Hauptdokument | schöne State Machines, aber Editor-Lock-in | **Abgelehnt** |
| Motion Canvas | MIT | Player als Custom Element plus Projekt-Build, Canvas statt DOM | für narrierte Videos gebaut, Text im Canvas schlecht zugänglich | **Abgelehnt** für Lektionen; Videos laufen über ganglion |
| Manim | MIT | Video-Ausgabe in Python | nur Video | Abgelehnt; ganglion deckt Video ab |
| D3 | ISC | vendorbar | Daten-Joins, Skalen; Transformer Explainer nutzt Svelte und D3 | Nur falls einzelne Datenszenen es brauchen, erst dann vendoren |

Synergie mit ganglion: Wenn jede Szene ein reiner Zustand aus `(Parameter, Beat, t)` ist, kann ganglion dieselbe Szene ohne Umbau als Video aufnehmen (README, Social, Lernvideo). Das ist ein Grund mehr, keine CSS-Transitions zu verwenden.

## 5. Architekturvorschlag

### Schichten

1. **Inhalt** (`content/lessons/**/<name>.fig.json`, Deutsch, schema-validiert): welche Szene, Parameter, Beats mit Beschriftung, Vorhersagefrage. Beschriftungen laufen durch dieselben Learner-Text-Prüfungen wie Lektionen.
2. **Szene** (`src/figures/scenes/<scene>/`): `model.ts` (rein, Node-testbar), `view.tsx` (Preact-SVG, liest nur den Frame), optional Teile aus dem Kit.
3. **Kit** (`src/figures/kit/`, selbst gebaut): Kamera mit Azimut und Elevation (isometrisch bis frontal, animierbar), Körper mit Schattierung, Tiefensortierung, Tafel-Ebene für Text, Matrizen und Code, Token-Bindung (A1 oder A2), Folge- und Federfunktionen, Karte, Beat-Steuerung, Fokus und Tastatur.
4. **Laufzeit** (`src/ui/FigureBlock.tsx`): lädt die Szene per dynamischem Import (eigener Chunk pro Szene), eine Schleife, IntersectionObserver, reduzierte Bewegung, Pause.
5. **Prüfung** (`tests/figures_*.test.mjs`, Playwright-Spec): Modelltests, Stills pro Beat in hell und dunkel und bei 375 px, Overlap- und Kontrastcheck, axe, Determinismus.

### Szenenvertrag (Entwurf, in Session 1 festzurren)

```ts
export interface FigureScene<P, S> {
  id: string;                                   // matches fig.json "scene"
  init(params: P): S;                            // pure
  frame(state: S, beat: number, t: number, input: Controls): Frame; // pure, t in [0, 1] within the beat
  view(props: { frame: Frame; theme: 'light' | 'dark' }): VNode; // reads frame only
  readout(frame: Frame): string;                // live numbers, German
  describe(frame: Frame): string;               // aria-valuetext, changes per beat, not per frame
}
```

```json
{
  "schemaVersion": 1,
  "engine": "argmin-figure",
  "scene": "smoothie-column-picture",
  "title": "Smoothie mischen",
  "params": { "a1": [2, 1], "a2": [1, 2], "b": [4, 5] },
  "beats": [
    { "caption": "Zwei Zutaten, jede liefert einen festen Nährwertvektor.", "focus": "ingredients" },
    { "caption": "Eine Portion Hafer: der erste Pfeil.", "focus": "a1" },
    { "caption": "Zwei Portionen Beeren: der zweite Pfeil, angehängt.", "focus": "a2" },
    { "caption": "Treffer: die Summe landet genau auf dem Ziel b.", "focus": "b" }
  ],
  "predict": { "afterBeat": 1, "prompt": "Wie viele Portionen Beeren brauchst du?", "input": "numeric", "expected": 2 }
}
```

Lesson-Schema: neuer Blocktyp `figure` neben `visualization`, Platzierung wie heute über geteilte Markdown-Blöcke. Der Predict-Teil nutzt den vorhandenen `gradeVizCheckpoint`.

### Interaktionsregeln

- Beats: Weiter, Zurück, Neustart; Tastatur Pfeile links und rechts, Leertaste spielt den aktuellen Beat ab. Ein Beat dauert höchstens 4 s, damit WCAG 2.2.2 ohne Pause-Knopf erfüllt ist; Autoplay über mehrere Beats nur mit sichtbarer Pause.
- Erkunden: Regler oder Ziehen nur dort, wo ein Parameter das Lernziel ist; jede Ziehgeste hat ein Zahlenfeld als Tastaturweg (ADR-0004-Regel).
- Vorhersage: an einem festgelegten Beat stoppt die Szene, bis eine Antwort oder „überspringen“ kommt; danach deckt der nächste Beat auf.
- Ein Akzent pro Beat (Signaling); Farbe nie allein (Form oder Beschriftung zusätzlich).
- Analogie zuerst, dann Übergang in die formale Ansicht (Pretraining), dann die „hinkt“-Stelle als eigener Beat.

### Budgets

- Pro Szene höchstens ca. 12 kB gzip JS im eigenen Chunk, Kit gemeinsam höchstens ca. 10 kB. Messen im Build, nicht schätzen.
- Unter 1 ms Skriptzeit pro Frame; Schleife stoppt, wenn alle Ziele erreicht sind oder die Figur nicht sichtbar ist.
- Keine CSS-Animationen in Szenen (Determinismus, ganglion-Fähigkeit).

## 6. Stilrichtung (Entscheidung in Session 1)

Drei Kandidaten, alle auf denselben Tokens:

| Stil | Wirkung | Kosten pro Szene | Risiko |
|---|---|---|---|
| A: Isometrische Werkbank (anatomy-nah, Teile mit Volumen, vier Töne) | hochwertig, wiedererkennbar | hoch | Detail lenkt bei formalen Szenen ab |
| B: Flaches Papier (2D, feine Linien, leichte Tiefe über Schatten, Mono-Beschriftung) | ruhig, skaliert auf 50 Lektionen | niedrig | kann generisch wirken |
| C: Hybrid: Analogie-Objekt isometrisch, formale Ansicht flach, Übergang als Morph | Analogie bleibt im Gedächtnis, Formales bleibt lesbar | mittel | Übergang braucht Sorgfalt |

Empfehlung: C. Prüfung in Session 1 an einer Szene in allen drei Varianten, Noa entscheidet anhand der Screenshots. Für die Stil-Iteration passt `/visual-iteration`, für eine Barrierefreiheits-Review `/ui-ux-pro-max`.

Eigene Assets: Objekte (Mixer, Waage, Namensschild, Fließband, Karteikarte, Siegel, Würfelband) werden als parametrische Komponenten gebaut, nicht als statische SVG-Dateien. Nur so animieren sie und folgen dem Theme. Skizzen können über das Figma-MCP entstehen und werden dann in Komponenten übertragen.

## 7. Szenenfamilien

Zwölf wiederverwendbare Familien decken alle Lektionen ab. Eine Familie ist Code; eine Lektion wählt sie über `.fig.json` und Parameter.

| Familie | Kern | Lektionen |
|---|---|---|
| F1 Trace-Stepper | Code links, Namensschilder und Objekte rechts, Rahmen pro Aufruf, Schritt vor und zurück | python-state, control-flow, functions, code-reading, collections, testing-debugging |
| F2 Matrix- und Tensorbank | Zellgitter mit Achsen, Zeile-mal-Spalte-Sweep, Form-Vertrag als Steckverbindung, Broadcasting als Strecken | matrices, numpy-shape-contracts, dl-tensors, tf-attention, tf-finetuning, dl-regularization (Maske) |
| F3 Vektorebene | Pfeile addieren, Spannfläche, Eigenrichtung; ersetzt JSXGraph nur dort, wo Objekte dazukommen | systems, independence, ml-svm-pca |
| F4 Eliminations-Stepper | erweiterte Matrix, Zeile minus Vielfaches Eintrag für Eintrag, Pivot leuchtet, Stufenform entsteht | gauss, systems |
| F5 Pipeline | Stationen mit Ein- und Ausgabevertrag, Datensätze fließen, Grenzen und Fehlerpfade | files-errors, data-cleaning, ml-cv, tf-inference, genai-rag, genai-security, genai-prototype, capstone-runner, capstone-freeze |
| F6 Verteilung | Histogramm baut sich aus Punkten, Bin-Regler, Median und Quartile als Morph zum Boxplot, Seeds als Streuung | eda-distributions, ml-repro, ml-error-analysis |
| F7 Optimierungslandschaft | Kugel auf Verlustfläche, Schritte mit Lernrate, Ridge-Zug, Lernkurven | grad-regression, ml-linear, dl-training, ml-regularization, dl-regularization (Early Stopping) |
| F8 Schwellen-Sortierer | Elemente auf einer Wahrscheinlichkeitsachse, Schwelle sortiert in Fächer, Konfusionsmatrix füllt sich | ml-logistic, ml-baseline, genai-eval, responsible-ai |
| F9 Baum und Abstimmung | Fläche teilt sich rekursiv, Gini-Balken, Stimmen der Bäume | ml-ensembles |
| F10 Graph | Knoten und Kanten, vorwärts Werte, rückwärts Gradienten, Commit-Graph, topologische Ordnung | dl-autograd, git, capstone-freeze |
| F11 Text und Token | Zeichenband, Chunk-Fenster, BPE-Verschmelzung | tf-tokenizer, genai-rag |
| F12 Waage | zwei Schalen, Operation auf beiden Seiten, Tüten auspacken | algebra, algebra-transformations |

Statisch statt animiert (Congruence: kein Vorgang über Zeit): learning, tf-papers, research-question, research-cards, capstone-acceptance, capstone-regression, capstone-repro, capstone-baseline. Sie bekommen eine gezeichnete, interaktiv aufklappbare Figur (z. B. Karten mit Konsistenzlinien), aber keine Bewegung, außer an einer Stelle mit echtem Vorgang (Hash-Lawine bei einem geänderten Byte in capstone-baseline).

## 8. Abdeckung aller 50 Lektionen

Reihenfolge nach Applied-AI-Pfad. „Bild“ ist die vorhandene Analogie der Lektion.

| Lektion | Familie | Bild, das arbeitet | Vorhersage |
|---|---|---|---|
| l-foundations-python-state | F1 | Namensschilder wandern bei Neuzuweisung, Tausch per Tupel | Wert von `a` nach drei Zeilen |
| l-foundations-control-flow | F1 | Türsteher prüft Karten, bei `and` bleibt die zweite Karte grau (Kurzschluss); Nudeltopf mit Fortschrittsanzeige | Wie oft läuft die Schleife? |
| l-foundations-functions | F1 | Getränkeautomat: Münzen rein, lokaler Rahmen öffnet sich, `return` fällt ins Fach, `print` nur aufs Display | Was steht danach in `x`? |
| l-foundations-code-reading | F1 | Kassenbuch: eine Zeile pro Schritt, Code springt bei Schleifen zurück | Nächste ausgeführte Zeile |
| l-foundations-collections | F1 | Fächer, Garderobe, Menge; zwei Schilder an derselben Liste, `append` ändert beide | Inhalt von `b` nach `a.append` |
| l-foundations-files-errors | F5 | Wareneingang: Zeilen laufen durch Parser und Prüfer, Ausnahme springt zur `except`-Grenze | Welche Zeile wird abgelehnt? |
| l-foundations-testing-debugging | F1 | Rauchmelder: Arrange, Act, Assert als drei Stationen, Eingrenzen durch Halbieren | Welcher Test schlägt an? |
| l-foundations-learning | statisch | Journal-Karte mit vier Feldern, Review-Abstände auf Zeitachse | keine |
| l-foundations-git | F10 | Speicherstände: Arbeitsordner, Staging, Commit-Graph, Merge zweier Äste | Was zeigt `git diff --staged`? |
| l-foundations-algebra | F12 | Balkenwaage bleibt im Gleichgewicht; Potenz als Stapel, Logarithmus als Frage nach der Stapelhöhe | `x` nach dem nächsten Schritt |
| l-foundations-algebra-transformations | F12 | Einkaufstüte auspacken, Minus vor der Tüte dreht jedes Vorzeichen | Term nach dem Auspacken |
| l-linalg-matrices | F2 | Bestellung mal Preisliste, Zeile-mal-Spalte-Sweep, Steckvertrag „innen gleich“ | Form des Produkts |
| l-linalg-systems | F3, F4 | Smoothie-Mixer, Portionen werden Pfeile, drei Lösungsfälle | Lösungsfall aus der Stufenform |
| l-linalg-gauss | F4 | Kassenzettel: Zeile 2 minus 2 mal Zeile 1, Eintrag für Eintrag | Faktor des nächsten Schritts |
| l-linalg-independence | F3 | Wegbeschreibungen, Parallelogramm kollabiert zur Linie, Determinante als Fläche | Ist die Determinante 0? |
| l-numpy-shape-contracts | F2 | Stecker und Reiseadapter: Broadcasting streckt sichtbar, `*` gegen `@` | Ergebnisform oder Fehler |
| l-data-cleaning | F5, F6 | Zutatenkontrolle: Löschen zielabhängiger Lücken verschiebt den Mittelwert | Verbleibende Zeilen |
| l-eda-distributions | F6 | Notenspiegel baut sich auf, Bin-Breite ändert die Form | Median oder Mittelwert größer? |
| l-grad-regression | F7 | Wanderer im Nebel auf der MSE-Schüssel (Sekante und Schüssel bleiben JSXGraph) | Nächstes `w` |
| l-ml-baseline | F8 | Wettervorhersage: Mehrheits-Baseline bei 1 % Betrug, 99 % Accuracy, Recall 0 | Accuracy der Baseline |
| l-ml-linear | F7 | Residuen als Federn zwischen Punkt und Gerade, Ausreißer zieht | Wohin kippt die Gerade? |
| l-ml-logistic | F8 | Spamfilter: Mails auf der Wahrscheinlichkeitsachse, Schwelle sortiert in Ordner | Präzision bei Schwelle t |
| l-ml-cv | F5 | Fünf Übungsblätter rotieren, Leakage fließt sichtbar über die Split-Grenze | Fold-Größen bei n mod k |
| l-ml-error-analysis | F6 | Flacher Fluss: Querschnitt mit Tiefe pro Teilgruppe | Größte Lücke |
| l-ml-regularization | F7 | Gummibänder ziehen Koeffizienten zur Null, Lasso rastet auf 0 | Welcher Koeffizient fällt zuerst? |
| l-ml-ensembles | F9 | Bestimmungsschlüssel teilt die Fläche, Bäume stimmen ab | Gini nach dem Split |
| l-ml-svm-pca | F3 | Straße zwischen Dörfern, Schatten drehen, Pizzafilialen wandern zum Schwerpunkt | Zentren nach einer Iteration |
| l-ml-repro | F6 | Würfelband: gleicher Seed, gleiche Folge; Streuung über Seeds | Spannweite über Seeds |
| l-dl-tensors | F2 | Adresse einer Zahl: Achsen eines Tensorquaders, Formen fließen durch Schichten | Ausgabeform und Parameterzahl |
| l-dl-autograd | F10 | Wechselkurse: rückwärts multiplizieren, an Gabelungen addieren | `dL/dx` |
| l-dl-training | F7 | Übungsbuch: Seite, Kapitel, Korrektur synchron mit Batch, Epoche, Schritt | Anzahl Updates |
| l-dl-regularization | F2, F7 | Team mit Fehlzeiten: feste Maske pro Schritt, bei Inferenz volles Team | Überlebende Aktivierungen |
| l-tf-attention | F2 | Bibliotheksrecherche: Query vergleicht Buchrücken, Softmax verteilt, Values mischen, Maske graut Zukunft aus | Gewicht eines Tokens |
| l-tf-tokenizer | F11 | Lego und Kurzschrift: häufigstes Paar verschmilzt | Nächster Merge |
| l-tf-inference | F5 | Fließband und Navi: Token, Logits, argmax, zurück an den Anfang | Nächstes Token |
| l-tf-finetuning | F2 | Köchin einarbeiten: eingefrorene Matrix plus schmale Streifen B·A | Zusätzliche Parameter |
| l-tf-papers | statisch | Gerichtsverhandlung: Claim-Karten mit Evidenzfäden, absolut gegen relativ | keine |
| l-genai-rag | F11, F5 | Karteikarten: Chunk-Fenster (vorhanden), Query findet Karten, top-k | Recall@k |
| l-genai-eval | F8 | Erwartungshorizont: Antworten fallen in Taxonomie-Fächer | Anteil formatfehler |
| l-genai-security | F5 | Assistenz liest Post: eingeschmuggelte Anweisung bleibt Daten, Tools hinter Allowlist | Welcher Tool-Aufruf wird blockiert? |
| l-genai-prototype | F5 | Hausbau aus Bauteilen; Ablation: Kontrolle raus, Fehlerquote steigt | Fehlerquote ohne Kontrolle |
| l-research-question | statisch | Wettschein mit Zeitstempel vor dem Lauf, Goal-Shift markiert | keine |
| l-research-cards | statisch | Beipackzettel-Trio mit Konsistenzlinien | keine |
| l-responsible-ai | F8 | Lebenslauf-Vorauswahl: zwei Ströme, Raten getrennt, Paritätsband | Gap zwischen Gruppen |
| l-capstone-baseline | statisch, ein Vorgang | Siegel: ein Byte ändert den ganzen Hash | Bleibt der Hash gleich? |
| l-capstone-acceptance | statisch | Bauabnahme mit Mängelprotokoll | keine |
| l-capstone-regression | statisch | Statik und Brandschutz | keine |
| l-capstone-freeze | F10 | Fundament: Stages in topologischer Ordnung, Freeze-Siegel | Reihenfolge der Stages |
| l-capstone-repro | statisch | Bauakte | keine |
| l-capstone-runner | F5 | Gewerke mit Übergabeprotokoll, Stoppuhr pro Stage, Timeout | Status nach Timeout |

## 9. Fahrplan mit Gates

| Phase | Inhalt | Gate |
|---|---|---|
| S1 Spike | Stilvarianten A, B, C an der Szene „Smoothie mischen“ (l-linalg-systems), Kit-Grundlagen, Laufzeit mit Beats, Vorhersage, reduzierte Bewegung, Prüfharness | Noa wählt den Stil anhand der Screenshots; Modelltest, Playwright-Stills, axe grün, Budget gemessen |
| S2 Engine | Blocktyp `figure`, Schema, Registry mit Lazy-Load, ADR-0018, Autorenleitfaden-Abschnitt | Compile fail-closed bei unbekannter Szene oder fehlerhaften Beats; E2E grün |
| S3 Familien F1, F2, F4 | Python und lineare Algebra (höchster Hebel, 13 Lektionen) | jede Lektion mit Figur, Stills hell/dunkel/375 px, Noas Review |
| S4 Familien F5, F7, F8 | Pipeline, Optimierung, Schwellen (ca. 20 Lektionen) | wie S3 |
| S5 Rest | F3, F6, F9 bis F12 und statische Figuren | alle 50 Lektionen abgedeckt |
| S6 optional | ganglion-Export ausgewählter Szenen als Video | ein Video aus derselben Szene ohne Umbau |

Pro Session höchstens eine Familie bauen und abnehmen; das hält Reviews klein und die Stilregeln stabil.

## 10. Offene Entscheidungen für Noa

1. Stil A, B oder C (nach dem Spike, mit Screenshots).
2. Darf das anatomy-Kit (MIT) als Quellcode ins Repo, oder bauen wir das Kit selbst?
3. Ersetzen neue Figuren bestehende JSXGraph-Visualisierungen, wo sich beides überschneidet (z. B. `two-lines`, `column-picture`), oder bleiben beide?
4. Sollen Figuren auch auf Aufgabenseiten erscheinen (z. B. Trace-Stepper als Lösungshilfe), oder nur in Lektionen?

## Quellen

- Höffler, T. N., Leutner, D. (2007). Instructional animation versus static pictures: A meta-analysis. Learning and Instruction 17(6), 722-738. https://doi.org/10.1016/j.learninstruc.2007.09.013
- Berney, S., Bétrancourt, M. (2016). Does animation enhance learning? A meta-analysis. Computers & Education 101, 150-167. https://doi.org/10.1016/j.compedu.2016.06.005
- Tversky, B., Morrison, J. B., Bétrancourt, M. (2002). Animation: can it facilitate? IJHCS 57(4), 247-262. https://doi.org/10.1006/ijhc.2002.1017
- Mayer, R. E., Pilegard, C. (2014). Segmenting, pre-training and modality principles. Cambridge Handbook of Multimedia Learning. https://doi.org/10.1017/cbo9780511816819.012
- Rey, G. D. u. a. (2019). A meta-analysis of the segmenting effect. Educational Psychology Review. https://link.springer.com/article/10.1007/s10648-018-9456-4
- Schneider, S., Beege, M., Nebel, S., Rey, G. D. (2018). A meta-analysis of how signaling affects learning with media. Educational Research Review 23, 1-24. https://doi.org/10.1016/j.edurev.2017.11.001
- Hundhausen, C. D., Douglas, S. A., Stasko, J. T. (2002). A meta-study of algorithm visualization effectiveness. JVLC 13(3), 259-290. https://doi.org/10.1006/jvlc.2002.0237
- Naps, T. L. u. a. (2002). Exploring the role of visualization and engagement in computer science education. ITiCSE WG Report. https://doi.org/10.1145/960568.782998
- Guo, P. J. (2013). Online Python Tutor. SIGCSE. https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf
- W3C (2023). WCAG 2.2, SC 2.2.2 Pause, Stop, Hide. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide
- Cho, A. u. a. (2025). Transformer Explainer. AAAI. https://poloclub.github.io/transformer-explainer/
- Motion `animate`: https://motion.dev/docs/animate · GSAP Standard License: https://gsap.com/community/standard-license/ · lottie-web eval: https://github.com/airbnb/lottie-web/issues/289 · Rive CSP: https://rive.app/docs/runtimes/web/faq · Motion Canvas: https://github.com/motion-canvas/motion-canvas
- anatomy-Skill: `~/.claude/skills/anatomy/SKILL.md`, `references/motion.md`, `references/craft.md`
