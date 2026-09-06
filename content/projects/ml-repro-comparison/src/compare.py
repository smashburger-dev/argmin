"""Reproduzierbarer Modellvergleich: Baseline gegen Ridge auf seeded Daten.

Vertrag (siehe README.md):
- Alle Zufallsquellen kommen aus np.random.default_rng(seed) — kein globaler Zustand.
- Der Split wird aus demselben Seed abgeleitet und ist damit fix.
- Metrik ist RMSE auf dem Testteil; Vergleiche laufen auf identischen Daten.
"""

import numpy as np

TEST_SHARE = 0.25
LAM = 1.0
N_ROWS = 60


def load_dataset(seed):
    """Erzeuge deterministische synthetische Daten.

    Liefert (X, y): X hat die Spalten (1, x1, x2) und y = 3*x1 - 1.5*x2 + 5 + Rauschen.
    Gleicher Seed -> gleiche Daten, verschiedene Reihenfolge der Ziehungen ist Teil des Vertrags.
    """
    rng = np.random.default_rng(seed)
    x1 = rng.uniform(0.0, 10.0, size=N_ROWS)
    x2 = rng.uniform(0.0, 10.0, size=N_ROWS)
    noise = rng.normal(0.0, 1.0, size=N_ROWS)
    y = 3.0 * x1 - 1.5 * x2 + 5.0 + noise
    X = np.column_stack([np.ones(N_ROWS), x1, x2])
    return X, y


def split_indices(n, seed):
    """Leite fixe Train-/Test-Indizes aus dem Seed ab.

    Liefert (train_idx, test_idx) als sortierte Arrays; der Testteil umfasst
    rund TEST_SHARE der Indizes (mindestens 1).
    """
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    n_test = max(1, int(round(n * TEST_SHARE)))
    return np.sort(perm[n_test:]), np.sort(perm[:n_test])


def mean_baseline(y_train, y_test):
    """Baseline: Vorhersage ist der Mittelwert der Trainingsziele für jede Testzeile."""
    return np.full(len(y_test), float(np.mean(y_train)), dtype=float)


def rmse(predictions, targets):
    """RMSE als Wurzel aus dem mittleren quadratischen Fehler."""
    predictions = np.asarray(predictions, dtype=float)
    targets = np.asarray(targets, dtype=float)
    return float(np.sqrt(np.mean((predictions - targets) ** 2)))


def ridge_fit(X_train, y_train, lam):
    """Ridge-Koeffizienten aus der geschlossenen Formel (X^T X + lam I)^-1 X^T y.

    Nutze np.linalg.solve statt einer expliziten Inversen.
    """
    X_train = np.asarray(X_train, dtype=float)
    y_train = np.asarray(y_train, dtype=float)
    # TODO: (X_train.T @ X_train + lam * np.eye(d)) als System loesen
    ...


def compare(seed):
    """Vergleiche Mittelwert-Baseline gegen Ridge auf identischem, seeded Split.

    Liefert ein Dictionary mit:
    {'seed': int, 'n_train': int, 'n_test': int, 'rmse_mean': float, 'rmse_ridge': float}
    Zwei Aufrufe mit demselben Seed muessen exakt dasselbe Dictionary liefern.
    """
    X, y = load_dataset(seed)
    train_idx, test_idx = split_indices(len(y), seed)
    # TODO: Split anwenden, Baseline und Ridge fitten, beide RMSE berechnen
    ...


def repro_check(seed):
    """True, wenn zwei compare-Laeufe mit demselben Seed identisch sind."""
    # TODO: compare(seed) zweimal aufrufen und vergleichen
    ...
