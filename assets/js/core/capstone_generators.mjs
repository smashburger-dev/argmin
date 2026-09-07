// Seeded generators for the research phase and capstone, ADR-0014
// Part 2. Same house rules as the other generator modules:
//   - mulberry32 rng, identical to the foundations, linalg, and GenAI research modules;
//   - every generator returns { parameters, expected, prompt, fullSolution };
//   - `expected` is always an exact integer (the numeric grader is
//     integer-exact by design; decimal differences are asked in per-mille
//     points, i.e. difference * 1000);
//   - genSubgroupCost only draws denominators whose least common multiple
//     divides 1000, so every FPR/selection-rate difference is EXACTLY
//     representable with 3 decimals (no rounding debt);
//   - variation is semantic (shape, context, framing), never just noise:
//     every family mixes >= 3 digit-masked prompt shapes;
//   - the answer never appears as a standalone number in the prompt (a
//     bounded redraw guard enforces this), while full solutions always
//     contain it;
//   - degenerate draws are retried with a bounded guard;
//   - `expected` is always computed by an exported reference solver that
//     reads only `parameters`, never hard-coded.
//
// Topic honesty (ADR-0014): research-artefact audits run on synthetic German
// fixtures; no generator claims an executed LLM, real user data, or a
// statistically representative cohort.

// --- W31: preregistration goal-shift detection (c-research-question) ------------------

import { bindFamilyDraw, pick, randInt, rng, shuffle } from './generator_draw_kit.mjs';

const { until, clean } = bindFamilyDraw({ maxTries: 128, scope: 'capstone_generators' });

const SHIFT_METRICS = ['recall@5', 'token-f1', 'zitat-praezision', 'anteil-korrekt'];
const SHIFT_ENDPOINTS = ['antwortquote', 'zitattreue', 'bearbeitungszeit', 'ablehnungsquote'];
const SHIFT_SUBGROUPS = ['neukunden', 'bestandskunden', 'mobil', 'desktop', 'wochenende'];
const SHIFT_FLAGS = ['metrik_geaendert', 'primaer_demoted', 'schwelle_geaendert', 'subgruppe_nach_freeze'];

/**
 * Reference solver: re-derives the triggered goal-shift flags from two
 * protocol versions alone. Semantics (fixed contract, mirrors w31-e6):
 *   metrik_geaendert     a.metrik !== b.metrik
 *   schwelle_geaendert   a.schwelle !== b.schwelle
 *   primaer_demoted      a.primaer is demoted into b.sekundaer
 *   subgruppe_nach_freeze b.subgruppen contains a group a.subgruppen lacks
 */
export function protocolShiftFlags(versionA, versionB) {
  const flags = [];
  if (versionA.metrik !== versionB.metrik) flags.push('metrik_geaendert');
  if (versionA.schwelle !== versionB.schwelle) flags.push('schwelle_geaendert');
  if ((versionB.sekundaer || []).includes(versionA.primaer)) flags.push('primaer_demoted');
  if ((versionB.subgruppen || []).some((s) => !(versionA.subgruppen || []).includes(s))) flags.push('subgruppe_nach_freeze');
  return flags.sort();
}

/**
 * genProtocolShifts: draws a preregistered protocol version A and a modified
 * version B, then asks for the NUMBER of triggered goal-shift flags.
 * Invariants: expected in [1, 4]; every flag family occurs over 2000 seeds;
 * non-shifted fields stay identical between A and B; dates are zero-padded
 * ISO with datum_prereg < datum_hauptlauf in both versions.
 */
export function genProtocolShifts(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const draw = (rr) => {
      const metrik = pick(rr, SHIFT_METRICS);
      const schwelle = pick(rr, [0.6, 0.65, 0.7, 0.75, 0.8, 0.85]);
      const primaer = pick(rr, SHIFT_ENDPOINTS);
      const sekundaer = shuffle(rr, SHIFT_ENDPOINTS.filter((e) => e !== primaer)).slice(0, randInt(rr, 1, 2));
      const subgruppen = shuffle(rr, SHIFT_SUBGROUPS).slice(0, randInt(rr, 1, 3));
      const monat = randInt(rr, 1, 6);
      const tag = randInt(rr, 2, 28);
      const hauptMonat = Math.min(12, monat + randInt(rr, 1, 3));
      const zero = (n) => String(n).padStart(2, '0');
      const base = {
        metrik,
        schwelle,
        primaer,
        sekundaer: [...sekundaer],
        subgruppen: [...subgruppen],
        datum_prereg: `2026-${zero(monat)}-${zero(tag)}`,
        datum_hauptlauf: `2026-${zero(hauptMonat)}-${zero(Math.min(28, tag + randInt(rr, 1, 6)))}`,
      };
      const active = shuffle(rr, SHIFT_FLAGS).slice(0, randInt(rr, 1, 4));
      const b = {
        metrik: base.metrik,
        schwelle: base.schwelle,
        primaer: base.primaer,
        sekundaer: [...base.sekundaer],
        subgruppen: [...base.subgruppen],
        datum_prereg: base.datum_prereg,
        datum_hauptlauf: base.datum_hauptlauf,
      };
      if (active.includes('metrik_geaendert')) {
        b.metrik = pick(rr, SHIFT_METRICS.filter((m) => m !== base.metrik));
      }
      if (active.includes('schwelle_geaendert')) {
        b.schwelle = pick(rr, [0.6, 0.65, 0.7, 0.75, 0.8, 0.85].filter((s) => s !== base.schwelle));
      }
      if (active.includes('primaer_demoted')) {
        b.primaer = pick(rr, SHIFT_ENDPOINTS.filter((e) => e !== base.primaer && !base.sekundaer.includes(e)));
        b.sekundaer = [base.primaer, ...base.sekundaer.filter((e) => e !== b.primaer)];
      }
      if (active.includes('subgruppe_nach_freeze')) {
        const neu = pick(rr, SHIFT_SUBGROUPS.filter((s) => !base.subgruppen.includes(s)));
        b.subgruppen = [...base.subgruppen, neu];
      }
      return { a: base, b, flags: protocolShiftFlags(base, b) };
    };
    const { a, b, flags } = until(r, draw, (d) => protocolShiftFlags(d.a, d.b).length >= 1);
    const deutsche = { metrik_geaendert: 'Metrik geändert', schwelle_geaendert: 'Erfolgsschwelle geändert', primaer_demoted: 'primärer Endpunkt degradiert', subgruppe_nach_freeze: 'Subgruppe nach Freeze ergänzt' };
    const zahl = (v) => `„${String(v).replace('.', ',')}“`;
    const liste = (werte) => (werte.length <= 2
      ? werte.map((e) => `„${e}“`).join(' und ')
      : `${werte.slice(0, -1).map((e) => `„${e}“`).join(', ')} und „${werte[werte.length - 1]}“`);
    const zeile = (v) => `Metrik „${v.metrik}“, Erfolgsschwelle ${zahl(v.schwelle)}, primärer Endpunkt „${v.primaer}“, sekundäre Endpunkte ${liste(v.sekundaer)}, Subgruppen ${liste(v.subgruppen)}, Preregistrierung ${v.datum_prereg}, Hauptlauf ab ${v.datum_hauptlauf}`;
    return {
      parameters: { versionen: { a, b }, flags: [...flags] },
      expected: flags.length,
      prompt: `Zwei Versionen eines Forschungsprotokolls für den RAG-Prototypen liegen vor. Version A (preregistriert): ${zeile(a)}. Version B (nach Beginn des Hauptlaufs geändert): ${zeile(b)}. Wie viele der vier Goal-Shift-Flags (metrik_geaendert, schwelle_geaendert, primaer_demoted, subgruppe_nach_freeze) lösen beim Vergleich von Version A nach Version B aus?`,
      fullSolution: `Aktiv: ${flags.map((f) => deutsche[f]).join('; ')}. Das sind ${flags.length} Goal-Shift-Flags.`,
    };
  });
}

// --- W32: card audits (c-research-cards) ----------------------------------------------

const CARD_KINDS = [
  {
    id: 'datacard',
    titel: 'Datenkarte',
    felder: ['name', 'zweck', 'herkunft', 'zeitraum', 'lizenz', 'n_beispiele', 'split_train', 'split_dev', 'bekannte_luecken', 'kontakt'],
  },
  {
    id: 'modelcard',
    titel: 'Modellkarte',
    felder: ['name', 'zweck', 'version', 'trainingsdaten', 'metrik', 'schwellenwert', 'bekannte_grenzen', 'kontakt'],
  },
];
const CARD_VALUES = {
  datacard: ['faq-korpus', 'support-antworten', 'forum-export', 'jahreswechsel', 'cc-by-vier', '1200', '80 %', '10 %', 'umlaute fehlen', 'team-support'],
  modelcard: ['rag-stub', 'antwortvorschlag', '1.2.0', 'faq-korpus', 'recall@5', '0,75', 'formulierung nicht neu', 'team-support'],
};

/**
 * Reference solver: counts mandatory fields that are missing or blank across
 * all cards of an audit.
 */
export function countCardDefects(cards, pflichtfelder) {
  let total = 0;
  for (const card of cards) {
    for (const feld of pflichtfelder[card.art]) {
      const wert = card.werte[feld];
      if (wert === undefined || String(wert).trim() === '') total += 1;
    }
  }
  return total;
}

/**
 * genCardAudit: draws one or two cards (data/model) in which some mandatory
 * fields are missing from the record or left blank.
 * Invariants: expected in [1, 12]; at least one defect; both card kinds and
 * both defect kinds (missing vs. blank) occur over 2000 seeds; card values
 * never carry secrets.
 */
export function genCardAudit(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const draw = (rr) => {
      const karten = shuffle(rr, CARD_KINDS).slice(0, randInt(rr, 1, 2)).map((art) => {
        const werte = {};
        for (let i = 0; i < art.felder.length; i += 1) {
          const feld = art.felder[i];
          const zustand = rr();
          if (zustand < 0.62) werte[feld] = CARD_VALUES[art.id][i];
          else if (zustand < 0.82) werte[feld] = '';
          // else: field missing entirely
        }
        return { art: art.id, werte };
      });
      const pflichtfelder = { datacard: CARD_KINDS[0].felder, modelcard: CARD_KINDS[1].felder };
      const mangel = countCardDefects(karten, pflichtfelder);
      return { karten, pflichtfelder, mangel };
    };
    const { karten, pflichtfelder, mangel } = until(r, draw, (d) => d.mangel >= 1 && d.mangel <= 12);
    const titelVon = { datacard: 'Datenkarte', modelcard: 'Modellkarte' };
    const absatz = karten.map((k, idx) => {
      const art = CARD_KINDS.find((c) => c.id === k.art);
      const vorhandene = art.felder.filter((f) => k.werte[f] !== undefined);
      const paare = vorhandene.map((f) => `${f}: ${k.werte[f] === '' ? '„“' : `„${k.werte[f]}“`}`);
      return `${titelVon[k.art]} „karte-${idx === 0 ? 'a' : 'b'}“ mit dem Pflichtfeldsatz ${art.felder.join(', ')} — erfasst sind ${paare.join(', ')}`;
    }).join('. ') + '.';
    return {
      parameters: { karten, pflichtfelder },
      expected: mangel,
      prompt: `Ein Karten-Audit prüft ${karten.length === 1 ? 'eine Karte' : 'zwei Karten'} gegen die Pflichtfeldsätze. ${absatz} Wie viele Pflichtfelder fehlen insgesamt (nicht erfasst oder leer)?`,
      fullSolution: `Fehlend oder leer: ${mangel} Pflichtfeld${mangel === 1 ? '' : 'er'} — nicht aufgezählte Felder des Pflichtfeldsatzes zählen ebenso wie explizit leere „“-Werte.`,
    };
  });
}

// --- W33: subgroup rate differences (c-research-responsible) ---------------------------

// Denominators whose pairwise lcm always divides 1000, so every difference of
// two rates is exactly representable in per-mille (3 decimals).
const RATE_DENOMINATORS = [10, 20, 25, 40, 50, 100];

/**
 * Reference solver: per-mille difference of a rate drawn from integer
 * confusion counts. kind 'fpr' uses fp/(fp+tn), 'selrate' uses
 * (tp+fp)/(tp+fp+fn+tn); the result is always an exact integer.
 */
export function subgroupRatePerMille(gruppeA, gruppeB, kind) {
  const rate = (g) => (kind === 'fpr' ? g.fp / (g.fp + g.tn) : (g.tp + g.fp) / (g.tp + g.fp + g.fn + g.tn));
  const perMille = Math.round(Math.abs(rate(gruppeA) - rate(gruppeB)) * 1000);
  return perMille;
}

/**
 * genSubgroupCost: draws integer confusion counts for two groups and asks
 * for the FPR or selection-rate difference in per-mille points.
 * Invariants: expected in [10, 250] (a visible gap, no hair-splitting);
 * all counts are positive integers; the difference is EXACTLY representable
 * with 3 decimals because both denominators divide 1000 pairwise; expected is
 * computed by subgroupRatePerMille.
 */
export function genSubgroupCost(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['fpr-diff', 'selrate-diff']);
    const [kontext, genitiv] = pick(r, [
      ['Injektions-Detektor', 'Nachrichten'],
      ['Antwort-Filter', 'Antworten'],
      ['Dokumentenfilter', 'Dokumente'],
    ]);
    const gruppe = pick(r, [['A', 'B'], ['registrierte Nutzende', 'Gastnutzende'], ['Bestandskundige', 'Neukundige']]);
    const draw = (rr) => {
      const conf = (r3) => {
        const d = pick(r3, RATE_DENOMINATORS);
        if (kindOf(shape) === 'fpr') {
          const fp = randInt(r3, 1, d - 2);
          return { tp: randInt(r3, 3, 20), fp, fn: randInt(r3, 1, 15), tn: d - fp };
        }
        const sel = randInt(r3, 2, d - 2);
        const fp = randInt(r3, 1, sel - 1);
        const fn = randInt(r3, 1, d - sel - 1);
        return { tp: sel - fp, fp, fn, tn: d - sel - fn };
      };
      const a = conf(rr);
      const b = conf(rr);
      return { a, b };
    };
    function kindOf(s) { return s === 'fpr-diff' ? 'fpr' : 'selrate'; }
    const kind = kindOf(shape);
    const { a, b } = until(r, draw, (d) => {
      const pm = subgroupRatePerMille(d.a, d.b, kind);
      return pm >= 10 && pm <= 250;
    });
    const antwort = subgroupRatePerMille(a, b, kind);
    const confText = (g) => `TP = ${g.tp}, FP = ${g.fp}, FN = ${g.fn}, TN = ${g.tn}`;
    const frage = shape === 'fpr-diff'
      ? 'Wie groß ist die Differenz der False-Positive-Raten (FP/(FP + TN)) zwischen den beiden Gruppen in Tausendsteln (Betrag der Differenz · 1000)?'
      : 'Wie groß ist die Differenz der Auswahlraten ((TP + FP)/alle Fälle) zwischen den beiden Gruppen in Tausendsteln (Betrag der Differenz · 1000)?';
    const rateText = (g) => (kind === 'fpr'
      ? `${g.fp}/(${g.fp} + ${g.tn}) = ${g.fp}/${g.fp + g.tn}`
      : `(${g.tp} + ${g.fp})/${g.tp + g.fp + g.fn + g.tn}`);
    return {
      parameters: { shape, kontext, gruppen: gruppe, a, b, kind },
      expected: antwort,
      prompt: `Ein ${kontext} bewertet ${genitiv} getrennt für zwei Gruppen. Gruppe ${gruppe[0]}: ${confText(a)}. Gruppe ${gruppe[1]}: ${confText(b)}. ${frage}`,
      fullSolution: `Rate Gruppe ${gruppe[0]} = ${rateText(a)}, Rate Gruppe ${gruppe[1]} = ${rateText(b)}. Differenz in Tausendsteln: ${antwort}.`,
    };
  });
}

// --- W34: baseline ledger aggregation (c-research-capstone) ----------------------------

/**
 * Reference solver: separate answer accuracy (correct / retrieval-hit cases)
 * versus naive accuracy (correct / all cases), plus the per-mille gap.
 */
export function baselineLedgerwerte(n, retrieval_fehler, antwort_fehler) {
  const treffer = n - retrieval_fehler;
  const korrekt = treffer - antwort_fehler;
  return {
    treffer,
    korrekt,
    sep_prozent: (100 * korrekt) / treffer,
    naiv_prozent: (100 * korrekt) / n,
    gap_tausendstel: Math.round(((korrekt / treffer - korrekt / n) * 1000)),
  };
}

/**
 * genBaselineLedger: draws an error ledger (total cases, retrieval failures,
 * answer failures among retrieval hits) and asks for one of three views.
 * Invariants: expected is an exact integer (percent shapes only drawn when
 * divisibility holds; the per-mille gap is rounded as part of the task text);
 * korrekt >= 4, treffer > antwort_fehler; retrieval and answer errors stay
 * separated, never merged.
 */
export function genBaselineLedger(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['sep-percent', 'naive-percent', 'gap-promille']);
    const korpus = pick(r, ['Fixtur-Fragen', 'Eval-Fragen', 'Golden-Set-Fragen']);
    const k = pick(r, [3, 5]);
    const draw = (rr) => {
      const n = randInt(rr, 12, 24);
      const retrieval_fehler = randInt(rr, 2, Math.max(2, Math.floor(n / 2) - 1));
      const antwort_fehler = randInt(rr, 1, Math.max(1, n - retrieval_fehler - 4));
      return { n, retrieval_fehler, antwort_fehler };
    };
    const instanz = until(r, draw, (d) => {
      const w = baselineLedgerwerte(d.n, d.retrieval_fehler, d.antwort_fehler);
      if (w.korrekt < 4) return false;
      if (shape === 'sep-percent') return Number.isInteger(w.sep_prozent) && w.sep_prozent >= 30;
      if (shape === 'naive-percent') return Number.isInteger(w.naiv_prozent) && w.naiv_prozent >= 25;
      return w.gap_tausendstel >= 10 && w.gap_tausendstel <= 350;
    });
    const w = baselineLedgerwerte(instanz.n, instanz.retrieval_fehler, instanz.antwort_fehler);
    const answer = shape === 'sep-percent' ? w.sep_prozent : shape === 'naive-percent' ? w.naiv_prozent : w.gap_tausendstel;
    const frage = {
      'sep-percent': 'Wie hoch ist die von Retrieval-Fehlern bereinigte Antwort-Genauigkeit in ganzen Prozent (inhaltlich korrekte Fälle geteilt durch Fälle mit Treffer in den Top k, mal 100)?',
      'naive-percent': 'Wie hoch ist die naive Genauigkeit über alle Fälle in ganzen Prozent (korrekt/alle Fälle · 100)?',
      'gap-promille': 'Um wie viele Tausendstel liegt die naive Genauigkeit unter der bereinigten (Differenz · 1000, auf ganze Tausendstel gerundet)?',
    }[shape];
    return {
      parameters: { shape, korpus, ...instanz },
      expected: answer,
      prompt: `Ein Fehler-Ledger über ${instanz.n} ${korpus} des RAG-Prototypen listet ${instanz.retrieval_fehler} Retrieval-Fehler (kein relevantes Dokument in den Top ${k}) und — nur unter den ${w.treffer} Fällen mit Treffer — ${instanz.antwort_fehler} Antwortfehler; ${w.korrekt} Fälle sind inhaltlich korrekt. ${frage}`,
      fullSolution: {
        'sep-percent': `Bereinigt: ${w.korrekt}/${w.treffer} = ${answer} %.`,
        'naive-percent': `Naiv: ${w.korrekt}/${instanz.n} = ${answer} %.`,
        'gap-promille': `Bereinigt ${w.korrekt}/${w.treffer}, naiv ${w.korrekt}/${instanz.n} → Abstand ${answer} Tausendstel.`,
      }[shape],
    };
  });
}

// --- W35+: pipeline manifest stages (c-capstone-pipeline) ------------------------------

const PIPELINE_STAGES = ['ingest', 'bereinigung', 'chunking', 'retrieval', 'generator', 'guard', 'export', 'auswertung'];

/**
 * Reference solver: a stage counts as valid iff its manifest hash is present
 * and its declared input is 'quelle' or an EARLIER stage of the list.
 */
export function pipelineStageZaehlung(stages) {
  const index = new Map(stages.map((s, i) => [s.id, i]));
  return {
    gueltig: stages.filter((s) => s.hash && (s.input === 'quelle' || (s.input && index.get(s.input) < index.get(s.id)))).length,
    ohne_hash: stages.filter((s) => !s.hash).length,
  };
}

/**
 * genPipelineStages: draws an ordered pipeline excerpt; stages may lack a
 * manifest hash or declare a later/unknown stage as input.
 * Invariants: 5-8 stages, stage order follows the canonical pipeline order;
 * expected in [0, 8]; both defect kinds occur over 2000 seeds.
 */
export function genPipelineStages(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['valid-count', 'missing-hashes']);
    const anzahl = randInt(r, 5, 8);
    const start = randInt(r, 0, PIPELINE_STAGES.length - anzahl);
    const namen = PIPELINE_STAGES.slice(start, start + anzahl);
    const hashlos = new Set(shuffle(r, namen).slice(0, randInt(r, 1, Math.max(1, anzahl - 3))));
    const fehlspeisungen = new Set(shuffle(r, namen.slice(1)).slice(0, randInt(r, 0, 2)));
    const stages = namen.map((id, i) => {
      const korrekte_eingabe = i === 0 ? 'quelle' : namen[i - 1];
      let input = korrekte_eingabe;
      if (fehlspeisungen.has(id)) {
        const spaeter = namen.slice(i + 1);
        input = spaeter.length > 0 ? spaeter[spaeter.length - 1] : korrekte_eingabe;
        if (input === korrekte_eingabe) input = namen[Math.min(namen.length - 1, i + 2)];
      }
      return { id, input, hash: hashlos.has(id) ? null : 'manifest-sha256' };
    });
    const zaehlung = pipelineStageZaehlung(stages);
    const answer = shape === 'valid-count' ? zaehlung.gueltig : zaehlung.ohne_hash;
    const liste = stages.map((s, i) => `${i + 1}. ${s.id} (eingespeist aus ${s.input}, ${s.hash ? 'mit manifest-hash' : 'ohne manifest-hash'})`).join('; ');
    const frage = shape === 'valid-count'
      ? 'Wie viele Stages sind gültig (manifest-hash vorhanden UND Eingabe „quelle“ oder eine früher gelistete Stage)?'
      : 'Wie vielen Stages fehlt der manifest-hash?';
    return {
      parameters: { shape, stages },
      expected: answer,
      prompt: `Ein Capstone-Manifest beschreibt die Pipeline-Stages in Listenreihenfolge: ${liste}. ${frage}`,
      fullSolution: shape === 'valid-count'
        ? `Gültig sind die Stages mit hash und früherer Eingabe: ${answer}.`
        : `Ohne manifest-hash: ${answer} Stages.`,
    };
  });
}

// --- W35+: separated retrieval/answer error rates (c-capstone-pipeline) ----------------

/**
 * Reference solver: aggregates per-batch ledgers into totals, hit rates, and
 * the separated answer accuracy.
 */
export function evalRatesWerte(batches) {
  const n = batches.reduce((s, b) => s + b.n, 0);
  const retrieval = batches.reduce((s, b) => s + b.retrieval_fehler, 0);
  const antwort = batches.reduce((s, b) => s + b.antwort_fehler, 0);
  const treffer = n - retrieval;
  const korrekt = treffer - antwort;
  return {
    n,
    retrieval,
    antwort,
    treffer,
    korrekt,
    treffer_prozent: (100 * treffer) / n,
    antwort_prozent: (100 * korrekt) / treffer,
  };
}

/**
 * genEvalRates: draws 2-3 batch ledgers with separated retrieval and answer
 * errors and asks for a total count or a whole-percent rate.
 * Invariants: expected is an exact integer; rates are only asked when the
 * division is exact; retrieval and answer errors never merge into one rate.
 */
export function genEvalRates(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['retrieval-error-count', 'answer-error-count', 'answer-rate-percent', 'retrieval-hit-percent']);
    const kontext = pick(r, ['Smoke-Test', 'Regression-Lauf', 'Nachtlauf']);
    const draw = (rr) => {
      const anzahl = randInt(rr, 2, 3);
      const batches = [];
      for (let i = 0; i < anzahl; i += 1) {
        const n = randInt(rr, 6, 14);
        const retrieval_fehler = randInt(rr, 1, Math.max(1, Math.floor(n / 2) - 1));
        const antwort_fehler = randInt(rr, 1, Math.max(1, n - retrieval_fehler - 2));
        batches.push({ n, retrieval_fehler, antwort_fehler });
      }
      return batches;
    };
    const batches = until(r, draw, (bs) => {
      const w = evalRatesWerte(bs);
      if (shape === 'retrieval-error-count' || shape === 'answer-error-count') return w.retrieval !== w.antwort && w.korrekt >= 3;
      if (shape === 'answer-rate-percent') return Number.isInteger(w.antwort_prozent) && w.antwort_prozent >= 25;
      return Number.isInteger(w.treffer_prozent) && w.treffer_prozent >= 50;
    });
    const w = evalRatesWerte(batches);
    const answer = shape === 'retrieval-error-count' ? w.retrieval
      : shape === 'answer-error-count' ? w.antwort
        : shape === 'answer-rate-percent' ? w.antwort_prozent
          : w.treffer_prozent;
    const liste = batches.map((b, i) => `Batch ${i + 1}: ${b.n} Fälle, ${b.retrieval_fehler} Retrieval-Fehler, ${b.antwort_fehler} Antwortfehler (nur unter Fällen mit Treffer)`).join('; ');
    const frage = {
      'retrieval-error-count': 'Wie viele Retrieval-Fehler gibt es über alle Batches zusammen?',
      'answer-error-count': 'Wie viele Antwortfehler gibt es über alle Batches zusammen?',
      'answer-rate-percent': 'Wie hoch ist die bereinigte Antwort-Genauigkeit über alle Batches in ganzen Prozent (inhaltlich korrekte Fälle geteilt durch Fälle mit Treffer, mal 100)?',
      'retrieval-hit-percent': 'Wie hoch ist der Anteil der Fälle mit Treffer in den Top k über alle Batches in ganzen Prozent (Fälle mit Treffer geteilt durch alle Fälle, mal 100)?',
    }[shape];
    return {
      parameters: { shape, kontext, batches },
      expected: answer,
      prompt: `Ein ${kontext} des Capstone-Prototypen führt getrennte Fehler-Ledger über ${batches.length} Batches: ${liste}. ${frage}`,
      fullSolution: {
        'retrieval-error-count': `Retrieval-Fehler gesamt: ${batches.map((b) => b.retrieval_fehler).join(' + ')} = ${answer}.`,
        'answer-error-count': `Antwortfehler gesamt: ${batches.map((b) => b.antwort_fehler).join(' + ')} = ${answer}.`,
        'answer-rate-percent': `Bereinigt: ${w.korrekt}/${w.treffer} = ${answer} %.`,
        'retrieval-hit-percent': `Trefferquote: ${w.treffer}/${w.n} = ${answer} %.`,
      }[shape],
    };
  });
}
