#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 4400;
const PROTECTED_DOC = 'docs/session-2026-10-16-figuren-recherche.md';
const CHILD_ENV = {
  ...process.env,
  PATH: ['/Applications/Xcode.app/Contents/Developer/usr/bin', process.env.PATH]
    .filter(Boolean).join(delimiter),
};
const COMMANDS = [
  { name: 'compile-content', command: process.execPath, args: ['tools/compile_content.mjs'] },
  { name: 'validate-content', command: process.execPath, args: ['tools/validate_content.mjs'] },
  { name: 'derived-check', command: 'npm', args: ['run', 'check:derived'] },
  { name: 'node-tests', command: process.execPath, args: ['--test', 'tests/'] },
  { name: 'coverage-check', command: 'npm', args: ['run', 'coverage:check'] },
  { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'release-build', command: 'npm', args: ['run', 'build:release'] },
  { name: 'release-content-validation', command: process.execPath, args: ['tools/validate_content.mjs', '--dir', 'build-next'] },
  { name: 'project-runner', command: 'npm', args: ['run', 'test:project-runner'] },
  { name: 'e2e-source', command: 'npm', args: ['run', 'test:e2e'] },
  { name: 'e2e-release', command: 'npm', args: ['run', 'test:e2e:build'] },
];

let activeChild = null;
let interrupted = false;
let signalEscalation;
process.on('SIGINT', () => {
  interrupted = true;
  if (activeChild?.pid) signalGroup(activeChild.pid, 'SIGINT');
  signalEscalation = setTimeout(() => {
    if (activeChild?.pid) signalGroup(activeChild.pid, 'SIGKILL');
  }, 10_000);
});

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function gitValue(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd: ROOT, env: CHILD_ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (part) => { out += part; });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolvePromise(out.trimEnd()) : reject(new Error(`git ${args.join(' ')} failed`)));
  });
}

function allowedStatusLine(line) {
  return line === ` M ${PROTECTED_DOC}`;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
}

function unexpectedStatus(status) {
  return status.split('\n').filter(Boolean).filter((line) => !allowedStatusLine(line));
}

function signalGroup(pid, signal) {
  try { process.kill(-pid, signal); } catch { /* The group may have exited already. */ }
}

function groupAlive(pid) {
  try { process.kill(-pid, 0); return true; } catch { return false; }
}

async function cleanupGroup(pid) {
  if (!groupAlive(pid)) return;
  signalGroup(pid, 'SIGINT');
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  if (groupAlive(pid)) signalGroup(pid, 'SIGKILL');
}

async function assertPortFree() {
  await new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${PORT} ist belegt; Gate startet keinen fremden Server.`)));
    probe.listen(PORT, '127.0.0.1', () => probe.close((error) => error ? reject(error) : resolvePromise()));
  });
}

function summarize(name, stdoutPath, stderrPath) {
  const output = readFileSync(stdoutPath, 'utf8') + '\n' + readFileSync(stderrPath, 'utf8');
  const tail = output.slice(-120_000);
  const metrics = {};
  for (const key of ['tests', 'pass', 'fail', 'skipped', 'todo']) {
    const match = tail.match(new RegExp(`# ${key}\\s+(\\d+)`));
    if (match) metrics[key] = Number(match[1]);
  }
  const playwright = tail.match(/(\d+) passed(?: \([^)]*\))?/g);
  if (playwright) metrics.playwrightPassed = playwright.map((line) => Number(line.match(/\d+/)?.[0] ?? 0)).reduce((a, b) => a + b, 0);
  const skips = [...tail.matchAll(/(\d+) skipped/gi)].map((match) => Number(match[1]));
  if (skips.length) metrics.reportedSkipped = Math.max(...skips);
  const failures = [...tail.matchAll(/(\d+) failed/gi)].map((match) => Number(match[1]));
  if (failures.length) metrics.reportedFailed = Math.max(...failures);
  return { tail: tail.split('\n').filter(Boolean).slice(-18), metrics, logNames: { stdout: name + '.stdout.log', stderr: name + '.stderr.log' } };
}

async function execute(entry, index, outputDirectory, env, timeoutMs) {
  if (entry.name.startsWith('e2e-')) await assertPortFree();
  const prefix = String(index + 1).padStart(2, '0') + '-' + entry.name;
  const stdoutPath = join(outputDirectory, prefix + '.stdout.log');
  const stderrPath = join(outputDirectory, prefix + '.stderr.log');
  const outFd = openSync(stdoutPath, 'w');
  const errFd = openSync(stderrPath, 'w');
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const child = spawn(entry.command, entry.args, {
    cwd: ROOT, env, detached: true, stdio: ['ignore', outFd, errFd],
  });
  activeChild = child;
  let timeout = false;
  let terminateTimer;
  let killTimer;
  const timer = setTimeout(() => {
    timeout = true;
    signalGroup(child.pid, 'SIGINT');
    terminateTimer = setTimeout(() => {
      signalGroup(child.pid, 'SIGTERM');
      killTimer = setTimeout(() => signalGroup(child.pid, 'SIGKILL'), 5000);
    }, 5000);
  }, timeoutMs);
  const exitCode = await new Promise((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('close', resolvePromise);
  }).finally(async () => {
    clearTimeout(timer);
    clearTimeout(terminateTimer);
    clearTimeout(killTimer);
    closeSync(outFd);
    closeSync(errFd);
    await cleanupGroup(child.pid);
    activeChild = null;
  });
  const result = summarize(entry.name, stdoutPath, stderrPath);
  let portFreeAfter = null;
  if (entry.name.startsWith('e2e-')) {
    try { await assertPortFree(); portFreeAfter = true; }
    catch { portFreeAfter = false; }
  }
  const status = typeof exitCode === 'number' ? exitCode : 1;
  return {
    index: index + 1, name: entry.name, command: [entry.command, ...entry.args],
    startedAt, durationMs: Date.now() - start,
    exitCode: portFreeAfter === false && status === 0 ? 1 : status,
    timedOut: timeout, interrupted, portFreeAfter,
    ...result,
  };
}

async function prepareRun(expected, continueOnFailure) {
  if (!expected) throw new Error('Explizite --expected-head=<SHA> erforderlich.');
  const head = await gitValue(['rev-parse', 'HEAD']);
  const status = await gitValue(['status', '--porcelain=v1']);
  if (head !== expected) throw new Error(`HEAD stimmt nicht: erwartet ${expected}, gefunden ${head}`);
  const unexpected = unexpectedStatus(status);
  if (unexpected.length) throw new Error(`Unerwartete Arbeitsbaumänderungen:\n${unexpected.join('\n')}`);
  const protectedHash = status.split('\n').some(allowedStatusLine) ? sha256(PROTECTED_DOC) : null;
  await assertPortFree();
  const runId = new Date().toISOString().replaceAll(':', '-');
  const outputDirectory = join(ROOT, 'docs/figuren-completion/gate', head, `run-${runId}`);
  mkdirSync(outputDirectory, { recursive: true });
  const env = { ...CHILD_ENV, E2E_PORT: String(PORT) };
  delete env.E2E_REUSE_SERVER;
  const summary = {
    startedAt: new Date().toISOString(), gitHead: head, gitStatus: status,
    protectedForeignFile: protectedHash ? { path: PROTECTED_DOC, sha256: protectedHash } : null,
    port: PORT, continueOnFailure, commands: [],
  };
  return { head, status, protectedHash, outputDirectory, env, summary };
}

async function runCommands(summary, outputDirectory, env) {
  const continueOnFailure = summary.continueOnFailure;
  for (const [index, entry] of COMMANDS.entries()) {
    let result;
    try {
      result = await execute(entry, index, outputDirectory, env, 30 * 60 * 1000);
    } catch (error) {
      result = {
        index: index + 1, name: entry.name, command: [entry.command, ...entry.args],
        exitCode: 1, error: error instanceof Error ? error.message : String(error),
      };
    }
    summary.commands.push(result);
    writeFileSync(join(outputDirectory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    process.stdout.write(`${result.index}/${COMMANDS.length} ${entry.name}: exit ${result.exitCode}, ${result.durationMs}ms\n`);
    if (result.exitCode !== 0 && !continueOnFailure) break;
    if (interrupted) break;
  }
}

function updateProtectedStatus(summary, protectedHash) {
  if (!summary.protectedForeignFile) return;
  summary.protectedForeignFile.unchanged = sha256(PROTECTED_DOC) === protectedHash;
}

async function finishRun(summary, head, protectedHash, outputDirectory) {
  summary.finishedAt = new Date().toISOString();
  summary.gitHeadAfter = await gitValue(['rev-parse', 'HEAD']);
  summary.gitStatusAfter = await gitValue(['status', '--porcelain=v1']);
  const unexpectedAfter = unexpectedStatus(summary.gitStatusAfter);
  updateProtectedStatus(summary, protectedHash);
  if (unexpectedAfter.length) summary.unexpectedStatusAfter = unexpectedAfter;
  try { await assertPortFree(); summary.portFreeAfterGate = true; }
  catch { summary.portFreeAfterGate = false; }
  summary.overallPass = summary.commands.length === COMMANDS.length
    && summary.commands.every((item) => item.exitCode === 0)
    && summary.gitHeadAfter === head
    && unexpectedAfter.length === 0
    && summary.protectedForeignFile?.unchanged !== false
    && summary.portFreeAfterGate;
  writeFileSync(join(outputDirectory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  process.stdout.write(`Evidence: ${join(outputDirectory, 'summary.json')}\n`);
  clearTimeout(signalEscalation);
  if (!summary.overallPass) process.exitCode = 1;
}

async function main() {
  const expected = option('expected-head');
  const continueOnFailure = process.argv.includes('--continue-on-failure');
  const run = await prepareRun(expected, continueOnFailure);
  await runCommands(run.summary, run.outputDirectory, run.env);
  await finishRun(run.summary, run.head, run.protectedHash, run.outputDirectory);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
