// Seeded generators for the deep-learning core, ADR-0013.
// House rules mirror the foundations, linalg, and data-ML generators: mulberry32 rng, exact
// integer expected values (the numeric grader is integer-exact; floats are
// graded through python-code tasks), wide answer spaces (>= 20 distinct
// expected values over 2000 seeds, enforced by the deep-learning generator tests,
// semantic variation (>= 3 prompt shapes per family), the answer
// never appears as a standalone number in the prompt (bounded redraw guard),
// and full solutions always contain the answer.

import { bindFamilyDraw, pick, randInt, rng } from './generator_draw_kit.mjs';

const { until, clean } = bindFamilyDraw({ maxTries: 96, scope: 'deep_learning_generators' });

function fmtSigned(value) {
  return value >= 0 ? `${value}` : `−${Math.abs(value)}`;
}

// --- W18: tensor shapes and parameter counts -------------------------------------

export function genLinearParamCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['single', 'mlp', 'compare']);
    if (variant === 'single') {
      const d = randInt(r, 3, 12);
      const h = randInt(r, 4, 16);
      const weights = d * h;
      const answer = weights + h;
      return {
        parameters: { variant, d, h },
        expected: answer,
        prompt: `Ein lineares Layer projiziert ${d} Eingabefeatures auf ${h} Ausgabeneuronen und hat ein Bias-Gewicht pro Ausgabeneuron. Wie viele trainierbare Parameter hat das Layer insgesamt (Gewichtsmatrix plus Bias)?`,
        fullSolution: `Die Gewichtsmatrix W hat ${d} · ${h} = ${weights} Einträge, der Bias-Vektor ${h} Einträge. Parameter: ${weights} + ${h} = ${answer}.`,
      };
    }
    if (variant === 'mlp') {
      const d = randInt(r, 3, 10);
      const h1 = randInt(r, 4, 14);
      const h2 = randInt(r, 3, 12);
      const p1 = d * h1 + h1;
      const p2 = h1 * h2 + h2;
      const answer = p1 + p2;
      return {
        parameters: { variant, d, h1, h2 },
        expected: answer,
        prompt: `Ein 2-Layer-MLP für Regression hat die Schichten ${d} → ${h1} → ${h2}. Jede Schicht ist ein lineares Layer mit eigenem Bias-Vektor, dazwischen liegt ReLU. Wie viele trainierbare Parameter hat das Netz insgesamt?`,
        fullSolution: `Schicht 1: ${d} · ${h1} + ${h1} = ${p1} Parameter. Schicht 2: ${h1} · ${h2} + ${h2} = ${p2} Parameter. Insgesamt: ${p1} + ${p2} = ${answer}.`,
      };
    }
    const d = randInt(r, 4, 10);
    const out = randInt(r, 2, 5);
    const hNarrow = randInt(r, 3, 8);
    const hWide = until(r, (rr) => randInt(rr, hNarrow + 1, hNarrow + 7), (v) => v > hNarrow);
    const params = (h) => d * h + h + h * out + out;
    const answer = params(hWide) - params(hNarrow);
    return {
      parameters: { variant, d, out, hNarrow, hWide },
      expected: answer,
      prompt: `Zwei MLPs mit je einer versteckten Schicht unterscheiden sich nur in deren Breite: Netz A hat ${hNarrow}, Netz B ${hWide} versteckte Neuronen. Beide lesen ${d} Features, geben ${out} Ausgaben aus und tragen überall Bias. Wie viele zusätzliche trainierbare Parameter hat Netz B gegenüber Netz A?`,
      fullSolution: `Parameter eines Netzes mit versteckter Breite h: ${d}·h + h + h·${out} + ${out}. Die Differenz ist (${hWide} − ${hNarrow}) · (${d} + 1 + ${out}) = ${hWide - hNarrow} · ${d + 1 + out} = ${answer}.`,
    };
  });
}

// --- W19: chain rule products in integers ------------------------------------------

export function genBackpropChain(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['path', 'repeat', 'fork']);
    if (variant === 'path') {
      const k = randInt(r, 2, 4);
      // local gradients are nonzero integers; a zero would kill the chain.
      // Redraw while the product equals any shown factor (e.g. 1 · −2 · 1),
      // otherwise the prompt would display the answer as data.
      const locals = until(r,
        (rr) => Array.from({ length: k }, () => pick(rr, [-3, -2, -1, 1, 2, 3])),
        (draw) => {
          const product = draw.reduce((acc, g) => acc * g, 1);
          return draw.every((g) => g !== product) && Math.abs(product) <= 24;
        });
      const product = locals.reduce((acc, g) => acc * g, 1);
      const answer = product;
      return {
        parameters: { variant, locals },
        expected: answer,
        prompt: `Ein Rechengraph verbindet den Eingang x über ${k} Operationen mit dem Verlust L. Die lokalen Gradienten entlang des Pfades sind ${locals.map(fmtSigned).join(', ')}, der Upstream-Gradient am Ausgang ist 1. Wie groß ist ∂L/∂x?`,
        fullSolution: `Kettenregel: ∂L/∂x = Produkt der lokalen Gradienten = ${locals.map(fmtSigned).join(' · ')} = ${answer}.`,
      };
    }
    if (variant === 'repeat') {
      const a = pick(r, [2, 3, 4, -2, -3]);
      const n = randInt(r, 3, 6);
      const answer = a ** n;
      return {
        parameters: { variant, a, n },
        expected: answer,
        prompt: `Ein Rechengraph verkettet ${n} identische Knoten, jeder mit lokalem Gradienten ${fmtSigned(a)} bzgl. seines Eingangs; der Upstream-Gradient am Ausgang ist 1. Wie groß ist der Gradient des Verlusts bzgl. des Eingangs?`,
        fullSolution: `Kettenregel über ${n} gleiche Faktoren: (${fmtSigned(a)})^${n} = ${answer}.`,
      };
    }
    const draw = (rr) => [
      [pick(rr, [-3, -2, -1, 1, 2, 3]), pick(rr, [-3, -2, -1, 1, 2, 3])],
      [pick(rr, [-3, -2, -1, 1, 2, 3]), pick(rr, [-3, -2, -1, 1, 2, 3])],
    ];
    const [[p1, p2], [q1, q2]] = until(r, draw,
      ([[a1, a2], [b1, b2]]) => a1 * a2 + b1 * b2 !== 0);
    const answer = p1 * p2 + q1 * q2;
    return {
      parameters: { variant, branchA: [p1, p2], branchB: [q1, q2] },
      expected: answer,
      prompt: `Der Verlust L hängt über zwei Zweige vom Eingang x ab. Zweig A hat die lokalen Gradienten ${fmtSigned(p1)} und ${fmtSigned(p2)}, Zweig B die lokalen Gradienten ${fmtSigned(q1)} und ${fmtSigned(q2)}; beide Zweige gehen additiv in L ein. Wie groß ist ∂L/∂x?`,
      fullSolution: `Beiträge der Zweige: ${fmtSigned(p1)} · ${fmtSigned(p2)} = ${fmtSigned(p1 * p2)} und ${fmtSigned(q1)} · ${fmtSigned(q2)} = ${fmtSigned(q1 * q2)}. Summe: ${fmtSigned(p1 * p2)} + (${fmtSigned(q1 * q2)}) = ${answer}.`,
    };
  });
}

// --- W20: SGD steps, epochs and momentum in integers -------------------------------

export function genSgdSteps(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['plain', 'epochs', 'until', 'momentum']);
    if (variant === 'plain') {
      const lr = pick(r, [0.1, 0.2, 0.25, 0.5]);
      const step = randInt(r, 2, 6);
      const grad = step / lr;
      const w0 = randInt(r, 30, 120);
      const n = randInt(r, 3, 12);
      const descending = r() < 0.5;
      const answer = descending ? w0 - n * step : w0 + n * step;
      const gradText = `${Number.isInteger(grad) ? grad : grad.toString().replace('.', ',')}`;
      return {
        parameters: { variant, lr, step, grad, w0, n, descending },
        expected: answer,
        prompt: `Ein Parameter startet bei w = ${w0} und wird mit reinem SGD aktualisiert. Der Gradient bleibt über alle Schritte konstant ${descending ? '' : '−'}${gradText}, die Lernrate ist lr = ${lr.toString().replace('.', ',')}. Auf welchen ganzzahligen Wert wandert w nach ${n} Updates?`,
        fullSolution: `Schrittweite: lr · Gradient = ${lr.toString().replace('.', ',')} · ${descending ? '' : '−'}${gradText} = ${descending ? '' : '−'}${step}. Nach ${n} Updates: w = ${w0} ${descending ? '−' : '+'} ${n} · ${step} = ${answer}.`,
      };
    }
    if (variant === 'epochs') {
      const n = randInt(r, 60, 300);
      const batch = pick(r, [16, 24, 32, 40, 48, 64]);
      const epochs = randInt(r, 2, 7);
      const perEpoch = Math.ceil(n / batch);
      const answer = epochs * perEpoch;
      return {
        parameters: { variant, n, batch, epochs },
        expected: answer,
        prompt: `Ein Datensatz mit ${n} Beispielen wird mit Batchgröße ${batch} trainiert; der letzte Batch einer Epoche darf kleiner sein. Wie viele Optimizer-Updates enthält das Training insgesamt über ${epochs} Epochen?`,
        fullSolution: `Batches pro Epoche: aufrunden(${n}/${batch}) = ${perEpoch}. Updates insgesamt: ${epochs} · ${perEpoch} = ${answer}.`,
      };
    }
    if (variant === 'until') {
      const w0 = randInt(r, 40, 200);
      const step = randInt(r, 2, 8);
      const target = randInt(r, 5, 35);
      const answer = Math.ceil((w0 - target) / step);
      return {
        parameters: { variant, w0, step, target },
        expected: answer,
        prompt: `Ein Parameter startet bei w = ${w0}. Jedes SGD-Update senkt w um genau ${step} (konstanter Gradient, feste Lernrate). Nach wie vielen Updates erreicht oder unterschreitet w erstmals den Schwellwert ${target}?`,
        fullSolution: `Gesuchter Abstand: ${w0} − ${target} = ${w0 - target}. Aufrunden auf ganze Schritte: aufrunden(${w0 - target}/${step}) = ${answer} Updates.`,
      };
    }
    const n = randInt(r, 3, 5);
    // g is constructed divisible by 2^(n-1) so the velocity stays an integer
    const g = randInt(r, 4, 12) * 2 ** (n - 1);
    const answer = 2 * g - g / 2 ** (n - 1);
    return {
      parameters: { variant, n, g },
      expected: answer,
      prompt: `SGD mit Momentum: die Geschwindigkeit startet bei v = 0, der Gradient bleibt konstant ${g} und das Momentum ist m = 0,5 (Update v ← m · v + Gradient). Wie groß ist v nach ${n} Schritten?`,
      fullSolution: `v ist geometrische Summe: v = ${g} · (1 + 0,5 + … + 0,5^${n - 1}) = ${g} · (2 − 0,5^${n - 1}) = 2 · ${g} − ${g / 2 ** (n - 1)} = ${answer}.`,
    };
  });
}

// --- W21: dropout masks with fixed seeds -------------------------------------------

export function genDropoutCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['kept', 'dropped', 'both']);
    const p = pick(r, [0.5, 0.6, 0.7, 0.75, 0.8]);
    const n = randInt(r, 12, 40);
    const drawMask = (rr) => Array.from({ length: n }, () => (rr() < p ? 1 : 0));
    const mask1 = until(r, drawMask, (m) => m.filter(Boolean).length >= 3 && m.filter((v) => !v).length >= 3);
    if (variant === 'kept' || variant === 'dropped') {
      const kept = mask1.filter(Boolean).length;
      const answer = variant === 'kept' ? kept : n - kept;
      return {
        parameters: { variant, n, p, mask: mask1 },
        expected: answer,
        prompt: `Ein Dropout-Layer mit Behaltenswahrscheinlichkeit p = ${p.toString().replace('.', ',')} erhält ${n} Aktivierungen und legt diese feste, per Seed gezogene Maske an (1 = behalten, 0 = droppen): \`${mask1.join('')}\`. ${variant === 'kept' ? 'Wie viele Aktivierungen bleiben nach dem Dropout-Schritt erhalten?' : 'Wie viele Aktivierungen werden von der Maske gedroppt?'}`,
        fullSolution: variant === 'kept'
          ? `Einsen in der Maske zählen: ${kept} von ${n} Aktivierungen bleiben erhalten (Skalierung 1/p = ${p.toString().replace('.', ',')} ändert die Anzahl nicht).`
          : `Nullen in der Maske zählen: ${n} − ${kept} = ${answer} Aktivierungen werden gedroppt.`,
      };
    }
    const mask2 = until(r, drawMask, (m) => {
      const kept = m.filter(Boolean).length;
      return kept >= 3 && n - kept >= 3;
    });
    const both = mask1.reduce((acc, v, i) => acc + (v && mask2[i] ? 1 : 0), 0);
    return {
      parameters: { variant, n, p, mask1, mask2 },
      expected: both,
      prompt: `Zwei aufeinanderfolgende Dropout-Schichten mit Behaltenswahrscheinlichkeit p = ${p.toString().replace('.', ',')} arbeiten auf ${n} Aktivierungen mit unabhängigen, festen Masken (1 = behalten, 0 = droppen). Maske 1: \`${mask1.join('')}\`. Maske 2: \`${mask2.join('')}\`. Wie viele Aktivierungen überleben beide Schichten?`,
      fullSolution: `Positionszählig UND der Masken: an ${both} von ${n} Positionen steht in beiden Masken eine 1 — so viele Aktivierungen überleben beide Schichten.`,
    };
  });
}
