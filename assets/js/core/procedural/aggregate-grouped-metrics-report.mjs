// Procedural family aggregate-grouped-metrics-report: the task text, starter
// code and reference solver stay fixed; the seed draws fresh grouped fixtures
// (metric pairs with two-group labels, error-rate tables, error categorization
// records, recall rows) that get appended to the curated base test block as
// literal __check lines. Every drawn expectation is evaluated against a
// renamed __ref_ copy of the reference solver and __raised covers the
// ValueError paths, so the grading contract cannot drift. Mirrors
// reproduce-seeded-split.mjs.

import { RAISED_HELPER, refCopy } from './py_test_kit.mjs';

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/aggregate-grouped-metrics-report.json.
const CASE_PAYLOADS = {
  "hypothesis-report-groups": { "difficulty": "stretch", "packages": ["numpy"], "starterCode": "import numpy as np\n\n\ndef hypothesis_report(metric_a, metric_b, labels):\n    \"\"\"Return {'r', 'medians', 'share', 'verdict'} describing directions, not causes.\"\"\"\n    # normalize inputs, validate lengths and exactly two groups\n    # compute r, per-group medians of metric_a, share of rows with a > b\n    # derive three verdict lines from the statistics\n    ...\n", "baseTests": "rep = hypothesis_report([1.0, 2.0, 3.0, 4.0], [2.0, 4.0, 6.0, 9.0], [\"ctrl\", \"ctrl\", \"test\", \"test\"])\n__check('r gerundet', abs(rep[\"r\"] - round(float(np.corrcoef([1.0, 2.0, 3.0, 4.0], [2.0, 4.0, 6.0, 9.0])[0, 1]), 3)) < 1e-12)\n__check('median ctrl', abs(rep[\"medians\"][\"ctrl\"] - 1.5) < 1e-9)\n__check('median test', abs(rep[\"medians\"][\"test\"] - 3.5) < 1e-9)\n__check('share a > b', abs(rep[\"share\"] - 0.0) < 1e-9)\n__check('verdict korrelation', any(\"positiv\" in line for line in rep[\"verdict\"]))\n__check('verdict median gruppe', any(\"test\" in line for line in rep[\"verdict\"]))\nrep2 = hypothesis_report([5.0, 3.0, 8.0, 1.0], [2.0, 2.0, 1.0, 0.5], [\"a\", \"b\", \"a\", \"b\"])\n__check('share a > b 100%', abs(rep2[\"share\"] - 1.0) < 1e-9)\nrep3 = hypothesis_report([1.0, 2.0, 3.0, 4.0], [4.0, 3.0, 2.0, 1.0], [\"a\", \"a\", \"b\", \"b\"])\n__check('verdict negativ', any(\"negativ\" in line for line in rep3[\"verdict\"]))\n__check('r = -1 bei antiproportional', abs(rep3[\"r\"] - (-1.0)) < 1e-9)\n__check('median gruppe b vor a', any(\"staerkerer median: b\" == line for line in rep3[\"verdict\"]))\ntry:\n    hypothesis_report([1.0, 2.0], [1.0], [\"a\", \"b\"])\n    __check('Laengenfehler -> ValueError', False, 'kein ValueError')\nexcept ValueError:\n    __check('Laengenfehler -> ValueError', True)\ntry:\n    hypothesis_report([1.0, 2.0], [1.0, 2.0], [\"a\", \"a\"])\n    __check('eine Gruppe -> ValueError', False, 'kein ValueError')\nexcept ValueError:\n    __check('eine Gruppe -> ValueError', True)", "referenceSolver": "import numpy as np\n\ndef hypothesis_report(metric_a, metric_b, labels):\n    a = np.asarray(metric_a, dtype=float)\n    b = np.asarray(metric_b, dtype=float)\n    if not (a.shape == b.shape and len(labels) == a.size):\n        raise ValueError(\"Eingabelaengen passen nicht zusammen\")\n    distinct = sorted(set(labels))\n    if len(distinct) != 2:\n        raise ValueError(\"genau zwei Gruppen erwartet\")\n    r = float(np.corrcoef(a, b)[0, 1])\n    label_arr = np.asarray(labels)\n    medians = {}\n    for label in distinct:\n        medians[label] = float(np.median(a[label_arr == label]))\n    share = float(np.mean(a > b))\n    lines = [\n        \"korrelation: \" + (\"positiv\" if r > 0 else \"negativ\" if r < 0 else \"null\"),\n        \"staerkerer median: \" + (distinct[0] if medians[distinct[0]] >= medians[distinct[1]] else distinct[1]),\n        \"anteil a > b: \" + str(int(round(100 * share))) + \" %\",\n    ]\n    return {\n        \"r\": round(r, 3),\n        \"medians\": {k: round(v, 3) for k, v in medians.items()},\n        \"share\": round(share, 3),\n        \"verdict\": lines,\n    }", "prompt": "Final Boss EDA-Bericht: Implementiere <code>hypothesis_report(metric_a, metric_b, labels)</code>. Eingabe: drei gleich lange Folgen — <code>metric_a</code> und <code>metric_b</code> sind Zahlenlisten, <code>labels</code> ordnet jede Zeile einer Gruppe zu und enthält genau zwei verschiedene Werte. Rückgabe: ein Dictionary mit <code>\"r\"</code> (Korrelation zwischen metric_a und metric_b, gerundet auf 3 Dezimalen), <code>\"medians\"</code> (Dictionary Gruppe → Median von metric_a innerhalb der Gruppe, je auf 3 Dezimalen gerundet), <code>\"share\"</code> (Anteil der Zeilen mit metric_a &gt; metric_b, auf 3 Dezimalen gerundet) und <code>\"verdict\"</code>: eine Liste von genau drei Zeilen — <code>\"korrelation: positiv\"</code> bzw. <code>\"negativ\"</code> bzw. <code>\"null\"</code> je nach Vorzeichen von r, <code>\"staerkerer median: &lt;gruppe&gt;\"</code> für die Gruppe mit dem größeren Median von metric_a (bei Gleichheit die alphabetisch erste) und <code>\"anteil a &gt; b: &lt;ganzzahl&gt; %\"</code>. Wirf <code>ValueError</code>, wenn die Längen nicht zusammenpassen oder labels nicht genau zwei verschiedene Werte hat. Der Bericht beschreibt Richtungen — keine Kausalaussagen.", "fullSolution": "def hypothesis_report(metric_a, metric_b, labels):\n    a = np.asarray(metric_a, dtype=float)\n    b = np.asarray(metric_b, dtype=float)\n    if not (a.shape == b.shape and len(labels) == a.size):\n        raise ValueError(\"Eingabelaengen passen nicht zusammen\")\n    distinct = sorted(set(labels))\n    if len(distinct) != 2:\n        raise ValueError(\"genau zwei Gruppen erwartet\")\n    r = float(np.corrcoef(a, b)[0, 1])\n    label_arr = np.asarray(labels)\n    medians = {}\n    for label in distinct:\n        medians[label] = float(np.median(a[label_arr == label]))\n    share = float(np.mean(a > b))\n    lines = [\n        \"korrelation: \" + (\"positiv\" if r > 0 else \"negativ\" if r < 0 else \"null\"),\n        \"staerkerer median: \" + (distinct[0] if medians[distinct[0]] >= medians[distinct[1]] else distinct[1]),\n        \"anteil a > b: \" + str(int(round(100 * share))) + \" %\",\n    ]\n    return {\n        \"r\": round(r, 3),\n        \"medians\": {k: round(v, 3) for k, v in medians.items()},\n        \"share\": round(share, 3),\n        \"verdict\": lines,\n    }\n\n# report([1,2,3,4], [2,4,6,9], [\"ctrl\",\"ctrl\",\"test\",\"test\"]):\n# r 0.994, medians {'ctrl': 1.5, 'test': 3.5}, share 0.0,\n# verdict ['korrelation: positiv', 'staerkerer median: test', 'anteil a > b: 0 %']" },
  "subgroup-error-rates-numpy": { "difficulty": "core", "packages": ["numpy"], "starterCode": "import numpy as np\n\ndef subgroup_error_rates(y_true, y_pred, groups):\n    # return {group: errors / count} as float per group\n    # ValueError if the three inputs differ in length\n    ...\n\ndef largest_gap(rates):\n    # difference between the highest and the lowest rate; ValueError on empty dict\n    ...\n", "baseTests": "import numpy as np\n\ny_true = [1, 0, 1, 0, 1, 0, 1, 1, 0, 0]\ny_pred = [1, 0, 1, 0, 1, 1, 0, 0, 0, 0]\ngroups = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'C', 'C']\nrates = subgroup_error_rates(y_true, y_pred, groups)\n__check('drei Gruppen als Schluessel', set(str(k) for k in rates.keys()) == {'A', 'B', 'C'})\n__check('Fehlerrate A = 0/4 = 0.0', abs(float(rates['A']) - 0.0) < 1e-12)\n__check('Fehlerrate B = 3/4 = 0.75', abs(float(rates['B']) - 0.75) < 1e-12)\n__check('Fehlerrate C = 0/2 = 0.0', abs(float(rates['C']) - 0.0) < 1e-12)\n__check('largest_gap = 0.75 - 0.0 = 0.75', abs(largest_gap(rates) - 0.75) < 1e-12)\n__check('eine Gruppe: Rate 1/2', subgroup_error_rates([1, 0], [1, 1], ['X', 'X']) == {'X': 0.5})\n__check('largest_gap mit einer Gruppe = 0', abs(largest_gap({'X': 0.5})) < 1e-12)\ntry:\n    subgroup_error_rates([1, 0], [1], ['X', 'X'])\n    __check('ValueError bei Laengen-Mismatch', False, 'kein ValueError geworfen')\nexcept ValueError:\n    __check('ValueError bei Laengen-Mismatch', True)\nexcept Exception as e:\n    __check('ValueError bei Laengen-Mismatch', False, 'falscher Fehlertyp: ' + type(e).__name__)\n", "referenceSolver": "import numpy as np\n\ndef subgroup_error_rates(y_true, y_pred, groups):\n    '''Error rate per group {group: errors / count}; ValueError on length mismatch.'''\n    y_true = list(y_true)\n    y_pred = list(y_pred)\n    groups = list(groups)\n    if not (len(y_true) == len(y_pred) == len(groups)):\n        raise ValueError('y_true, y_pred and groups must have equal length')\n    stats = {}\n    for t, p, g in zip(y_true, y_pred, groups):\n        if g not in stats:\n            stats[g] = [0, 0]\n        stats[g][1] += 1\n        if t != p:\n            stats[g][0] += 1\n    return {g: errors / total for g, (errors, total) in stats.items()}\n\ndef largest_gap(rates):\n    '''Difference between the highest and the lowest rate.'''\n    if not rates:\n        raise ValueError('rates must not be empty')\n    values = [float(v) for v in rates.values()]\n    return float(max(values) - min(values))\n", "prompt": "Implementiere die Teilgruppen-Analyse. `subgroup_error_rates(y_true, y_pred, groups)`: drei gleich lange Eingänge (Listen oder 1-d-Arrays); Rückgabe ein dict, das jeder vorkommenden Gruppe ihre Fehlerrate `fehler / anzahl` als float zuordnet; bei unterschiedlich langen Eingängen wirf `ValueError`. `largest_gap(rates)`: nimmt das Ergebnis-dict und gibt die Differenz zwischen höchster und niedrigster Fehlerrate als float zurück; für ein leeres dict wirf `ValueError`. Kontrolle: y_true = [1,0,1,0,1,0,1,1,0,0], y_pred = [1,0,1,0,1,1,0,0,0,0], groups = ['A','A','A','A','B','B','B','B','C','C'] → A 0/4, B 3/4, C 0/2, largest_gap 0.75.", "fullSolution": "import numpy as np\n\ndef subgroup_error_rates(y_true, y_pred, groups):\n    '''Error rate per group {group: errors / count}; ValueError on length mismatch.'''\n    y_true = list(y_true)\n    y_pred = list(y_pred)\n    groups = list(groups)\n    if not (len(y_true) == len(y_pred) == len(groups)):\n        raise ValueError('y_true, y_pred and groups must have equal length')\n    stats = {}\n    for t, p, g in zip(y_true, y_pred, groups):\n        if g not in stats:\n            stats[g] = [0, 0]\n        stats[g][1] += 1\n        if t != p:\n            stats[g][0] += 1\n    return {g: errors / total for g, (errors, total) in stats.items()}\n\ndef largest_gap(rates):\n    '''Difference between the highest and the lowest rate.'''\n    if not rates:\n        raise ValueError('rates must not be empty')\n    values = [float(v) for v in rates.values()]\n    return float(max(values) - min(values))\n", "competencyIds": ["c-ml-erroranalysis"] },
  "categorize-errors-report": { "difficulty": "stretch", "packages": ["numpy"], "starterCode": "def categorize_errors(errors):\n    # errors: list of {'id', 'kind', 'group'}\n    # return counts by kind, counts by group, share by group (count / total),\n    # and extreme_groups {'highest', 'lowest', 'difference'}\n    # ties go to first-seen order; ValueError on missing keys or empty list\n    ...\n\ndef model_card_stub(metrics_by_group):\n    # higher metric is better; worst_group has the LOWEST value\n    # return {'intended_use', 'metric_by_group', 'worst_group', 'known_limitation'}\n    ...\n", "baseTests": "errors = [\n    {'id': 1, 'kind': 'drift', 'group': 'A'},\n    {'id': 2, 'kind': 'label_noise', 'group': 'B'},\n    {'id': 3, 'kind': 'subgroup', 'group': 'B'},\n    {'id': 4, 'kind': 'drift', 'group': 'B'},\n    {'id': 5, 'kind': 'label_noise', 'group': 'B'},\n    {'id': 6, 'kind': 'subgroup', 'group': 'B'},\n    {'id': 7, 'kind': 'drift', 'group': 'C'},\n    {'id': 8, 'kind': 'subgroup', 'group': 'C'},\n]\nr = categorize_errors(errors)\n__check('counts_by_kind exakt', dict(r['counts_by_kind']) == {'drift': 3, 'label_noise': 2, 'subgroup': 3})\n__check('counts_by_group exakt', dict(r['counts_by_group']) == {'A': 1, 'B': 5, 'C': 2})\n__check('Anteile: A 0.125, B 0.625, C 0.25', all(abs(float(r['share_by_group'][g]) - v) < 1e-12 for g, v in [('A', 0.125), ('B', 0.625), ('C', 0.25)]))\nex = r['extreme_groups']\n__check('extreme_groups: hoechste B, tiefste A, Differenz 0.5', str(ex['highest']) == 'B' and str(ex['lowest']) == 'A' and abs(float(ex['difference']) - 0.5) < 1e-12)\ncard = model_card_stub({'A': 0.9, 'B': 0.55, 'C': 0.8})\n__check('Modellkarte: worst_group ist B', str(card['worst_group']) == 'B')\n__check('Modellkarte: known_limitation nennt Gruppe B', 'B' in str(card['known_limitation']))\n__check('Modellkarte: Metriken uebernommen', dict(card['metric_by_group']) == {'A': 0.9, 'B': 0.55, 'C': 0.8})\ncard2 = model_card_stub({'fern': 0.7, 'nah': 0.95})\n__check('anderes Dict: worst_group fern', str(card2['worst_group']) == 'fern')\ntry:\n    categorize_errors([{'id': 9, 'kind': 'drift'}])\n    __check('ValueError bei fehlendem Schluessel', False, 'kein ValueError geworfen')\nexcept ValueError:\n    __check('ValueError bei fehlendem Schluessel', True)\nexcept Exception as e:\n    __check('ValueError bei fehlendem Schluessel', False, 'falscher Fehlertyp: ' + type(e).__name__)\ntry:\n    categorize_errors([])\n    __check('ValueError bei leerer Liste', False, 'kein ValueError geworfen')\nexcept ValueError:\n    __check('ValueError bei leerer Liste', True)\nexcept Exception as e:\n    __check('ValueError bei leerer Liste', False, 'falscher Fehlertyp: ' + type(e).__name__)\n", "referenceSolver": "def categorize_errors(errors):\n    '''Summarize errors by kind and group; identify extreme error-share groups.'''\n    if not errors:\n        raise ValueError('errors must not be empty')\n    counts_by_kind = {}\n    counts_by_group = {}\n    for e in errors:\n        if 'kind' not in e or 'group' not in e:\n            raise ValueError('each error needs kind and group')\n        counts_by_kind[e['kind']] = counts_by_kind.get(e['kind'], 0) + 1\n        counts_by_group[e['group']] = counts_by_group.get(e['group'], 0) + 1\n    total = len(errors)\n    share_by_group = {g: c / total for g, c in counts_by_group.items()}\n    highest = max(share_by_group, key=lambda g: share_by_group[g])\n    lowest = min(share_by_group, key=lambda g: share_by_group[g])\n    return {\n        'counts_by_kind': counts_by_kind,\n        'counts_by_group': counts_by_group,\n        'share_by_group': share_by_group,\n        'extreme_groups': {\n            'highest': highest,\n            'lowest': lowest,\n            'difference': float(share_by_group[highest] - share_by_group[lowest]),\n        },\n    }\n\ndef model_card_stub(metrics_by_group):\n    '''Minimal model card stub naming the group with the lowest metric.'''\n    worst = min(metrics_by_group, key=lambda g: metrics_by_group[g])\n    return {\n        'intended_use': 'Defekt-Klassifikation in der Pilotwerk',\n        'metric_by_group': dict(metrics_by_group),\n        'worst_group': worst,\n        'known_limitation': 'Schwaecheste Teilgruppe: {} (Metrik {})'.format(worst, metrics_by_group[worst]),\n    }\n", "prompt": "Final Boss: Fehlerkategorisierung und Modellkarte. `categorize_errors(errors)` bekommt eine Liste von dicts `{'id': int, 'kind': str, 'group': str}`. Rückgabe: `{'counts_by_kind': {kind: anzahl}, 'counts_by_group': {gruppe: anzahl}, 'share_by_group': {gruppe: fehler_der_gruppe / gesamtfehler}, 'extreme_groups': {'highest': gruppe, 'lowest': gruppe, 'difference': anteil_hoch - anteil_tief}}`. Bei Gleichstand entscheidet die Reihenfolge des ersten Auftretens; fehlt bei einem Fehler 'kind' oder 'group', oder ist die Liste leer, wirf `ValueError`. `model_card_stub(metrics_by_group)` bekommt ein dict `gruppe -> metrik` (höher = besser, z. B. Accuracy) und gibt `{'intended_use': 'Defekt-Klassifikation in der Pilotwerk', 'metric_by_group': kopie, 'worst_group': gruppe_mit_kleinster_metrik, 'known_limitation': 'Schwaecheste Teilgruppe: <gruppe> (Metrik <wert>)'}` zurück.", "fullSolution": "def categorize_errors(errors):\n    '''Summarize errors by kind and group; identify extreme error-share groups.'''\n    if not errors:\n        raise ValueError('errors must not be empty')\n    counts_by_kind = {}\n    counts_by_group = {}\n    for e in errors:\n        if 'kind' not in e or 'group' not in e:\n            raise ValueError('each error needs kind and group')\n        counts_by_kind[e['kind']] = counts_by_kind.get(e['kind'], 0) + 1\n        counts_by_group[e['group']] = counts_by_group.get(e['group'], 0) + 1\n    total = len(errors)\n    share_by_group = {g: c / total for g, c in counts_by_group.items()}\n    highest = max(share_by_group, key=lambda g: share_by_group[g])\n    lowest = min(share_by_group, key=lambda g: share_by_group[g])\n    return {\n        'counts_by_kind': counts_by_kind,\n        'counts_by_group': counts_by_group,\n        'share_by_group': share_by_group,\n        'extreme_groups': {\n            'highest': highest,\n            'lowest': lowest,\n            'difference': float(share_by_group[highest] - share_by_group[lowest]),\n        },\n    }\n\ndef model_card_stub(metrics_by_group):\n    '''Minimal model card stub naming the group with the lowest metric.'''\n    worst = min(metrics_by_group, key=lambda g: metrics_by_group[g])\n    return {\n        'intended_use': 'Defekt-Klassifikation in der Pilotwerk',\n        'metric_by_group': dict(metrics_by_group),\n        'worst_group': worst,\n        'known_limitation': 'Schwaecheste Teilgruppe: {} (Metrik {})'.format(worst, metrics_by_group[worst]),\n    }\n", "competencyIds": ["c-ml-erroranalysis"] },
  "subgroup-recall-report": { "difficulty": "core", "packages": [], "starterCode": "def subgroup_recall(datensaetze):\n    \"\"\"{label: mittelwert_recall} mit sortierten Labels und round(…, 6).\"\"\"\n    ...\n\n", "baseTests": "D = [\n    {\"subgroup\": \"versand\", \"recall\": 1.0},\n    {\"subgroup\": \"versand\", \"recall\": 1.0},\n    {\"subgroup\": \"recht\", \"recall\": 1.0},\n    {\"subgroup\": \"recht\", \"recall\": 0.0},\n    {\"subgroup\": \"rabatt\", \"recall\": 0.0},\n    {\"subgroup\": \"rabatt\", \"recall\": 1.0},\n    {\"subgroup\": \"garantie\", \"recall\": 1.0},\n    {\"subgroup\": \"garantie\", \"recall\": 1.0},\n]\n__check('vier gruppen', set(subgroup_recall(D)) == {\"versand\", \"recht\", \"rabatt\", \"garantie\"})\n__check('werte exakt', subgroup_recall(D) == {\"versand\": 1.0, \"recht\": 0.5, \"rabatt\": 0.5, \"garantie\": 1.0})\n__check('leere liste', subgroup_recall([]) == {})\n__check('label fehlt -> alle', subgroup_recall([{\"recall\": 0.25}, {\"recall\": 0.75}]) == {\"alle\": 0.5})\n__check('dritte gruppe', subgroup_recall([{\"subgroup\": \"b\", \"recall\": 0.1}, {\"subgroup\": \"b\", \"recall\": 0.2}, {\"subgroup\": \"b\", \"recall\": 0.3}]) == {\"b\": 0.2})", "referenceSolver": "def subgroup_recall(datensaetze):\n    werte = {}\n    for datensatz in datensaetze:\n        werte.setdefault(datensatz.get(\"subgroup\", \"alle\"), []).append(datensatz[\"recall\"])\n    return {label: round(sum(v) / len(v), 6) for label, v in sorted(werte.items())}\n\n# subgroup_recall(D) -> {'versand': 1.0, 'recht': 0.5, 'rabatt': 0.5, 'garantie': 1.0}", "prompt": "Baue die Subgruppen-Auswertung: <code>subgroup_recall(datensaetze)</code> erhält eine Liste <code>{\"subgroup\": label, \"recall\": wert}</code> und liefert <code>{label: mittelwert}</code> über alle Datensätze der Gruppe (auf 6 Stellen gerundet, Labels sortiert). Leere Liste → leeres Dict. Fehlt das subgroup-Feld, gilt <code>\"alle\"</code>. Runde mit round(x, 6).", "fullSolution": "def subgroup_recall(datensaetze):\n    werte = {}\n    for datensatz in datensaetze:\n        werte.setdefault(datensatz.get(\"subgroup\", \"alle\"), []).append(datensatz[\"recall\"])\n    return {label: round(sum(v) / len(v), 6) for label, v in sorted(werte.items())}\n\n# Zwei Gruppen landen bei 0.5 — das ist der Befund, nicht ein Bug.", "competencyIds": ["c-capstone-pipeline","c-genai-security"] },
};

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers, booleans, null). Double-quoted strings are
// valid Python; True/False/None cover bool and null.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Returns ("ok", result) or (exception type, message): lets one comparison
// cover both value returns and the contracted ValueError paths.


// Draw pools: two-group label pairs for the hypothesis report, small group
// sets for the error-rate / categorization tables and recall rows in the
// subgroup-report register. All pools stay quote- and backslash-free.
const GROUP_PAIRS = [['ctrl', 'test'], ['a', 'b'], ['nah', 'fern'], ['nord', 'sued']];
const GROUP_SETS = [['A', 'B', 'C'], ['X', 'Y'], ['A', 'B'], ['K', 'L', 'M']];
const KIND_SETS = [
  ['drift', 'label_noise', 'subgroup'],
  ['drift', 'subgroup'],
  ['label_noise', 'subgroup'],
  ['drift', 'label_noise'],
];
const RECALL_LABEL_SETS = [
  ['versand', 'recht', 'rabatt', 'garantie'],
  ['versand', 'recht'],
  ['rabatt', 'garantie', 'versand'],
  ['recht', 'rabatt'],
];

// Half-step floats keep the emitted literals short and exactly representable;
// the last element is bumped when a draw lands on a constant series so
// np.corrcoef never produces NaN on the seeded probes.
const half = (r) => randInt(r, -6, 16) / 2;

const ensureVarying = (values) => {
  if (new Set(values).size === 1) values[values.length - 1] = values[0] + 1;
  return values;
};

export const GROUPED_CASES = {
  'hypothesis-report-groups': {
    ...CASE_PAYLOADS['hypothesis-report-groups'],
    refNames: ['hypothesis_report'],
    // Two-group labels over n rows plus half-step metric draws; the bad probe
    // alternates between the length-mismatch and the single-group arm.
    draw(r) {
      const n = randInt(r, 4, 8);
      const pair = pick(r, GROUP_PAIRS);
      const labels = Array.from({ length: n }, () => pick(r, pair));
      if (!labels.includes(pair[0])) labels[0] = pair[0];
      if (!labels.includes(pair[1])) labels[1] = pair[1];
      const a = ensureVarying(Array.from({ length: n }, () => half(r)));
      const b = ensureVarying(Array.from({ length: n }, () => half(r)));
      const bad = r() < 0.5
        ? { a, b: b.slice(0, n - 1), labels }
        : { a, b, labels: labels.map(() => pair[0]) };
      return { a, b, labels, bad };
    },
    emit(entry, index) {
      const p = `__hr${index}`;
      return [
        `${p}_a = ${pyLit(entry.a)}`,
        `${p}_b = ${pyLit(entry.b)}`,
        `${p}_l = ${pyLit(entry.labels)}`,
        `__check('seeded report ${index}', hypothesis_report(${p}_a, ${p}_b, ${p}_l) == __ref_hypothesis_report(${p}_a, ${p}_b, ${p}_l))`,
        `${p}_bad = ${pyLit(entry.bad)}`,
        `__check('seeded report fehler ${index}', __raised(hypothesis_report, ${p}_bad["a"], ${p}_bad["b"], ${p}_bad["labels"]) == __raised(__ref_hypothesis_report, ${p}_bad["a"], ${p}_bad["b"], ${p}_bad["labels"]))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'subgroup-error-rates-numpy': {
    ...CASE_PAYLOADS['subgroup-error-rates-numpy'],
    competencyIds: ['c-ml-erroranalysis'],
    refNames: ['subgroup_error_rates', 'largest_gap'],
    // Binary y_true/y_pred over a drawn group assignment plus a truncated
    // y_pred for the length-mismatch ValueError arm.
    draw(r) {
      const n = randInt(r, 4, 10);
      const groups = pick(r, GROUP_SETS);
      const gl = Array.from({ length: n }, () => pick(r, groups));
      if (new Set(gl).size === 1) gl[n - 1] = groups.find((g) => g !== gl[0]);
      const yt = Array.from({ length: n }, () => randInt(r, 0, 1));
      const yp = Array.from({ length: n }, () => randInt(r, 0, 1));
      return { yt, yp, gl, badPred: yp.slice(0, n - 1) };
    },
    emit(entry, index) {
      const p = `__er${index}`;
      return [
        `${p}_t = ${pyLit(entry.yt)}`,
        `${p}_p = ${pyLit(entry.yp)}`,
        `${p}_g = ${pyLit(entry.gl)}`,
        `__check('seeded rates ${index}', subgroup_error_rates(${p}_t, ${p}_p, ${p}_g) == __ref_subgroup_error_rates(${p}_t, ${p}_p, ${p}_g))`,
        `${p}_rates = __ref_subgroup_error_rates(${p}_t, ${p}_p, ${p}_g)`,
        `__check('seeded gap ${index}', largest_gap(${p}_rates) == __ref_largest_gap(${p}_rates))`,
        `__check('seeded rates fehler ${index}', __raised(subgroup_error_rates, ${p}_t, ${pyLit(entry.badPred)}, ${p}_g) == __raised(__ref_subgroup_error_rates, ${p}_t, ${pyLit(entry.badPred)}, ${p}_g))`,
        `__check('seeded gap leer ${index}', __raised(largest_gap, {}) == __raised(__ref_largest_gap, {}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'categorize-errors-report': {
    ...CASE_PAYLOADS['categorize-errors-report'],
    competencyIds: ['c-ml-erroranalysis'],
    refNames: ['categorize_errors', 'model_card_stub'],
    // Error dicts over drawn kind/group sets plus a metrics dict for the
    // model card; the bad probe alternates between a missing-key record and
    // the empty list.
    draw(r) {
      const kinds = pick(r, KIND_SETS);
      const groups = pick(r, GROUP_SETS);
      const count = randInt(r, 5, 9);
      const errors = Array.from({ length: count }, (_, j) => ({
        id: j + 1,
        kind: pick(r, kinds),
        group: pick(r, groups),
      }));
      const metrics = {};
      for (const g of groups) metrics[g] = randInt(r, 1, 10) / 10;
      const bad = r() < 0.5 ? [] : [{ id: 99, kind: pick(r, kinds) }];
      return { errors, metrics, bad };
    },
    emit(entry, index) {
      const p = `__ce${index}`;
      return [
        `${p}_err = ${pyLit(entry.errors)}`,
        `__check('seeded kategorien ${index}', categorize_errors(${p}_err) == __ref_categorize_errors(${p}_err))`,
        `${p}_met = ${pyLit(entry.metrics)}`,
        `__check('seeded karte ${index}', model_card_stub(${p}_met) == __ref_model_card_stub(${p}_met))`,
        `__check('seeded kategorien fehler ${index}', __raised(categorize_errors, ${pyLit(entry.bad)}) == __raised(__ref_categorize_errors, ${pyLit(entry.bad)}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'subgroup-recall-report': {
    ...CASE_PAYLOADS['subgroup-recall-report'],
    competencyIds: ['c-capstone-pipeline', 'c-genai-security'],
    refNames: ['subgroup_recall'],
    // Recall rows over drawn subgroup labels; some records drop the subgroup
    // key so the "alle" fallback is exercised.
    draw(r) {
      const labels = pick(r, RECALL_LABEL_SETS);
      const count = randInt(r, 4, 8);
      const recs = Array.from({ length: count }, () => {
        const rec = { recall: randInt(r, 0, 4) / 4 };
        if (r() < 0.85) rec.subgroup = pick(r, labels);
        return rec;
      });
      return { recs };
    },
    emit(entry, index) {
      const p = `__sr${index}`;
      return [
        `${p}_d = ${pyLit(entry.recs)}`,
        `__check('seeded recall ${index}', subgroup_recall(${p}_d) == __ref_subgroup_recall(${p}_d))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${checks}`;
}

const testsFor = (caseDef, seedCases) => `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`;

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function groupedCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === testsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genGroupedCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, (_, i) => caseDef.draw(r, i));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: testsFor(caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
  };
}

export function solveGroupedFamily(parameters) {
  const caseDef = Object.values(GROUPED_CASES).find((item) => groupedCaseOk(parameters, item));
  if (!caseDef) throw new Error('Gruppen-Kennzahlen-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const GROUPED_CONTRACT = {
  familyId: 'aggregate-grouped-metrics-report',
  familyGroup: 'aggregate-count',
  summary: 'Berechnet gruppenweise Kennzahlen und Anteile und füllt daraus einen strukturierten Bericht ohne Kausaldeutung.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'hypothesis-report-groups', propertyTest: false },
    { caseId: 'subgroup-error-rates-numpy', propertyTest: false },
    { caseId: 'categorize-errors-report', propertyTest: false },
    { caseId: 'subgroup-recall-report', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-capstone-pipeline', 'c-genai-security', 'c-ml-erroranalysis'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateGroupedFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = GROUPED_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genGroupedCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...GROUPED_CONTRACT, generate: generateGroupedFamily, solve: solveGroupedFamily };
