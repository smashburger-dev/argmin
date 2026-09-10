// Seeded generators for weeks 6-17 (data & classic ML), ADR-0012 Option A.
//
// Contract (mirrors w01/w05 house rules):
//   - mulberry32 rng, identical to the other generator modules;
//   - every generator returns { parameters, expected, prompt, fullSolution };
//   - `expected` is always an exact integer (the numeric grader is
//     integer-exact by design; floats are graded through python-code tasks);
//   - answer spaces are deliberately wide (>= 20 distinct expected values over
//     2000 seeds, enforced by tests/data_ml_generators.test.mjs) so gate
//     re-seeds produce meaningful new instances, not memorisable answers;
//   - variation is semantic (direction, metric, framing, defect kind), never
//     just noise: every family mixes >= 3 prompt shapes;
//   - the answer never appears as a standalone number in the prompt (a
//     bounded redraw guard enforces this), while full solutions always
//     contain it;
//   - degenerate draws are retried with a bounded guard.

import { bindFamilyDraw, buildRotatedChoices, pick, randInt, rng, variantCaseIndex } from './generator_draw_kit.mjs';

const { until, clean } = bindFamilyDraw({ maxTries: 96, scope: 'data_ml_generators', normalizeUnicodeMinus: false });

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function fmtPoints(points) {
  return points.map(([x, y]) => `(${x}|${y})`).join(', ');
}

// --- W6: data cleaning ----------------------------------------------------------

export function genCompleteRows(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const [article, context] = pick(r, [
      ['Eine', 'Kundentabelle'], ['Ein', 'Sensorlog'], ['Ein', 'Bestelldatensatz'],
      ['Eine', 'Umfragetabelle'], ['Ein', 'Trainingsdatensatz'],
    ]);
    const framing = pick(r, ['drop', 'rate']);
    const rate = pick(r, [5, 10, 15, 20, 25, 30, 40]);
    const rows = until(r,
      (rr) => 5 * randInt(rr, 8, 80),
      (n) => (n * rate) % 100 === 0 && n - (n * rate) / 100 > 10);
    const missing = (rows * rate) / 100;
    const answer = rows - missing;
    return {
      parameters: { context, framing, rows, rate, missing },
      expected: answer,
      prompt: framing === 'drop'
        ? `${article} ${context} hat ${rows} Zeilen. In der Zielspalte fehlen ${missing} Werte; Zeilen mit fehlendem Zielwert werden gelöscht. Wie viele Zeilen bleiben übrig?`
        : `${article} ${context} hat ${rows} Zeilen, davon ${rate} % mit fehlendem Zielwert. Wie viele Zeilen sind vollständig (Zielwert vorhanden)?`,
      fullSolution: `Fehlende Zielwerte: ${rows} · ${rate}/100 = ${missing}. Vollständige Zeilen: ${rows} − ${missing} = ${answer}.`,
    };
  });
}

export function genDedupRows(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const [article, context] = pick(r, [
      ['Ein', 'Kundenstamm'], ['Ein', 'Event-Log'], ['Ein', 'Produktkatalog'], ['Eine', 'Adressliste'],
    ]);
    const dropKey = r() < 0.5;
    const rows = randInt(r, 120, 380);
    const exactDups = randInt(r, 5, 60);
    const keyConflicts = dropKey ? randInt(r, 1, 20) : randInt(r, 0, 20);
    const answer = dropKey ? rows - exactDups - keyConflicts : rows - exactDups;
    return {
      parameters: { context, dropKey, rows, exactDups, keyConflicts },
      expected: answer,
      prompt: dropKey
        ? `${article} ${context} hat ${rows} Zeilen. ${exactDups} Zeilen sind exakte Duplikate und werden entfernt. Danach bleiben ${keyConflicts} Zeilen mit doppeltem Schlüssel, aber abweichenden Werten; auch sie werden auf die jeweils erste Zeile reduziert. Wie viele Zeilen bleiben?`
        : `${article} ${context} hat ${rows} Zeilen. ${exactDups} Zeilen sind exakte Duplikate (identische Werte in allen Spalten) und werden gelöscht. ${keyConflicts} weitere Zeilen teilen nur den Schlüssel, unterscheiden sich aber in den Werten und bleiben erhalten. Wie viele Zeilen bleiben?`,
      fullSolution: dropKey
        ? `Exakte Duplikate entfernen: ${rows} − ${exactDups} = ${rows - exactDups}. Doppelte Schlüssel auf die erste Zeile reduzieren: ${rows - exactDups} − ${keyConflicts} = ${answer}.`
        : `Nur exakte Duplikate zählen: ${rows} − ${exactDups} = ${answer}. Schlüssel-Duplikate mit abweichenden Werten sind keine exakten Duplikate und bleiben.`,
    };
  });
}

// --- W7: EDA & conditional probability ------------------------------------------

export function genConditionalCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const setting = pick(r, [
      'einer Klinik', 'eines Supports', 'einer Fabrik', 'einer Versicherung',
    ]);
    const direction = pick(r, ['count', 'percent']);
    if (direction === 'count') {
      const q = pick(r, [2, 3, 4, 5, 8, 10]);
      const p = until(r, (rr) => randInt(rr, 1, q - 1), (v) => gcd(v, q) === 1);
      const t = randInt(r, 4, 30);
      const nA = q * t;
      const withB = p * t;
      return {
        parameters: { setting, direction, p, q, nA },
        expected: withB,
        prompt: `In den Daten ${setting} haben ${nA} Fälle das Merkmal A. Genau ${p}/${q} der A-Fälle haben zusätzlich das Merkmal B. Wie viele der A-Fälle haben auch Merkmal B?`,
        fullSolution: `P(B|A) = ${p}/${q}. Anzahl: ${nA} · ${p}/${q} = ${nA / q} · ${p} = ${withB}.`,
      };
    }
    const n = pick(r, [20, 25, 40, 50]);
    // percent stays an integer and must differ from every number shown in the prompt
    const c = until(r, (rr) => randInt(rr, 1, n - 1),
      (v) => (100 * v) % n === 0 && (100 * v) / n < 100 && (100 * v) / n !== v && (100 * v) / n !== n);
    const percent = (100 * c) / n;
    return {
      parameters: { setting, direction, n, c },
      expected: percent,
      prompt: `In den Daten ${setting} erfüllen von ${n} Fällen mit Merkmal A genau ${c} zusätzlich das Merkmal B. Wie hoch ist P(B|A) in ganzen Prozent?`,
      fullSolution: `P(B|A) = ${c}/${n} = ${percent} %.`,
    };
  });
}

// --- W8: gradient & regression from first principles ----------------------------

export function genMseGradient(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const n = pick(r, [2, 3, 4]);
    const w = pick(r, [-3, -2, -1, 1, 2, 3]);
    const b = randInt(r, -4, 4);
    const drawn = (rr) => {
      const xs = [];
      while (xs.length < n) {
        const x = randInt(rr, -6, 6);
        if (x !== 0 && !xs.includes(x)) xs.push(x);
      }
      const residuals = Array.from({ length: n }, () => randInt(rr, -6, 6));
      const s = xs.reduce((acc, x, i) => acc + x * residuals[i], 0);
      return { xs, residuals, s };
    };
    const { xs, residuals, s } = until(r, drawn,
      (d) => (2 * d.s) % n === 0 && d.residuals.some((x) => x !== 0));
    const points = xs.map((x, i) => [x, w * x + b - residuals[i]]);
    const answer = (2 * s) / n;
    return {
      parameters: { n, w, b, points },
      expected: answer,
      prompt: `Ein lineares Modell ŷ = ${w}·x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} wird auf den Punkten ${fmtPoints(points)} trainiert (MSE = (1/n)·Σ(ŷᵢ − yᵢ)²). Wie groß ist die Ableitung ∂MSE/∂w am aktuellen Modell?`,
      fullSolution: `Residuen rᵢ = ŷᵢ − yᵢ = ${residuals.join(', ')}. ∂MSE/∂w = (2/${n})·Σ xᵢ·rᵢ = (2/${n})·(${s}) = ${answer}.`,
    };
  });
}

// --- W9: baselines ---------------------------------------------------------------

export function genBaselineCorrect(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const scenario = pick(r, [
      ['Spam', 'Newsletter', 'privat'], ['Betrug', 'Verdacht', 'normal'], ['Defekt', 'Verschleiß', 'in Ordnung'],
    ]);
    const counts = [
      randInt(r, 15, 160),
      randInt(r, 15, 160),
      randInt(r, 15, 160),
    ];
    const wrong = counts[0] + counts[1] + counts[2] - Math.max(...counts);
    return {
      parameters: { scenario, counts },
      expected: wrong,
      prompt: `Ein Klassifikationsdatensatz hat ${counts[0]} Beispiele der Klasse „${scenario[0]}“, ${counts[1]} der Klasse „${scenario[1]}“ und ${counts[2]} der Klasse „${scenario[2]}“. Eine Trivial-Baseline sagt immer die häufigste Klasse vorher. Wie viele Beispiele werden falsch klassifiziert?`,
      fullSolution: `Häufigste Klasse hat ${Math.max(...counts)} Beispiele. Falsch = ${counts[0]} + ${counts[1]} + ${counts[2]} − ${Math.max(...counts)} = ${wrong}.`,
    };
  });
}

// --- W10: linear regression metrics ----------------------------------------------

export function genMseFromResiduals(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const context = pick(r, ['Wohnungspreise', 'Lagerdauer', 'Absatzmengen', 'Reparaturkosten']);
    const phrasing = pick(r, ['mse', 'quadrierter']);
    const n = pick(r, [2, 3, 4, 5, 6]);
    const draw = (rr) => Array.from({ length: n }, () => randInt(rr, -9, 9));
    const residuals = until(r, draw,
      (rs) => rs.reduce((acc, x) => acc + x * x, 0) % n === 0 && rs.some((x) => x !== 0));
    const sumSquares = residuals.reduce((acc, x) => acc + x * x, 0);
    const answer = sumSquares / n;
    return {
      parameters: { context, phrasing, n, residuals },
      expected: answer,
      prompt: phrasing === 'mse'
        ? `Ein Regressionsmodell für ${context} hat auf ${n} Testpunkten die Residuen rᵢ = ${residuals.join(', ')}. Wie groß ist der MSE?`
        : `Ein Regressionsmodell für ${context} hat auf ${n} Testpunkten die Residuen rᵢ = ${residuals.join(', ')}. Wie groß ist der durchschnittliche quadrierte Fehler?`,
      fullSolution: `MSE = (1/${n})·Σrᵢ² = (1/${n})·${sumSquares} = ${answer}.`,
    };
  });
}

export function genR2Share(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const phrasing = pick(r, ['r2', 'explained', 'context']);
    const context = pick(r, ['Mietpreisschätzung', 'Lieferzeitprognose', 'Energieverbrauchsschätzung', 'Umsatzprognose']);
    const m = randInt(r, 2, 9);
    const k = until(r, (rr) => randInt(rr, 6, 94), (v) => v > 6 && v < 94);
    const ssTot = 100 * m;
    const ssRes = k * m;
    const answer = 100 - k;
    const prompt = phrasing === 'r2'
      ? `Für ein Regressionsmodell gilt auf dem Testset: Σ(yᵢ − ȳ)² = ${ssTot} und Σ(yᵢ − ŷᵢ)² = ${ssRes}. Wie groß ist R² in ganzen Prozent?`
      : phrasing === 'explained'
        ? `Für ein Regressionsmodell gilt auf dem Testset: Gesamtstreuung Σ(yᵢ − ȳ)² = ${ssTot} und unerklärte Streuung Σ(yᵢ − ŷᵢ)² = ${ssRes}. Wie viel Prozent der Streuung erklärt das Modell?`
        : `Eine ${context} wird evaluiert: Σ(yᵢ − ȳ)² = ${ssTot}, Σ(yᵢ − ŷᵢ)² = ${ssRes}. Wie viel Prozent der Streuung erklärt das Modell?`;
    return {
      parameters: { phrasing, ssRes, ssTot },
      expected: answer,
      prompt,
      fullSolution: `R² = 1 − ${ssRes}/${ssTot} = 1 − ${k}/100, also ${answer} %.`,
    };
  });
}

// --- W11: classification metrics --------------------------------------------------

export function genConfusionCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const metric = pick(r, ['actual-neg', 'predicted-pos', 'actual-pos']);
    const tp = randInt(r, 10, 140);
    const fp = randInt(r, 0, 60);
    const fn = randInt(r, 0, 60);
    const tn = randInt(r, 10, 140);
    const answer = metric === 'actual-neg' ? tn + fp : metric === 'predicted-pos' ? tp + fp : tp + fn;
    const question = {
      'actual-neg': 'Wie viele Beispiele sind tatsächlich negativ?',
      'predicted-pos': 'Wie viele Beispiele werden insgesamt als positiv vorhergesagt?',
      'actual-pos': 'Wie viele Beispiele sind tatsächlich positiv?',
    }[metric];
    return {
      parameters: { metric, tp, fp, fn, tn },
      expected: answer,
      prompt: `Konfusionsmatrix eines Klassifikators: TP = ${tp}, FP = ${fp}, FN = ${fn}, TN = ${tn}. ${question}`,
      fullSolution: {
        'actual-neg': `Tatsächlich negativ = TN + FP = ${tn} + ${fp} = ${answer}.`,
        'predicted-pos': `Vorhergesagt positiv = TP + FP = ${tp} + ${fp} = ${answer}.`,
        'actual-pos': `Tatsächlich positiv = TP + FN = ${tp} + ${fn} = ${answer}.`,
      }[metric],
    };
  });
}

// --- W12: cross-validation --------------------------------------------------------

export function genCvSpread(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const context = pick(r, ['Textklassifikation', 'Defektvorhersage', 'Preisschätzung', 'Abbruchprognose']);
    const k = pick(r, [4, 5, 10]);
    const draw = (rr) => Array.from({ length: k }, () => randInt(rr, 55, 95));
    const scores = until(r, draw, (ss) => Math.max(...ss) - Math.min(...ss) >= 2);
    const spread = Math.max(...scores) - Math.min(...scores);
    return {
      parameters: { context, k, scores },
      expected: spread,
      prompt: `Eine ${k}-Fold-Cross-Validation für ${context} liefert die Accuracy-Werte ${scores.join(' %, ')} %. Wie groß ist die Spannweite zwischen bestem und schlechtestem Fold, in Prozentpunkten?`,
      fullSolution: `Maximum = ${Math.max(...scores)} %, Minimum = ${Math.min(...scores)} %. Spannweite = ${spread} Prozentpunkte.`,
    };
  });
}

export function genSeedSpread(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const context = pick(r, ['Textklassifikation', 'Defektvorhersage', 'Preisschätzung', 'Abbruchprognose']);
    const runs = pick(r, [3, 5, 8]);
    const unit = pick(r, ['percent', 'fraction']);
    const draw = (rr) => Array.from({ length: runs }, () => randInt(rr, 55, 95));
    const scores = until(r, draw, (values) => Math.max(...values) - Math.min(...values) >= 2);
    const maximum = Math.max(...scores);
    const minimum = Math.min(...scores);
    const spread = maximum - minimum;
    const renderedScores = unit === 'percent'
      ? `${scores.join(' %, ')} %`
      : scores.map((score) => (score / 100).toFixed(2).replace('.', ',')).join(', ');
    const conversion = unit === 'fraction'
      ? ` Als Anteile: ${(maximum / 100).toFixed(2).replace('.', ',')} = ${maximum} % und ${(minimum / 100).toFixed(2).replace('.', ',')} = ${minimum} %.`
      : '';
    return {
      parameters: { context, runs, scores, unit },
      expected: spread,
      prompt: unit === 'percent'
        ? `Dasselbe Modell wird mit ${runs} verschiedenen Seeds trainiert und liefert die Test-Accuracy-Werte ${renderedScores}. Wie groß ist die Seed-Spannweite (bester minus schlechtester Lauf) in Prozentpunkten?`
        : `Dasselbe Modell wird mit ${runs} verschiedenen Seeds trainiert und liefert die Test-Accuracy-Werte ${renderedScores} (als Anteile). Wie groß ist die Seed-Spannweite in Prozentpunkten?`,
      fullSolution: `Maximum = ${maximum} %, Minimum = ${minimum} %. Spannweite = ${spread} Prozentpunkte (Seed-Sensitivität; ein reproduzierbarer Lauf mit festem Seed hätte Spannweite 0).${conversion}`,
    };
  });
}

// --- W13: subgroup error analysis -------------------------------------------------

export function genSubgroupGapPp(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const grouping = pick(r, ['Regionen', 'Gerätetypen', 'Altersgruppen', 'Betriebssystemen']);
    const n = pick(r, [20, 25, 50, 100]);
    const draw = (rr) => [randInt(rr, 1, n - 1), randInt(rr, 1, n - 1)];
    const [e1, e2] = until(r, draw, ([a, b]) => a !== b);
    const gap = (Math.abs(e1 - e2) * 100) / n;
    return {
      parameters: { grouping, n, e1, e2 },
      expected: gap,
      prompt: `Ein Klassifikator wird nach ${grouping} aufgeteilt. Zwei Teilgruppen haben je ${n} Beispiele: Gruppe A hat ${e1} Fehler, Gruppe B ${e2} Fehler. Wie groß ist die Differenz der Fehlerraten in ganzen Prozentpunkten?`,
      fullSolution: `Fehlerraten: ${e1}/${n} = ${(100 * e1) / n} % und ${e2}/${n} = ${(100 * e2) / n} %. Differenz: ${gap} Prozentpunkte.`,
    };
  });
}

// --- W14: regularization -----------------------------------------------------------

export function genShrinkagePercent(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const phrasing = pick(r, ['share', 'shrink', 'context']);
    const context = pick(r, ['Preismodell', 'Werbewirkungsmodell', 'Auslastungsmodell']);
    const d = pick(r, [4, 5, 10, 20, 25, 50, 100]);
    const a = randInt(r, 1, d - 1);
    const u = randInt(r, 1, 4);
    const sxx = a * u;
    const lam = (d - a) * u;
    const share = (100 * a) / d;
    const answer = phrasing === 'shrink' ? 100 - share : share;
    return {
      parameters: { phrasing, sxx, lam },
      expected: answer,
      prompt: phrasing === 'share'
        ? `Eine eindimensionale Ridge-Regression hat Σxᵢ² = ${sxx} und λ = ${lam}. Das OLS-Modell (λ = 0) hätte den Koeffizienten w_OLS = Σxᵢyᵢ/Σxᵢ². Wie viel Prozent von w_OLS bleiben nach der Ridge-Strafe erhalten (w_ridge/w_OLS, in ganzen Prozent)?`
        : phrasing === 'shrink'
          ? `Eine eindimensionale Ridge-Regression hat Σxᵢ² = ${sxx} und λ = ${lam}. Um wie viel Prozent schrumpft der Koeffizient gegenüber dem OLS-Koeffizienten w_OLS = Σxᵢyᵢ/Σxᵢ² (Schrumpfung in ganzen Prozent, also 100 · (1 − w_ridge/w_OLS))?`
          : `Für ein ${context} wird ein Ridge-Term λ = ${lam} verwendet; die Feature-Summe Σxᵢ² = ${sxx}. Wie viel Prozent des OLS-Koeffizienten bleiben erhalten (w_ridge/w_OLS, in ganzen Prozent)?`,
      fullSolution: phrasing === 'shrink'
        ? `w_ridge/w_OLS = ${sxx}/(${sxx} + ${lam}) = ${share} %; Schrumpfung = 100 − ${share} = ${answer} %.`
        : `w_ridge/w_OLS = Σxᵢ²/(Σxᵢ² + λ) = ${sxx}/(${sxx} + ${lam}) = ${answer} %.`,
    };
  });
}

// --- W15: ensembles -----------------------------------------------------------------

export function genEnsembleAccuracy(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const direction = pick(r, ['count', 'percent', 'percent']);
    const n = 20; // fixed: one example = 5 % so the percent answer stays an integer
    const bias = pick(r, [
      [0.45, 0.6, 0.75], [0.3, 0.55, 0.8], [0.4, 0.5, 0.9], [0.35, 0.65, 0.85], [0.5, 0.55, 0.7], [0.25, 0.6, 0.75],
      [0.15, 0.35, 0.5], [0.2, 0.3, 0.45], [0.15, 0.25, 0.6], [0.1, 0.4, 0.55], [0.55, 0.85, 0.9], [0.6, 0.65, 0.95],
    ]);
    const votes = Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: n }, () => (r() < bias[i] ? 1 : 0)));
    let ones = 0;
    for (let j = 0; j < n; j += 1) {
      const sum = votes[0][j] + votes[1][j] + votes[2][j];
      if (sum >= 2) ones += 1;
    }
    const answer = direction === 'count' ? ones : ones * 5;
    const label = pick(r, ['1 = Fehler erkannt, 0 = übersehen', '1 = Klasse A, 0 = Klasse B', '1 = positiv, 0 = negativ']);
    const rowsText = votes.map((v) => v.join('')).join('`, `');
    const question = direction === 'count'
      ? 'Für wie viele Beispiele gibt das Ensemble 1 aus?'
      : 'Wie hoch ist der Anteil der Beispiele mit Ensemble-Ausgabe 1, in ganzen Prozent?';
    return {
      parameters: { direction, n, votes },
      expected: answer,
      prompt: `Drei Modelle geben auf ${n} Testbeispielen Binärausgaben (${label}). Modell-Ausgaben, je eine Ziffer pro Beispiel: \`${rowsText}\`. Ein Mehrheitsensemble gibt 1 aus, wenn mindestens zwei der drei Modelle 1 ausgeben. ${question}`,
      fullSolution: direction === 'count'
        ? `Spalten mit mindestens zwei Einsen: ${ones} von ${n}.`
        : `Spalten mit mindestens zwei Einsen: ${ones} von ${n} → ${ones} · 5 = ${answer} %.`,
    };
  });
}

// --- W16: PCA -----------------------------------------------------------------------

// --- W11: Sigmoid-Regime-Kapseln (classify-sigmoid-regime) ----------------------
// Drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch → large-z/
// threshold/log-odds). Die Zahlenbanken decken die 9 kuratierten Orakel je
// Fall ab und sind für den Distinct-Boden (40) weiter: large-z 20 z-Werte,
// threshold 20, log-odds 14 Odds. Templates und Distraktoren sind wörtlich
// aus den Varianten; die drei Base-Fälle sind Konzept-Anker (Symmetriepunkt,
// z=0-Entscheidung, log(3)-Deutung) und bleiben als Befund unangetastet.
// Befund: vier large-z-Lösungen schreiben e^{--4} (Doppelminus aus -z mit
// negativem z); die Kapsel rendert dort sauber e^{4}.

/** Sigmoid als Referenzfunktion, liest nie `expected` ab. */
export function sigmoidValue(z) {
  return 1 / (1 + Math.exp(-z));
}

const fmtDe = (value) => String(value).replace('.', ',');
const fmtFix3 = (value) => value.toFixed(3).replace('.', ',');
const fmtTrim3 = (value) => (Math.round(value * 1000) / 1000).toFixed(3)
  .replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

/** Kapseln für classify-sigmoid-regime: je Profil genau eine Kapsel mit
 *  Zahlenbank und Fallbindung. Die Banken enthalten alle 27 kuratierten
 *  Orakelwerte (intro/threshold: Vielfache von 0,5 bzw. 0,25 mit |z| ≤ 5
 *  bzw. 4 ohne 0; log-odds: 14 Odds von 0,25 bis 16 ohne 1). */
export const SIGMOID_CAPSULES = {
  intro: {
    kind: 'large-z',
    zBank: [-5, -4.5, -4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    caseId: 'sigmoid-large-z',
  },
  core: {
    kind: 'threshold',
    zBank: [-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4],
    caseId: 'sigmoid-threshold',
  },
  stretch: {
    kind: 'log-odds',
    oddsBank: [0.25, 0.5, 0.75, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16],
    caseId: 'sigmoid-log-odds',
  },
};

const SIGMOID_IDS = ['a', 'b', 'c', 'd'];

/** Ein Template je Fallart: options[0] ist korrekt, Texte wörtlich aus den
 *  kuratierten Varianten (large-z/threshold) bzw. aus deren
 *  Distraktor-Bauart (log-odds: Log-Falle, Invers-Odds, Invertierung). */
const sigmoidOptions = (parameters, capsule) => {
  if (capsule.kind === 'log-odds') {
    const p = parameters.odds / (1 + parameters.odds);
    const text = fmtDe(parameters.odds);
    return [
      `Die Wahrscheinlichkeit ist ungefähr ${fmtTrim3(p)}, entsprechend Odds von ${text}:1.`,
      `Die Wahrscheinlichkeit ist $\\log(${text})$ und damit größer als 1.`,
      `Die Wahrscheinlichkeit ist ${fmtTrim3(p)}, aber die Odds sind ${fmtTrim3(1 / parameters.odds)}:1.`,
      `Die Wahrscheinlichkeit ist ungefähr ${fmtTrim3(1 - p)}, weil der Logit positiv invertiert wird.`,
    ];
  }
  if (capsule.kind === 'threshold') {
    return [
      `$\\sigma(${fmtDe(parameters.z)})\\approx ${fmtFix3(parameters.sigmoid)}$; bei Schwelle 0,5 entsteht die Klassenentscheidung ${parameters.sigmoid >= 0.5 ? 1 : 0}.`,
      'Die Ausgabe ist 0, weil der Logit nur das Vorzeichen trägt.',
      'Die Ausgabe ist negativ, weil der Logit kein positives Signal enthält.',
      'Die Ausgabe ist exakt 1 und die Klasse damit unabhängig vom Schwellenwert festgelegt.',
    ];
  }
  return [
    `$\\sigma(${fmtDe(parameters.z)})\\approx ${fmtFix3(parameters.sigmoid)}$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.`,
    '$\\sigma(z)$ wird negativ für negative $z$, weil $e^{-z}$ dann groß ist.',
    '$\\sigma(z)$ gibt für jedes $z$ exakt 0 oder 1 aus — eine harte Entscheidung.',
    '$\\sigma(0)=0$ und $\\sigma(z)$ wächst unbegrenzt mit $z$.',
  ];
};

const sigmoidPrompt = (parameters, capsule) => {
  if (capsule.kind === 'log-odds') return `Was bedeutet ein Logit von $z=\\log(${fmtDe(parameters.odds)})$ in einem korrekt spezifizierten logistischen Modell?`;
  if (capsule.kind === 'threshold') return `Ein logistisches Modell liefert den Logit $z=${fmtDe(parameters.z)}$. Welche Aussage über Ausgabe und Schwelle 0,5 stimmt?`;
  return `Für den Logit $z=${fmtDe(parameters.z)}$ gilt $\\sigma(z)=1/(1+e^{-z})$. Welche Aussage ist korrekt?`;
};

const sigmoidSolution = (parameters, capsule) => {
  if (capsule.kind === 'log-odds') {
    const text = fmtDe(parameters.odds);
    const p = parameters.odds / (1 + parameters.odds);
    return `Für Odds ${text} gilt $p=${text}/(1+${text})\\approx ${fmtTrim3(p)}$. Der Logit ist der Logarithmus der Odds.`;
  }
  const shown = fmtDe(parameters.z);
  const approx = fmtFix3(sigmoidValue(parameters.z));
  if (capsule.kind === 'threshold') {
    return `$\\sigma(${shown})\\approx ${approx}$. Der Vergleich mit 0,5 liefert daher Klasse ${sigmoidValue(parameters.z) >= 0.5 ? 1 : 0}; die Sigmoid-Ausgabe selbst ist keine harte Klassenentscheidung.`;
  }
  const exponent = parameters.z < 0 ? fmtDe(-parameters.z) : `-${shown}`;
  return `Einsetzen liefert $1/(1+e^{${exponent}})\\approx ${approx}$. Die Sigmoid-Ausgabe bleibt in $(0,1)$ und ist keine harte 0/1-Entscheidung.`;
};

/** Kapselform: Bankzugehörigkeit plus nachgerechnete Kennzahl (6-stellig
 *  wie die kuratierten Orakel, Toleranz 1e-6). */
export function sigmoidCapsuleOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  if (capsule.kind === 'log-odds') {
    if (!capsule.oddsBank.includes(parameters.odds)) return false;
    return Math.abs(parameters.logit - Math.log(parameters.odds)) <= 1e-6;
  }
  if (!capsule.zBank.includes(parameters.z)) return false;
  if (Math.abs(parameters.sigmoid - sigmoidValue(parameters.z)) > 1e-6) return false;
  return capsule.kind === 'large-z' || parameters.threshold === 0.5;
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function sigmoidCorrectText(parameters, capsule) {
  if (!sigmoidCapsuleOk(parameters, capsule)) throw new Error('Parameter verletzen die Kapselform');
  return sigmoidOptions(parameters, capsule)[0];
}

// --- W26: Benchmark-Reading-Kapseln (classify-benchmark-reading) --------------
// Drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch →
// absolute-gain/absolute-relative/imbalanced-accuracy). Die zwei
// Zahlen-Templates decken die je 9 kuratierten Orakel ab (intro: before
// 0,4 bis 0,91, Gain 40 bis 95 Tausendstel; core: before 25 bis 80,
// Gain 6 bis 15 Hundertstel), die Szenario-Bank alle 9 kuratierten
// Mehrheits-Anteile plus 9 weitere für den Distinct-Boden. Templates und
// Distraktoren sind wörtlich aus den Varianten; die drei Base-Fälle sind
// Konzept-Anker (BERT-GLUE, Accuracy-Basis, Mehrheits-Baseline) und bleiben
// als Befund unangetastet.

/** Kapseln für classify-benchmark-reading: je Profil genau eine Kapsel mit
 *  Art und Fallbindung. Die Zahlenbereiche enthalten alle 18 kuratierten
 *  Orakel-Paare, die Anteils-Bank alle 9 kuratierten Orakel-Anteile. */
export const BENCHMARK_CAPSULES = {
  intro: { kind: 'absolute-gain', caseId: 'benchmark-absolute-gain' },
  core: { kind: 'absolute-relative', caseId: 'benchmark-absolute-relative' },
  stretch: {
    kind: 'imbalanced-accuracy',
    shareBank: [0.6, 0.65, 0.7, 0.72, 0.75, 0.78, 0.8, 0.82, 0.85, 0.87, 0.88, 0.9, 0.92, 0.93, 0.95, 0.96, 0.97, 0.99],
    caseId: 'benchmark-imbalanced-accuracy',
  },
};

const BENCHMARK_IDS = ['a', 'b', 'c', 'd'];

/** Ein Template je Fallart: options[0] ist korrekt, Texte wörtlich aus den
 *  Bestandsvarianten (Gain mit Prozentpunkten plus Relativ-Prozent,
 *  Accuracy-Differenz mit absolut/relativ, Mehrheits-Baseline). */
const benchmarkOptions = (parameters, capsule) => {
  if (capsule.kind === 'imbalanced-accuracy') {
    const acc = Math.round(parameters.accuracy * 100);
    const pos = Math.round(parameters.positiveShare * 100);
    return [
      `Die Accuracy von ${acc} % entspricht hier der Mehrheits-Baseline (${acc} %) und sagt nichts über den positiven Recall aus.`,
      `${acc} % Accuracy beweist, dass beide Klassen gleich gut erkannt werden.`,
      `Ein Modell ohne positive Treffer hat automatisch ${pos} % Accuracy.`,
      'Bei unausgeglichenen Klassen ist Accuracy mathematisch immer null.',
    ];
  }
  const { before, after } = parameters;
  const diff = after - before;
  const beforeText = fmtDe(before);
  const afterText = fmtDe(after);
  if (capsule.kind === 'absolute-relative') {
    const diffText = fmtDe(Math.round(diff * 100) / 100);
    const ppText = fmtDe(Math.round(diff * 100));
    const relText = fmtTrim3((diff / before) * 100);
    return [
      `Es sind ${ppText} Prozentpunkte absolut und ungefähr ${relText} Prozent relativ.`,
      `Der Gewinn beträgt ${ppText} Prozent, weil ${afterText} minus ${beforeText} gleich ${diffText} ist.`,
      `Der Gewinn beträgt ${relText} Prozentpunkte, weil ${diffText} durch ${beforeText} geteilt wird.`,
      'Es gibt keinen Gewinn, weil beide Werte unter 1 liegen.',
    ];
  }
  const ppText = fmtDe(Math.round(diff * 1000) / 10);
  const relText = fmtTrim3((diff / before) * 100);
  const afterPct = fmtDe(Math.round(after * 1000) / 10);
  return [
    `Der Score stieg von ${beforeText} auf ${afterText} — ein absoluter Zuwachs von ${ppText} Prozentpunkten (relativ etwa ${relText} %).`,
    `Der Score stieg von ${ppText} % auf ${afterPct} % — die Baseline fehlt.`,
    `Der Gewinn beträgt ${ppText} % relativ; Prozentpunkte und relative Prozente sind identisch.`,
    'Der Zuwachs ist nicht angegeben, weil beide Werte unter 1 liegen.',
  ];
};

const benchmarkPrompt = (parameters, capsule) => {
  if (capsule.kind === 'imbalanced-accuracy') {
    const neg = Math.round(parameters.negativeShare * 100);
    const pos = Math.round(parameters.positiveShare * 100);
    const acc = Math.round(parameters.accuracy * 100);
    return `In einem Datensatz sind ${neg} % der Fälle negativ und ${pos} % positiv. Ein Modell erreicht ${acc} % Accuracy, erkennt aber keinen positiven Fall. Welche Aussage ist sauber?`;
  }
  if (capsule.kind === 'absolute-relative') {
    return `Ein Modell steigt von Accuracy $${fmtDe(parameters.before)}$ auf $${fmtDe(parameters.after)}$. Welche Einordnung ist rechnerisch korrekt?`;
  }
  return `Ein Benchmark-Score steigt von ${fmtDe(parameters.before)} auf ${fmtDe(parameters.after)}. Welche Weitererzählung ist rechnerisch korrekt?`;
};

const benchmarkSolution = (parameters, capsule) => {
  if (capsule.kind === 'imbalanced-accuracy') {
    const acc = Math.round(parameters.accuracy * 100);
    return `Ein Modell, das immer die Mehrheitsklasse vorhersagt, erreicht bereits ${acc} % Accuracy. Ohne positive Treffer bleibt der positive Recall 0; die Accuracy allein ist daher irreführend.`;
  }
  const { before, after } = parameters;
  const diff = after - before;
  if (capsule.kind === 'absolute-relative') {
    const diffText = fmtDe(Math.round(diff * 100) / 100);
    const ppText = fmtDe(Math.round(diff * 100));
    const relText = fmtTrim3((diff / before) * 100);
    return `Die absolute Differenz ist ${diffText} = ${ppText} Prozentpunkte. Relativ zum Ausgangswert ergibt sich ${relText} %.`;
  }
  const diffText = fmtDe(Math.round(diff * 1000) / 1000);
  const ppText = fmtDe(Math.round(diff * 1000) / 10);
  const relText = fmtTrim3((diff / before) * 100);
  return `Absolut: ${fmtDe(after)}−${fmtDe(before)}=${diffText}, also ${ppText} Prozentpunkte. Relativ sind das ungefähr ${relText} %.`;
};

/** Kapselform über den gespeicherten Parametern: Zahlenbereiche plus
 *  Tausendstel-/Hundertstel-Raster und vier paarweise verschiedene
 *  Antworttexte; bei der Anteils-Bank Bankzugehörigkeit plus
 *  Mehrheits-Identität (accuracy = negativeShare, positiveShare = Rest). */
export function benchmarkCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (capsule.kind === 'imbalanced-accuracy') {
      const { negativeShare, positiveShare, accuracy } = parameters;
      if (!capsule.shareBank.includes(negativeShare)) return false;
      if (Math.abs(positiveShare - (1 - negativeShare)) > 1e-9) return false;
      if (Math.abs(accuracy - negativeShare) > 1e-9) return false;
    } else if (capsule.kind === 'absolute-relative') {
      const { before, after } = parameters;
      if (typeof before !== 'number' || typeof after !== 'number') return false;
      if (!(before >= 0.2 && before <= 0.85 && after > before && after <= 0.9)) return false;
      const gain100 = Math.round(after * 100) - Math.round(before * 100);
      if (!(gain100 >= 5 && gain100 <= 16)) return false;
      if (Math.abs(before * 100 - Math.round(before * 100)) > 1e-6) return false;
      if (Math.abs(after * 100 - Math.round(after * 100)) > 1e-6) return false;
    } else {
      const { before, after } = parameters;
      if (typeof before !== 'number' || typeof after !== 'number') return false;
      if (!(before >= 0.4 && before <= 0.91 && after > before && after <= 0.98)) return false;
      const gain1000 = Math.round(after * 1000) - Math.round(before * 1000);
      if (!(gain1000 >= 40 && gain1000 <= 100)) return false;
      if (Math.abs(before * 1000 - Math.round(before * 1000)) > 1e-6) return false;
      if (Math.abs(after * 1000 - Math.round(after * 1000)) > 1e-6) return false;
    }
    return new Set(benchmarkOptions(parameters, capsule)).size === 4;
  } catch { return false; }
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function benchmarkCorrectText(parameters, capsule) {
  if (!benchmarkCapsuleOk(parameters, capsule)) throw new Error('Benchmark-Befund verletzt die Kapselform');
  return benchmarkOptions(parameters, capsule)[0];
}

/** Zahlenbank-Sampler mit Rotation: Seed wählt Zahlenpaar bzw. Anteil und
 *  Antwortposition. Kein clean()-Guard: expected ist ein Buchstabe — Leak
 *  deckt Gate 3 im Test über den Volltext ab (Vorbild genSigmoidCapsule). */
export function genBenchmarkCapsule(seed, capsule) {
  const r = rng(seed);
  let parameters;
  if (capsule.kind === 'imbalanced-accuracy') {
    const negativeShare = pick(r, capsule.shareBank);
    parameters = {
      negativeShare,
      positiveShare: Math.round((1 - negativeShare) * 100) / 100,
      accuracy: negativeShare,
    };
  } else if (capsule.kind === 'absolute-relative') {
    const drawn = until(r, () => {
      const before100 = randInt(r, 25, 80);
      const gain100 = randInt(r, 6, 15);
      return { before100, after100: before100 + gain100 };
    }, (candidate) => candidate.after100 <= 90);
    parameters = { before: drawn.before100 / 100, after: drawn.after100 / 100 };
  } else {
    const drawn = until(r, () => {
      const before1000 = randInt(r, 400, 910);
      const gain1000 = randInt(r, 40, 95);
      return { before1000, after1000: before1000 + gain1000 };
    }, (candidate) => candidate.after1000 <= 980);
    parameters = { before: drawn.before1000 / 1000, after: drawn.after1000 / 1000 };
  }
  const options = benchmarkOptions(parameters, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters,
    expected: { correctChoice: BENCHMARK_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, BENCHMARK_IDS),
    prompt: benchmarkPrompt(parameters, capsule),
    fullSolution: benchmarkSolution(parameters, capsule),
  };
}

/** Zahlenbank-Sampler mit Rotation: Seed wählt Bankwert und Antwortposition.
 *  Kein clean()-Guard: expected ist ein Buchstabe — Leak deckt Gate 3 im
 *  Test über den Volltext ab (Vorbild genIndependenceCapsule). */
export function genSigmoidCapsule(seed, capsule) {
  const r = rng(seed);
  let parameters;
  if (capsule.kind === 'log-odds') {
    const odds = pick(r, capsule.oddsBank);
    parameters = { odds, logit: Math.round(Math.log(odds) * 1e6) / 1e6 };
  } else if (capsule.kind === 'threshold') {
    const z = pick(r, capsule.zBank);
    parameters = { z, threshold: 0.5, sigmoid: Math.round(sigmoidValue(z) * 1e6) / 1e6 };
  } else {
    const z = pick(r, capsule.zBank);
    parameters = { z, sigmoid: Math.round(sigmoidValue(z) * 1e6) / 1e6 };
  }
  const options = sigmoidOptions(parameters, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters,
    expected: { correctChoice: SIGMOID_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, SIGMOID_IDS),
    prompt: sigmoidPrompt(parameters, capsule),
    fullSolution: sigmoidSolution(parameters, capsule),
  };
}

// --- W25: LoRA-Tradeoff-Kapseln (classify-lora-tradeoff) --------------------------
// Drei Kapseln 1:1 auf den Bestandsfaellen (intro/core/stretch ->
// tradeoff/param-count/alpha-rank). Ein Begriffs-Template (Kernidee mit
// Rang/Alpha) plus zwei Rechen-Templates (Parameterzahl r(dIn+dOut),
// Skalierung alpha/r). Templates und Distraktoren woertlich aus den Varianten;
// die drei Base-Faelle sind Konzept-Anker und bleiben als Befund unangetastet.
// Befund: alle neun param-count-Varianten schreiben den r-d_in-Distraktor mit
// doppelter Klammer d_{{in}}; die Kapsel rendert dort sauber d_{in}.

/** Kapseln fuer classify-lora-tradeoff: je Profil genau eine Kapsel mit Art
 *  und Fallbindung. Die Bereiche enthalten alle 27 kuratierten Orakel. */
export const LORA_CAPSULES = {
  intro: { kind: 'tradeoff', caseId: 'lora-tradeoff' },
  core: { kind: 'param-count', caseId: 'lora-parameter-count' },
  stretch: { kind: 'alpha-rank', caseId: 'lora-alpha-rank' },
};

const LORA_IDS = ['a', 'b', 'c', 'd'];

const fmtIntDe = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Ein Template je Fallart: options[0] ist korrekt, Texte woertlich aus den
 *  Bestandsvarianten (Kernidee mit Bruch, Parameterzahl mit Tausenderpunkt,
 *  Skalierung mit Differenz/Summe/Produkt als Distraktoren). */
const loraOptions = (parameters, capsule) => {
  if (capsule.kind === 'alpha-rank') {
    const scale = parameters.alpha / parameters.rank;
    return [
      String(scale),
      String(parameters.alpha - parameters.rank),
      String(parameters.alpha + parameters.rank),
      String(parameters.alpha * parameters.rank),
    ];
  }
  if (capsule.kind === 'param-count') {
    const lora = parameters.rank * (parameters.dIn + parameters.dOut);
    const full = parameters.dIn * parameters.dOut;
    return [
      `${fmtIntDe(lora)}, weil $r(d_{in}+d_{out})=${parameters.rank}(${parameters.dIn}+${parameters.dOut})$ gilt.`,
      `${fmtIntDe(full)}, weil LoRA die volle Gewichtsmatrix zweimal speichert.`,
      `${fmtIntDe(parameters.rank * parameters.dIn)}, weil nur $r\\cdot d_{in}$ gezählt wird.`,
      `${fmtIntDe(parameters.rank * parameters.rank)}, weil nur $r^2$ und ein Bias zählen.`,
    ];
  }
  return [
    `Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{${parameters.alpha}}{${parameters.rank}}BA$ mit kleinem Rang $r=${parameters.rank}$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.`,
    'Alle Modellparameter werden mit sehr kleiner Lernrate aktualisiert, damit sich wenig ändert.',
    'Das Netz wird gestutzt (Pruning): unwichtige Zeilen von $W$ werden entfernt und die Reste neu trainiert.',
    'Die Gewichte werden quantisiert und nur die Quantisierungsfehler trainiert.',
  ];
};

const loraPrompt = (parameters, capsule) => {
  if (capsule.kind === 'alpha-rank') return `Für eine LoRA-Schicht gelten Skalierungsparameter $\\alpha=${parameters.alpha}$ und Rang $r=${parameters.rank}$. Welcher Faktor multipliziert $BA$ in $\\Delta W=(\\alpha/r)BA$?`;
  if (capsule.kind === 'param-count') return `Eine lineare Schicht hat $d_{in}=${parameters.dIn}$, $d_{out}=${parameters.dOut}$ und LoRA-Rang $r=${parameters.rank}$. Wie viele trainierbare LoRA-Parameter ersetzt die volle Matrix?`;
  return `LoRA nutzt für eine Anpassung den Rang $r=${parameters.rank}$ und den Skalierungsparameter $\\alpha=${parameters.alpha}$. Was ist die Kernidee?`;
};

const loraSolution = (parameters, capsule) => {
  if (capsule.kind === 'alpha-rank') return `Einsetzen ergibt $\\alpha/r=${parameters.alpha}/${parameters.rank}=${parameters.alpha / parameters.rank}$. Dieser Faktor multipliziert $BA$.`;
  if (capsule.kind === 'param-count') return `LoRA speichert Faktoren mit ${parameters.rank}·${parameters.dIn} und ${parameters.rank}·${parameters.dOut} Parametern. Summe: ${parameters.rank}(${parameters.dIn}+${parameters.dOut})=${parameters.rank * (parameters.dIn + parameters.dOut)}.`;
  return `LoRA friert $W$ ein und trainiert eine niedrig-rangige Korrektur $\\Delta W=(${parameters.alpha}/${parameters.rank})BA$. Dadurch bleiben die trainierbaren Matrizen klein.`;
};

/** Kapselform ueber den gespeicherten Parametern: Bereiche plus vier
 *  paarweise verschiedene Antworttexte; bei alpha-rank zusaetzlich
 *  Teilbarkeit (Skalierung ganzzahlig). */
export function loraCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (capsule.kind === 'alpha-rank') {
      const { alpha, rank } = parameters;
      if (!Number.isInteger(alpha) || !Number.isInteger(rank)) return false;
      if (!(rank >= 2 && rank <= 12)) return false;
      if (alpha % rank !== 0) return false;
      const scale = alpha / rank;
      if (!(scale >= 2 && scale <= 8)) return false;
    } else if (capsule.kind === 'param-count') {
      const { dIn, dOut, rank } = parameters;
      if (!Number.isInteger(dIn) || !Number.isInteger(dOut) || !Number.isInteger(rank)) return false;
      if (!(dIn >= 128 && dIn <= 2048 && dIn % 64 === 0)) return false;
      if (!(dOut >= 128 && dOut <= 2048 && dOut % 64 === 0)) return false;
      if (!(rank >= 2 && rank <= 16)) return false;
    } else {
      const { rank, alpha } = parameters;
      if (!Number.isInteger(rank) || !Number.isInteger(alpha)) return false;
      if (!(rank >= 1 && rank <= 16)) return false;
      if (!(alpha >= 2 && alpha <= 64)) return false;
    }
    return new Set(loraOptions(parameters, capsule)).size === 4;
  } catch { return false; }
}

/** Unabhaengiger Schluessel: korrekter Wahltext aus den Fallparametern, liest nie `expected`. */
export function loraCorrectText(parameters, capsule) {
  if (!loraCapsuleOk(parameters, capsule)) throw new Error('LoRA-Befund verletzt die Kapselform');
  return loraOptions(parameters, capsule)[0];
}

/** Zahlen-Sampler mit Rotation: Seed waehlt Parameter und Antwortposition.
 *  Kein clean()-Guard: expected ist ein Buchstabe — Leak deckt Gate 3 im
 *  Test ueber den Volltext ab (Vorbild genSigmoidCapsule). Einzige
 *  Ausnahme: alpha-rank verengt um die degenerierte Klasse Antwort==Rang
 *  (Vorbild genConditionalCount: Antwort muss sich von jeder Promptzahl
 *  unterscheiden). Befund: 2/9 kuratierte Orakel plus der Base-Fall
 *  (16,4) haben Antwort==Rang — Bestand, keine Generator-Verstaerkung;
 *  die Kapselform laesst sie zu, der Sampler erzeugt sie nicht. */
export function genLoraCapsule(seed, capsule) {
  const r = rng(seed);
  let parameters;
  if (capsule.kind === 'alpha-rank') {
    parameters = until(r, () => {
      const rank = randInt(r, 2, 12);
      const scale = randInt(r, 2, 8);
      return { alpha: rank * scale, rank };
    }, (candidate) => candidate.alpha / candidate.rank !== candidate.rank
      && new Set(loraOptions(candidate, capsule)).size === 4);
  } else if (capsule.kind === 'param-count') {
    parameters = { dIn: 64 * randInt(r, 2, 32), dOut: 64 * randInt(r, 2, 32), rank: randInt(r, 2, 16) };
  } else {
    parameters = { rank: randInt(r, 1, 16), alpha: randInt(r, 2, 64) };
  }
  const options = loraOptions(parameters, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters,
    expected: { correctChoice: LORA_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, LORA_IDS),
    prompt: loraPrompt(parameters, capsule),
    fullSolution: loraSolution(parameters, capsule),
  };
}

export function genPcaVariancePercent(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const context = pick(r, ['Sensorfeatures', 'Bilddeskriptoren', 'Umfragemerkmalen', 'Kursmetriken']);
    const total = pick(r, [20, 25, 50]);
    const lambda1 = until(r,
      (rr) => randInt(rr, Math.floor(total / 2) + 1, total - 2),
      (v) => (100 * v) % total === 0 && v > total - v);
    const rest = total - lambda1;
    const lambda2 = randInt(r, Math.ceil(rest / 2), rest - 1);
    const lambda3 = rest - lambda2;
    const answer = (100 * lambda1) / total;
    return {
      parameters: { context, total, lambda1, lambda2, lambda3 },
      expected: answer,
      prompt: `Eine PCA auf ${context} liefert die Eigenwerte λ₁ = ${lambda1}, λ₂ = ${lambda2}, λ₃ = ${lambda3} (in Einheiten, in denen λ₁ + λ₂ + λ₃ = ${total}). Wie viel Prozent der Gesamtvarianz erklärt die erste Hauptkomponente?`,
      fullSolution: `Anteil = λ₁/(λ₁ + λ₂ + λ₃) = ${lambda1}/${total} = ${answer} %.`,
    };
  });
}

// --- W06: Missingness-Kapseln (classify-missingness) -----------------------------
// Drei Kapseln 1:1 auf den Bestandsfaellen (intro/core/stretch →
// target-dependent-missingness/missingness-device-censoring/
// missingness-income-survey). Slot-Bank plus Rotation: je Kapsel eine
// Szenario-Bank (9 kuratierte Varianten plus 5 weitere fuer den
// Distinct-Boden), ein Options-Template je Fallart, Rotation ueber vier
// Antwortpositionen. Die korrekten Wahltexte der 27 kuratierten Varianten
// bleiben woertlich; die drei Base-Faelle sind Anker und bleiben als
// Befund unangetastet. Befund: der Base-Fall missingness-device-censoring
// traegt im Bestand das thema „zielabhängige Missingness“ (Copy-Paste aus
// Fall 1); der Anker wird auf „wertabhängiges Zensieren“ angleicht
// (vermerkt im Testkopf).

/** Kapseln fuer classify-missingness: je Profil genau eine Kapsel mit
 *  Slot-Namen, Fallbindung und Szenario-Bank. Die Banken enthalten alle
 *  27 kuratierten Orakel-Szenarien (je 9 je Fall) plus 5 weitere je Kapsel
 *  fuer den Distinct-Boden (14 Szenarien x 4 Rotationen = 56 Kombinationen). */
export const MISSINGNESS_CAPSULES = {
  intro: {
    kind: 'ziel-abhaengig',
    slot: 'ziel',
    thema: 'zielabhängige Missingness',
    caseId: 'target-dependent-missingness',
    bank: [
      {
        ziel: 'Gehalt',
        prompt: 'In einer Gehaltstabelle fehlt der Zielwert „Jahresgehalt“ genau bei den bestbezahlten Beschäftigten, weil sie der Veröffentlichung nicht zugestimmt haben. Was droht, wenn du alle Zeilen mit fehlendem Zielwert einfach löschst?',
        correct: 'Die verbleibenden Daten unterschätzen das durchschnittliche Gehalt systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
        fehlende: 'die hohen Gehälter',
        hoch: 'Gehälter',
      },
      {
        ziel: 'Liegezeit',
        prompt: 'In einer Klinikdatei fehlt die Liegedauer genau bei sehr langen Aufenthalten, weil diese Fälle intern archiviert und nicht exportiert werden. Was droht beim Löschen aller Zeilen ohne Liegedauer?',
        correct: 'Die verbleibenden Daten unterschätzen die mittlere Liegezeit — das Löschen verzerrt, weil lange Aufenthalte gezielt fehlen.',
        fehlende: 'die langen Aufenthalte',
        hoch: 'Liegezeiten',
      },
      {
        ziel: 'Note',
        prompt: 'In einem Kurs fehlen Klausurnoten genau bei den besten Leistungen, weil diese Studierenden der Weitergabe nicht zustimmen. Was passiert, wenn du Zeilen ohne Note löschst?',
        correct: 'Die verbleibenden Noten unterschätzen den Mittelwert systematisch, weil gerade die besten Ergebnisse fehlen.',
        fehlende: 'die besten Noten',
        hoch: 'Noten',
      },
      {
        ziel: 'Bestellwert',
        prompt: 'In einer Bestelltabelle fehlt der Umsatz genau bei Großaufträgen, weil diese unter NDA stehen. Was droht, wenn du alle Zeilen ohne Umsatz löschst?',
        correct: 'Der mittlere Bestellwert der Restzeilen liegt zu niedrig, weil genau die großen Aufträge fehlen.',
        fehlende: 'die Großaufträge',
        hoch: 'Aufträge',
      },
      {
        ziel: 'Schadstoff',
        prompt: 'Ein Luftmessnetz liefert den Zielwert PM2,5 nicht an Tagen mit sehr hoher Belastung, weil das Gerät in den Alarmmodus wechselt und keinen Zahlenwert sendet. Was droht beim Löschen dieser Tage?',
        correct: 'Der Mittelwert der gemeldeten Werte unterschätzt die Belastung, weil Extremtage fehlen.',
        fehlende: 'die Extremtage',
        hoch: 'Messwerte',
      },
      {
        ziel: 'Ausfall',
        prompt: 'In einer Kreditdatei fehlt das Label „Zahlungsausfall“ genau bei Kundinnen mit sehr hohem Risiko, weil diese der Auswertung widersprochen haben. Was droht beim Löschen aller Zeilen ohne Label?',
        correct: 'Die Ausfallrate der Restzeilen ist zu niedrig, weil genau die kritischen Fälle fehlen.',
        fehlende: 'die kritischen Fälle',
        hoch: 'Ausfälle',
      },
      {
        ziel: 'Strom',
        prompt: 'In Verbrauchsdaten fehlt der Jahresstrom genau bei Haushalten mit sehr hohem Verbrauch, weil sie der Datenweitergabe widersprechen. Was droht, wenn du diese Zeilen löschst?',
        correct: 'Der mittlere Verbrauch der Restzeilen liegt zu niedrig, weil Spitzenverbraucher fehlen.',
        fehlende: 'die Spitzenverbraucher',
        hoch: 'Verbrauchswerte',
      },
      {
        ziel: 'Spende',
        prompt: 'In einer Spendenstatistik fehlt der Betrag genau bei den höchsten Einzelspenden, weil diese anonym bleiben sollen. Was droht beim Löschen der Zeilen ohne Betrag?',
        correct: 'Der Mittelwert der beobachteten Spenden unterschätzt den wahren Mittelwert, weil große Spenden fehlen.',
        fehlende: 'die großen Spenden',
        hoch: 'Spenden',
      },
      {
        ziel: 'Miete',
        prompt: 'Auf einem Mietportal fehlt der Zielwert „Kaltmiete“ genau bei den teuersten Wohnungen, weil die Anbieter den Preis nur auf Anfrage nennen. Was droht, wenn du Anzeigen ohne Preis löschst?',
        correct: 'Die verbleibenden Mieten unterschätzen das Niveau, weil teure Wohnungen gezielt fehlen.',
        fehlende: 'die teuren Wohnungen',
        hoch: 'Mieten',
      },
      {
        ziel: 'Punktzahl',
        prompt: 'Auf einer Lernplattform fehlt der Zielwert „Abschlussscore“ genau bei den fleißigsten Nutzerinnen, weil diese ihre Profile privat halten. Was droht, wenn du alle Zeilen mit fehlendem Zielwert einfach löschst?',
        correct: 'Die verbleibenden Daten unterschätzen den durchschnittlichen Abschlussscore systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
        fehlende: 'die hohen Abschlussscores',
        hoch: 'Abschlussscores',
      },
      {
        ziel: 'Reparaturkosten',
        prompt: 'In einer Werkstattdatei fehlt der Zielwert „Reparaturkosten“ genau bei den teuersten Aufträgen, weil diese über Garantien abgerechnet werden. Was droht, wenn du alle Zeilen mit fehlendem Zielwert einfach löschst?',
        correct: 'Die verbleibenden Daten unterschätzen die mittleren Reparaturkosten systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
        fehlende: 'die teuren Reparaturaufträge',
        hoch: 'Reparaturaufträge',
      },
      {
        ziel: 'Ladezeit',
        prompt: 'In einem Web-Log fehlt der Zielwert „Ladezeit“ genau bei den langsamsten Seitenaufrufen, weil das Tracking bei Timeouts abbricht. Was droht, wenn du alle Zeilen mit fehlender Ladezeit löschst?',
        correct: 'Die verbleibenden Daten unterschätzen die mittlere Ladezeit systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
        fehlende: 'die langsamen Seitenaufrufe',
        hoch: 'Ladezeiten',
      },
      {
        ziel: 'Kalorien',
        prompt: 'In einer Ernährungs-App fehlt der Zielwert „Kalorien“ genau bei den Tagen mit höchstem Verbrauch, weil diese Einträge unvollständig bleiben. Was droht, wenn du alle Zeilen mit fehlendem Zielwert einfach löschst?',
        correct: 'Die verbleibenden Daten unterschätzen die mittlere Kalorienmenge systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
        fehlende: 'die kalorienreichen Tage',
        hoch: 'Kalorienwerte',
      },
      {
        ziel: 'Sitzungsdauer',
        prompt: 'In einem Analytics-Export fehlt die Sitzungsdauer genau bei den längsten Sitzungen, weil diese beim Timeout abgeschnitten werden. Was droht, wenn du alle Zeilen mit fehlender Sitzungsdauer löschst?',
        correct: 'Die verbleibenden Daten unterschätzen die mittlere Sitzungsdauer systematisch — das Löschen verzerrt, weil das Fehlen vom Zielwert abhängt.',
        fehlende: 'die langen Sitzungen',
        hoch: 'Sitzungsdauern',
      },
    ],
  },
  core: {
    kind: 'sensor-zensiert',
    slot: 'sensor',
    thema: 'wertabhängiges Zensieren',
    caseId: 'missingness-device-censoring',
    bank: [
      {
        sensor: 'Blutdruckmanschette',
        prompt: 'Eine Blutdruckmanschette liefert keinen Zahlenwert, sobald der Druck über 180 mmHg liegt, und speichert dann eine Lücke. Was ist die sauberste Diagnose?',
        extrem: 'extreme Blutdruckwerte',
      },
      {
        sensor: 'Personenwaage',
        prompt: 'Eine Personenwaage zeigt bei Werten über 150 kg keine Zahl, sondern ein leeres Feld. Was ist die sauberste Diagnose, wenn du leere Felder löschst?',
        extrem: 'sehr hohe Gewichte',
      },
      {
        sensor: 'Mikrofon',
        prompt: 'Ein Mikrofon speichert bei Pegel über 0 dBFS keinen Zahlenwert, sondern eine Lücke. Was ist die sauberste Diagnose?',
        extrem: 'laute Peaks',
      },
      {
        sensor: 'pH-Sonde',
        prompt: 'Eine pH-Sonde liefert außerhalb von 2 bis 12 keinen Messwert, sondern einen Fehlstatus. Was ist die sauberste Diagnose?',
        extrem: 'extreme pH-Werte',
      },
      {
        sensor: 'Glukosemessgerät',
        prompt: 'Ein Glukosemessgerät schreibt statt einer Zahl „HI“, sobald der Wert über 400 mg/dl liegt; in der Tabelle steht dann fehlend. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Glukosewerte',
      },
      {
        sensor: 'Geschwindigkeitsmessung',
        prompt: 'Eine Lichtschranke protokolliert keine Geschwindigkeit über 250 km/h, sondern eine leere Zelle. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Geschwindigkeiten',
      },
      {
        sensor: 'Altimeter',
        prompt: 'Ein Höhenmesser speichert oberhalb von 8000 m keinen Zahlenwert. Was ist die sauberste Diagnose, wenn du diese Lücken löschst?',
        extrem: 'große Höhen',
      },
      {
        sensor: 'Leistungsmesser',
        prompt: 'Ein Leistungsmesser liefert bei Überlast keine Wattzahl, weil die Sicherung auslöst. Was ist die sauberste Diagnose?',
        extrem: 'Lastspitzen',
      },
      {
        sensor: 'Feinstaubsensor',
        prompt: 'Ein Feinstaubsensor schreibt bei Konzentrationen über seinem Messbereich keine Zahl, sondern einen Fehlcode. Was ist die sauberste Diagnose?',
        extrem: 'saturierte Extremwerte',
      },
      {
        sensor: 'Thermometer',
        prompt: 'Ein Ofenthermometer liefert oberhalb von 500 °C keinen Messwert, sondern einen Fehlcode. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Temperaturen',
      },
      {
        sensor: 'Füllstandssensor',
        prompt: 'Ein Füllstandssensor gibt bei Überlauf keinen Füllstand, sondern einen Fehlstatus aus. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Füllstände',
      },
      {
        sensor: 'Netzwerkmonitor',
        prompt: 'Ein Netzwerkmonitor protokolliert keine Latenzen über 1000 ms, sondern eine leere Zelle. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Latenzen',
      },
      {
        sensor: 'Windsensor',
        prompt: 'Ein Windsensor speichert bei Böen über 150 km/h keinen Zahlenwert. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Windgeschwindigkeiten',
      },
      {
        sensor: 'Ladesäule',
        prompt: 'Eine Ladesäule bricht die Aufzeichnung bei Ladeleistungen über 150 kW ab und hinterlässt eine Lücke. Was ist die sauberste Diagnose?',
        extrem: 'sehr hohe Ladeleistungen',
      },
    ],
  },
  stretch: {
    kind: 'umfrage-wertabhaengig',
    slot: 'ziel',
    thema: 'zielabhängige Missingness',
    caseId: 'missingness-income-survey',
    bank: [
      {
        ziel: 'Vermögen',
        prompt: 'Bei einer freiwilligen Vermögensumfrage fehlt die Angabe besonders häufig bei sehr hohen Vermögen. Welche Folgerung ist korrekt?',
        groesse: 'den Mittelwert des Vermögens',
      },
      {
        ziel: 'Bonus',
        prompt: 'In einer freiwilligen Bonusumfrage fehlen Beträge besonders oft bei den höchsten Boni. Welche Folgerung ist korrekt?',
        groesse: 'den mittleren Bonus',
      },
      {
        ziel: 'Firmenumsatz',
        prompt: 'In einer Branchenumfrage fehlt der Jahresumsatz besonders häufig bei den umsatzstärksten Firmen. Welche Folgerung ist korrekt?',
        groesse: 'den mittleren Umsatz',
      },
      {
        ziel: 'Arbeitszeit',
        prompt: 'In einer Arbeitszeitumfrage fehlen Angaben besonders oft bei Personen mit sehr vielen Überstunden. Welche Folgerung ist korrekt?',
        groesse: 'die mittlere Arbeitszeit',
      },
      {
        ziel: 'Immobilienwert',
        prompt: 'Bei einer freiwilligen Immobilienumfrage fehlt der Schätzwert besonders häufig bei sehr teuren Objekten. Welche Folgerung ist korrekt?',
        groesse: 'den mittleren Immobilienwert',
      },
      {
        ziel: 'Spendenbereitschaft',
        prompt: 'In einer Spendenumfrage fehlt der Betrag besonders oft bei sehr hohen geplanten Spenden. Welche Folgerung ist korrekt?',
        groesse: 'den mittleren Spendenbetrag',
      },
      {
        ziel: 'Kilometerstand',
        prompt: 'In einer freiwilligen Fahrleistungsumfrage fehlt der Kilometerstand besonders häufig bei Vielfahrerinnen. Welche Folgerung ist korrekt?',
        groesse: 'den mittleren Kilometerstand',
      },
      {
        ziel: 'Körpergewicht',
        prompt: 'In einer Gesundheitsumfrage fehlt das Körpergewicht besonders häufig bei sehr hohen Werten. Welche Folgerung ist korrekt?',
        groesse: 'den Mittelwert des Gewichts',
      },
      {
        ziel: 'Nettovermögen',
        prompt: 'In einer Haushaltsbefragung fehlt das Nettovermögen besonders oft in der obersten Vermögensgruppe. Welche Folgerung ist korrekt?',
        groesse: 'den Mittelwert',
      },
      {
        ziel: 'Pendelzeit',
        prompt: 'In einer freiwilligen Pendelumfrage fehlt die tägliche Pendelzeit besonders häufig bei sehr langen Wegen. Welche Folgerung ist korrekt?',
        groesse: 'die mittlere Pendelzeit',
      },
      {
        ziel: 'Bildschirmzeit',
        prompt: 'In einer freiwilligen Bildschirmzeit-Umfrage fehlen Angaben besonders oft bei sehr hoher täglicher Nutzung. Welche Folgerung ist korrekt?',
        groesse: 'die mittlere Bildschirmzeit',
      },
      {
        ziel: 'Mietbelastung',
        prompt: 'In einer Haushaltsbefragung fehlt die Mietbelastung besonders oft bei sehr hohen Mieten. Welche Folgerung ist korrekt?',
        groesse: 'die mittlere Mietbelastung',
      },
      {
        ziel: 'Wegstrecke',
        prompt: 'In einer Mobilitätsumfrage fehlt die täglich gefahrene Strecke besonders häufig bei Vielfahrerinnen. Welche Folgerung ist korrekt?',
        groesse: 'die mittlere Tagesstrecke',
      },
      {
        ziel: 'Stromkosten',
        prompt: 'In einer Energieumfrage fehlen die Stromkosten besonders oft bei Haushalten mit elektrischer Heizung. Welche Folgerung ist korrekt?',
        groesse: 'die mittleren Stromkosten',
      },
    ],
  },
};

const MISSINGNESS_IDS = ['a', 'b', 'c', 'd'];

/** Ein Options-Template je Fallart: options[0] ist korrekt, Texte wörtlich
 *  aus den kuratierten Varianten (intro: je Szenario kuratiert) bzw. aus dem
 *  Bestands-Base-Fall (core/stretch: einheitliche Distraktor-Bauart). */
const missingnessOptions = (entry, capsule) => {
  if (capsule.kind === 'sensor-zensiert') {
    return [
      `Das Fehlen ist wertabhängig; Löschen kann ${entry.extrem} systematisch entfernen.`,
      'Das ist MCAR, weil das Gerät zufällig ausfällt.',
      'Das Löschen ist immer harmlos, solange mehr als die Hälfte der Werte bleibt.',
      'Das ist automatisch Imputation durch den Sensor.',
    ];
  }
  if (capsule.kind === 'umfrage-wertabhaengig') {
    return [
      `Die Missingness ist wahrscheinlich wertabhängig und kann ${entry.groesse} nach unten verzerren.`,
      'Die Daten sind MCAR, weil jede Person freiwillig teilnehmen durfte.',
      'Nur die Anzahl der Antworten zählt; die Richtung der Ausfälle ist egal.',
      'Die fehlenden Werte können durch den Median ersetzt werden, ohne Annahmen zu prüfen.',
    ];
  }
  return [
    entry.correct,
    'Nichts — Zeilen löschen ist bei MCAR immer unverzerrt, und das ist hier gegeben.',
    'Der Schätzer bleibt unverzerrt, solange genügend Zeilen übrig bleiben.',
    `Der Mittelwert wird überschätzt, weil hohe ${entry.hoch} doppelt gezählt werden.`,
  ];
};

const missingnessSolution = (entry, capsule) => {
  if (capsule.kind === 'sensor-zensiert') {
    return `Das Fehlen hängt vom Messwert beziehungsweise seinem Extrembereich ab und ist daher nicht MCAR. Naives Löschen kann ${entry.extrem} systematisch entfernen und die Verteilung verzerren.`;
  }
  if (capsule.kind === 'umfrage-wertabhaengig') {
    return `Die Ausfälle hängen plausibel vom nicht beobachteten Wert ab (wertabhängige Missingness, kein MCAR). Complete-Case-Analysen können ${entry.groesse} nach unten verzerren; die Missingness-Mechanik muss vor dem Löschen geprüft werden.`;
  }
  return `Das Fehlen hängt vom Zielwert ab (zielabhängige Missingness, kein MCAR). Complete-Case-Löschen entfernt gerade ${entry.fehlende} und verzerrt die Schätzung systematisch.`;
};

/** Kapselform: Slotwert aus der Szenario-Bank plus vier paarweise
 *  verschiedene Antworttexte. */
export function missingnessCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    const entry = capsule.bank.find((item) => item[capsule.slot] === parameters[capsule.slot]);
    if (!entry) return false;
    return new Set(missingnessOptions(entry, capsule)).size === 4;
  } catch { return false; }
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest
 *  nie `expected` ab. */
export function missingnessCorrectText(parameters, capsule) {
  const entry = capsule.bank.find((item) => item[capsule.slot] === parameters?.[capsule.slot]);
  if (!entry || !missingnessCapsuleOk(parameters, capsule)) {
    throw new Error('Parameter verletzen die Kapselform');
  }
  return missingnessOptions(entry, capsule)[0];
}

/** Slot-Bank-Sampler mit Rotation: Seed wählt Szenario und Antwortposition.
 *  Kein clean()-Guard: expected ist ein Buchstabe — Leak deckt Gate 3 im
 *  Test über den Volltext ab (Vorbild genSigmoidCapsule). */
export function genMissingnessCapsule(seed, capsule) {
  const r = rng(seed);
  const entry = pick(r, capsule.bank);
  const options = missingnessOptions(entry, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters: { [capsule.slot]: entry[capsule.slot] },
    expected: { correctChoice: MISSINGNESS_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, MISSINGNESS_IDS),
    prompt: entry.prompt,
    fullSolution: missingnessSolution(entry, capsule),
  };
}

// --- W07: Confounding-Kapseln (classify-confounding) --------------------------
// Drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch →
// temperature-confounder/confounder-exercise-sleep/confounder-ad-spend-season).
// Szenario-Bank plus Rotation: je Kapsel eine Bank (9 kuratierte Varianten plus
// 5 weitere für den Distinct-Boden), ein Options-Template je Fallart, Rotation
// über vier Antwortpositionen. Korrekte Wahltexte, Prompts, Lösungen und die
// szenariobindenden Distraktoren (intro: kausal; core: kausal/ausgeschlossen/
// umkehr; stretch: gesamt/keinConfounder) stehen wörtlich in der Bank; die drei
// Base-Fälle sind Anker und bleiben als Befund unangetastet. Befund: die
// Base-Fälle 2/3 trugen im Bestand den Parameter confounder „Sommertemperatur“
// (Copy-Paste aus Fall 1); die Anker sind auf „Arbeitsstress“/„Saison“
// angeglichen (vermerkt im Testkopf). r bleibt dort 0.9 — die core/stretch-
// Prompts nennen keinen Wert (Konvention wie bei den Varianten: parameters
// führen r ohne Prompt-Nennung). Zwei kuratierte Varianten kürzen den
// Confounder im Schlüsseltext („ländliche Siedlungsdichte“ → „ländliche
// Siedlung“, „Sonnenscheindauer“ → „Sonnenschein“); die Bank speichert den
// korrekten Text daher wörtlich statt ihn aus dem Slot zu rendern.

/** Kapseln für classify-confounding: je Profil genau eine Kapsel mit
 *  Slot-Namen, Fallbindung und Szenario-Bank. Die Banken enthalten alle
 *  27 kuratierten Orakel-Szenarien (je 9 je Fall) plus 5 weitere je Kapsel
 *  für den Distinct-Boden (14 Szenarien x 4 Rotationen = 56 Kombinationen). */
export const CONFOUNDING_CAPSULES = {
  intro: {
    kind: 'drittvariable',
    slot: 'confounder',
    caseId: 'temperature-confounder',
    bank: [
      {
        confounder: 'Regen',
        r: 0.85,
        prompt: 'Cafébesuche und Schirmverkäufe korrelieren über das Jahr mit $r \\approx 0{,}85$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Regen) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Cafébesuche verursachen Schirmverkäufe, denn $r \\approx 0{,}85$ ist hoch.',
        loesung: 'Regen treibt Cafébesuche in Innenräumen und Schirmverkäufe zugleich (**Confounder**). $r$ beschreibt nur den linearen Zusammenhang, keine Ursache.',
      },
      {
        confounder: 'Brandgröße',
        r: 0.88,
        prompt: 'Die Zahl der eingesetzten Feuerwehrleute und der Gebäudeschaden korrelieren mit $r \\approx 0{,}88$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Brandgröße) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Mehr Einsatzkräfte verursachen größeren Schaden, denn $r \\approx 0{,}88$ ist hoch.',
        loesung: 'Große Brände ziehen mehr Einsatzkräfte und erzeugen mehr Schaden. Die Brandgröße ist der Confounder; $r$ belegt keine Kausalität zwischen Leuten und Schaden.',
      },
      {
        confounder: 'Alter',
        r: 0.7,
        prompt: 'Bei Kindern korrelieren Schuhgröße und Lesefähigkeit mit $r \\approx 0{,}7$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Alter) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Große Füße verursachen besseres Lesen, denn $r \\approx 0{,}7$ ist deutlich.',
        loesung: 'Ältere Kinder haben größere Füße und lesen besser. Das Alter ist der Confounder; Korrelation belegt keine Kausalität.',
      },
      {
        confounder: 'Hitze',
        r: 0.75,
        prompt: 'Eisverkäufe und gemeldete Straftaten korrelieren über das Jahr mit $r \\approx 0{,}75$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Hitze) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Eisverkauf verursacht Straftaten, denn $r \\approx 0{,}75$ ist hoch.',
        loesung: 'Hitze kann Eisverkauf und bestimmte Straftaten gemeinsam anheben. $r$ misst den Zusammenhang, nicht die Ursache.',
      },
      {
        confounder: 'ländliche Siedlungsdichte',
        r: 0.62,
        prompt: 'Auf Kreisebene korrelieren Storchennester und Geburtenzahlen mit $r \\approx 0{,}62$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. ländliche Siedlung) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Störche verursachen Geburten, denn $r \\approx 0{,}62$ ist positiv.',
        loesung: 'Ländlichkeit kann Nester und Geburtenraten gemeinsam erklären. Die Korrelation isoliert keine Kausalität.',
      },
      {
        confounder: 'Sonnenscheindauer',
        r: 0.82,
        prompt: 'Freibadbesuche und Sonnenbrandfälle korrelieren im Sommer mit $r \\approx 0{,}82$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Sonnenschein) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Freibadbesuche verursachen Sonnenbrand, denn $r \\approx 0{,}82$ ist hoch.',
        loesung: 'Sonnenschein treibt beides. $r$ beschreibt den linearen Zusammenhang, nicht welche Größe die andere verursacht.',
      },
      {
        confounder: 'Außentemperatur',
        r: 0.8,
        prompt: 'Klimaanlagenverkäufe und Ertrinkungsunfälle korrelieren mit $r \\approx 0{,}8$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Außentemperatur) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Klimaanlagenverkäufe verursachen Ertrinkungsunfälle, denn $r \\approx 0{,}8$ ist hoch.',
        loesung: 'Hohe Außentemperatur kann beides anheben. Korrelation allein belegt keine Kausalität zwischen den beiden Größen.',
      },
      {
        confounder: 'Fallschwere',
        r: 0.78,
        prompt: 'In Kliniken korrelieren die Zahl der Ärztinnen und die Zahl der Todesfälle mit $r \\approx 0{,}78$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Fallschwere) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Mehr Ärztinnen verursachen mehr Todesfälle, denn $r \\approx 0{,}78$ ist hoch.',
        loesung: 'Schwere Fälle brauchen mehr Personal und haben mehr Todesfälle. Die Fallschwere ist ein Confounder; $r$ beweist keine Kausalität.',
      },
      {
        confounder: 'Wohlstand',
        r: 0.71,
        prompt: 'Länder mit höherem Schokoladenkonsum haben mehr Nobelpreise ($r \\approx 0{,}71$). Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Wohlstand) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Schokoladenkonsum verursacht Nobelpreise, denn $r \\approx 0{,}71$ ist positiv.',
        loesung: 'Wohlstand kann Konsum und Forschungsoutput gemeinsam erklären. Ländergemitteltes $r$ belegt keine Kausalität.',
      },
      {
        confounder: 'Trockenheit',
        r: 0.66,
        prompt: 'Verkäufe von Gartenschläuchen und Waldbrandmeldungen korrelieren im Sommer mit $r \\approx 0{,}66$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Trockenheit) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Gartenschlauchverkäufe verursachen Waldbrände, denn $r \\approx 0{,}66$ ist deutlich.',
        loesung: 'Trockene Phasen erhöhen den Gartenbedarf und die Brandgefahr zugleich. Die Trockenheit ist der Confounder; $r$ belegt keine Kausalität.',
      },
      {
        confounder: 'Winterglätte',
        r: 0.73,
        prompt: 'Schneeschaufelverkäufe und Unfälle auf Glatteis korrelieren im Winter mit $r \\approx 0{,}73$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Winterglätte) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Schneeschaufelverkäufe verursachen Glatteisunfälle, denn $r \\approx 0{,}73$ ist hoch.',
        loesung: 'Winterglätte treibt Schaufelkäufe und Unfallzahlen gemeinsam. Korrelation belegt keine Kausalität.',
      },
      {
        confounder: 'Einwohnerzahl',
        r: 0.58,
        prompt: 'Auf Stadtebene korrelieren die Zahl der Bibliotheken und die Zahl der Kneipen mit $r \\approx 0{,}58$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Einwohnerzahl) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Mehr Bibliotheken verursachen mehr Kneipen, denn $r \\approx 0{,}58$ ist deutlich.',
        loesung: 'Größere Städte haben mehr von beidem. Die Einwohnerzahl ist der Confounder; $r$ belegt keine Kausalität.',
      },
      {
        confounder: 'Grippezeit',
        r: 0.69,
        prompt: 'Verkäufe von Vitaminpräparaten und Grippemeldungen korrelieren im Herbst mit $r \\approx 0{,}69$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Grippezeit) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Vitaminverkäufe verursachen Grippemeldungen, denn $r \\approx 0{,}69$ ist deutlich.',
        loesung: 'In der Grippezeit steigen Nachfrage und Meldungen zugleich. $r$ beschreibt den Zusammenhang, nicht die Ursache.',
      },
      {
        confounder: 'Besucherandrang',
        r: 0.79,
        prompt: 'An Badestränden korrelieren die Zahl eingesetzter Rettungsschwimmer und die Zahl gemeldeter Ertrinkungsfälle mit $r \\approx 0{,}79$. Was ist die sauberste Schlussfolgerung?',
        correct: 'Beide Größen werden vermutlich von einer gemeinsamen Drittvariable getrieben (z. B. Besucherandrang) — Korrelation allein belegt keine Kausalität.',
        kausal: 'Mehr Rettungsschwimmer verursachen mehr Ertrinkungsfälle, denn $r \\approx 0{,}79$ ist hoch.',
        loesung: 'An vollen Strandtagen sind mehr Schwimmer im Dienst und mehr Fälle werden gemeldet. Der Besucherandrang ist der Confounder; $r$ beweist keine Kausalität.',
      },
    ],
  },
  core: {
    kind: 'beobachtung',
    slot: 'confounder',
    caseId: 'confounder-exercise-sleep',
    bank: [
      {
        confounder: 'Einkommen',
        r: 0.64,
        prompt: 'Bessere Ernährung und bessere Stimmung treten gemeinsam auf. Menschen mit höherem Einkommen ernähren sich aber auch häufiger ausgewogen. Was darfst du aus der Korrelation schließen?',
        correct: 'Einkommen kann als Confounder Ernährung und Stimmung beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Bessere Ernährung verursacht sicher bessere Stimmung.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Stimmung die Ernährung verursacht.',
        loesung: 'Einkommen ist eine plausible Drittvariable. Die Korrelation allein belegt keinen kausalen Effekt der Ernährung.',
      },
      {
        confounder: 'sozioökonomischer Status',
        r: 0.58,
        prompt: 'Mehr Schuljahre und bessere Gesundheitswerte treten gemeinsam auf. Der sozioökonomische Status beeinflusst aber beides. Was darfst du aus der Korrelation schließen?',
        correct: 'Sozioökonomischer Status kann Bildung und Gesundheit beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Schuljahre verursachen sicher bessere Gesundheit.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Gesundheit die Bildung verursacht.',
        loesung: 'SES kann beide Größen treiben. Ohne Kontrolle dieser Drittvariable folgt keine Kausalität der Bildung.',
      },
      {
        confounder: 'elterliche Unterstützung',
        r: 0.55,
        prompt: 'Mehr Bildschirmzeit und schlechtere Noten treten gemeinsam auf. Weniger elterliche Unterstützung geht aber oft mit beidem einher. Was darfst du aus der Korrelation schließen?',
        correct: 'Elterliche Unterstützung kann Bildschirmzeit und Noten beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Bildschirmzeit verursacht sicher schlechtere Noten.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation negativ ist.',
        umkehr: 'Die Korrelation beweist, dass Noten die Bildschirmzeit verursachen.',
        loesung: 'Elterliche Unterstützung ist ein plausibler Confounder. Die Korrelation isoliert keinen kausalen Bildschirmeffekt.',
      },
      {
        confounder: 'Krankheitslast',
        r: 0.6,
        prompt: 'Wer mehr Medikamente nimmt, berichtet oft mehr Symptome. Gleichzeitig haben kränkere Personen beides. Was darfst du aus der Korrelation schließen?',
        correct: 'Krankheitslast kann Medikamenteneinnahme und Symptome beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Tabletten verursachen sicher mehr Symptome.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Symptome die Tablettenzahl verursachen — und sonst nichts.',
        loesung: 'Die Krankheitslast kann beide Größen treiben. Korrelation allein belegt keine schädliche Wirkung der Tablettenzahl.',
      },
      {
        confounder: 'Freizeitbudget',
        r: 0.52,
        prompt: 'Vereinsmitgliedschaft und höheres Wohlbefinden treten gemeinsam auf. Wer mehr Zeit und Geld hat, macht aber oft beides. Was darfst du aus der Korrelation schließen?',
        correct: 'Freizeitbudget kann Vereinsmitgliedschaft und Wohlbefinden beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Vereinsmitgliedschaft verursacht sicher höheres Wohlbefinden.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Wohlbefinden die Mitgliedschaft verursacht.',
        loesung: 'Freizeitbudget ist eine plausible Drittvariable. Die Korrelation beweist keinen kausalen Vereinseffekt.',
      },
      {
        confounder: 'Kaffeekonsum am Vortag',
        r: 0.67,
        prompt: 'An Tagen mit höherer Herzfrequenz berichten Personen bessere Konzentration. Viele haben dann auch mehr Kaffee getrunken. Was darfst du aus der Korrelation schließen?',
        correct: 'Ein gemeinsamer Faktor wie Kaffeekonsum kann Konzentration und Herzfrequenz beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Höhere Herzfrequenz verursacht sicher bessere Konzentration.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald beide Werte am selben Tag gemessen wurden.',
        umkehr: 'Die Korrelation beweist, dass Konzentration die Herzfrequenz verursacht.',
        loesung: 'Kaffee kann beide Größen anheben. Die Korrelation isoliert keine kausale Richtung zwischen Puls und Konzentration.',
      },
      {
        confounder: 'Wohnlage',
        r: 0.49,
        prompt: 'Wer häufiger Parks nutzt, berichtet weniger Stress. Ruhige Wohnlagen bieten aber oft beides. Was darfst du aus der Korrelation schließen?',
        correct: 'Die Wohnlage kann Grünflächennutzung und Stress beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Parkbesuche verursachen sicher weniger Stress.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation negativ ist.',
        umkehr: 'Die Korrelation beweist, dass Stress die Parkbesuche verursacht.',
        loesung: 'Wohnlage ist ein plausibler Confounder. Die Korrelation belegt keinen kausalen Effekt der Parkbesuche.',
      },
      {
        confounder: 'Schichtdienst',
        r: 0.57,
        prompt: 'Mehr Kaffee und schlechterer Schlaf treten gemeinsam auf. Schichtdienst hängt aber oft mit beidem zusammen. Was darfst du aus der Korrelation schließen?',
        correct: 'Schichtdienst kann Kaffeekonsum und Schlafqualität beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Kaffee verursacht sicher schlechteren Schlaf.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation negativ ist.',
        umkehr: 'Die Korrelation beweist, dass schlechter Schlaf den Kaffee verursacht — und sonst nichts.',
        loesung: 'Schichtdienst kann beide Größen treiben. Die Korrelation allein belegt keinen kausalen Kaffee-Effekt.',
      },
      {
        confounder: 'Arbeitsstress',
        r: 0.61,
        prompt: 'Häufigeres Krafttraining und besserer Schlaf treten gemeinsam auf. Weniger Arbeitsstress geht aber oft mit beidem einher. Was darfst du aus der Korrelation schließen?',
        correct: 'Arbeitsstress kann als Confounder Sport und Schlaf beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Sport verursacht sicher besseren Schlaf.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Schlaf den Sport verursacht.',
        loesung: 'Arbeitsstress bleibt eine plausible Drittvariable. Die Korrelation isoliert keinen kausalen Trainingseffekt.',
      },
      {
        confounder: 'Familieneinkommen',
        r: 0.53,
        prompt: 'Nachhilfestunden und bessere Abiturnoten treten gemeinsam auf. Wer sich Nachhilfe leistet, hat aber oft auch mehr Lernressourcen zu Hause. Was darfst du aus der Korrelation schließen?',
        correct: 'Das Familieneinkommen kann Nachhilfe und Abiturnoten beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Nachhilfe verursacht sicher bessere Abiturnoten.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Abiturnoten die Nachhilfe verursachen.',
        loesung: 'Das Familieneinkommen ist eine plausible Drittvariable. Die Korrelation isoliert keinen kausalen Nachhilfeeffekt.',
      },
      {
        confounder: 'Vorerkrankungen',
        r: 0.46,
        prompt: 'Mehr Arztbesuche und höhere Medikamentenkosten treten gemeinsam auf. Personen mit Vorerkrankungen haben aber oft beides. Was darfst du aus der Korrelation schließen?',
        correct: 'Vorerkrankungen können Arztbesuche und Medikamentenkosten beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Arztbesuche verursachen sicher höhere Medikamentenkosten.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Medikamentenkosten die Arztbesuche verursachen.',
        loesung: 'Vorerkrankungen können beide Größen treiben. Die Korrelation allein belegt keinen kausalen Effekt der Arztbesuche.',
      },
      {
        confounder: 'Klassenmotivation',
        r: 0.5,
        prompt: 'Mehr Hausaufgabenzeit und bessere Testergebnisse treten gemeinsam auf. Motiviertere Lerngruppen zeigen aber oft beides. Was darfst du aus der Korrelation schließen?',
        correct: 'Die Klassenmotivation kann Hausaufgabenzeit und Testergebnisse beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Hausaufgaben verursachen sicher bessere Testergebnisse.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Testergebnisse die Hausaufgabenzeit verursachen.',
        loesung: 'Die Klassenmotivation ist eine plausible Drittvariable. Die Korrelation isoliert keinen kausalen Hausaufgabeneffekt.',
      },
      {
        confounder: 'Gesundheitsbewusstsein',
        r: 0.51,
        prompt: 'Mehr Gemüse im Essensplan und weniger Arztbesuche treten gemeinsam auf. Gesundheitsbewusstsein geht aber oft mit beidem einher. Was darfst du aus der Korrelation schließen?',
        correct: 'Gesundheitsbewusstsein kann Ernährung und Arztbesuchshäufigkeit beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Mehr Gemüse verursacht sicher weniger Arztbesuche.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation negativ ist.',
        umkehr: 'Die Korrelation beweist, dass Arztbesuche den Gemüseverzehr verursachen.',
        loesung: 'Gesundheitsbewusstsein kann beide Größen treiben. Die Korrelation allein belegt keinen kausalen Schutzeffekt des Essensplans.',
      },
      {
        confounder: 'musikalisches Elternhaus',
        r: 0.44,
        prompt: 'Frühes Instrumentenlernen und gute Schulnoten treten gemeinsam auf. Ein musikalisches Elternhaus geht aber oft mit beidem einher. Was darfst du aus der Korrelation schließen?',
        correct: 'Ein musikalisches Elternhaus kann Instrumentenlernen und Schulnoten beeinflussen; Korrelation beweist keine Kausalität.',
        kausal: 'Frühes Instrumentenlernen verursacht sicher gute Schulnoten.',
        ausgeschlossen: 'Ein Confounder ist ausgeschlossen, sobald die Korrelation positiv ist.',
        umkehr: 'Die Korrelation beweist, dass Schulnoten das Instrumentenlernen verursachen.',
        loesung: 'Das Elternhaus ist ein plausibler Confounder. Die Korrelation belegt keinen kausalen Effekt des Instrumentenlernens.',
      },
    ],
  },
  stretch: {
    kind: 'saison',
    slot: 'confounder',
    caseId: 'confounder-ad-spend-season',
    bank: [
      {
        confounder: 'Sommersaison',
        r: 0.91,
        prompt: 'Eiswerbung und Eisumsatz steigen im Juli stark. Juli ist zugleich die stärkste Eissaison. Welche Aussage ist methodisch sauber?',
        correct: 'Saison kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.',
        gesamt: 'Der gesamte Sommerumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Saison kann kein Confounder sein, weil sie keine Modellvariable ist.',
        loesung: 'Sommersaison ist ein Confounder. Ohne ihre Kontrolle kann der Werbeeffekt überschätzt werden.',
      },
      {
        confounder: 'Erkältungssaison',
        r: 0.87,
        prompt: 'Werbung für Erkältungsmittel und deren Umsatz steigen im Januar stark. Januar ist zugleich die Erkältungssaison. Welche Aussage ist methodisch sauber?',
        correct: 'Saison kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.',
        gesamt: 'Der gesamte Januarumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Saison kann kein Confounder sein, weil sie keine Modellvariable ist.',
        loesung: 'Die Saison treibt Bedarf und oft auch Werbebudget. Der Werbeeffekt braucht Kontrolle der Saison.',
      },
      {
        confounder: 'Schulstart',
        r: 0.84,
        prompt: 'Schulbedarfswerbung und Umsatz steigen Anfang September stark. Gleichzeitig beginnt das Schuljahr. Welche Aussage ist methodisch sauber?',
        correct: 'Der Schulstart kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.',
        gesamt: 'Der gesamte Septemberumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Schulstart kann kein Confounder sein, weil er keine Modellspalte ist.',
        loesung: 'Der Schulstart ist ein Kalender-Confounder. Korrelation im September isoliert die Werbung nicht.',
      },
      {
        confounder: 'Black Friday',
        r: 0.89,
        prompt: 'Werbeausgaben und Online-Umsatz steigen am Black Friday stark. Gleichzeitig kaufen viele unabhängig von dieser Kampagne. Welche Aussage ist methodisch sauber?',
        correct: 'Der Aktionstag kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.',
        gesamt: 'Der gesamte Black-Friday-Umsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Ein Aktionstag kann kein Confounder sein, weil er keine Modellvariable ist.',
        loesung: 'Der Aktionstag treibt Nachfrage und Budgets. Ohne seine Kontrolle überschätzt man den Kampagneneffekt.',
      },
      {
        confounder: 'Steuertermin',
        r: 0.77,
        prompt: 'Werbung für Steuer-Software und Käufe steigen im März stark. Gleichzeitig endet eine Abgabefrist. Welche Aussage ist methodisch sauber?',
        correct: 'Der Steuertermin kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.',
        gesamt: 'Der gesamte Märzumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Ein Stichtag kann kein Confounder sein, weil er keine Modellspalte ist.',
        loesung: 'Die Frist erzeugt Nachfrage unabhängig von der Kampagne. Der Werbeeffekt braucht Kontrolle des Termins.',
      },
      {
        confounder: 'Grippewelle',
        r: 0.83,
        prompt: 'Push-Nachrichten einer Liefer-App und Bestellungen steigen in einer Grippewelle. Gleichzeitig bleiben mehr Menschen zu Hause. Welche Aussage ist methodisch sauber?',
        correct: 'Die Krankheitswelle kann beide Größen treiben; der Lieferdienst-Effekt muss unter ihrer Kontrolle geschätzt werden.',
        gesamt: 'Der gesamte Wochenumsatz ist der kausale App-Effekt.',
        keinConfounder: 'Eine Epidemiewelle kann kein Confounder sein, weil sie nicht im Shop-Modell steht.',
        loesung: 'Die Welle verändert Nachfrage und Kampagnenintensität. Ohne Kontrolle bleibt der App-Effekt vermengt.',
      },
      {
        confounder: 'Tourismus-Hochsaison',
        r: 0.86,
        prompt: 'Hotelwerbung und Buchungen steigen im August stark. August ist zugleich Hochsaison. Welche Aussage ist methodisch sauber?',
        correct: 'Die touristische Hochsaison kann beide Größen treiben; der Werbeeffekt muss unter ihrer Kontrolle geschätzt werden.',
        gesamt: 'Der gesamte Augustumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Saison kann kein Confounder sein, weil sie keine Modellvariable ist.',
        loesung: 'Hochsaison treibt Buchungen und oft das Werbebudget. Korrelation isoliert die Kampagne nicht.',
      },
      {
        confounder: 'Wahlkampfzeit',
        r: 0.8,
        prompt: 'Politische Online-Anzeigen und Spendeneingänge steigen kurz vor der Wahl. Gleichzeitig mobilisiert der Wahlkalender. Welche Aussage ist methodisch sauber?',
        correct: 'Die Wahlkampfzeit kann beide Größen treiben; der Anzeigeneffekt muss unter ihrer Kontrolle geschätzt werden.',
        gesamt: 'Der gesamte Oktoberumsatz an Spenden ist der kausale Anzeigeneffekt.',
        keinConfounder: 'Wahlkampf kann kein Confounder sein, weil er keine Modellspalte ist.',
        loesung: 'Der Wahltermin treibt Spenden und Anzeigen. Ohne Kontrolle überschätzt man den Anzeigeneffekt.',
      },
      {
        confounder: 'Weihnachtsgeschäft',
        r: 0.9,
        prompt: 'Spielzeugwerbung und Spielzeugumsatz steigen im November stark. November ist zugleich Vorweihnachtsgeschäft. Welche Aussage ist methodisch sauber?',
        correct: 'Das Weihnachtsgeschäft kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.',
        gesamt: 'Der gesamte Novemberumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Saison kann kein Confounder sein, weil sie keine Modellvariable ist.',
        loesung: 'Das Weihnachtsgeschäft ist ein Confounder. Der Werbeeffekt muss saisonbereinigt geschätzt werden.',
      },
      {
        confounder: 'Winterschlussverkauf',
        r: 0.81,
        prompt: 'Newsletter-Kampagnen und Shop-Umsatz steigen im Winterschlussverkauf stark. Gleichzeitig räumen viele Händler ihre Lager. Welche Aussage ist methodisch sauber?',
        correct: 'Der Winterschlussverkauf kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle dieses Kalendereffekts geschätzt werden.',
        gesamt: 'Der gesamte Ausverkaufsumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Ein Schlussverkauf kann kein Confounder sein, weil er keine Modellspalte ist.',
        loesung: 'Der Schlussverkauf treibt Nachfrage und Versandvolumen. Ohne Kontrolle überschätzt man den Newsletter-Effekt.',
      },
      {
        confounder: 'Feiertagswochenende',
        r: 0.88,
        prompt: 'Push-Kampagnen einer Rezept-App und Downloads steigen am Osterwochenende stark. Gleichzeitig kochen viele ohnehin mehr. Welche Aussage ist methodisch sauber?',
        correct: 'Das Feiertagswochenende kann beide Größen treiben; der Kampagneneffekt muss unter seiner Kontrolle geschätzt werden.',
        gesamt: 'Der gesamte Osterumsatz ist der kausale App-Effekt.',
        keinConfounder: 'Ein Feiertag kann kein Confounder sein, weil er nicht im Modell steht.',
        loesung: 'Das Feiertagswochenende verändert Kochverhalten und Kampagnenintensität. Ohne Kontrolle bleibt der App-Effekt vermengt.',
      },
      {
        confounder: 'Fußballspieltag',
        r: 0.85,
        prompt: 'Snack-Werbung und Bestellungen steigen an großen Fußballspieltagen. Gleichzeitig bestellen Fans ohnehin mehr. Welche Aussage ist methodisch sauber?',
        correct: 'Der Fußballspieltag kann beide Größen treiben; der Werbeeffekt muss unter seiner Kontrolle geschätzt werden.',
        gesamt: 'Der gesamte Spieltagsumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Ein Fernsehereignis kann kein Confounder sein, weil es keine Modellvariable ist.',
        loesung: 'Der Spieltag treibt Snacknachfrage und Werbebudget. Ohne Kontrolle bleibt der Werbeeffekt vermengt.',
      },
      {
        confounder: 'Ferienbeginn',
        r: 0.93,
        prompt: 'Werbung für Reiseportale und Buchungszahlen steigen zu Ferienbeginn stark. Gleichzeitig planen viele unabhängig von Kampagnen. Welche Aussage ist methodisch sauber?',
        correct: 'Der Ferienbeginn kann beide Größen treiben; der Werbeeffekt muss unter Kontrolle der Saison geschätzt werden.',
        gesamt: 'Der gesamte Ferienumsatz ist der kausale Werbeeffekt.',
        keinConfounder: 'Die Ferienzeit kann kein Confounder sein, weil sie keine Modellvariable ist.',
        loesung: 'Der Ferienbeginn treibt Buchungen und Budgets. Der Werbeeffekt muss saisonbereinigt geschätzt werden.',
      },
      {
        confounder: 'Neujahrsvorsätze',
        r: 0.76,
        prompt: 'Werbung für Fitnessstudios und Vertragsabschlüsse steigen Anfang Januar stark. Gleichzeitig fassen viele Neujahrsvorsätze. Welche Aussage ist methodisch sauber?',
        correct: 'Die Neujahrsvorsätze können beide Größen treiben; der Werbeeffekt muss unter ihrer Kontrolle geschätzt werden.',
        gesamt: 'Der gesamte Neujahrsumsatz an Verträgen ist der kausale Werbeeffekt.',
        keinConfounder: 'Vorsätze können kein Confounder sein, weil sie keine Modellspalte sind.',
        loesung: 'Die Vorsatzsaison treibt Abschlüsse und Werbebudget. Ohne Kontrolle bleibt der Kampagneneffekt vermengt.',
      },
    ],
  },
};

const CONFOUNDING_IDS = ['a', 'b', 'c', 'd'];

/** Dezimalzahl im Prompt-LaTeX: 0.85 -> '0{,}85' (deutsches Komma). */
const fmtRDe = (value) => String(value).replace('.', '{,}');

/** Ein Options-Template je Fallart: options[0] ist korrekt. Szenariobindende
 *  Distraktoren stehen wörtlich in der Bank; wiederkehrende Distraktoren sind
 *  Template-Konstanten (intro: Widerlegung plus Linearitäts-Claim mit r;
 *  stretch: Budget-Claim). */
const confoundingOptions = (entry, capsule) => {
  if (capsule.kind === 'beobachtung') {
    return [entry.correct, entry.kausal, entry.ausgeschlossen, entry.umkehr];
  }
  if (capsule.kind === 'saison') {
    return [
      entry.correct,
      entry.gesamt,
      entry.keinConfounder,
      'Hohe Korrelation reicht für eine kausale Budgetentscheidung.',
    ];
  }
  return [
    entry.correct,
    entry.kausal,
    'Die starke Korrelation widerlegt jeden kausalen Einfluss zwischen den Größen.',
    `$r \\approx ${fmtRDe(entry.r)}$ beweist, dass der Zusammenhang exakt linear und kausal ist.`,
  ];
};

/** Kapselform: Slotwert aus der Szenario-Bank, passender r-Parameter und vier
 *  paarweise verschiedene Antworttexte. */
export function confoundingCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    const entry = capsule.bank.find((item) => item[capsule.slot] === parameters[capsule.slot]);
    if (!entry || entry.r !== parameters.r) return false;
    return new Set(confoundingOptions(entry, capsule)).size === 4;
  } catch { return false; }
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest
 *  nie `expected` ab. */
export function confoundingCorrectText(parameters, capsule) {
  const entry = capsule.bank.find((item) => item[capsule.slot] === parameters?.[capsule.slot]);
  if (!entry || !confoundingCapsuleOk(parameters, capsule)) {
    throw new Error('Parameter verletzen die Kapselform');
  }
  return confoundingOptions(entry, capsule)[0];
}

/** Slot-Bank-Sampler mit Rotation: Seed wählt Szenario und Antwortposition.
 *  Kein clean()-Guard: expected ist ein Buchstabe — Leak deckt Gate 3 im
 *  Test über den Volltext ab (Vorbild genMissingnessCapsule). */
export function genConfoundingCapsule(seed, capsule) {
  const r = rng(seed);
  const entry = pick(r, capsule.bank);
  const options = confoundingOptions(entry, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters: { r: entry.r, confounder: entry.confounder },
    expected: { correctChoice: CONFOUNDING_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, CONFOUNDING_IDS),
    prompt: entry.prompt,
    fullSolution: entry.loesung,
  };
}

// --- W09: Task-Type-Kapseln (classify-task-type) --------------------------------
// Drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch →
// failure-next-cycle-supervised/task-house-price/task-customer-segments).
// Szenario-Bank plus Rotation: je Kapsel eine Bank (9 kuratierte Varianten plus
// 5 weitere für den Distinct-Boden), Schlüsseltext und alle Distraktoren stehen
// wörtlich in der Bank (szenariobindend, keine Templates); Rotation über vier
// Antwortpositionen. Die drei Base-Fälle sind Anker. Befund (Copy-Paste im
// Bestand): alle drei Base-Fälle trugen parameters {scenario: 'Ausfall ja/nein
// mit historischen Labels', target: 'Ausfall im nächsten Zyklus'} aus Fall 1;
// die Anker 2/3 sind auf {scenario: 'Hauspreis stetig mit Labels', target:
// 'Verkaufspreis'} bzw. {scenario: 'Kaufprofile ohne Zielvariable', target:
// null} angeglichen (vermerkt im Testkopf).

/** Kapseln für classify-task-type: je Profil genau eine Kapsel mit
 *  Fallbindung und Szenario-Bank. Die Banken enthalten alle 27 kuratierten
 *  Orakel-Szenarien (je 9 je Fall) plus 5 weitere je Kapsel für den
 *  Distinct-Boden (14 Szenarien x 4 Rotationen = 56 Kombinationen).
 *  Schlüsseltext und Distraktoren sind szenariospezifisch und stehen
 *  wörtlich in `correct` bzw. `wrong` (Vorbild classify-missingness). */
export const TASK_TYPE_CAPSULES = {
  intro: {
    kind: 'binaer',
    caseId: 'failure-next-cycle-supervised',
    bank: [
      {
        scenario: 'Kündigung ja/nein mit historischen Labels',
        target: 'Churn im nächsten Monat',
        prompt: 'Ein Mobilfunkanbieter will vorhersagen, ob ein Vertrag im nächsten Monat gekündigt wird (ja/nein). Die Historie enthält pro Kundin das bisherige Kündigungsverhalten. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (kündigt / kündigt nicht), und es gibt gelabelte historische Beispiele.',
        wrong: [
          'Regression: „Ja“ und „Nein“ als 1 und 0 machen das Ziel stetig.',
          'Beides gleich gut möglich — der Algorithmus entscheidet den Problemtyp.',
          'Weder noch: Ohne vordefinierte Gruppen ist das Clustering.',
        ],
        loesung: 'Das Ziel ist eine Kategorie mit Labels — binäre Klassifikation. 0/1-Kodierung ändert den Kategoriecharakter nicht.',
      },
      {
        scenario: 'Spam ja/nein mit historischen Labels',
        target: 'Spam-Mail',
        prompt: 'Ein Filter soll erkennen, ob eine Mail Spam ist (ja/nein). Es gibt einen historischen Satz manuell gelabelter Mails. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Spam / kein Spam), und es gibt gelabelte historische Beispiele.',
        wrong: [
          'Regression, weil Spamfilter Zahlen wie Wortanzahl nutzen.',
          'Clustering, weil Mails Gruppen bilden.',
          'Der Algorithmus rät selbst, ob Klassifikation oder Regression passt.',
        ],
        loesung: 'Gelabelte Kategorien ergeben überwachte binäre Klassifikation, kein Clustering und keine Regression.',
      },
      {
        scenario: 'Kreditausfall ja/nein mit Labels',
        target: 'Ausfall in 12 Monaten',
        prompt: 'Eine Bank will vorhersagen, ob ein Kredit in den nächsten 12 Monaten ausfällt (ja/nein). Alte Verträge sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (fällt aus / fällt nicht aus) mit historischen Labels.',
        wrong: [
          'Regression, weil Ausfall als 0/1 kodiert werden kann.',
          'Clustering, weil Kundinnen Segmente bilden.',
          'Bestärkendes Lernen, weil ein Kredit eine Entscheidung ist.',
        ],
        loesung: 'Historische Ja/Nein-Labels machen eine überwachte binäre Klassifikation. Die 0/1-Kodierung macht das Ziel nicht stetig.',
      },
      {
        scenario: 'Befund positiv/negativ mit Labels',
        target: 'Krankheit vorhanden',
        prompt: 'Ein Modell soll vorhersagen, ob ein Befund positiv oder negativ ist. Ärztlich gelabelte historische Fälle liegen vor. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (befundpositiv / -negativ) mit gelabelten Fällen.',
        wrong: [
          'Regression, weil Laborwerte stetig sind.',
          'Clustering, weil Patientinnen Gruppen bilden.',
          'Unüberwacht, weil die Diagnose erst später feststeht.',
        ],
        loesung: 'Zwei Klassen plus Labels: überwachte binäre Klassifikation. Stetige Laborwerte sind Merkmale, nicht das Ziel.',
      },
      {
        scenario: 'Betrug ja/nein mit Labels',
        target: 'Betrugsfall',
        prompt: 'Ein Zahlungsdienst will Transaktionen als Betrug oder legitim einstufen. Historische, geprüfte Fälle sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Betrug / kein Betrug) mit historischen Labels.',
        wrong: [
          'Regression, weil Transaktionsbeträge Zahlen sind.',
          'Clustering, weil es keine vordefinierten Gruppen gäbe.',
          'Der Algorithmus entscheidet den Problemtyp selbst.',
        ],
        loesung: 'Gelabelte Kategorien ergeben binäre Klassifikation. Beträge sind Eingaben, nicht das stetige Ziel.',
      },
      {
        scenario: 'Bestehen ja/nein mit Labels',
        target: 'Prüfung bestanden',
        prompt: 'Eine Hochschule will vorhersagen, ob eine Prüfung bestanden wird (ja/nein). Alte Versuche mit Ergebnis liegen vor. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (bestanden / nicht bestanden) mit historischen Labels.',
        wrong: [
          'Regression, weil Punkte stetig sind.',
          'Clustering, weil Kohorten Gruppen bilden.',
          'Unüberwacht, weil die Prüfung in der Zukunft liegt.',
        ],
        loesung: 'Das Ziel ist die Kategorie bestanden/nicht, nicht die Punktzahl. Mit Labels ist das binäre Klassifikation.',
      },
      {
        scenario: 'Klick ja/nein mit Labels',
        target: 'Anzeige geklickt',
        prompt: 'Ein Anzeigensystem soll vorhersagen, ob eine Impression geklickt wird (ja/nein). Historische Impressionen sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Klick / kein Klick) mit historischen Labels.',
        wrong: [
          'Regression, weil CTR eine Rate ist.',
          'Clustering, weil Nutzende Segmente bilden.',
          'Bestärkendes Lernen, weil Anzeigen Entscheidungen sind.',
        ],
        loesung: 'Pro Impression ein Ja/Nein-Label: binäre Klassifikation. Eine spätere Rate ist eine Metrik, nicht der Problemtyp.',
      },
      {
        scenario: 'Garantieanspruch ja/nein mit Labels',
        target: 'Anspruch im ersten Jahr',
        prompt: 'Ein Hersteller will vorhersagen, ob ein Gerät im ersten Jahr einen Garantieanspruch auslöst (ja/nein). Alte Geräte sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Anspruch / kein Anspruch) mit historischen Labels.',
        wrong: [
          'Regression, weil Reparaturkosten stetig wären.',
          'Clustering, weil Produkte Gruppen bilden.',
          'Weder noch, weil die Zukunft unbekannt ist.',
        ],
        loesung: 'Zwei Klassen plus Historie: überwachte binäre Klassifikation. Kosten wären ein anderes, stetiges Ziel.',
      },
      {
        scenario: 'Mail geöffnet ja/nein mit Labels',
        target: 'Öffnung innerhalb 24h',
        prompt: 'Ein Newsletter soll vorhersagen, ob eine Mail in 24 Stunden geöffnet wird (ja/nein). Alte Versandprotokolle sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (geöffnet / nicht geöffnet) mit historischen Labels.',
        wrong: [
          'Regression, weil Öffnungsraten Zahlen sind.',
          'Clustering, weil Empfängergruppen entdeckt werden sollen.',
          'Der Algorithmus wählt den Problemtyp automatisch.',
        ],
        loesung: 'Gelabeltes Ja/Nein pro Mail ist binäre Klassifikation, kein Clustering und keine Regression auf eine Rate.',
      },
      {
        scenario: 'Rücksendung ja/nein mit Labels',
        target: 'Retoure der Bestellung',
        prompt: 'Ein Online-Shop will vorhersagen, ob eine Bestellung zurückgesendet wird (ja/nein). Historische Bestellungen sind mit dem Retourenstatus gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Rücksendung / keine Rücksendung) mit historischen Labels.',
        wrong: [
          'Regression, weil der Bestellwert eine Zahl ist.',
          'Clustering, weil Kundentypen gesucht werden.',
          'Der Algorithmus entscheidet den Problemtyp selbst.',
        ],
        loesung: 'Gelabelter Ja/Nein-Status pro Bestellung: überwachte binäre Klassifikation.',
      },
      {
        scenario: 'Schichtausfall ja/nein mit Labels',
        target: 'Fehltag nächste Woche',
        prompt: 'Ein Dienstplan soll vorhersagen, ob eine Schicht krankheitsbedingt ausfällt (ja/nein). Vergangene Schichten sind mit dem Ausgang gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (fällt aus / findet statt) mit historischen Labels.',
        wrong: [
          'Regression, weil die Schichtdauer in Stunden gemessen wird.',
          'Clustering, weil Teams Gruppen bilden.',
          'Unüberwacht, weil die Zukunft unbekannt ist.',
        ],
        loesung: 'Ja/Nein-Ziel mit historischen Labels: überwachte binäre Klassifikation.',
      },
      {
        scenario: 'Zahlungsverzug ja/nein mit Labels',
        target: 'Rechnung verspätet',
        prompt: 'Ein Buchhaltungssystem soll vorhersagen, ob eine Rechnung verspätet bezahlt wird (ja/nein). Alte Rechnungen sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (verspätet / pünktlich) mit historischen Labels.',
        wrong: [
          'Regression, weil Rechnungsbeträge Zahlen sind.',
          'Bestärkendes Lernen, weil Mahnungen Entscheidungen sind.',
          'Clustering, weil Kundinnen Segmente bilden.',
        ],
        loesung: 'Zwei Klassen plus Labels: binäre Klassifikation; der Rechnungsbetrag ist ein Merkmal.',
      },
      {
        scenario: 'Absturz ja/nein mit Labels',
        target: 'App-Absturz',
        prompt: 'Ein Telemetrie-System soll vorhersagen, ob eine App-Sitzung abstürzt (ja/nein). Historische Sitzungen sind mit dem Ausgang gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (Absturz / kein Absturz) mit historischen Labels.',
        wrong: [
          'Regression, weil die Sitzungsdauer stetig ist.',
          'Clustering, weil Sitzungen Muster bilden.',
          'Der Algorithmus wählt den Problemtyp automatisch.',
        ],
        loesung: 'Gelabeltes Ja/Nein pro Sitzung: binäre Klassifikation.',
      },
      {
        scenario: 'Budgetüberschreitung ja/nein mit Labels',
        target: 'Budgetüberschreitung',
        prompt: 'Ein Controlling-Tool soll vorhersagen, ob ein Projekt sein Budget überschreitet (ja/nein). Abgeschlossene Projekte sind gelabelt. Wie ist das Problem korrekt formuliert?',
        correct: 'Binäre Klassifikation: Das Ziel ist eine Kategorie (überschreitet / hält ein) mit historischen Labels.',
        wrong: [
          'Regression, weil Budgets Zahlen sind.',
          'Unüberwacht, weil das Projekt noch läuft.',
          'Clustering, weil Projekte Gruppen bilden.',
        ],
        loesung: 'Zwei gelabelte Klassen: binäre Klassifikation, kein stetiges Ziel.',
      },
    ],
  },
  core: {
    kind: 'regression',
    caseId: 'task-house-price',
    bank: [
      {
        scenario: 'Temperatur stetig mit Labels',
        target: 'Tagestemperatur',
        prompt: 'Ein Modell soll die Tagestemperatur aus Luftdruck, Wind und Feuchte vorhersagen. Historische Temperaturen sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil eine stetige Temperatur aus gelabelten Messungen gelernt wird.',
        wrong: [
          'Unüberwachtes Clustering, weil mehrere Wettermerkmale eingehen.',
          'Binäre Klassifikation, weil jeder Tag ein einzelnes Ergebnis ist.',
          'Bestärkendes Lernen, weil Wetter eine Entscheidung ist.',
        ],
        loesung: 'Stetiges Ziel plus Labels: überwachte Regression.',
      },
      {
        scenario: 'Nachfrage stetig mit Labels',
        target: 'Stückzahl',
        prompt: 'Ein Modell soll die wöchentliche Nachfrage eines Artikels aus Preis, Saison und Lagerbestand vorhersagen. Historische Stückzahlen liegen vor. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil eine stetige Stückzahl aus gelabelten Verkäufen gelernt wird.',
        wrong: [
          'Clustering, weil Produkte Gruppen bilden.',
          'Binäre Klassifikation, weil jedes Produkt verkauft oder nicht verkauft wird.',
          'Bestärkendes Lernen, weil Bestellungen Entscheidungen sind.',
        ],
        loesung: 'Die Zielgröße ist stetig und gelabelt: überwachte Regression.',
      },
      {
        scenario: 'Blutdruck stetig mit Labels',
        target: 'systolischer Druck',
        prompt: 'Ein Modell soll den systolischen Blutdruck aus Alter, Gewicht und Ruheherzfrequenz schätzen. Historische Messwerte sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiger Druckwert aus gelabelten Messungen gelernt wird.',
        wrong: [
          'Clustering, weil mehrere Vitalwerte eingehen.',
          'Binäre Klassifikation, weil Hypertonie eine Klasse wäre.',
          'Unüberwacht, weil der Druck in der Zukunft liegt.',
        ],
        loesung: 'Stetiges, gelabeltes Ziel: Regression. Eine spätere Schwelle zu Hypertonie wäre ein anderes Problem.',
      },
      {
        scenario: 'Verspätung stetig mit Labels',
        target: 'Verspätung in Minuten',
        prompt: 'Ein Modell soll die Verspätung in Minuten aus Uhrzeit, Linie und Wetter vorhersagen. Historische Verspätungen liegen vor. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil Minuten als stetiges Ziel aus gelabelten Fahrten gelernt werden.',
        wrong: [
          'Klassifikation, weil jede Fahrt pünktlich oder unpünktlich ist.',
          'Clustering, weil Linien Gruppen bilden.',
          'Bestärkendes Lernen, weil Fahrpläne Entscheidungen sind.',
        ],
        loesung: 'Minuten sind ein stetiges, gelabeltes Ziel: überwachte Regression.',
      },
      {
        scenario: 'Ertrag stetig mit Labels',
        target: 'Ertrag in Tonnen',
        prompt: 'Ein Modell soll den Ertrag in Tonnen aus Niederschlag, Bodenwerten und Sorte schätzen. Historische Erträge sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiger Ertrag aus gelabelten Feldern gelernt wird.',
        wrong: [
          'Clustering, weil Felder ähnliche Böden haben.',
          'Klassifikation, weil jede Ernte ein einzelnes Ergebnis ist.',
          'Unüberwacht, weil das Wetter unbekannt ist.',
        ],
        loesung: 'Stetiges Ziel mit Labels: überwachte Regression.',
      },
      {
        scenario: 'Gehalt stetig mit Labels',
        target: 'Jahresgehalt',
        prompt: 'Ein Modell soll das Jahresgehalt aus Berufserfahrung, Region und Qualifikation schätzen. Historische Gehälter liegen vor. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiges Gehalt aus gelabelten Verträgen gelernt wird.',
        wrong: [
          'Clustering, weil mehrere Merkmale eingehen.',
          'Binäre Klassifikation, weil jemand angestellt ist oder nicht.',
          'Bestärkendes Lernen, weil Gehalt eine Verhandlung ist.',
        ],
        loesung: 'Das Ziel ist eine stetige Zahl mit Labels: überwachte Regression.',
      },
      {
        scenario: 'Energie stetig mit Labels',
        target: 'kWh pro Tag',
        prompt: 'Ein Modell soll den Tagesverbrauch in kWh aus Temperatur, Wochentag und Haushaltsgröße vorhersagen. Historische Zählerstände sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiger Verbrauch aus gelabelten Tagen gelernt wird.',
        wrong: [
          'Clustering, weil Haushalte Segmente bilden.',
          'Klassifikation, weil ein Tag Lastspitze hat oder nicht.',
          'Unüberwacht, weil zukünftiger Verbrauch unbekannt ist.',
        ],
        loesung: 'kWh sind stetig und gelabelt: überwachte Regression.',
      },
      {
        scenario: 'Wartezeit stetig mit Labels',
        target: 'Minuten bis Bedienung',
        prompt: 'Ein Modell soll die Wartezeit in Minuten aus Uhrzeit, Schalterzahl und Ticketart schätzen. Historische Wartezeiten liegen vor. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil eine stetige Wartezeit aus gelabelten Besuchen gelernt wird.',
        wrong: [
          'Klassifikation, weil jemand wartet oder nicht.',
          'Clustering, weil Schalter Gruppen bilden.',
          'Bestärkendes Lernen, weil Personalentscheidungen folgen.',
        ],
        loesung: 'Stetiges, gelabeltes Ziel: überwachte Regression.',
      },
      {
        scenario: 'Mietpreis stetig mit Labels',
        target: 'Kaltmiete',
        prompt: 'Ein Modell soll die Kaltmiete aus Fläche, Lage und Baujahr schätzen. Historische Angebotspreise sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiger Mietpreis aus gelabelten Angeboten gelernt wird.',
        wrong: [
          'Clustering, weil Stadtteile Gruppen bilden.',
          'Binäre Klassifikation, weil jede Wohnung vermietet wird oder nicht.',
          'Bestärkendes Lernen, weil Miete eine Entscheidung ist.',
        ],
        loesung: 'Der Preis ist stetig und gelabelt: überwachte Regression.',
      },
      {
        scenario: 'Lieferzeit stetig mit Labels',
        target: 'Tage bis Zustellung',
        prompt: 'Ein Modell soll die Lieferzeit in Tagen aus Distanz, Paketgröße und Versandart schätzen. Historische Lieferzeiten liegen vor. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil eine stetige Lieferzeit aus gelabelten Sendungen gelernt wird.',
        wrong: [
          'Clustering, weil Routen Gruppen bilden.',
          'Binäre Klassifikation, weil jedes Paket ankommt oder nicht.',
          'Bestärkendes Lernen, weil Zustellung Entscheidungen sind.',
        ],
        loesung: 'Stetiges, gelabeltes Ziel: überwachte Regression.',
      },
      {
        scenario: 'Strompreis stetig mit Labels',
        target: 'Börsenpreis pro MWh',
        prompt: 'Ein Modell soll den Strompreis pro MWh aus Last, Windaufkommen und Stunde vorhersagen. Historische Preise sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiger Preis aus gelabelten Stunden gelernt wird.',
        wrong: [
          'Klassifikation, weil der Preis steigt oder fällt.',
          'Clustering, weil Tage Gruppen bilden.',
          'Unüberwacht, weil der Markt unbekannt ist.',
        ],
        loesung: 'Stetiger Preis mit Labels: überwachte Regression.',
      },
      {
        scenario: 'Laufleistung stetig mit Labels',
        target: 'Kilometer pro Jahr',
        prompt: 'Ein Modell soll die jährliche Fahrleistung aus Fahrzeugtyp, Region und Alter schätzen. Historische Leistungen liegen vor. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil eine stetige Kilometerleistung aus gelabelten Fahrzeugen gelernt wird.',
        wrong: [
          'Clustering, weil Fahrzeuge Segmente bilden.',
          'Binäre Klassifikation, weil jemand Vielfahrer ist oder nicht.',
          'Bestärkendes Lernen, weil Fahren Entscheidungen sind.',
        ],
        loesung: 'Stetiges Ziel mit Labels: überwachte Regression.',
      },
      {
        scenario: 'Durchfluss stetig mit Labels',
        target: 'Durchfluss pro Stunde',
        prompt: 'Ein Modell soll den Abwasserdurchfluss aus Niederschlag, Tageszeit und Einwohnerzahl vorhersagen. Historische Messungen sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil ein stetiger Durchfluss aus gelabelten Messungen gelernt wird.',
        wrong: [
          'Clustering, weil Stunden Gruppen bilden.',
          'Klassifikation, weil die Kläranlage läuft oder nicht.',
          'Bestärkendes Lernen, weil Pumpen Entscheidungen sind.',
        ],
        loesung: 'Stetiges, gelabeltes Ziel: überwachte Regression.',
      },
      {
        scenario: 'Schadenshöhe stetig mit Labels',
        target: 'Schadenssumme',
        prompt: 'Ein Modell soll die Schadenssumme aus Unfallart, Fahrzeugalter und Region schätzen. Historische Schadenfälle sind vorhanden. Welche Aufgabenart liegt vor?',
        correct: 'Überwachte Regression, weil eine stetige Schadenssumme aus gelabelten Fällen gelernt wird.',
        wrong: [
          'Binäre Klassifikation, weil ein Schaden eintritt oder nicht.',
          'Clustering, weil Fälle Gruppen bilden.',
          'Unüberwacht, weil die Summe unbekannt ist.',
        ],
        loesung: 'Stetige Summe mit Labels: überwachte Regression.',
      },
    ],
  },
  stretch: {
    kind: 'clustering',
    caseId: 'task-customer-segments',
    bank: [
      {
        scenario: 'Genprofile ohne Zielvariable',
        target: null,
        prompt: 'Ein Labor besitzt Genexpressionsprofile ohne Zielvariable und will Gruppen ähnlicher Profile finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Gruppen ohne Labels entdeckt werden.',
        wrong: [
          'Überwachte Regression auf eine unbekannte Zielvariable.',
          'Klassifikation, weil jedes Profil später einer Gruppe zugeordnet wird.',
          'Regression, weil Expressionswerte Zahlen sind.',
        ],
        loesung: 'Ohne Labels Gruppen entdecken: unüberwachtes Clustering.',
      },
      {
        scenario: 'Dokumente ohne Thema-Labels',
        target: null,
        prompt: 'Ein Archiv hat Texte ohne Themenlabels und will Gruppen ähnlicher Dokumente finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Themengruppen ohne Labels entdeckt werden.',
        wrong: [
          'Überwachte Klassifikation, weil jedes Dokument ein Thema hat.',
          'Regression, weil Worthäufigkeiten Zahlen sind.',
          'Bestärkendes Lernen, weil Texte Entscheidungen sind.',
        ],
        loesung: 'Keine vorgegebenen Themen: unüberwachtes Clustering, nicht Klassifikation.',
      },
      {
        scenario: 'Sensorprofile ohne Störungslabel',
        target: null,
        prompt: 'Eine Werkstatt hat Sensortakte ohne Störungslabel und will ähnliche Betriebsmuster gruppieren. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Betriebsmuster ohne Labels gruppiert werden.',
        wrong: [
          'Überwachte Regression, weil die Zielgröße nur noch fehlt.',
          'Klassifikation, weil jede Maschine genau einem Muster entspricht.',
          'Regression, weil Sensortakte Zahlen sind.',
        ],
        loesung: 'Ohne Zielvariable Muster finden: Clustering. Eine spätere Cluster-ID ist kein vorgegebenes Label.',
      },
      {
        scenario: 'Nutzungsprofile ohne Segmentlabel',
        target: null,
        prompt: 'Eine App hat Nutzungsprofile ohne vorgegebene Segmente und will Gruppen ähnlichen Verhaltens finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Segmente ohne Labels entdeckt werden.',
        wrong: [
          'Überwachte Klassifikation auf unbekannte Segmente.',
          'Regression, weil Klicks Zahlen sind.',
          'Bestärkendes Lernen, weil die App Entscheidungen trifft.',
        ],
        loesung: 'Gruppen ohne Zielvariable: unüberwachtes Clustering.',
      },
      {
        scenario: 'Rezepturen ohne Qualitätsklasse',
        target: null,
        prompt: 'Eine Produktion hat Rezepturdaten ohne Qualitätsklasse und will ähnliche Mischungen finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Mischungen ohne Labels gruppiert werden.',
        wrong: [
          'Überwachte Regression auf eine fehlende Qualitätsnote.',
          'Klassifikation, weil jede Rezeptur genau einer Gruppe zugeordnet wird.',
          'Regression, weil Mengenangaben Zahlen sind.',
        ],
        loesung: 'Ohne Labels ähnliche Rezepturen finden: Clustering.',
      },
      {
        scenario: 'Fahrprofile ohne Unfall-Label',
        target: null,
        prompt: 'Eine Flotte hat Fahrprofile ohne Unfall-Label und will Gruppen ähnlicher Fahrstile finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Fahrstile ohne Labels entdeckt werden.',
        wrong: [
          'Klassifikation, weil später Cluster-IDs existieren.',
          'Regression, weil Geschwindigkeit stetig ist.',
          'Überwachte Regression auf eine unbekannte Zielvariable.',
        ],
        loesung: 'Keine Zielvariable, Gruppen entdecken: unüberwachtes Clustering.',
      },
      {
        scenario: 'Einkaufskörbe ohne Kategorienlabel',
        target: null,
        prompt: 'Ein Händler hat Warenkörbe ohne vorgegebene Kundentypen und will ähnliche Körbe gruppieren. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Warenkörbe ohne Labels gruppiert werden.',
        wrong: [
          'Klassifikation, weil jedes Produkt einer Kategorie angehört.',
          'Regression, weil Preise Zahlen sind.',
          'Überwachte Regression auf den unbekannten Warenkorbwert.',
        ],
        loesung: 'Ohne Zielvariable Gruppen finden: Clustering. Produktkategorien sind Merkmale, keine Supervisionslabels für den Korb.',
      },
      {
        scenario: 'Bildpatches ohne Klassenlabel',
        target: null,
        prompt: 'Ein Datensatz enthält Bildausschnitte ohne Klassenlabel. Du willst Gruppen ähnlicher Texturen finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil ähnliche Patches ohne Labels gruppiert werden.',
        wrong: [
          'Überwachte Klassifikation, weil Bilder Objekte enthalten.',
          'Regression, weil Pixel Zahlen sind.',
          'Bestärkendes Lernen, weil ein Modell entscheidet.',
        ],
        loesung: 'Ohne Labels ähnliche Patches finden: unüberwachtes Clustering.',
      },
      {
        scenario: 'Support-Tickets ohne Typ-Label',
        target: null,
        prompt: 'Ein Support-Postfach hat Tickets ohne Typ-Label und will Gruppen ähnlicher Anliegen finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Ticketgruppen ohne Labels entdeckt werden.',
        wrong: [
          'Überwachte Klassifikation auf unbekannte Tickettypen.',
          'Regression, weil Textlängen Zahlen sind.',
          'Bestärkendes Lernen, weil Support Entscheidungen trifft.',
        ],
        loesung: 'Gruppen ohne vorgegebene Klassen: unüberwachtes Clustering.',
      },
      {
        scenario: 'Wetterstationen ohne Klimaklasse',
        target: null,
        prompt: 'Ein Netzwerk hat Wetterstationen ohne Klimaklasse und will Gruppen ähnlicher Messprofile finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Stationsprofile ohne Labels gruppiert werden.',
        wrong: [
          'Überwachte Regression auf eine unbekannte Klimaklasse.',
          'Klassifikation, weil jede Station später eine Gruppe hat.',
          'Regression, weil Messwerte Zahlen sind.',
        ],
        loesung: 'Ohne Zielvariable Gruppen finden: unüberwachtes Clustering.',
      },
      {
        scenario: 'Musikstücke ohne Genre-Label',
        target: null,
        prompt: 'Eine Musiksammlung hat Stücke ohne Genre-Label und will Gruppen ähnlichen Klangs finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Klanggruppen ohne Labels entdeckt werden.',
        wrong: [
          'Überwachte Klassifikation auf unbekannte Genres.',
          'Regression, weil Spektren Zahlen sind.',
          'Bestärkendes Lernen, weil Empfehlungen Entscheidungen sind.',
        ],
        loesung: 'Keine vorgegebenen Genres: unüberwachtes Clustering.',
      },
      {
        scenario: 'Standorte ohne Regionstyp',
        target: null,
        prompt: 'Ein Einzelhändler hat Filialdaten ohne Regionstyp und will ähnliche Standorte gruppieren. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Standortprofile ohne Labels gruppiert werden.',
        wrong: [
          'Überwachte Regression auf einen unbekannten Umsatz.',
          'Klassifikation, weil jede Filiale genau einer Gruppe zugeordnet wird.',
          'Regression, weil Einwohnerzahlen Zahlen sind.',
        ],
        loesung: 'Ohne Zielvariable ähnliche Standorte finden: Clustering.',
      },
      {
        scenario: 'Proteinsequenzen ohne Familienlabel',
        target: null,
        prompt: 'Eine Datenbank hat Proteinsequenzen ohne Familienlabel und will Gruppen ähnlicher Sequenzen finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Sequenzgruppen ohne Labels entdeckt werden.',
        wrong: [
          'Überwachte Klassifikation, weil jede Sequenz eine Funktion hat.',
          'Regression, weil Sequenzlängen Zahlen sind.',
          'Bestärkendes Lernen, weil Annotationen Entscheidungen sind.',
        ],
        loesung: 'Ohne Familienlabel Gruppen entdecken: unüberwachtes Clustering.',
      },
      {
        scenario: 'Verkehrszählungen ohne Tagestyp',
        target: null,
        prompt: 'Eine Stadt hat Verkehrszählungen ohne Tagestyp-Label und will Gruppen ähnlicher Tagesverläufe finden. Welche Aufgabenart passt?',
        correct: 'Unüberwachtes Clustering, weil Tagesverläufe ohne Labels gruppiert werden.',
        wrong: [
          'Überwachte Regression auf ein unbekanntes Verkehrsaufkommen.',
          'Klassifikation, weil jeder Tag später einen Typ erhält.',
          'Regression, weil Zählwerte Zahlen sind.',
        ],
        loesung: 'Keine vorgegebenen Typen: unüberwachtes Clustering.',
      },
    ],
  },
};

const TASK_TYPE_IDS = ['a', 'b', 'c', 'd'];

/** Vier Optionstexte je Szenario: options[0] ist korrekt. Schlüsseltext und
 *  Distraktoren sind szenariobindend und stehen wörtlich in der Bank
 *  (Vorbild classify-missingness). */
const taskTypeOptions = (entry) => [entry.correct, ...entry.wrong];

/** Kapselform: Szenario und Zielwert aus der Bank plus vier paarweise
 *  verschiedene Antworttexte. */
export function taskTypeCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    const entry = capsule.bank.find((item) => item.scenario === parameters.scenario);
    if (!entry || entry.target !== parameters.target) return false;
    return new Set(taskTypeOptions(entry)).size === 4;
  } catch { return false; }
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest
 *  nie `expected` ab. */
export function taskTypeCorrectText(parameters, capsule) {
  const entry = capsule.bank.find((item) => item.scenario === parameters?.scenario);
  if (!entry || !taskTypeCapsuleOk(parameters, capsule)) {
    throw new Error('Parameter verletzen die Kapselform');
  }
  return taskTypeOptions(entry)[0];
}

/** Szenario-Bank-Sampler mit Rotation: Seed wählt Szenario und
 *  Antwortposition. Kein clean()-Guard: expected ist ein Buchstabe — Leak
 *  deckt Gate 3 im Test über den Volltext ab (Vorbild genMissingnessCapsule). */
export function genTaskTypeCapsule(seed, capsule) {
  const r = rng(seed);
  const entry = pick(r, capsule.bank);
  const options = taskTypeOptions(entry);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters: { scenario: entry.scenario, target: entry.target },
    expected: { correctChoice: TASK_TYPE_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, TASK_TYPE_IDS),
    prompt: entry.prompt,
    fullSolution: entry.loesung,
  };
}

// --- W13: Error-Drift-Kapseln (classify-error-drift) ----------------------------
// Drei Kapseln 1:1 auf den Bestandsfällen (core/stretch/challenge →
// accuracy-drop-without-code-change/error-label-definition-shift/
// error-stable-subgroup) — die einzige migrierte Familie mit challenge-Profil
// und masteryEligible. Szenario-Bank plus Rotation: je Kapsel eine Bank (9
// kuratierte Varianten plus 5 weitere für den Distinct-Boden), der korrekte
// Wahltext ist eine Fall-Konstante (Drift- / Konzept-Drift- /
// Subgruppen-Diagnose), die szenariobindenden Distraktoren stehen wörtlich in
// der Bank (Vorbild classify-missingness). Die drei Base-Fälle sind Anker.
// Befund (Copy-Paste im Bestand): alle drei Base-Fälle trugen parameters
// {accuracyBefore: 0.96, accuracyAfter: 0.81, codeChanged: false} aus Fall 1;
// die Anker 2/3 sind auf {shift: 'Geschäftsregel'} bzw. {group:
// 'Sprachgruppe', overallGood: true} angeglichen (vermerkt im Testkopf).
// Anker 1 bleibt {0.96, 0.81, false} — sein Prompt nennt genau diese Werte.

/** Kapseln für classify-error-drift: je Profil genau eine Kapsel mit
 *  Slot-Namen, Parameter-Feldliste und Szenario-Bank. Die Banken enthalten
 *  alle 27 kuratierten Orakel-Szenarien (je 9 je Fall) plus 5 weitere je
 *  Kapsel für den Distinct-Boden (14 Szenarien x 4 Rotationen = 56
 *  Kombinationen). `params` spiegelt exakt die Parameter-Felder der
 *  statischen Varianten. */
export const ERROR_DRIFT_CAPSULES = {
  core: {
    kind: 'daten-drift',
    slot: 'domain',
    params: ['accuracyBefore', 'accuracyAfter', 'codeChanged', 'domain'],
    caseId: 'accuracy-drop-without-code-change',
    bank: [
      {
        domain: 'Scanner',
        accuracyBefore: 0.94,
        accuracyAfter: 0.79,
        codeChanged: false,
        prompt: 'Ein Paket-Scanner erreicht in der Pilotphase 94 % Accuracy. Drei Monate später liegt dieselbe Metrik auf neuen Sendungen bei 79 % — der Code ist unverändert, die Kartonagen haben sich umgestellt, die Kamerabilder sehen seither anders aus. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Die Messreihen sind zufällig falsch beschriftet, deshalb schwankt die Metrik.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Teilgruppe war schon immer schlechter, das zeigt sich erst jetzt.',
        overfit: 'Überfitting auf das Testset: Das alte Testset war zu klein und hat die 94 % rein zufällig ergeben.',
        loesung: 'Code unverändert, Einbruch nach geänderter Eingabeverteilung: Daten-Drift. Verteilungen vergleichen und auf aktuellen Daten neu bewerten.',
      },
      {
        domain: 'Sprache',
        accuracyBefore: 0.91,
        accuracyAfter: 0.74,
        codeChanged: false,
        prompt: 'Ein Sprachmodell zur Absichtserkennung liegt intern bei 91 % Accuracy. Nach einem Produktlaunch mit jüngerer Kundschaft fällt die Metrik auf 74 % — der Code ist unverändert, die Formulierungen in den Audios haben sich verschoben. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Die Transkripte sind zufällig falsch, deshalb schwankt die Metrik.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Stimmlage war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 91 % waren Zufall wegen kleinem Testset.',
        loesung: 'Unveränderter Code plus systematisch andere Eingaben: Input-Drift, kein zufälliges Label-Rauschen.',
      },
      {
        domain: 'Kredit',
        accuracyBefore: 0.97,
        accuracyAfter: 0.83,
        codeChanged: false,
        prompt: 'Ein Kreditscoring erreicht 97 % Accuracy auf historischen Anträgen. Nach einer neuen Produktlinie mit anderen Einkommensprofilen fällt die Metrik auf 83 % — der Score-Code ist unverändert. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Anträge sind zufällig falsch beschriftet.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Altersgruppe war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 97 % waren ein Zufallstreffer.',
        loesung: 'Die Antragsverteilung hat sich verschoben, der Code nicht. Das ist Daten-Drift.',
      },
      {
        domain: 'Medizinbild',
        accuracyBefore: 0.93,
        accuracyAfter: 0.77,
        codeChanged: false,
        prompt: 'Ein Röntgen-Klassifikator liegt in der Studie bei 93 % Accuracy. Nach Umstellung auf ein neues Gerät fällt die Metrik auf 77 % — dieselben Gewichte, andere Bildstatistik. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Befunde sind zufällig vertauscht.',
        subgroup: 'Systematischer Subgruppenfehler: Ein Gerät war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 93 % kamen nur durch ein kleines Testset.',
        loesung: 'Gerätewechsel verschiebt die Eingaben. Unveränderter Code plus Metrikeinbruch: Drift.',
      },
      {
        domain: 'Betrug',
        accuracyBefore: 0.88,
        accuracyAfter: 0.71,
        codeChanged: false,
        prompt: 'Ein Betrugsfilter erreicht 88 % Accuracy. Nach einer neuen Betrugsmasche mit anderen Transaktionsmustern fällt die Metrik auf 71 % — der Code ist unverändert. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Transaktionen sind zufällig falsch gelabelt.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Kartenmarke war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 88 % waren Zufall.',
        loesung: 'Die Eingabemuster haben sich systematisch geändert. Das ist Drift, kein zeitloser Subgruppenfehler.',
      },
      {
        domain: 'Qualität',
        accuracyBefore: 0.95,
        accuracyAfter: 0.8,
        codeChanged: false,
        prompt: 'Ein Defekterkenner liegt bei 95 % Accuracy. Nach einem Lieferantenwechsel sieht die Oberfläche der Teile anders aus, die Metrik fällt auf 80 % — unveränderter Code. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Prüflabels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Schicht war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 95 % waren ein kleines Testset.',
        loesung: 'Neue Materialoptik verschiebt die Eingaben. Code gleich, Metrik runter: Daten-Drift.',
      },
      {
        domain: 'Support',
        accuracyBefore: 0.9,
        accuracyAfter: 0.72,
        codeChanged: false,
        prompt: 'Ein Ticket-Klassifikator erreicht 90 % Accuracy. Nach einem neuen Produktjargon in den Anfragen fällt die Metrik auf 72 % — der Code ist unverändert. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Ticketlabels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Sprache war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 90 % waren Zufall.',
        loesung: 'Der Wortschatz der Tickets hat sich verschoben. Das ist Input-Drift.',
      },
      {
        domain: 'Verkehr',
        accuracyBefore: 0.92,
        accuracyAfter: 0.76,
        codeChanged: false,
        prompt: 'Ein Spurhalter erreicht 92 % Accuracy. Nach einem Kameratausch mit anderem Weißabgleich fällt die Metrik auf 76 % — dieselben Gewichte. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Labels der Fahrspuren sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Nachtfahrten waren schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 92 % kamen nur durch Zufall.',
        loesung: 'Andere Bildstatistik bei gleichem Code: Daten-Drift. Neu bewerten und ggf. nachtrainieren.',
      },
      {
        domain: 'Werk',
        accuracyBefore: 0.96,
        accuracyAfter: 0.82,
        codeChanged: false,
        prompt: 'Ein Sortierer erreicht 96 % Accuracy. Nach Umstellung der Beleuchtung in der Halle fällt die Metrik auf 82 % — unveränderter Code, systematisch andere Bilder. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Die Messreihen sind zufällig falsch beschriftet, deshalb schwankt die Metrik.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Teilgruppe war schon immer schlechter, das zeigt sich erst jetzt.',
        overfit: 'Überfitting auf das Testset: Das alte Testset war zu klein und hat die 96 % rein zufällig ergeben.',
        loesung: 'Beleuchtung ändert die Eingabeverteilung. Metrikeinbruch ohne Codeänderung: Drift.',
      },
      {
        domain: 'Netzwerk',
        accuracyBefore: 0.89,
        accuracyAfter: 0.73,
        codeChanged: false,
        prompt: 'Ein Anomalie-Filter für Netzwerkverkehr erreicht 89 % Accuracy. Nach einer Umstellung der Router-Telemetrie fällt die Metrik auf 73 % — der Code ist unverändert, die Logdaten sehen seither anders aus. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Flow-Labels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Ein Subnetz war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 89 % waren Zufall.',
        loesung: 'Neue Telemetrie verschiebt die Eingaben. Code gleich, Metrik runter: Daten-Drift.',
      },
      {
        domain: 'Wetter',
        accuracyBefore: 0.92,
        accuracyAfter: 0.78,
        codeChanged: false,
        prompt: 'Ein Niederschlagsmodell liegt bei 92 % Accuracy. Nach einem Sensorwechsel mit anderem Messverfahren fällt die Metrik auf 78 % — dieselben Gewichte. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Wetterlabels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Region war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 92 % kamen nur durch ein kleines Testset zustande.',
        loesung: 'Anderes Messverfahren verschiebt die Eingabeverteilung. Metrikeinbruch ohne Codeänderung: Drift.',
      },
      {
        domain: 'Energie',
        accuracyBefore: 0.94,
        accuracyAfter: 0.8,
        codeChanged: false,
        prompt: 'Ein Lastprognose-Klassifikator erreicht 94 % Accuracy. Nach dem Austausch der Smart-Meter-Generation fällt die Metrik auf 80 % — unveränderter Code, andere Zählerauflösung. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Lastlabels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Ein Tarif war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 94 % waren ein Zufallstreffer.',
        loesung: 'Neue Zählerauflösung ändert die Eingabestatistik. Das ist Daten-Drift.',
      },
      {
        domain: 'Schrift',
        accuracyBefore: 0.9,
        accuracyAfter: 0.75,
        codeChanged: false,
        prompt: 'Ein Handschrift-Klassifikator erreicht 90 % Accuracy. Nach Umstellung auf ein neues Scanverfahren fällt die Metrik auf 75 % — der Code ist unverändert, die Bildkontraste sehen anders aus. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Zeichenlabels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Handschrift war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 90 % waren Zufall.',
        loesung: 'Neues Scanverfahren verschiebt die Bildverteilung. Unveränderter Code plus Einbruch: Drift.',
      },
      {
        domain: 'Akustik',
        accuracyBefore: 0.95,
        accuracyAfter: 0.79,
        codeChanged: false,
        prompt: 'Ein Maschinen-Akustikmodell erreicht 95 % Accuracy. Nach dem Umzug in eine neue Halle mit anderem Nachhall fällt die Metrik auf 79 % — dieselben Gewichte. Welcher Fehlertyp liegt vor?',
        noise: 'Label-Noise: Klanglabels sind zufällig falsch.',
        subgroup: 'Systematischer Subgruppenfehler: Eine Maschine war schon immer schlechter.',
        overfit: 'Überfitting auf das Testset: 95 % kamen nur durch Zufall zustande.',
        loesung: 'Der Nachhall der neuen Halle verschiebt die Audioeingaben. Code gleich, Metrik runter: Daten-Drift.',
      },
    ],
  },
  stretch: {
    kind: 'label-drift',
    slot: 'shift',
    params: ['accuracyBefore', 'accuracyAfter', 'codeChanged', 'shift'],
    caseId: 'error-label-definition-shift',
    bank: [
      {
        shift: 'Spam-Regel',
        accuracyBefore: 0.9,
        accuracyAfter: 0.7,
        codeChanged: false,
        prompt: 'Die Eingabeverteilung der Mails bleibt stabil, aber die Geschäftsregel ändert, was als Spam gilt. Danach fällt die Genauigkeit stark. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise, obwohl die Regel systematisch geändert wurde.',
        loesung: 'Die Bedeutung des positiven Labels hat sich verschoben: Konzept- bzw. Label-Drift, nicht primär Input-Drift.',
      },
      {
        shift: 'Betrugsschwelle',
        accuracyBefore: 0.88,
        accuracyAfter: 0.66,
        codeChanged: false,
        prompt: 'Transaktionsmerkmale bleiben verteilt wie zuvor, aber die Bank senkt die Schwelle, ab der ein Fall als Betrug gelabelt wird. Die Genauigkeit bricht ein. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz systematischer Regeländerung.',
        loesung: 'Das Label bedeutet etwas anderes als im Training. Das ist Konzept-Drift.',
      },
      {
        shift: 'Defektkatalog',
        accuracyBefore: 0.93,
        accuracyAfter: 0.75,
        codeChanged: false,
        prompt: 'Sensorwerte bleiben stabil, aber die Qualitätssicherung nimmt neue Fehlerbilder in den Positivkatalog auf. Die Accuracy fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Katalogwechsel.',
        loesung: 'Dieselben Eingaben bekommen neue Labels: Label- bzw. Konzept-Drift.',
      },
      {
        shift: 'Churn-Fenster',
        accuracyBefore: 0.91,
        accuracyAfter: 0.68,
        codeChanged: false,
        prompt: 'Nutzungsdaten bleiben ähnlich, aber Churn zählt nun schon nach 14 statt 30 Tagen ohne Login als positiv. Die Metrik fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz festem Fensterwechsel.',
        loesung: 'Die Zieldefinition hat sich geändert. Das ist Konzept-Drift, kein Input-Drift.',
      },
      {
        shift: 'ICD-Kodierung',
        accuracyBefore: 0.86,
        accuracyAfter: 0.64,
        codeChanged: false,
        prompt: 'Die Klinikmerkmale bleiben stabil, aber eine neue Kodierregel ändert, welche Fälle als positiv gelten. Die Genauigkeit bricht ein. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Kodierumstellung.',
        loesung: 'Geänderte Labelbedeutung bei stabilen Eingaben: Konzept-Drift.',
      },
      {
        shift: 'Moderationsrichtlinie',
        accuracyBefore: 0.89,
        accuracyAfter: 0.71,
        codeChanged: false,
        prompt: 'Die Textverteilung bleibt ähnlich, aber die Moderationsrichtlinie stuft andere Inhalte als Verstoß. Die Accuracy fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz neuer Richtlinie.',
        loesung: 'Das positive Label hat eine neue Semantik. Label- bzw. Konzept-Drift.',
      },
      {
        shift: 'Verspätungsgrenze',
        accuracyBefore: 0.94,
        accuracyAfter: 0.78,
        codeChanged: false,
        prompt: 'Fahrtdaten bleiben verteilt wie zuvor, aber „unpünktlich“ gilt nun ab 3 statt 5 Minuten. Die Klassifikationsgenauigkeit fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz fester neuer Grenze.',
        loesung: 'Die Klasse bedeutet etwas anderes. Das ist Konzept-Drift, kein Sensor-Drift.',
      },
      {
        shift: 'Kreditausfall-Horizont',
        accuracyBefore: 0.87,
        accuracyAfter: 0.69,
        codeChanged: false,
        prompt: 'Antragsmerkmale bleiben stabil, aber Ausfall wird nun über 6 statt 12 Monate definiert. Die Accuracy fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Horizontwechsel.',
        loesung: 'Dasselbe Merkmalsbild, neues Label: Konzept-Drift.',
      },
      {
        shift: 'Support-Eskalation',
        accuracyBefore: 0.92,
        accuracyAfter: 0.73,
        codeChanged: false,
        prompt: 'Tickettexte bleiben ähnlich, aber die interne Regel ändert, welche Tickets als Eskalation gelten. Die Genauigkeit bricht ein. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Prozessänderung.',
        loesung: 'Die Zieldefinition hat sich verschoben, nicht die Eingabeverteilung. Label- bzw. Konzept-Drift.',
      },
      {
        shift: 'Retouren-Regel',
        accuracyBefore: 0.9,
        accuracyAfter: 0.72,
        codeChanged: false,
        prompt: 'Die Bestelldaten bleiben verteilt wie zuvor, aber eine neue Retouren-Regel zählt nun auch Teilstornos als Rücksendung. Die Accuracy fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Regelwechsel.',
        loesung: 'Die Zieldefinition wurde geändert, nicht die Eingaben. Label- bzw. Konzept-Drift.',
      },
      {
        shift: 'Aktivitätsdefinition',
        accuracyBefore: 0.93,
        accuracyAfter: 0.76,
        codeChanged: false,
        prompt: 'Die Nutzungsdaten bleiben ähnlich, aber „aktiv“ gilt nun ab drei statt fünf Wochen-Logins. Die Metrik fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Schwellenwechsel.',
        loesung: 'Das Label hat eine neue Schwelle: Konzept-Drift.',
      },
      {
        shift: 'Bonitätsklasse',
        accuracyBefore: 0.88,
        accuracyAfter: 0.7,
        codeChanged: false,
        prompt: 'Antragsmerkmale bleiben stabil, aber die Ratingstufe „gut“ wird nun anders abgegrenzt. Die Genauigkeit bricht ein. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Klassenwechsel.',
        loesung: 'Neue Klassendefinition bei stabilen Eingaben: Konzept-Drift.',
      },
      {
        shift: 'Prioritätsregel',
        accuracyBefore: 0.95,
        accuracyAfter: 0.79,
        codeChanged: false,
        prompt: 'Ticketinhalte bleiben ähnlich, aber die Prioritätsregel stuft andere Anliegen als hoch ein. Die Accuracy fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Prioritätswechsel.',
        loesung: 'Die Bedeutung des hohen Labels hat sich verschoben: Label-Drift.',
      },
      {
        shift: 'Grenzwert-Norm',
        accuracyBefore: 0.91,
        accuracyAfter: 0.74,
        codeChanged: false,
        prompt: 'Messwerte bleiben stabil, aber eine neue Norm legt den Grenzwert für „außerhalb der Toleranz“ enger. Die Genauigkeit fällt. Welcher Fehler ist am plausibelsten?',
        noise: 'Zufälliger Label-Noise trotz Normwechsel.',
        loesung: 'Dieselben Werte bekommen neue Labels: Konzept-Drift.',
      },
    ],
  },
  challenge: {
    kind: 'subgruppe',
    slot: 'group',
    params: ['group', 'overallGood'],
    caseId: 'error-stable-subgroup',
    bank: [
      {
        group: 'Dialekt',
        overallGood: true,
        prompt: 'Die Gesamtgenauigkeit eines Transkriptionssystems war schon immer gut, aber ein Dialekt hat dauerhaft deutlich mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil jede Gruppenabweichung Drift ist.',
        loesung: 'Dauerhaft schlechtere Gruppe bei guter Gesamtmetrik: stabiler Subgruppenfehler, kein zeitlicher Drift.',
      },
      {
        group: 'Nachtschicht-Bilder',
        overallGood: true,
        prompt: 'Die Gesamtgenauigkeit war schon immer hoch, aber Bilder aus der Nachtschicht haben dauerhaft mehr Fehler — ohne dass sich die Nachtstatistik über Monate ändert. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Nachtschicht eine Zeitangabe ist.',
        loesung: 'Ein stabiles Gruppenmuster ist kein zeitlicher Drift. Die Nachtschicht muss separat gemessen werden.',
      },
      {
        group: 'kleine Schrift',
        overallGood: true,
        prompt: 'Ein OCR-Modell ist insgesamt gut, scheitert aber dauerhaft an sehr kleiner Schrift — unverändert seit dem Start. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Schriftgrößen sich im Markt ändern.',
        loesung: 'Stabile, gruppenspezifische Schwäche: Subgruppenfehler, keine neue Zeitverschiebung.',
      },
      {
        group: 'ältere Kundinnen',
        overallGood: true,
        prompt: 'Ein Voicebot ist insgesamt treffsicher, aber Anrufe älterer Kundinnen haben dauerhaft mehr Absichtsfehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Alter eine Zeitvariable ist.',
        loesung: 'Gute Gesamtmetrik verdeckt eine stabile Gruppenschwäche. Das ist ein Subgruppenfehler.',
      },
      {
        group: 'seltene Produktlinie',
        overallGood: true,
        prompt: 'Ein Defektmodell ist insgesamt gut, eine seltene Produktlinie hat aber seit Beginn deutlich mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil jede Abweichung Drift ist.',
        loesung: 'Das Muster ist zeitlich stabil und gruppenspezifisch: Subgruppenfehler, kein Drift.',
      },
      {
        group: 'kurze Texte',
        overallGood: true,
        prompt: 'Ein Moderationsmodell ist insgesamt gut, sehr kurze Posts haben aber dauerhaft mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Textlängen schwanken.',
        loesung: 'Eine stabile Längenschwäche ist ein Subgruppenproblem, kein zeitlicher Drift.',
      },
      {
        group: 'Mobilfunk-Fotos',
        overallGood: true,
        prompt: 'Ein Schadenerkenner ist insgesamt gut, Fotos von älteren Handykameras haben aber dauerhaft mehr Fehler — ohne Trend über die Monate. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Handykameras sich weiterentwickeln.',
        loesung: 'Stabile Gerätegruppe mit mehr Fehlern: Subgruppenfehler. Gesamtaccuracy reicht nicht.',
      },
      {
        group: 'Zweitsprachen-Mails',
        overallGood: true,
        prompt: 'Ein Absichtsklassifikator ist insgesamt gut, Mails in der Zweitsprache haben aber dauerhaft mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Sprache sich ändert.',
        loesung: 'Gruppenspezifisches, zeitlich stabiles Muster: Subgruppenfehler bzw. Fairness-Risiko.',
      },
      {
        group: 'linke Fahrspur bei Regen',
        overallGood: true,
        prompt: 'Ein Spurmodell ist insgesamt gut, eine bestimmte Spur-Wetter-Kombination hat aber seit Beginn deutlich mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil jede Wetterabweichung Drift ist.',
        loesung: 'Das Muster ist dauerhaft und gruppenspezifisch, nicht erst nach einer Zeitverschiebung. Subgruppenfehler separat messen.',
      },
      {
        group: 'Fax-Scans',
        overallGood: true,
        prompt: 'Ein Dokumentenleser ist insgesamt gut, aber eingehende Fax-Scans haben seit Beginn deutlich mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil jede Abweichung Drift ist.',
        loesung: 'Dauerhaft schwächere Fax-Gruppe bei guter Gesamtmetrik: stabiler Subgruppenfehler, kein Drift.',
      },
      {
        group: 'Kinderstimmen',
        overallGood: true,
        prompt: 'Ein Sprachassistent ist insgesamt treffsicher, Kinderstimmen verursachen aber dauerhaft mehr Erkennungsfehler — ohne Trend über die Zeit. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Stimmen sich ändern.',
        loesung: 'Stabile, gruppenspezifische Schwäche: Subgruppenfehler, separat messen.',
      },
      {
        group: 'Randgeräte',
        overallGood: true,
        prompt: 'Ein Qualitätsmodell ist insgesamt gut, Messungen von Randgeräten am Hallenrand haben aber dauerhaft mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Geräte sich abnutzen.',
        loesung: 'Stabiles Gerätegruppen-Muster: Subgruppenfehler, kein zeitlicher Drift.',
      },
      {
        group: 'Dämmerungsfotos',
        overallGood: true,
        prompt: 'Ein Wildtier-Monitor ist insgesamt gut, Fotos in der Dämmerung haben aber seit Beginn deutlich mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Lichtverhältnisse schwanken.',
        loesung: 'Dauerhafte Lichtgruppen-Schwäche: Subgruppenfehler. Die Gesamtmetrik verdeckt sie.',
      },
      {
        group: 'Fachjargon-Chats',
        overallGood: true,
        prompt: 'Ein Antwortmodell ist insgesamt gut, Chats mit internem Fachjargon haben aber dauerhaft mehr Fehler. Welche Diagnose passt?',
        drift: 'Zeitlicher Daten-Drift, weil Sprache sich wandelt.',
        loesung: 'Gruppenspezifisches, stabiles Muster: Subgruppenfehler bzw. Fairness-Risiko.',
      },
    ],
  },
};

const ERROR_DRIFT_IDS = ['a', 'b', 'c', 'd'];

/** Ein Options-Template je Fallart: options[0] ist korrekt, der Schlüsseltext
 *  ist je Fall eine Konstante (wörtlich aus allen neun kuratierten Varianten);
 *  die szenariobindenden Distraktoren stehen wörtlich in der Bank. */
const errorDriftOptions = (entry, capsule) => {
  if (capsule.kind === 'label-drift') {
    return [
      'Label- beziehungsweise Konzept-Drift durch die geänderte Zieldefinition.',
      'Reiner Input-Drift ohne Änderung am Ziel.',
      entry.noise,
      'Nur ein numerischer Rundungsfehler.',
    ];
  }
  if (capsule.kind === 'subgruppe') {
    return [
      'Stabiler Subgruppenfehler, der separat untersucht und gemessen werden muss.',
      entry.drift,
      'Label-Noise ohne Bezug zur Gruppe.',
      'Kein Problem, weil die Gesamtgenauigkeit gut ist.',
    ];
  }
  return [
    'Drift: Die Verteilung der Eingabedaten hat sich verschoben — das Modell muss auf aktuellen Daten neu bewertet und trainiert werden.',
    entry.noise,
    entry.subgroup,
    entry.overfit,
  ];
};

/** Kapselform: Slotwert aus der Szenario-Bank, alle `params`-Felder stimmen
 *  mit der Bankzeile überein, vier paarweise verschiedene Antworttexte. */
export function errorDriftCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    const entry = capsule.bank.find((item) => item[capsule.slot] === parameters[capsule.slot]);
    if (!entry) return false;
    for (const key of capsule.params) {
      if (parameters[key] !== entry[key]) return false;
    }
    return new Set(errorDriftOptions(entry, capsule)).size === 4;
  } catch { return false; }
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest
 *  nie `expected` ab. */
export function errorDriftCorrectText(parameters, capsule) {
  const entry = capsule.bank.find((item) => item[capsule.slot] === parameters?.[capsule.slot]);
  if (!entry || !errorDriftCapsuleOk(parameters, capsule)) {
    throw new Error('Parameter verletzen die Kapselform');
  }
  return errorDriftOptions(entry, capsule)[0];
}

/** Szenario-Bank-Sampler mit Rotation: Seed wählt Szenario und
 *  Antwortposition. Kein clean()-Guard: expected ist ein Buchstabe — Leak
 *  deckt Gate 3 im Test über den Volltext ab (Vorbild genMissingnessCapsule). */
export function genErrorDriftCapsule(seed, capsule) {
  const r = rng(seed);
  const entry = pick(r, capsule.bank);
  const options = errorDriftOptions(entry, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters: Object.fromEntries(capsule.params.map((key) => [key, entry[key]])),
    expected: { correctChoice: ERROR_DRIFT_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, ERROR_DRIFT_IDS),
    prompt: entry.prompt,
    fullSolution: entry.loesung,
  };
}

// --- W16: SVM-Margin-Kapseln (classify-svm-margin) ---------------------------
// Drei Kapseln 1:1 auf den Bestandsfällen (intro/core/stretch →
// hard-margin-width/svm-soft-margin-slack/svm-support-boundary). Kein reiner
// Slot-Bank-Fall: die Zahlenbanken tragen je 9 kuratierte Belegungen plus 5
// weitere konsistente Tupel für den Distinct-Boden (14 x 4 Rotationen = 56
// Kombinationen). Die abgeleiteten Kennzahlen sind nie hardcodiert — die Bank
// hält nur die unabhängigen Werte, marginWidth = 2/||w|| und
// marginScore = y·(wᵀx+b) rechnen Generator und Kapselform aus dem Tupel nach
// (6-stellig gerundet wie die kuratierten Orakel, Toleranz 1e-6). Die
// intro-Bank trägt nur pythagoreische Paare, damit die Lösung die Norm
// ganzzahlig nennen kann ($||w||=5$). Templates und Distraktoren wörtlich aus
// den Varianten; die drei Base-Fälle sind Konzept-Anker und bleiben als
// Befund unangetastet. Befund Dezimalschreibweise: intro/core rendern
// deutsche Kommas (fmtDe/fmtTrim3), der stretch-Fall schreibt im Bestand
// englische Punkte ($b=0.5$, Score $3.5$) — die Kapsel hält das wörtlich.

/** Kapseln für classify-svm-margin: je Profil genau eine Kapsel mit Art,
 *  Fallbindung und Zahlenbank. Die Banken enthalten alle 27 kuratierten
 *  Orakel-Belegungen (je 9 je Fall) plus 5 weitere konsistente Tupel je
 *  Kapsel für den Distinct-Boden. */
export const SVM_MARGIN_CAPSULES = {
  intro: {
    kind: 'hard-margin-width',
    caseId: 'hard-margin-width',
    bank: [
      { w: [3, 4], b: -2 },
      { w: [5, 12], b: -1 },
      { w: [8, 15], b: 0 },
      { w: [7, 24], b: 1 },
      { w: [9, 12], b: 2 },
      { w: [12, 16], b: 3 },
      { w: [20, 21], b: 4 },
      { w: [6, 8], b: 5 },
      { w: [15, 20], b: 6 },
      { w: [10, 24], b: -3 },
      { w: [18, 24], b: -4 },
      { w: [16, 30], b: 2 },
      { w: [12, 35], b: 0 },
      { w: [9, 40], b: -1 },
    ],
  },
  core: {
    kind: 'soft-margin-slack',
    caseId: 'svm-soft-margin-slack',
    bank: [
      { C: 1, slack: 0.4 },
      { C: 2, slack: 0.2 },
      { C: 0.5, slack: 1.5 },
      { C: 3, slack: 0.1 },
      { C: 4, slack: 0.75 },
      { C: 1.5, slack: 0.3 },
      { C: 0.25, slack: 2 },
      { C: 5, slack: 0.05 },
      { C: 2.5, slack: 0.6 },
      { C: 0.75, slack: 1.2 },
      { C: 6, slack: 0.15 },
      { C: 1.2, slack: 0.9 },
      { C: 3.5, slack: 0.45 },
      { C: 0.8, slack: 2.5 },
    ],
  },
  stretch: {
    kind: 'support-boundary',
    caseId: 'svm-support-boundary',
    bank: [
      { w: [1, 2], b: -1, point: [1, 1], label: 1 },
      { w: [2, -1], b: 0.5, point: [2, 1], label: 1 },
      { w: [1, 1], b: 0, point: [1, -2], label: -1 },
      { w: [3, 2], b: -2, point: [1, 0], label: 1 },
      { w: [2, 3], b: 1, point: [-1, 1], label: 1 },
      { w: [4, -1], b: 0, point: [1, 2], label: -1 },
      { w: [1, -3], b: 2, point: [2, 1], label: 1 },
      { w: [2, 2], b: -1, point: [1, -1], label: -1 },
      { w: [5, 1], b: -2, point: [0, 2], label: 1 },
      { w: [2, 1], b: 0, point: [1, 1], label: 1 },
      { w: [1, -1], b: 1, point: [0, 2], label: -1 },
      { w: [3, -1], b: -1, point: [2, 0], label: 1 },
      { w: [0, 2], b: -3, point: [1, 1], label: -1 },
      { w: [1, 2], b: 0.5, point: [1, -1], label: -1 },
    ],
  },
};

const SVM_MARGIN_IDS = ['a', 'b', 'c', 'd'];

/** ||w|| der 2D-Trenngeraden. */
const svmNorm = (w) => Math.hypot(w[0], w[1]);

/** marginScore = y·(wᵀx + b), 6-stellig gerundet wie die kuratierten Orakel. */
const svmMarginScore = ({ w, b, point, label }) => (
  Math.round(label * (w[0] * point[0] + w[1] * point[1] + b) * 1e6) / 1e6
);

const svmVecEq = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === 2 && right.length === 2
  && left[0] === right[0] && left[1] === right[1];

/** Ein Template je Fallart: options[0] ist korrekt, Texte und die drei
 *  Distraktoren stehen wörtlich in den kuratierten Varianten (intro:
 *  Korridorbreite 2/||w|| mit Komma-Dezimalen; core: Slack/C mit
 *  Komma-Dezimalen; stretch: Margin-Score mit Punkt-Dezimalen). */
const svmMarginOptions = (parameters, capsule) => {
  if (capsule.kind === 'soft-margin-slack') {
    return [
      `Sie erlaubt eine Margin-Verletzung von $\\xi=${fmtDe(parameters.slack)}$, die mit Kostenparameter $C=${fmtDe(parameters.C)}$ in der Zielfunktion bestraft wird.`,
      'Sie entfernt alle Trainingspunkte aus der Optimierung.',
      'Sie maximiert Fehler ohne jede Strafe.',
      'Sie macht aus der SVM ein unüberwachtes Clustering.',
    ];
  }
  if (capsule.kind === 'support-boundary') {
    return [
      `Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=${parameters.marginScore}$, daher bestimmt der Punkt die Lösung.`,
      'Sie sind zufällig gewählte Punkte für einen Validierungssplit.',
      'Sie sind alle Punkte auf der richtigen Seite, weit vom Rand entfernt.',
      'Sie sind nur die falsch klassifizierten Testpunkte.',
    ];
  }
  return [
    `Die Marginbreite beträgt $2/||w||\\approx ${fmtTrim3(parameters.marginWidth)}$ für $w=(${parameters.w.join(',')})$; ein kleines $||w||$ bedeutet einen großen Margin.`,
    'Den Abstand zwischen den beiden klassennächsten Punkten der Klassen.',
    'Die Anzahl der Stützvektoren, die die Trenngerade definieren.',
    'Die Genauigkeit des Klassifikators auf den Trainingsdaten.',
  ];
};

const svmMarginPrompt = (parameters, capsule) => {
  if (capsule.kind === 'soft-margin-slack') {
    return `Eine Soft-Margin-SVM verwendet $C=${fmtDe(parameters.C)}$ und eine Slack-Variable $\\xi=${fmtDe(parameters.slack)}$. Was erlaubt diese Slack-Variable?`;
  }
  if (capsule.kind === 'support-boundary') {
    return `Für $w=(${parameters.w.join(',')})$, $b=${parameters.b}$ und den gelabelten Punkt $x=(${parameters.point.join(', ')})$, $y=${parameters.label}$: Welche Rolle haben Support Vectors in einer linearen SVM?`;
  }
  return `Eine Hard-Margin-SVM hat $w=(${parameters.w.join(',')})$ und $b=${parameters.b}$. Was beschreibt ihr geometrischer Margin?`;
};

const svmMarginSolution = (parameters, capsule) => {
  if (capsule.kind === 'soft-margin-slack') {
    return `Slack erlaubt, die Margin um ${fmtDe(parameters.slack)} zu verletzen; dafür fällt in der Zielfunktion eine von $C=${fmtDe(parameters.C)}$ gewichtete Strafe an.`;
  }
  if (capsule.kind === 'support-boundary') {
    return `Der Margin-Score ist $y(w^Tx+b)=${parameters.marginScore}$. Punkte am Rand oder mit Verletzung tragen zur Lösung bei; weit entfernte Punkte nicht.`;
  }
  return `$||w||=${svmNorm(parameters.w)}$, daher ist die Korridorbreite $2/||w||\\approx ${fmtTrim3(parameters.marginWidth)}$. Der Bias verschiebt die Grenze, ändert diese Breite aber nicht.`;
};

/** Kapselform über den gespeicherten Parametern: Tupel aus der Zahlenbank
 *  plus nachgerechnete Kennzahl (marginWidth = 2/||w|| bzw.
 *  marginScore = y·(wᵀx+b), Toleranz 1e-6) und vier paarweise verschiedene
 *  Antworttexte; intro verlangt die ganzzahlige Norm (pythagoreische Bank). */
export function svmMarginCapsuleOk(parameters, capsule) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (capsule.kind === 'soft-margin-slack') {
      const { C, slack } = parameters;
      if (!capsule.bank.some((entry) => entry.C === C && entry.slack === slack)) return false;
    } else if (capsule.kind === 'support-boundary') {
      const { w, b, point, label, marginScore } = parameters;
      const entry = capsule.bank.find((item) => svmVecEq(item.w, w) && item.b === b
        && svmVecEq(item.point, point) && item.label === label);
      if (!entry || typeof marginScore !== 'number') return false;
      if (Math.abs(marginScore - label * (w[0] * point[0] + w[1] * point[1] + b)) > 1e-6) return false;
    } else {
      const { w, b, marginWidth } = parameters;
      if (!capsule.bank.some((entry) => svmVecEq(entry.w, w) && entry.b === b)) return false;
      const norm = svmNorm(w);
      if (!Number.isInteger(norm)) return false;
      if (typeof marginWidth !== 'number') return false;
      if (Math.abs(marginWidth - 2 / norm) > 1e-6) return false;
    }
    return new Set(svmMarginOptions(parameters, capsule)).size === 4;
  } catch { return false; }
}

/** Unabhängiger Schlüssel: korrekter Wahltext aus den Fallparametern, liest
 *  nie `expected` ab. */
export function svmMarginCorrectText(parameters, capsule) {
  if (!svmMarginCapsuleOk(parameters, capsule)) throw new Error('SVM-Margin-Befund verletzt die Kapselform');
  return svmMarginOptions(parameters, capsule)[0];
}

/** Zahlenbank-Sampler mit Rotation: Seed wählt Tupel und Antwortposition;
 *  die Kennzahl wird aus dem Tupel gerechnet (marginWidth = 2/||w||,
 *  marginScore = y·(wᵀx+b), 6-stellig wie die Orakel). Kein clean()-Guard:
 *  expected ist ein Buchstabe — Leak deckt Gate 3 im Test über den Volltext
 *  ab (Vorbild genSigmoidCapsule). */
export function genSvmMarginCapsule(seed, capsule) {
  const r = rng(seed);
  const entry = pick(r, capsule.bank);
  let parameters;
  if (capsule.kind === 'soft-margin-slack') {
    parameters = { C: entry.C, slack: entry.slack };
  } else if (capsule.kind === 'support-boundary') {
    parameters = {
      w: entry.w,
      b: entry.b,
      point: entry.point,
      label: entry.label,
      marginScore: svmMarginScore(entry),
    };
  } else {
    parameters = { w: entry.w, b: entry.b, marginWidth: Math.round((2 / svmNorm(entry.w)) * 1e6) / 1e6 };
  }
  const options = svmMarginOptions(parameters, capsule);
  const rotation = variantCaseIndex(seed, options.length);
  return {
    parameters,
    expected: { correctChoice: SVM_MARGIN_IDS[rotation] },
    choices: buildRotatedChoices(options, rotation, SVM_MARGIN_IDS),
    prompt: svmMarginPrompt(parameters, capsule),
    fullSolution: svmMarginSolution(parameters, capsule),
  };
}
