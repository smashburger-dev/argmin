import test from 'node:test';
import assert from 'node:assert/strict';
import { compileExpression, compileTemplate } from '../assets/js/domain/expression_eval.mjs';
import { compileContent, validateSourceDocument } from '../tools/compile_content.mjs';

const bundle = compileContent({ profile: 'public' });

function scopesFor(spec) {
  const sliders = spec.sliders || [];
  const initial = Object.fromEntries(sliders.map((slider) => [slider.name, slider.value]));
  return [
    initial,
    ...sliders.flatMap((slider) => [
      { ...initial, [slider.name]: slider.range[0] },
      { ...initial, [slider.name]: slider.range[1] },
    ]),
  ];
}

function evaluateValue(value, scope, names) {
  return typeof value === 'number' ? value : compileExpression(value, names)(scope);
}

test('visualization bundle contains 24 unique, lesson-linked specifications', () => {
  assert.equal(bundle.visualizations.length, 24);
  assert.equal(new Set(bundle.visualizations.map((item) => item.visualizationId)).size, 24);
  for (const item of bundle.visualizations) {
    const lesson = bundle.lessons.find((entry) => entry.lessonId === item.lessonId);
    assert.ok(lesson, item.visualizationId);
    const blockIndex = lesson.blocks.findIndex((block) => block.visualizationId === item.visualizationId);
    assert.ok(blockIndex > 0, item.visualizationId);
    assert.equal(lesson.blocks[blockIndex - 1].type, 'worked-example', item.visualizationId);
    assert.equal(item.spec.engine, 'jsxgraph');
    assert.ok(item.spec.objects.length > 0);
  }
});

test('visualization specifications validate expressions at slider boundaries', () => {
  for (const { visualizationId, spec } of bundle.visualizations) {
    validateSourceDocument('visualization', spec);
    const names = (spec.sliders || []).map((slider) => slider.name);
    for (const slider of spec.sliders || []) assert.ok(slider.range[0] < slider.range[1], visualizationId);
    for (const scope of scopesFor(spec)) {
      for (const object of spec.objects) {
        const values = [];
        if (object.kind === 'functiongraph') {
          const domain = object.domain || [spec.boundingbox[0], spec.boundingbox[2]];
          const xmin = evaluateValue(domain[0], scope, names);
          const xmax = evaluateValue(domain[1], scope, names);
          for (let index = 0; index < 5; index += 1) {
            const x = xmin + ((xmax - xmin) * index) / 4;
            values.push(compileExpression(object.expr, [...names, 'x'])({ ...scope, x }));
          }
        } else if (object.kind === 'text') {
          evaluateValue(object.at[0], scope, names);
          evaluateValue(object.at[1], scope, names);
          compileTemplate(object.text, names)(scope);
        } else {
          const points = object.kind === 'point'
            ? [object.at]
            : object.kind === 'arrow' || object.kind === 'segment'
              ? [object.from, object.to]
              : object.points;
          for (const point of points) {
            values.push(evaluateValue(point[0], scope, names));
            values.push(evaluateValue(point[1], scope, names));
          }
        }
        for (const value of values) assert.ok(Number.isFinite(value), `${visualizationId} produced ${value}`);
      }
    }
  }
});
