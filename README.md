# argmin

**KI verstehen, Schritt für Schritt — kostenlos, auf Deutsch, direkt im Browser.**

argmin ist eine offene Lernplattform für alle, die verstehen wollen, wie künstliche Intelligenz wirklich funktioniert: von den Mathe-Grundlagen über Lineare Algebra und Machine Learning bis zu Deep Learning, Transformern und GenAI. Kein Vorwissen nötig — du fängst dort an, wo du stehst.

## Einfach loslegen

**→ [argmin öffnen](https://smashburger-dev.github.io/argmin/)**

Das war's. Kein Account, keine Installation, keine Kosten. Dein Fortschritt bleibt in deinem Browser auf deinem Gerät — und du kannst ihn jederzeit als Datei sichern oder auf ein anderes Gerät mitnehmen.

## Was dich erwartet

- **46 Lektionen und über 250 Aufgaben** in kleinen, verständlichen Schritten — Mathe, Lineare Algebra, ML, Deep Learning, Transformer, GenAI
- **Python direkt im Browser.** Du schreibst und testest echten Code, ohne irgendetwas zu installieren
- **Üben, bis es sitzt.** Viele Aufgaben erzeugen immer neue Varianten, du kannst also so oft üben, wie du willst
- **Ehrliches Feedback.** Deine Antworten werden nachvollziehbar und deterministisch geprüft — keine KI, die rät, ob du richtig liegst
- **Ein Plan, der zu dir passt.** Wiederholungen zum richtigen Zeitpunkt und ein Wochenplan nach deinem Zeitbudget
- **Angenehm für die Augen.** Ruhiges Design, hell oder dunkel, funktioniert auch offline

## Mitmachen

argmin lebt davon, dass Menschen mitdenken. Du musst nicht programmieren können, um zu helfen:

- Dir ist ein Tippfehler, eine unklare Erklärung oder ein Fehler aufgefallen? [Öffne ein Issue](https://github.com/smashburger-dev/argmin/issues/new) — jede Rückmeldung hilft.
- Du möchtest eine Lektion oder Aufgabe verbessern oder schreiben? In [CONTRIBUTING.md](CONTRIBUTING.md) steht, wie das geht.
- Du willst am Code mitarbeiten? Willkommen — unten steht, wie du lokal startest.

## Lokal starten (für Entwickler:innen)

Du brauchst nur [Node.js 22](https://nodejs.org/). Dann:

```bash
git clone https://github.com/smashburger-dev/argmin.git
cd argmin
npm ci
npm run dev:next
```

Öffne anschließend <http://127.0.0.1:4173/> im Browser. (Bitte nicht als `file://` öffnen — die App braucht einen lokalen Server, den `npm run dev:next` für dich startet.)

## Wie das Projekt aufgebaut ist

| Ordner | Was drin ist |
| --- | --- |
| `content/` | Alle Lerninhalte: Kompetenzen, Module, Lektionen, Aufgabenfamilien |
| `src/` | Die Oberfläche (Preact) |
| `assets/js/` | Aufgabenlogik, Prüfung der Antworten, Lernplanung |
| `schemas/` | JSON-Schemas, die die Inhalte beschreiben |
| `tests/` | Automatische Tests (Node und Browser) |
| `tools/` | Skripte zum Kompilieren, Prüfen und Bauen |
| `vendor/` | Mitgelieferte Bibliotheken (Pyodide, KaTeX, JSXGraph …) |
| `docs/` | Architektur-Entscheidungen, Autoren-Leitfaden, Lizenzen |

## Prüfen und Bauen

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

## Lizenz

Der Code steht unter MIT ([LICENSE](LICENSE)), die Lerninhalte unter CC-BY-4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)). Du darfst also beides frei nutzen, teilen und weiterentwickeln.
