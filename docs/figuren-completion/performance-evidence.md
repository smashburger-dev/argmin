# Messnachweise für Figuren-Completion

Dieses Blatt trennt Bild-/Interaktionsabnahme, App-Codegröße und echte Figuren-Frame-Zeit. Es enthält noch keine Messwerte. Die drei Performance-Läufe und der Browserlauf warten auf das Koordinator-GO.

## App-Code und gzip

Nach dem freigegebenen Release-Build misst `node tools/figuren_completion_size_evidence.mjs --go` die aus `build-next/index.html` erreichbare JavaScript-Importstruktur. Der Bericht steht in `docs/figuren-completion/size-evidence.json`. Für jede Datei wird `gzipSync(buffer)` aus genau der protokollierten Node/zlib-Version mit Standardoptionen separat berechnet; Roh- und gzip-Bytes werden pro Datei und als Summe ausgewiesen. Statische Imports, ihre Closure, dynamische Chunks und die vollständige Closure bleiben getrennt nachvollziehbar. Der Bericht enthält die Importkanten, SHA-256-Hashes und Build-Eingangshashes.

CSS sowie WASM-, Daten-, Python- und Archivdateien werden separat gezählt. Laufzeitpayloads sind damit sichtbar, fließen aber nicht in den JavaScript-/CSS-Bytewert ein. Der Importparser verfolgt relative und öffentliche lokale `.js`-Imports mit literalem Pfad; externe, `data:`, `blob:` und zur Laufzeit zusammengesetzte URLs sind ausgeschlossen und im Bericht benannt. Diese Messung ist eine reproduzierbare Größenbilanz, kein Netzwerktrace.

## Drei serielle Performance-Läufe

Nach dem GO dreimal nacheinander denselben vorhandenen Playwright-Performance-Test ausführen; zwischen Läufen keinen Build und keinen zweiten Browserprozess starten:

```bash
FIGURE_PERF=1 E2E_PORT=4400 npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium --workers=1
```

Jeder Lauf erhält ein eigenes unverändertes stdout/stderr-Log und einen Laufindex. Übernehmen nur die gemessenen 375- und 1440-Pixel-Ergebnisse. Die vorhandenen Assertions müssen in jedem Lauf mehr als zehn tatsächliche Arbeits-Ticks beobachten; Screenshots oder Frame-Timer allein gelten nicht als Nachweis. Berichtige den Commit-Hash, Browser/Version, Node-Version, Zeitstempel, Laufzeit und alle beiden Viewportwerte im finalen Ergebnis. Kein Mittelwert darf einen fehlgeschlagenen Lauf verbergen.

## UI-Abnahme

`node tools/figuren_completion_acceptance.mjs --go --mode=both` startet Source- und Release-Vorschau nacheinander auf dem reservierten Port 4400. Der Runner hält Screenshots für beide Viewports, beide Themes und beide Bewegungspräferenzen vor, übt die Legacy-Trace-Szenenziele über Tastatur und Touch aus und protokolliert die SVG-Trefferflächen. Der Family-Trace-Task wird mit der echten Registry-Instanz des servierten Builds einmal falsch und danach vollständig korrekt beantwortet. Screenshot-Kontaktbögen und Rohbilder liegen unter `docs/figuren-completion/ui-acceptance/`.

Die tatsächlichen Resultate gehören in `evidence.json` und `size-evidence.json`; vor der Ausführung keine Pass-Aussage oder Messzahl ergänzen.
