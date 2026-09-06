# CLI-Datenprüfer

Vervollständige `inspect_rows` in `src/checker.py`. Die Reihenfolge ist Teil des Vertrags:

1. Pflichtspalten prüfen und bei Fehlern abbrechen.
2. `age` als ganze Zahl prüfen.
3. Leere Werte mit CSV-Zeilennummer und Spaltenname melden.
4. Doppelte IDs ab dem zweiten Auftreten melden.

## Prüfen

Der Projekt-Runner verwendet ausschließlich:

```text
python -m pytest -q --disable-warnings --maxfail=1 tests
```

Er installiert keine Pakete und führt keine Shell-Strings aus. Wenn `pytest` in deiner gewählten Python-Umgebung fehlt, meldet der Report `tool-missing`. Die Einrichtung einer isolierten Python-Projektumgebung folgt in einem getrennten Paketgate.

Vom Plattformordner aus:

```text
python3 tools/learner_project_check.py \
  --project /absoluter/pfad/zum/projekt \
  --manifest /absoluter/pfad/zum/projekt/check-manifest.json \
  --output /absoluter/pfad/zum/projekt/report.json
```

Der Report ist ein lokaler Selbstlern-Nachweis. Er ist kein Zertifikat und beweist keine unveränderte Git-Historie.
