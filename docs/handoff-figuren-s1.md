# Handoff: Figuren, Session 1 (eigenes Kit, Stil-Spike, Laufzeit)

Für die nächste Session in `/Users/no8/Desktop/life/Lifemaxxing/argmin` (oder einem frischen Worktree ab `origin/main`). Erst lesen: `docs/session-2026-10-16-figuren-recherche.md`. Dort stehen Evidenz, Technikvergleich, Architektur, Szenenfamilien und die Abdeckung aller 50 Lektionen. Diese Datei sagt nur, was Session 1 tut.

## Start

```bash
git fetch origin && git worktree add -b feature/figuren-s1 ../argmin-figuren-s1 origin/main
cd ../argmin-figuren-s1 && npm ci
```

Lies außerdem: `src/ui/VisualizationBlock.tsx`, `src/ui/LessonView.tsx` (wie Blöcke gerendert werden), `schemas/lesson.schema.json`, `schemas/visualization.schema.json`, `assets/js/core/viz_checkpoint_grader.mjs`, `src/styles/next.css` (Tokens), `content/lessons/linear-algebra/systems.md`, `systems.json`, `two-lines.viz.json` und `solution-cases.viz.json` (Zielszene und ihre Vorgänger), `docs/adr/0004-katex-jsxgraph.md`. Als Prinzipienquelle, nicht als Codequelle: `~/.claude/skills/anatomy/references/motion.md` und `craft.md` Abschnitte 1, 2, 4 und 5. Für A2 die Papier- und Tintenlogik in `/Users/no8/Desktop/life/Lifemaxxing/ganglion/examples/r8/tools/paper.mjs` ansehen.

Skills: `animate` beim Bauen der Bewegung, `shrink-complexity` für jeden Code. Für Noa vorschlagen, nicht selbst starten: `/visual-iteration` für die Stilrunde, `/ui-ux-pro-max` für die Barrierefreiheits-Review.

## Ziel von Session 1

Ein selbst gebautes isometrisches Kit und eine Szene, „Smoothie mischen“ für `l-linalg-systems`, laufen in der Lektion mit Beats, Vorhersage, Kamerafahrt zur Tafel, waagerechtem Drehen per Ziehen (auch per Touch) und reduzierter Bewegung, auf Desktop und Handy, in zwei Ästhetik-Varianten (A1 tonale Werkbank, A2 Zweifarbdruck auf argmin-Papier, Recherche §6). Danach entscheidet Noa zwischen A1 und A2.

Noas Entscheidungen vom 16.10. gelten (Recherche, Abschnitt „Entscheidungen von Noa“): Kit selbst bauen (kein Code aus anatomy kopieren), isometrisch, Handy und Touch Pflicht (§6b), hohes Niveau nach den Abnahmekriterien in §6a, Figuren ersetzen JSXGraph wo sinnvoller, Figuren erscheinen später als Lösungshilfe ohne Lösungszahl (§7b) und führen zu Szenen-Aufgaben (`scene-build`, §7a). Die Szene von Session 1 soll so gebaut sein, dass ihr Modell später unverändert als Grader einer Szenen-Aufgabe dienen kann (Eingabe Portionen, Ausgabe Treffer oder Differenzvektor) und `answerValues(state)` für den späteren Hinweismodus liefert.

Die Szene erzählt in fünf Beats:
1. Werkbank mit Mixer und zwei Zutatenbehältern, jede Zutat mit ihrem Nährwertvektor (2, 1) und (1, 2); daneben eine Tafel mit Koordinatenfeld.
2. Eine Portion Hafer: der Behälter gießt, auf der Tafel entsteht der erste Pfeil.
3. Vorhersage: „Wie viele Portionen Beeren brauchst du für (4, 5)?“ (erwartet 2).
4. Zwei Portionen Beeren: zweiter Pfeil wird angehängt, die Summe trifft b. Die Kamera fährt frontal an die Tafel, dort steht $x_1 a_1 + x_2 a_2 = b$ gerade und lesbar; danach fährt sie zurück.
5. Wo der Vergleich hinkt: Ziel (1, 3) verlangt $x_1 = -1/3$, also eine negative Portion Hafer; die Figur zeigt sie als Geisterportion.

Alle Zahlen kommen aus `model.ts` (lineares 2×2-System, gleiche Rechnung wie im Lektionstext).

## Umfang

1. `src/figures/kit/`, selbst gebaut: Kamera mit Azimut, Elevation und Skalierung (isometrisch bis frontal-orthografisch, Winkel animierbar), Projektion von Weltpunkten, Körper (Quader mit gerundeten Ecken, Zylinder, Platte) mit Schattierung nach Flächennormale, Tiefensortierung, Tafel-Ebene, in deren Koordinaten Text, Formeln, Pfeile und Gitter gezeichnet werden. Offene Technikfrage für diese Session: KaTeX per `foreignObject` mit Ebenen-Transform testen (Chrome und WebKit vergleichen); falls WebKit es falsch rendert, einfache Formeln als eigene SVG-Typografie setzen und KaTeX nur in der Frontalansicht zeigen. Dazu Token-Bindung für A1 und A2 (CSS-Variablen, hell und dunkel), `follow` und `settle` (zeitbasiert, dt geklemmt auf 1/30 s), Karte (Fig-Nummer, Titel, Hinweis, Live-Anzeige), Beat-Steuerung (Weiter, Zurück, Neustart, Pfeiltasten, Leertaste), IntersectionObserver-Stopp, `prefers-reduced-motion` springt an das Beat-Ende. Touch: `touch-action: pan-y` auf der Figur, waagerechtes Ziehen dreht die Kamera um die Hochachse (Pointer-Events mit Pointer-Capture, Zug folgt mit Ease), Neigung über Tasten; alle Bedienelemente mindestens 44 × 44 px.
2. `src/figures/scenes/smoothie/`: `model.ts` (rein, auch als späterer Grader nutzbar) und eine `view.tsx`; A1 und A2 unterscheiden sich nur über Token- und Schattierungsparameter des Kits, nicht über zwei Szenen. Für A2: Rasterstufen statt Grauverläufen über SVG-Muster, Papierkörnung als einmal erzeugte, deterministische Textur unter der Szene, nie über der Tafel.
3. `src/ui/FigureBlock.tsx` und ein minimaler Blocktyp `figure` im Lesson-Schema, `.fig.json` mit `scene`, `params`, `beats`, `predict` (Entwurf in Recherche §5). Vorhersage über `gradeVizCheckpoint`. Szene per dynamischem Import.
4. Ein Query-Parameter oder eine Testroute, die eine Stilvariante erzwingt, damit Screenshots von A1 und A2 entstehen. Nicht im Release sichtbar.
5. Prüfharness: Node-Test für `model.ts` (alle angezeigten Zahlen gegen die Rechnung); Playwright-Spec, die jeden Beat in hell und dunkel bei 1440 px und 375 px fotografiert, axe ohne serious/critical prüft, unter reduzierter Bewegung keine laufende Schleife nach dem Beat zulässt, Label-Überlappungen per DOM-Rechtecken meldet, die Tiefenreihenfolge über eine Reihe von Kamerawinkeln prüft und auf der Handy-Emulation (wie `tests/e2e/mobile-touch.spec.ts`) tippt, waagerecht zieht (Kamera dreht) und senkrecht wischt (Seite scrollt, Kamera bleibt). Frame-Skriptzeit bei vierfacher CPU-Drosselung messen (Ziel unter 4 ms). Einmal mit `PLAYWRIGHT_ALL_BROWSERS=1` gegen echtes WebKit laufen lassen, falls die Browser installiert sind.

Nicht in Session 1: weitere Szenen oder Familien, Ersetzen bestehender JSXGraph-Visualisierungen (die Smoothie-Figur kommt zusätzlich in die Lektion; Ersetzen ist Session 3), der Aufgabentyp `scene-build` (Session 4), Neigen per Geste und Pinch-Zoom (nur waagerechtes Drehen plus Tasten in Session 1), Hinweismodus in Aufgaben (Session 2), ganglion-Export, Code aus anatomy.

## Regeln

- Keine neue Runtime-Abhängigkeit. Keine CSS-Animationen oder Transitions in Szenen; jeder Frame ist eine reine Funktion von Parametern, Beat, t und Eingabe.
- Ein Beat dauert höchstens 4 s; kein Autoplay über mehrere Beats ohne sichtbare Pause (WCAG 2.2.2).
- Ein Akzent pro Beat, Farbe nie allein. Ziehgesten brauchen einen Tastaturweg.
- Beschriftungen auf Deutsch in `.fig.json`, Code und Kommentare auf Englisch.
- Funktionen höchstens Komplexität 10 (`bun lint -f agent --rule 'complexity: [error, 10]' <files>`).
- Szenen-Chunk und Kit getrennt messen (`npm run build:release`, Chunk-Größen gzip) und im Bericht nennen; Zielwerte in Recherche §5.

## Prüfung am Ende

```bash
node tools/compile_content.mjs && node tools/validate_content.mjs
node --test tests/
npm run typecheck && npm run coverage:check
E2E_PORT=4391 npm run test:e2e -- --project=chromium
npm run test:e2e:build
```

Dazu Screenshots von A1 und A2, jeweils Beat 1, 4 (Kamera an der Tafel) und 5, hell und dunkel, bei 1440 px und 375 px, selbst angesehen und bei 2× auf Kanten, Tiefenfehler und Lesbarkeit der Tafel geprüft. Erst dann Noa vorlegen.

## Übergabe an Noa am Ende von Session 1

- Kontaktbogen A1 gegen A2 mit Pfaden.
- Gemessene Chunk-Größen und Skriptzeit pro Frame.
- Die offenen Entscheidungen aus Recherche §10, mit Empfehlung.
- Vorschlag für Session 2 (Engine und ADR-0018), angepasst an die Stilwahl.
- Kein Commit, kein Push, kein PR ohne Noas Freigabe.
