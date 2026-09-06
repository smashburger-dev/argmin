"""Tests fuer den reproduzierbaren Modellvergleich (p-ml-repro-comparison).

Laufen mit: python -m pytest -q --disable-warnings --maxfail=1 tests
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.compare import compare, repro_check, split_indices


def test_same_seed_gives_identical_compare_output():
    assert compare(7) == compare(7)


def test_different_seed_gives_different_split_indices():
    train_a, test_a = split_indices(60, 1)
    train_b, test_b = split_indices(60, 2)
    assert list(train_a) != list(train_b)
    assert list(test_a) != list(test_b)


def test_ridge_beats_mean_baseline_on_synthetic_set():
    result = compare(7)
    assert result["rmse_ridge"] < result["rmse_mean"]


def test_compare_reports_seed_and_split_sizes():
    result = compare(7)
    assert result["seed"] == 7
    assert result["n_train"] + result["n_test"] == 60
    assert result["n_test"] == 15


def test_repro_check_returns_true():
    assert repro_check(7) is True
