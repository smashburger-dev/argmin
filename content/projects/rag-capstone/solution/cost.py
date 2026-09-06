"""Deterministisches Kostenmodell des RAG-Capstone (Loesung zu src/cost.py).

Token-Naeherung: Woerter zaehlen (Whitespace-Split, leer bleibt leer).
Preise kommen aus config/experiment.json (fiktive Bildungspreise, EUR je
1000 Tokens). Kein Netz, keine echte Abrechnung.
"""


def count_tokens(text):
    """Naehrungstokens = Anzahl der Whitespace-getrennten Woerter."""
    return len([w for w in text.split() if w.strip()])


def kosten_lauf(antworten, docs, prices):
    """Kostenbericht eines Laufs.

    antworten: Liste {'query': str, 'doc': int|None, 'antwort': str}.
    Input-Tokens: Anfrage plus (falls getroffen) das beste Dokument komplett;
    Output-Tokens: die gegebene Antwort (inklusive 'kein treffer').
    """
    tokens_input = 0
    tokens_output = 0
    for eintrag in antworten:
        tokens_input += count_tokens(eintrag["query"])
        if eintrag["doc"] is not None:
            tokens_input += count_tokens(docs[eintrag["doc"]])
        tokens_output += count_tokens(eintrag["antwort"])
    kosten = (
        tokens_input / 1000 * prices["input_per_1k_tokens_eur"]
        + tokens_output / 1000 * prices["output_per_1k_tokens_eur"]
    )
    return {
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "kosten_eur": round(kosten, 4),
    }
