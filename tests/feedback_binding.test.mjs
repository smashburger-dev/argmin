import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';

// Feedback-Bindungs-Invariante: jede choice-Regel einer Instanz muss auf die
// Option zeigen, fuer deren Text sie authored wurde. Quellen des Regeltexts:
// der Anker (Regel-id -> Anker-Choice-Text), eine Variante mit eigenen
// choices + feedbackRules, Bank-Aussagen (wrong[].feedback -> Text) und
// Pool-Aussagen (statement.feedback -> Text). Catch-alls `choice !== 'id'`
// binden bewusst keinen einzelnen Optionstext und sind ausgenommen.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const document of familyDocs) registerStaticCases(document.familyId, document.cases);
const registry = configureExerciseFamilies(familyDocs);
const bankDocs = new Map(
  readdirSync(join(root, 'content/banks'))
    .filter((name) => name.endsWith('.json'))
    .map((name) => [name.replace(/\.json$/, ''), JSON.parse(readFileSync(join(root, 'content/banks', name), 'utf8'))]),
);

const textOf = (item) => (typeof item === 'string' ? item : item?.text);

// then-Text -> Menge der Optionstexte, fuer die er authored wurde.
const authoredTexts = (doc, body) => {
  const map = new Map();
  const addRules = (rules, choices) => {
    for (const rule of rules || []) {
      const id = /'([^']+)'/.exec(rule?.if ?? '')?.[1];
      const text = (choices || []).find((choice) => choice.id === id)?.text;
      if (typeof rule?.then === 'string' && text) {
        if (!map.has(rule.then)) map.set(rule.then, new Set());
        map.get(rule.then).add(text);
      }
    }
  };
  addRules(body.feedbackRules, body.choices);
  for (const variant of body.variants || []) {
    addRules(variant.feedbackRules, variant.choices || body.choices);
  }
  for (const capsule of Object.values(bankDocs.get(doc.familyId)?.capsules || {})) {
    for (const entry of capsule.bank || []) {
      for (const wrong of entry.wrong || []) {
        if (typeof wrong === 'object' && typeof wrong.feedback === 'string') {
          if (!map.has(wrong.feedback)) map.set(wrong.feedback, new Set());
          map.get(wrong.feedback).add(wrong.text);
        }
      }
    }
  }
  for (const statement of body.statementPool?.statements || []) {
    if (!map.has(statement.feedback)) map.set(statement.feedback, new Set());
    map.get(statement.feedback).add(statement.text);
  }
  return map;
};

test('feedback binding: every choice rule points at its authored option text', () => {
  const bad = [];
  for (const doc of familyDocs) {
    const family = registry.get(doc.familyId);
    for (const caseType of family.caseTypes) {
      const body = doc.cases.find((entry) => entry.caseId === caseType.caseId);
      const sources = body ? authoredTexts(doc, body) : new Map();
      for (const difficulty of family.difficultyProfiles) {
        for (let seed = 0; seed < 24; seed += 1) {
          let instance;
          try {
            instance = registry.instantiate(doc.familyId, seed, difficulty, caseType.caseId);
          } catch { continue; }
          const label = `${doc.familyId}/${caseType.caseId} ${difficulty}:${seed}`;
          for (const rule of instance.feedbackRules || []) {
            const choiceMatch = /^choice === '([^']+)'$/.exec(rule?.if ?? '');
            const selectedMatch = /^!?selected\.includes\('([^']+)'\)$/.exec(rule?.if ?? '');
            const target = choiceMatch?.[1] ?? selectedMatch?.[1];
            if (!target || /^choice !== /.test(rule.if)) continue;
            const shown = (instance.choices || []).find((choice) => choice.id === target);
            if (!shown) { bad.push(`${label}: Regel "${rule.if}" zeigt auf fehlende Option`); continue; }
            // classify-git-operation renames `datei.py` to the drawn file name;
            // the invariant compares against the authored text.
            const fileName = instance.parameters?.fileName;
            const unlocalize = (text) =>
              fileName && typeof text === 'string' ? text.replaceAll(fileName, 'datei.py') : text;
            const authored = sources.get(unlocalize(rule.then));
            if (authored && !authored.has(unlocalize(shown.text))) {
              bad.push(`${label}: "${rule.if}" -> "${shown.text.slice(0, 40)}…" statt authored Text`);
            } else if (choiceMatch && shown.correct === true) {
              // Generator-emittierte Regeln (then ohne JSON-Quelle) sind per
              // Konstruktion gebunden — die Sanity-Grenze bleibt: kein
              // Distraktor-Feedback darf auf die korrekte Option zeigen.
              bad.push(`${label}: "${rule.if}" zeigt auf die korrekte Option`);
            }
          }
        }
      }
    }
  }
  assert.deepEqual(bad, [], `Fehlgebundene Regeln:\n${bad.slice(0, 25).join('\n')}`);
});
