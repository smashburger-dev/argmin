import importlib.util
import sys
import unittest

sys.dont_write_bytecode = True
from pathlib import Path

ROOT = Path(__file__).parents[1]
SOLUTION_PATH = ROOT / "content" / "projects" / "foundations-data-checker" / "solution" / "checker.py"
TEST_PATH = ROOT / "content" / "projects" / "foundations-data-checker" / "tests" / "test_checker.py"


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FoundationsProjectSolutionTests(unittest.TestCase):
    def test_reference_solution_passes_every_shipped_test_function(self):
        solution = load(SOLUTION_PATH, "src.checker")
        previous_src = sys.modules.get("src")
        previous_checker = sys.modules.get("src.checker")
        src = type(sys)("src")
        src.checker = solution
        sys.modules["src"] = src
        sys.modules["src.checker"] = solution
        try:
            tests = load(TEST_PATH, "foundations_data_checker_tests")
            functions = [getattr(tests, name) for name in dir(tests) if name.startswith("test_")]
            self.assertEqual(len(functions), 5)
            for function in functions:
                function()
        finally:
            if previous_src is None:
                sys.modules.pop("src", None)
            else:
                sys.modules["src"] = previous_src
            if previous_checker is None:
                sys.modules.pop("src.checker", None)
            else:
                sys.modules["src.checker"] = previous_checker


if __name__ == "__main__":
    unittest.main()
