# Figuren Welle 3 — gemeinsame Session S2b

## Stand und Übergabepunkt

Normaler Git-Worktree `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s2b`, Branch `feature/figuren-s2b`. Ausgangspunkt ist der abgeschlossene lokale Welle-2-Integrationscommit `1e017b749f0269ae738c967602225764b28f2688` auf `feature/figuren`; der Baum war beim Start sauber. Entwicklung, Browserprüfung und Leistungsläufe verwenden ausschließlich Port **4411**. Kein Push und kein Merge in `feature/figuren`.

API-Commit: **`49c88cb85f7fcfcb9b3b30b0f8363d366218ed20`**. Die Familien erhalten erst nach Integration einen konkret geprüften Integrationscommit als Basis. Der API-Commit bezeichnet den hier geprüften Stand, er ersetzt diese Integration nicht. Keine privaten Runtime-Forks und kein automatisches Nachziehen des Nachbarbranches.

Geändert sind ausschließlich gemeinsame Runtime-, Schema-, Compiler-, Generator- und UI-Dateien sowie diese Dokumentation. Exklusive Familienlektionen und Szenenmodelle, Aufgabenregistrierungen, Hint-Allowlist, IndexedDB-Schema und vendorte Runtimes bleiben unverändert. S4bs `stepContent`/`onRestart`, kanonische `scene-build`-Antworten und S6as zentrale Trace-Expansion bleiben erhalten.

## Gemeinsame Bedienung

Der verbindliche API- und Folgeauftragsvertrag steht in [contracts.md](figuren-s2b/contracts.md).

- **Explore:** Das vorhandene Zahlenfeld übernimmt per Enter oder „Übernehmen“ nur endliche Werte im Bereich und Schrittraster. Fehler erhalten Bild und Antwort. Ein gültiger Wechsel baut das Modell neu auf, setzt Schritt und Kamera zurück und trennt Vorhersageantworten samt Urteil nach vollständigem Parametersatz. Beim Wiederbesuch bleiben diese in derselben gemounteten Karte erhalten; sessionStorage restauriert validierte Eingaben und Beat. Neue Verbraucher liefern `explore.label`; das bestehende F7-`eta` heißt „Lernrate η“.
- **Compare:** `compare.labels` und `compare.beat` benennen zwei fachliche Varianten und deren gemeinsamen fertig aufgebauten Vergleichsschritt. Für bestehendes F7 gelten Ridge/Lasso und `step-1`. Beide Varianten öffnen den regularisierten Zustand bei gleicher Kamera und Skala. Druck verwendet die aktive Variante und restauriert anschließend den vorherigen Zustand. Der Compiler prüft beide Modelle und endliche, identische Kameras bei drei Bühnengrößen.
- **Auswahl:** Optionales reines `scene.selectionTargets(model, beatIndex)` liefert `{id,itemId,primKey?,label,description}`. Klick/Tippen und native Schaltflächen aktivieren dieselbe ID; Tab, Enter und Leertaste sind das Tastaturäquivalent. Umriss beziehungsweise unterstrichener fetter Text, `aria-pressed` und Statusrückmeldung tragen die Auswahl. Beat-, Modell- und Moduswechsel verwerfen sie, auch bei memoisierten Modellen/Ziellisten. Auswahl erzeugt keinen Attempt und ist in Hinweisen nicht verfügbar.

Neue technische Vertragsoptionen erscheinen nicht im Lernfluss. Readout und Eingaben haben 14 px statt der gemeldeten 13 px; ergänzende Bedienelemente mindestens 44 px. Die aktive A/B-Variante besitzt auch unter Forced Colors eine stärkere Umrandung. Das bestehende mobile Hinweis-Padding war durch `max-height:70svh` abgeschnitten; die Bühne steht nun im normalen Seitenfluss. Bei 375×812 bleiben in allen vier geöffneten Hinweiszuständen 13 px unter dem letzten Knopf sichtbar.

### Präzise Familienübergabe

**F7:** Die fachliche Gegenprobe bestätigt für λ=2 Ridge `[1, 0.5, -1/3]` und Lasso `[1, 0, 0]`; A/B-Schritt, Projektion und Kamera stimmen überein. Ein exklusiver Szenentitel bleibt ein Folgeauftrag: `rubber-band-coefficients.items` schreibt bei Phase 1 für beide Verfahren „Ridge → Lasso“. Der Besitzer muss diesen Titel aus `method` und Phase ableiten. Die gemeinsamen Beschriftungen und zugänglichen Beschreibungen geben bereits den aktiven Readout wieder. Keine vollständige Familienfreigabe für diesen noch falschen Innentitel.

**F1:** Sichtbare Bindungen und Objekte bekommen stabile IDs wie `binding:<frameId>:x` und `object:<normalizedId>`, eindeutige Item-/Primitiv-Adressen und rein zustandsbezogene Beschreibungen. Aliasnamen bleiben getrennte Ziele mit derselben Objektmarke. Rückgabe und Ausgabe bleiben getrennt.

**S6b/F2:** Nach Integration Metadaten an eigenen Szenen ergänzen, etwa `cell:weights:1:2` mit gesprochenem Zeilen-/Spaltenlabel und Zellwert. Ein Matrixblock ist zulässig, wenn einzelne Zellen keine brauchbaren 44-px-Ziele bieten. Sichtbarkeit und Eindeutigkeit gelten auch zwischen Endposen. Die Browser-Sichtung verwendet vorhandene F1-Szenen und eine vorhandene F4-Matrix mit temporären Adaptern; sie ist keine F2-Lektionsintegration. Die Adapter wurden vor dem Abschluss-Gate entfernt.

**Spuren und Aufgaben:** `python-trace/v1` konkretisiert Quellhash, begrenzte Eingaben, Frame-/Ereignisidentitäten, Aliasnormalisierung, Rückgaben, Ausgabe, Exceptions und den vollständigen CPython-Abgleich. `trace-hint-prefix/v1` verlangt eine positive Datenprojektion vor dem gesuchten Ereignis einschließlich Geometrie, Beschreibungen und nichtnumerischen Strukturantworten. Diese Verträge sind dokumentiert, noch nicht implementiert. Die sechs F1-Hinweise bleiben abgewiesen. Freie Spuren, permanente CPython-Prüfungen, `pick-learning-rate`, `tag-after-line`, Kurzschluss-, layer-chain- und Maskenaufgaben benötigen jeweils Noas konkreten Folgeauftrag mit Besitzer und versioniertem Antwort-/Gradervertrag. Keine vorsorgliche Registrierung.

Canvas bleibt offen: Für die veröffentlichte F7-Fläche mit 64 Kacheln fehlt ein belegter Bedarf für einen zweiten Renderer. Ein Auftrag müsste zusätzlich den vollständigen Lifecycle für DPR, Größe, Projektion, Kamera, Themes, Reduced Motion, Forced Colors, Druck, Observer/rAF und Viewport-Pause festlegen.

## Sichtung und fachliche Prüfung

[Browserbeobachtungen](figuren-s2b/review/review.json) enthalten 56 Zustände. Geöffnet und geprüft wurden helle und dunkle Kontaktbögen für 375 und 1440 px sowie die kritischen mobilen Einzelbilder: gültiges/ungültiges Zahlenfeld, beide Vergleiche, F1-Auswahl, Matrixauswahl und alle vier Hinweiszustände. Die Bilder sind Reviewmaterial, keine neuen automatischen Snapshot-Baselines. Noas visuelle Freigabe wird nicht vorweggenommen.

- [Mobil hell](figuren-s2b/review/contact-375-light.png), [mobil dunkel](figuren-s2b/review/contact-375-dark.png)
- [Desktop hell](figuren-s2b/review/contact-1440-light.png), [Desktop dunkel](figuren-s2b/review/contact-1440-dark.png)

[Interaktionsprotokoll](figuren-s2b/interaction.json) archiviert die A/B-Readouts vor/nach Druck und die restaurierten Beat-IDs, Erfolgsflags für Auswahl/Reset bei gecachten Zielen und identischer Modellreferenz, Reduced Motion im ruhenden Vergleich sowie Forced Colors mit 2-px-Aktivrand. Reale Touch-Ereignisse drehen horizontal von 32° auf 72,5° und scrollen vertikal um 131 px; Text außerhalb der Bühne bleibt auswählbar. Keine Browserfehler in der Sichtung.

Zusätzlich wurden mit temporären Browser-Treibern ungültige Eingaben, Antwort-/Urteilserhalt, getrennte Parameterzustände, Reload-Restauration sowie die einzelnen Klick-/Space-/Touch-Wege geprüft. Deren vollständige Aktionsfolge und Antwortwerte wurden nicht archiviert. Das ist ein Sichtungsbericht; `interaction.json` ist hierfür keine unabhängig wiederholbare Detailspur. Die ungültigen Bildzustände und Vergleichs-Readouts stehen im Bild-/Beobachtungspaket.

[Einmalige Gegenproben](figuren-s2b/probes.json): 22 gezielte Compiler-/Hinweisablehnungen, darunter ungültige Rastermitte, vertauschte/duplizierte Beats, ungültige Vergleichsmodelle, gleiche aber nicht endliche Kameras und unsichtbare/mehrdeutige Auswahlziele. Die vorhandenen Python/NumPy-Referenzlöser prüfen an 60 Lernraten × 13 gelieferten `(w,b)`-Zuständen = 780 Zuständen Gradienten und Verlust; maximale relative Abweichung 0. Dies rekonstruiert die Trajektorie nicht unabhängig. Ridge-/Lasso-Koeffizientenabweichung ebenfalls 0. Das Artefakt enthält nun alle Lernraten, Schrittindizes, 780 tatsächliche und Referenzwerte, Solverquelle/-hash/-Fundstelle, Python-/NumPy-Versionen und den ausgeführten einmaligen Vergleichskernel. Zwei temporär generierte Explore-/Compare-Verbraucher validieren mit explizitem `viewMode: flat` und ohne Testgerüste. Keine neue dauerhafte Testdatei oder CPython-Suite.

## Bestehendes Gate

Das Basis-Gate wurde einmal vor Änderungen ausgeführt. Danach gab es gezielte Prüfungen und abschließend das vollständige bestehende Gate am endgültigen Quellstand, jeweils auf 4411. [Basisprotokoll](figuren-s2b/gate-baseline.json), [Abschlussprotokoll](figuren-s2b/gate-final.json).

| Prüfung | Abschluss |
| --- | --- |
| `node tools/compile_content.mjs` und `node tools/validate_content.mjs` | bestanden |
| `node --test tests/` | 2240 bestanden, 0 fehlgeschlagen, 0 übersprungen |
| `npm run typecheck`, `npm run coverage:check` | bestanden |
| `npm run build:release`, öffentliche Inhalts-/Lizenz-/Leckprüfung | bestanden |
| `node tools/validate_content.mjs --dir build-next` | bestanden |
| `npm run test:project-runner` | 20 Fälle, 1 bestehender Skip, kein Fehler |
| `npm run test:e2e`, Chromium, 4 Worker | 96 bestanden, 26 bedingte Skips |
| `npm run test:e2e:build`, Chromium, 4 Worker | 95 bestanden, 27 bedingte Skips |

Die vorhandene Warnung zur fehlenden `vendor/pyodide/pyodide.mjs.map` bleibt bestehen. Das Baseline-Gate hatte 2235 bestandene Node-Fälle und 5 bedingte Skips vor dem Release-Build; Dev 97/25, Release 95/27. Die bedingten Browser-Skips werden nicht als bestandene Fälle gezählt. Das Gate-Artefakt enthält Ergebnisindex, Abschlussbefehle und API-Zuordnung. Die Quellhashes wurden anschließend archiviert und gegen den unveränderten Stand geprüft; ursprüngliche Wandzeitstempel wurden nicht gespeichert.

## Leistung und Größen

Das Median-von-drei-Entscheidungsmaß am endgültigen Quellstand liegt **12,44 % niedriger** als am funktionalen Stand direkt vor dem Optimierungsversuch. Die sechs Szenarien ergeben je endgültigem Lauf ungefähr 10,40 / 8,70 / 8,47 ms; der erste Lauf ist langsamer als der entsprechende Vorlauf. Der Medianbefund bedeutet keinen stabilen Gewinn in jeder Wiederholung. Gegenüber Welle 2 vor allen Änderungen bleibt das Maß **7,32 % höher** (8,8 statt 8,2 ms). Die neue gemeinsame Bedienung hat damit noch keinen durchgängigen Performancegewinn gegenüber der ursprünglichen Basis nachgewiesen.

Messaufbau: vorhandener opt-in `figures-perf.spec.ts`, Chromium, CPU-Drosselung 4×, ein Worker, Port 4411; keine parallelen Builds, Tests oder Browserarbeiten. Jede Tabellenzelle ist der Median dreier Laufmediane für Scriptzeit pro Frame. Entscheidungsmaß für einen Versuch ist das arithmetische Mittel der sechs Zellen, Mindestgewinn 5 %. Rohwerte, Paint-/Sortierzeiten und Quellhashes stehen in [performance.json](figuren-s2b/performance.json).

| Stand | 1440 Beat | 1440 Drag | 1440 Board | 375 Beat | 375 Drag | 375 Board |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Welle 2 vor Änderungen | 5,1 | 10,3 | 9,9 | 4,7 | 9,5 | 9,7 |
| Gemeinsame Bedienung vor Optimierungsversuch | 5,7 | 12,3 | 13,7 | 6,2 | 10,7 | 11,7 |
| Quantisierter Farb-Cache, verworfen | 6,3 | 12,2 | 11,3 | 6,3 | 11,8 | 13,1 |
| Begrenzter RGB-Cache, Versuch | 5,9 | 10,3 | 10,8 | 5,7 | 10,3 | 11,1 |
| Endgültiger Stand, drei Läufe | 5,2 | 10,8 | 11,8 | 5,4 | 10,1 | 9,5 |

Der erste Farb-Cache verschlechterte das Entscheidungsmaß um 1,16 % und wurde vollständig entfernt. Der isolierte begrenzte RGB-Parsing-Cache gewann im Versuch 10,28 % und bleibt erhalten. Zwölf ruhende Smoothie-Bilder (drei Schritte × zwei Größen × hell/dunkel) sind vor/nach dieser Änderung bytegleich; [Hashvergleich](figuren-s2b/pixel-equivalence.json). Das bestehende Tiefen-/Pixel-Gate ist bestanden. Das bevorzugte Beatziel unter 4 ms sowie Drag und Board unter 8 ms bleiben offen; das Mindestziel für Beats unter 6 ms ist am endgültigen Stand erfüllt. Ein relativer Versuchserfolg ist keine Budgeterfüllung. Die Versuche sind zusätzlich im gemeinsamen [Hill-Climb-Protokoll](figuren-perf-hillclimb.tsv) eingetragen.

Gzip-Größen des tatsächlichen Release-Builds, Bytes; JS und CSS getrennt:

| Artefakt | Welle 2 Node | S2b Node | Welle 2 Bun | S2b Bun |
| --- | ---: | ---: | ---: | ---: |
| FigureRuntime JS | 9991 | 11671 | 10027 | 11734 |
| Shared-Kit JS, identischer Hash | 5948 | 5948 | 5975 | 5975 |
| FigureRuntime CSS | 1370 | 1558 | 1376 | 1562 |
| Hauptchunk JS, einschließlich Antworterhalt | 119723 | 119812 | 120053 | 120132 |

Die Runtime bleibt über 10000 B gzip. Ihre neuen Komponenten werden statisch in diesen Chunk aufgenommen. Der bestehende Hauptchunk wächst separat um 89 B unter Native Node; Shared-Kit und Familien-Szenenchunks sind bytegleich. Die leicht veränderten Hint-/SceneBuildControls-Chunkgrößen stammen aus ihren geänderten Importnamen; alle Werte sind im Größenprotokoll einzeln genannt.

[sizes.json](figuren-s2b/sizes.json) weist Runtime, Shared-Kit, CSS, Szenenchunks und Hauptchunk einzeln mit Hashes aus. Die gemeldeten Welle-2-Werte 10027 B / 5975 B lassen sich mit Bun reproduzieren; Native Node komprimiert dieselben Bytes auf 9991 B / 5948 B. Dieser Kompressorunterschied ist kein Gewinn. Der Vergleich verwendet je dieselbe Laufzeit; keine Budgeterfüllung durch Verschieben in ungenannte Chunks. Das Runtime-Größenbudget ist weiterhin offen.

## Shrink Complexity und Review

Die neuen und veränderten Funktionen liegen unter dem Limit 10. Der Ganzdatei-Lauf meldet acht geerbte Überschreitungen: sieben bisherige Compilerfunktionen und den Callback in `buildBoard`. Der AST-Vergleich gegen den Basiscommit bestätigt, dass diese Funktionen exakt unverändert sind; [Lintausgabe](figuren-s2b/lint.log), [Basisvergleich](figuren-s2b/lint-baseline.json). Keine Suppressions und keine beiläufige Reparatur fremder Bereiche. `git diff --check` ist sauber.

Ein unabhängiges Read-only-Review durch den mit `gpt-5.6-sol` beauftragten Agenten prüfte Umsetzung und Evidenz. Seine Befunde zu Auswahlreset, vollständiger Raster-/Variantenvalidierung, endlichen Kameras, Beat-Reihenfolge, memoisierten Modellreferenzen und deutscher Rasterfehlermeldung sind behoben. Das Abschlussreview fand keine Quellcode-Blocker; seine Evidenzbefunde führten zu den obigen Interaktionsgrenzen, vollständigen Referenz-Rohdaten, präziser Medianformulierung und ergänzter Gate-/Log-Zuordnung. Der append-only Entscheidungsnachweis liegt lokal unter `/tmp/figuren-s2b-decisions.tsv`; er ist kein zusätzliches Produktartefakt. Zwei frühe Zeilen enthalten nur das richtige Datum mit Platzhalterzeit; eine spätere Klarstellung im Log kennzeichnet dies. Eine abschließende Korrekturzeile ersetzt die alten Zwischenstände und löst die verkürzten Evidenzpfade auf.

Noch offen bleiben die oben genannten Familienanpassungen, versionierten Aufgaben-/Trace-Hinweisverträge und Größen-/Framebudgets. Die Familie darf die neue Bedienung erst nach geprüfter gemeinsamer Integration übernehmen.
