import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as smoothie from '../assets/js/figures/scenes/smoothie.mjs';
import { hintSpec, hintTexts, assertNoHintLeak, answerNumbers } from '../assets/js/figures/kit/hints.mjs';
import { validateFigureHints, validateFigureSpec, validateSourceDocument, validateLessonFigures } from '../tools/compile_content.mjs';
import { paintList, paintOrderErrors } from '../assets/js/figures/kit/depth.mjs';
import { deg } from '../assets/js/figures/kit/camera.mjs';

const read = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)));
const entries = read('content/figure-hints.json');
const families = ['transform-system-2x2-elimination', 'classify-column-combination'].map((id) => read(`content/families/${id}.json`));
const entry = entries.hints[1];
const params = { A: [[2, 1], [1, -3]], b: [5, -8] };
const instance = { familyId: entry.familyId, parameters: params };
const spec = hintSpec(entry, smoothie, instance);
const m = smoothie.model(spec.params, { mode: 'hint' });

test('hint compiler checks curated cases and fifty seeds of every served profile against family solvers', () => {
  assert.doesNotThrow(() => validateFigureHints(entries, families));
});

test('compiler rejects an injected leak even when answerValues lies', () => {
  const bad = { ...smoothie, answerValues: () => [], readout: () => 'Gewichte 1,000 und 3.000' };
  assert.throws(() => validateFigureHints({ hints: [entry] }, families, { [entry.scene]: bad }), /E_FIGURE_HINT_LEAK/);
  const transient = { ...smoothie, readout: (_m, p) => p.t === 0.6 ? 'Gewicht 1' : 'Unbekannt' };
  assert.throws(() => validateFigureHints({ hints: [entry] }, families, { [entry.scene]: transient }), /E_FIGURE_HINT_LEAK/);
});

test('leak guard recognizes integers, decimals, fractions and both minus signs', () => {
  for (const text of ['−0,333', '-0.333', '−1/3', '-1/3']) {
    assert.throws(() => assertNoHintLeak([text], [-1 / 3], 'test'), /E_FIGURE_HINT_LEAK/);
  }
  assert.doesNotThrow(() => assertNoHintLeak(['Gewichte gesucht'], [1, 3], 'test'));
  assert.deepEqual(answerNumbers({ correctText: '(2,1)' }), [2, 1]);
});

test('lesson figure limits reject overload and consecutive inline figures', () => {
  const block = (kind) => ({ fig: { kind } });
  assert.throws(() => validateLessonFigures({ lessonId: 'test', blocks: [block('beats'), block('explore'), block('beats')] }), /höchstens zwei/);
  assert.throws(() => validateLessonFigures({ lessonId: 'test', blocks: [block('inline'), block('inline')] }), /benachbarten/);
});

test('classification must use a fixed neighbor', () => {
  const bad = { ...entries.hints[0], source: 'case' };
  assert.throws(() => validateFigureHints({ hints: [bad] }, families), /neighbor/);
});

test('hint parameters support fractional and negative solutions without changing lesson limits', () => {
  const p = smoothie.hintParams(entry.familyId, { A: [[2, 1], [1, 2]], b: [1, 3] });
  const mm = smoothie.model(p, { mode: 'hint' });
  assert.deepEqual(smoothie.answerValues(mm), [-1 / 3, 5 / 3]);
  assert.throws(() => smoothie.model(p), /non-negative/);
});

test('hint geometry never uses solution multiplicities or scaled result vectors', () => {
  for (let i = 0; i < smoothie.hintBeatIds.length; i += 1) {
    const p = smoothie.pose(m, i, 4, 'hint');
    const items = smoothie.build(m, p, 'hint');
    assert.ok(items.filter((item) => ['scoop', 'scoop-load', 'jar-marks', 'mixer-liquid'].includes(item.id)).every((item) => item.visible === false));
    const board = items.find((item) => item.id === 'board-face');
    assert.equal(board.prims.filter((prim) => /-ray$/.test(prim.key)).length, 2);
    for (const ray of board.prims.filter((prim) => /-ray$/.test(prim.key))) {
      assert.ok(Math.abs(Math.hypot(ray.to[0] - ray.from[0], ray.to[1] - ray.from[1]) - 6) < 1e-9);
    }
    assertNoHintLeak(hintTexts(items), smoothie.answerValues(m), 'geometry');
  }
});

test('hint depth sweep uses the renderer paint list', () => {
  const items = smoothie.build(m, smoothie.pose(m, 2, 4, 'hint'), 'hint');
  for (const elevation of [15, 30, 50]) {
    for (let az = 0; az < 360; az += 5) {
      const cam = { azimuth: deg(az), elevation: deg(elevation), zoom: 1, target: [0, 0, 0] };
      assert.equal(paintOrderErrors(items, cam, { width: 343, height: 343 }).length, 0, `${az}/${elevation}`);
    }
  }
});

test('kind rules reject oversized captions, hint prediction, invalid explore and missing trace support', () => {
  const authored = read('content/lessons/linear-algebra/smoothie.fig.json');
  assert.throws(() => validateFigureSpec({ ...authored, kind: 'hint' }, 'test'), /Vorhersage/);
  assert.throws(() => validateFigureSpec({ ...authored, beats: [{ id: 'ingredients', caption: 'a'.repeat(141) }] }, 'test'), /140/);
  assert.throws(() => validateFigureSpec({ ...authored, kind: 'explore' }, 'test'), /Zahlenfeld/);
  assert.throws(() => validateFigureSpec({ ...authored, beats: { from: 'trace' } }, 'test'), /trace/);
  assert.throws(() => validateSourceDocument('figure', { ...authored, kind: 'unknown' }), /kind/);
  assert.equal(validateFigureSpec({ ...spec, hint: 'Übertrage die Idee.' }, 'hint'), true);
});
