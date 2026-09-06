"""Phase w35-scope: Manifest, Hashes, Stages, Scope-Freeze.

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
(reine asserts, kein pytest-Import noetig).
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import pipeline
from src import w30_core

PROJEKT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((PROJEKT / "check-manifest.json").read_text(encoding="utf-8"))


def _pins():
    return {e["path"]: e["sha256"] for e in MANIFEST["requiredFiles"]}


def test_manifest_ist_vollstaendig_und_pinnt_den_freeze():
    pins = _pins()
    gepinnt = {"golden/golden_set.json", "golden/injection_fixtures.json", "golden/expected_results.json",
               "config/experiment.json", "src/w30_core.py",
               "tests/test_w35_scope.py", "tests/test_w36_pipeline.py", "tests/test_w37_eval_redteam.py",
               "tests/test_w38_repro.py", "tests/test_w39_artifacts.py"}
    assert gepinnt <= set(pins), f"nicht gepinnt: {gepinnt - set(pins)}"
    for pfad, sha in pins.items():
        if sha is None:
            assert (PROJEKT / pfad).exists(), f"Lernenden-Datei fehlt: {pfad}"
        else:
            assert isinstance(sha, str) and len(sha) == 64, f"sha256 fehlt oder ungueltig: {pfad}"
    assert MANIFEST["testPaths"] == ["tests"]
    assert MANIFEST["timeoutSeconds"] >= 60


def test_w30_core_hash_stimmt_mit_manifest_ueberein():
    pins = _pins()
    ist = pipeline.file_sha256(PROJEKT / "src" / "w30_core.py")
    assert pins["src/w30_core.py"] == ist
    # Selbstcheck: der Kern ist die byte-identische W30-Kopie (DOCS und QUERIES unangetastet).
    assert len(w30_core.DOCS) == 5
    assert len(w30_core.QUERIES) == 4


def test_golden_set_enthaelt_w30_queries_woertlich():
    golden = json.loads((PROJEKT / "golden" / "golden_set.json").read_text(encoding="utf-8"))
    fragetexte = [q["query"] for q in golden["queries"]]
    for item in w30_core.QUERIES:
        assert item["query"] in fragetexte, f"W30-Query fehlt woertlich: {item['query']}"
    assert len(golden["queries"]) == 8
    for eintrag in golden["queries"]:
        assert set(eintrag) >= {"query", "relevant", "subgroup"}
        assert isinstance(eintrag["relevant"], list) and eintrag["relevant"]


def test_stages_topologisch_und_zyklen_werden_erkannt():
    ordnung = pipeline.topo_order(pipeline.STAGE_CONTRACTS)
    assert sorted(ordnung) == sorted(s["stage"] for s in pipeline.STAGE_CONTRACTS)
    assert len(ordnung) == 7
    assert ordnung[0] == "golden_laden"
    assert ordnung[-1] == "bericht"
    assert pipeline.detect_cycle(pipeline.STAGE_CONTRACTS) is None
    # Eine zusaetzliche Stage, die 'endbericht' konsumiert und 'eval_daten' erzeugt,
    # schliesst einen Zyklus — das muss sichtbar scheitern.
    mit_zyklus = pipeline.STAGE_CONTRACTS + [
        {"stage": "extra", "inputs": ["endbericht"], "outputs": ["eval_daten"]}
    ]
    try:
        pipeline.topo_order(mit_zyklus)
        raise AssertionError("Zyklus wurde nicht erkannt")
    except ValueError:
        pass


def test_assert_frozen_laeuft_im_ausgelieferten_zustand():
    bericht = pipeline.assert_frozen()
    assert bericht["status"] == "ok"
    assert bericht["gepruefte_dateien"] == len(MANIFEST["requiredFiles"])


def test_assert_frozen_erkennt_manifest_verletzung():
    with tempfile.TemporaryDirectory() as tmp:
        wurzel = Path(tmp)
        (wurzel / "golden").mkdir(parents=True)
        (wurzel / "golden" / "golden_set.json").write_text('{"queries": []}', encoding="utf-8")
        manifest = {
            "schemaVersion": 1,
            "projectId": "p-rag-capstone",
            "projectVersion": "1",
            "testPaths": ["tests"],
            "requiredFiles": [{"path": "golden/golden_set.json", "sha256": "0" * 64}],
            "timeoutSeconds": 120,
        }
        (wurzel / "check-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        try:
            pipeline.assert_frozen(root=wurzel)
            raise AssertionError("Manipulation wurde nicht erkannt")
        except AssertionError as exc:
            assert "hash weicht ab" in str(exc)


def test_config_versioniert_seeds_regeln_und_schwellen():
    config = pipeline.load_json("config/experiment.json")
    assert set(config["seeds"]) == {"pipeline", "ablation", "redteam"}
    assert config["k"] == 1
    assert config["injection_rules"] == w30_core.INJECTION_RULES
    assert config["policy"] == w30_core.POLICY
    assert set(config["thresholds"]) == {"recall_at_k_min", "precision_at_k_min", "subgroup_recall_min", "max_kosten_eur"}
    assert config["baseline"]["recall_at_k"] == 0.75 and config["baseline"]["answered"] == 3


def test_build_golden_deterministisch_mit_hashes():
    erst = pipeline.build_golden()
    zweit = pipeline.build_golden()
    assert erst == zweit
    assert len(erst["queries"]) == 8 and len(erst["fixtures"]) == 7 and len(erst["aktionen"]) == 7
    assert set(erst["hashes"]) == {"golden_set", "injection_fixtures"}
    assert all(len(h) == 64 for h in erst["hashes"].values())
