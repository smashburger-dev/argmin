"""Karten-Validator des RAG-Capstone (Loesung zu src/cards.py).

Prueft data/model/system-card strukturell: Pflichtfeld vorhanden, richtiger
Typ, Wert nicht leer. Inhalte (ehrliche Grenzen, Provenienz) bleiben
menschliche Arbeitsevidenz und werden hier nicht bewertet.
"""

import json
from pathlib import Path

CARD_SCHEMAS = {
    "data-card.json": {
        "required": {
            "name": str,
            "zweck": str,
            "provenienz": str,
            "zeitraum": str,
            "subgruppen": list,
            "bekannte_limitierungen": list,
        }
    },
    "model-card.json": {
        "required": {
            "name": str,
            "typ": str,
            "trainingsdaten": str,
            "evaluationsrahmen": str,
            "bekannte_limitierungen": list,
        }
    },
    "system-card.json": {
        "required": {
            "name": str,
            "komponenten": list,
            "sicherheitsregeln": list,
            "kostenmodell": str,
            "bekannte_limitierungen": list,
        }
    },
}


def _ist_leer(wert):
    if isinstance(wert, str):
        return not wert.strip()
    if isinstance(wert, list):
        return len(wert) == 0
    return wert is None


def validate_card(card, schema_key):
    """{'status': 'ok'|'fehler', 'fehlende_felder': [...], 'typfehler': [...],
    'leere_werte': [...]} fuer eine Karte als dict."""
    schema = CARD_SCHEMAS[schema_key]["required"]
    fehlende_felder = sorted(name for name in schema if name not in card)
    typfehler = [
        {"feld": name, "erwartet": schema[name].__name__, "ist": type(card[name]).__name__}
        for name in schema
        if name in card and not isinstance(card[name], schema[name])
    ]
    leere_werte = sorted(name for name in schema if name in card and isinstance(card[name], schema[name]) and _ist_leer(card[name]))
    status = "ok" if not (fehlende_felder or typfehler or leere_werte) else "fehler"
    return {
        "status": status,
        "fehlende_felder": fehlende_felder,
        "typfehler": typfehler,
        "leere_werte": leere_werte,
    }


def validate_cards_dir(cards_dir):
    """Prueft alle Karten in einem Verzeichnis gegen CARD_SCHEMAS.

    Rueckgabe: {'dateien': {dateiname: bericht}, 'status': 'ok'|'fehler'}.
    """
    cards_dir = Path(cards_dir)
    berichte = {}
    for dateiname in sorted(CARD_SCHEMAS):
        pfad = cards_dir / dateiname
        if not pfad.exists():
            berichte[dateiname] = {"status": "fehler", "fehlende_felder": ["<datei>"], "typfehler": [], "leere_werte": []}
            continue
        with open(pfad, encoding="utf-8") as handle:
            card = json.load(handle)
        berichte[dateiname] = validate_card(card, dateiname)
    status = "ok" if all(b["status"] == "ok" for b in berichte.values()) else "fehler"
    return {"dateien": berichte, "status": status}
