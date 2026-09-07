# Zu argmin beitragen

## Lokal starten

Voraussetzung ist Node.js 22.

```bash
npm ci
npm run dev:next
```

Die Anwendung läuft unter <http://127.0.0.1:4173/>.

## Content

- Kompetenzen: `content/competencies/`
- Module: `content/modules/`
- Lektionen: `content/lessons/`
- Aufgabenfamilien: `content/families/`
- Autorenregeln: [`docs/authoring-guide.md`](docs/authoring-guide.md)

Lernenden-Text ist Deutsch, technische Identifier und Kommentare sind Englisch.

## Pflichtprüfungen vor einem Pull Request

```bash
node --test tests/
npm run typecheck
node tools/compile_content.mjs && node tools/validate_content.mjs
```

Grader sind deterministisch; ein LLM bewertet keine Antworten. Runtimes werden ausschließlich vendored eingebunden, nicht über ein CDN.

Bitte eröffne pro Thema einen eigenen Pull Request und beschreibe Änderungen sowie relevante Prüfergebnisse.
