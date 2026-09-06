# ADR-0003: Pyodide im Module-Web-Worker mit Host-seitigem Zeitlimit

Status: Angenommen (Spike bestanden 2026-08-24, Isolation gehärtet 2026-08-29). Datum: 2026-08-24.

## Entscheidung
`assets/js/runtime/pyodide_worker.mjs` (Module-Worker) + host-seitiger Runner (`PyodideRunner`): Lazy-Init erst beim Öffnen einer Codeaufgabe, gepinnte Version 314.0.5, Paket-Whitelist (numpy, sympy, mpmath), deterministisches Seeding, ein frischer Python-Namensraum pro Lauf, Lernenden-Code und Tests im selben lauflokalen Namensraum, strukturierte Ergebnisse, je 64 KiB stdout/stderr, validierte Workdir-Namen sowie Zeitlimit mit Terminate-und-Neustart. Restart, Worker-Crash und Timeout lösen alle laufenden Promises definiert auf.

## Getesteter Integrationsweg (Messwerte, 2026-08-24, lokal, Brave)
| Fall | Ergebnis |
|---|---|
| Init | bereit in 1,3 s (core 6,4 MB lokal) |
| korrekter Code + NumPy + Tests | ok, 2/2 Tests, 0,6 s |
| Syntaxfehler | `SyntaxError` sauber klassifiziert (39 ms) |
| Exception | `IndexError` sauber klassifiziert (4 ms) |
| Endlosschleife | Abbruch nach 3.000 ms, Worker terminiert+neugestartet |
| Nachlauf nach Neustart | folgender Lauf funktioniert (23 ms) |
| hohe Ausgabe (70.000 Zeichen, Abnahme 2026-08-29) | auf 64 KiB begrenzt, `stdoutTruncated=true`, Worker überlebt |
| SymPy-Äquivalenz | äquivalent=True, nicht-äquivalent=False (2,4 s) |

Fehler während des Spikes (behoben): relativer Import eine Ebene zu kurz; JS-Zeile im Python-Prelude. Pitfall übernommen: `Float(0.0)==0` ist in SymPy `False` → Grader parst Antworten mit `sympify` (exakt), nie über Python-Float-Literale.

## Alternativen
- Offizielles vorgebauchtes `pyodide.webworker`-Bundle: existiert nicht mehr (entfernt in Pyodide 0.27, Changelog); eigene Modul-Worker-Muster sind der dokumentierte Weg.
- Pyodide im Hauptthread: blockiert die UI — verworfen.
- Interrupt über SharedArrayBuffer: braucht COOP/COEP-Header; für lokale Single-User-Nutzung disproportional — Terminate/Restart ist pragmatisch und gemessen.

## Lizenz / Offline / Bundle
MPL-2.0; vollständig offline (`vendor/pyodide/` inkl. Wheels, Lockfile liegt daneben); core 6,4 MB + numpy ~2,9 MB (Wheel) + sympy ~4,2 MB + mpmath 0,4 MB nur on demand.

## Wartungszustand / Aufwand / Rückbau
Pyodide 314.0.5 (2026-08-17, Python 3.14.2). Aufwand gering (eine Datei + Runnerklasse). Rückbau: Datei löschen, `pyodide`-Adapter aus Registry entfernen; Rest der Plattform läuft weiter.

## Sicherheits-Dokumentation
Browser-Ausführung ist keine vertrauliche Prüfsandbox: „verdeckte" Tests sind nur didaktisch verborgen (Aufgaben-JSON liegt im Browser). Der Browser stellt kein Host-Dateisystem bereit; das virtuelle Aufgabenverzeichnis unter `/home/pydide/<workdir>` wird pro Lauf geleert, ist aber nur Organisation und keine zusätzliche Sicherheitsgrenze. Netzwerkzugriff aus Lernenden-Code über Browser-Fetches bleibt technisch möglich. Deshalb gelangen keine Secrets in Worker oder Aufgabeninhalt. Zeitlimit, Outputlimit und Worker-Neustart begrenzen Blockade und Ausgabe, nicht beliebige Speicherallokation.
