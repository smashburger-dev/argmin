"""Reproduzierbarer Modellvergleich: Baseline gegen Ridge auf seeded Daten.

Loesung zu src/compare.py — vollstaendige, deterministische Implementierung.
"""

import numpy as np

TEST_SHARE = 0.25
LAM = 1.0
N_ROWS = 60


def load_dataset(seed):
    """Erzeuge deterministische synthetische Daten (siehe src/compare.py)."""
    rng = np.random.default_rng(seed)
    x1 = rng.uniform(0.0, 10.0, size=N_ROWS)
    x2 = rng.uniform(0.0, 10.0, size=N_ROWS)
    noise = rng.normal(0.0, 1.0, size=N_ROWS)
    y = 3.0 * x1 - 1.5 * x2 + 5.0 + noise
    X = np.column_stack([np.ones(N_ROWS), x1, x2])
    return X, y


def split_indices(n, seed):
    """Fixe Train-/Test-Indizes aus dem Seed (siehe src/compare.py)."""
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    n_test = max(1, int(round(n * TEST_SHARE)))
    return np.sort(perm[n_test:]), np.sort(perm[:n_test])


def mean_baseline(y_train, y_test):
    """Baseline: Trainingsmittelwert fuer jede Testzeile."""
    return np.full(len(y_test), float(np.mean(y_train)), dtype=float)


def rmse(predictions, targets):
    """RMSE als Wurzel aus dem mittleren quadratischen Fehler."""
    predictions = np.asarray(predictions, dtype=float)
    targets = np.asarray(targets, dtype=float)
    return float(np.sqrt(np.mean((predictions - targets) ** 2)))


def ridge_fit(X_train, y_train, lam):
    """Ridge-Koeffizienten aus (X^T X + lam I)^-1 X^T y via np.linalg.solve."""
    X_train = np.asarray(X_train, dtype=float)
    y_train = np.asarray(y_train, dtype=float)
    d = X_train.shape[1]
    return np.linalg.solve(X_train.T @ X_train + lam * np.eye(d), X_train.T @ y_train)


def compare(seed):
    """Baseline gegen Ridge auf identischem, seeded Split."""
    X, y = load_dataset(seed)
    train_idx, test_idx = split_indices(len(y), seed)
    X_train, y_train = X[train_idx], y[train_idx]
    X_test, y_test = X[test_idx], y[test_idx]
    baseline_pred = mean_baseline(y_train, y_test)
    w = ridge_fit(X_train, y_train, LAM)
    ridge_pred = X_test @ w
    return {
        "seed": int(seed),
        "n_train": int(len(train_idx)),
        "n_test": int(len(test_idx)),
        "rmse_mean": rmse(baseline_pred, y_test),
        "rmse_ridge": rmse(ridge_pred, y_test),
    }


def repro_check(seed):
    """True, wenn zwei compare-Laeufe mit demselben Seed identisch sind."""
    return compare(seed) == compare(seed)


if __name__ == "__main__":
    result = compare(7)
    print("seed", result["seed"], "rmse_mean=%.4f" % result["rmse_mean"], "rmse_ridge=%.4f" % result["rmse_ridge"])
    print("repro_check(7):", repro_check(7))
