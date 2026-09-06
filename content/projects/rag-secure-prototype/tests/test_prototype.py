"""Tests fuer den abgesicherten RAG-Prototyp (p-rag-secure-prototype).

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.prototype import (
    ACTIONS,
    BLOCK,
    DOCS,
    INJECTION_RULES,
    NO_HIT,
    POLICY,
    QUERIES,
    ablation,
    answer,
    audit,
    contains_injection,
    metrics,
    request_action,
)


def test_injection_fixture_is_flagged_defensively():
    assert contains_injection(DOCS[4], INJECTION_RULES) is True
    assert contains_injection("Wie lange gilt der Rabatt?", INJECTION_RULES) is False
    assert audit(DOCS[4])["status"] == "blockiert"
    assert audit("Wie lange beträgt die Lieferzeit?") == {"status": "ok", "grund": None}


def test_audit_checks_retrieved_document_not_only_query():
    # Die Anfrage ist harmlos, das beste Dokument ist die Injektions-Fixture.
    report = audit("Was steht im wichtigen Hinweis?")
    assert report["status"] == "blockiert"
    assert report["grund"] == "injektionsverdacht:dokument"


def test_stub_generator_only_copies_or_refuses():
    assert answer("Wie lange beträgt die Lieferzeit?") == "Die Lieferzeit beträgt drei Werktage"
    assert answer("Wie erfolgt der Versand?") == "Der Versand erfolgt mit DHL"
    assert answer("Bis wann läuft der Rabatt?") == NO_HIT
    assert answer(DOCS[4]) == BLOCK


def test_recall_at_k_threshold_is_met():
    result = metrics()
    assert result["recall_at_k"] >= 0.6
    assert 0.0 <= result["recall_at_k"] <= 1.0


def test_metrics_are_exact_and_deterministic():
    assert metrics() == {"recall_at_k": 0.75, "answered": 3}
    assert metrics() == metrics()


def test_least_privilege_policy_holds():
    assert request_action("suche", "lieferzeit") == "erlaubt"
    assert request_action("export", "bericht") == "erlaubt"
    assert request_action("export", "rohdaten") == "abgelehnt:argument-nicht-erlaubt"
    assert request_action("mail", "example.invalid") == "abgelehnt:tool-verboten"
    assert request_action("hook", "irgendwas") == "abgelehnt:tool-verboten"
    assert request_action("admin", "x") == "abgelehnt:werkzeug-unbekannt"


def test_ablation_shows_the_price_of_control():
    table = ablation()
    assert set(table.keys()) == {"mit_kontrolle", "ohne_kontrolle"}
    secure = table["mit_kontrolle"]
    opened = table["ohne_kontrolle"]
    assert secure["blockiert"] == 1
    assert opened["blockiert"] == 0
    assert secure["abgelehnte_aktionen"] == 2
    assert opened["abgelehnte_aktionen"] == 0
    assert secure["recall_at_k"] == 0.6
    assert opened["recall_at_k"] == 0.8
    assert secure["recall_at_k"] < opened["recall_at_k"]


def test_ablation_is_deterministic():
    assert ablation() == ablation()
