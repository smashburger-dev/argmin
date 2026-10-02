// Statement pools for multiple-choice cases: the authored case (seed 0)
// stays the anchor instance; every other seed draws `count` statements from
// the pool — kTrue correct ones inside correctRange, the rest incorrect —
// and emits a fresh option set with per-statement feedback rules bound to
// the freshly assigned ids. Pure functions, no DOM.

import { familySubseed, randInt, rng, shuffle } from '../core/generator_draw_kit.mjs';

// One id per slot up to the contract maximum count 6; CHOICE_IDS stops at d.
const POOL_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** Seed ≠ 0 instance for a case body carrying `statementPool`. The draw is
 *  deterministic per (seed, caseId, difficulty): kTrue = randInt(min, max)
 *  clamped so enough true and false statements exist, statements drawn via
 *  shuffle, display order shuffled again, ids a, b, c… in display order. */
export const drawStatementCase = (body, { seed, caseId, difficulty }) => {
  const pool = body.statementPool;
  const r = rng(familySubseed(seed, caseId, difficulty));
  const trueIdx = pool.statements.map((statement, i) => (statement.correct ? i : -1)).filter((i) => i >= 0);
  const falseIdx = pool.statements.map((statement, i) => (statement.correct ? -1 : i)).filter((i) => i >= 0);
  const [minTrue, maxTrue] = pool.correctRange;
  const kTrue = randInt(
    r,
    Math.max(minTrue, pool.count - falseIdx.length),
    Math.min(maxTrue, trueIdx.length),
  );
  const drawnTrue = shuffle(r, trueIdx).slice(0, kTrue);
  const drawnFalse = shuffle(r, falseIdx).slice(0, pool.count - kTrue);
  const order = shuffle(r, [...drawnTrue, ...drawnFalse]);
  const ids = POOL_IDS.slice(0, order.length);
  const statement = (i) => pool.statements[order[i]];
  const choices = order.map((poolIndex, i) => ({ id: ids[i], text: pool.statements[poolIndex].text }));
  const correctIds = order
    .map((poolIndex, i) => (pool.statements[poolIndex].correct ? ids[i] : null))
    .filter(Boolean)
    .sort();
  return {
    parameters: { caseId, difficulty, statements: order },
    choices,
    expected: { kind: 'choice-indices', correctIds, scoring: body.expected?.scoring },
    feedbackRules: order.map((poolIndex, i) => ({
      if: pool.statements[poolIndex].correct
        ? `!selected.includes('${ids[i]}')`
        : `selected.includes('${ids[i]}')`,
      then: pool.statements[poolIndex].feedback,
      ...(pool.statements[poolIndex].misconception ? { misconception: pool.statements[poolIndex].misconception } : {}),
    })),
    fullSolution: order
      .map((poolIndex, i) => `${ids[i]}) ${pool.statements[poolIndex].correct ? 'zutreffend' : 'nicht zutreffend'}. ${pool.statements[poolIndex].feedback}`)
      .join('\n'),
    hints: pool.hints ?? [],
    prompt: body.prompt,
  };
};

/** Solver for a pool-drawn instance: recompute correctIds from the pool
 *  indices recorded in parameters.statements. */
export const solveStatementPool = (body, parameters) => ({
  correctIds: (parameters?.statements || [])
    .map((poolIndex, i) => (body.statementPool.statements[poolIndex]?.correct ? POOL_IDS[i] : null))
    .filter(Boolean)
    .sort(),
});
