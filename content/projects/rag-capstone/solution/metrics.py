"""Metrik-Bausteine des RAG-Capstone (Loesung zu src/metrics.py).

Precision/Recall@k plus Subgruppen-Recall, alles stdlib und deterministisch:
kein Netz, kein Zufall, keine Uhrzeit. Rundung auf sechs Stellen, damit die
JSON-Darstellung stabil bleibt.
"""


def precision_at_k(ranked, relevant, k):
    """|top-k ∩ relevant| / k — wie viele der Top-k sind relevant."""
    top = list(ranked[:k])
    return len(set(top) & set(relevant)) / k


def recall_at_k(ranked, relevant, k):
    """|top-k ∩ relevant| / |relevant| — wie viele der relevanten Dokumente oben liegen."""
    if not relevant:
        return 0.0
    return len(set(ranked[:k]) & set(relevant)) / len(set(relevant))


def mean(values):
    """Arithmetisches Mittel (0.0 bei leerer Liste, statt ZeroDivisionError)."""
    return sum(values) / len(values) if values else 0.0


def evaluate_query(item, order, scores, k):
    """Per-Query-Datensatz mit Retrieval-Status und Beitraegen zu den Metriken.

    retrieval_status: 'ok' wenn der Top-Score > 0 ist, sonst 'leer'
    (Retrieval-Fehler, getrennt von Antwort-Fehlern).
    """
    relevant = item["relevant"]
    retrieval_status = "ok" if (order and scores[order[0]] > 0) else "leer"
    if retrieval_status == "ok":
        recall = recall_at_k(order, relevant, k)
        precision = precision_at_k(order, relevant, k)
    else:
        recall = 0.0
        precision = 0.0
    return {
        "query": item["query"],
        "subgroup": item.get("subgroup", "alle"),
        "retrieval_status": retrieval_status,
        "recall": round(recall, 6),
        "precision": round(precision, 6),
    }


def aggregate(records):
    """Gesamtmetriken plus Subgruppen-Recall-Tabelle ueber die Datensaetze."""
    overall = {
        "queries": len(records),
        "recall_at_k": round(mean([r["recall"] for r in records]), 6),
        "precision_at_k": round(mean([r["precision"] for r in records]), 6),
        "answered": sum(1 for r in records if r["retrieval_status"] == "ok"),
        "retrieval_fehler": sum(1 for r in records if r["retrieval_status"] == "leer"),
    }
    labels = sorted({r["subgroup"] for r in records})
    subgroups = {
        label: round(mean([r["recall"] for r in records if r["subgroup"] == label]), 6)
        for label in labels
    }
    return {"overall": overall, "subgroups": subgroups}
