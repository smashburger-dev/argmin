"""Deterministisches Kostenmodell des RAG-Capstone (Lernenden-Starter).

Token-Naeherung: Woerter zaehlen (Whitespace-Split, leer bleibt leer).
Preise kommen aus config/experiment.json (fiktive Bildungspreise, EUR je
1000 Tokens). Kein Netz, keine echte Abrechnung.
"""


def count_tokens(text):
    """Naehrungstokens = Anzahl der Whitespace-getrennten Woerter."""
    ...


def kosten_lauf(antworten, docs, prices):
    """Kostenbericht eines Laufs.

    antworten: Liste {'query': str, 'doc': int|None, 'antwort': str}.
    Input-Tokens: Anfrage plus (falls getroffen) das beste Dokument komplett;
    Output-Tokens: die gegebene Antwort (inklusive 'kein treffer').
    Rueckgabe: {'tokens_input': int, 'tokens_output': int,
    'kosten_eur': auf 4 Stellen gerundet}.
    """
    ...
