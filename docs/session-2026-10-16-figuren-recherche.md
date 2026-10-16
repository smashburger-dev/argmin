# Recherche: eigene animierte Figuren für jede Lektion

Stand 16.10.2026, Basis `main` bei `ab622d9` (0.9.2). Reine Recherche, kein Code geändert. Folgeauftrag: `docs/handoff-figuren-s1.md`.

## Ergebnis in drei Sätzen

argmin bekommt ein eigenes Figurensystem („Werkbank“, Arbeitstitel): Preact-SVG-Szenen in einer echten isometrischen 3D-Welt, ohne neue Runtime-Abhängigkeit, bei denen ein reines Modell jede Zahl und jede Bewegung liefert, die Lernenden schrittweise selbst weiterschalten, auf dem Handy wie am Desktop bedienen und vor dem Aufdecken eine Vorhersage abgeben. Die Bildsprache übernimmt die stärkste Idee des anatomy-Skills (das Objekt ist die Erklärung) und koppelt sie an das, was argmin schon hat: jede Lektion besitzt eine Analogie („Das Bild dahinter“), dieses Objekt wird animiert, und Formeln, Matrizen und Code stehen auf einer Tafel in derselben Welt, an die die Kamera zum Lesen frontal heranfährt. Figuren ersetzen JSXGraph, wo sie mehr erklären, erscheinen als Lösungshilfe in Aufgaben (ohne die Lösungszahl) und werden zu neuen Szenen-Aufgaben, bei denen der Grader den aufgebauten Endzustand gegen den Referenzlöser prüft.

## Entscheidungen von Noa (16.10.)

1. Das Kit bauen wir selbst. anatomy dient als Referenz für Prinzipien, nicht als Codequelle.
2. Figuren ersetzen JSXGraph-Visualisierungen, wo sie sinnvoller und hilfreicher sind (oft der Fall, weil JSXGraph nur 2D kann und stilisierte, zugeschnittene oder 3D-Darstellungen mehr erklären). Regel in §5a.
3. Figuren führen zu neuen Aufgabentypen: Lernende bauen prozedural erzeugte Objekte und Szenen auf, lösen dabei Gleichungen oder füllen mehrere Stellen. Entwurf in §7a.
4. Figuren dürfen als Lösungshilfe in Aufgaben erscheinen, solange sie die Lösung nicht als Zahl enthalten; sie sollen Anknüpfung und Synthese beim Lösen unterstützen. Regeln in §7b.
5. Stil isometrisch wie bei anatomy, sofern sich kein ästhetischerer Weg findet. Vorschlag in §6.
6. Kamera, Kamerafahrt und Drehen müssen auf dem Handy funktionieren und interaktiv sein (§6, §6b).
7. Die Figuren brauchen ein hohes Niveau, zum Beispiel Gradienten als echte Fläche mit Gradientenpfeil und Abstiegsspur (§6a).
8. Videos über ganglion sind willkommen. Für argmin gibt es bisher keine; die vorhandenen ganglion-Läufe gehören zum kleinhirn-Video R8.
9. Die Dokumente bleiben vorerst im privaten Branch `research/figuren`, kein Push.

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
| Hinweise: höchstens 1 Hinweis, damit ein Versuch noch als Kompetenzbeleg zählt | `assets/js/domain/learning_policy.mjs`, `MASTERY_MAX_HINTS = 1` |
| Mobile-Prüfungen laufen als Geräteemulation (kleines Android-Chromium, kleines iPhone-WebKit) in `tests/e2e/mobile-touch.spec.ts`; echtes WebKit nur in CI oder mit `PLAYWRIGHT_ALL_BROWSERS=1` | `playwright.config.ts` |
| Älterer Plan zu Vorhersage-Widgets (teilweise umgesetzt als Checkpoints) | `docs/content-review/plan-interaktive-elemente.md` |
| Code-gerenderte Videos laufen über ganglion; Szenenvertrag „Frame ist reine Funktion von t“; bisher nur das kleinhirn-Video R8 | `/Users/no8/Desktop/life/Lifemaxxing/ganglion/docs/RENDER_ENGINE.md` |

Grenze von JSXGraph: Es zeichnet Funktionen und Geometrie in 2D, aber keine Objekte (Mixer, Namensschild, Fließband), keine Flächen im Raum, keine Schrittfolgen mit Beschriftung und keine Tabellen-, Code- oder Tensor-Darstellungen. Genau die fehlen den 26 Lektionen ohne Visualisierung.

## 2. Was die Forschung sagt

| Befund | Zahl | Folge für argmin |
|---|---|---|
| Animation schlägt statische Bilder im Mittel, aber nur mäßig (Höffler und Leutner 2007, 26 Studien) | d = 0,37; darstellend statt dekorativ d = 0,40; prozedurales Wissen d = 1,06 | Nur animieren, was sich wirklich verändert (Prozess, Algorithmus, Ablauf). Keine Deko-Bewegung. |
| Neuere Meta-Analyse, 61 Studien, N = 7036 (Berney und Bétrancourt 2016) | g = 0,23; ohne Begleittext g = 0,88 | Die Figur muss allein tragen; Text gehört in Beat-Beschriftungen, nicht daneben verdoppelt. |
| Congruence- und Apprehension-Prinzip (Tversky, Morrison, Bétrancourt 2002) | qualitativ | Viele Animationen sind zu schnell oder zu komplex; kontinuierliche Vorgänge werden als diskrete Schritte gedacht. Also Schritte statt Film. |
| Segmenting, lernergesteuert (Mayer) | Median d = 0,98 (3 von 3 Tests); Meta-Analyse 56 Studien: kleiner bis mittlerer Effekt, weniger Last | Jede Szene besteht aus Beats mit „Weiter“, nicht aus einem Endlos-Loop. |
| Pretraining (Mayer) | Median d = 0,92 (7 von 7) | Begriffe zuerst benennen: das Analogie-Objekt kommt vor der Tafel. |
| Signaling (Schneider, Beege, Nebel, Rey 2018, 103 Studien) | Behalten g = 0,53, Transfer g = 0,33 | Pro Beat genau ein hervorgehobenes Element. |
| Wie Lernende eine Visualisierung nutzen, wirkt stärker als was sie zeigt (Hundhausen, Douglas, Stasko 2002, 24 Studien); Engagement-Taxonomie (Naps u. a. 2002: ansehen, antworten, verändern, konstruieren) | qualitativ, konsistent | Jede Figur braucht mindestens „antworten“ (Vorhersage); Szenen-Aufgaben erreichen „verändern“ und „konstruieren“. |
| Programmvisualisierung (Python Tutor, Notional-Machine-Forschung) | etabliert | Für Python-Lektionen: Namen zeigen auf Objekte, Rahmen pro Aufruf, Schritt vor und zurück. Passt wörtlich zur Analogie „Namensschilder statt Kisten“. |
| WCAG 2.2.2 Pause, Stop, Hide | Pflicht ab 5 s automatischer Bewegung | Kein Autoplay über 5 s ohne Pause; unter `prefers-reduced-motion` springt jeder Beat direkt an sein Ende. |

Unsicherheit: Die Effektgrößen stammen aus Laborstudien mit meist kurzen Lerneinheiten. Für argmin selbst messen wir nichts (keine Telemetrie, Produktvertrag). Bewertet wird über Expertenreview, Checkpoint-Antworten im Browser des Lernenden und Noas Urteil.

## 3. Was wir vom anatomy-Skill übernehmen und was nicht

Quelle: `~/.claude/skills/anatomy` (MIT, 0 Abhängigkeiten). Gelesen als Prinzipienquelle.

Übernehmen:
- **Das Objekt ist die Erklärung.** Bei argmin ist das Objekt schon festgelegt: die Analogie der Lektion. Die Figur zeigt das Objekt, lässt es arbeiten und führt dann zur Tafel. Wo die Analogie hinkt, zeigt die Figur genau diese Stelle (z. B. negative Portion im Smoothie-Mixer als „Geisterportion“).
- **Truth first.** Ein reines Modul liefert alle Zahlen; Anzeige, Bewegung und Beschriftung lesen daraus. Wo möglich derselbe Solver wie in den Aufgabenfamilien (Gauß, Softmax, Gini, BPE).
- **Karte als Rahmen.** Fig-Nummer, Titel, Interaktionshinweis, Live-Anzeige.
- **Ruhige Bewegung.** Zeitbasiert, exponentielles Folgen oder kritisch gedämpfte Feder, eine Schleife pro Figur, Attribute über Refs setzen statt neu rendern, Stopp außerhalb des Viewports, reduzierte Bewegung respektieren.
- **Viele echte Teile, Volumen, ein Akzent.** Detail entsteht aus Teilen, die zum Mechanismus gehören, nicht aus Textur.
- **Prüfen wie ein Kritiker.** Screenshots in beiden Themes, auf Handybreite, im Zoom; automatische Prüfungen (bei uns: Label-Überlappung, Kontrast, Tiefenreihenfolge, Determinismus, axe).

Nicht übernehmen:
- Keinen Code. Funktionen, Namen und Struktur entstehen neu für argmins Bedarf (Text, Tabellen, Code und Tensoren als Inhalt, Tafel-Frontalansicht, Beats, Aufgaben- und Hinweismodus, Touch).
- WebGL-Shader und anatomys separaten 3D-Modus. Unsere Kamera ist von Anfang an eine echte 3D-Kamera mit drehbaren Winkeln (§6), gezeichnet als SVG. WebGL kommt erst, wenn eine Szene es nachweislich braucht.
- Text-Verbot in der Zeichnung: bei Code, Tabellen und Tensoren ist Text der Gegenstand. Regel stattdessen: Text nur, wo er Inhalt ist, nie als Erklärpfeil.

## 4. Technikvergleich

| Option | Lizenz | CSP und Vendoring | Passung | Urteil |
|---|---|---|---|---|
| Eigene Preact-SVG-Szenen mit eigener Kamera und rAF-Schleife | eigener Code | keine neue Runtime | volle Kontrolle über Stil, Theme über CSS-Variablen, Text bleibt DOM (Screenreader) | **Gewählt** |
| JSXGraph (vorhanden) | MIT gewählt | vendored | Funktionsplots und Geometrie, nur 2D | **Schrittweise ersetzen**, wo eine Figur mehr erklärt (§5a) |
| Motion (motion.dev), `animate` mini 3,2 kB, hybrid 22 kB | MIT | vendorbar | Tweens und Federn; wir brauchen modellgetriebene Werte | Nicht nötig |
| GSAP | „Standard No Charge“, proprietär, Webflow kann kündigen | vendorbar | stark | **Abgelehnt** (Lizenz nicht frei) |
| Lottie (`lottie_light`) | MIT | Voll-Build nutzt `eval` | Designer-Assets ohne modellgetriebene Zahlen | **Abgelehnt** |
| Rive | Runtime MIT, Editor proprietär | WASM braucht `wasm-unsafe-eval` | Editor-Lock-in | **Abgelehnt** |
| Motion Canvas | MIT | Player plus Projekt-Build, Canvas statt DOM | für narrierte Videos, Text schlecht zugänglich | **Abgelehnt**; Videos über ganglion |
| Manim | MIT | Python, nur Video | nur Video | Abgelehnt |
| D3 | ISC | vendorbar | Daten-Joins, Skalen | Nur falls eine Datenszene es braucht |

Synergie mit ganglion: Wenn jede Szene ein reiner Zustand aus `(Parameter, Beat, t, Kamera)` ist, kann ganglion dieselbe Szene ohne Umbau als Video aufnehmen. Das wären die ersten argmin-Videos (README, Lernvideo zu einer Lektion). Deshalb keine CSS-Transitions in Szenen.

## 5. Architektur

### Schichten

1. **Inhalt** (`content/lessons/**/<name>.fig.json`, Deutsch, schema-validiert): Szene, Parameter, Beats mit Beschriftung, Vorhersage. Beschriftungen laufen durch dieselben Learner-Text-Prüfungen wie Lektionen.
2. **Szene** (`src/figures/scenes/<scene>/`): `model.ts` (rein, Node-testbar, später auch Grader), `view.tsx` (Preact-SVG, liest nur den Frame).
3. **Kit** (`src/figures/kit/`, selbst gebaut): Kamera mit Azimut, Elevation und Zoom (isometrisch bis frontal-orthografisch, animierbar), Körper mit Schattierung, Flächen aus Kacheln, Tiefensortierung, Tafel-Ebene für Text, Matrizen und Code, Token-Bindung, Folge- und Federfunktionen, Karte, Beat-Steuerung, Fokus, Tastatur und Touch.
4. **Laufzeit** (`src/ui/FigureBlock.tsx`): lädt die Szene per dynamischem Import (eigener Chunk pro Szene), eine Schleife, IntersectionObserver, reduzierte Bewegung, Pause; Modi Lektion, Hinweis, Aufgabe.
5. **Prüfung** (`tests/figures_*.test.mjs`, Playwright-Spec): Modelltests, Stills pro Beat in hell, dunkel, 1440 px und 375 px, Overlap- und Kontrastcheck, axe, Determinismus, Lösungsleck-Prüfung für Hinweisfiguren (§7b), Frame-Budget mit CPU-Drosselung.

### Szenenvertrag (Entwurf, in Session 1 festzurren)

```ts
export interface FigureScene<P, S> {
  id: string;                                   // matches fig.json "scene"
  init(params: P): S;                            // pure
  frame(state: S, beat: number, t: number, input: Controls, camera: Camera): Frame; // pure
  view(props: { frame: Frame; mode: 'lesson' | 'hint' | 'task' }): VNode; // reads frame only
  readout(frame: Frame): string;                // live numbers, German
  describe(frame: Frame): string;               // aria-valuetext, changes per beat, not per frame
  answerValues?(state: S): number[];            // values a hint figure must never display (§7b)
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
    { "caption": "Treffer: die Summe landet genau auf dem Ziel b.", "focus": "b", "camera": "board" }
  ],
  "predict": { "afterBeat": 1, "prompt": "Wie viele Portionen Beeren brauchst du?", "input": "numeric", "expected": 2 }
}
```

Lesson-Schema: neuer Blocktyp `figure` neben `visualization`, Platzierung wie heute über geteilte Markdown-Blöcke. Der Predict-Teil nutzt den vorhandenen `gradeVizCheckpoint`.

### 5a. Wann eine Figur eine JSXGraph-Visualisierung ersetzt

Eine Figur ersetzt eine `.viz.json`, wenn mindestens eins davon zutrifft und die Figur den Checkpoint der alten Visualisierung übernimmt (gleiche Frage, gleicher erwarteter Wert):
- Der Gegenstand ist 3D oder wird in 3D klarer (drei Ebenen eines 3×3-Systems, Tensorquader, MSE-Fläche über zwei Gewichten, Punktwolke für PCA).
- Die Analogie der Lektion kann im Bild arbeiten (Mixer, Waage, Fließband).
- Der Inhalt ist ein Ablauf mit Schritten (Elimination, Softmax-Zeile, k-Means-Iteration), den JSXGraph nur über Regler nachstellt.

JSXGraph bleibt, wo ein frei zu erkundender Funktionsgraph der Kern ist und eine Figur nichts hinzufügt. Wenn die letzte `.viz.json` ersetzt ist, kann JSXGraph aus `vendor/` und dem Lizenzregister entfernt werden (eigene Entscheidung, dann ADR).

Erste Ersetzungskandidaten: `two-lines` und `solution-cases` (Systeme, 2D und 3D), `column-picture` (Mixer), `row-operation` (Eliminations-Stepper), `span-2d` (Spannfläche mit Determinante als Fläche), `mse-bowl` und `secant-tangent` (echte Fläche über w und b mit Tangente), `eigen-direction` und `pca-axis` (Punktwolke in 3D), `matrix-transform`, `chunk-overlap`, `softmax-temperature`.

### Interaktionsregeln

- Beats: Weiter, Zurück, Neustart; Tastatur Pfeile links und rechts, Leertaste spielt den aktuellen Beat ab. Ein Beat dauert höchstens 4 s; Autoplay über mehrere Beats nur mit sichtbarer Pause.
- Erkunden: Regler oder Ziehen nur dort, wo ein Parameter das Lernziel ist; jede Ziehgeste hat ein Zahlenfeld oder Tasten als zweiten Weg.
- Vorhersage: an einem festgelegten Beat stoppt die Szene, bis eine Antwort oder „überspringen“ kommt.
- Ein Akzent pro Beat; Farbe nie allein.
- Analogie zuerst, dann Tafel, dann die „hinkt“-Stelle als eigener Beat.

### Budgets

- Pro Szene höchstens ca. 12 kB gzip JS im eigenen Chunk, Kit gemeinsam höchstens ca. 10 kB. Messen im Build.
- Frame-Skriptzeit unter 4 ms bei vierfacher CPU-Drosselung (Playwright über CDP), damit ein Mittelklasse-Handy flüssig bleibt; Schleife stoppt, wenn alle Ziele erreicht sind oder die Figur nicht sichtbar ist.
- SVG-Flächen bis etwa 600 Kacheln; darüber Canvas-2D als Rückfall prüfen, bevor WebGL in Frage kommt.
- Keine CSS-Animationen in Szenen (Determinismus, ganglion-Fähigkeit).

## 6. Stil: isometrisch, mit Tafel und Druckästhetik

**Was mit „formale Ansicht flach“ gemeint war.** Formeln, Matrizen, Code und Achsenbeschriftungen werden in isometrischer Projektion schräg verzerrt: Zahlen in einer Matrix laufen diagonal, Spalten wirken unterschiedlich breit, Text ist schwer zu lesen. Statt dafür auf eine zweite, flache Bildsprache umzuschalten:

- **Tafel in der Welt.** Die formale Darstellung steht auf einem Objekt in derselben Szene: einer Tafel, einem Display am Mixer, einer Papierrolle aus dem Plotter. Ihr Inhalt wird in der Ebene dieser Fläche gezeichnet.
- **Kamerafahrt zum Lesen.** Für den Beat, in dem gelesen oder gerechnet wird, fährt die Kamera frontal an die Tafel: Azimut und Elevation laufen kontinuierlich auf 0, die Projektion wird orthografisch von vorn, die Tafel füllt die Figur. Danach fährt sie zurück. Die Welt bleibt eine, der Text ist im Lesemoment exakt gerade.
- **Echtes 3D, wo es hilft.** Dieselbe Kamera lässt sich drehen (§6b). Gezeichnet wird als SVG mit Tiefensortierung; Flächen werden in Kacheln zerlegt.

**Ästhetik: zwei Varianten für den Spike.**

| Variante | Aussehen | Warum |
|---|---|---|
| A1 Tonale Werkbank | Teile mit Volumen in vier Grautönen plus ein violetter Akzent, feine Linien, weicher Halo darunter | bewährt, präzise, technisch |
| A2 Zweifarbdruck auf argmin-Papier | dieselben isometrischen Körper auf dem Papierton `#efe5dc`, schattiert mit zwei Druckfarben (Tinte und Violett) in Rasterstufen statt Grauverläufen, leichte Papierkörnung; im Dunkelmodus helle Tinte auf dunklem Papier | eigen statt anatomy-Kopie, passt zu argmins Palette; die Papier- und Tintenlogik gibt es schon im kleinhirn-Video R8 (`ganglion/examples/r8/tools/paper.mjs`) |

Empfehlung: A2. Risiko: Körnung und Raster dürfen Zahlen nicht stören; die Tafel bleibt immer glatt und kontraststark. Entscheidung nach dem Spike anhand von Screenshots; für die Runde passt `/visual-iteration`, für Kontrast und Lesbarkeit `/ui-ux-pro-max`.

Eigene Assets: Objekte (Mixer, Waage, Namensschild, Fließband, Karteikarte, Siegel, Würfelband, Tafel) sind parametrische Komponenten, keine statischen SVG-Dateien. Nur so animieren sie, drehen mit der Kamera und folgen dem Theme.

### 6a. Anspruch: was „gutes Niveau“ konkret heißt

Referenzfigur Gradientenabstieg (l-grad-regression), als Messlatte für alle anderen:
- MSE-Fläche über (w, b) als schattierte Kachelfläche mit Höhenlinien, die zusätzlich auf den Boden projiziert sind.
- Am aktuellen Punkt der Gradientenpfeil in der Fläche und seine beiden Komponenten als Pfeile entlang der Achsen; auf der Tafel dieselben Zahlen aus dem Modell.
- Jeder Schritt hinterlässt eine Spur; die Lernrate ist ein Regler. Zu groß gewählt springt die Kugel sichtbar über das Tal und divergiert, zu klein kriecht sie. Beides kommt aus derselben Rechnung, nicht aus einer Choreografie.
- Kamera drehbar; Kamerafahrt an die Tafel für die Rechnung `w ← w − η·∂L/∂w`.
- Live-Anzeige: Verlust, Schrittzahl, Gradientenbetrag in echten Werten.

Abnahmekriterien für jede Figur:
1. Jede gezeigte Zahl kommt aus dem Modell, ein Node-Test prüft sie gegen den Solver.
2. Die Figur ist beim ersten Blick als Objekt oder Fläche lesbar und belohnt bei 2× Zoom mit echten Details (Fugen, Skalen, Halterungen), ohne leere Flächen.
3. Tiefenreihenfolge stimmt in jeder Kamerastellung der Beats und beim Drehen (Test über eine Reihe von Winkeln).
4. Bewegung: weich, kein Springen, keine abgeschnittenen Übergänge; Frame-Budget aus §5 eingehalten.
5. Lesbar und bedienbar bei 375 px, in hell und dunkel, mit Tastatur, mit Screenreader-Beschreibung pro Beat.

### 6b. Handy und Touch

- **Seite bleibt scrollbar.** Die Figur setzt `touch-action: pan-y`: senkrechtes Wischen scrollt die Seite, waagerechtes Ziehen dreht die Kamera um die Hochachse. Die Neigung steuert ein eigener Regler oder zwei Tasten, damit kein Gestenkonflikt entsteht.
- **Große Ziele.** Beat-Steuerung und Kamera-Tasten unter der Figur, mindestens 44 × 44 px.
- **Kamerafahrt auf schmalen Bildschirmen.** In der Frontalansicht füllt die Tafel die volle Breite; Tafeltext hat dann mindestens 14 px effektive Größe. Längere Inhalte (Matrix, Code) umbrechen nicht, sondern werden in Zeilen-Beats aufgeteilt.
- **Leistung.** Frame-Budget aus §5 mit CPU-Drosselung; Schleife pausiert, sobald die Figur aus dem Bild scrollt.
- **Prüfung.** Mobile-Emulation (kleines Android-Chromium, kleines iPhone-WebKit) wie in `tests/e2e/mobile-touch.spec.ts`, plus echter WebKit-Lauf mit `PLAYWRIGHT_ALL_BROWSERS=1`: Tippen auf Weiter, waagerechtes Ziehen dreht, senkrechtes Wischen scrollt, kein horizontaler Überlauf.

## 7. Szenenfamilien

Zwölf wiederverwendbare Familien decken alle Lektionen ab. Eine Familie ist Code; eine Lektion wählt sie über `.fig.json` und Parameter.

| Familie | Kern | Lektionen |
|---|---|---|
| F1 Trace-Stepper | Code auf der Tafel, Namensschilder und Objekte auf der Werkbank, Rahmen pro Aufruf, Schritt vor und zurück | python-state, control-flow, functions, code-reading, collections, testing-debugging |
| F2 Matrix- und Tensorbank | Zellgitter mit Achsen, Zeile-mal-Spalte-Sweep, Form-Vertrag als Steckverbindung, Broadcasting als Strecken, Tensorquader in 3D | matrices, numpy-shape-contracts, dl-tensors, tf-attention, tf-finetuning, dl-regularization (Maske) |
| F3 Vektorraum | Pfeile addieren, Spannfläche, Eigenrichtung, in 3D drehbar (Ebenen eines 3×3-Systems, Punktwolke für PCA) | systems, independence, ml-svm-pca |
| F4 Eliminations-Stepper | erweiterte Matrix, Zeile minus Vielfaches Eintrag für Eintrag, Pivot leuchtet, Stufenform entsteht | gauss, systems |
| F5 Pipeline | Stationen mit Ein- und Ausgabevertrag, Datensätze fließen, Grenzen und Fehlerpfade | files-errors, data-cleaning, ml-cv, tf-inference, genai-rag, genai-security, genai-prototype, capstone-runner, capstone-freeze |
| F6 Verteilung | Histogramm baut sich aus Punkten, Bin-Regler, Median und Quartile als Morph zum Boxplot, Seeds als Streuung | eda-distributions, ml-repro, ml-error-analysis |
| F7 Optimierungslandschaft | Verlustfläche in 3D, Gradientenpfeil, Abstiegsspur, Lernrate, Ridge-Zug, Lernkurven (Messlatte §6a) | grad-regression, ml-linear, dl-training, ml-regularization, dl-regularization (Early Stopping) |
| F8 Schwellen-Sortierer | Elemente auf einer Wahrscheinlichkeitsachse, Schwelle sortiert in Fächer, Konfusionsmatrix füllt sich | ml-logistic, ml-baseline, genai-eval, responsible-ai |
| F9 Baum und Abstimmung | Fläche teilt sich rekursiv, Gini-Balken, Stimmen der Bäume | ml-ensembles |
| F10 Graph | Knoten und Kanten, vorwärts Werte, rückwärts Gradienten, Commit-Graph, topologische Ordnung | dl-autograd, git, capstone-freeze |
| F11 Text und Token | Zeichenband, Chunk-Fenster, BPE-Verschmelzung | tf-tokenizer, genai-rag |
| F12 Waage | zwei Schalen, Operation auf beiden Seiten, Tüten auspacken | algebra, algebra-transformations |

Statisch statt animiert (Congruence: kein Vorgang über Zeit): learning, tf-papers, research-question, research-cards, capstone-acceptance, capstone-regression, capstone-repro, capstone-baseline. Sie bekommen eine gezeichnete, interaktiv aufklappbare Figur, aber keine Bewegung, außer an einer Stelle mit echtem Vorgang (Hash-Lawine bei einem geänderten Byte in capstone-baseline).

### 7a. Figuren als Aufgabentyp: Szenen-Aufgaben

Verändern und Konstruieren wirkt stärker als Ansehen und Antworten (§2). Eine Szene, deren Zustand ein reines Modell bestimmt, ist dafür fast schon ein Aufgabentyp. Arbeitstitel `scene-build`.

**Ablauf.** Ein Familiengenerator erzeugt wie heute pro Seed die Szenenparameter und das Ziel (gleiche Seed-Mechanik `familySubseed`, gleiche Schwierigkeitsprofile). Lernende bauen die Szene auf: Portionen einstellen, Zeilen kombinieren, Gewichte auf beide Waagschalen legen, Schichten verbinden. Die Antwort ist der Endzustand oder die Folge der Schritte. Der Grader spielt die Antwort durch dasselbe Modell und prüft sie gegen den Referenzlöser.

**Grading über Eigenschaften statt über Pfade.** Geprüft wird, ob das Ergebnis stimmt, nicht ob genau ein vorgegebener Weg gegangen wurde. Das bleibt deterministisch und autoritativ (Produktvertrag):
- Elimination: Jede Zeilenoperation muss erlaubt sein, am Ende muss Zeilenstufenform stehen und die Lösungsmenge gleich bleiben. Welche Zeile zuerst, ist frei.
- Waage: Jeder Schritt muss die Lösungsmenge erhalten, am Ende steht x allein.
- Mixer: Die Portionen müssen das Ziel treffen; ist das Ziel unerreichbar, muss „keine Lösung“ gewählt werden, bei unendlich vielen Lösungen zählt jede gültige.

**Feedback aus der Simulation.** Bei einer falschen Antwort zeigt die Szene, was die Antwort bewirkt: der Mixer verfehlt das Ziel um einen sichtbaren Differenzpfeil, die Waage kippt, der Tensor-Stecker passt nicht.

**Mehrere Stellen.** Eine Szene kann mehrere Eingaben verlangen. Der Grader meldet pro Stelle, was stimmt.

**Barrierefreiheit zuerst.** Die kanonische Eingabe ist ein Formular (Zahlenfelder, Auswahl der Zeilenoperation, Reihenfolge per Liste). Die Szene stellt diesen Formularzustand dar und lässt sich zusätzlich direkt bedienen, auch per Touch.

| Familie | Szenen-Aufgabe |
|---|---|
| F3, F4 | Mixer mit zwei oder drei Zutaten auf ein Ziel einstellen; Lösungsfall wählen; Elimination selbst durchführen |
| F12 | x auf der Waage freistellen, jeder Schritt wird auf Äquivalenz geprüft |
| F1 | Namensschilder und Werte nach jeder Zeile setzen |
| F2 | Gewichtsmatrix-Form wählen, damit die Schichtkette passt; Parameter zählen; maskierte Attention-Zellen ausfüllen |
| F7 | Lernrate wählen, damit der Abstieg in höchstens n Schritten konvergiert, ohne zu springen |
| F8 | Schwelle so setzen, dass Präzision mindestens p bei maximalem Recall gilt |
| F5, F10 | Stages topologisch ordnen; die Split-Grenze so setzen, dass kein Leakage entsteht |

Vor dem Bau zu klären: Format der strukturierten Antwort im Attempt-Datensatz und im JSON-Import (der Import-Fix aus 0.9.1 zeigt, dass der Validator neue Formen ablehnt), Eintrag im Golden-Korpus, Mastery-Regeln, Review-Routing für frische Seeds, Eintrag in `activityTypeLabels`, Titelregeln, Coverage-Matrix.

### 7b. Figuren als Lösungshilfe in Aufgaben

Noa: erlaubt, solange die Figur die Lösung nicht als Zahl enthält. Ziel ist Anknüpfung an die Lektion und Synthese beim Lösen.

- **Gleiches Objekt wie in der Lektion.** Die Hinweisfigur verwendet dieselbe Szene und dieselben Objekte wie die Lektionsfigur (derselbe Mixer, dieselbe Waage). Das ist die Anknüpfung.
- **Eigene Parameter, Zielgröße maskiert.** Die Figur zeigt den Vorgang mit den Zahlen der Aufgabe, aber die gefragte Größe erscheint als „?“: der zweite Pfeil endet ohne Längenangabe, die Tafel zeigt `x₂ = ?`, die Live-Anzeige blendet den Wert aus. Wenn der Vorgang die Antwort zwangsläufig ausrechnen würde, zeigt die Figur stattdessen ein Nachbarbeispiel mit anderen Zahlen und dieselbe Struktur.
- **Eine Hinweisstufe.** Die Figur ist eine Stufe im vorhandenen Hinweisstapel und zählt wie jeder Hinweis gegen `MASTERY_MAX_HINTS = 1`. „Lösung anzeigen“ bleibt davon getrennt.
- **Automatische Lecksperre.** Jede Szene mit Hinweismodus liefert `answerValues(state)`. Ein Test rendert die Hinweisfigur für jeden kuratierten Fall und mehrere Seeds und prüft, dass weder sichtbarer Text noch `aria`-Beschreibung den erwarteten Wert enthält, in allen üblichen Schreibweisen (Dezimalkomma und Punkt, auf 0 bis 3 Stellen gerundet, als Bruch). Der Test bricht den Build ab.
- **Geometrisches Leck.** Ein Punkt genau auf der Lösung an einer beschrifteten Skala verrät sie auch ohne Zahl. Hinweisfiguren zeigen deshalb an der Zielstelle keine ablesbare Skala; das prüft die Review-Checkliste, weil es sich nicht vollständig automatisieren lässt.

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
| l-linalg-systems | F3, F4 | Smoothie-Mixer, Portionen werden Pfeile, drei Lösungsfälle, 3×3 als drei Ebenen | Lösungsfall aus der Stufenform |
| l-linalg-gauss | F4 | Kassenzettel: Zeile 2 minus 2 mal Zeile 1, Eintrag für Eintrag | Faktor des nächsten Schritts |
| l-linalg-independence | F3 | Wegbeschreibungen, Parallelogramm kollabiert zur Linie, Determinante als Fläche | Ist die Determinante 0? |
| l-numpy-shape-contracts | F2 | Stecker und Reiseadapter: Broadcasting streckt sichtbar, `*` gegen `@` | Ergebnisform oder Fehler |
| l-data-cleaning | F5, F6 | Zutatenkontrolle: Löschen zielabhängiger Lücken verschiebt den Mittelwert | Verbleibende Zeilen |
| l-eda-distributions | F6 | Notenspiegel baut sich auf, Bin-Breite ändert die Form | Median oder Mittelwert größer? |
| l-grad-regression | F7 | Wanderer im Nebel auf der MSE-Fläche, Gradientenpfeil, Spur, Lernrate (Messlatte §6a) | Nächstes `w` |
| l-ml-baseline | F8 | Wettervorhersage: Mehrheits-Baseline bei 1 % Betrug, 99 % Accuracy, Recall 0 | Accuracy der Baseline |
| l-ml-linear | F7 | Residuen als Federn zwischen Punkt und Gerade, Ausreißer zieht | Wohin kippt die Gerade? |
| l-ml-logistic | F8 | Spamfilter: Mails auf der Wahrscheinlichkeitsachse, Schwelle sortiert in Ordner | Präzision bei Schwelle t |
| l-ml-cv | F5 | Fünf Übungsblätter rotieren, Leakage fließt sichtbar über die Split-Grenze | Fold-Größen bei n mod k |
| l-ml-error-analysis | F6 | Flacher Fluss: Querschnitt mit Tiefe pro Teilgruppe | Größte Lücke |
| l-ml-regularization | F7 | Gummibänder ziehen Koeffizienten zur Null, Lasso rastet auf 0 | Welcher Koeffizient fällt zuerst? |
| l-ml-ensembles | F9 | Bestimmungsschlüssel teilt die Fläche, Bäume stimmen ab | Gini nach dem Split |
| l-ml-svm-pca | F3 | Straße zwischen Dörfern, Punktwolke drehen bis der Schatten am breitesten ist, Pizzafilialen wandern zum Schwerpunkt | Zentren nach einer Iteration |
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
| l-genai-rag | F11, F5 | Karteikarten: Chunk-Fenster, Query findet Karten, top-k | Recall@k |
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
| S1 Spike | Eigenes Kit (Kamera, Körper, Tiefensortierung, Tafel-Ebene, Beats, Touch), Szene „Smoothie mischen“ (l-linalg-systems) in A1 und A2, Kamerafahrt zur Tafel, waagerechtes Drehen, Vorhersage, reduzierte Bewegung, Prüfharness | Noa wählt A1 oder A2 anhand der Screenshots; Modelltest, Stills Desktop und Handy, Touch-Test, axe grün, Budgets gemessen |
| S2 Engine | Blocktyp `figure`, Schema, Registry mit Lazy-Load, Übernahme von Viz-Checkpoints, Hinweismodus mit Lecksperre (§7b), ADR-0018, Autorenleitfaden-Abschnitt | Compile fail-closed bei unbekannter Szene, fehlerhaften Beats oder Lösungsleck; E2E grün |
| S3 Familien F3, F4 | Systeme, Gauß, Unabhängigkeit inkl. 3D-Ebenen; ersetzt `two-lines`, `solution-cases`, `column-picture`, `row-operation`, `span-2d`; erste Hinweisfiguren in diesen Modulen | jede Lektion mit Figur, Abnahmekriterien §6a, alte Checkpoints übernommen, Noas Review |
| S4 Aufgabentyp-Spike | `scene-build` mit Mixer (F3) und Waage (F12): Generator, Grader über Eigenschaften, Simulations-Feedback, Formular als kanonische Eingabe, Attempt- und Import-Format | Golden-Korpus erweitert, Import-Roundtrip-Test, E2E grün, Noas Review |
| S5 Familie F7 | Optimierungslandschaft nach der Messlatte §6a; ersetzt `mse-bowl` und `secant-tangent` | wie S3 |
| S6 Familien F1, F2 | Python und Tensoren | wie S3 |
| S7 Familien F5, F8 | Pipeline und Schwellen | wie S3 |
| S8 Rest | F6, F9 bis F12 und statische Figuren; weitere Szenen-Aufgaben pro Familie | alle 50 Lektionen abgedeckt |
| S9 optional | erstes argmin-Video mit ganglion aus einer vorhandenen Szene; JSXGraph entfernen, falls keine `.viz.json` mehr übrig ist | ein Video aus derselben Szene ohne Umbau |

Pro Session höchstens eine Familie bauen und abnehmen; das hält Reviews klein und die Stilregeln stabil. F3 und F4 kommen zuerst, weil dort die meisten JSXGraph-Ersetzungen und die ersten Szenen-Aufgaben liegen und die Spike-Szene dazugehört. F7 folgt früh, weil sie die Messlatte für das Niveau setzt.

## 10. Entscheidungen

Erledigt (16.10.): eigenes Kit; JSXGraph ersetzen, wo die Figur mehr erklärt; Szenen-Aufgaben; Figuren als Lösungshilfe ohne Lösungszahl; isometrisch; Handy und Touch Pflicht; hohes Niveau; ganglion-Videos willkommen.

Noch offen: A1 oder A2 (nach dem Spike, mit Screenshots).

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
