// Seeded generators for weeks 27-30 (RAG, evaluation, defensive GenAI
// security), ADR-0013. Same house rules as the other generator modules:
//   - mulberry32 rng, identical to w01/w05/data_ml generator modules;
//   - every generator returns { parameters, expected, prompt, fullSolution };
//   - `expected` is always an exact integer (the numeric grader is
//     integer-exact by design; floats are graded through python-code tasks);
//   - answer spaces are deliberately wide (>= 20 distinct expected values over
//     2000 seeds, enforced by tests/w27_w30_generators.test.mjs);
//   - variation is semantic (metric, direction, framing), never just noise:
//     every family mixes >= 3 prompt shapes;
//   - the answer never appears as a standalone number in the prompt (a
//     bounded redraw guard enforces this), while full solutions always
//     contain it;
//   - degenerate draws are retried with a bounded guard.
//
// Topic honesty (ADR-0013): retrieval is measured separately from answer
// generation; no exercise claims an executed LLM, and security content stays
// defensive (rule classification on synthetic German examples).

// --- W27: retrieval (recall@k) ------------------------------------------------------

import { bindFamilyDraw, pick, randInt, rng, shuffle } from './generator_draw_kit.mjs';

const { until, clean } = bindFamilyDraw({ maxTries: 128, scope: 'w27_w30_generators' });

const DOC_LETTERS = 'ABCDEFGHIJKLMNOPQRST'.split('');

export function genRecallAtK(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['hits', 'percent', 'missing', 'irrelevant']);
    const relevantTotal = shape === 'percent' ? pick(r, [2, 4, 5, 8, 10]) : randInt(r, 3, 12);
    const k = until(r, (rr) => randInt(rr, 3, 7), (v) => v < relevantTotal + 3);
    const hits = until(r,
      (rr) => randInt(rr, 1, Math.min(k, relevantTotal)),
      (h) => (shape !== 'missing' || h < relevantTotal)
        && (shape !== 'irrelevant' || h < k)
        && (shape !== 'percent' || (100 * h) % relevantTotal === 0));
    const needed = relevantTotal + k - hits;
    const pool = shuffle(r, DOC_LETTERS.slice(0, Math.max(needed, 12)));
    const both = pool.slice(0, hits);
    const relevantOnly = pool.slice(hits, relevantTotal);
    const topOnly = pool.slice(relevantTotal, needed);
    const ranked = shuffle(r, [...both, ...topOnly]);
    const relevant = [...both, ...relevantOnly].sort();
    const hitsList = [...both].sort().join(', ');
    const answer = shape === 'hits' ? hits
      : shape === 'percent' ? (100 * hits) / relevantTotal
        : shape === 'missing' ? relevantTotal - hits
          : k - hits;
    const question = {
      hits: `Wie viele der relevanten Dokumente liegen in den Top ${k}?`,
      percent: 'Wie hoch ist der Recall@k in ganzen Prozent (getroffene relevante Dokumente / insgesamt relevante)?',
      missing: `Wie viele der als relevant markierten Dokumente fehlen in den Top ${k}?`,
      irrelevant: `Wie viele der gelisteten Top-${k}-Dokumente sind nicht relevant?`,
    }[shape];
    return {
      parameters: { shape, relevantTotal, k, ranked, relevant, hits },
      expected: answer,
      prompt: `Für eine Testanfrage eines Retrieval-Systems sind ${relevantTotal} Dokumente als relevant markiert: ${relevant.join(', ')}. Das Ranking des Systems (Top ${k}): ${ranked.join(', ')}. ${question}`,
      fullSolution: {
        hits: `Relevant und in den Top ${k}: {${hitsList}} → ${hits} Treffer.`,
        percent: `Recall@k = ${hits}/${relevantTotal} = ${answer} %.`,
        missing: `Relevant insgesamt ${relevantTotal}, davon in den Top ${k} nur ${hits} → ${relevantTotal} − ${hits} = ${answer} fehlen.`,
        irrelevant: `Top ${k} listen ${k} Dokumente, ${hits} davon sind relevant → ${k} − ${hits} = ${answer} nicht relevant.`,
      }[shape],
    };
  });
}

// --- W27: chunking arithmetic --------------------------------------------------------

// --- W28: precision / recall / F1 from integer confusion counts ---------------------

export function genF1orPrecision(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['precision', 'recall', 'f1']);
    const context = pick(r, [
      ['Zitat-Prüfung', 'Belegstellen'],
      ['Injektions-Detektor', 'verdächtige Dokumente'],
      ['Antwort-Filter', 'Antwortkategorien'],
    ]);
    const draw = (rr) => {
      const tp = randInt(rr, 5, 24);
      const fp = randInt(rr, 1, 14);
      const fn = randInt(rr, 1, 14);
      return { tp, fp, fn };
    };
    const { tp, fp, fn } = until(r, draw, (d) => {
      if (d.fp > 2 * d.tp || d.fn > 2 * d.tp) return false;
      if (shape === 'precision') return (100 * d.tp) % (d.tp + d.fp) === 0;
      if (shape === 'recall') return (100 * d.tp) % (d.tp + d.fn) === 0;
      return (200 * d.tp) % (2 * d.tp + d.fp + d.fn) === 0;
    });
    const answer = shape === 'precision' ? (100 * tp) / (tp + fp)
      : shape === 'recall' ? (100 * tp) / (tp + fn)
        : (200 * tp) / (2 * tp + fp + fn);
    const question = {
      precision: 'Wie hoch ist die Precision in ganzen Prozent (TP/(TP + FP) · 100)?',
      recall: 'Wie hoch ist der Recall in ganzen Prozent (TP/(TP + FN) · 100)?',
      f1: 'Wie hoch ist das F1-Maß in ganzen Prozent (2 · TP/(2 · TP + FP + FN) · 100)?',
    }[shape];
    return {
      parameters: { shape, context, tp, fp, fn },
      expected: answer,
      prompt: `Eine ${context[0]} auf einem Fixtur-Set liefert TP = ${tp}, FP = ${fp}, FN = ${fn} (TN braucht diese Metrik nicht). ${question}`,
      fullSolution: {
        precision: `Precision = TP/(TP + FP) = ${tp}/${tp + fp} = ${answer} %.`,
        recall: `Recall = TP/(TP + FN) = ${tp}/${tp + fn} = ${answer} %.`,
        f1: `F1 = 2·TP/(2·TP + FP + FN) = ${2 * tp}/${2 * tp + fp + fn} = ${answer} %.`,
      }[shape],
    };
  });
}

// --- W29: rule filter counts on a labeled synthetic corpus --------------------------

export function genInjectionFlagCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['missed', 'false-alarms', 'caught-percent', 'clean-kept']);
    const [context, genitive] = pick(r, [
      ['Dokumentenfilter', 'Dokumente'],
      ['Werkzeugaufruf-Filter', 'Aufrufe'],
      ['Support-Assistenten-Filter', 'Nachrichten'],
    ]);
    const draw = (rr) => ({
      tp: randInt(rr, 3, 16),
      fp: randInt(rr, 1, 12),
      fn: randInt(rr, 1, 12),
      tn: randInt(rr, 3, 16),
    });
    const { tp, fp, fn, tn } = until(r, draw, (d) => (
      shape !== 'caught-percent' || (100 * d.tp) % (d.tp + d.fn) === 0
    ));
    const total = tp + fp + fn + tn;
    const labeled = tp + fn;
    const flagged = tp + fp;
    const benign = total - labeled;
    const answer = shape === 'missed' ? fn
      : shape === 'false-alarms' ? fp
        : shape === 'caught-percent' ? (100 * tp) / labeled
          : tn;
    const question = {
      missed: 'Wie viele der Injektionen bleiben unerkannt?',
      'false-alarms': `Bei wie vielen ${genitive} handelt es sich um Fehlalarme (harmlose Fälle, die der Filter fälschlich verwirft)?`,
      'caught-percent': 'Wie hoch ist der Anteil erkannter Injektionen in ganzen Prozent?',
      'clean-kept': `Wie viele harmlose ${genitive} gelangen ungefiltert durch den Filter?`,
    }[shape];
    return {
      parameters: { shape, context, tp, fp, fn, tn },
      expected: answer,
      prompt: `Ein ${context} prüft ${total} ${genitive} mit einem festen Regelwerk. ${labeled} ${genitive} enthalten laut Label ein Injektionsmuster. Der Filter verwirft ${flagged} ${genitive}; ${tp} davon sind tatsächlich Injektionen. ${question}`,
      fullSolution: {
        missed: `Injektionen insgesamt ${labeled}, erkannt ${tp} → ${labeled} − ${tp} = ${answer} unerkannt.`,
        'false-alarms': `Verworfen ${flagged}, davon echte Injektionen ${tp} → ${flagged} − ${tp} = ${answer} Fehlalarme.`,
        'caught-percent': `Erkannt ${tp} von ${labeled} Injektionen → ${tp}/${labeled} = ${answer} %.`,
        'clean-kept': `Harmlos insgesamt ${benign}, davon verworfen ${fp} → ${benign} − ${fp} = ${answer} gelangen weiter.`,
      }[shape],
    };
  });
}

// --- W30: least-privilege policy counting -------------------------------------------

const TOOL_POLICIES = [
  {
    id: 'support',
    immer: ['abrufen', 'zitieren'],
    eingeschraenkt: ['schreiben', 'berichte', 'tmp'],
    verboten: ['mailen', 'sql'],
  },
  {
    id: 'recherche',
    immer: ['lesen', 'suchen'],
    eingeschraenkt: ['exportieren', 'bericht', 'rohdaten'],
    verboten: ['loeschen', 'ausfuehren'],
  },
  {
    id: 'notizen',
    immer: ['recherchieren', 'notieren'],
    eingeschraenkt: ['senden', 'intern', 'extern'],
    verboten: ['hook-aufruf', 'download'],
  },
];

export function genAllowedActionCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const shape = pick(r, ['allowed', 'denied', 'percent']);
    const policy = pick(r, TOOL_POLICIES);
    const [restrictedTool, argOk, argBad] = policy.eingeschraenkt;
    const draw = (rr) => {
      if (shape === 'percent') {
        const total = pick(rr, [10, 20, 25]);
        const allowed = until(rr, (r3) => randInt(r3, 5, total - 2), (a) => (100 * a) % total === 0);
        return { allowed, denied: total - allowed, total };
      }
      const allowed = randInt(rr, 6, 18);
      const denied = randInt(rr, 2, 12);
      return { allowed, denied, total: allowed + denied };
    };
    const { allowed, denied, total } = draw(r);
    // split the totals into the five displayed call counters (>= 1 each)
    const a1 = randInt(r, 2, allowed - 3);
    const a2 = randInt(r, 1, allowed - a1 - 1);
    const restrictedOk = allowed - a1 - a2;
    const restrictedBad = randInt(r, 1, denied - 1);
    const forbidden = denied - restrictedBad;
    const answer = shape === 'allowed' ? allowed : shape === 'denied' ? denied : (100 * allowed) / total;
    const calls = [
      `${policy.immer[0]} ×${a1}`,
      `${policy.immer[1]} ×${a2}`,
      `${restrictedTool}(${argOk}) ×${restrictedOk}`,
      `${restrictedTool}(${argBad}) ×${restrictedBad}`,
      `${policy.verboten.join('/')} ×${forbidden}`,
    ].join(', ');
    const question = shape === 'allowed'
      ? 'Wie viele Aufrufe erlaubt die Richtlinie?'
      : shape === 'denied'
        ? 'Wie viele Aufrufe lehnt die Richtlinie ab?'
        : 'Wie hoch ist der erlaubte Anteil der Aufrufe in ganzen Prozent?';
    return {
      parameters: { shape, policyId: policy.id, counts: { a1, a2, restrictedOk, restrictedBad, forbidden }, allowed, denied, total },
      expected: answer,
      prompt: `Ein Prototyp arbeitet nach Least Privilege: „${policy.immer.join('“ und „')}“ sind immer erlaubt, „${restrictedTool}“ nur mit ${argOk}, „${policy.verboten.join('“ und „')}“ sind verboten. Geprüft werden ${total} Werkzeugaufrufe: ${calls}. ${question}`,
      fullSolution: shape === 'denied'
        ? `Abgelehnt: ${restrictedTool}(${argBad}) (${restrictedBad}) + ${policy.verboten.join('/')} (${forbidden}) = ${denied}. Erlaubt wären ${allowed} von ${total}.`
        : `Erlaubt: ${policy.immer[0]} (${a1}) + ${policy.immer[1]} (${a2}) + ${restrictedTool} nur mit ${argOk} (${restrictedOk}) = ${allowed}${shape === 'percent' ? ` von ${total} → ${answer} %` : ''}.`,
    };
  });
}
