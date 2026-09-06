import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProjectReport } from '../assets/js/domain/project_report.mjs';

const manifest = {
  schemaVersion: 1,
  projectId: 'foundations-data-checker',
  projectVersion: '1.0.0',
  testPaths: ['tests'],
  requiredFiles: [{ path: 'main.py', sha256: 'a'.repeat(64) }],
};

const report = () => ({
  schemaVersion: 1,
  reportId: 'report-1',
  projectId: manifest.projectId,
  projectVersion: manifest.projectVersion,
  runner: 'python-pytest',
  runAt: '2026-08-29T12:00:00.000Z',
  command: ['python', '-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', 'tests'],
  status: 'passed',
  exitCode: 0,
  durationMs: 140,
  stdout: '8 passed',
  stderr: '',
  stdoutTruncated: false,
  stderrTruncated: false,
  files: [{ path: 'main.py', sha256: 'a'.repeat(64), present: true }],
});

test('project report validator accepts a matching self-report without granting mastery evidence', () => {
  const result = validateProjectReport(report(), manifest);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.integrity, 'self-reported');
  assert.equal(result.evidenceEligible, false);
});

test('project report validator rejects changed identity, command and file hashes', () => {
  const changedIdentity = report();
  changedIdentity.projectVersion = '2.0.0';
  assert.equal(validateProjectReport(changedIdentity, manifest).ok, false);

  const changedCommand = report();
  changedCommand.command.push('--collect-only');
  assert.equal(validateProjectReport(changedCommand, manifest).ok, false);

  const invalidExit = report();
  invalidExit.status = 'failed';
  invalidExit.exitCode = null;
  assert.equal(validateProjectReport(invalidExit, manifest).ok, false);

  const changedHash = report();
  changedHash.files[0].sha256 = 'b'.repeat(64);
  const result = validateProjectReport(changedHash, manifest);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /Hash/.test(error)));
});
