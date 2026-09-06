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

import { bindFamilyDraw, pick, randInt, rng } from './generator_draw_kit.mjs';

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

// --- registry ------------------------------------------------------------------------

export const DATA_ML_SEED_GENERATORS = {
  genCompleteRows,
  genDedupRows,
  genConditionalCount,
  genMseGradient,
  genBaselineCorrect,
  genMseFromResiduals,
  genR2Share,
  genConfusionCount,
  genCvSpread,
  genSeedSpread,
  genSubgroupGapPp,
  genShrinkagePercent,
  genEnsembleAccuracy,
  genPcaVariancePercent,
};
