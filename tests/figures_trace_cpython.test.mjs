import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { records } from '../assets/js/figures/objects/trace-records.mjs';
import traceSnapshots from '../assets/js/figures/objects/python-traces-v1.json' with { type: 'json' };
import { assertPythonTraceV1 } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recorder = join(root, 'tools/record_figure_traces.py');
const schema = JSON.parse(readFileSync(join(root, 'schemas/python-trace.schema.json'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(schema);
const primaryParams = (programId) => (programId === 'bouncer' ? { age: 16 } : programId === 'ledger' ? { n0: 3, sum0: 0 } : {});
const snapshotKey = (programId, params) => programId === 'bouncer' ? `bouncer-age-${params.age}`
  : programId === 'ledger' ? (params.sum0 ? `ledger-n0-${params.n0}-sum0-${params.sum0}` : `ledger-n0-${params.n0}`) : programId;

function runRecorder(programId, params) {
  return spawnSync('python3', ['-I', '-S', recorder], {
    input: JSON.stringify({ programId, params }), encoding: 'utf8', timeout: 2000,
  });
}

function assertTraceShape(trace) {
  assert.equal(validate(trace), true, JSON.stringify(validate.errors));
  assert.equal(assertPythonTraceV1(trace), trace);
  assert.equal(trace.normalization, 's6a-visible-events/v1');
  assert.equal(trace.sourceHash, createHash('sha256').update(trace.source, 'utf8').digest('hex'));
  assert.equal(trace.source.includes('\r'), false);
  assert.equal(trace.events[0].event, 'start');
  assert.equal(trace.events[0].ordinal, 0);
  assert.equal(trace.events[0].line, 0);
  assert.equal(trace.events[0].frameId, 'frame:0');
  assert.equal(trace.events[0].parentFrameId, null);
  const frames = new Map([['frame:0', null]]);
  trace.events.forEach((event, ordinal) => {
    assert.equal(event.ordinal, ordinal);
    assert.match(event.frameId, /^frame:\d+$/);
    assert.doesNotMatch(`${event.frameId} ${event.parentFrameId ?? ''}`, /\/|Users|tmp/i);
    if (event.event === 'call') {
      assert.ok(frames.has(event.parentFrameId));
      assert.equal(frames.has(event.frameId), false);
      frames.set(event.frameId, event.parentFrameId);
    } else if (event.event !== 'start') assert.ok(frames.has(event.frameId));
    for (const objectId of Object.values(event.bindings)) assert.ok(Object.hasOwn(event.objects, objectId));
    if (event.result) assert.ok(Object.hasOwn(event.objects, event.result));
  });
}

function compareFrozenTrace(trace, frozen) {
  assert.equal(trace.source, frozen.code.join('\n'));
  assert.equal(trace.events.length, frozen.steps.length);
  const actualToExpected = new Map();
  const expectedToActual = new Map();
  trace.events.forEach((event, index) => {
    const expected = frozen.steps[index];
    assert.equal(event.event, expected.event, `${trace.programId}:${index}: event`);
    assert.equal(event.line, expected.line, `${trace.programId}:${index}: line`);
    assert.equal(event.function, expected.scope, `${trace.programId}:${index}: frame`);
    assert.equal(event.output, expected.output, `${trace.programId}:${index}: stdout`);
    if (expected.exception) assert.equal(event.exception?.type, expected.exception);

    const actualBindings = Object.entries(event.bindings)
      .filter(([key]) => key.startsWith(`${event.frameId}:`))
      .map(([key, objectId]) => {
        const name = key.slice(key.lastIndexOf(':') + 1);
        return [event.function === '<module>' ? `global.${name}` : `${event.function}.${name}`, objectId];
      });
    assert.deepEqual(actualBindings.map(([name]) => name).sort(), Object.keys(expected.bindings).sort(), `${trace.programId}:${index}: bindings`);
    for (const [name, actualId] of actualBindings) {
      const expectedId = expected.bindings[name];
      if (actualToExpected.has(actualId)) assert.equal(actualToExpected.get(actualId), expectedId, `${trace.programId}:${index}: alias ${name}`);
      if (expectedToActual.has(expectedId)) assert.equal(expectedToActual.get(expectedId), actualId, `${trace.programId}:${index}: identity ${name}`);
      actualToExpected.set(actualId, expectedId);
      expectedToActual.set(expectedId, actualId);
      assert.deepEqual(event.objects[actualId], expected.objects[expectedId], `${trace.programId}:${index}: ${name} value/type`);
    }
    if (expected.result) {
      const actualResult = event.result;
      if (actualToExpected.has(actualResult)) assert.equal(actualToExpected.get(actualResult), expected.result);
      if (expectedToActual.has(expected.result)) assert.equal(expectedToActual.get(expected.result), actualResult);
      actualToExpected.set(actualResult, expected.result);
      expectedToActual.set(expected.result, actualResult);
      assert.deepEqual(event.objects[actualResult], expected.objects[expected.result], `${trace.programId}:${index}: return value`);
    }
  });
}

test('CPython recorder matches every frozen F1 trace, including the dictionary evidence record', () => {
  for (const [programId, frozen] of Object.entries(records)) {
    const result = runRecorder(programId, primaryParams(programId));
    assert.equal(result.error, undefined, `${programId}: recorder exceeded its caller timeout`);
    assert.equal(result.status, 0, `${programId}: ${result.stderr}`);
    const trace = JSON.parse(result.stdout);
    assertTraceShape(trace);
    compareFrozenTrace(trace, frozen);
    const snapshot = traceSnapshots.records[snapshotKey(programId, primaryParams(programId))];
    assert.ok(snapshot, `${programId}: missing python-trace/v1 snapshot`);
    assert.deepEqual(trace.events, snapshot.events, `${programId}: frozen event record differs from current CPython`);
    assert.equal(trace.sourceHash, snapshot.sourceHash);
    assert.equal(trace.stdout, snapshot.stdout);
  }
});

test('restricted parameter boundary cases execute only authored CPython programs', () => {
  const adult = runRecorder('bouncer', { age: 18 });
  assert.equal(adult.status, 0, adult.stderr);
  const adultTrace = JSON.parse(adult.stdout);
  assertTraceShape(adultTrace);
  assert.equal(adultTrace.events.at(-1).event, 'exception');
  assert.equal(adultTrace.events.at(-1).exception.type, 'NameError');
  assert.equal(adultTrace.stdout, '');
  assert.deepEqual(adultTrace.events, traceSnapshots.records['bouncer-age-18'].events);

  for (const [programId, params] of [
    ['bouncer', { age: 15 }], ['bouncer', { age: true }], ['ledger', { n0: 0 }],
    ['ledger', { n0: 5 }], ['ledger', { n0: 3, sum0: 4 }], ['name-tags', { source: 'print(1)' }], ['unknown', {}],
  ]) {
    const rejected = runRecorder(programId, params);
    assert.equal(rejected.status, 2, `${programId} ${JSON.stringify(params)} was accepted`);
    assert.match(rejected.stderr, /unsupported F1 program|parameter set/);
  }

  for (const n0 of [1, 4]) {
    const result = runRecorder('ledger', { n0 });
    assert.equal(result.status, 0, result.stderr);
    const trace = JSON.parse(result.stdout);
    assertTraceShape(trace);
    assert.equal(trace.inputs.n0.value, String(n0));
    assert.equal(trace.stdout, `${(n0 * (n0 + 1)) / 2} 0\n`);
    assert.deepEqual(trace.events, traceSnapshots.records[`ledger-n0-${n0}`].events);
  }

  for (const [key, frozen] of Object.entries(traceSnapshots.records)) {
    let programId = key;
    let params = {};
    if (key.startsWith('bouncer-age-')) {
      programId = 'bouncer';
      params = { age: Number(key.slice('bouncer-age-'.length)) };
    } else if (key.startsWith('ledger-n0-')) {
      const [, , n0, , sum0] = key.split('-');
      programId = 'ledger';
      params = { n0: Number(n0), sum0: Number(sum0 ?? 0) };
    }
    const replay = runRecorder(programId, params);
    assert.equal(replay.error, undefined, `${key}: recorder exceeded its caller timeout`);
    assert.equal(replay.status, 0, `${key}: ${replay.stderr}`);
    const actual = JSON.parse(replay.stdout);
    assertTraceShape(actual);
    assert.match(actual.pythonVersion, /^\d+\.\d+\.\d+$/, `${key}: recorder must report the actual CPython version`);
    const semantic = ({ pythonVersion: _pythonVersion, ...trace }) => trace;
    assert.deepEqual(semantic(actual), semantic(frozen), `${key}: bounded CPython replay differs from frozen trace`);
  }
});
