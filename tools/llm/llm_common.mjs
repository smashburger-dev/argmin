#!/usr/bin/env node
// Shared helpers for the LLM teacher/student tooling (B2/B4).
// One job per function. Heuristics are marked ponytail: with upgrade path.

export const TEACHER_PROMPT_VERSION = 'teacher-de-v1';
export const TOOLING_VERSION = 'llm-tools-v1';

// Model price table: EUR per 1M tokens { in, out }. Unknown models cost null.
// ponytail: replace with live price feed before any paid run.
export const MODEL_PRICES_EUR_PER_MILLION = {
  mock: { in: 0, out: 0 },
};

export const estimateTokens = (text) => Math.ceil(String(text || '').length / 4);

export function costFor(model, inTokens, outTokens) {
  const price = MODEL_PRICES_EUR_PER_MILLION[model];
  if (!price) return { eur: null, note: `Kein Preis fuer ${model} hinterlegt` };
  const eur = (inTokens / 1e6) * price.in + (outTokens / 1e6) * price.out;
  return { eur, note: null };
}

const GERMAN_WORDS = new Set(
  'der die das und ist nicht ein eine einer einem einen mit fuer für als wird werden aus dem den des zu sich auch auf beim geht rechne zeile schrittweise pruefe prüfe ergebnis aufgabe lies überlege schritte zuerst dann weil gesucht beginnt scheidet größere kleinere richtig falsch antwort begruendung'.split(' '),
);

// Heuristic German check: umlaut/ß hit or enough common German words.
// ponytail: swap for a language-id package when a vendored one exists.
export function isGerman(text) {
  const lower = String(text || '').toLowerCase();
  if (/[äöüß]/.test(lower)) return true;
  const words = lower.split(/[^a-zäöüß]+/).filter(Boolean);
  if (!words.length) return false;
  const hits = words.filter((word) => GERMAN_WORDS.has(word)).length;
  return hits / words.length >= 0.08 && hits >= 2;
}

// Gradeable final answer derived from the instance (never from the student).
export function oracleAnswer(instance) {
  const correct = (instance.choices || []).find((choice) => choice.correct);
  if (correct) return correct.id;
  const expected = instance.expectedAnswer;
  if (expected && Number.isInteger(expected.value)) return expected.value;
  if (expected && expected.kind === 'seeded-integer' && Number.isInteger(expected.value)) return expected.value;
  return null;
}

// Deterministic mock teacher: German hint (no solution leak) plus reasoning.
// corruptEvery: every Nth call returns a wrong finalAnswer (default 0 = never).
export function mockTeacher(instance, { corruptEvery = 0, counter = 0 } = {}) {
  const answer = oracleAnswer(instance);
  const finalAnswer = corruptEvery > 0 && counter > 0 && counter % corruptEvery === 0
    ? '__falsch__'
    : answer;
  const promptSnippet = String(instance.prompt || '').slice(0, 60);
  return {
    hintText: `Lies die Aufgabe in Ruhe: ${promptSnippet}. Überlege schrittweise auf Deutsch und prüfe dein Ergebnis.`,
    reasoning: `Ich gehe schrittweise vor und rechne jede Zeile neu. Parameter: ${JSON.stringify(instance.parameters)}. Erwartet: ${JSON.stringify(instance.expectedAnswer)}.`,
    finalAnswer,
  };
}

// Student interface for mutant discrimination: judgeMutant receives the
// live instance plus one solver-verified mutant and reports whether the
// student accepts it as correct ({ accepted: bool } or bool).
// The mock rejects every mutant.
export const mockJudgeMutant = () => ({ accepted: false });

// Same shape as mockTeacher, used when no prediction file is given.
export const mockStudent = (instance) => ({ ...mockTeacher(instance), judgeMutant: mockJudgeMutant });

// Solution tokens that must not appear in a hint text.
export function leakedSolution(instance, hintText) {
  const hay = String(hintText || '').toLowerCase();
  const correct = (instance.choices || []).find((choice) => choice.correct);
  if (correct && correct.text && correct.text.length > 2 && hay.includes(String(correct.text).toLowerCase())) {
    return 'choice-text';
  }
  const expected = instance.expectedAnswer;
  if (expected && Number.isInteger(expected.value)) {
    const pattern = new RegExp(`(^|\\D)${expected.value}(\\D|$)`);
    if (pattern.test(hay)) return 'expected-value';
  }
  return null;
}

// Every integer in the reasoning must be traceable to parameters/expected.
const TRACE_ALLOWLIST = new Set([0, 1, 2, 3, 10, 100]);
export function traceNumbersValid(instance, reasoning) {
  const numbers = String(reasoning || '').match(/-?\d+/g) || [];
  if (!numbers.length) return false;
  const source = JSON.stringify({ parameters: instance.parameters, expectedAnswer: instance.expectedAnswer });
  const sourceNumbers = new Set((source.match(/-?\d+/g) || []).map(Number));
  return numbers.map(Number).every((number) => TRACE_ALLOWLIST.has(number) || sourceNumbers.has(number));
}
