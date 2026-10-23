import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createTraceTagTask, TRACE_TAG_CANDIDATES, assertTraceTaskOptions } from '../assets/js/core/python_trace_task.mjs';
import * as traceScene from '../assets/js/figures/scenes/python-trace-tag.mjs';
import * as nameTags from '../assets/js/figures/scenes/name-tags.mjs';
import * as bouncer from '../assets/js/figures/scenes/bouncer.mjs';
import * as vending from '../assets/js/figures/scenes/vending-frame.mjs';
import * as ledger from '../assets/js/figures/scenes/ledger.mjs';
import * as twoTags from '../assets/js/figures/scenes/two-tags-one-list.mjs';
import * as smoke from '../assets/js/figures/scenes/smoke-detector.mjs';
import { FAMILY_SPEC as traceTagFamily } from '../assets/js/core/procedural/trace-tag-after-line.mjs';

const traces = JSON.parse(readFileSync(new URL('../assets/js/figures/objects/python-traces-v1.json', import.meta.url), 'utf8')).records;
const build = (id, caseId = id) => createTraceTagTask(traces[id], { caseId, title: `Spur ${caseId}` });

test('tag-after-line tasks are positive source projections with answer-only binding maps', () => {
  for (const [id, record] of Object.entries(traces)) {
    const { task, expectedAnswer } = build(id);
    assert.equal(task.sourceHash, record.sourceHash);
    assert.equal(task.source, record.source);
    const target = record.events[task.target.eventOrdinal];
    assert.deepEqual(task.lineIds, [`trace:${record.programId}:${target.ordinal}`]);
    assert.deepEqual(task.lines.map(({ lineId, line, sourceLine }) => ({ lineId, line, sourceLine })), [{
      lineId: `trace:${record.programId}:${target.ordinal}`,
      line: target.line,
      sourceLine: target.line === 0 ? '' : record.source.split('\n')[target.line - 1],
    }]);
    assertTraceTaskOptions(task);
    assert.equal('events' in task, false);
    assert.equal('expectedAnswer' in task, false);
    assert.equal('states' in task, false);
    assert.deepEqual(expectedAnswer.states.map((state) => state.lineId), task.lineIds);
  }
});

test('aliases remain separate tag names with one shared object identity', () => {
  const { expectedAnswer } = createTraceTagTask(traces['two-tags-one-list'], { caseId: 'two-tags-one-list', title: 'Alias', targetEventOrdinal: 3 });
  const aliasState = expectedAnswer.states.find((state) => state.bindings.some((binding) => binding.name === 'frame:0:x')
    && state.bindings.some((binding) => binding.name === 'frame:0:y'));
  assert.ok(aliasState);
  assert.equal(aliasState.bindings.find((binding) => binding.name === 'frame:0:x').objectId,
    aliasState.bindings.find((binding) => binding.name === 'frame:0:y').objectId);
});

test('task options never depend on the correct target state or expose values', () => {
  const a = createTraceTagTask(traces['bouncer-age-16'], { caseId: 'gate-a', title: 'A' }).task;
  const b = createTraceTagTask(traces['bouncer-age-18'], { caseId: 'gate-b', title: 'B' }).task;
  assert.deepEqual(a.selectionOptions, b.selectionOptions);
  assert.deepEqual(a.selectionOptions, TRACE_TAG_CANDIDATES.bouncer);
  assert.equal(a.selectionOptions.objects.length, 3);
  const changed = { ...a, selectionOptions: { names: [], objects: [] } };
  assert.throws(() => assertTraceTaskOptions(changed), /independent candidate catalog/);
});

test('seeded family chooses a real executed target state and solves that exact state', () => {
  for (const { caseId } of traceTagFamily.caseTypes) {
    const targets = new Set();
    for (let seed = 0; seed < 24; seed += 1) {
      const generated = traceTagFamily.generate({ seed, caseId, difficulty: 'core' });
      const solved = traceTagFamily.solve(generated.parameters);
      const record = traces[generated.parameters.tagTask.traceKey];
      const event = record.events[generated.parameters.tagTask.target.eventOrdinal];
      const allowedKinds = caseId === 'vending-nested-frames'
        ? ['call', 'return', 'line']
        : caseId === 'smoke-detector-index-error' ? ['line', 'exception'] : ['line'];
      assert.ok(allowedKinds.includes(event.event), `${caseId} target must use its authored event allowlist`);
      assert.deepEqual(generated.expected, solved);
      assert.equal(generated.parameters.tagTask.target.eventOrdinal, generated.expected.states[0].lineId.split(':').at(-1) * 1);
      targets.add(generated.parameters.tagTask.target.eventOrdinal);
    }
    assert.ok(targets.size > 1, `${caseId} should vary its executed target state across seeds`);
  }
});

test('python-trace-tag scene exposes the safe prior state and independent selectors without target outcomes', () => {
  const { task } = build('smoke-detector');
  const params = { tagTask: task };
  const model = traceScene.model(params);
  const pose = traceScene.pose(model, 0, 0);
  const projection = {
    items: traceScene.build(model, pose),
    description: traceScene.describe(model, 0),
    readout: traceScene.readout(model, pose),
    options: task.selectionOptions,
  };
  const json = JSON.stringify(projection);
  assert.match(json, /werte = \[9, 6\]/);
  assert.match(json, /Schritt 3 · Ausnahme · Hauptprogramm/);
  assert.match(json, /Direkt davor · Schritt 2/);
  assert.match(json, /frame:0:werte → object:0/);
  assert.match(json, /object:0: list \[9, 6\]/);
  assert.match(json, /Neue Marke: nächste Nummer/);
  const prims = projection.items[0].prims;
  const priorHeading = prims.find(({ key }) => key === 'prior-heading');
  const priorBinding = prims.find(({ key }) => key === 'prior-binding-0');
  const glossary = prims.find(({ key }) => key === 'prior-object-0');
  assert.ok(priorBinding.y > priorHeading.y);
  assert.ok(glossary.x > priorBinding.x);
  assert.match(projection.description, /Trace-Schritt 3 · Ausnahme · Hauptprogramm/);
  assert.doesNotMatch(json, /IndexError|NameError|stdout|expectedAnswer|"states"|"bindings"\s*:/i);
  assert.equal('selectionTargets' in traceScene, false);
});

test('existing trace scenes expose distinct name targets and shared alias-object targets', () => {
  for (const scene of [nameTags, bouncer, vending, ledger, twoTags, smoke]) {
    const model = scene.model({});
    const targetIndex = model.steps.findIndex((step) => Object.keys(step.bindings).length > 0);
    const targets = scene.selectionTargets(model, targetIndex);
    assert.ok(targets.length > 0);
    assert.equal(new Set(targets.map(({ id }) => id)).size, targets.length);
    assert.ok(targets.every(({ id, itemId, label, description }) => id && itemId && label && description));
  }
  const model = twoTags.model({});
  const shared = model.steps.find((step) => step.bindings['global.x'] && step.bindings['global.y']);
  const index = model.steps.indexOf(shared);
  const targets = twoTags.selectionTargets(model, index);
  assert.ok(targets.some(({ id }) => id === 'binding:frame:0:x'));
  assert.ok(targets.some(({ id }) => id === 'binding:frame:0:y'));
  assert.equal(shared.bindings['global.x'], shared.bindings['global.y']);
  assert.ok(targets.some(({ id }) => id === `object:${shared.bindings['global.x']}`));
  const returnIndex = vending.model({}).steps.findIndex((step) => step.event === 'return');
  const returnStep = vending.model({}).steps[returnIndex];
  const returnTargets = vending.selectionTargets(vending.model({}), returnIndex);
  const returnTarget = returnTargets.find(({ id }) => id === `return:${returnStep.result}`);
  assert.equal(returnTarget.primKey, `object-box-${vending.model({}).identities.indexOf(returnStep.result)}`);
  assert.equal(returnTargets.some(({ id }) => id === returnStep.result), false);
  const printed = nameTags.model({}).steps.findIndex((step) => step.output.trim());
  const outputTarget = nameTags.selectionTargets(nameTags.model({}), printed).find(({ id }) => id === `output:${printed}`);
  assert.equal(outputTarget.primKey, 'output-box');
});

test('hint-mode scene shows only fixed trace prefix and captions before its target event', () => {
  const record = traces['bouncer-age-16'];
  const safety = {
    kind: 'trace-hint-prefix', schemaVersion: 1,
    requested: { bindings: ['frame:0:ok'], objectAttributes: [], values: [], classifications: [] },
    lastAllowedState: { frameId: 'frame:0', eventOrdinal: 1, line: 1 },
    cut: 'after-last-allowed-state', visibleFields: ['sourceLines', 'priorCaptions'],
    target: { lineId: 'trace:bouncer:2', frameId: 'frame:0', eventOrdinal: 2, line: 2 },
  };
  const params = { traceKey: 'bouncer-age-16', caseId: 'bouncer-short-circuit', traceHintSafety: safety };
  const model = traceScene.model(params, { mode: 'hint' });
  const items = traceScene.build(model, { phase: 0 }, 'hint');
  const visible = JSON.stringify({ items, description: traceScene.describe(model, 0, 'hint') });
  assert.deepEqual(Object.keys(model), ['hintProjection']);
  assert.deepEqual(Object.keys(model.hintProjection).sort(), ['priorCaptions', 'sourceLines']);
  assert.match(visible, /age = 16/);
  assert.doesNotMatch(visible, /ticket|exception|IndexError|stdout|object:[0-9]+|binding:/i);
  assert.deepEqual(model.hintProjection.sourceLines, [{ line: 1, sourceLine: record.source.split('\n')[0] }]);
  assert.equal(model.hintProjection.priorCaptions.length, 2);
});
