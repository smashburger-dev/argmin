# ADR-0001: Statische Mehrdateien-App ohne Build-Pipeline als Plattformkern

Status: Angenommen (Spike 2026-08-24). Datum: 2026-08-24.

## Entscheidung
Die Lernplattform ist eine rein statische Anwendung (`ki-lernplattform/`): ES-Module-Browser-JS ohne Transpiler/Bundler, versionierte JSON-Inhalte, lokale Vendored-Runtimes. Betrieb ausschließlich über lokalen HTTP-Server (z. B. `python3 -m http.server 8765`), nie über `file://` (Module-Worker und CORS brauchen einen Origin).

## Alternativen
- **Single-File wie die bestehende `KI_Lernroadmap.html`**: preserved als Einstiegsansicht, skaliert nicht auf Worker/Vendoring.
- **SPA-Framework + Bundler (React/Vite)**: Verbesserung marginal, Wartungs- und Installationskosten real; verletzt „keine Installationen ohne Zustimmung" bei Erstsetup.
- **Server-LMS (Moodle/STACK/PrairieLearn)**: siehe ADR-0002 — ausgeschlossen.

## Getesteter Integrationsweg
Vier Spikes am 2026-08-24 über `http://localhost:8765`:
1. KaTeX 0.18.4 offline (Fonts lokal): **bestanden** — Formel rendert, `.katex-html` vorhanden.
2. JSXGraph 1.13.2 offline: **bestanden** — Board + Tastatur-Zahlenfelder, Version im Status.
3. Pyodide 314.0.5 im Module-Worker: **bestanden** — 7 Fälle inkl. Endlosschleifen-Abbruch (Details ADR-0003).
4. Numbas v10.0 generische Runtime, lokal gebaut: Offline-Ressourcenladung vollständig verifiziert (Serverlog); der Exam-START bleibt in den verfügbaren Testbrowsern hängend (MathJax.startup.promise löst nicht) — Details und Konsequenz in ADR-0002. Die damaligen Prototypen dienten nur der Integrationsprüfung.

## Lizenz
Alle Komponenten permissiv: MIT (KaTeX), MIT/LGPL dual — MIT gewählt (JSXGraph), MPL-2.0 (Pyodide), Apache-2.0 (Numbas), Apache-2.0 (MathJax 4). Details: `docs/dependency-matrix.md`.

## Offline-Fähigkeit
Vollständig: alle Runtimes unter `vendor/`, kein CDN zur Laufzeit (Rebuild der Numbas-Runtime mit `--mathjax-4-url ../mathjax4`, da der Default-Build MathJax von jsdelivr lädt). Ausnahme dokumentiert: keine.

## Bundle- und Ladeauswirkung
Initial lädt nur Shell + KaTeX (~1,3 MB). Numbas (~3 MB numbas.js + MathJax ~2 MB), JSXGraph (~1 MB), Pyodide (core 6,4 MB + Wheels on demand) nur bei Bedarf. Messwerte der Spikes: Pyodide-Init 1,3 s lokal; NumPy-Run 0,6 s nach Wheel-Load; SymPy-Run 2,4 s.

## Wartungszustand
Alle Komponenten aktiv ( Releases 2026: KaTeX 08/2026, JSXGraph 08/2026, Pyodide 08/2026, Numbas 06/2026).

## Integrationsaufwand
Gering — kein Build-Step; Gefahr liegt in korrekten relativen Pfaden (drei Fehler im Spike gefunden und behoben: Worker-Import-Pfad, MathJax-Loader-Pfad, Resource-Pfade).

## Ausschlussgründe
Keine Transpiler/TypeScript (kleines Team, Direktlesbarkeit), kein Service Worker für PVP-Offline-Cache (HTTP-Server ist gesetzt; SW-Addition später prüfbar).

## Rückbauweg
`ki-lernplattform/` ist ein neues, isoliertes Verzeichnis. Löschen genügt; `KI_Lernroadmap.html` bleibt unangetastet. Kein Commit/Push erfolgt.
