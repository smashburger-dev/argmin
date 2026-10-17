# Session S1 Figuren: Werkbank-Kit, Smoothie-Szene, vier Stile

Stand 17.10.2026, Branch `feature/figuren-s1` (auf `research/figuren`, lokal committet, nicht gepusht). Auftrag: `docs/handoff-figuren-s1.md`. Noa wollte statt zwei Stilvarianten vier und alles, was nicht von der Stilwahl abhängt.

## Ergebnis

- Die Figur „Smoothie mischen“ läuft in `l-linalg-systems` direkt nach dem Abschnitt „Das Bild dahinter“: sechs Beats (Zutaten, Hafer, Vorhersage, Beeren, Tafel, Geisterportion), Vorhersage mit dem vorhandenen Checkpoint-Grader, Kamerafahrt frontal an die Tafel, Drehen per Ziehen (Maus und Touch) und per Tasten, reduzierte Bewegung, Handy und Desktop, hell und dunkel.
- Vier Stile, die sich nur über Tokens und Malparameter unterscheiden: A1 Tonale Werkbank, A2 Zweifarbdruck, A3 Kupferstich, A4 Matte Keramik. Standard bis zu Noas Wahl: A2.
- Gate grün: 2230 Node-Tests, Typecheck, Coverage, 100 Chromium-E2E (dev), 93 Build-E2E, 49 echte WebKit- und Firefox-Läufe für Figur und Mobile.

## Kontaktbogen

`/Users/no8/.windsurf/worktrees/argmin/argmin-figuren/.figure-shots/kontaktbogen.html` (gitignored, Kopie unter `/tmp/figsheet4/`). Zeilen: Beat 1 Zutaten, Beat 4 Treffer, Beat 5 Tafel, Beat 6 Geisterportion; Spalten: A1 bis A4; je 1440 px und 375 px, hell und dunkel, bei 2×. Neu erzeugen: Dev-Server starten, dann `FIGURE_SHOTS=1 E2E_REUSE_SERVER=1 E2E_PORT=<port> npx playwright test tests/e2e/figures-shots.spec.ts --project=chromium`. Live ansehen: `npm run dev:next`, dann `#/figurenlabor?beat=4` (seit der A1-Entscheidung nur noch ein Stil).

## Messwerte

Frame-Skriptzeit (Build, Sortierung, Malen) bei vierfacher CPU-Drosselung, Chromium, Median, Dev-Server, Harness `tests/e2e/figures-perf.spec.ts`:

| Szenario | A1 | A2 | A3 | A4 |
|---|---|---|---|---|
| Beat abspielen, 1440 px | 6,9 ms | 6,5 ms | 6,6 ms | 6,4 ms |
| Ziehen (alle Flächen neu), 1440 px | 11,4 ms | 11,0 ms | 11,0 ms | 10,5 ms |
| Kamerafahrt zur Tafel, 1440 px | 12,2 ms | 12,0 ms | 12,2 ms | 10,7 ms |
| Ziehen, 375 px | 10,8 ms | 10,4 ms | 10,6 ms | 9,9 ms |

- Ziel war unter 4 ms. Erreicht ist das nicht: Beim Abspielen liegt die Figur 1,6-fach darüber, beim Ziehen und bei der Kamerafahrt 2,5- bis 3-fach. Ohne Drosselung sind das etwa 1,6 bis 3 ms pro Frame. Vor der Optimierung lagen alle Werte bei 44 bis 54 ms.
- Wohin die Zeit geht (Median, 1440 px, gedrosselt): beim Ziehen 6,3 bis 7,1 ms Malen (Attribute für 234 Flächen) und 4,1 bis 4,2 ms Sortierung (Überlappungstest mit Polygon-Clipping, damit die Tiefe in jedem Winkel stimmt); bei der Kamerafahrt 7 bis 8,4 ms Malen und etwa 3 ms Sortierung. Pose und Szenenaufbau liegen unter 0,6 ms.
- Gemessene Bildfolge beim Ziehen unter Drosselung: Median 26 bis 50 ms pro Frame, also 20 bis 38 Bilder pro Sekunde auf einem viermal langsameren Gerät. Der Stil macht höchstens 10 % Unterschied; A2 und A3 erzeugen beim Ziehen etwas mehr lange Frames (Musterfüllungen beim Rastern).
- Unsicherheit: gemessen auf dem Dev-Server (nicht minifiziert) und auf dem M1 Pro mit simulierter Drosselung, nicht auf einem echten Mittelklasse-Handy.

Chunk-Größen im Release-Build (gzip): Laufzeit mit Kit und allen vier Stilen 12,6 kB (Ziel 10 kB), Szene Smoothie 9,4 kB (Ziel 12 kB), CSS der Figur 1,1 kB. Im Initial-Bundle steht nur die Szenen-Registry (ein Eintrag). Nach der Stilwahl fallen drei Stile weg; die Laufzeit dürfte dann unter 10 kB liegen (nicht gemessen).

## Entscheidungen dieser Session (mit Grund)

- **Formeln als SVG-Text statt KaTeX in `foreignObject`.** Spike unter `/tmp/fig-katex-spike/`: Chromium korrekt, WebKit löst den KaTeX-Inhalt aus dem `foreignObject` und ignoriert die Transformation (WebKit-Bug 23113). Die Tafel setzt Formeln als Textläufe in den KaTeX-Schriften.
- **Reine Schicht unter `assets/js/figures/`** statt `src/figures/kit/`: `compile_content` und Node-Tests importieren dieselben Module, so prüft der Compiler die `.fig.json` gegen das echte Modell.
- **Sechs statt fünf Beats**, weil ein Beat höchstens 4 s dauert: Die Kamerafahrt zur Tafel ist ein eigener Beat, die Rückfahrt beginnt die Geisterportion.
- **Malliste mit Überlappungstest statt reiner Schwerpunkt-Sortierung.** Die einfache Sortierung malte die Vorderwand der Haferkiste vor dem Inhalt. Renderer und Prüfung nutzen dieselbe Liste; der Node-Test prüft 0 Fehler über alle Beats, Azimut 0° bis 355° in 5°-Schritten und drei Elevationen.
- **Requisiten gestrichen.** Der erste Entwurf hatte Orange, Apfel, Kelle und Honigglas auf der Bank. Detail kommt jetzt aus Teilen des Mechanismus (Schubladen mit Griffen, Portionsmarken am Glas, Display am Mixer, Kreideablage).

## Was zusätzlich entstand (unabhängig von der Stilwahl)

- `docs/figuren-familienplan.md`: Plan für F1 bis F12 und die statischen Figuren: Szenen je Lektion, welche `.viz.json` sie ersetzen und welcher Checkpoint übernommen wird, Modell und Löser, Kit-Bausteine K1 bis K12, Hinweismodus je Aufgabenfamilie, Szenen-Aufgaben mit Grader über Eigenschaften, Stilrisiko je Familie.
- `docs/adr/0018-figuren-werkbank.md` (Entwurf), `docs/authoring-guide.md` §10 Figuren, Kartenzeile in `AGENTS.md`.
- Hinweismodus der Smoothie-Szene mit Lecksperre (Node-Test über vier Parametersätze). Eingebaut in den Hinweisstapel der Aufgaben ist er noch nicht (Session 2 oder 3, siehe unten).
- `evaluate(model, portionen)` als späterer Grader der Szenen-Aufgabe `mix-to-target`.
- Nebenbei behoben: `.mobile-more` lief in echtem WebKit bei 320 px über (fehlendes `flex-wrap` in `next.css`); breite Lektionsabschnitte bekommen nur dann einen Tab-Stopp, wenn sie wirklich horizontal scrollen (axe `scrollable-region-focusable`).

## Bekannte Schwächen

- Frame-Budget (siehe Messwerte).
- In der Iso-Ansicht auf 375 px ist der Tafeltext zu klein zum Lesen; lesbar wird er im Tafel-Beat (geprüft: mindestens 14 px).
- Die Haferkiste ist nach der einen Portion leer; das ist modellgetreu, wirkt aber karg.
- A2 und A3 zeigen den Papierhintergrund der Bühne als leicht anderes Rechteck auf der Karte.
- Glas zeigt seine Facetten als feine Linien. Bei A1 und A4 liest sich das als Rippenglas, bei A3 als zusätzliche Schraffur.

## Offene Entscheidungen (Recherche §10) mit Empfehlung

1. **Stil.** Empfehlung: A3 Kupferstich. Es ist der eigenständigste Look, liest sich auf dem Handy und im Dunkelmodus am klarsten, und die Schraffur trägt Volumen ohne Grauverläufe. Risiko: Flächen mit vielen Kacheln (F7) können Moiré zeigen; dort würde ich die Schraffur den Höhenlinien folgen lassen (Familienplan F7). Sicherste Wahl, falls dir A3 zu verspielt ist: A1. A2 wirkt auf Bildschirmauflösung schnell körnig, A4 verliert ohne Linien Struktur im Dunkelmodus.
2. **Frame-Budget.** Empfehlung: Ziel für Session 2 als „unter 4 ms beim Abspielen, unter 8 ms beim Ziehen“ neu setzen und messen, oder für statische Teile die Malreihenfolge pro Winkelbereich vorberechnen und mit dem Orakel in 0,25°-Schritten absichern. Das zweite ist mehr Arbeit und erst nötig, wenn eine Szene mit deutlich mehr Flächen kommt (F7).
3. **Hinweismodus in Aufgaben.** Empfehlung: in Session 3 mit F3 und F4, weil dort die ersten Aufgabenfamilien mit passender Szene liegen; Session 2 baut nur die Schnittstelle (Hinweisstufe „Figur“ im Stapel, zählt gegen `MASTERY_MAX_HINTS = 1`).

## Vorschlag Session 2 (Engine und ADR-0018), angepasst an die Stilwahl

1. Gewählten Stil behalten, die drei anderen samt Mustern und Tokens entfernen, Laufzeit-Chunk neu messen.
2. ADR-0018 von „Entwurf“ auf „Angenommen“ setzen, Abschnitt „Stil“ ausfüllen.
3. Vertrag erweitern für die nächsten Familien: erzeugte Beats (F1), `explore`-Parameter mit Zahlenfeld (K11), Modus `task`.
4. Hinweisstufe „Figur“ im Aufgaben-Hinweisstapel, Lecksperre als Build-Gate über alle Szenen mit Hinweismodus.
5. Frame-Budget nach Empfehlung 2.
6. Danach Session 3 mit F3 und F4 nach `docs/figuren-familienplan.md`.

Für `/visual-iteration` an der Stilrunde und `/ui-ux-pro-max` für eine Barrierefreiheits-Review der Figur passt der Stand jetzt.

## Prüfbefehle

```bash
node tools/compile_content.mjs && node tools/validate_content.mjs
node --test tests/
npm run typecheck && npm run coverage:check
E2E_PORT=4391 npm run test:e2e -- --project=chromium
npm run test:e2e:build
FIGURE_PERF=1 E2E_REUSE_SERVER=1 E2E_PORT=4391 npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium
```
