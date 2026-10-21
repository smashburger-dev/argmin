import { fixedScene, heading, footer, label, rect, line, approx } from '../objects/f2-grid.mjs';
import { attention, softmax } from '../objects/f2-models.mjs';

export const viewMode = 'flat';
export const captions = [
  'Query und Keys des Handbeispiels liefern skalierte Scores. Die Buchnummer hält Key und Value zusammen.',
  'Softmax verteilt die Leseanteile. Die Balken verwenden dieselbe Skala; angezeigte Dezimalwerte sind Näherungen.',
  'Die Values werden mit diesen Anteilen gemischt. Es entsteht eine gewichtete Summe, kein ausgewähltes Buch.',
  'Kausal darf die erste Query das zweite Buch nicht lesen. Seine Gewichtung ist exakt null, nicht nur klein.',
  'Übertragung auf die drei Logits des alten Checkpoints: zunächst ohne Maske und ohne Top-k, bei Temperatur eins.',
  'Die niedrigere Temperatur verschärft die Verteilung. Die Scores werden vor Softmax durch T geteilt.',
  'Top-k behält die beiden größten Logits und normiert neu. Der gesuchte Anteil bleibt bis zum nächsten Schritt verdeckt.',
  'Die verbleibenden Anteile summieren sich wieder zu eins. Der gerundete Wert ist keine exakte Wahrscheinlichkeit.',
];
function compute() {
  const q = [[1, 1, 0, 0], [0, 0, 1, 1]], k = q.map((row) => [...row]), v = [[2, 0], [0, 2]];
  const unmasked = attention(q, k, v), causal = attention(q, k, v, [[true, false], [true, true]]);
  const logits = [2, 1, 0], temperature = 0.5, topK = 2;
  return { q, k, v, dk: q[0].length, unmasked, causal, logits, temperature, topK,
    warm: softmax(logits), cold: softmax(logits, temperature), filtered: softmax(logits, temperature, [true, true, true], topK) };
}
function bars(scores, weights, { title, note, hidden = false, masked = [] }) {
  return [heading(title), label('key-label', 12.5, 23, 'Key'), label('score-label', 35, 23, 'Score'), label('weight-label', 73, 23, 'Anteil'),
    ...scores.flatMap((score, i) => {
      const y = 31 + i * 19, off = masked.includes(i);
      return [rect(`book-${i}`, 6, y - 4, 13, 13, off ? 'hi' : 'lit'), label(`key-${i}`, 12.5, y + 4, i + 1),
        label(`score-${i}`, 35, y + 4, off ? '−∞' : score),
        label(`weight-${i}`, 73, y + 4, hidden ? '?' : approx(weights[i])),
        line(`track-${i}`, [51, y + 10], [94, y + 10]),
        { ...line(`bar-${i}`, [51, y + 10], [51 + 43 * weights[i], y + 10], 'lit', 1.5), visible: !hidden && weights[i] > 0 }];
    }), footer(note)];
}
function mixing(m, causal) {
  const result = causal ? m.causal : m.unmasked;
  const w = result.weights[0], out = result.output[0];
  return [heading(causal ? 'Zukunft gesperrt' : 'Values mischen'),
    label('v1', 50, 29, `V₁ = (${m.v[0].join(', ')})`), label('w1', 50, 41, causal ? 'Anteil: 1' : `Anteil ${approx(w[0])}`, 'lit'),
    label('v2', 50, 59, `V₂ = (${m.v[1].join(', ')})`), label('w2', 50, 71, causal ? 'Anteil: 0 · gesperrt' : `Anteil ${approx(w[1])}`),
    footer(causal ? 'Ausgabe = (2, 0)' : `Ausgabe ≈ (${out.map((x) => x.toFixed(3).replace('.', ',')).join('; ')})`)];
}
const scene = fixedScene({ id: 'library-attention', captions, compute,
  frames: (m) => [
    [heading('Query 1 trifft Keys'), label('q', 50, 24, `Q₁ = (${m.q[0].join(', ')})`),
      label('k1', 50, 43, `K₁ = (${m.k[0].join(', ')})`), label('s1', 50, 54, 'Score: 2 / √4 = 1', 'lit'),
      label('k2', 50, 72, `K₂ = (${m.k[1].join(', ')})`), footer('Score: 0 / √4 = 0')],
    bars(m.unmasked.scores[0], m.unmasked.weights[0], { title: 'Softmax der Scores', note: 'Balkenlänge zeigt den Anteil' }),
    mixing(m, false), mixing(m, true),
    bars(m.logits, m.warm, { title: 'Übertragung: T = 1', note: 'Drei Logits, keine Kausalmaske' }),
    bars(m.logits, m.cold, { title: 'T = 0,5 · noch alle Tokens', note: 'Keine Rundung im Modell' }),
    bars(m.logits, m.filtered, { title: 'T = 0,5 · Top-k = 2', note: 'Token 3 entfällt; q₁ = ?', hidden: true, masked: [2] }),
    bars(m.logits, m.filtered, { title: 'Top-k neu normiert', note: 'q₁ = 1 / (1 + exp(−2))', masked: [2] }),
  ], prediction: (m) => m.filtered[0], predictionBeat: 6 });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
