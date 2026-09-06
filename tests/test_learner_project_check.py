import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

MODULE_PATH = Path(__file__).parents[1] / "tools" / "learner_project_check.py"
SPEC = importlib.util.spec_from_file_location("learner_project_check", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LearnerProjectCheckTests(unittest.TestCase):
    def manifest(self):
        return {
            "schemaVersion": 1,
            "projectId": "p-runner-test",
            "projectVersion": "1",
            "testPaths": ["tests"],
            "requiredFiles": [{"path": "main.py", "sha256": None}],
            "timeoutSeconds": 30,
        }

    def prepare_project(self, root):
        (root / "main.py").write_text("print('ok')\n", encoding="utf-8")
        (root / "project.json").write_text(json.dumps({
            "schemaVersion": 1,
            "projectId": "p-runner-test",
            "version": 1,
            "allowedCommands": [{
                "program": "python",
                "args": ["-m", "pytest", "-q", "--disable-warnings", "--maxfail=1", "tests"],
            }],
        }), encoding="utf-8")

    def write_manifest(self, root, manifest=None):
        path = root / "check-manifest.json"
        path.write_text(json.dumps(manifest or self.manifest()), encoding="utf-8")
        return path

    def test_runner_uses_project_command_current_interpreter_without_shell_and_bounded_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            completed = subprocess.CompletedProcess([], 0, "8 passed\n", "")
            runner = Mock(return_value=completed)
            with patch.dict(os.environ, {"LEAK_ME": "secret"}, clear=False):
                report = MODULE.run_project(root, self.manifest(), run=runner)
            self.assertEqual(report["status"], "passed")
            self.assertEqual(report["command"], ["python", "-m", "pytest", "-q", "--disable-warnings", "--maxfail=1", "tests"])
            args, kwargs = runner.call_args
            self.assertEqual(args[0][0], sys.executable)
            self.assertEqual(args[0][1:], report["command"][1:])
            self.assertFalse(kwargs["shell"])
            self.assertNotIn("LEAK_ME", kwargs["env"])
            self.assertLessEqual(set(kwargs["env"]), {"PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "SYSTEMROOT"})

    def test_project_command_drift_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            project = json.loads((root / "project.json").read_text(encoding="utf-8"))
            project["allowedCommands"][0]["args"][-1] = "other-tests"
            (root / "project.json").write_text(json.dumps(project), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "pytest command"):
                MODULE.run_project(root, self.manifest(), run=Mock())

    def test_tool_missing_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            completed = subprocess.CompletedProcess([], 1, "", f"{sys.executable}: No module named pytest")
            report = MODULE.run_project(root, self.manifest(), run=Mock(return_value=completed))
            self.assertEqual(report["status"], "tool-missing")
            self.assertEqual(report["exitCode"], 1)

    def test_success_output_cannot_be_misclassified_as_tool_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            completed = subprocess.CompletedProcess([], 0, "", "No module named pytest")
            report = MODULE.run_project(root, self.manifest(), run=Mock(return_value=completed))
            self.assertEqual(report["status"], "passed")

    def test_timeout_preserves_str_and_bytes_output(self):
        for output, error_output in [("started", "slow"), (b"started", b"slow")]:
            with self.subTest(output_type=type(output).__name__), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.prepare_project(root)
                error = subprocess.TimeoutExpired([sys.executable], 1, output=output, stderr=error_output)
                report = MODULE.run_project(root, self.manifest(), run=Mock(side_effect=error))
                self.assertEqual(report["status"], "timeout")
                self.assertEqual(report["exitCode"], -2)
                self.assertEqual(report["stdout"], "started")
                self.assertEqual(report["stderr"], "slow")

    def test_nonzero_exit_is_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            report = MODULE.run_project(root, self.manifest(), run=Mock(return_value=subprocess.CompletedProcess([], 3, "out", "err")))
            self.assertEqual(report["status"], "failed")
            self.assertEqual(report["exitCode"], 3)

    def test_missing_required_file_skips_subprocess(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            (root / "main.py").unlink()
            runner = Mock()
            report = MODULE.run_project(root, self.manifest(), run=runner)
            self.assertEqual(report["status"], "failed")
            self.assertEqual(report["exitCode"], -1)
            self.assertIn("missing", report["stderr"].lower())
            runner.assert_not_called()

    def test_hash_mismatch_skips_subprocess(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            manifest = self.manifest()
            manifest["requiredFiles"][0]["sha256"] = "0" * 64
            runner = Mock()
            report = MODULE.run_project(root, manifest, run=runner)
            self.assertEqual(report["status"], "failed")
            self.assertIn("hash", report["stderr"].lower())
            runner.assert_not_called()

    def test_manifest_rejects_invalid_contracts(self):
        cases = []
        invalid = self.manifest()
        invalid["schemaVersion"] = 2
        cases.append(invalid)
        invalid = self.manifest()
        invalid["schemaVersion"] = True
        cases.append(invalid)
        invalid = self.manifest()
        invalid["projectId"] = "../bad"
        cases.append(invalid)
        invalid = self.manifest()
        invalid["projectVersion"] = 1
        cases.append(invalid)
        invalid = self.manifest()
        invalid["testPaths"] = []
        cases.append(invalid)
        invalid = self.manifest()
        invalid["testPaths"] = ["tests", "tests"]
        cases.append(invalid)
        invalid = self.manifest()
        invalid["requiredFiles"] = "main.py"
        cases.append(invalid)
        invalid = self.manifest()
        invalid["requiredFiles"][0]["sha256"] = "bad"
        cases.append(invalid)
        invalid = self.manifest()
        invalid["requiredFiles"].append({"path": "main.py", "sha256": None})
        cases.append(invalid)
        invalid = self.manifest()
        invalid["timeoutSeconds"] = 0
        cases.append(invalid)
        invalid = self.manifest()
        invalid["timeoutSeconds"] = True
        cases.append(invalid)
        invalid = self.manifest()
        invalid["timeoutSeconds"] = 121
        cases.append(invalid)
        for index, manifest in enumerate(cases):
            with self.subTest(index=index), tempfile.TemporaryDirectory() as directory:
                path = self.write_manifest(Path(directory), manifest)
                with self.assertRaises(ValueError):
                    MODULE.load_manifest(path)

    def test_manifest_rejects_path_traversal_in_tests_and_required_files(self):
        for key in ("testPaths", "requiredFiles"):
            with self.subTest(key=key), tempfile.TemporaryDirectory() as directory:
                manifest = self.manifest()
                if key == "testPaths":
                    manifest[key] = ["../private"]
                else:
                    manifest[key] = [{"path": "../private", "sha256": None}]
                path = self.write_manifest(Path(directory), manifest)
                with self.assertRaisesRegex(ValueError, "invalid relative path"):
                    MODULE.load_manifest(path)

    def test_required_file_symlink_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as outside:
            root = Path(directory)
            self.prepare_project(root)
            (root / "main.py").unlink()
            target = Path(outside) / "private.py"
            target.write_text("secret\n", encoding="utf-8")
            try:
                (root / "main.py").symlink_to(target)
            except OSError as error:
                self.skipTest(str(error))
            with self.assertRaisesRegex(ValueError, "project root"):
                MODULE.run_project(root, self.manifest(), run=Mock())

    def test_stdout_and_stderr_are_truncated_independently(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.prepare_project(root)
            completed = subprocess.CompletedProcess([], 1, "o" * (MODULE.MAX_OUTPUT_CHARS + 10), "e" * (MODULE.MAX_OUTPUT_CHARS + 20))
            report = MODULE.run_project(root, self.manifest(), run=Mock(return_value=completed))
            self.assertEqual(len(report["stdout"]), MODULE.MAX_OUTPUT_CHARS)
            self.assertEqual(len(report["stderr"]), MODULE.MAX_OUTPUT_CHARS)
            self.assertTrue(report["stdoutTruncated"])
            self.assertTrue(report["stderrTruncated"])

    def test_report_write_is_valid_json(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "reports" / "result.json"
            report = {"schemaVersion": 1, "status": "passed"}
            MODULE.write_report(output, report)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")), report)

    def test_report_write_preserves_previous_file_if_replace_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "result.json"
            output.write_text("previous\n", encoding="utf-8")
            with patch.object(MODULE.os, "replace", side_effect=OSError("replace failed")):
                with self.assertRaisesRegex(OSError, "replace failed"):
                    MODULE.write_report(output, {"status": "passed"})
            self.assertEqual(output.read_text(encoding="utf-8"), "previous\n")
            self.assertEqual([path.name for path in output.parent.iterdir()], ["result.json"])


if __name__ == "__main__":
    unittest.main()
