# Reproduzierbarer Modellvergleich

Vervollständige `ridge_fit`, `compare` und `repro_check` in `src/compare.py`. Die übrigen Funktionen (`load_dataset`, `split_indices`, `mean_baseline`, `rmse`) sind Teil des Vertrags und bereits fertig.

## Der Reproduzierbarkeits-Vertrag dieses Projekts

1. **Fester Seed**: Alle Zufallsquellen kommen aus `np.random.default_rng(seed)` — Daten und Split aus demselben Seed, kein globaler Zufallszustand.
2. **Fixer Split**: `split_indices(n, seed)` leitet die Train-/Test-Indizes deterministisch aus dem Seed ab. Gleicher Seed, gleicher Split — verschiedene Seeds führen zu verschiedenen Splits.
3. **Metrik vorab**: Die Metrik ist RMSE auf dem Testteil. Verglichen werden Mittelwert-Baseline und Ridge (λ = 1, geschlossene Formel aus Woche 14) auf denselben Daten.
4. **Wiederholungslauf**: `repro_check(seed)` ist nur dann `True`, wenn zwei `compare`-Läufe mit demselben Seed exakt dasselbe Ergebnis-Dictionary liefern.
5. **Manifest**: `check-manifest.json` hält Testpfade und den Hash der Testdatei fest. Ergänze im README deine Umgebung (Python-/NumPy-Version).

## Prüfen

Der Projekt-Runner verwendet ausschließlich:

```text
python -m pytest -q --disable-warnings --maxfail=1 tests
```

Er installiert keine Pakete und führt keine Shell-Strings aus. Wenn `pytest` in deiner gewählten Python-Umgebung fehlt, meldet der Report `tool-missing`.

Vom Plattformordner aus:

```text
python3 tools/learner_project_check.py \
  --project /absoluter/pfad/zum/projekt \
  --manifest /absoluter/pfad/zum/projekt/check-manifest.json \
  --output /absoluter/pfad/zum/projekt/report.json
```

## Ehrliche Grenzen

Der Browser dieser Lernplattform hat kein pytest — dieser Bericht ist ein **lokaler Selbstlern-Nachweis**, kein Mastery-Beweis: Der Runner prüft die Testdatei per Hash, aber die Ausführung passiert in deiner Umgebung. Er ist kein Zertifikat und beweist keine unveränderte Git-Historie.
