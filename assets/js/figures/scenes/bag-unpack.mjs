import { diagramScene, label, line, rectangle } from '../objects/f12-diagram.mjs';

export const viewMode = 'flat';
export const defaults = { bags: 3, perBag: 2, a: 4, b: 2, c: 3 };
export const captions = [
  'Jede der drei Tüten enthält x und zwei Einheiten. Der Faktor zählt die ganzen Tüten.',
  'Packe alle Tüten aus: Der Faktor trifft x und die zwei Einheiten.',
  'Gib zwei Tüten mit x − 1 zurück. Das Minus trifft jeden Inhalt: −2x und +2.',
  'Fasse nur Gleichartiges zusammen: Die x-Karten und die Zahlen bleiben getrennt.',
  'Übertrage das Verteilen auf das andere Beispiel aus der Frage: zwei Teilflächen mit gemeinsamer Höhe a.',
];
function compute(p) {
  const total = p.bags * p.perBag;
  return { ...p, total, coefficient: p.bags - 2, constant: total + 2,
    area: p.a * (p.b + p.c), numbers: [0, 1, 2, 3, 4, 5, 6, 8, -1, -2, 20],
    descriptions: [`${p.bags}(x + ${p.perBag})`, `${p.bags}x + ${total}`,
      '−2(x − 1) = −2x + 2', `${p.bags}(x + ${p.perBag}) − 2(x − 1) = x + ${total + 2}`,
      `a = ${p.a}, b = ${p.b}, c = ${p.c}. a(b + c) = ${p.a * (p.b + p.c)}.`] };
}
function bags(m, unpacked) {
  return Array.from({ length: m.bags }, (_, i) => {
    const x = 8 + i * 30;
    return [{ ...rectangle(`bag-${i}`, [x, 25], [x + 23, 75]), visible: !unpacked },
      { ...line(`handle-${i}`, [x + 5, 25], [x + 18, 18]), visible: !unpacked },
      { ...rectangle(`x-card-${i}`, [x, 28], [x + 23, 50]), visible: unpacked },
      { ...rectangle(`unit-card-${i}`, [x, 76], [x + 23, 96]), visible: unpacked },
      label(`x-${i}`, x + 8, unpacked ? 42 : 49, 'x', 6.5, 'lit'),
      label(`units-${i}`, x + 5, unpacked ? 90 : 65, `+${m.perBag}`)];
  }).flat();
}
function frames(m) {
  return [
    [label('formula', 8, 12, `${m.bags}(x + ${m.perBag})`, 6.5), ...bags(m, false)],
    [label('formula', 8, 12, `${m.bags}x + ${m.total}`, 6.5), ...bags(m, true)],
    [label('formula', 8, 15, '−2(x − 1)', 6.5),
      rectangle('return', [10, 27], [90, 72]), label('x', 17, 45, '−x     −x', 6.5, 'lit'),
      label('one', 17, 63, '+1     +1', 6.5), label('sum', 15, 91, '= −2x + 2', 6.5)],
    [label('formula', 5, 15, `${m.bags}x + ${m.total} − 2x + 2`, 6),
      rectangle('x-group', [10, 30], [90, 49]), label('x', 17, 43, `${m.bags}x − 2x = ${m.coefficient}x`, 6, 'lit'),
      rectangle('unit-group', [10, 58], [90, 77]), label('units', 17, 71, `${m.total} + 2 = ${m.constant}`, 6),
      label('result', 29, 96, `x + ${m.constant}`, 6.5)],
    [rectangle('left-area', [18, 22], [18 + m.b * 12, 22 + m.a * 12]),
      rectangle('right-area', [18 + m.b * 12, 22], [18 + (m.b + m.c) * 12, 22 + m.a * 12], 'lit'),
      label('height', 0, 47, String(m.a)), label('b', 27, 85, String(m.b)), label('c', 59, 85, String(m.c)),
      label('formula', 12, 12, 'a · (b + c)', 6.5)],
  ];
}
const scene = diagramScene({ id: 'bag-unpack', defaults, captions, compute, frames, prediction: (m) => m.area });
export const { id, beatIds, validateParams, model, pose, beatDuration, build, cameraFor, ground, readout, describe, predictValue, answerValues, displayNumbers } = scene;
