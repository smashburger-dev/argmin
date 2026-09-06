"""Phase w36-integration: Hauptfunktion, IO-Vetraege, Fehlerzustaende,
Timeouts mit virtueller Uhr, keine stillen Fallbacks.

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
(reine asserts, kein pytest-Import noetig).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import pipeline
from src import w30_core

PROJEKT = Path(__file__).resolve().parents[1]


def _uhr(werte):
    """Virtuelle Uhr: liefert nacheinander feste Zeitpunkte (kein sleep)."""
    return iter(werte).__next__


def test_run_liefert_die_integrationsvertraege():
    ergebnis = pipeline.run()
    assert ergebnis["status"] == "ok"
    assert ergebnis["stages"] == pipeline.topo_order(pipeline.STAGE_CONTRACTS)
    assert set(ergebnis["ausfuehrung"]) == {s["stage"] for s in pipeline.STAGE_CONTRACTS}
    assert all(b["status"] == "ok" for b in ergebnis["ausfuehrung"].values())
    assert set(ergebnis["hashes"]) == {"golden_set", "injection_fixtures", "config", "w30_core"}
    assert set(ergebnis["metriken"]) == {"overall", "subgroups", "w30_teilmenge"}
    assert set(ergebnis["sicherheit"]) == {"fixtures", "aktionen"}
    assert set(ergebnis["kosten"]) == {"tokens_input", "tokens_output", "kosten_eur"}
    assert len(ergebnis["abfragen"]) == 8
    for datensatz in ergebnis["abfragen"]:
        assert set(datensatz) >= {"query", "subgroup", "retrieval_status", "antwort_status",
                                  "recall", "precision", "doc", "antwort"}


def test_retrieval_und_antwortfehler_sind_getrennt_ausgewiesen():
    ergebnis = pipeline.run()
    paare = {}
    for datensatz in ergebnis["abfragen"]:
        schluessel = (datensatz["retrieval_status"], datensatz["antwort_status"])
        paare[schluessel] = paare.get(schluessel, 0) + 1
    assert paare == {("ok", "ok"): 6, ("leer", "kein_treffer"): 2}
    for datensatz in ergebnis["abfragen"]:
        if datensatz["retrieval_status"] == "leer":
            assert datensatz["doc"] is None
            assert datensatz["antwort"] == pipeline.NO_HIT
        else:
            assert isinstance(datensatz["doc"], int)


def test_call_with_timeout_nutzt_die_virtuelle_uhr():
    bericht = pipeline.call_with_timeout(lambda: 41 + 1, 100, _uhr([0, 50]))
    assert bericht == {"status": "ok", "value": 42, "dauer_ms": 50}
    bericht = pipeline.call_with_timeout(lambda: 7, 100, _uhr([0, 150]))
    assert bericht == {"status": "timeout", "budget_ms": 100, "dauer_ms": 150}
    # exakt im Budget gilt noch als ok (kein umkehrfehler)
    bericht = pipeline.call_with_timeout(lambda: 1, 100, _uhr([10, 110]))
    assert bericht["status"] == "ok" and bericht["dauer_ms"] == 100


def test_run_stage_meldet_fehler_und_timeout_ohne_fallback():
    def kaputt():
        raise ValueError("kaputte stage")

    bericht = pipeline.run_stage("demo", kaputt, 100, _uhr([0, 1]))
    assert bericht["status"] == "fehler"
    assert "ValueError" in bericht["grund"] and "kaputte stage" in bericht["grund"]
    assert bericht["stage"] == "demo"
    bericht = pipeline.run_stage("demo", lambda: "wert", 5, _uhr([0, 900]))
    assert bericht == {"status": "timeout", "budget_ms": 5, "dauer_ms": 900, "stage": "demo"}
    assert "value" not in bericht  # kein Ersatzwert beim Timeout


def test_kaputte_stage_bricht_den_lauf_sichtbar_ab():
    config = pipeline.load_json("config/experiment.json")
    del config["token_prices"]  # kosten-stage kann nicht rechnen
    ergebnis = pipeline.run(root=PROJEKT, config=config)
    assert ergebnis["status"] == "abgebrochen"
    assert ergebnis["fehlerhafte_stage"] == "kosten"
    assert ergebnis["ausfuehrung"]["kosten"]["status"] == "fehler"
    assert "KeyError" in ergebnis["ausfuehrung"]["kosten"]["grund"]


def test_blockierte_query_bleibt_sichtbar_und_wird_gedaempft():
    item = {"query": w30_core.DOCS[4], "relevant": [4], "subgroup": "angriff"}
    datensatz = pipeline.run_query(item, w30_core.DOCS, w30_core.INJECTION_RULES, 1)
    assert datensatz["antwort_status"] == "blockiert"
    assert datensatz["antwort"] == pipeline.BLOCK
    assert datensatz["recall"] == 0.0 and datensatz["precision"] == 0.0


def test_run_ist_deterministisch_und_byte_identisch_wiederholbar():
    erst = pipeline.run()
    zweit = pipeline.run()
    assert erst == zweit
    assert pipeline.kanonisches_json(erst) == pipeline.kanonisches_json(zweit)
    assert pipeline.run_digest(erst) == pipeline.run_digest(zweit)
    assert len(pipeline.run_digest(erst)) == 64
