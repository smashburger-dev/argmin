"""RAG-Capstone-Pipeline (Lernenden-Starter).

Kontrakt (siehe README.md und phases.json):
- Alles deterministisch: kein Netz, kein Zufall, keine echte Uhrzeit.
- Der Generator bleibt der W30-Stub: er waehlt nur Saetze aus den
  Fixtur-Dokumenten (src/w30_core.py, byte-identisch gepinnt).
- Kontrolle vor Wirkung: audit() prueft Anfrage UND bestes Dokument,
  request_action() arbeitet nach Least Privilege.
- Keine stillen Fallbacks: Stage-Ergebnisse tragen immer einen Sentinel-Status
  ('ok' | 'fehler' | 'timeout'), niemals einen Ersatzwert.
- assert_frozen() stellt vor jedem Lauf sicher, dass golden/, config/, tests/
  und src/w30_core.py exakt dem gepinnten Manifest entsprechen.

Arbeite die Phasen in phases.json von oben nach unten ab. Die vollstaendige
Referenzloesung liegt unter solution/pipeline.py (und solution/metrics.py,
solution/cost.py, solution/cards.py).
"""

import hashlib
import itertools
import json
import sys
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
# Make package imports work under pytest and under direct importlib loading.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src import cost as cost_mod
from src import metrics as metrics_mod
from src import w30_core

CONFIG_PATH = "config/experiment.json"
GOLDEN_QUERIES_PATH = "golden/golden_set.json"
GOLDEN_FIXTURES_PATH = "golden/injection_fixtures.json"
EXPECTED_RESULTS_PATH = "golden/expected_results.json"
MANIFEST_PATH = "check-manifest.json"
README_PATH = "README.md"
CARDS_DIR = "cards"

NO_HIT = "kein treffer"
BLOCK = "abgelehnt: injektionsverdacht"

# W35: Datenfluss-Stages mit IO-Vetraegen. 'inputs' benennt die Ausgaben
# anderer Stages; Schluessel ohne erzeugende Stage (hier: die beiden Dateien
# unter golden/) sind externe Eingaben. Die Reihenfolge liefert topo_order().
STAGE_CONTRACTS = [
    {"stage": "golden_laden", "inputs": ["golden_set", "injection_fixtures"], "outputs": ["eval_daten"]},
    {"stage": "retrieval", "inputs": ["eval_daten"], "outputs": ["rankings"]},
    {"stage": "sicherheit", "inputs": ["eval_daten", "rankings"], "outputs": ["audit_berichte"]},
    {"stage": "antwort", "inputs": ["rankings", "audit_berichte"], "outputs": ["antworten"]},
    {"stage": "metriken", "inputs": ["rankings", "audit_berichte"], "outputs": ["metriken"]},
    {"stage": "kosten", "inputs": ["antworten"], "outputs": ["kostenbericht"]},
    {"stage": "bericht", "inputs": ["metriken", "kostenbericht"], "outputs": ["endbericht"]},
]


# --- Gegebene Bausteine (Vertrag, nicht veraendern) ---------------------------------


def load_json(relpath, root=PROJECT_ROOT):
    """JSON-Datei relativ zum Projektstamm laden."""
    with open(Path(root) / relpath, encoding="utf-8") as handle:
        return json.load(handle)


def file_sha256(path):
    """sha256 einer Datei als Hexstring."""
    hasher = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def kanonisches_json(obj):
    """Stabile Serialisierung: sortierte Schluessel, keine Leerraeume."""
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


# Marker for absolute user paths; assembled so this file does not contain the
# literal itself and therefore cannot trip its own scan.
USER_PATH_MARKER = "/" + "Users" + "/"


# --- W35: Scope-Freeze, Manifest, Stages ---------------------------------------------


def detect_cycle(stages):
    """Sortierte Liste der Stagenamen in einem Zyklus, sonst None.

    Tipp: baue Stage -> Menge der Stages, deren Ausgaben sie konsumiert
    (Ausgabe-Schluessel -> erzeugende Stage aufloesen; Eingaben ohne
    erzeugende Stage sind externe Dateien). Alles, was nach wiederholtem
    Entfernen von Stages ohne offene Abhaengigkeiten uebrig bleibt, sitzt
    in einem Zyklus.
    """
    ...


def topo_order(stages):
    """Stagenamen in topologischer Reihenfolge (kleinster Name zuerst).

    Wirft ValueError, wenn die Stages einen Zyklus enthalten.
    """
    ...


def assert_frozen(root=PROJECT_ROOT, manifest_path=None):
    """Prueft alle requiredFiles aus dem Manifest.

    - sha256 == null: reine Anwesenheitspruefung (Lernenden-Datei).
    - sha256 als String: Datei muss exakt diesem Hash entsprechen.
    Wirft AssertionError mit allen Abweichungen, sonst gilt der Freeze.
    Rueckgabe: {'status': 'ok', 'gepruefte_dateien': anzahl}.
    """
    ...


def build_golden(root=PROJECT_ROOT):
    """Laedt Golden Set und Angriffs-Fixtures samt ihrer Hashes.

    Rueckgabe: {'queries': [...], 'fixtures': [...], 'aktionen': [...],
    'hashes': {'golden_set': sha256, 'injection_fixtures': sha256}}.
    """
    ...


# --- W30-Kern: Sicherheit und Stub-Antwort (wie im W30-Projekt geloest) --------------


def contains_injection(text, rules):
    """True, wenn eine Regelphrase (klein) im kleingeschriebenen Text vorkommt."""
    ...


def audit(query, docs=None, rules=None):
    """{'status': 'blockiert', 'grund': 'injektionsverdacht:…'} oder {'status': 'ok', 'grund': None}.

    Geprueft werden die Anfrage und das beste treffernde Dokument; die
    Grundteile werden mit '+' verbunden ('query', 'dokument').
    Standardwerte: w30_core.DOCS bzw. w30_core.INJECTION_RULES.
    """
    ...


def answer(query, docs=None, rules=None):
    """Stub-Generator: blockiert -> BLOCK; kein Treffer -> NO_HIT; sonst der
    erste Satz des besten Dokuments mit Anfragebegriff."""
    ...


def request_action(tool, arg, policy=None):
    """'erlaubt' | 'abgelehnt:argument-nicht-erlaubt' | 'abgelehnt:tool-verboten' | 'abgelehnt:werkzeug-unbekannt'.

    Reihenfolge: forbidden schlaegt restricted schlaegt allowed; unbekannt
    ist abgelehnt. Standard: w30_core.POLICY.
    """
    ...


# --- W36: Hauptfunktion, Timeouts mit virtueller Uhr, Sentinels ----------------------


def call_with_timeout(fn, budget_ms, clock):
    """Fuehrt fn aus und misst mit der uebergebenen (virtuellen) Uhr.

    {'status': 'ok', 'value': …, 'dauer_ms': …} oder
    {'status': 'timeout', 'budget_ms': …, 'dauer_ms': …}.
    Kein sleep, keine echte Zeit — die Uhr ist ein Parameter (zwei Aufrufe:
    vor und nach fn).
    """
    ...


def run_stage(name, fn, budget_ms, clock):
    """Stage-Ausfuehrung mit sichtbarem Fehlerzustand (kein stiller Fallback).

    {'status': 'ok', …} | {'status': 'timeout', …} |
    {'status': 'fehler', 'grund': 'Ausnahmetyp: meldung', 'stage': name}
    """
    ...


def run_query(item, docs, rules, k):
    """Vollstaendiger Per-Query-Datensatz: Retrieval und Antwort getrennt ausgewertet.

    Schluessel: query, subgroup, retrieval_status ('ok'|'leer'), recall,
    precision, doc (int|None), antwort (Text), antwort_status
    ('ok'|'kein_treffer'|'blockiert'). Blockierte Queries zaehlen recall und
    precision als 0.0 (beabsichtigte Daempfung wie in W30).
    """
    ...


def run(root=PROJECT_ROOT, config=None):
    """Config-getriebener End-to-End-Lauf ueber alle Stages (deterministisch).

    Rueckgabe bei Erfolg (status 'ok'): experiment_id, k, stages (topo),
    ausfuehrung ({stage: {'status', 'dauer_ms'}}), hashes (golden_set,
    injection_fixtures, config, w30_core), abfragen (Per-Query-Datensaetze),
    metriken (overall/subgroups/w30_teilmenge), sicherheit
    (fixtures/aktionen mit ist/soll/uebereinstimmung), kosten.
    Abbruch ist sichtbar: {'status': 'abgebrochen', 'fehlerhafte_stage': …,
    'ausfuehrung': …} — nie ein Ersatzwert.
    """
    ...


def run_digest(results):
    """sha256 ueber die kanonische Serialisierung des Ergebnisses."""
    ...


# --- W37: feste Evaluation und defensives Red-Team ----------------------------------


def evaluate_run(results, thresholds):
    """Regelwerk-Verdict: 'angenommen' | 'abgelehnt' | 'abgebrochen'.

    abgebrochen: Die Pipeline selbst lief nicht sauber durch (Status != 'ok').
    abgelehnt: Eine Schwelle (recall, precision, Subgruppen-Minimum, Kosten)
    oder eine Red-Team-Erwartung wurde verfehlt.
    Rueckgabe: {'verdict': …, 'pruefungen': [{'name', 'bestanden', 'ist', 'soll'}]}.
    """
    ...


def regression_table(results, baseline):
    """Vergleich der W30-Teilmenge gegen die eingefrorene W34-Baseline.

    {'baseline': {'recall_at_k', 'answered'}, 'aktuell': {...},
    'regression': True wenn aktuell unter baseline liegt}.
    """
    ...


# --- W38: Reproduktion und Dokumentation ---------------------------------------------


def fresh_double_run(root=PROJECT_ROOT):
    """Zwei frische Laeufe, Vergleich der Digeste.

    {'digest_1': …, 'digest_2': …, 'identisch': bool}.
    """
    ...


def check_readme(root=PROJECT_ROOT, headings=None):
    """Fehlende Pflichtueberschriften der README als Liste (leer = vollstaendig).

    {'fehlende_uberschriften': [...]} — Ueberschriften sind Zeilen, die mit
    '#' beginnen (ohne die Rauten verglichen).
    """
    ...


def pinned_versions_ok(pinned):
    """Pin-Verstoesse: Version-Specs mit Bereichs- oder Wildcard-Markern.

    {'verletzungen': ['name: spec', …]} — Marker: >=, <=, ~=, *.
    """
    ...


def scan_overclaims(text, phrases):
    """Gefundene Overclaim-Phrasen (kleingeschrieben, sortiert)."""
    ...


def scan_user_paths(root=PROJECT_ROOT, dirs=("src", "config", "golden", "tests")):
    """Findet absolute Benutzerpfade in Text-Quelldateien (Marker USER_PATH_MARKER).

    Nur lesbare Quelldateien (.py/.json/.md/.txt) zaehlen; generierte
    Bytecode-Ordner (__pycache__) werden uebersprungen.
    {'funde': [relativer_pfad, …]}
    """
    ...


# --- W39: Demo, Diagnose, Abnahme ----------------------------------------------------


def demo_metrics(root=PROJECT_ROOT):
    """Messwerte aus dem eingefrorenen Bericht, mit Assert gegen Neuberechnung.

    Die Demo erzaehlt nur eingefrorene Zahlen; weicht die Neuberechnung ab,
    wirft die Funktion AssertionError (kein stiller Fallback auf alte Werte).
    Rueckgabe: {'metriken': …, 'quelle': EXPECTED_RESULTS_PATH,
    'stimmt_mit_neuberechnung_ueberein': True}.
    """
    ...


def final_diagnosis(events):
    """Evidenzdiagnose ueber Ereignisse (Work Evidence zaehlt nicht als Mastery).

    Regeln: mindestens 2 unabhaengige Treffer (distinct Instanz), mindestens
    2 unterschiedliche Definitionen, mindestens 14 Tage zwischen erstem und
    letztem Treffer. Eine Loesungsanzeige ('loesungsanzeige') disqualifiziert
    ihre Instanz fuer Treffer UND Definitionen.
    Ereignis: {'tag': 'JJJJ-MM-TT', 'instanz': str, 'art':
    'hit'|'definition'|'loesungsanzeige'}.
    Rueckgabe: {'status': 'erfuellt'|'nicht_erfuellt', 'treffer', 'definitionen',
    'abstand_tage', 'disqualifizierte_instanzen', 'fehlende_gruende'}.
    """
    ...


def acceptance_report(root=PROJECT_ROOT):
    """Abnahme ueber alle Vertraege des Projekts (alles deterministisch lokal).

    Pruefungen (Name -> Bedeutung): manifest_gepinnt,
    w30_teilmenge_im_golden_set, regelwerk_verdict, keine_regression,
    doppellauf_identisch, readme_pflichtueberschriften, versionen_gepinnt,
    keine_overclaims (README und Karten), keine_benutzerpfade.
    Rueckgabe: {'verdict': 'angenommen'|'abgelehnt', 'pruefungen':
    [{'name', 'bestanden'}]}.
    """
    ...
