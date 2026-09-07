# Sicherheit

argmin läuft komplett in deinem Browser: kein Server, kein Account, keine Übertragung deiner Daten. Trotzdem kann Software Fehler haben — danke, wenn du uns hilfst, sie zu finden.

## Ein Sicherheitsproblem melden

Bitte **kein öffentliches Issue** für Sicherheitslücken. Nutze stattdessen die vertrauliche Meldung auf GitHub:

**Security → [Report a vulnerability](https://github.com/smashburger-dev/argmin/security/advisories/new)**

Beschreib kurz, was du gefunden hast und wie man es nachstellt. Du bekommst innerhalb weniger Tage eine Antwort; behoben wird so schnell wie möglich, und du wirst — wenn du möchtest — im Fix genannt.

## Was zählt als Sicherheitsproblem?

- Ausführung fremden Codes außerhalb der Python-Sandbox (Pyodide-Worker)
- Einschleusen von Skripten über Lerninhalte (XSS)
- Zugriff auf oder Manipulation des lokal gespeicherten Fortschritts durch Dritte
- Probleme in mitgelieferten Bibliotheken unter `vendor/`

Tippfehler, inhaltliche Fehler und normale Bugs gehören in ein [Issue](https://github.com/smashburger-dev/argmin/issues/new/choose).

## Unterstützte Version

Es gibt nur eine Version: den aktuellen Stand auf `main`, der automatisch unter https://smashburger-dev.github.io/argmin/ veröffentlicht wird.
