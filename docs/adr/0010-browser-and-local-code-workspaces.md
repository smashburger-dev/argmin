# ADR-0010: Browser-Workspace und lokaler Projekt-Runner

Status: Angenommen. Datum: 2026-08-29.

## Kontext

Kleine Python-Aufgaben sollen ohne Installation funktionieren. Mehrdatei-Projekte, Git und echte Testläufe brauchen dagegen einen lokalen Ordner. Ein versteckter lokaler Daemon oder allgemeiner Shell-Zugriff würde den Nutzen des Local-first-Modells nicht rechtfertigen.

## Entscheidung

### Browser-Workspace

Der parallele Preact-Shell lädt CodeMirror und den Lab-Code nur auf `#/lab/*`. Der initiale Shell bleibt dadurch bei rund 34 KiB JavaScript gzip. Das aktuelle NumPy-Lab verwendet weiterhin den geprüften Pyodide-Grader.

Das Worker-Protokoll akzeptiert optional bis zu 50 Textdateien, höchstens 256 KiB je Datei und 1.000.000 Bytes insgesamt. Dateipfade sind relativ, eindeutig und frei von `.`- oder `..`-Segmenten. Der Entrypoint muss zu den übertragenen Dateien gehören.

Jeder Lauf erhält:

- einen frischen Python-Global-Namensraum;
- ein neu aufgebautes Arbeitsverzeichnis;
- zurückgesetzte benutzerdefinierte Einträge in `sys.modules` und `sys.path`;
- maximal 64 KiB stdout und stderr;
- einen Host-Timeout mit Worker-Neustart;
- ausschließlich `numpy`, `sympy` und `mpmath` aus der bestehenden Paket-Allowlist.

Pyodide ist eine Komfort- und Reproduzierbarkeitsgrenze, keine Sicherheits-Sandbox für feindlichen Code.

### Lokaler Projekt-Runner

`tools/learner_project_check.py` führt ausschließlich dieses Programm ohne Shell aus:

```text
python -m pytest -q --disable-warnings --maxfail=1 <testPaths>
```

`testPaths`, Pflichtdateien und Timeout kommen aus einem validierten Manifest. Relative Pfade mit Traversal werden abgelehnt. Der Prozess erhält nur eine kleine Environment-Allowlist. stdout und stderr werden auf jeweils 64 KiB begrenzt. Der Report wird atomar geschrieben.

Der Runner installiert nichts. Fehlt pytest in der gewählten Python-Umgebung, meldet er `tool-missing`. Auf dem aktuellen Entwicklungsrechner war pytest beim Architekturtest nicht vorhanden und wurde nicht nachinstalliert.

### Report-Import

`project_report.mjs` prüft Projekt-ID und -Version, das exakte Kommando, Statuskonsistenz, Pflichtdateien und festgeschriebene Testdatei-Hashes. Ein gültiger Report trägt trotzdem `integrity: self-reported` und `evidenceEligible: false`. Lokale JSON-Daten und Git-Historie sind kein manipulationssicheres Zertifikat.

## Konsequenzen

- Microtasks und einzelne Lab-Dateien laufen vollständig im Browser.
- Das Foundations-Projekt nutzt echte Dateien und pytest, ohne einen dauerhaften Dienst zu starten.
- Browser und lokaler Ordner bleiben bewusst getrennte Ausführungsmodi.
- Ein späterer Loopback-Companion braucht eine eigene Sicherheitsentscheidung mit `127.0.0.1`, zufälligem Sitzungstoken und fester Programm-Allowlist.
- CodeMirror liegt in einem Lazy-Chunk. Das Build-Gate begrenzt den initialen JavaScript-Entry auf 150 KiB gzip und jeden Lazy-Chunk auf 250 KiB gzip.
