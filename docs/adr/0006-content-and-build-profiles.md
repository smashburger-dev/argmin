# ADR-0006: Versionierte Inhalte, drei Lizenzklassen, zwei Build-Profile

Status: Angenommen 2026-08-24, public-first Katalog ergänzt 2026-08-29. Datum: 2026-08-24.

## Entscheidung
- Inhalte als versionierte JSON unter `content/` mit `schemaVersion` pro Datei; IDs stabil und global eindeutig; Verweise (`skillIds`, `sourceId`, `prerequisites`) werden vom Validator geprüft.
- Drei Klassen: `open` / `private` / `generated` (Definitionen und Quellenzuordnung: `docs/license-register.md`).
- Zwei Build-Profile: `local-private` (Public-Kern plus explizites externes Overlay) und `public` (`tools/build_public.mjs` erzeugt `build-public/`). Private Inhalte, Rohtexte und geschützte PDF-Ableitungen werden ausgeschlossen; `tools/validate_content.mjs --dir build-public` prüft Pfade, Marker, Bundle, Dateimenge und Hashes.

## Nachtrag 2026-08-29

- `content/catalog.json` ist der public-first Einstieg in Kompetenzen, Tracks, Milestones und künftige Lektionen. Die alten Wochen- und Aufgabendateien stehen nur noch unter `legacy`.
- Elf Verträge unter `schemas/` verwenden JSON Schema 2020-12. Querdatei-Referenzen, DAG-Zyklen, Generatoren, Werkzeuge, Reviews und Rechteprofile prüft `tools/compile_content.mjs`.
- `public` erzeugt ein reproduzierbares `content/content-bundle.json` mit derzeit 46 Kompetenzen, 16 Lektionen, einem Projekt und 51 öffentlichen Aufgaben. `local-private` behält zusätzlich das lokale Legacy-Prüfungsartefakt und akzeptiert nur ein explizites externes Overlay.
- Der Legacy-Public-Pfad entfernt private Quellenobjekte und Unit-Referenzen, neutralisiert autoreninterne Quellenlinien und baut den Suchindex aus den gefilterten Daten neu.
- `content/source-rights.json` hält maschinenlesbare Rechte für neue Kerninhalte. Das alte `content/sources.json` bleibt während der Migration nur für die bisherige Oberfläche bestehen.
- `*.local.json` ist im Public-Build unabhängig vom Inhalt verboten. Overlay-Kollisionen, unbekannte Voraussetzungen und Zyklen lassen den Compiler fehlschlagen.

## Alternativen
- Ein Inhaltsbaum ohne Klassen: Verstöße gegen MML-/Murphy-Nutzungsrechte wären wahrscheinlich — ausgeschlossen.
- YAML-Inhalte: ohne Build-Schritt im Browser nicht direkt lesbar — JSON bleibt Kanon; YAML nur als Authoring-Format denkbar (nicht umgesetzt).

## Getesteter Integrationsweg
Public-Build-Test im Pilot: `node tools/build_public.mjs && node tools/validate_content.mjs --dir build-public` muss 0 private Funde melden; gezielter Negativtest injiziert einen privaten Block in den Quellbaum und erwartet einen Fund.

## Lizenz / Offline / Bundle
Inhaltscode eigenständig; öffentliche generierte Inhalte standardmäßig CC BY 4.0 mit Quellenlinie; vollständig offline; JSON in kB-Größe.

## Wartungszustand / Aufwand / Rückbau
Aufwand mittel (Validator ist die Hauptarbeit). Rückbau: Build-Profile fallen lassen, private Baum bleibt allein.

## Konkret ausgeschlossen bzw. nur verlinkt (Belege in license-register.md)
MML-Buch („personal use only"), Murphy, math-deep/integration-methods (unklar), OMB+, openHPI, linalg.ch (keine offene Lizenz), DAIR-README (keine Lizenz), deeplearningwithpython.io-Text (frei lesbar, keine Textlizenz), Overleaf-Zusatzaufgaben (nicht öffentlich erreichbar, HTTP 403). Übernehmbar mit Attribution: MIT-OCW-abgeleitete Notizen (CC BY-NC-SA 4.0), Serlo (CC BY-SA 4.0, Einzelcheck), Mathe für Nicht-Freaks (CC BY-SA 4.0), de Vries (CC BY 4.0).
