import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { glossaryTermId, parseGlossarySection } from '../tools/glossary_content.mjs';

const LESSONS_ROOT = new URL('../content/lessons/', import.meta.url).pathname;

// Lektionen, die dem überarbeiteten Stil aus docs/authoring-guide.md §9 folgen.
// Spätere Batches erweitern diese Liste.
const REVISED = [
  'linear-algebra/matrices.md',
  'foundations/algebra.md',
  'foundations/algebra-transformations.md',
  'linear-algebra/systems.md',
  'linear-algebra/gauss.md',
  'linear-algebra/independence.md',
  'linear-algebra/numpy.md',
  'foundations/python-state.md',
  'foundations/code-reading.md',
  'foundations/control-flow.md',
  'foundations/collections.md',
  'foundations/functions.md',
  'foundations/files-errors.md',
  'foundations/testing-debugging.md',
  'foundations/learning.md',
  'foundations/git.md',
  'data-ml/gradient-regression.md',
  'data-ml/ml-linear.md',
  'data-ml/ml-logistic.md',
  'data-ml/ml-regularization.md',
  'data-ml/ml-svm-pca.md',
  'deep-learning/dl-tensors.md',
  'deep-learning/dl-autograd.md',
  'deep-learning/dl-training.md',
  'deep-learning/dl-regularization.md',
  'transformer-llm/tf-attention.md',
  'data-ml/data-cleaning.md',
  'data-ml/eda-distributions.md',
  'data-ml/ml-baseline.md',
  'data-ml/ml-cv.md',
  'data-ml/ml-ensembles.md',
  'data-ml/ml-error-analysis.md',
  'data-ml/ml-repro.md',
  'transformer-llm/tf-tokenizer.md',
  'transformer-llm/tf-inference.md',
  'transformer-llm/tf-finetuning.md',
  'transformer-llm/tf-papers.md',
  'genai-systems/rag-retrieval.md',
  'genai-systems/genai-evaluation.md',
  'genai-systems/genai-security.md',
  'genai-systems/genai-prototype.md',
  'research/research-question.md',
  'research/research-cards.md',
  'research/responsible-ai.md',
  'research/capstone-baseline.md',
  'research/capstone-freeze.md',
  'research/capstone-runner.md',
  'research/capstone-repro.md',
  'research/capstone-regression.md',
  'research/capstone-acceptance.md',
];

// Checkpoints brauchen keinen Lead und kein Glossar; für sie gelten nur
// die Sprachregeln (Gedankenstriche, Display-Formeln).
const CHECKPOINTS = [
  'deep-learning/dl-tensors-checkpoint.md',
  'deep-learning/dl-autograd-checkpoint.md',
  'deep-learning/dl-training-checkpoint.md',
  'deep-learning/dl-regularization-checkpoint.md',
  'transformer-llm/tf-attention-checkpoint.md',
  'transformer-llm/tf-tokenizer-checkpoint.md',
  'transformer-llm/tf-inference-checkpoint.md',
  'transformer-llm/tf-finetuning-checkpoint.md',
  'transformer-llm/tf-papers-checkpoint.md',
  'genai-systems/rag-retrieval-checkpoint.md',
  'genai-systems/genai-evaluation-checkpoint.md',
  'genai-systems/genai-security-checkpoint.md',
  'genai-systems/genai-prototype-checkpoint.md',
  'research/research-question-checkpoint.md',
  'research/research-question-exercise.md',
  'research/research-cards-checkpoint.md',
  'research/research-cards-exercise.md',
  'research/responsible-ai-checkpoint.md',
  'research/responsible-ai-exercise.md',
  'research/capstone-baseline-checkpoint.md',
  'research/capstone-baseline-exercise.md',
  'research/capstone-freeze-checkpoint.md',
  'research/capstone-runner-checkpoint.md',
  'research/capstone-repro-checkpoint.md',
  'research/capstone-regression-checkpoint.md',
  'research/capstone-acceptance-checkpoint.md',
];

function listLessonMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listLessonMarkdown(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const lessonFiles = listLessonMarkdown(LESSONS_ROOT);
assert.ok(lessonFiles.length > 0, 'keine Lektions-Markdowns gefunden');

const GLOSSARY_LINE = /^- \*\*([^*]+)\*\*(?: \(englisch \*[^*]+\*\))?: \S.*$/;

// Entfernt fenced code und Mathe-Spans, damit Typografie-Checks nur Fließtext sehen.
function stripCodeAndMath(text) {
  const lines = text.split('\n');
  const kept = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    kept.push(line);
  }
  return kept
    .join('\n')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ');
}

// Sammelt alle Display-Formeln ($$...$$) außerhalb von fenced code.
// Jeder Fund trägt den Formelinhalt und die letzte nicht-leere Zeile davor.
function displayFormulas(text) {
  const lines = text.split('\n');
  const found = [];
  let inFence = false;
  let open = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      open = null;
      continue;
    }
    if (inFence) continue;
    const parts = line.split('$$');
    if (open !== null && parts.length === 1) {
      open.content += line;
      continue;
    }
    for (let j = 1; j < parts.length; j += 1) {
      if (open === null) {
        let before = parts[j - 1].trim();
        if (!before) {
          for (let k = i - 1; k >= 0; k -= 1) {
            const p = lines[k].trim();
            if (p) {
              before = p;
              break;
            }
          }
        }
        open = { before, content: '', line: i + 1 };
      } else {
        open.content += parts[j - 1];
        found.push(open);
        open = null;
      }
    }
  }
  return found;
}

// Prüft Regel 1a: nach einer schließenden Display-Formel darf der Satz nicht
// weiterlaufen (Rest der Zeile oder nächste nicht-leere Zeile beginnt klein),
// und eine Formel darf nicht mit Komma enden (Satz läuft sonst weiter).
function displayFormulaViolations(text) {
  const lines = text.split('\n');
  const hits = [];
  let inFence = false;
  let inMath = false;
  let checkNext = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      checkNext = false;
      continue;
    }
    if (inFence) continue;
    if (inMath) {
      if (line.includes('$$')) {
        inMath = false;
        const beforeClose = line.slice(0, line.lastIndexOf('$$')).trim();
        if (beforeClose.endsWith(',')) hits.push(i + 1);
        const rest = line.slice(line.lastIndexOf('$$') + 2).trim();
        if (/^[a-zäöüß]/.test(rest)) hits.push(i + 1);
        else checkNext = true;
      }
      continue;
    }
    if (checkNext) {
      if (trimmed === '') continue;
      if (/^[a-zäöüß]/.test(trimmed)) hits.push(i + 1);
      checkNext = false;
    }
    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length;
      const rest = line.slice(line.lastIndexOf('$$') + 2).trim();
      if (/^[a-zäöüß]/.test(rest)) {
        hits.push(i + 1);
        checkNext = false;
      } else if (count % 2 === 1) {
        inMath = true;
      } else {
        const inside = line.slice(line.indexOf('$$') + 2, line.lastIndexOf('$$')).trim();
        if (inside.endsWith(',')) hits.push(i + 1);
        checkNext = true;
      }
    }
  }
  return hits;
}

test('kein Satz läuft über eine Display-Formel hinweg weiter', () => {
  const report = [];
  for (const file of lessonFiles) {
    const hits = displayFormulaViolations(readFileSync(file, 'utf8'));
    for (const line of hits) report.push(`${file}:${line}`);
  }
  assert.deepEqual(report, []);
});

function splitLeadAndSections(text) {
  const lines = text.split('\n');
  assert.match(lines[0], /^# /, 'Datei beginnt nicht mit H1');
  const firstH2 = lines.findIndex((l) => l.startsWith('## '));
  assert.notEqual(firstH2, -1, 'keine ##-Überschrift gefunden');
  return { lead: lines.slice(1, firstH2), lines };
}

for (const rel of REVISED) {
  const file = join(LESSONS_ROOT, rel);
  const text = readFileSync(file, 'utf8');

  test(`${rel}: Lead ist Prosa ohne Formel und Liste`, () => {
    const { lead } = splitLeadAndSections(text);
    const body = lead.join('\n').trim();
    assert.ok(body.length > 0, 'Lead ist leer');
    assert.ok(!body.includes('$$'), 'Lead enthält Display-Formel');
    assert.ok(!lead.some((l) => /^\s*(-|\*|\d+\.)\s/.test(l)), 'Lead enthält Liste');
  });

  test(`${rel}: letzter Abschnitt ist die Begriffsliste`, () => {
    const { lines } = splitLeadAndSections(text);
    const h2 = lines.map((l, i) => (l.startsWith('## ') ? i : -1)).filter((i) => i >= 0);
    const last = h2[h2.length - 1];
    assert.equal(lines[last], '## Begriffe auf einen Blick');
    const entries = lines.slice(last + 1).filter((l) => l.trim() !== '');
    assert.ok(entries.length >= 3, 'weniger als drei Begriffszeilen');
    for (const entry of entries) {
      assert.match(entry, GLOSSARY_LINE, `keine Begriffszeile: ${entry}`);
    }
  });

  test(`${rel}: Display-Formeln folgen auf Doppelpunkt oder schließen den Satz`, () => {
    for (const f of displayFormulas(text)) {
      const ok = f.before.endsWith(':') || f.content.trimEnd().endsWith('.');
      assert.ok(ok, `Formel in Zeile ${f.line}: vorher "${f.before.slice(-40)}", endet auf "${f.content.trimEnd().slice(-10)}"`);
    }
  });

  test(`${rel}: keine Gedankenstriche im Fließtext`, () => {
    const plain = stripCodeAndMath(text);
    assert.doesNotMatch(plain, /[—–]/);
  });

  test(`${rel}: KI-Bezug ist eigener Abschnitt`, () => {
    assert.ok(text.includes('## Wo dir das in der KI begegnet'), 'Abschnitt fehlt');
  });
}

for (const rel of [...REVISED, ...CHECKPOINTS]) {
  const file = join(LESSONS_ROOT, rel);
  const text = readFileSync(file, 'utf8');

  test(`${rel}: öffnende „ wird mit “ geschlossen`, () => {
    const plain = stripCodeAndMath(text);
    for (const [lineNo, line] of plain.split('\n').entries()) {
      const start = line.indexOf('„');
      if (start === -1) continue;
      const rest = line.slice(start + 1);
      const close = rest.indexOf('“');
      const straight = rest.indexOf('"');
      assert.ok(
        close !== -1 && (straight === -1 || close < straight),
        `Zeile ${lineNo + 1}: ${line.trim().slice(0, 60)}`,
      );
    }
  });
}

for (const rel of CHECKPOINTS) {
  const file = join(LESSONS_ROOT, rel);
  const text = readFileSync(file, 'utf8');

  test(`${rel}: Display-Formeln folgen auf Doppelpunkt oder schließen den Satz`, () => {
    for (const f of displayFormulas(text)) {
      const ok = f.before.endsWith(':') || f.content.trimEnd().endsWith('.');
      assert.ok(ok, `Formel in Zeile ${f.line}: vorher "${f.before.slice(-40)}", endet auf "${f.content.trimEnd().slice(-10)}"`);
    }
  });

  test(`${rel}: keine Gedankenstriche im Fließtext`, () => {
    const plain = stripCodeAndMath(text);
    assert.doesNotMatch(plain, /[—–]/);
  });
}

function lessonTitles() {
  const titles = new Map();
  for (const file of lessonFiles) {
    const jsonPath = file.replace(/\.md$/, '.json');
    try {
      const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
      if (meta.lessonId && meta.title) titles.set(meta.lessonId, meta.title);
    } catch {
      // viz.json und andere Nicht-Lektions-JSONs haben kein lessonId.
    }
  }
  return titles;
}

const normalizeTerm = (s) => s.toLowerCase().replace(/[\s\-`]/g, '');

for (const rel of REVISED) {
  const file = join(LESSONS_ROOT, rel);
  const text = readFileSync(file, 'utf8');

  test(`${rel}: englische Klammer trägt einen anderen Namen als der Begriff`, () => {
    for (const [lineNo, line] of text.split('\n').entries()) {
      const m = line.match(/^- \*\*([^*]+)\*\* \(englisch \*([^*]+)\*\):/);
      if (m) {
        assert.notEqual(
          normalizeTerm(m[1]),
          normalizeTerm(m[2]),
          `Zeile ${lineNo + 1}: englische Klammer wiederholt nur den Begriff`,
        );
      }
    }
  });

  test(`${rel}: Lektionsverweise sind Links mit dem echten Titel`, () => {
    const titles = lessonTitles();
    for (const [lineNo, line] of text.split('\n').entries()) {
      for (const m of line.matchAll(/\[([^\]]+)\]\(#\/lesson\/([a-z0-9-]+)\)/g)) {
        assert.ok(titles.has(m[2]), `Zeile ${lineNo + 1}: unbekannte lessonId ${m[2]}`);
        assert.equal(m[1], titles.get(m[2]), `Zeile ${lineNo + 1}: Linktext ist nicht der Lektionstitel`);
      }
    }
    const plain = stripCodeAndMath(text);
    assert.doesNotMatch(plain, /Lektion\s+„/);
    assert.doesNotMatch(plain, /Lektion\s+zu[mr]?\s+(?!\[)/);
  });
}

test('Begriffe tragen über alle überarbeiteten Lektionen dieselbe Definition', () => {
  const seen = new Map();
  const conflicts = [];
  for (const rel of REVISED) {
    const text = readFileSync(join(LESSONS_ROOT, rel), 'utf8');
    for (const entry of parseGlossarySection(text)) {
      const key = entry.term.toLowerCase();
      if (seen.has(key) && seen.get(key).definition !== entry.definition) {
        conflicts.push(`${entry.term}: ${rel} vs ${seen.get(key).file}`);
      } else {
        seen.set(key, { definition: entry.definition, file: rel });
      }
    }
  }
  assert.deepEqual(conflicts, []);
});

// Lexikon-Regeln (§9): Glossar-Links lösen auf, verweisen nicht auf die
// eigene Begriffsliste und stehen weder im Lead noch in der Begriffsliste.
const allTermIds = new Set();
for (const file of lessonFiles) {
  for (const entry of parseGlossarySection(readFileSync(file, 'utf8'))) {
    allTermIds.add(glossaryTermId(entry.term));
  }
}

for (const rel of REVISED) {
  const file = join(LESSONS_ROOT, rel);
  const text = readFileSync(file, 'utf8');

  test(`${rel}: Glossar-Links lösen auf und zeigen nicht auf eigene Begriffe`, () => {
    const ownIds = new Set(parseGlossarySection(text).map((entry) => glossaryTermId(entry.term)));
    for (const m of text.matchAll(/\]\(#\/glossary\/([a-z0-9-]+)\)/g)) {
      assert.ok(allTermIds.has(m[1]), `unbekannte Glossar-ID ${m[1]}`);
      assert.ok(!ownIds.has(m[1]), `Lektion verlinkt eigenen Begriff ${m[1]}`);
    }
  });

  test(`${rel}: keine Glossar-Links im Lead oder in der Begriffsliste`, () => {
    const { lead, lines } = splitLeadAndSections(text);
    const glossaryStart = lines.findIndex((l) => l === '## Begriffe auf einen Blick');
    assert.ok(![...lead, ...lines.slice(glossaryStart)].join('\n').includes('#/glossary/'), 'Glossar-Link im Lead oder in der Begriffsliste');
  });
}
