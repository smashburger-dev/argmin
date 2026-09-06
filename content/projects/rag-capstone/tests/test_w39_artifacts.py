"""Phase w39-artifacts: demo_metrics aus eingefrorenen Messwerten,
final_diagnosis nach Evidenzregeln, acceptance_report ueber alle Vertraege,
Karten-Validator. Demo und Retrospektive sind Work Evidence, nie Mastery.

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
(reine asserts, kein pytest-Import noetig).
"""

import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import cards as cards_mod
from src import pipeline

PROJEKT = Path(__file__).resolve().parents[1]
EXPECTED = json.loads((PROJEKT / "golden" / "expected_results.json").read_text(encoding="utf-8"))


def test_demo_metrics_erzaehlt_nur_eingefrorene_werte():
    bericht = pipeline.demo_metrics()
    assert bericht["metriken"] == EXPECTED["metriken"]
    assert bericht["quelle"] == "golden/expected_results.json"
    assert bericht["stimmt_mit_neuberechnung_ueberein"] is True


def test_demo_metrics_weigert_sich_bei_abweichung():
    # Eingefrorene Werte manipuliert -> AssertionError, kein stiller Fallback.
    with tempfile.TemporaryDirectory() as tmp:
        wurzel = Path(tmp)
        shutil.copytree(PROJEKT, wurzel / "projekt", ignore=shutil.ignore_patterns("__pycache__", "solution"))
        datei = wurzel / "projekt" / "golden" / "expected_results.json"
        drift = dict(EXPECTED)
        drift["metriken"] = dict(drift["metriken"])
        drift["metriken"]["overall"] = dict(drift["metriken"]["overall"], recall_at_k=0.99)
        datei.write_text(json.dumps(drift, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            pipeline.demo_metrics(root=wurzel / "projekt")
            raise AssertionError("Abweichung wurde still geschluckt")
        except AssertionError as exc:
            assert "demo-abweichung" in str(exc)


def test_final_diagnosis_verlangt_zwei_treffer_zwei_definitionen_und_14_tage():
    ereignisse = [
        {"tag": "2026-05-04", "instanz": "w35-e6", "art": "definition"},
        {"tag": "2026-05-05", "instanz": "w37-e4", "art": "definition"},
        {"tag": "2026-05-05", "instanz": "w36-e4", "art": "hit"},
        {"tag": "2026-05-20", "instanz": "w38-e6", "art": "hit"},
    ]
    bericht = pipeline.final_diagnosis(ereignisse)
    assert bericht == {
        "status": "erfuellt", "treffer": 2, "definitionen": 2, "abstand_tage": 15,
        "disqualifizierte_instanzen": [], "fehlende_gruende": [],
    }
    # nur ein Treffer und 12 Tage Abstand -> nicht erfuellt, mit Gruenden
    zu_frueh = [
        {"tag": "2026-05-01", "instanz": "w36-e4", "art": "definition"},
        {"tag": "2026-05-02", "instanz": "w37-e4", "art": "definition"},
        {"tag": "2026-05-05", "instanz": "w36-e4", "art": "hit"},
        {"tag": "2026-05-13", "instanz": "w38-e6", "art": "hit"},
    ]
    bericht = pipeline.final_diagnosis(zu_frueh)
    assert bericht["status"] == "nicht_erfuellt"
    assert bericht["abstand_tage"] == 8
    assert bericht["fehlende_gruende"] == ["abstand unter 14 tagen"]


def test_loesungsanzeige_disqualifiziert_die_instanz():
    ereignisse = [
        {"tag": "2026-05-04", "instanz": "w35-e6", "art": "definition"},
        {"tag": "2026-05-05", "instanz": "w37-e4", "art": "definition"},
        {"tag": "2026-05-05", "instanz": "w36-e4", "art": "hit"},
        {"tag": "2026-05-20", "instanz": "w38-e6", "art": "hit"},
        {"tag": "2026-05-21", "instanz": "w38-e6", "art": "loesungsanzeige"},
    ]
    bericht = pipeline.final_diagnosis(ereignisse)
    assert bericht["disqualifizierte_instanzen"] == ["w38-e6"]
    assert bericht["treffer"] == 1
    assert bericht["status"] == "nicht_erfuellt"
    assert "zu wenige unabhaengige treffer" in bericht["fehlende_gruende"]


def test_demo_und_retrospektive_zahlen_nicht_als_treffer():
    # Demo und Retrospektive sind Work Evidence: Ereignisse dieser Art
    # duerfen niemals als Treffer oder Definitionen in die Diagnose fliessen.
    ereignisse = [
        {"tag": "2026-05-01", "instanz": "w35-e6", "art": "definition"},
        {"tag": "2026-05-02", "instanz": "w37-e4", "art": "definition"},
        {"tag": "2026-05-03", "instanz": "demo", "art": "demo"},
        {"tag": "2026-05-04", "instanz": "retro", "art": "retrospektive"},
        {"tag": "2026-05-05", "instanz": "w36-e4", "art": "hit"},
        {"tag": "2026-05-30", "instanz": "w38-e6", "art": "hit"},
    ]
    bericht = pipeline.final_diagnosis(ereignisse)
    assert bericht["treffer"] == 2 and bericht["definitionen"] == 2
    readme = (PROJEKT / "README.md").read_text(encoding="utf-8")
    assert "Work Evidence" in readme


def test_acceptance_report_nimmt_an():
    bericht = pipeline.acceptance_report()
    assert bericht["verdict"] == "angenommen", bericht["pruefungen"]
    namen = {p["name"] for p in bericht["pruefungen"]}
    assert namen == {
        "manifest_gepinnt", "w30_teilmenge_im_golden_set", "regelwerk_verdict",
        "keine_regression", "doppellauf_identisch", "readme_pflichtueberschriften",
        "versionen_gepinnt", "keine_overclaims", "keine_benutzerpfade",
    }
    assert all(p["bestanden"] for p in bericht["pruefungen"])


def test_karten_validator_prueft_struktur():
    verzeichnis = cards_mod.validate_cards_dir(PROJEKT / "cards")
    assert verzeichnis["status"] == "ok"
    assert set(verzeichnis["dateien"]) == {"data-card.json", "model-card.json", "system-card.json"}
    # fehlendes Pflichtfeld
    defekte_karte = {"name": "x", "zweck": "y", "provenienz": "z", "zeitraum": "w", "subgruppen": []}
    bericht = cards_mod.validate_card(defekte_karte, "data-card.json")
    assert bericht["status"] == "fehler"
    assert bericht["fehlende_felder"] == ["bekannte_limitierungen"]
    assert bericht["leere_werte"] == ["subgruppen"]
    # falscher Typ
    typ_karte = {"name": "x", "zweck": "y", "provenienz": "z", "zeitraum": "w",
                 "subgruppen": "keine-liste", "bekannte_limitierungen": ["a"]}
    bericht = cards_mod.validate_card(typ_karte, "data-card.json")
    assert bericht["typfehler"] == [{"feld": "subgruppen", "erwartet": "list", "ist": "str"}]
