# ADR-0018: Eigene Figuren („Werkbank“) als isometrische SVG-Szenen

Status: Entwurf (Session S1, 17.10.2026). Offen bis Noas Stilwahl: Abschnitt „Stil“. Recherche: `docs/session-2026-10-16-figuren-recherche.md`, Plan pro Familie: `docs/figuren-familienplan.md`.

## Kontext

26 der 50 Lektionen haben keine Visualisierung, die 27 vorhandenen sind JSXGraph-Boards in 2D. JSXGraph zeichnet keine Objekte, keine Flächen im Raum und keine Schrittfolgen. Jede Lektion hat aber eine tragende Analogie („Das Bild dahinter“). Die Forschung spricht für lernergesteuerte Schritte statt Film, eine Vorhersage vor dem Aufdecken, genau einen hervorgehobenen Teil pro Schritt und Bewegung nur dort, wo sich etwas verändert (Recherche §2).

## Entscheidung

Ergänzung nach Noas S3-Review, 17.10.2026: Die Lektüre trägt die Erklärung, die Figur den sichtbaren Zusammenhang oder Vorgang. Darstellungsform, Interaktion und Kamera werden pro Beispiel gewählt. Sequenz, Vorhersage und Tafel-Zoom aus Smoothie sind keine allgemeinen Anforderungen. Die folgenden Beat-Exporte und Schrittknöpfe beschreiben den vorhandenen Ablauf-Vertrag, nicht die Pflichtform jeder künftigen Figur. Siehe `docs/figuren-lesson-and-stage.md` und den aktualisierten Skill.

1. **Eigenes Kit, keine neue Runtime.** Preact rendert SVG; Kamera, Körper, Tiefensortierung und Bewegung sind eigener Code. Kein Code aus dem anatomy-Skill, keine Animationsbibliothek, kein WebGL, keine CSS-Animationen oder Transitions in Szenen.
2. **Reine Schicht in `assets/js/figures/`, Darstellung in `src/figures/`.** Kamera (`kit/camera.mjs`), Körper (`kit/solids.mjs`), Tiefe (`kit/depth.mjs`), Bewegung (`kit/motion.mjs`) und jede Szene (`scenes/<name>.mjs`) sind reine ES-Module mit JSDoc, damit Node-Tests, `compile_content` und später der Grader einer Szenen-Aufgabe dieselben Funktionen aufrufen. Das folgt der Karte in `AGENTS.md` (reine Logik unter `assets/js`).
3. **Orthografische Kamera mit Azimut, Elevation, Zoom und Ziel.** Isometrisch und frontal sind dieselbe Kamera mit anderen Winkeln. Ebenen-Inhalt (Tafel, Etiketten) wird über eine exakte affine Matrix in die Welt gelegt, Text bleibt SVG-Text im DOM.
4. **Szenenvertrag.** Eine Szene exportiert `id`, `beatIds`, `validateParams`, `model`, `beatDuration`, `pose`, `build`, `cameraFor`, `readout`, `describe`, `answerValues`, `predictValue`, `displayNumbers` und, wo eine Szenen-Aufgabe folgt, `evaluate`. `pose(model, beat, t)` ist rein und stetig über Beat-Grenzen; `build` liefert für jede Pose dieselbe Item-Liste (stabile Topologie). Eine Szene schreibt keine eigene Render-Komponente.
5. **Einmal binden, dann Attribute.** Preact rendert die Items einmal; eine rAF-Schleife pro Figur schreibt danach nur geänderte Attribute über Refs und hängt Gruppen nur um, wenn sich die Malreihenfolge ändert. Die Schleife stoppt, wenn alles ruht oder die Figur außerhalb des Viewports ist.
6. **Eine Malliste für Renderer und Prüfung.** `paintList` legt die Reihenfolge fest, in der gemalt wird; `paintOrderErrors` prüft genau diese Liste auf Flächenebene, indem es den Sichtstrahl an Rasterpunkten mit den Flächenebenen schneidet. Der Node-Test läuft über alle Beat-Endzustände, Azimut 0° bis 355° in 5°-Schritten und drei Elevationen.
7. **Formeln als eigene SVG-Typografie.** KaTeX in `foreignObject` ist in WebKit nicht tragbar: Der Inhalt löst sich aus dem Objekt, Transformationen der Vorfahren werden ignoriert (Spike S1, Screenshots unter `/tmp/fig-katex-spike/`; WebKit-Bug 23113 seit 2009 offen). Die Tafel setzt Formeln als Textläufe mit Kursiv, Index und Exponent in den KaTeX-Schriften, die jede Lektion ohnehin lädt. KaTeX bleibt für Beschriftungen außerhalb der Szene.
8. **Inhalt fail-closed.** Blocktyp `figure` im Lesson-Schema, `.fig.json` nach `schemas/figure.schema.json`. `compile_content` bricht ab bei unbekannter Szene, ungültigen Parametern, Beat-IDs, die nicht exakt den Beats der Szene entsprechen, einer Vorhersage, deren erwarteter Wert nicht aus dem Modell folgt, und bei Zahlen in Beschriftungen, die das Modell nicht zeigt. Die Vorhersage nutzt den vorhandenen Checkpoint-Vertrag (`gradeVizCheckpoint`) und speichert nichts.
9. **Hinweismodus mit Lecksperre.** Jede Szene mit Hinweismodus liefert `answerValues`; ein Node-Test rendert alle Texte des Hinweismodus über mehrere Parametersätze und bricht ab, wenn ein Antwortwert in einer üblichen Schreibweise erscheint. Geometrische Lecks prüft die Review-Checkliste.
10. **Bedienung.** Höchstens vier Knöpfe in einer Reihe, auf Handy und Desktop gleich: Zurück, Weiter (auf dem letzten Beat „Von vorn“), Nochmal, Ansicht (öffnet Drehen, Neigen, Zurücksetzen als Alternative zum Ziehen, WCAG 2.5.7); Tastatur (Pfeile, Leertaste, Umschalt plus Pfeile zum Drehen, Pfeil hoch und runter zum Neigen, Pos1); waagerechtes Ziehen dreht mit Pointer-Capture, `touch-action: pan-y` lässt senkrechtes Wischen die Seite scrollen; alle Bedienelemente mindestens 44 × 44 px; jeder Beat höchstens 4 s, kein Autoplay; unter `prefers-reduced-motion` springt jeder Beat an sein Ende. Screenreader hören pro Beat einen Satz (`describe`), die laufende Anzeige ist für sie stumm.
11. **Stil nur über Tokens.** Der Stil steckt in CSS-Variablen und Malparametern, nie im Szenencode. Im Entwicklungsbuild zeigt `#/figurenlabor?beat=<n>` die Figur an einem Beat; das Labor fehlt im Release-Build.

## Stil

„Werkbank“ ist der Name des Kits, nicht eine Bühne für alle: Jede Familie baut eine eigene Welt (Landschaft, Fließband, Archiv, Stellwerk), siehe Bühnenkatalog im Skill. Entschieden von Noa am 17.10.2026: **A1 Tonale Werkbank** (vier Graustufen, ein violetter Akzent, 0,6 px Linien, weicher Halo). A3 Kupferstich gefiel, wirkt auf dem Handy aber zu unruhig. A2 und A4 sind entfernt. Verbindliche Stil- und Bauregeln: Skill `.devin/skills/werkbank-figuren/SKILL.md`.

## Alternativen

Siehe Recherche §4: JSXGraph (nur 2D), Motion, GSAP (Lizenz), Lottie (`eval`), Rive (WASM unter CSP), Motion Canvas (Canvas statt DOM), Manim (nur Video), D3 (Datenbindung, hier nicht nötig). WebGL erst, wenn eine Szene nachweislich mehr als etwa 600 Flächen braucht; davor Canvas 2D als Rückfall für Kachelflächen (F7).

## Konsequenzen

- Jede Szene ist ein eigener Lazy-Chunk, das Kit ein gemeinsamer; Ziele: Szene unter 12 kB gzip, Kit unter 10 kB gzip, Frame-Skriptzeit unter 4 ms bei vierfacher CPU-Drosselung. Gemessen in S1 (`docs/session-2026-10-17-figuren-s1.md`): Szene 9,4 kB, Laufzeit mit vier Stilen 12,6 kB, Frame-Skriptzeit 6,4 bis 7,2 ms beim Abspielen und 9,9 bis 12,3 ms beim Ziehen und bei der Kamerafahrt. Das Budget ist offen.
- Weil jeder Frame eine reine Funktion von Parametern, Beat, Zeit und Kamera ist, kann ganglion dieselbe Szene ohne Umbau als Video aufnehmen.
- JSXGraph bleibt, bis die letzte `.viz.json` ersetzt ist; Ersetzungen übernehmen den Checkpoint wörtlich.

## Prüfstrategie nach dem S3-Review, 17.10.2026

Noas aktuelle Regel ersetzt die automatische Testpflicht pro Szene oder neuem Asset: standardmäßig keine neuen figurspezifischen Tests und Snapshot-Sammlungen. Vorhandene Löser, Compiler und Messwerkzeuge verwenden, die entscheidenden Zustände selbst im Browser ansehen und Shrink Complexity anwenden. Neue dauerhafte Tests nur auf ausdrücklichen Auftrag. Bestehende Projekt- und Release-Gates bleiben am passenden Integrationspunkt; ihre Ausführung wird nicht nach jedem visuellen Eingriff wiederholt. Einzelheiten: docs/figuren-design-und-assets.md und Skill werkbank-figuren.
