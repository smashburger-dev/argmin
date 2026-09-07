import test from 'node:test';
import assert from 'node:assert/strict';
import { orderModulesForTrack } from '../assets/js/domain/module_order.mjs';

const track = {
  trackId: 'track',
  competencyIds: ['c-first', 'c-second', 'c-third'],
};

function module(moduleId, competencyIds, requires = [], trackIds = ['track'], title = moduleId) {
  return { moduleId, competencyIds, requires, trackIds, title };
}

test('orders prerequisite modules before dependent modules', () => {
  const result = orderModulesForTrack([
    module('dependent', ['c-second'], ['c-first']),
    module('prerequisite', ['c-first']),
  ], track);
  assert.deepEqual(result.map((item) => item.moduleId), ['prerequisite', 'dependent']);
});

test('uses track competency order as a deterministic tie-break', () => {
  const result = orderModulesForTrack([
    module('third', ['c-third']),
    module('first', ['c-first']),
    module('second', ['c-second']),
  ], track);
  assert.deepEqual(result.map((item) => item.moduleId), ['first', 'second', 'third']);
});

test('keeps unknown dependencies and cycles in deterministic order', () => {
  const result = orderModulesForTrack([
    module('zeta', ['c-third'], ['c-first', 'c-unknown']),
    module('alpha', ['c-first'], ['c-second']),
    module('beta', ['c-second'], ['c-first']),
  ], track);
  assert.deepEqual(result.map((item) => item.moduleId), ['alpha', 'beta', 'zeta']);
});
