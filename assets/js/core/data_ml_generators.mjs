// Seeded generators for weeks 6-17 (data & classic ML), ADR-0012 Option A,
// plus capsule machinery for the eight classify-* families (W25/W26 ff.).
//
// Contract (mirrors w01/w05 house rules):
//   - mulberry32 rng, identical to the other generator modules;
//   - every generator returns { parameters, expected, prompt, fullSolution };
//   - `expected` is an exact integer for numeric cases (the numeric grader is
//     integer-exact by design); single-choice draws (genRmseUnitFromMse)
//     return `expected: {}` plus choices/feedbackRules instead;
//   - answer spaces are deliberately wide (>= 20 distinct expected values over
//     600 seeds, enforced by tests/data_ml_generators.test.mjs) so gate
//     re-seeds produce meaningful new instances, not memorisable answers;
//   - variation is semantic (direction, metric, framing, defect kind), never
//     just noise: every family mixes >= 3 prompt shapes;
//   - the answer never appears as a standalone number in the prompt (a
//     bounded redraw guard enforces this), while full solutions always
//     contain it;
//   - degenerate draws are retried with a bounded guard.

import {
  bindFamilyDraw, pick, randInt, rng, shuffle, variantCaseIndex, buildRotatedChoices, CHOICE_IDS,
} from './generator_draw_kit.mjs';
import { refCopy, pyLit, pyNum, pyRound } from './procedural/py_test_kit.mjs';
import { registerStaticCases, staticCaseBody } from '../domain/family_registry.mjs';
import confusionMetricDoc from '../../../content/families/aggregate-confusion-metric.json' with { type: 'json' };
import ratioPercentDoc from '../../../content/families/formula-ratio-percent-metric.json' with { type: 'json' };
import mseGradientDoc from '../../../content/families/optimize-mse-gradient-closed-form.json' with { type: 'json' };
import goalShiftDoc from '../../../content/families/validate-goalshift-flag-rules.json' with { type: 'json' };
import formulaStatDoc from '../../../content/families/formula-stat-from-table.json' with { type: 'json' };

import benchmarkBank from '../../../content/banks/classify-benchmark-reading.json' with { type: 'json' };
import confoundingBank from '../../../content/banks/classify-confounding.json' with { type: 'json' };
import errorDriftBank from '../../../content/banks/classify-error-drift.json' with { type: 'json' };
import loraBank from '../../../content/banks/classify-lora-tradeoff.json' with { type: 'json' };
import missingnessBank from '../../../content/banks/classify-missingness.json' with { type: 'json' };
import sigmoidBank from '../../../content/banks/classify-sigmoid-regime.json' with { type: 'json' };
import svmMarginBank from '../../../content/banks/classify-svm-margin.json' with { type: 'json' };
import taskTypeBank from '../../../content/banks/classify-task-type.json' with { type: 'json' };

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

// RMSE/MSE unit diagnosis (seeded replacement for the authored variant bank):
// the seed draws a (context, unit) pair and a perfect square for MSE; the
// four option slots are the stable misconception space (name confusion,
// unit cancellation, needs-residuals vs. the correct root-in-target-unit).
const RMSE_SCENARIOS = [
  { context: 'Reparaturkosten', unit: 'Euro' },
  { context: 'Liefergewichte', unit: 'kg' },
  { context: 'Fahrzeiten', unit: 'min' },
  { context: 'Temperaturen', unit: '°C' },
  { context: 'Abstände', unit: 'm' },
  { context: 'Latenzzeiten', unit: 's' },
  { context: 'Verkaufspreise', unit: 'Euro' },
  { context: 'Energieverbräuche', unit: 'kWh' },
  { context: 'Fertigungstoleranzen', unit: 'mm' },
  { context: 'Liegedauern', unit: 'Tage' },
];
const RMSE_SQUARES = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];

export const rmseCorrectOptionText = ({ mse, unit }) =>
  `RMSE = $\\sqrt{${mse}} = ${Math.sqrt(mse)}$ — die Wurzel bringt den Wert zurück in die Zieleinheit ${unit}.`;

const rmseDistractorTexts = ({ mse }) => [
  `RMSE = ${mse} — MSE und RMSE sind beides Fehlermaße und unterscheiden sich nur im Namen.`,
  `RMSE = ${Math.sqrt(mse)}, aber einheitenlos — die Wurzel kürzt die Einheit heraus.`,
  'Aus dem MSE allein lässt sich der RMSE nicht berechnen — dazu braucht es die einzelnen Residuen.',
];

const RMSE_FEEDBACK = [
  'Die Quadratwurzel fehlt: RMSE = √MSE. Nur der RMSE liegt in der Zieleinheit.',
  'Der Wert stimmt, aber die Einheit bleibt: die Wurzel aus einer quadrierten Einheit ist wieder die Zieleinheit.',
  'Der MSE-Wert reicht: RMSE = √MSE, die einzelnen Residuen sind dafür nicht nötig.',
];

export function genRmseUnitFromMse(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const { context, unit } = pick(r, RMSE_SCENARIOS);
    const mse = pick(r, RMSE_SQUARES);
    const root = Math.sqrt(mse);
    const parameters = { context, unit, mse };
    const distractors = rmseDistractorTexts(parameters);
    const options = [rmseCorrectOptionText(parameters), ...distractors];
    const rotation = variantCaseIndex(seed, options.length);
    const choices = buildRotatedChoices(options, rotation, CHOICE_IDS);
    // Feedback rules keyed by the rotated ids so each distractor keeps its
    // explanation regardless of position (authored ids rotated loose in
    // 0.8.7; generated rules stay attached to the drawn text).
    const feedbackRules = choices
      .filter((choice) => !choice.correct)
      .map((choice) => ({ if: `choice === '${choice.id}'`, then: RMSE_FEEDBACK[distractors.indexOf(choice.text)] }));
    return {
      parameters,
      expected: {},
      activityType: 'single-choice',
      masteryEligible: false,
      choices,
      prompt: `Ein Regressionsmodell für ${context} (Ziel in ${unit}) hat auf dem Testset $\\mathrm{MSE} = ${mse}$. Welche Aussage über den RMSE ist korrekt?`,
      fullSolution: `$\\mathrm{RMSE} = \\sqrt{\\mathrm{MSE}} = \\sqrt{${mse}} = ${root}$. Der MSE trägt die Einheit ${unit}², die Wurzel führt den Wert zurück auf ${unit}.`,
      hints: [
        'MSE mittelt quadrierte Fehler; die Wurzel macht die Quadrierung rückgängig.',
        `Welche Einheit trägt der RMSE, wenn das Ziel in ${unit} gemessen wird?`,
      ],
      feedbackRules,
      typicalErrors: [
        'Wurzel beim Übergang MSE → RMSE vergessen',
        'die Einheiten von MSE (quadriert) und RMSE (Zieleinheit) verwechseln',
        'glauben, RMSE brauche die Einzelfehler',
      ],
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

// --- aggregate-confusion-metric: seeded cases -------------------------------
// Sechs ehemals statische Shard-Fälle ziehen Fixtures/Literale pro Seed.
// starterCode, Base-Testblock, referenceSolver, prompt und fullSolution
// bleiben byte-identisch authored — gelesen aus dem registrierten Fallkörper,
// nicht dupliziert. Generierte Tests = authored Base-Block + `# seeded extra
// cases` mit __ref_-Orakelkopie des Referenzsolvers (reine Python-Wahrheit)
// und Gleichheits-Checks über die gezogenen Fixtures. Muster wie
// optimize-decode-greedy-loop / validate-required-field-raise.

// Lazy wie ensureGitDocs: Bundle-Chunk-Reihenfolge ist unbestimmt, die Docs
// sind deshalb Modul-Importe und registrieren sich beim ersten Zugriff.
let shardDocsReady = false;
export function ensureShardDocs() {
  if (!shardDocsReady) {
    registerStaticCases(confusionMetricDoc.familyId, confusionMetricDoc.cases);
    registerStaticCases(ratioPercentDoc.familyId, ratioPercentDoc.cases);
    registerStaticCases(mseGradientDoc.familyId, mseGradientDoc.cases);
    registerStaticCases(goalShiftDoc.familyId, goalShiftDoc.cases);
    registerStaticCases(formulaStatDoc.familyId, formulaStatDoc.cases);
    shardDocsReady = true;
  }
}

const confusionBody = (caseId) => { ensureShardDocs(); return staticCaseBody('aggregate-confusion-metric', caseId); };
const ratioBody = (caseId) => { ensureShardDocs(); return staticCaseBody('formula-ratio-percent-metric', caseId); };
const mseGradientBody = (caseId) => { ensureShardDocs(); return staticCaseBody('optimize-mse-gradient-closed-form', caseId); };
const goalShiftBody = (caseId) => { ensureShardDocs(); return staticCaseBody('validate-goalshift-flag-rules', caseId); };

// Solver-Seite (data_ml_families): authored Referenzsolver, lazy registriert.
export const confusionRefSolver = (caseId) => confusionBody(caseId).expected.referenceSolver;
export const ratioRefSolver = (caseId) => ratioBody(caseId).expected.referenceSolver;
export const gradMseRefSolver = (caseId) => mseGradientBody(caseId).expected.referenceSolver;
export const goalShiftRefSolver = (caseId) => goalShiftBody(caseId).expected.referenceSolver;

const seededPyBlock = (body, fnNames, lines) => (
  `${body.parameters.tests}\n\n# seeded extra cases\n${refCopy(body.expected.referenceSolver, fnNames)}\n${lines.join('\n')}`
);

const pyodideInstance = (body, extraParameters, tests, note) => {
  return {
    parameters: {
      packages: body.parameters.packages,
      starterCode: body.parameters.starterCode,
      tests,
      ...extraParameters,
    },
    expected: body.expected,
    prompt: `${body.prompt}\n\nGezogene Fixture: ${note}`,
    fullSolution: body.fullSolution,
    activityType: 'python-code',
    graderId: 'pyodide',
  };
};

export function genSigmoidPredictTests(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const z = randInt(r, -40, 40) / 10;
    const n = randInt(r, 5, 8);
    const yt = Array.from({ length: n }, () => (r() < 0.45 ? 1 : 0));
    const yp = Array.from({ length: n }, () => randInt(r, 5, 95) / 100);
    const t = randInt(r, 3, 7) / 10;
    const args = `${pyLit(yt)}, ${pyLit(yp)}, ${pyLit(t)}`;
    const tests = seededPyBlock(confusionBody('sigmoid-predict-numpy'), ['sigmoid', 'confusion', 'precision_recall_f1'], [
      `__check('seeded sigmoid', abs(float(np.asarray(sigmoid(${pyLit(z)}))) - float(np.asarray(__ref_sigmoid(${pyLit(z)})))) < 1e-12)`,
      `__check('seeded confusion', confusion(${args}) == __ref_confusion(${args}))`,
      `__check('seeded prf', all(abs(a - b) < 1e-9 for a, b in zip(precision_recall_f1(confusion(${args})), __ref_precision_recall_f1(__ref_confusion(${args})))))`,
    ]);
    return pyodideInstance(confusionBody('sigmoid-predict-numpy'), { seedZ: z, seedYt: yt, seedYp: yp, seedT: t }, tests,
      `z = ${z}, ${n} Zeilen, Schwelle ${t}.`);
  });
}

export function genConfusionCostReport(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const cm = { tp: randInt(r, 1, 8), fp: randInt(r, 0, 4), fn: randInt(r, 0, 5), tn: randInt(r, 1, 8) };
    const cfp = randInt(r, 2, 50);
    const cfn = randInt(r, 2, 50);
    const n = randInt(r, 4, 8);
    const y = Array.from({ length: n }, () => randInt(r, 5, 95) / 100);
    const t = Array.from({ length: n }, () => (r() < 0.45 ? 1 : 0));
    const tests = seededPyBlock(confusionBody('confusion-cost-report'), ['total_cost', 'best_threshold'], [
      `__check('seeded cost', total_cost(${pyLit(cm)}, ${cfp}, ${cfn}) == __ref_total_cost(${pyLit(cm)}, ${cfp}, ${cfn}))`,
      `__check('seeded best', best_threshold(${pyLit(y)}, ${pyLit(t)}, ${cfp}, ${cfn}) == __ref_best_threshold(${pyLit(y)}, ${pyLit(t)}, ${cfp}, ${cfn}))`,
    ]);
    return pyodideInstance(confusionBody('confusion-cost-report'), { seedCm: cm, seedCfp: cfp, seedCfn: cfn, seedY: y, seedT: t }, tests,
      `Matrix ${pyLit(cm)}, Kosten (${cfp}, ${cfn}), ${n} Scores.`);
  });
}

const CONFUSION_ROW_WORDS = ['katze', 'hund', 'baum', 'licht', 'weg', 'haus', 'wort', 'zahl', 'bild', 'ton'];

const confRowsWords = (r, count) => {
  const pool = [...CONFUSION_ROW_WORDS];
  return Array.from({ length: count }, () => {
    const index = randInt(r, 0, pool.length - 1);
    return pool.splice(index, 1)[0];
  });
};

export function genConfusionFromRows(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const n = randInt(r, 4, 7);
    const rows = Array.from({ length: n }, () => [
      r() < 0.5 ? 'pos' : 'neg',
      r() < 0.5 ? 'pos' : 'neg',
    ]);
    const w1 = confRowsWords(r, randInt(r, 2, 4)).join(' ');
    const w2 = confRowsWords(r, randInt(r, 2, 4)).join(' ');
    const answers = rows.map((row) => (r() < 0.8 ? row[1] : row[0] === 'pos' ? 'neg' : 'pos'));
    const golds = rows.map((row) => row[1]);
    const tests = seededPyBlock(confusionBody('confusion-from-rows'), ['_words', 'confusion', 'prf', 'exact_match_rate', 'token_f1'], [
      `__check('seeded confusion', list(confusion(${pyLit(rows)})) == list(__ref_confusion(${pyLit(rows)})))`,
      `__check('seeded em', abs(exact_match_rate(${pyLit(answers)}, ${pyLit(golds)}) - __ref_exact_match_rate(${pyLit(answers)}, ${pyLit(golds)})) < 1e-12)`,
      `__check('seeded f1', abs(token_f1(${pyLit(w1)}, ${pyLit(w2)}) - __ref_token_f1(${pyLit(w1)}, ${pyLit(w2)})) < 1e-12)`,
      `__check('seeded prf', prf(*confusion(${pyLit(rows)})[:3]) == __ref_prf(*__ref_confusion(${pyLit(rows)})[:3]))`,
    ]);
    return pyodideInstance(confusionBody('confusion-from-rows'), { seedRows: rows, seedW1: w1, seedW2: w2, seedAnswers: answers }, tests,
      `${n} Label-Zeilen, Token-Paar '${w1}'/'${w2}'.`);
  });
}

export function genFairnessMetricCompare(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const g1 = pick(r, ['stadt', 'land', 'nord', 'sued']);
    const g2 = pick(r, ['jung', 'alt', 'west', 'ost']);
    const zaehlungen = {
      [g1]: { tp: randInt(r, 10, 60), fp: randInt(r, 2, 20), fn: randInt(r, 2, 20), tn: randInt(r, 30, 90) },
      [g2]: { tp: randInt(r, 10, 60), fp: randInt(r, 2, 20), fn: randInt(r, 2, 20), tn: randInt(r, 30, 90) },
    };
    const tests = seededPyBlock(confusionBody('fairness-metric-compare'), ['subgroup_metrics'], [
      `__check('seeded metrics', subgroup_metrics(${pyLit(zaehlungen)}) == __ref_subgroup_metrics(${pyLit(zaehlungen)}))`,
    ]);
    return pyodideInstance(confusionBody('fairness-metric-compare'), { seedZaehlungen: zaehlungen }, tests,
      `Gruppen ${g1}/${g2}: ${pyLit(zaehlungen)}.`);
  });
}

// predict-output: festes token_f1-Snippet, gezogene Argumentpaare.
const METRIC_TRACE_HEAD = `def token_f1(answer, gold):
    a = answer.lower().split()
    g = gold.lower().split()
    common = sum(min(a.count(t), g.count(t)) for t in set(a) & set(g))
    if common == 0:
        return 0.0
    p = common / len(a)
    r = common / len(g)
    return round(2 * p * r / (p + r), 2)
`;

// JS-Spiegel von token_f1: lower + whitespace-split + Multiset-Overlap.
const tokenF1 = (answer, gold) => {
  const a = answer.toLowerCase().split(/\s+/).filter(Boolean);
  const g = gold.toLowerCase().split(/\s+/).filter(Boolean);
  const count = (list) => list.reduce((map, token) => map.set(token, (map.get(token) ?? 0) + 1), new Map());
  const ca = count(a);
  const cg = count(g);
  let common = 0;
  for (const [token, n] of ca) common += Math.min(n, cg.get(token) ?? 0);
  if (common === 0) return 0.0;
  const p = common / a.length;
  const rr = common / g.length;
  return pyRound((2 * p * rr) / (p + rr), 2);
};

const METRIC_TRACE_POOL = ['katze', 'hund', 'baum', 'licht', 'weg', 'haus', 'wort', 'zahl', 'bild', 'ton', 'satz', 'code'];

export function genMetricCodeOutput(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const phrase = () => {
      const size = randInt(r, 2, 4);
      const pool = [...METRIC_TRACE_POOL];
      return Array.from({ length: size }, () => pool.splice(randInt(r, 0, pool.length - 1), 1)[0]).join(' ');
    };
    // Paar 1 teilt mindestens ein Token (partial overlap), Paar 2 ist
    // disjunkt (0.0) oder identisch (1.0) — die authored Arme.
    const pool = [...METRIC_TRACE_POOL];
    const draw = () => pool.splice(randInt(r, 0, pool.length - 1), 1)[0];
    const shared = draw();
    const a1 = [shared, draw(), draw()].join(' ');
    const g1 = [shared, draw()].join(' ');
    const disjoint = r() < 0.7;
    const a2 = disjoint ? [draw(), draw()].join(' ') : phrase();
    const g2 = disjoint ? [draw(), draw()].join(' ') : a2;
    const snippet = `${METRIC_TRACE_HEAD}
print(token_f1("${a1}", "${g1}"))
print(token_f1("${a2}", "${g2}"))`;
    const output = `${pyNum(tokenF1(a1, g1))}\n${pyNum(tokenF1(a2, g2))}`;
    return {
      parameters: { snippet, a1, g1, a2, g2 },
      expected: { kind: 'output-lines', output },
      prompt: `Was gibt das Programm aus? Sage die Ausgabe der beiden print-Aufrufe von <code>token_f1</code> vorher.`,
      fullSolution: `Multiset-Overlap bestimmt p und r; gerundet auf zwei Stellen: <code>${output.replace('\n', '</code> / <code>')}</code>.`,
      activityType: 'predict-output',
      graderId: 'deterministic',
    };
  });
}

// Solver-Seite desselben Falls: rekonstruiert die Ausgabe allein aus den
// gezogenen Argumentpaaren (kein expected-Zugriff).
export const metricTraceExpected = ({ a1, g1, a2, g2 }) => ({
  output: `${pyNum(tokenF1(a1, g1))}\n${pyNum(tokenF1(a2, g2))}`,
});

// single-choice: asymmetrische Fehlerkosten — Szenario-Prosa authored,
// Kostenpaar gezogen (fp/fn >= 200 wie authored), Optionen slots.
const THRESHOLD_SCENARIOS = [
  (fp, fn) => `Spamfilter: FP (legitime Mail im Spam) ${fp} €, FN ${fn} €. Welche Schwellen-Strategie senkt die erwarteten Kosten?`,
  (fp, fn) => `Betrugsalarm: falsches Einfrieren eines Kontos (FP) kostet ${fp}, übersehener Kleinstbetrug (FN) ${fn}. Strategie?`,
  (fp, fn) => `Werbeblocker: fälschlich geblockte legitime Anzeige ${fp}, durchgerutschte Spam-Anzeige ${fn}. Schwelle?`,
  (fp, fn) => `Moderation: falsches Entfernen eines harmlosen Posts ${fp}, übersehenes toxisches Kurzposting ${fn}. Kostenminimale Schwelle?`,
  (fp, fn) => `Filter: FP ${fp} €, FN ${fn} €. Welche Schwellenwert-Strategie minimiert die erwarteten Kosten?`,
  (fp, fn) => `QA-Scanner: Ausschuss eines guten Teils (FP) ${fp}, entgangener Mini-Defekt (FN) ${fn}. Strategie?`,
  (fp, fn) => `Phishing-Warnung: Fehlalarm an eine Kundin ${fp}, übersehene Nuisance-Mail ${fn}. Schwelle?`,
  (fp, fn) => `SOC-Alert: falscher Incident-Call (FP) ${fp}, verpasste Low-Severity-Mail (FN) ${fn}. Kostenstrategie?`,
  (fp, fn) => `Ein Spamfilter gibt Wahrscheinlichkeiten aus. FP kostet ${fp} €, FN ${fn} €. Welche Schwellenwert-Strategie minimiert die erwarteten Kosten?`,
];
const THRESHOLD_FP_COSTS = [15, 25, 40, 50, 60, 80, 100, 200, 500];
const THRESHOLD_FN_COSTS = [0.03, 0.04, 0.05, 0.08, 0.1, 0.2, 0.5, 1];

export const thresholdCorrectText = ({ ratio }) =>
  `Schwellenwert anheben (Richtung 0,9): Nur bei hoher Wahrscheinlichkeit positiv markieren, weil ein FP rund ${ratio}-mal teurer ist als ein FN.`;

export function genThresholdCostChoice(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const scenario = randInt(r, 0, THRESHOLD_SCENARIOS.length - 1);
    const fpCost = pick(r, THRESHOLD_FP_COSTS);
    // authored lower bound: fp is at least ~200x as expensive as fn.
    const fnPool = THRESHOLD_FN_COSTS.filter((cost) => fpCost / cost >= 200);
    const fnCost = pick(r, fnPool);
    const ratio = Math.round(fpCost / fnCost);
    const parameters = { scenario, fpCost, fnCost, ratio };
    const options = [
      thresholdCorrectText(parameters),
      'Schwellenwert senken (Richtung 0,1): Fast alles wird als positiv markiert, dadurch geht nichts unter.',
      'Beim Standard 0,5 bleiben: Dieser Wert ist kostenunabhängig immer optimal.',
      'Der Schwellenwert beeinflusst die Kostenbilanz nicht — entscheidend ist allein die Accuracy.',
    ];
    const rotation = variantCaseIndex(seed, options.length);
    const choices = buildRotatedChoices(options, rotation, CHOICE_IDS);
    return {
      parameters,
      expected: {},
      choices,
      prompt: THRESHOLD_SCENARIOS[scenario](fmtDe(fpCost), fmtDe(fnCost)),
      fullSolution: `${fmtDe(fpCost)} / ${fmtDe(fnCost)} = ${fmtDe(ratio)}: Der FP dominiert die Kostenbilanz. Die Schwelle hoch verschiebt Vorhersagen von positiv nach negativ und senkt die FP-Zahl — die zusätzlichen FN sind rund ${ratio}-mal billiger.`,
      activityType: 'single-choice',
      graderId: 'deterministic',
    };
  });
}

// --- formula-ratio-percent-metric: seeded cases -----------------------------
// Drei ehemals statische Shard-Fälle. Python-repr-Parität: alle Quotienten
// haben Nenner <= 1000 (>= 1e-3 im Float — kein Exponential-Drift zwischen
// JS String() und Python str()); Operationen wörtlich wie im Snippet.

const pyFloatText = (value) => (Number.isInteger(value) ? `${value}.0` : String(value));

const LEDGER_ID_POOL = ['q1', 'q2', 'q3', 'q4', 'q5', 'a', 'b', 'x', 'y', 'p', 'q', 'r', 's', 't', 'u1', 'z', 'w', 'v', 'r1', 'r2', 'k', 'm', 'n', 'o'];

// Ledger-Spiegel: (kennung, retrieval_treffer, antwort_korrekt) -> drei Zeilen.
export const ledgerRatesExpected = ({ faelle }) => {
  const treffer = faelle.filter((row) => row[1]);
  const korrekt = treffer.filter((row) => row[2]);
  return {
    output: `${treffer.length}\n${pyFloatText(pyRound(korrekt.length / treffer.length, 3))}\n${pyFloatText(pyRound(korrekt.length / faelle.length, 3))}`,
  };
};

export function genLedgerRatesOutput(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const n = randInt(r, 2, 6);
    const pool = [...LEDGER_ID_POOL];
    const faelle = Array.from({ length: n }, () => {
      const id = pool.splice(randInt(r, 0, pool.length - 1), 1)[0];
      const treffer = r() < 0.7;
      const korrekt = treffer && r() < 0.6;
      return [id, treffer, korrekt];
    });
    // ZeroDivision-Guard wie authored: mindestens ein retrieval_treffer.
    if (!faelle.some((row) => row[1])) faelle[randInt(r, 0, n - 1)][1] = true;
    const faelleLit = `[${faelle.map((row) => `(${pyLit(row[0])}, ${pyLit(row[1])}, ${pyLit(row[2])})`).join(', ')}]`;
    const snippet = `faelle = ${faelleLit}
treffer = [f for f in faelle if f[1]]
korrekt = [f for f in treffer if f[2]]
print(len(treffer))
print(round(len(korrekt) / len(treffer), 3))
print(round(len(korrekt) / len(faelle), 3))`;
    const { output } = ledgerRatesExpected({ faelle });
    return {
      parameters: { snippet, faelle },
      expected: { kind: 'output-lines', output },
      prompt: 'Code lesen und vorhersagen: Was gibt dieses Programm aus? Sage alle <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Die Tupel sind (kennung, retrieval_treffer, antwort_korrekt).',
      fullSolution: `treffer = Anzahl mit <code>True</code> an Position 1, korrekt = Schnittmenge. Ausgabe: <code>${output.replaceAll('\n', '</code> / <code>')}</code>.`,
      activityType: 'predict-output',
      graderId: 'deterministic',
    };
  });
}

const SUBGROUP_NAME_POOL = ['versand', 'recht', 'rabatt', 'garantie', 'nord', 'sued', 'ost', 'west', 'alpha', 'beta', 'g1', 'g2', 'g3', 'k', 'm', 'n', 'p', 'v', 'r', 'x', 'y', 'z', 'a', 'b'];

// Subgruppen-Spiegel: recall = getroffen/gesamt (gesamt >= 1 wie authored),
// Zeile 1 zwei gezogene Gruppen, Zeile 2 Mittel * 100 gerundet auf 1 Stelle.
export const subgroupRecallExpected = ({ gruppen, printPair }) => {
  const werte = Object.fromEntries(Object.entries(gruppen).map(([name, [g, t]]) => [name, g ? t / g : 0.0]));
  const mean = 100 * Object.values(werte).reduce((sum, v) => sum + v, 0) / Object.keys(werte).length;
  return {
    output: `${pyFloatText(werte[printPair[0]])} ${pyFloatText(werte[printPair[1]])}\n${pyFloatText(pyRound(mean, 1))}`,
  };
};

export function genSubgroupRecallOutput(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const count = randInt(r, 2, 4);
    const pool = [...SUBGROUP_NAME_POOL];
    const gruppen = {};
    for (let i = 0; i < count; i += 1) {
      const name = pool.splice(randInt(r, 0, pool.length - 1), 1)[0];
      const gesamt = randInt(r, 1, 10);
      gruppen[name] = [gesamt, randInt(r, 0, gesamt)];
    }
    const names = Object.keys(gruppen);
    const first = randInt(r, 0, count - 1);
    let second = randInt(r, 0, count - 2);
    if (second >= first) second += 1;
    const printPair = [names[first], names[second]];
    const entries = names.map((name) => `    ${pyLit(name)}: (${gruppen[name][0]}, ${gruppen[name][1]}),`).join('\n');
    const snippet = `def recall(gesamt, getroffen):
    if not gesamt:
        return 0.0
    return getroffen / gesamt

gruppen = {
${entries}
}
werte = {name: recall(g, t) for name, (g, t) in gruppen.items()}
print(werte[${pyLit(printPair[0])}], werte[${pyLit(printPair[1])}])
print(round(100 * sum(werte.values()) / len(werte), 1))`;
    const { output } = subgroupRecallExpected({ gruppen, printPair });
    return {
      parameters: { snippet, gruppen, printPair },
      expected: { kind: 'output-lines', output },
      prompt: 'Subgruppen-Recall von Hand ausführen: Was gibt dieses Programm aus? Sage beide <code>print</code>-Zeilen vorher, ohne den Code auszuführen. gruppen enthält je Subgruppe (gesamt, getroffen).',
      fullSolution: `recall je Gruppe, dann das gerundete Mittel in Prozent. Ausgabe: <code>${output.replaceAll('\n', '</code> / <code>')}</code>.`,
      activityType: 'predict-output',
      graderId: 'deterministic',
    };
  });
}

// python-code: compare_systems-Shard — authored Base-Tests bleiben Prefix,
// generierte Fälle prüfen gegen die __ref_-Orakelkopie des Referenzsolvers.
export function genCompareSystemsTests(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const caseCount = randInt(r, 2, 3);
    const seedCases = [];
    for (let i = 0; i < caseCount; i += 1) {
      const len = randInt(r, 3, 8);
      const rows = Array.from({ length: len }, () => [r() < 0.55, r() < 0.55]);
      // Arm 'baseline null' kommt authored vor — gelegentlich erzwingen.
      if (r() < 0.25) rows.forEach((row) => { row[0] = false; });
      seedCases.push(rows);
    }
    const lines = seedCases.map((rows, i) => (
      `__check('seeded ${i + 1}', compare_systems(${pyLit(rows)}) == __ref_compare_systems(${pyLit(rows)}))`
    ));
    const body = ratioBody('compare-systems-metric');
    const tests = seededPyBlock(body, ['compare_systems'], lines);
    return pyodideInstance(body, { seedCases }, tests, `${caseCount} Vergleichstabellen mit ${seedCases.map((rows) => rows.length).join('/')} Zeilen.`);
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
export const SIGMOID_CAPSULES = sigmoidBank.capsules;

/** Ein Template je Fallart: options[0] ist korrekt, Texte wörtlich aus den
 *  kuratierten Varianten (large-z/threshold) bzw. aus deren
 *  Distraktor-Bauart (log-odds: Log-Falle, Invers-Odds, Invertierung). */
export const sigmoidOptions = (parameters, capsule) => {
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

export const sigmoidPrompt = (parameters, capsule) => {
  if (capsule.kind === 'log-odds') return `Was bedeutet ein Logit von $z=\\log(${fmtDe(parameters.odds)})$ in einem korrekt spezifizierten logistischen Modell?`;
  if (capsule.kind === 'threshold') return `Ein logistisches Modell liefert den Logit $z=${fmtDe(parameters.z)}$. Welche Aussage über Ausgabe und Schwelle 0,5 stimmt?`;
  return `Für den Logit $z=${fmtDe(parameters.z)}$ gilt $\\sigma(z)=1/(1+e^{-z})$. Welche Aussage ist korrekt?`;
};

export const sigmoidSolution = (parameters, capsule) => {
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
export function sigmoidShapeOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  if (capsule.kind === 'log-odds') {
    if (!capsule.oddsBank.includes(parameters.odds)) return false;
    return Math.abs(parameters.logit - Math.log(parameters.odds)) <= 1e-6;
  }
  if (!capsule.zBank.includes(parameters.z)) return false;
  if (Math.abs(parameters.sigmoid - sigmoidValue(parameters.z)) > 1e-6) return false;
  return capsule.kind === 'large-z' || parameters.threshold === 0.5;
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
export const BENCHMARK_CAPSULES = benchmarkBank.capsules;

/** Ein Template je Fallart: options[0] ist korrekt, Texte wörtlich aus den
 *  Bestandsvarianten (Gain mit Prozentpunkten plus Relativ-Prozent,
 *  Accuracy-Differenz mit absolut/relativ, Mehrheits-Baseline). */
export const benchmarkOptions = (parameters, capsule) => {
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

export const benchmarkPrompt = (parameters, capsule) => {
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

export const benchmarkSolution = (parameters, capsule) => {
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
export function benchmarkShapeOk(parameters, capsule) {
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
}

/** Zahlenbank-Sampler: Seed wählt Zahlenpaar bzw. Anteil; die until-Guards
 *  halten die Hundertstel-/Tausendstel-Deckung wie im Bestand. */
export function drawBenchmarkParameters(r, capsule) {
  if (capsule.kind === 'imbalanced-accuracy') {
    const negativeShare = pick(r, capsule.shareBank);
    return {
      negativeShare,
      positiveShare: Math.round((1 - negativeShare) * 100) / 100,
      accuracy: negativeShare,
    };
  }
  if (capsule.kind === 'absolute-relative') {
    const drawn = until(r, () => {
      const before100 = randInt(r, 25, 80);
      const gain100 = randInt(r, 6, 15);
      return { before100, after100: before100 + gain100 };
    }, (candidate) => candidate.after100 <= 90);
    return { before: drawn.before100 / 100, after: drawn.after100 / 100 };
  }
  const drawn = until(r, () => {
    const before1000 = randInt(r, 400, 910);
    const gain1000 = randInt(r, 40, 95);
    return { before1000, after1000: before1000 + gain1000 };
  }, (candidate) => candidate.after1000 <= 980);
  return { before: drawn.before1000 / 1000, after: drawn.after1000 / 1000 };
}

/** Zahlenbank-Sampler: Seed wählt den Bankwert; Kennzahlen werden 6-stellig
 *  nachgerechnet wie die kuratierten Orakel. */
export function drawSigmoidParameters(r, capsule) {
  if (capsule.kind === 'log-odds') {
    const odds = pick(r, capsule.oddsBank);
    return { odds, logit: Math.round(Math.log(odds) * 1e6) / 1e6 };
  }
  if (capsule.kind === 'threshold') {
    const z = pick(r, capsule.zBank);
    return { z, threshold: 0.5, sigmoid: Math.round(sigmoidValue(z) * 1e6) / 1e6 };
  }
  const z = pick(r, capsule.zBank);
  return { z, sigmoid: Math.round(sigmoidValue(z) * 1e6) / 1e6 };
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
export const LORA_CAPSULES = loraBank.capsules;

const fmtIntDe = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Ein Template je Fallart: options[0] ist korrekt, Texte woertlich aus den
 *  Bestandsvarianten (Kernidee mit Bruch, Parameterzahl mit Tausenderpunkt,
 *  Skalierung mit Differenz/Summe/Produkt als Distraktoren). */
export const loraOptions = (parameters, capsule) => {
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

export const loraPrompt = (parameters, capsule) => {
  if (capsule.kind === 'alpha-rank') return `Für eine LoRA-Schicht gelten Skalierungsparameter $\\alpha=${parameters.alpha}$ und Rang $r=${parameters.rank}$. Welcher Faktor multipliziert $BA$ in $\\Delta W=(\\alpha/r)BA$?`;
  if (capsule.kind === 'param-count') return `Eine lineare Schicht hat $d_{in}=${parameters.dIn}$, $d_{out}=${parameters.dOut}$ und LoRA-Rang $r=${parameters.rank}$. Wie viele trainierbare LoRA-Parameter ersetzt die volle Matrix?`;
  return `LoRA nutzt für eine Anpassung den Rang $r=${parameters.rank}$ und den Skalierungsparameter $\\alpha=${parameters.alpha}$. Was ist die Kernidee?`;
};

export const loraSolution = (parameters, capsule) => {
  if (capsule.kind === 'alpha-rank') return `Einsetzen ergibt $\\alpha/r=${parameters.alpha}/${parameters.rank}=${parameters.alpha / parameters.rank}$. Dieser Faktor multipliziert $BA$.`;
  if (capsule.kind === 'param-count') return `LoRA speichert Faktoren mit ${parameters.rank}·${parameters.dIn} und ${parameters.rank}·${parameters.dOut} Parametern. Summe: ${parameters.rank}(${parameters.dIn}+${parameters.dOut})=${parameters.rank * (parameters.dIn + parameters.dOut)}.`;
  return `LoRA friert $W$ ein und trainiert eine niedrig-rangige Korrektur $\\Delta W=(${parameters.alpha}/${parameters.rank})BA$. Dadurch bleiben die trainierbaren Matrizen klein.`;
};

/** Kapselform ueber den gespeicherten Parametern: Bereiche plus vier
 *  paarweise verschiedene Antworttexte; bei alpha-rank zusaetzlich
 *  Teilbarkeit (Skalierung ganzzahlig). */
export function loraShapeOk(parameters, capsule) {
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
}

/** Zahlen-Sampler: Seed waehlt die Parameter. Einzige Verengung: alpha-rank
 *  redraws um die degenerierte Klasse Antwort==Rang (Vorbild
 *  genConditionalCount: Antwort muss sich von jeder Promptzahl
 *  unterscheiden). Befund: 2/9 kuratierte Orakel plus der Base-Fall
 *  (16,4) haben Antwort==Rang — Bestand, keine Generator-Verstaerkung;
 *  die Kapselform laesst sie zu, der Sampler erzeugt sie nicht. */
export function drawLoraParameters(r, capsule) {
  if (capsule.kind === 'alpha-rank') {
    return until(r, () => {
      const rank = randInt(r, 2, 12);
      const scale = randInt(r, 2, 8);
      return { alpha: rank * scale, rank };
    }, (candidate) => candidate.alpha / candidate.rank !== candidate.rank
      && new Set(loraOptions(candidate, capsule)).size === 4);
  }
  if (capsule.kind === 'param-count') {
    return { dIn: 64 * randInt(r, 2, 32), dOut: 64 * randInt(r, 2, 32), rank: randInt(r, 2, 16) };
  }
  return { rank: randInt(r, 1, 16), alpha: randInt(r, 2, 64) };
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
export const MISSINGNESS_CAPSULES = missingnessBank.capsules;

/** Bankzeile zum Parameter-Slotwert (die Bank steht im Kapselobjekt). */
const missingnessEntry = (parameters, capsule) => (
  capsule.bank.find((item) => item[capsule.slot] === parameters[capsule.slot])
);

/** Ein Options-Template je Fallart: options[0] ist korrekt, Texte wörtlich
 *  aus den kuratierten Varianten (intro: je Szenario kuratiert) bzw. aus dem
 *  Bestands-Base-Fall (core/stretch: einheitliche Distraktor-Bauart). */
export const missingnessOptions = (parameters, capsule) => {
  const entry = missingnessEntry(parameters, capsule);
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

export const missingnessPrompt = (parameters, capsule) => missingnessEntry(parameters, capsule).prompt;

export const missingnessSolution = (parameters, capsule) => {
  const entry = missingnessEntry(parameters, capsule);
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
export function missingnessShapeOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  if (!missingnessEntry(parameters, capsule)) return false;
  return new Set(missingnessOptions(parameters, capsule)).size === 4;
}

/** Slot-Bank-Sampler: Seed wählt das Szenario; `thema` wandert in die
 *  Parameter, damit generate weiterhin {caseId, difficulty, thema, slot}
 *  in dieser Reihenfolge ausgibt. */
export function drawMissingnessParameters(r, capsule) {
  const entry = pick(r, capsule.bank);
  return { thema: capsule.thema, [capsule.slot]: entry[capsule.slot] };
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
export const CONFOUNDING_CAPSULES = confoundingBank.capsules;

/** Dezimalzahl im Prompt-LaTeX: 0.85 -> '0{,}85' (deutsches Komma). */
const fmtRDe = (value) => String(value).replace('.', '{,}');

/** Bankzeile zum Parameter-Slotwert (die Bank steht im Kapselobjekt). */
const confoundingEntry = (parameters, capsule) => (
  capsule.bank.find((item) => item[capsule.slot] === parameters[capsule.slot])
);

/** Ein Options-Template je Fallart: options[0] ist korrekt. Szenariobindende
 *  Distraktoren stehen wörtlich in der Bank; wiederkehrende Distraktoren sind
 *  Template-Konstanten (intro: Widerlegung plus Linearitäts-Claim mit r;
 *  stretch: Budget-Claim). */
export const confoundingOptions = (parameters, capsule) => {
  const entry = confoundingEntry(parameters, capsule);
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

export const confoundingPrompt = (parameters, capsule) => confoundingEntry(parameters, capsule).prompt;

export const confoundingSolution = (parameters, capsule) => confoundingEntry(parameters, capsule).loesung;

/** Kapselform: Slotwert aus der Szenario-Bank, passender r-Parameter und vier
 *  paarweise verschiedene Antworttexte. */
export function confoundingShapeOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  const entry = confoundingEntry(parameters, capsule);
  if (!entry || entry.r !== parameters.r) return false;
  return new Set(confoundingOptions(parameters, capsule)).size === 4;
}

/** Slot-Bank-Sampler: Seed wählt das Szenario samt r-Belegung. */
export function drawConfoundingParameters(r, capsule) {
  const entry = pick(r, capsule.bank);
  return { r: entry.r, confounder: entry.confounder };
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
export const TASK_TYPE_CAPSULES = taskTypeBank.capsules;

/** Bankzeile zum Szenario-Parameter (die Bank steht im Kapselobjekt). */
const taskTypeEntry = (parameters, capsule) => (
  capsule.bank.find((item) => item.scenario === parameters.scenario)
);

/** Vier Optionstexte je Szenario: options[0] ist korrekt. Schlüsseltext und
 *  Distraktoren sind szenariobindend und stehen wörtlich in der Bank
 *  (Vorbild classify-missingness). */
export const taskTypeOptions = (parameters, capsule) => {
  const entry = taskTypeEntry(parameters, capsule);
  return [entry.correct, ...entry.wrong];
};

export const taskTypePrompt = (parameters, capsule) => taskTypeEntry(parameters, capsule).prompt;

export const taskTypeSolution = (parameters, capsule) => taskTypeEntry(parameters, capsule).loesung;

/** Kapselform: Szenario und Zielwert aus der Bank plus vier paarweise
 *  verschiedene Antworttexte. */
export function taskTypeShapeOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  const entry = taskTypeEntry(parameters, capsule);
  if (!entry || entry.target !== parameters.target) return false;
  return new Set(taskTypeOptions(parameters, capsule)).size === 4;
}

/** Szenario-Bank-Sampler: Seed wählt Szenario samt Zielwert. */
export function drawTaskTypeParameters(r, capsule) {
  const entry = pick(r, capsule.bank);
  return { scenario: entry.scenario, target: entry.target };
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
export const ERROR_DRIFT_CAPSULES = errorDriftBank.capsules;

/** Bankzeile zum Parameter-Slotwert (die Bank steht im Kapselobjekt). */
const errorDriftEntry = (parameters, capsule) => (
  capsule.bank.find((item) => item[capsule.slot] === parameters[capsule.slot])
);

/** Ein Options-Template je Fallart: options[0] ist korrekt, der Schlüsseltext
 *  ist je Fall eine Konstante (wörtlich aus allen neun kuratierten Varianten);
 *  die szenariobindenden Distraktoren stehen wörtlich in der Bank. */
export const errorDriftOptions = (parameters, capsule) => {
  const entry = errorDriftEntry(parameters, capsule);
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

export const errorDriftPrompt = (parameters, capsule) => errorDriftEntry(parameters, capsule).prompt;

export const errorDriftSolution = (parameters, capsule) => errorDriftEntry(parameters, capsule).loesung;

/** Kapselform: Slotwert aus der Szenario-Bank, alle `params`-Felder stimmen
 *  mit der Bankzeile überein, vier paarweise verschiedene Antworttexte. */
export function errorDriftShapeOk(parameters, capsule) {
  if (!parameters || typeof parameters !== 'object') return false;
  const entry = errorDriftEntry(parameters, capsule);
  if (!entry) return false;
  for (const key of capsule.params) {
    if (parameters[key] !== entry[key]) return false;
  }
  return new Set(errorDriftOptions(parameters, capsule)).size === 4;
}

/** Szenario-Bank-Sampler: Seed wählt das Szenario; `params` spiegelt exakt
 *  die Parameter-Felder der Bankzeile. */
export function drawErrorDriftParameters(r, capsule) {
  const entry = pick(r, capsule.bank);
  return Object.fromEntries(capsule.params.map((key) => [key, entry[key]]));
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
export const SVM_MARGIN_CAPSULES = svmMarginBank.capsules;

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
export const svmMarginOptions = (parameters, capsule) => {
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

export const svmMarginPrompt = (parameters, capsule) => {
  if (capsule.kind === 'soft-margin-slack') {
    return `Eine Soft-Margin-SVM verwendet $C=${fmtDe(parameters.C)}$ und eine Slack-Variable $\\xi=${fmtDe(parameters.slack)}$. Was erlaubt diese Slack-Variable?`;
  }
  if (capsule.kind === 'support-boundary') {
    return `Für $w=(${parameters.w.join(',')})$, $b=${parameters.b}$ und den gelabelten Punkt $x=(${parameters.point.join(', ')})$, $y=${parameters.label}$: Welche Rolle haben Support Vectors in einer linearen SVM?`;
  }
  return `Eine Hard-Margin-SVM hat $w=(${parameters.w.join(',')})$ und $b=${parameters.b}$. Was beschreibt ihr geometrischer Margin?`;
};

export const svmMarginSolution = (parameters, capsule) => {
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
export function svmMarginShapeOk(parameters, capsule) {
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
}

/** Zahlenbank-Sampler: Seed wählt das Tupel; die Kennzahl wird aus dem Tupel
 *  gerechnet (marginWidth = 2/||w||, marginScore = y·(wᵀx+b), 6-stellig wie
 *  die Orakel). */
export function drawSvmMarginParameters(r, capsule) {
  const entry = pick(r, capsule.bank);
  if (capsule.kind === 'soft-margin-slack') {
    return { C: entry.C, slack: entry.slack };
  }
  if (capsule.kind === 'support-boundary') {
    return {
      w: entry.w,
      b: entry.b,
      point: entry.point,
      label: entry.label,
      marginScore: svmMarginScore(entry),
    };
  }
  return { w: entry.w, b: entry.b, marginWidth: Math.round((2 / svmNorm(entry.w)) * 1e6) / 1e6 };
}

// --- optimize-mse-gradient-closed-form: grad-mse-numpy-reference -------------
// Wie die Confusion-Shard-Fälle: authored Base-Testblock bleibt byte-identisch
// Prefix; der Seed zieht (x, y, w, b, t) und hängt ein `# seeded extra cases`-
// Paket mit __ref_-Orakelkopie des Referenzsolvers an. Die emittierten Checks
// decken alle authored Prüfungen ab — analytisches dw/db gegen das Orakel,
// num_grad-Konsistenz (Quadrat-Stichprobe + f_w/f_b) und den 0/0-Edge —
// jeweils gegen __ref_grad_mse, nie gegen hartkodierte Punkte.

const GRAD_MSE_VALUE_POOL = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const GRAD_MSE_W_POOL = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3];
const GRAD_MSE_B_POOL = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
// t = 0 ausgeschlossen: die Quadrat-Stichprobe 2*t wäre sonst degeneriert.
const GRAD_MSE_T_POOL = [-3, -2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const GRAD_MSE_FUNCTIONS = ['grad_mse', 'num_grad'];

const gradMseSeededTests = (body, fixture) => {
  const wLit = pyLit(fixture.w);
  const bLit = pyLit(fixture.b);
  const tLit = pyLit(fixture.t);
  return seededPyBlock(body, GRAD_MSE_FUNCTIONS, [
    `x = np.array(${pyLit(fixture.x)})`,
    `y = np.array(${pyLit(fixture.y)})`,
    `w, b = ${wLit}, ${bLit}`,
    'dw, db = grad_mse(w, b, x, y)',
    '__ref_dw, __ref_db = __ref_grad_mse(w, b, x, y)',
    `__check('seeded dw', abs(dw - __ref_dw) < 1e-9)`,
    `__check('seeded db', abs(db - __ref_db) < 1e-9)`,
    'f_w = lambda u: float(np.mean((u * x + b - y) ** 2))',
    'f_b = lambda u: float(np.mean((w * x + u - y) ** 2))',
    `__check('seeded numgrad w', abs(num_grad(f_w, w, 1e-6) - __ref_dw) < 1e-6)`,
    `__check('seeded numgrad b', abs(num_grad(f_b, b, 1e-6) - __ref_db) < 1e-6)`,
    `__check('seeded numgrad quadrat', abs(num_grad(lambda t: t * t, ${tLit}, 1e-6) - (2.0 * ${tLit})) < 1e-6)`,
    'dw2, db2 = grad_mse(0.0, 0.0, x, y)',
    '__rw2, __rb2 = __ref_grad_mse(0.0, 0.0, x, y)',
    `__check('seeded bei 0/0', abs(dw2 - __rw2) < 1e-9 and abs(db2 - __rb2) < 1e-9)`,
  ]);
};

const gradMseFixtureOk = (fixture) => (
  fixture && typeof fixture === 'object'
  && Array.isArray(fixture.x) && fixture.x.length >= 3 && fixture.x.length <= 4
  && fixture.x.every((v) => GRAD_MSE_VALUE_POOL.includes(v))
  && Array.isArray(fixture.y) && fixture.y.length === fixture.x.length
  && fixture.y.every((v) => GRAD_MSE_VALUE_POOL.includes(v))
  && GRAD_MSE_W_POOL.includes(fixture.w)
  && GRAD_MSE_B_POOL.includes(fixture.b)
  && GRAD_MSE_T_POOL.includes(fixture.t)
);

/** Kapsel-Check (Muster requiredPythonParamsOk): die gespeicherte Fixture muss
 *  den emittierten Testblock byte-identisch rekonstruieren — solve bleibt
 *  dadurch fail-closed gegen manipulierte Parameter. */
export function gradMseParamsOk(parameters) {
  try {
    const body = mseGradientBody('grad-mse-numpy-reference');
    return gradMseFixtureOk(parameters?.seedFixture)
      && parameters.tests === gradMseSeededTests(body, parameters.seedFixture)
      && parameters.starterCode === body.parameters.starterCode;
  } catch { return false; }
}

export function genGradMseNumpyTests(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const fixture = until(r, () => {
      const n = randInt(r, 3, 4);
      const x = Array.from({ length: n }, () => pick(r, GRAD_MSE_VALUE_POOL));
      const y = Array.from({ length: n }, () => pick(r, GRAD_MSE_VALUE_POOL));
      return { x, y, w: pick(r, GRAD_MSE_W_POOL), b: pick(r, GRAD_MSE_B_POOL), t: pick(r, GRAD_MSE_T_POOL) };
    }, (drawn) => drawn.y.some((v) => v !== 0)
      && drawn.x.some((xi, i) => Math.abs(drawn.w * xi + drawn.b - drawn.y[i]) > 1e-9));
    const body = mseGradientBody('grad-mse-numpy-reference');
    const tests = gradMseSeededTests(body, fixture);
    const note = `Wertepaare x = [${fixture.x.join(', ')}], y = [${fixture.y.join(', ')}]; Ableitung geprüft bei w = ${fixture.w}, b = ${fixture.b}, num_grad-Stichprobe bei t = ${fixture.t}.`;
    return pyodideInstance(body, { seedFixture: fixture }, tests, note);
  });
}

// --- validate-goalshift-flag-rules: detect-goal-shift ------------------------
// Fünf deterministisch gezogene Protokollpaare pro Instanz; jede Instanz
// enthält alle fünf Edge-Arme in per-Seed rotierter Reihenfolge (kein
// Zufalls-Hoffen): identische Kopie, fehlende Felder (`.get`-Semantik),
// entfernte Subgruppe ohne Flag, demotivierter Primärendpunkt ohne Wechsel
// von v2.primaer sowie normale Multi-Flag-Paare. Der authored Capstone-Draw
// genProtocolShifts bleibt unangetastet — er ist positiv-only und kann die
// negativen Arme nicht erzeugen.

const GOALSHIFT_METRICS = ['recall@5', 'token-f1', 'f1', 'accuracy', 'precision@3', 'mrr', 'antwortquote'];
const GOALSHIFT_SCHWELLEN = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 2];
const GOALSHIFT_ENDPOINTS = ['antwortquote', 'bearbeitungszeit', 'zitattreue', 'latenz', 'kostenquote', 'deckung'];
const GOALSHIFT_SUBGRUPPEN = ['neukunden', 'mobil', 'wochenende', 'bestand', 'nord', 'sued', 'nacht', 'wochentag', 'kleinstadt'];
export const GOALSHIFT_ARMS = ['identisch', 'fehlende-felder', 'subgruppe-entfernt', 'primaer-demoted', 'multi-flag'];
const GOALSHIFT_FIELDS = new Set(['metrik', 'schwelle', 'primaer', 'sekundaer', 'subgruppen']);
const GOALSHIFT_ARM_NOTES = {
  identisch: 'identische Kopie',
  'fehlende-felder': 'fehlende Felder',
  'subgruppe-entfernt': 'Subgruppe entfernt',
  'primaer-demoted': 'primärer Endpunkt nur in v2.sekundaer',
  'multi-flag': 'geänderte Felder',
};

/** JS-Spiegel des authored detect_goal_shift (Orakel-Wahrheit für Draw-Guards
 *  und Tests — fehlende Felder gelten wie im Referenzsolver als leer). */
export const goalShiftFlags = (v1, v2) => {
  const flags = [];
  if (v1?.metrik !== v2?.metrik) flags.push('metrik_geaendert');
  if (v1?.schwelle !== v2?.schwelle) flags.push('schwelle_geaendert');
  if ((v2?.sekundaer ?? []).includes(v1?.primaer)) flags.push('primaer_demoted');
  if ((v2?.subgruppen ?? []).some((s) => !(v1?.subgruppen ?? []).includes(s))) flags.push('subgruppe_nach_freeze');
  return flags.sort();
};

const windowPick = (r, pool, count) => {
  const offset = randInt(r, 0, pool.length - 1);
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(offset + i) % pool.length]);
};

const goalShiftBase = (r, { minSubgroups = 1 } = {}) => {
  const primaer = pick(r, GOALSHIFT_ENDPOINTS);
  const sekundaer = windowPick(r, GOALSHIFT_ENDPOINTS.filter((e) => e !== primaer), randInt(r, 1, 2));
  const subgruppen = windowPick(r, GOALSHIFT_SUBGRUPPEN, randInt(r, minSubgroups, 3));
  return {
    metrik: pick(r, GOALSHIFT_METRICS),
    schwelle: pick(r, GOALSHIFT_SCHWELLEN),
    primaer,
    sekundaer,
    subgruppen,
  };
};

const goalShiftCopy = (v) => ({
  ...v,
  ...(Array.isArray(v.sekundaer) ? { sekundaer: [...v.sekundaer] } : {}),
  ...(Array.isArray(v.subgruppen) ? { subgruppen: [...v.subgruppen] } : {}),
});

const goalShiftDraw = (r, arm) => {
  if (arm === 'identisch') {
    const v1 = goalShiftBase(r);
    return { arm, v1, v2: goalShiftCopy(v1) };
  }
  if (arm === 'subgruppe-entfernt') {
    const v1 = goalShiftBase(r, { minSubgroups: 2 });
    const v2 = goalShiftCopy(v1);
    v2.subgruppen.splice(randInt(r, 0, v2.subgruppen.length - 1), 1);
    return { arm, v1, v2 };
  }
  if (arm === 'primaer-demoted') {
    const v1 = goalShiftBase(r);
    const v2 = goalShiftCopy(v1);
    v2.sekundaer = [...v1.sekundaer, v1.primaer];
    return { arm, v1, v2 };
  }
  if (arm === 'fehlende-felder') {
    const shape = randInt(r, 0, 3);
    if (shape === 0) return { arm, shape, v1: {}, v2: { metrik: pick(r, GOALSHIFT_METRICS) } };
    if (shape === 1) {
      const metrik = pick(r, GOALSHIFT_METRICS);
      return {
        arm,
        shape,
        v1: { metrik, schwelle: pick(r, GOALSHIFT_SCHWELLEN) },
        v2: { metrik: pick(r, GOALSHIFT_METRICS.filter((m) => m !== metrik)) },
      };
    }
    if (shape === 2) {
      const primaer = pick(r, GOALSHIFT_ENDPOINTS);
      return {
        arm,
        shape,
        v1: { primaer },
        v2: { primaer, sekundaer: [pick(r, GOALSHIFT_ENDPOINTS.filter((e) => e !== primaer)), primaer] },
      };
    }
    const metrik = pick(r, GOALSHIFT_METRICS);
    return { arm, shape, v1: { metrik }, v2: { metrik, subgruppen: [pick(r, GOALSHIFT_SUBGRUPPEN)] } };
  }
  // multi-flag: 1-4 der authored Mutationen wie in den Bestandsvarianten.
  const v1 = goalShiftBase(r);
  const v2 = goalShiftCopy(v1);
  const mutationen = shuffle(r, [0, 1, 2, 3]).slice(0, randInt(r, 1, 4));
  if (mutationen.includes(0)) {
    v2.metrik = pick(r, GOALSHIFT_METRICS.filter((m) => m !== v1.metrik));
  }
  if (mutationen.includes(1)) {
    v2.schwelle = pick(r, GOALSHIFT_SCHWELLEN.filter((s) => s !== v1.schwelle));
  }
  if (mutationen.includes(2)) {
    const neu = pick(r, GOALSHIFT_ENDPOINTS.filter((e) => e !== v1.primaer && !v1.sekundaer.includes(e)));
    v2.sekundaer = [v1.primaer, ...v1.sekundaer.filter((e) => e !== neu)];
    v2.primaer = neu;
  }
  if (mutationen.includes(3)) {
    v2.subgruppen = [...v1.subgruppen, pick(r, GOALSHIFT_SUBGRUPPEN.filter((s) => !v1.subgruppen.includes(s)))];
  }
  return { arm, v1, v2 };
};

const goalShiftSeededTests = (body, pairs) => seededPyBlock(
  body,
  ['detect_goal_shift'],
  pairs.flatMap((pair, i) => {
    const a = pyLit(pair.v1);
    const b = pyLit(pair.v2);
    return [
      `__check('seeded flags ${i + 1}', detect_goal_shift(${a}, ${b}) == __ref_detect_goal_shift(${a}, ${b}))`,
      `__check('seeded copy ${i + 1}', detect_goal_shift(${a}, dict(${a})) == __ref_detect_goal_shift(${a}, dict(${a})))`,
    ];
  }),
);

const goalShiftVersionOk = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  for (const [key, value] of Object.entries(v)) {
    if (!GOALSHIFT_FIELDS.has(key)) return false;
    if (key === 'metrik' && !GOALSHIFT_METRICS.includes(value)) return false;
    if (key === 'schwelle' && !GOALSHIFT_SCHWELLEN.includes(value)) return false;
    if (key === 'primaer' && !GOALSHIFT_ENDPOINTS.includes(value)) return false;
    if (key === 'sekundaer' && (!Array.isArray(value) || value.length > 3 || !value.every((s) => GOALSHIFT_ENDPOINTS.includes(s)))) return false;
    if (key === 'subgruppen' && (!Array.isArray(value) || value.length > 4 || !value.every((s) => GOALSHIFT_SUBGRUPPEN.includes(s)))) return false;
  }
  return true;
};

/** Kapsel-Check: die gespeicherten Paare müssen den emittierten Testblock
 *  byte-identisch rekonstruieren — solve bleibt fail-closed. */
export function goalShiftParamsOk(parameters) {
  try {
    const body = goalShiftBody('detect-goal-shift');
    const pairs = parameters?.seedPairs;
    return Array.isArray(pairs) && pairs.length === GOALSHIFT_ARMS.length
      && new Set(pairs.map((pair) => pair?.arm)).size === GOALSHIFT_ARMS.length
      && pairs.every((pair) => GOALSHIFT_ARMS.includes(pair.arm)
        && (pair.arm !== 'fehlende-felder' || Number.isInteger(pair.shape))
        && goalShiftVersionOk(pair.v1) && goalShiftVersionOk(pair.v2))
      && parameters.tests === goalShiftSeededTests(body, pairs)
      && parameters.starterCode === body.parameters.starterCode;
  } catch { return false; }
}

export function genDetectGoalShiftTests(seed) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const random = rng(seed);
  return clean(random, (r) => {
    const rotation = variantCaseIndex(seed, GOALSHIFT_ARMS.length);
    const pairs = GOALSHIFT_ARMS.map((_, index) => goalShiftDraw(r, GOALSHIFT_ARMS[(index + rotation) % GOALSHIFT_ARMS.length]));
    const body = goalShiftBody('detect-goal-shift');
    const tests = goalShiftSeededTests(body, pairs);
    const note = `${pairs.length} Protokollpaare: ${pairs.map((pair) => GOALSHIFT_ARM_NOTES[pair.arm]).join('; ')}.`;
    return pyodideInstance(
      { ...body, prompt: body.prompt.replace('drei Protokollpaarungen', `${pairs.length} Protokollpaarungen`) },
      { seedPairs: pairs },
      tests,
      note,
    );
  });
}
