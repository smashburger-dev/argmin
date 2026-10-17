# Figuren: Verfeinerungen und Parallelplan

**Aktueller gemeinsamer UI-Stand (weiteres S3-Review):** Workbench ist die Source of Truth für die Figurenhülle, einschließlich S2-Hinweise. Titel ohne Abb.-Präfix, keine sichtbaren generischen Bedienungshinweise, kein Drei-Punkte-/Kameramenü, Schrittstand einmal zwischen Zurück und Weiter, Frage erst am passenden Schritt im gemeinsamen Bereich. Flache Szenen ohne Orbit. Konkrete Zusammenführung mit S2s Hinweis-Modus: docs/figuren-s3/bedienung.md. Diese Regeln ersetzen ältere widersprechende Bedienungsvorgaben dieses Plans.


Aktuelle Prüfregel aus Noas S3-Review (17.10.2026): Keine neuen figurspezifischen Tests oder Snapshot-Sammlungen standardmäßig anlegen, auch nicht automatisch für neue Assets. Frühere entsprechende Pflichten dieses Plans sind aufgehoben. Vorhandene Löser, Compiler und Messwerkzeuge verwenden; Browser-Sichtung und Shrink Complexity bleiben. Neue dauerhafte Tests nur auf ausdrücklichen Auftrag. Siehe Skill workbench und docs/figuren-design-und-assets.md.


Stand 17.10.2026, Basis `feature/figuren-s1` bei `7770f79`. Ergänzt `docs/figuren-sessionplan.md` und den Skill `workbench`. Bei Widerspruch gilt: Skill, dann dieses Dokument, dann Sessionplan.

## Teil A: Verfeinerungen (Entscheidungen mit Standardwert)

### A1 Figurenarten statt einer Bauform

Jede `.fig.json` bekommt `kind`. Der Compiler prüft pro Art andere Pflichtfelder; die Laufzeit wählt Bedienung und Größe.

| kind | Zweck | Bedienung | Beispiel |
|---|---|---|---|
| `beats` | Ablauf in Schritten (Standard, wie Smoothie) | vier Knöpfe | Elimination, Gradientenschritt |
| `explore` | ein Parameter ist das Lernziel | Zahlenfeld plus Ziehen, keine Beats oder höchstens drei | Lernrate, Schwelle, Temperatur |
| `compare` | zwei Zustände nebeneinander, gleiche Kamera | ein Umschalter A/B, auf dem Handy untereinander | Ridge gegen Lasso, mit und ohne Maske |
| `static` | aufklappbare Figur ohne Vorgang | Teile antippen öffnet Karte | Beipackzettel, Bauakte |
| `inline` | Mikrofigur im Fließtext, ein Zustand, keine Knöpfe, höchstens 160 px hoch | keine | ein Pfeil, eine Zelle, ein Schild |
| `hint` | Hinweisfigur in Aufgaben (S2) | vier Knöpfe, keine Vorhersage | Mixer mit „?“ |
| `task` | Szenen-Aufgabe (S4) | Formular plus Szene | Mixer einstellen, Waage lösen |

Regel gegen Überladung: höchstens zwei `beats`- oder `explore`-Figuren pro Lektion, `inline` beliebig, aber nie zwei direkt hintereinander. Zuerst am Beispiel die passende Form wählen. Eine Sequenz oder Kamerafahrt ist keine Pflicht. Die Lektüre erklärt; die Figur zeigt den Vorgang. Maßgeblich ist die S3-Review-Entscheidung in `docs/figuren-lesson-and-stage.md` und im Skill.

### A2 Kamerasprache

- Fahrt, wenn der Blick denselben Gegenstand weiterverfolgt (zur Lesefläche, um ein Objekt herum). Schnitt, wenn ein Beat einen anderen Ort zeigt; ein Schnitt ist ein 150 ms Überblenden der Bühne, nie ein Springen der Geometrie.
- Höchstens eine Kamerabewegung pro Beat. Unter reduzierter Bewegung wird jede Fahrt zum Schnitt.
- Jede Welt hat ein Übersichts-Preset; Beats, die nichts Neues zeigen, bleiben dort.

### A3 Lernerfahrung in der Lektion

- **Platz im Text:** Die erste Figur steht direkt nach „Das Bild dahinter“. Weitere Figuren stehen am Ende des Abschnitts, den sie zeigen, nie mitten in einer Aufzählung.
- **Beschriftung:** ein Satz pro Beat, höchstens 140 Zeichen, damit sie auf dem Handy in drei Zeilen passt. Der Satz sagt, worauf man schauen soll, nicht was man sieht.
- **Vorhersage:** gezielt an einer prüfbaren Erkenntnis einsetzen, nicht pauschal pro Figur. Bei einem vorhandenen Checkpoint dessen Vertrag erhalten. Direkte Objektinteraktion oder ein statischer Vergleich brauchen kein zusätzliches Quiz.
- **Zustand:** Der zuletzt gesehene Beat pro Figur liegt in `sessionStorage` (nicht IndexedDB, kein Fortschrittsereignis). Zurück auf die Lektion zeigt diesen Beat im Endzustand.
- **Textalternative:** Unter jeder Figur ein eingeklapptes „Ablauf als Text“ mit allen `describe`-Sätzen als nummerierte Liste (WCAG 1.1.1, auch für Druck und langsame Geräte).
- **Druck:** `@media print` zeigt den Endzustand des letzten inhaltlichen Beats und die Textalternative, keine Knöpfe.
- **Erste Begegnung:** Die Zeile „Ziehen dreht …“ verschwindet, sobald einmal gezogen oder „Ansicht“ benutzt wurde (nur `sessionStorage`).

### A4 Robustheit und Zugänglichkeit

- **Adaptive Ruhe:** Liegen 30 Frames in Folge über 24 ms, schaltet die Figur für diese Sitzung in den Ruhemodus (Beats springen ans Ende, Kamera ohne Feder). Ein kleiner Hinweis „Vereinfachte Bewegung“ erscheint; Ziehen bleibt.
- **Forced Colors:** Unter `forced-colors: active` zeichnet die Figur Linien in `CanvasText`, Akzent in `Highlight`, Flächen ohne Füllung. Test mit `page.emulateMedia({ forcedColors: 'active' })`.
- **Zoom 200 %:** Karte und Knöpfe brechen nicht, die Bühne bleibt im Seitenverhältnis (Test bei 640 px Breite mit 2× Schrift).
- **Bildvergleich:** Jede Szene bekommt Screenshot-Referenzen (`toHaveScreenshot`, Chromium, Toleranz 0,2 %) ihrer inhaltlich verschiedenen Zustände, hell und dunkel, 1440 und 375 px. Bei Beats mindestens Anfang, zentraler Vorgang und Ende; ein Lese-Beat ist keine Pflicht. Die Pixel-Wächter bleiben zusätzlich. Referenzen werden nur mit bewusstem `--update-snapshots` und Begründung im Digest erneuert.

### A5 Bauen schneller und gleichförmiger

- `tools/new_figure_scene.mjs <id> --world <welt> --kind <kind>` erzeugt Szenenmodul, `.fig.json`, Node-Test, E2E-Abschnitt und Registry-Zeilen aus einer Vorlage. Wird in S2 gebaut; jede Familie startet damit.
- Teile-Bibliothek `assets/js/figures/objects/`: Lesefläche, Etikett, Pfeil, Zahlenfeld-Anzeige, Behälter. Neue Teile kommen mit eigenem Tiefen-Test.
- Familien-Review-Checkliste im Digest: Passt die Darstellungsform zum Beispiel? Zeigt sie eine Einsicht, die der vorhandene Text allein schwer vermittelt? Sind die relevanten Zustandsänderungen sichtbar? Bei Vorhersage: liegt sie an der Erkenntnis? Arbeitet die Analogie? Wird ihre Grenze in Szene oder Lektüre erkennbar? Ist jede Zahl aus dem Modell?

### A6 Noch offene Fragen an Noa (Standard gilt, bis Noa anders entscheidet)

1. Figuren für Lektionen, deren Text sich noch ändert: erst nach dem Content-Review der Lektion bauen (Standard), sonst wandern Zahlen auseinander.
2. Videos: erst S9; die Szenen bleiben dafür reine Funktionen.
3. Alte `.viz.json` löschen: erst nach Noas Freigabe pro Familie (Standard: ersetzte Dateien bleiben, die Lektion verweist nicht mehr darauf, eine Liste steht im Digest).

## Teil B: Parallelplan

### Zweige und Ports

- Integrationszweig: `feature/figuren` (wird einmal von `feature/figuren-s1` erzeugt). Jede Session zweigt davon ab und wird nur über die Integrator-Session dorthin zurückgeführt.
- Worktrees liegen neben `/Users/no8/.windsurf/worktrees/argmin/argmin-figuren` als `../argmin-figuren-<session>`. Ports: S2 4401, S3 4402, S4a 4403, S4b 4404, S5 4405, S6a 4406, S6b 4407, S7 4408, S8a 4409, S8b 4410, Integrator 4400.

### Besitz von Dateien

| Bereich | Besitzer | andere Sessions dürfen |
|---|---|---|
| `assets/js/figures/kit/*`, `src/figures/painter.ts`, `engine.ts`, `FigureRuntime.tsx`, `figures.css`, `schemas/figure*.json`, `tools/compile_content.mjs` (Figurenteil), `tools/new_figure_scene.mjs` | S2 (danach Integrator) | nichts ändern; neue Kit-Bausteine nur als neue Datei `kit/<baustein>.mjs` mit Test |
| `src/ui/ExerciseFrame.tsx`, Hinweiszählung, `content/figure-hints.json` | S2 | Einträge in `figure-hints.json` nur additiv, ab Welle 2 |
| Attempt-Format, Import, Golden-Korpus, `activityTypeLabels`, IndexedDB | S4a | nichts |
| `assets/js/figures/scenes/<eigene>.mjs`, `assets/js/figures/objects/<eigene>.mjs`, eigene `.fig.json`, eigene Lektions-JSON und Markdown-Splits, `tests/figures_<familie>*.test.mjs`, `tests/e2e/figures-<familie>.spec.ts` | die Familien-Session | nichts |
| Registry-Zeilen (`scenes/index.mjs`, `src/figures/registry.ts`), `tools/build_public.mjs`-Allowlist | jede Session, nur Zeilen hinzufügen, alphabetisch | Konflikte löst der Integrator |

### Wellen

- **Welle 1 (parallel):** S2 Engine und Hinweismodus; S3 F3 und F4 mit dem heutigen Vertrag (`kind: beats`); S4a Datenschicht der Szenen-Aufgaben ohne Figurencode.
- **Integrator 1:** S2, S3, S4a nach `feature/figuren` zusammenführen, volles Gate.
- **Welle 2 (parallel):** S4b F12 und Szenen-Aufgaben in der UI; S5 F7; S6a F1.
- **Integrator 2.**
- **Welle 3 (parallel):** S6b F2; S7 F5 und F8; S8a F6 und F9; S8b F10, F11 und statische Figuren.
- **Integrator 3**, danach S9 optional.

### Gemeinsamer Ablauf jeder Session

1. Worktree anlegen, `npm ci`, Basis-Gate laufen lassen und Ergebnis notieren.
2. Skill `workbench` laden, eigenen Abschnitt im Sessionplan, im Familienplan und hier lesen.
3. Nur eigene Dateien ändern (Tabelle oben). Braucht die Session etwas aus einem fremden Bereich, schreibt sie es als „Anfrage an S2/Integrator“ in den Digest und baut eine lokale Übergangslösung in einer eigenen Datei.
4. Kleine Commits auf dem eigenen Zweig, Nachrichten auf Deutsch, Präfix `figuren(<session>):`.
5. Ende: volles Gate, Kontaktbogen angesehen, Digest `docs/session-<datum>-figuren-<session>.md`, letzter Commit. Kein Push, kein Merge in `feature/figuren`.
