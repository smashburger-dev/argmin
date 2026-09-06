"""Loesungstest fuer p-rag-capstone (ADR-0014 Design A).

Kopiert starterFiles plus solution/ in ein Temp-Verzeichnis, laedt dort die
fuenf Phasen-Testdateien per importlib und beweist:
- alle Phasen-Tests laufen mit der Referenzloesung gruen,
- ein frischer Doppellauf liefert byte-identische Ergebnisse,
- golden/expected_results.json wird exakt reproduziert (inkl. run_digest).

Muster: tests/test_foundations_project_solution.py (unittest, stdlib-only).
"""

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

ROOT = Path(__file__).parents[1]
PROJECT = ROOT / "content" / "projects" / "rag-capstone"
PHASE_TESTS = [
    "tests/test_w35_scope.py",
    "tests/test_w36_pipeline.py",
    "tests/test_w37_eval_redteam.py",
    "tests/test_w38_repro.py",
    "tests/test_w39_artifacts.py",
]


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class RagCapstoneProjectSolutionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix="rag-capstone-solution-"))
        cls.arbeitskopie = cls.tmp / "rag-capstone"
        shutil.copytree(PROJECT, cls.arbeitskopie, ignore=shutil.ignore_patterns("__pycache__"))
        # Loesung ueber die Starter-Stubs legen (genau wie der Lernende am Ende dastehen wuerde).
        for modul in ("pipeline.py", "metrics.py", "cost.py", "cards.py"):
            shutil.copy2(PROJECT / "solution" / modul, cls.arbeitskopie / "src" / modul)
        # Frischer Namensraum: die Arbeitskopie muss als 'src' geladen werden.
        cls._alte_src = {name: mod for name, mod in sys.modules.items() if name == "src" or name.startswith("src.")}
        for name in cls._alte_src:
            del sys.modules[name]
        cls._alter_pfad = list(sys.path)
        sys.path.insert(0, str(cls.arbeitskopie))

    @classmethod
    def tearDownClass(cls):
        for name in [n for n in sys.modules if n == "src" or n.startswith("src.")]:
            del sys.modules[name]
        for name, mod in cls._alte_src.items():
            sys.modules[name] = mod
        sys.path[:] = cls._alter_pfad
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_alle_fuenf_phasen_tests_bestehen_mit_der_loesung(self):
        gesamt = 0
        for relativ in PHASE_TESTS:
            modul = _load(self.arbeitskopie / relativ, "rag_capstone_" + Path(relativ).stem)
            funktionen = [name for name in dir(modul) if name.startswith("test_")]
            self.assertGreaterEqual(len(funktionen), 6, relativ)
            for name in funktionen:
                getattr(modul, name)()
                gesamt += 1
        self.assertGreaterEqual(gesamt, 30)

    def test_doppellauf_ist_byte_identisch(self):
        pipeline = sys.modules["src.pipeline"]
        erst = pipeline.run()
        zweit = pipeline.run()
        self.assertEqual(erst["status"], "ok")
        self.assertEqual(pipeline.kanonisches_json(erst), pipeline.kanonisches_json(zweit))
        self.assertEqual(pipeline.run_digest(erst), pipeline.run_digest(zweit))

    def test_expected_results_wird_exakt_reproduziert(self):
        pipeline = sys.modules["src.pipeline"]
        ergebnis = pipeline.run()
        erwartet = json.loads((self.arbeitskopie / "golden" / "expected_results.json").read_text(encoding="utf-8"))
        self.assertEqual(pipeline.run_digest(ergebnis), erwartet["run_digest"])
        self.assertEqual(ergebnis["metriken"], erwartet["metriken"])
        self.assertEqual(ergebnis["kosten"], erwartet["kosten"])
        self.assertEqual(erwartet["sicherheit"], {
            "fixtures_blockiert": 4,
            "fixtures_ok": 3,
            "aktionen_abgelehnt": 4,
            "uebereinstimmung": True,
        })

    def test_echtes_pytest_kommando_besteht(self):
        if importlib.util.find_spec("pytest") is None:
            self.skipTest("pytest ist in dieser Python-Umgebung nicht installiert")
        project = json.loads((self.arbeitskopie / "project.json").read_text(encoding="utf-8"))
        command = project["allowedCommands"][0]
        self.assertEqual(command["program"], "python")
        completed = subprocess.run(
            [sys.executable, *command["args"]],
            cwd=self.arbeitskopie,
            capture_output=True,
            text=True,
            timeout=180,
            check=False,
            shell=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)

    def test_w30_core_in_der_arbeitskopie_ist_byte_identisch_gepinnt(self):
        import hashlib

        kern = self.arbeitskopie / "src" / "w30_core.py"
        original = ROOT / "content" / "projects" / "rag-secure-prototype" / "src" / "prototype.py"
        self.assertEqual(hashlib.sha256(kern.read_bytes()).hexdigest(),
                         hashlib.sha256(original.read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
