# Foundations-Inventar

Stand: 2026-08-29. Der Milestone ersetzt keine feste Vier-Wochen-Pflicht. W1 bis W4 bleiben die Herkunftsprojektion.

| Kompetenz | Herkunft | Implementierter Foundations-Pfad | Offene Freigabe |
|---|---|---|---|
| `c-algebra-basics` | W1-reuse | eigene Lektion, W1-Diagnose, drei Seed-Familien, zwei neue Transferfamilien | Lektion didaktisch gegenlesen |
| `c-algebra` | W2–W4-expand | eigene Termumformungslektion mit Rechenweg und zwei neue deterministische Transferfamilien | Lektion didaktisch gegenlesen |
| `c-python-basics` | W1-reuse | eigene Zustandslektion, Code-Trace, Diagnose und Variablentausch | Lektion didaktisch gegenlesen |
| `c-python-reading` | W2–W4-expand | eigene Trace-Lektion sowie W1-, W5-, Kontrollfluss- und Collection-Predict-Aufgaben | längeren Schleifentrace mobil prüfen |
| `c-python-functions` | W1-reuse | eigene Vertragslektion, Pyodide-Funktion und Predict-Aufgabe | Lektion didaktisch gegenlesen |
| `c-python-control-flow` | W2–W4-expand | eigene Lektion, Code-Trace, Parsons und Projektvoraussetzung | verzögerten Review im neuen UI prüfen |
| `c-python-collections` | W2–W4-expand | eigene Lektion, Predict, Auswahlaufgabe und Projektstufe | verzögerten Review im neuen UI prüfen |
| `c-python-files-errors` | W2–W4-expand | eigene Lektion, Fehlergrenzen-Auswahl, Parsons und Projektstufe | reale pytest-Umgebung separat freigeben |
| `c-testing-debugging` | W2–W4-expand | eigene Lektion, zwei Aufgabenfamilien, Fehlerkarten und fixer Projekt-Runner | reale pytest-Umgebung separat freigeben |
| `c-git-basics` | W2–W4-expand | eigene Lektion, Auswahl, Workflow-Parsons und Projektauftrag | realen Branch-/Merge-Auftrag manuell abnehmen |
| `c-meta-learning` | W1-reuse | eigene Lernpraxis-Lektion, Fehlerjournal, Reflexion und Debug-Diagnose | Reflexionscopy didaktisch gegenlesen |

## Erfüllte technische Kriterien

- Elf deutsche Lektionen funktionieren ohne Pflichtlink nach außen.
- Die Lektionen führen neue Verfahren mit einem konkreten Rechenweg, Trace oder Arbeitsbeispiel ein, bevor sie zum offenen Abruf übergehen.
- Diagnose, Übung, Evidence und Lösungsanzeige sind getrennt.
- Jede Foundations-Kompetenz erreicht innerhalb des Milestones ihre deklarierte Mindestzahl verschiedener mastery-fähiger Definitionen.
- Zwölf neue Aufgaben bestehen den echten deterministischen Grader mit Sollantwort und Gegenbeispiel.
- Fünf Fehlerkarten liefern einen nächsten prüfbaren Schritt und geben unter Hilfestufe 6 keine Lösung aus.
- Das CLI-Projekt prüft Spalten, Typen, fehlende Werte und Duplikate. Die Referenzimplementierung besteht alle fünf ausgelieferten Testfunktionen.
- CodeMirror, Pyodide, Projekt-Report und Kernrouten bestehen die automatisierten Browsergates.

## Verbleibende Release-Gates

- Unabhängige didaktische Prüfung der neuen Lektionen und Aufgabenformulierungen.
- Reale pytest-Ausführung in einer separat freigegebenen isolierten Python-Umgebung.
- Manuelle Git-Projektabnahme mit Branch und Merge.
- Visuelle und Tastaturprüfung der längeren Lesson-, Parsons- und CodeMirror-Ansichten auf realen Geräten.
