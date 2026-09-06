# ADR-0007: JupyterLite-Aufschub mit vendorem Weg über Release-Archiv

Status: Aufgeschoben (bewusste Entscheidung, 2026-08-24). Datum: 2026-08-24.

## Entscheidung
JupyterLite wird im Woche-5-Pilot NICHT integriert. Der Pilot braucht laut Lastenheft keine vollständigen Notebooks (NumPy-Aufgabe läuft im Pyodide-Worker). `NotebookLauncher` bleibt als Modulschnittstelle im Inhaltsmodell reserviert.

## Integrationsweg für später (recherchiert, belegt)
- Aktuell v0.8.3 (2026-08-20), BSD-3-Clause; Pyodide-Kernel BSD-3.
- Es gibt einen Weg OHNE pip-Installation: Release-Archiv von GitHub Releases herunterladen, statisch serven (Doku: jupyterlite readthedocs → quickstart/standalone). Offline-Kernel-Konfiguration: `jupyter lite build --pyodide <tarball>` + `piplite_urls` (Doku: howto/configure/advanced/offline) — CLI braucht dann doch `pip install jupyterlite-core` + `jupyterlite-pyodide-kernel` → **Freigabe durch Noa erforderlich, liegt bislang nicht vor**.
- nbgrader funktioniert im Browser nicht (Design braucht Server-Dateisystem; jupyterlite#160 offen) → Grading von Notebooks bleibt außerhalb von JupyterLite; Labs werden über Artefakt-Checkliste + Rubric bewertet.

## Alternativen
- Eigene Notebook-UI (Zellen-Editor im Pyodide-Worker): kleinere Lösung für „längere Labs" — wiedervorgelegt, falls Notebooks vor der JupyterLite-Freigabe gebraucht werden.
- Server-Jupyter: ausgeschlossen (lokal statisch).

## Lizenz / Offline / Bundle / Wartung / Aufwand / Rückbau
BSD-3; offline möglich nach obigem Rezept; Bundle groß (~30+ MB inkl. Kernel-Lab-UI), nur beim Öffnen eines Labs laden; aktiv gepflegt; Aufwand hoch (ein bis zwei Sessions); Rückbau: Unterordner `vendor/jupyterlite/` + Launcher-Route entfernen.

## Ausschlussgründe (aktuell)
Kein Pilotbedarf; Installationsfreigabe fehlt; Signifikantes Bundle- und Wartungsrisiko ohne messbaren Lernvorteil in Woche 5.
