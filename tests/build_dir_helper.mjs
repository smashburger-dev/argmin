// Shared helpers for validator tests: builds a synthetic public-build-like
// directory (curriculum/sources/exercises filtered exactly like
// tools/build_public.mjs does) plus a matching PUBLIC-BUILD.md manifest, and
// runs the validator as a subprocess against it.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compileContent } from '../tools/compile_content.mjs';
import { createPublicLegacyContent } from '../tools/public_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const validator = join(root, 'tools/validate_content.mjs');

export function publicPass(cur, sourcesJson, exercisesByFile) {
  const filenames = Object.keys(exercisesByFile);
  const result = createPublicLegacyContent({
    curriculum: cur,
    sources: sourcesJson,
    exercisePacks: filenames.map((filename) => exercisesByFile[filename]),
  });
  return {
    cur: result.curriculum,
    sourcesJson: result.sources,
    exercisesByFile: Object.fromEntries(filenames.map((filename, index) => [filename, result.exercisePacks[index]])),
  };
}

// Test-process-wide singletons: the public transform and the public compile
// of the real project sources are deterministic within one `node --test`
// process, and every consumer of makeBuildDir() copies from the SAME source
// files. Hoisting them collapses 18 full compiles per suite into one per
// test file process without hiding any freshness (each test still copies the
// compiled state into its own tree and the validator subprocess re-reads it).
let publicPassCache = null;
function publicPassOnce() {
  if (publicPassCache) return publicPassCache;
  const cur = JSON.parse(readFileSync(join(root, 'content/curriculum.json'), 'utf8'));
  const sourcesJson = JSON.parse(readFileSync(join(root, 'content/sources.json'), 'utf8'));
  const exercisesByFile = {};
  for (const f of readdirSync(join(root, 'content/exercises')).filter((x) => /^w\d{2}\.json$/.test(x))) {
    exercisesByFile[f] = JSON.parse(readFileSync(join(root, 'content/exercises', f), 'utf8'));
  }
  publicPassCache = { cur, sourcesJson, exercisesByFile, pub: publicPass(cur, sourcesJson, exercisesByFile) };
  return publicPassCache;
}

let compiledPublicBundleCache = null;
function compiledPublicBundleOnce() {
  if (!compiledPublicBundleCache) {
    compiledPublicBundleCache = compileContent({ projectRoot: root, profile: 'public' });
  }
  return compiledPublicBundleCache;
}

export function makeBuildDir() {
  const dir = mkdtempSync(join(root, '.tmp-validate-neg-'));
  writeFileSync(join(dir, 'LICENSE'), readFileSync(join(root, 'LICENSE')));
  writeFileSync(join(dir, 'LICENSE-CONTENT.md'), readFileSync(join(root, 'LICENSE-CONTENT.md')));
  mkdirSync(join(dir, 'content'), { recursive: true });
  const { pub } = publicPassOnce();
  writeFileSync(join(dir, 'content/curriculum.json'), JSON.stringify(pub.cur, null, 1) + '\n');
  writeFileSync(join(dir, 'content/sources.json'), JSON.stringify(pub.sourcesJson, null, 1));
  mkdirSync(join(dir, 'content/exercises'), { recursive: true });
  for (const [f, week] of Object.entries(pub.exercisesByFile)) {
    writeFileSync(join(dir, 'content/exercises', f), JSON.stringify(week, null, 1));
  }
  writeFileSync(join(dir, 'content/content-bundle.json'), JSON.stringify(compiledPublicBundleOnce(), null, 2));
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'assets/app.css'), 'body { margin: 0; }\n');
  mkdirSync(join(dir, 'vendor/pyodide'), { recursive: true });
  mkdirSync(join(dir, 'vendor/licenses'), { recursive: true });
  writeFileSync(join(dir, 'vendor/pyodide/pyodide.mjs'), 'export const version = "test";\n');
  const licenseText = 'Mozilla Public License Version 2.0\n';
  const licensePath = 'vendor/licenses/pyodide-MPL-2.0.txt';
  writeFileSync(join(dir, licensePath), licenseText);
  writeFileSync(join(dir, 'vendor/licenses/THIRD_PARTY_NOTICES.json'), JSON.stringify({
    schemaVersion: 1,
    components: [{
      id: 'pyodide',
      name: 'Pyodide',
      version: 'test',
      licenseExpression: 'MPL-2.0',
      sourceUrl: 'https://github.com/pyodide/pyodide',
      artifacts: ['vendor/pyodide/pyodide.mjs'],
      licenseFiles: [licensePath],
      licenseFileSha256: {
        [licensePath]: createHash('sha256').update(licenseText).digest('hex'),
      },
    }],
  }, null, 2));
  const files = [];
  (function walk(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  })(dir);
  const manifest = {
    algorithm: 'sha256',
    files: files.map((p) => ({
      path: p.slice(dir.length + 1),
      sha256: createHash('sha256').update(readFileSync(p)).digest('hex'),
    })),
  };
  writeFileSync(join(dir, 'PUBLIC-BUILD.md'), `# Public Build\n\n\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\`\n`);
  return dir;
}

export function rewriteManifest(dir) {
  const files = [];
  (function walk(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  })(dir);
  const manifest = {
    algorithm: 'sha256',
    files: files.filter((p) => !p.endsWith('PUBLIC-BUILD.md')).map((p) => ({
      path: p.slice(dir.length + 1),
      sha256: createHash('sha256').update(readFileSync(p)).digest('hex'),
    })),
  };
  writeFileSync(join(dir, 'PUBLIC-BUILD.md'), `# Public Build\n\n\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\`\n`);
}

export function runValidator(dir) {
  try {
    const out = execFileSync(process.execPath, [validator, '--dir', dir], { stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out: String(out) };
  } catch (err) {
    return { code: err.status, out: String(err.stdout) + String(err.stderr) };
  }
}

export function cleanupDir(dir) { rmSync(dir, { recursive: true, force: true }); }

/** Read+mutate+write the synthetic curriculum (keeps the manifest invalid —
 *  call rewriteManifest afterwards when the change should PASS). */
export function mutateCurriculum(dir, fn) {
  const p = join(dir, 'content/curriculum.json');
  const cur = JSON.parse(readFileSync(p, 'utf8'));
  fn(cur);
  writeFileSync(p, JSON.stringify(cur, null, 1));
}
