# Bei argmin mitmachen

Schön, dass du hier bist. Egal ob du einen Tippfehler gefunden hast, eine Erklärung verbessern möchtest oder eine ganze Lektion schreiben willst — jede Hilfe zählt, und du musst dafür kein Profi sein.

## Der einfachste Weg: sag uns, was dir auffällt

Etwas war unklar, falsch oder hat nicht funktioniert? [Öffne ein Issue](https://github.com/smashburger-dev/argmin/issues/new) und beschreib in ein, zwei Sätzen, was du gesehen hast und was du erwartet hättest. Ein Screenshot hilft oft. Mehr braucht es nicht.

## Lokal starten

Du brauchst [Node.js 22](https://nodejs.org/). Dann im Projektordner:

```bash
npm ci
npm run dev:next
```

Danach läuft argmin unter <http://127.0.0.1:4173/>. Änderungen an Inhalten oder Code siehst du nach einem Reload sofort.

## Inhalte schreiben oder verbessern

Alle Lerninhalte sind einfache Text- und JSON-Dateien im Ordner `content/`:

- Kompetenzen: `content/competencies/`
- Module: `content/modules/`
- Lektionen: `content/lessons/`
- Aufgabenfamilien: `content/families/`

Wie eine Lektion oder Aufgabe aufgebaut ist, erklärt der [Autoren-Leitfaden](docs/authoring-guide.md). Texte für Lernende schreiben wir auf Deutsch; Dateinamen, Identifier und Code-Kommentare sind Englisch.

## Ein paar Grundsätze, die argmin ausmachen

- **Antworten werden nachvollziehbar geprüft.** Jede Aufgabe hat eine deterministische Prüfung oder Referenzlösung. Ein Sprachmodell bewertet nie, ob etwas richtig ist.
- **Alles läuft lokal.** Bibliotheken liegen im Repo (`vendor/`), nichts wird zur Laufzeit aus dem Netz geladen. Der Fortschritt bleibt im Browser der Lernenden.
- **Klein und lesbar.** Lieber eine kleine, klare Änderung als ein großer Umbau.

## Bevor du einen Pull Request öffnest

Diese drei Befehle sollten ohne Fehler durchlaufen:

```bash
node --test tests/
npm run typecheck
node tools/compile_content.mjs && node tools/validate_content.mjs
```

Bitte pro Thema ein eigener Pull Request. Schreib kurz dazu, was du geändert hast und warum — das macht das Anschauen viel leichter. Wenn etwas unklar ist: einfach fragen, wir helfen gern weiter.
