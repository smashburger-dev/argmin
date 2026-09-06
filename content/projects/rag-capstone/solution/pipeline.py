"""RAG-Capstone-Pipeline (Loesung zu src/pipeline.py).

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


# --- W35: Scope-Freeze, Manifest, Stages ---------------------------------------------


def _stufe_fuer_ausgabe(stages):
    """Mapping Ausgabe-Schluessel -> erzeugende Stage."""
    mapping = {}
    for stage in stages:
        for ausgabe in stage.get("outputs", []):
            mapping[ausgabe] = stage["stage"]
    return mapping


def _abhaengigkeiten(stages):
    """Stage -> Menge der Stages, deren Ausgaben sie konsumiert."""
    mapping = _stufe_fuer_ausgabe(stages)
    return {
        stage["stage"]: {mapping[eingabe] for eingabe in stage.get("inputs", []) if eingabe in mapping}
        for stage in stages
    }


def detect_cycle(stages):
    """Sortierte Liste der Stagenamen in einem Zyklus, sonst None."""
    abhaengigkeiten = _abhaengigkeiten(stages)
    offene = set(abhaengigkeiten)
    fortgang = True
    while offene and fortgang:
        fortgang = False
        for name in sorted(offene):
            if not (abhaengigkeiten[name] & offene):
                offene.discard(name)
                fortgang = True
    return sorted(offene) if offene else None


def topo_order(stages):
    """Stagenamen in topologischer Reihenfolge (kleinster Name zuerst).

    Wirft ValueError, wenn die Stages einen Zyklus enthalten.
    """
    zyklus = detect_cycle(stages)
    if zyklus is not None:
        raise ValueError("zyklen entdeckt: " + ", ".join(zyklus))
    abhaengigkeiten = _abhaengigkeiten(stages)
    erledigt = []
    offene = set(abhaengigkeiten)
    while offene:
        bereit = sorted(name for name in offene if not (abhaengigkeiten[name] & offene))
        if not bereit:
            raise ValueError("zyklen entdeckt: " + ", ".join(sorted(offene)))
        naechster = bereit[0]
        erledigt.append(naechster)
        offene.discard(naechster)
    return erledigt


def assert_frozen(root=PROJECT_ROOT, manifest_path=None):
    """Prueft alle requiredFiles aus dem Manifest.

    - sha256 == null: reine Anwesenheitspruefung (Lernenden-Datei).
    - sha256 als String: Datei muss exakt diesem Hash entsprechen.
    Wirft AssertionError mit allen Abweichungen, sonst gilt der Freeze.
    """
    root = Path(root)
    manifest = load_json(manifest_path or MANIFEST_PATH, root=root)
    abweichungen = []
    for eintrag in manifest["requiredFiles"]:
        pfad = root / eintrag["path"]
        if not pfad.exists():
            abweichungen.append(eintrag["path"] + ": fehlt")
            continue
        if eintrag.get("sha256") is None:
            continue
        ist = file_sha256(pfad)
        if ist != eintrag["sha256"]:
            abweichungen.append(eintrag["path"] + ": hash weicht ab")
    if abweichungen:
        raise AssertionError("freeze verletzt: " + "; ".join(abweichungen))
    return {"status": "ok", "gepruefte_dateien": len(manifest["requiredFiles"])}


def build_golden(root=PROJECT_ROOT):
    """Laedt Golden Set und Angriffs-Fixtures samt ihrer Hashes."""
    root = Path(root)
    return {
        "queries": load_json(GOLDEN_QUERIES_PATH, root=root)["queries"],
        "fixtures": load_json(GOLDEN_FIXTURES_PATH, root=root)["fixtures"],
        "aktionen": load_json(GOLDEN_FIXTURES_PATH, root=root)["aktionen"],
        "hashes": {
            "golden_set": file_sha256(root / GOLDEN_QUERIES_PATH),
            "injection_fixtures": file_sha256(root / GOLDEN_FIXTURES_PATH),
        },
    }


# --- W30-Kern: Sicherheit und Stub-Antwort (wie im W30-Projekt geloest) --------------


def contains_injection(text, rules):
    """True, wenn eine Regelphrase (klein) im kleingeschriebenen Text vorkommt."""
    t = text.lower()
    return any(rule in t for rule in rules)


def audit(query, docs=None, rules=None):
    """{'status': 'blockiert', 'grund': 'injektionsverdacht:…'} oder {'status': 'ok', 'grund': None}."""
    docs = w30_core.DOCS if docs is None else docs
    rules = w30_core.INJECTION_RULES if rules is None else rules
    reasons = []
    if contains_injection(query, rules):
        reasons.append("query")
    best = w30_core.best_doc(query, docs)
    if best is not None and contains_injection(docs[best], rules):
        reasons.append("dokument")
    if reasons:
        return {"status": "blockiert", "grund": "injektionsverdacht:" + "+".join(reasons)}
    return {"status": "ok", "grund": None}


def answer(query, docs=None, rules=None):
    """Stub-Generator: blockiert -> BLOCK; kein Treffer -> NO_HIT; sonst Satz kopieren."""
    docs = w30_core.DOCS if docs is None else docs
    rules = w30_core.INJECTION_RULES if rules is None else rules
    if audit(query, docs, rules)["status"] == "blockiert":
        return BLOCK
    order, scores = w30_core.rank_docs(query, docs)
    if not order or scores[order[0]] == 0:
        return NO_HIT
    sentences = [s.strip() for s in docs[order[0]].split(".") if s.strip()]
    q_terms = w30_core.terms(query)
    for sentence in sentences:
        if q_terms & w30_core.terms(sentence):
            return sentence
    return sentences[0]


def request_action(tool, arg, policy=None):
    """'erlaubt' | 'abgelehnt:argument-nicht-erlaubt' | 'abgelehnt:tool-verboten' | 'abgelehnt:werkzeug-unbekannt'."""
    policy = w30_core.POLICY if policy is None else policy
    if tool in policy["forbidden"]:
        return "abgelehnt:tool-verboten"
    if tool in policy.get("restricted", {}):
        return "erlaubt" if arg in policy["restricted"][tool] else "abgelehnt:argument-nicht-erlaubt"
    if tool in policy["allowed"]:
        return "erlaubt"
    return "abgelehnt:werkzeug-unbekannt"


# --- W36: Hauptfunktion, Timeouts mit virtueller Uhr, Sentinels ----------------------


def call_with_timeout(fn, budget_ms, clock):
    """Fuehrt fn aus und misst mit der uebergebenen (virtuellen) Uhr.

    {'status': 'ok', 'value': …, 'dauer_ms': …} oder
    {'status': 'timeout', 'budget_ms': …, 'dauer_ms': …}.
    Kein sleep, keine echte Zeit — die Uhr ist ein Parameter.
    """
    start = clock()
    value = fn()
    dauer = clock() - start
    if dauer > budget_ms:
        return {"status": "timeout", "budget_ms": budget_ms, "dauer_ms": dauer}
    return {"status": "ok", "value": value, "dauer_ms": dauer}


def run_stage(name, fn, budget_ms, clock):
    """Stage-Ausfuehrung mit sichtbarem Fehlerzustand (kein stiller Fallback).

    {'status': 'ok', …} | {'status': 'timeout', …} | {'status': 'fehler', 'grund': …}
    """
    try:
        report = call_with_timeout(fn, budget_ms, clock)
    except Exception as exc:  # noqa: BLE001 - Fehler sollen sichtbar bleiben, nicht verschwinden
        return {"status": "fehler", "grund": f"{type(exc).__name__}: {exc}", "stage": name}
    if report["status"] == "timeout":
        return {"status": "timeout", "budget_ms": report["budget_ms"], "dauer_ms": report["dauer_ms"], "stage": name}
    return {"status": "ok", "value": report["value"], "dauer_ms": report["dauer_ms"], "stage": name}


def run_query(item, docs, rules, k):
    """Vollstaendiger Per-Query-Datensatz: Retrieval und Antwort getrennt ausgewertet."""
    query = item["query"]
    order, scores = w30_core.rank_docs(query, docs)
    treffer = bool(order) and scores[order[0]] > 0
    best = order[0] if treffer else None
    audit_bericht = audit(query, docs, rules)
    text = answer(query, docs, rules)
    if audit_bericht["status"] == "blockiert":
        antwort_status = "blockiert"
    elif text == NO_HIT:
        antwort_status = "kein_treffer"
    else:
        antwort_status = "ok"
    datensatz = metrics_mod.evaluate_query(item, order, scores, k)
    if audit_bericht["status"] == "blockiert":
        # Beabsichtigte Daempfung wie in W30: blockierte Queries zaehlen 0.
        datensatz["recall"] = 0.0
        datensatz["precision"] = 0.0
    datensatz["doc"] = best
    datensatz["antwort"] = text
    datensatz["antwort_status"] = antwort_status
    return datensatz


class _StageAbbruch(Exception):
    """Interne Signal: eine Stage ist fehlgeschlagen oder ueberzogen."""


def _bericht_kurz(bericht):
    """Ausfuehrungsbericht ohne Riesenwerte (nur Status, Zeit, Fehlergrund)."""
    kurz = {"status": bericht["status"], "dauer_ms": bericht.get("dauer_ms", 0)}
    if "grund" in bericht:
        kurz["grund"] = bericht["grund"]
    if "budget_ms" in bericht:
        kurz["budget_ms"] = bericht["budget_ms"]
    return kurz


def run(root=PROJECT_ROOT, config=None):
    """Config-getriebener End-to-End-Lauf ueber alle Stages (deterministisch).

    Abbruch ist sichtbar: scheitert eine Stage, lautet der Status 'abgebrochen'
    mit fehlerhafter Stage — es gibt keinen Ersatzwert.
    """
    root = Path(root)
    config = dict(config) if config is not None else load_json(CONFIG_PATH, root=root)
    budget = config.get("timeouts_ms", {}).get("stage_budget", 200)
    # Virtuelle Uhr: ein Tick pro clock()-Aufruf, keine echte Zeitmessung.
    tick = itertools.count()
    clock = lambda: next(tick)

    docs = w30_core.DOCS
    rules = config["injection_rules"]
    k = config["k"]
    ausfuehrung = {}

    def stage(name, fn):
        bericht = run_stage(name, fn, budget, clock)
        ausfuehrung[name] = bericht
        if bericht["status"] != "ok":
            raise _StageAbbruch(name)
        return bericht["value"]

    try:
        golden = stage("golden_laden", lambda: build_golden(root))
        if not isinstance(golden, dict) or "queries" not in golden:
            raise _StageAbbruch("golden_laden")

        rankings = stage("retrieval", lambda: [
            {"query": item["query"], "order": list(order), "scores": list(scores)}
            for item, (order, scores) in (
                (item, w30_core.rank_docs(item["query"], docs)) for item in golden["queries"]
            )
        ])
        if not isinstance(rankings, list):
            raise _StageAbbruch("retrieval")

        sicherheit = stage("sicherheit", lambda: _sicherheitsbericht(golden, docs, rules, config))
        if not isinstance(sicherheit, dict):
            raise _StageAbbruch("sicherheit")

        datensaetze = stage("antwort", lambda: [run_query(item, docs, rules, k) for item in golden["queries"]])
        if not isinstance(datensaetze, list):
            raise _StageAbbruch("antwort")

        w30_fragetexte = {item["query"] for item in w30_core.QUERIES}
        metriken = stage("metriken", lambda: {
            **metrics_mod.aggregate(datensaetze),
            "w30_teilmenge": metrics_mod.aggregate([d for d in datensaetze if d["query"] in w30_fragetexte])["overall"],
        })
        if not isinstance(metriken, dict):
            raise _StageAbbruch("metriken")

        kosten = stage("kosten", lambda: cost_mod.kosten_lauf(
            [{"query": d["query"], "doc": d["doc"], "antwort": d["antwort"]} for d in datensaetze],
            docs,
            config["token_prices"],
        ))
        if not isinstance(kosten, dict):
            raise _StageAbbruch("kosten")

        ergebnis = stage("bericht", lambda: {
            "status": "ok",
            "experiment_id": config["experimentId"],
            "k": k,
            "stages": topo_order(STAGE_CONTRACTS),
            "ausfuehrung": None,  # wird unten ersetzt
            "hashes": {
                "golden_set": golden["hashes"]["golden_set"],
                "injection_fixtures": golden["hashes"]["injection_fixtures"],
                "config": file_sha256(root / CONFIG_PATH),
                "w30_core": file_sha256(root / "src" / "w30_core.py"),
            },
            "abfragen": datensaetze,
            "metriken": metriken,
            "sicherheit": sicherheit,
            "kosten": kosten,
        })
    except _StageAbbruch as abbruch:
        return {
            "status": "abgebrochen",
            "fehlerhafte_stage": abbruch.args[0],
            "ausfuehrung": {name: _bericht_kurz(bericht) for name, bericht in ausfuehrung.items()},
        }
    ergebnis["ausfuehrung"] = {name: _bericht_kurz(bericht) for name, bericht in ausfuehrung.items()}
    return ergebnis


def _sicherheitsbericht(golden, docs, rules, config):
    fixtures = []
    for fix in golden["fixtures"]:
        ist = audit(fix["text"], docs, rules)
        soll = fix["erwartet"]
        fixtures.append({
            "id": fix["id"],
            "ist": ist,
            "soll": soll,
            "uebereinstimmung": ist == soll,
        })
    aktionen = []
    for aktion in golden["aktionen"]:
        ist = request_action(aktion["tool"], aktion["arg"], config.get("policy"))
        aktionen.append({
            "tool": aktion["tool"],
            "arg": aktion["arg"],
            "ist": ist,
            "soll": aktion["erwartet"],
            "uebereinstimmung": ist == aktion["erwartet"],
        })
    return {"fixtures": fixtures, "aktionen": aktionen}


def run_digest(results):
    """sha256 ueber die kanonische Serialisierung des Ergebnisses."""
    return hashlib.sha256(kanonisches_json(results).encode("utf-8")).hexdigest()


# --- W37: feste Evaluation und defensives Red-Team ----------------------------------


def evaluate_run(results, thresholds):
    """Regelwerk-Verdict: 'angenommen' | 'abgelehnt' | 'abgebrochen'.

    abgebrochen: Die Pipeline selbst lief nicht sauber durch (Status != 'ok').
    abgelehnt: Eine Schwelle oder Sicherheits-Erwartung wurde verfehlt.
    """
    if results.get("status") != "ok":
        return {
            "verdict": "abgebrochen",
            "pruefungen": [{"name": "pipeline_status", "bestanden": False, "ist": results.get("status"), "soll": "ok"}],
        }
    overall = results["metriken"]["overall"]
    subgroups = results["metriken"]["subgroups"]
    pruefungen = [
        {
            "name": "recall_at_k",
            "bestanden": overall["recall_at_k"] >= thresholds["recall_at_k_min"],
            "ist": overall["recall_at_k"],
            "soll": thresholds["recall_at_k_min"],
        },
        {
            "name": "precision_at_k",
            "bestanden": overall["precision_at_k"] >= thresholds["precision_at_k_min"],
            "ist": overall["precision_at_k"],
            "soll": thresholds["precision_at_k_min"],
        },
        {
            "name": "subgroup_recall_min",
            "bestanden": min(subgroups.values()) >= thresholds["subgroup_recall_min"],
            "ist": min(subgroups.values()),
            "soll": thresholds["subgroup_recall_min"],
        },
        {
            "name": "kostenbudget",
            "bestanden": results["kosten"]["kosten_eur"] <= thresholds["max_kosten_eur"],
            "ist": results["kosten"]["kosten_eur"],
            "soll": thresholds["max_kosten_eur"],
        },
        {
            "name": "redteam_fixtures",
            "bestanden": all(f["uebereinstimmung"] for f in results["sicherheit"]["fixtures"]),
            "ist": sum(1 for f in results["sicherheit"]["fixtures"] if f["uebereinstimmung"]),
            "soll": len(results["sicherheit"]["fixtures"]),
        },
        {
            "name": "redteam_aktionen",
            "bestanden": all(a["uebereinstimmung"] for a in results["sicherheit"]["aktionen"]),
            "ist": sum(1 for a in results["sicherheit"]["aktionen"] if a["uebereinstimmung"]),
            "soll": len(results["sicherheit"]["aktionen"]),
        },
    ]
    verdict = "angenommen" if all(p["bestanden"] for p in pruefungen) else "abgelehnt"
    return {"verdict": verdict, "pruefungen": pruefungen}


def regression_table(results, baseline):
    """Vergleich der W30-Teilmenge gegen die eingefrorene W34-Baseline."""
    aktuell = results["metriken"]["w30_teilmenge"]
    vergleich = {
        "baseline": {"recall_at_k": baseline["recall_at_k"], "answered": baseline["answered"]},
        "aktuell": {"recall_at_k": aktuell["recall_at_k"], "answered": aktuell["answered"]},
        "regression": (
            aktuell["recall_at_k"] < baseline["recall_at_k"]
            or aktuell["answered"] < baseline["answered"]
        ),
    }
    return vergleich


# --- W38: Reproduktion und Dokumentation ---------------------------------------------


def fresh_double_run(root=PROJECT_ROOT):
    """Zwei frische Laeufe, Vergleich der Digeste (muss identisch sein)."""
    first = run(root=root)
    second = run(root=root)
    digest_a = run_digest(first)
    digest_b = run_digest(second)
    return {"digest_1": digest_a, "digest_2": digest_b, "identisch": digest_a == digest_b}


def check_readme(root=PROJECT_ROOT, headings=None):
    """Fehlende Pflichtueberschriften der README als Liste (leer = vollstaendig)."""
    root = Path(root)
    if headings is None:
        headings = load_json(CONFIG_PATH, root=root)["required_readme_headings"]
    text = (root / README_PATH).read_text(encoding="utf-8")
    zeilen = [zeile.strip().lstrip("#").strip() for zeile in text.splitlines() if zeile.strip().startswith("#")]
    return {"fehlende_uberschriften": [h for h in headings if h not in zeilen]}


def pinned_versions_ok(pinned):
    """Pin-Verstoesse: Version-Specs mit Bereichs- oder Wildcard-Markern."""
    marker = (">=", "<=", "~=", "*")
    verletzungen = sorted(
        f"{name}: {spec}"
        for name, spec in pinned.items()
        if any(m in str(spec) for m in marker)
    )
    return {"verletzungen": verletzungen}


def scan_overclaims(text, phrases):
    """Gefundene Overclaim-Phrasen (kleingeschrieben, sortiert)."""
    t = text.lower()
    return sorted(p for p in phrases if p in t)


# Marker for absolute user paths; assembled so this file does not contain the
# literal itself and therefore cannot trip its own scan.
USER_PATH_MARKER = "/" + "Users" + "/"


def scan_user_paths(root=PROJECT_ROOT, dirs=("src", "config", "golden", "tests")):
    """Findet den Benutzerpfad-Marker in Text-Quelldateien (USER_PATH_MARKER).

    Absolute Pfade des eigenen Rechners gehoeren nicht in Projektquellen.
    Nur lesbare Quelldateien zaehlen; generierte Bytecode-Ordner
    (__pycache__) werden uebersprungen, weil sie Pfade der Laufzeitumgebung
    einbetten und nicht zum Projektbestand gehoeren.
    """
    root = Path(root)
    text_suffixe = {".py", ".json", ".md", ".txt"}
    funde = []
    for ordner in dirs:
        basis = root / ordner
        if not basis.exists():
            continue
        for pfad in sorted(basis.rglob("*")):
            if not pfad.is_file() or pfad.suffix not in text_suffixe:
                continue
            if USER_PATH_MARKER in pfad.read_text(encoding="utf-8", errors="replace"):
                funde.append(str(pfad.relative_to(root)))
    return {"funde": funde}


# --- W39: Demo, Diagnose, Abnahme ----------------------------------------------------


def demo_metrics(root=PROJECT_ROOT):
    """Messwerte aus dem eingefrorenen Bericht, mit Assert gegen Neuberechnung.

    Die Demo erzaehlt nur eingefrorene Zahlen; weicht die Neuberechnung ab,
    wirft die Funktion AssertionError (kein stiller Fallback auf alte Werte).
    """
    root = Path(root)
    frozen = load_json(EXPECTED_RESULTS_PATH, root=root)
    results = run(root=root)
    if results["metriken"] != frozen["metriken"]:
        raise AssertionError("demo-abweichung: eingefrorene Metriken stimmen nicht mit der Neuberechnung ueberein")
    return {
        "metriken": frozen["metriken"],
        "quelle": EXPECTED_RESULTS_PATH,
        "stimmt_mit_neuberechnung_ueberein": True,
    }


def final_diagnosis(events):
    """Evidenzdiagnose ueber Ereignisse (Work Evidence zhlt nicht als Mastery).

    Regeln: mindestens 2 unabhaengige Treffer (distinct Instanz), mindestens
    2 unterschiedliche Definitionen, mindestens 14 Tage zwischen erstem und
    letztem Treffer. Eine Loesungsanzeige disqualifiziert ihre Instanz.
    """

    def parse(item):
        return date.fromisoformat(item["tag"])

    disqualifiziert = {e["instanz"] for e in events if e.get("art") == "loesungsanzeige"}
    treffer_instanzen = {
        e["instanz"]: parse(e) for e in events
        if e.get("art") == "hit" and e["instanz"] not in disqualifiziert
    }
    definitions_instanzen = {
        e["instanz"] for e in events
        if e.get("art") == "definition" and e["instanz"] not in disqualifiziert
    }
    treffer = len(treffer_instanzen)
    definitionen = len(definitions_instanzen)
    if treffer_instanzen:
        abstand = (max(treffer_instanzen.values()) - min(treffer_instanzen.values())).days
    else:
        abstand = 0
    gruende = []
    if treffer < 2:
        gruende.append("zu wenige unabhaengige treffer")
    if definitionen < 2:
        gruende.append("zu wenige unterschiedliche definitionen")
    if abstand < 14:
        gruende.append("abstand unter 14 tagen")
    return {
        "status": "erfuellt" if not gruende else "nicht_erfuellt",
        "treffer": treffer,
        "definitionen": definitionen,
        "abstand_tage": abstand,
        "disqualifizierte_instanzen": sorted(disqualifiziert),
        "fehlende_gruende": gruende,
    }


def acceptance_report(root=PROJECT_ROOT):
    """Abnahme ueber alle Vertraege des Projekts (alles deterministisch lokal)."""
    root = Path(root)
    config = load_json(CONFIG_PATH, root=root)
    results = run(root=root)
    pruefungen = []

    def pruefe(name, bestanden):
        pruefungen.append({"name": name, "bestanden": bool(bestanden)})

    try:
        freeze = assert_frozen(root=root)
        pruefe("manifest_gepinnt", freeze["status"] == "ok")
    except AssertionError:
        pruefe("manifest_gepinnt", False)

    golden_queries = {q["query"] for q in load_json(GOLDEN_QUERIES_PATH, root=root)["queries"]}
    pruefe("w30_teilmenge_im_golden_set", all(item["query"] in golden_queries for item in w30_core.QUERIES))
    pruefe("regelwerk_verdict", evaluate_run(results, config["thresholds"])["verdict"] == "angenommen")
    pruefe("keine_regression", regression_table(results, config["baseline"])["regression"] is False)
    pruefe("doppellauf_identisch", fresh_double_run(root=root)["identisch"])
    pruefe("readme_pflichtueberschriften", check_readme(root=root, headings=config["required_readme_headings"])["fehlende_uberschriften"] == [])
    pruefe("versionen_gepinnt", pinned_versions_ok(config["pinned_versions"])["verletzungen"] == [])

    texte = [(root / README_PATH).read_text(encoding="utf-8")]
    karten_pfad = root / CARDS_DIR
    if karten_pfad.exists():
        for pfad in sorted(karten_pfad.glob("*.json")):
            text = pfad.read_text(encoding="utf-8")
            if text:
                texte.append(text)
    # Phrasen duerfen weder im README noch in Karten auftauchen.
    pruefe("keine_overclaims", all(not scan_overclaims(t, config["overclaim_phrases"]) for t in texte))
    pruefe("keine_benutzerpfade", scan_user_paths(root=root)["funde"] == [])

    verdict = "angenommen" if all(p["bestanden"] for p in pruefungen) else "abgelehnt"
    return {"verdict": verdict, "pruefungen": pruefungen}


if __name__ == "__main__":
    ergebnis = run()
    print("status:", ergebnis["status"])
    print("metriken:", kanonisches_json(ergebnis["metriken"]))
    print("kosten:", kanonisches_json(ergebnis["kosten"]))
    print("digest:", run_digest(ergebnis))
