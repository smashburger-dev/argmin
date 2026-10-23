#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 4400;
const OUT_ROOT = join(ROOT, 'docs/figuren-completion/performance-runs');

function requireGo() {
  if (!process.argv.includes('--go')) throw new Error('Absichtlich nicht gestartet: nach Koordinator-GO mit --go ausführen.');
}

function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }

async function assertFreePort() {
  await new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${PORT} ist belegt; fremden Server nicht wiederverwenden.`)));
    probe.listen(PORT, '127.0.0.1', () => probe.close((error) => error ? reject(error) : resolvePromise()));
  });
}

async function runPlaywright(index, outputDirectory) {
  await assertFreePort();
  const stdoutPath = join(outputDirectory, `run-${index}.stdout.log`);
  const stderrPath = join(outputDirectory, `run-${index}.stderr.log`);
  const childEnv = { ...process.env, E2E_PORT: String(PORT), FIGURE_PERF: '1' };
  delete childEnv.E2E_REUSE_SERVER;
  delete childEnv.PLAYWRIGHT_PREVIEW;
  const command = join(ROOT, 'node_modules/.bin/playwright');
  const args = ['test', 'tests/e2e/figures-perf.spec.ts', '--project=chromium', '--workers=1'];
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (code) => resolvePromise({ code: typeof code === 'number' ? code : 1,
      stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }));
  });
  await Promise.all([writeFile(stdoutPath, result.stdout), writeFile(stderrPath, result.stderr)]);
  await assertFreePort();
  const perfFiles = [];
  for (const viewport of ['1440', '375']) {
    const source = join(ROOT, '.figure-shots', `perf-${viewport}.json`);
    if (!existsSync(source)) continue;
    const destination = join(outputDirectory, `run-${index}-perf-${viewport}.json`);
    await copyFile(source, destination);
    const buffer = await readFile(destination);
    const data = JSON.parse(buffer.toString('utf8'));
    const results = (data.results ?? []).map((row) => ({ style: row.style, scenario: row.scenario, ticks: row.ticks, frames: row.frames }));
    const failures = results.filter((row) => row.ticks <= 10 || row.ticks > row.frames + 1);
    perfFiles.push({ path: destination, sha256: sha256(buffer), viewport, throttle: data.throttle, results, failures });
  }
  return { index, command: [command, ...args], startedAt, durationMs: Date.now() - started,
    exitCode: result.code, logs: { stdout: stdoutPath, stderr: stderrPath }, perfFiles };
}

async function main() {
  requireGo();
  const outputDirectory = join(OUT_ROOT, new Date().toISOString().replaceAll(':', '-'));
  await mkdir(outputDirectory, { recursive: true });
  const gitHead = await new Promise((resolvePromise, reject) => {
    const child = spawn('/Applications/Xcode.app/Contents/Developer/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolvePromise(output.trim()) : reject(new Error('Git-HEAD fehlt')));
  });
  const runs = [];
  for (let index = 1; index <= 3; index += 1) {
    const run = await runPlaywright(index, outputDirectory);
    runs.push(run);
    if (run.exitCode !== 0) break;
  }
  const summary = {
    measuredAt: new Date().toISOString(), gitHead,
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    protocol: 'Three sequential Chromium runs; FIGURE_PERF=1, E2E_PORT=4400, project chromium, one worker. Each test has built-in >10-work-ticks and <=frames+1 assertions.',
    expectedRuns: 3, completedRuns: runs.length,
    allTicksAboveTen: runs.length === 3 && runs.every((run) => run.exitCode === 0 && run.perfFiles.length === 2
      && run.perfFiles.every((file) => file.failures.length === 0)),
    runs,
  };
  const summaryPath = join(outputDirectory, 'summary.json');
  await writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ summaryPath, completedRuns: runs.length, allTicksAboveTen: summary.allTicksAboveTen }));
  if (!summary.allTicksAboveTen) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
