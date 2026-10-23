# Messnachweise für Figuren-Completion

Stand: Commit `7939152c63c37389b8cc4daa414de8431f495f68`, gemessen am `2026-10-23T19:37:23.999Z` mit Node `v26.12.1` und zlib `1.2.12`. Diese Datei trennt App-Codegröße von echter Figuren-Frame-Zeit. Drei serielle Performance-Läufe wurden nicht ausgeführt; die Nutzerfreigabe hält Größen- und Laufzeitbudgets offen und nicht blockierend. Das ist kein bestandener Performance-Gate.

## Gemessene App-Codegröße und gzip

Der Bericht in [size-evidence.json](size-evidence.json) misst `gzipSync(buffer)` mit Standardoptionen einzeln pro Datei. Die vollen Closures, Importkanten, SHA-256-Hashes und Build-Eingangshashes stehen dort.

| Bereich | Dateien | Rohbytes | gzip-Bytes |
| --- | ---: | ---: | ---: |
| HTML-Einstieg plus statische Imports | 3 | 602.020 | 134.590 |
| Dynamisch erreichbare Chunks | 320 | 4.494.352 | 1.401.360 |
| Vollständige JavaScript-Closure des Appshell-Einstiegs | 323 | 5.096.372 | 1.535.950 |
| `FigureRuntime`-Einstiegsdatei | 1 | 33.278 | 11.968 |
| Gemeinsames `figure-kit` | 1 | 17.017 | 6.903 |

Die `FigureRuntime`-Datei lag in der Welle-3-Messung bei 32.201 Rohbytes und 11.682 gzip-Bytes. Im aktuellen Build sind es 1.077 Rohbytes und 286 gzip-Bytes mehr. `FigureRuntime` und Appshell importieren einander. Die 323-Dateien-Closure misst daher die erreichbare App-Importstruktur, nicht eine eigenständige Runtime-Größe. Für die Einordnung einzelner Dateien sind die getrennten `FigureRuntime`- und `figure-kit`-Einträge maßgeblich.

CSS sowie WASM-, Daten-, Python- und Archivdateien werden separat gezählt. Laufzeitpayloads sind damit sichtbar, fließen aber nicht in den JavaScript-/CSS-Bytewert ein. Der Importparser verfolgt relative und öffentliche lokale `.js`-Imports mit literalem Pfad; externe, `data:`, `blob:` und zur Laufzeit zusammengesetzte URLs sind ausgeschlossen und im Bericht benannt. Diese Messung ist eine reproduzierbare Größenbilanz, kein Netzwerktrace.

Der Bericht weist außerdem 66.911 CSS-Rohbytes (13.969 gzip-Bytes) und 15.163.673 Bytes an WASM-/Daten-/Python-/Archivdateien (8.970.898 gzip-Bytes) separat aus.

Die Größenmessung behauptet keine Budgeteinhaltung oder Laufzeitabnahme.

## Drei serielle Performance-Läufe

Die drei seriellen Performance-Läufe wurden nicht ausgeführt. Der Nutzerbudget-Vorbehalt ist offen, nicht bestanden. Falls die Messung später beauftragt wird, denselben vorhandenen Playwright-Test dreimal nacheinander ausführen; zwischen Läufen keinen Build und keinen zweiten Browserprozess starten:

```bash
FIGURE_PERF=1 E2E_PORT=4400 npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium --workers=1
```

Jeder Lauf erhält ein eigenes unverändertes stdout/stderr-Log und einen Laufindex. Übernehmen nur die gemessenen 375- und 1440-Pixel-Ergebnisse. Die vorhandenen Assertions müssen in jedem Lauf mehr als zehn tatsächliche Arbeits-Ticks beobachten; Screenshots oder Frame-Timer allein gelten nicht als Nachweis. Berichtige den Commit-Hash, Browser/Version, Node-Version, Zeitstempel, Laufzeit und alle beiden Viewportwerte im finalen Ergebnis. Kein Mittelwert darf einen fehlgeschlagenen Lauf verbergen.

## UI-Abnahme

`node tools/figuren_completion_acceptance.mjs --go --mode=both` startet Source- und Release-Vorschau nacheinander auf dem reservierten Port 4400. Der Runner hält Screenshots für beide Viewports, beide Themes und beide Bewegungspräferenzen vor, übt die Legacy-Trace-Szenenziele über Tastatur und Touch aus und protokolliert die SVG-Trefferflächen. Der Family-Trace-Task wird mit der echten Registry-Instanz des servierten Builds einmal falsch und danach vollständig korrekt beantwortet. Screenshot-Kontaktbögen und Rohbilder liegen unter `docs/figuren-completion/ui-acceptance/`.

Die Teilmessung in [ui-acceptance/evidence.json](ui-acceptance/evidence.json) erfasste 117 Desktop-SVG-Ziele; fünf Ausgaben und zwei Rückgaben funktionierten. Die native Auswahl-Tastatursteuerung blieb bei `Home`/`ArrowDown` leer. Deshalb ist die vollständige Source-/Release-Matrix offen. Ebenso offen sind der exakte HEAD-11-Gate-Lauf und Noas Sichtprüfung des Kontaktbogens.
