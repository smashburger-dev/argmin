import test from 'node:test';
import assert from 'node:assert/strict';
import { compileExpression, compileTemplate } from '../assets/js/domain/expression_eval.mjs';

test('expression compiler evaluates arithmetic, functions, constants, and scopes', () => {
  const expression = compileExpression('sin(pi/2) + max(a, 2)^2 - relu(-b)', ['a', 'b']);
  assert.equal(expression({ a: 3, b: 4 }), 10);
  assert.equal(compileExpression('2^3^2')({}), 512);
  assert.equal(compileExpression('-(x-1)^2', ['x'])({ x: 3 }), -4);
});

test('expression compiler rejects unknown names, functions, and trailing tokens', () => {
  assert.throws(() => compileExpression('missing + 1'), /unbekannter Name/);
  assert.throws(() => compileExpression('unknown(1)'), /unbekannte Funktion/);
  assert.throws(() => compileExpression('1 2'), /Rest ab Token/);
});

test('template compiler formats evaluated placeholders in German notation', () => {
  const render = compileTemplate('Wert: {x/3}', ['x']);
  assert.equal(render({ x: 2 }), 'Wert: 0,67');
});
