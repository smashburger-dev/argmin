# RAG-Capstone: reproduzierbare Pipeline von Scope-Freeze bis Demo

Dieses Projekt erweitert den GenAI-Prototyp (`p-rag-secure-prototype`) zu einer
fünfphasigen Capstone-Pipeline: Scope-Freeze (Scope-Freeze-Phase), Integration (Integrationsphase), feste
Evaluation mit defensivem Red-Team (Evaluationsphase), Reproduktion (Reproduktionsphase) und
Abschluss-Artefakte (Abschlussphase). Der GenAI-Prototyp-Kern liegt byte-identisch und per sha256
gepinnt als `src/w30_core.py` bei; er wird erweitert, nicht verändert.

## Setup

1. Projektordner lokal entpacken bzw. klonen.
2. Python 3.11 (gepinnt, siehe Konfiguration) installieren.
3. Phase für Phase laut `phases.json` arbeiten: erst `src/pipeline.py`, dann
   `src/metrics.py`, `src/cost.py`, `src/cards.py` und die Karten unter `cards/`.
4. Prüfen mit dem einen erlaubten Kommando:

```text
python -m pytest -q --disable-warnings --maxfail=1 tests
```

Der Projekt-Runner der Plattform führt exakt dieses Kommando aus, installiert
nichts und führt keine Shell-Strings aus. Fehlt pytest, meldet der Report
`tool-missing`.

## Abhängigkeiten

Nur die Python-Standardbibliothek (`json`, `hashlib`, `pathlib`, `re`,
`itertools`, `datetime`). Die Testdateien importieren pytest nicht — sie
bestehen aus reinen `assert`-Anweisungen und laufen deshalb auch direkt unter
`python3`. Versionen stehen gepinnt in `config/experiment.json`
(`pinned_versions`, keine Bereichs-Specs).

## Konfiguration

`config/experiment.json` ist eingefroren: Seeds, `k`, Injektionsregeln, Policy,
Schwellen, Capstone-Baseline, Token-Preise und die Pflichtüberschriften dieses
README. `check-manifest.json` pinnt `golden/`, `config/`, `tests/` und
`src/w30_core.py` per sha256; Lernenden-Dateien (`src/pipeline.py` & Co., Karten)
stehen dort mit `sha256: null` auf Anwesenheitsprüfung. `assert_frozen()`
in `src/pipeline.py` prüft die Pins bei jedem Lauf.

## Karten

Unter `cards/` liegen drei Karten mit Pflichtfeldern, die `src/cards.py`
strukturell prüft (Feld vorhanden, richtiger Typ, nicht leer): `data-card.json`
(Korpus und Subgruppen), `model-card.json` (Stub-Generator, kein LLM),
`system-card.json` (Komponenten, Sicherheitsregeln, Kostenmodell). Die
TODO-markierten Textfelder füllst du im Verlauf der Phasen mit ehrlichen
Angaben. Karteninhalte sind Work Evidence, kein Mastery-Beweis.

## Phasenplan

| Lektion | Phase | Testdatei | Kern |
|---|---|---|---|
| Scope-Freeze-Phase | w35-scope | `tests/test_w35_scope.py` | Manifest, Hashes, Stages, topo-sort |
| Integrationsphase | w36-integration | `tests/test_w36_pipeline.py` | `run()`, IO-Verträge, virtuelle Uhr |
| Evaluationsphase | w37-eval-redteam | `tests/test_w37_eval_redteam.py` | Subgruppen, Red-Team, Verdict |
| Reproduktionsphase | w38-repro | `tests/test_w38_repro.py` | Doppellauf-Digest, Overclaim-Scan |
| Abschlussphase | w39-artifacts | `tests/test_w39_artifacts.py` | Demo, Diagnose, Abnahmebericht |

## Limitations

Echte Grenzen dieses Projekts: Der Generator ist ein Stub über fünf
Fixtur-Dokumenten — kein Sprachmodell, kein Netzwerk, kein Zufall. Das
Retrieval misst Term-Überlappung (Wörter ab Länge vier), keine Semantik; zwei
der acht Golden-Set-Queries treffen deshalb bewusst nicht. Der
Injektions-Detektor ist ein Regelwerk für Phrasen und blockiert nur die
gelieferten Fixtures. Das Kostenmodell zählt Wörter als Token-Näherung mit
fiktiven Preisen. Alles läuft lokal, und der Runner-Report ist ein
Selbstlern-Nachweis (`integrity: self-reported`), kein Zertifikat.

## Bekannte Fehler

- `Bis wann läuft der Rabatt?` und `Kann ich etwas zurückgeben?` finden kein
  Dokument (lexikalische Lücke, Recall 0) — bewusst im Golden Set belassen und
  in der Regressionstabelle geführt.
- Query-seitige Angriffe schlagen zusätzlich auf das Dokument aus, weil die
  Angriffsphrasen im besten Dokument (Fixtur `DOCS[4]`) stehen; der Grund lautet
  dann `injektionsverdacht:query+dokument`.
- Wer `expected_results.json` oder `golden/` verändert, ohne das Manifest
  mitzuziehen, scheitert an `assert_frozen()` — so soll es sein.

Demo und Retrospektive zählen als Work Evidence; Mastery entsteht nur aus den
deterministisch geprüften Teiltests der Phasenpakete.
