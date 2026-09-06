"""Karten-Validator des RAG-Capstone (Lernenden-Starter).

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
    """Leerstring, leere Liste oder None gelten als nicht ausgefuellt."""
    ...


def validate_card(card, schema_key):
    """{'status': 'ok'|'fehler', 'fehlende_felder': [...], 'typfehler': [...],
    'leere_werte': [...]} fuer eine Karte als dict."""
    ...


def validate_cards_dir(cards_dir):
    """Prueft alle Karten in einem Verzeichnis gegen CARD_SCHEMAS.

    Rueckgabe: {'dateien': {dateiname: bericht}, 'status': 'ok'|'fehler'}.
    Fehlende Dateien melden status 'fehler' mit fehlende_felder ['<datei>'].
    """
    ...
