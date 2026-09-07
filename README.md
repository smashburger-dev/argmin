# KI-Lernplattform

Eine deutschsprachige, kompetenzbasierte Lernplattform für KI, Data Science und Programmierpraxis.

## Sofort loslegen

[KI-Lernplattform öffnen](https://smashburger-dev.github.io/ki-lernplattform/)

Läuft komplett im Browser, kein Account, Fortschritt bleibt auf deinem Gerät.

## Was drin ist

- 46 Kompetenzen, 46 Lektionen und über 250 Aufgaben von Mathe über Lineare Algebra und ML bis Deep Learning, Transformer und GenAI
- Python im Browser via Pyodide und NumPy, dazu KaTeX und JSXGraph
- Generierte Aufgabenvarianten mit deterministischen Gradern; kein LLM bewertet deine Antworten
- Spaced Repetition und ein deterministischer Wochenplan
- Helles und dunkles Farbschema
- Offline-fähig und ohne CDN zur Laufzeit

## Lokal starten (für Entwickler)

Voraussetzung ist Node.js 22.

```bash
git clone https://github.com/smashburger-dev/ki-lernplattform.git
cd ki-lernplattform
npm ci
npm run dev:next
```

Öffne danach <http://127.0.0.1:4173/>. Nicht über `file://` öffnen: Module-Worker und Fetch brauchen einen Origin, und die TypeScript-Quellen laufen nur über Vite.

## Testen und Bauen

```bash
node --test tests/
npm run typecheck
npm run coverage:check
npm run test:e2e -- --project=chromium
npm run build:release
npm run test:e2e:build
node tools/compile_content.mjs && node tools/validate_content.mjs
node tools/validate_content.mjs --dir build-next
```

## Mitmachen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für lokale Einrichtung, Content-Autorenschaft und die Pflichtprüfungen vor einem Pull Request.

## Lizenz

Code: MIT ([LICENSE](LICENSE)). Inhalte: CC-BY-4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).
