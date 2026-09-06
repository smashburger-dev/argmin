"""Phase w38-repro: frischer Doppellauf (Digest-Vergleich), README-Pflicht-
ueberschriften, gepinnte Versionen, Overclaim-Detektor, keine Benutzerpfade.

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
(reine asserts, kein pytest-Import noetig).
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import pipeline

PROJEKT = Path(__file__).resolve().parents[1]
CONFIG = pipeline.load_json("config/experiment.json")
EXPECTED = json.loads((PROJEKT / "golden" / "expected_results.json").read_text(encoding="utf-8"))


def test_frischer_doppellauf_liefert_identischen_digest():
    bericht = pipeline.fresh_double_run()
    assert bericht["identisch"] is True
    assert bericht["digest_1"] == bericht["digest_2"]
    assert len(bericht["digest_1"]) == 64


def test_lauf_reproduziert_expected_results_exakt():
    ergebnis = pipeline.run()
    assert pipeline.run_digest(ergebnis) == EXPECTED["run_digest"]
    assert ergebnis["metriken"] == EXPECTED["metriken"]
    assert ergebnis["kosten"] == EXPECTED["kosten"]
    assert EXPECTED["kosten"] == {"tokens_input": 95, "tokens_output": 32, "kosten_eur": 0.0334}


def test_readme_traegt_alle_pflichtueberschriften():
    bericht = pipeline.check_readme()
    assert bericht["fehlende_uberschriften"] == []
    assert CONFIG["required_readme_headings"] == [
        "Setup", "Abhängigkeiten", "Konfiguration", "Karten", "Limitations", "Bekannte Fehler"
    ]
    # Der Detektor schlaegt wirklich an, wenn eine Ueberschrift fehlt.
    fehlt = pipeline.check_readme(headings=["Setup", "Gibtsnicht"])
    assert fehlt["fehlende_uberschriften"] == ["Gibtsnicht"]


def test_versionen_sind_gepinnt_ohne_bereichsspecs():
    bericht = pipeline.pinned_versions_ok(CONFIG["pinned_versions"])
    assert bericht["verletzungen"] == []
    verstoß = pipeline.pinned_versions_ok({"pytest": ">=8", "numpy": "~=1.26", "pandas": "*"})
    assert verstoß["verletzungen"] == ["numpy: ~=1.26", "pandas: *", "pytest: >=8"]


def test_overclaim_detektor_findt_und_entlastet():
    text = "Das System ist produktionsreif, sicher gegen Angriffe, halluziniert nie und wurde getestet gegen alle Faelle."
    funde = pipeline.scan_overclaims(text, CONFIG["overclaim_phrases"])
    assert funde == ["getestet gegen alle", "halluziniert nie", "produktionsreif", "sicher gegen"]
    readme = (PROJEKT / "README.md").read_text(encoding="utf-8")
    assert pipeline.scan_overclaims(readme, CONFIG["overclaim_phrases"]) == []
    for karte in sorted((PROJEKT / "cards").glob("*.json")):
        assert pipeline.scan_overclaims(karte.read_text(encoding="utf-8"), CONFIG["overclaim_phrases"]) == []


def test_keine_absoluten_benutzerpfade_in_quellen():
    bericht = pipeline.scan_user_paths()
    assert bericht["funde"] == []
    # Positivkontrolle: eine Datei mit Benutzerpfad wird gefunden
    # (Marker zusammengesetzt, damit dieser Test sich nicht selbst meldet).
    marker = pipeline.USER_PATH_MARKER
    with tempfile.TemporaryDirectory() as tmp:
        wurzel = Path(tmp)
        (wurzel / "src").mkdir()
        (wurzel / "src" / "boese.py").write_text("pfad = " + repr(marker + "noa") + "\n", encoding="utf-8")
        funde = pipeline.scan_user_paths(root=wurzel)["funde"]
        assert funde == ["src/boese.py"]
