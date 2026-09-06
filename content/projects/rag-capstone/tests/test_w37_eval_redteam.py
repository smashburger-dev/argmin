"""Phase w37-eval-redteam: Golden-Set-Unveraenderlichkeit, Subgruppenmetriken,
Retrieval- vs. Antwortfehler, defensives Red-Team gegen den eigenen
Toy-Prototyp, Regressionstabelle und Regelwerk-Verdict.

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
(reine asserts, kein pytest-Import noetig).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import pipeline
from src import w30_core

PROJEKT = Path(__file__).resolve().parents[1]
CONFIG = pipeline.load_json("config/experiment.json")
ERGEBNIS = pipeline.run()


def test_golden_set_ist_unveraendert():
    # Unveränderlichkeit: der ausgelieferte Hash muss aktuell stimmen …
    aktuell = pipeline.file_sha256(PROJEKT / "golden" / "golden_set.json")
    pins = {e["path"]: e["sha256"] for e in json.loads(
        (PROJEKT / "check-manifest.json").read_text(encoding="utf-8"))["requiredFiles"]}
    assert pins["golden/golden_set.json"] == aktuell
    # … und im Ergebnisbergicht steht derselbe Freeze-Hash.
    assert ERGEBNIS["hashes"]["golden_set"] == aktuell


def test_subgruppenmetriken_sind_exakt():
    assert ERGEBNIS["metriken"]["subgroups"] == {
        "garantie": 1.0, "rabatt": 0.5, "recht": 0.5, "versand": 1.0
    }
    assert ERGEBNIS["metriken"]["overall"] == {
        "queries": 8, "recall_at_k": 0.75, "precision_at_k": 0.75,
        "answered": 6, "retrieval_fehler": 2,
    }


def test_w30_teilmenge_als_regressionsvergleich():
    assert ERGEBNIS["metriken"]["w30_teilmenge"] == {
        "queries": 4, "recall_at_k": 0.75, "precision_at_k": 0.75,
        "answered": 3, "retrieval_fehler": 1,
    }


def test_fehlerarten_werden_getrennt_vergeben():
    # Ein Fehler gehoert zu genau einer Stage: Retrieval leer ODER Antwort
    # blockiert — nie beides, nie keins von beiden bei erkenntlichem Fehler.
    for datensatz in ERGEBNIS["abfragen"]:
        assert datensatz["retrieval_status"] in {"ok", "leer"}
        assert datensatz["antwort_status"] in {"ok", "kein_treffer", "blockiert"}
        if datensatz["retrieval_status"] == "leer":
            assert datensatz["antwort_status"] == "kein_treffer"
        if datensatz["antwort_status"] == "blockiert":
            assert datensatz["retrieval_status"] == "ok"
    assert sum(1 for d in ERGEBNIS["abfragen"] if d["antwort_status"] == "blockiert") == 0


def test_redteam_nur_gegen_den_eigenen_toy_prototyp():
    fixtures = ERGEBNIS["sicherheit"]["fixtures"]
    assert len(fixtures) == 7
    for eintrag in fixtures:
        assert eintrag["uebereinstimmung"] is True, eintrag["id"]
        assert eintrag["ist"] == eintrag["soll"]
    blockiert = [f for f in fixtures if f["ist"]["status"] == "blockiert"]
    unblockiert = [f for f in fixtures if f["ist"]["status"] == "ok"]
    assert len(blockiert) == 4 and len(unblockiert) == 3
    # Benign-Faelle duerfen nicht falsch-positive blockieren.
    for eintrag in unblockiert:
        assert eintrag["soll"]["grund"] is None
    # Angriffe richten sich nur gegen den eigenen Toy-Prototyp: Die Benign-
    # Faelle enthalten weder Regelphrase noch Angriffsdomaene; als Domäne
    # taucht ausschliesslich example.invalid auf, niemals echte Adressen.
    roh = json.loads((PROJEKT / "golden" / "injection_fixtures.json").read_text(encoding="utf-8"))
    for fix in roh["fixtures"]:
        text = fix["text"].lower()
        if fix["erwartet"]["status"] == "ok":
            assert not any(regel in text for regel in w30_core.INJECTION_RULES)
            assert "example.invalid" not in fix["text"]
        else:
            assert "@" not in fix["text"].replace("example.invalid", "")
            assert "http" not in text


def test_verbotene_aktionen_werden_abgelehnt():
    aktionen = ERGEBNIS["sicherheit"]["aktionen"]
    assert len(aktionen) == 7
    for eintrag in aktionen:
        assert eintrag["uebereinstimmung"] is True
    urteile = {(a["tool"], a["arg"]): a["ist"] for a in aktionen}
    assert urteile[("suche", "lieferzeit")] == "erlaubt"
    assert urteile[("export", "bericht")] == "erlaubt"
    assert urteile[("export", "rohdaten")] == "abgelehnt:argument-nicht-erlaubt"
    assert urteile[("mail", "example.invalid")] == "abgelehnt:tool-verboten"
    assert urteile[("hook", "example.invalid")] == "abgelehnt:tool-verboten"
    assert urteile[("admin", "example.invalid")] == "abgelehnt:werkzeug-unbekannt"
    assert pipeline.request_action("mail", "example.invalid", CONFIG["policy"]) == "abgelehnt:tool-verboten"


def test_regressionstabelle_gegen_die_w34_baseline():
    tabelle = pipeline.regression_table(ERGEBNIS, CONFIG["baseline"])
    assert tabelle["baseline"] == {"recall_at_k": 0.75, "answered": 3}
    assert tabelle["aktuell"] == {"recall_at_k": 0.75, "answered": 3}
    assert tabelle["regression"] is False


def test_regelwerk_verdict_nimmt_drei_zustaende_an():
    gut = pipeline.evaluate_run(ERGEBNIS, CONFIG["thresholds"])
    assert gut["verdict"] == "angenommen"
    assert all(p["bestanden"] for p in gut["pruefungen"])

    streng = dict(CONFIG["thresholds"])
    streng["recall_at_k_min"] = 0.9
    schlecht = pipeline.evaluate_run(ERGEBNIS, streng)
    assert schlecht["verdict"] == "abgelehnt"
    namen = {p["name"]: p["bestanden"] for p in schlecht["pruefungen"]}
    assert namen["recall_at_k"] is False

    abbruch = pipeline.evaluate_run({"status": "abgebrochen"}, CONFIG["thresholds"])
    assert abbruch["verdict"] == "abgebrochen"
