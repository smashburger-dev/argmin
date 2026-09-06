"""Metrik-Bausteine des RAG-Capstone (Lernenden-Starter).

Precision/Recall@k plus Subgruppen-Recall, alles stdlib und deterministisch:
kein Netz, kein Zufall, keine Uhrzeit. Rundung auf sechs Stellen, damit die
JSON-Darstellung stabil bleibt.
"""


def precision_at_k(ranked, relevant, k):
    """|top-k ∩ relevant| / k — wie viele der Top-k sind relevant."""
    # TODO: set(ranked[:k]) & set(relevant), geteilt durch k
    ...


def recall_at_k(ranked, relevant, k):
    """|top-k ∩ relevant| / |relevant| — wie viele der relevanten oben liegen."""
    # TODO: leere relevant-Liste -> 0.0 (keine Division durch null)
    ...


def mean(values):
    """Arithmetisches Mittel (0.0 bei leerer Liste, statt ZeroDivisionError)."""
    ...


def evaluate_query(item, order, scores, k):
    """Per-Query-Datensatz mit Retrieval-Status und Beitraegen zu den Metriken.

    retrieval_status: 'ok' wenn der Top-Score > 0 ist, sonst 'leer'
    (Retrieval-Fehler, getrennt von Antwort-Fehlern). Ohne Treffer zaehlen
    recall und precision als 0.0. Rueckgabe-Schluessel:
    query, subgroup, retrieval_status, recall, precision (auf 6 Stellen).
    """
    ...


def aggregate(records):
    """Gesamtmetriken plus Subgruppen-Recall-Tabelle ueber die Datensaetze.

    overall: queries, recall_at_k, precision_at_k, answered, retrieval_fehler
    (jeweils Mittelwerte bzw. Zaehlungen, gerundet auf 6 Stellen).
    subgroups: {label: recall-mittelwert} ueber sortierte Labels.
    """
    ...
