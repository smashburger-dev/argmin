// The canonical integer helpers live in foundations (byte-pinned rng); re-exported
// here so every family module has ONE import site.
import { rng, randInt, nonzeroInt } from './foundations_generators.mjs';
export { rng, randInt, nonzeroInt };

/** Binds until/clean to one family's retry bounds, error scope and leak-guard
 *  strictness — the per-file constants that keep RNG consumption identical. */
export const bindFamilyDraw = (options) => ({
  until: (random, fn, guard) => until(random, fn, guard, options),
  clean: (random, build) => clean(random, build, options),
});

// Shared draw utilities for the week-family generators (deduplicated in the
// shrink-complexity pass; every semantic knob of the previous per-file copies
// is an explicit option so each family keeps its exact RNG consumption,
// retry bounds, error scope and leak-guard strictness — the seed golden
// corpus in tests/fixtures/generator-golden-corpus.json pins the bytes).

/** Seed-Varianten: Fallwahl aus dem Seed (negativ-sicher, `seed % N` ohne
 *  `abs` bricht für negative Seeds — caseBank hatte genau diesen Defekt). */
export const variantCaseIndex = (seed, length) => Math.abs(seed) % length;

/** Seed-Epoche: zählt, wie oft die Fallbank schon durchlaufen ist. */
export const variantEpoch = (seed, length) => Math.floor(Math.abs(seed) / length);

/** Rotate `options` so that index `rotation` becomes the correct position.
 *  rotation 0 keeps the input order (slice(-0) would be a no-rotation trap). */
const rotateOptions = (options, rotation) => {
  if (rotation <= 0) return [...options];
  return [...options.slice(-rotation), ...options.slice(0, options.length - rotation)];
};

/** Baut benannte Choices aus unrotierten Optionstexten (options[0] korrekt). */
export const buildRotatedChoices = (options, rotation, ids) => {
  const rotated = rotateOptions(options, rotation);
  return rotated.map((text, index) => ({ id: ids[index], text, correct: index === rotation }));
};

export function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function shuffle(random, values) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Bounded retry helper: fn(random) is repeated until guard() holds. The
 *  scope names the calling family in the degenerate-draw error. */
export function until(random, fn, guard, { maxTries = 96, scope = 'generator_draw_kit' } = {}) {
  for (let i = 0; i < maxTries; i += 1) {
    const value = fn(random);
    if (guard(value)) return value;
  }
  const fallback = fn(random);
  if (!guard(fallback)) throw new Error(`${scope}: degenerate draw survived retry guard`);
  return fallback;
}

/** True when `value` appears in `text` as a standalone number (not part of a
 *  longer number or percentage). Families that render negatives with a
 *  unicode minus in the SAME string they guard normalize it first; families
 *  whose prompts mix both notations opt out to keep their historical draws. */
export function standaloneNumberPresent(text, value, { normalizeUnicodeMinus = true } = {}) {
  const normalized = normalizeUnicodeMinus ? String(text).replace(/\u2212/g, '-') : text;
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(normalized);
}

/** Redraws the whole instance until the prompt no longer shows the answer. */
export function clean(random, build, options = {}) {
  return until(
    random,
    build,
    (instance) => !standaloneNumberPresent(instance.prompt, instance.expected, options),
    options,
  );
}

/** Deterministische Subseeds (FNV-1a über Seed:Fall:Profil:Versuch). */
export function familySubseed(seed, caseId, difficulty, attempt = 0) {
  const text = `${seed}|${caseId}|${difficulty}|${attempt}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Zieht Generatorausgaben, bis Form (`wantShape`) und Profilprädikat
 *  (`profileAccepts`, null = Referenzverteilung) passen. Fällt nach `cap`
 *  Versuchen auf die erste formtreue Ziehung zurück. */
export function drawFamilyInstance(generate, { seed, caseId, difficulty, wantShape, profileAccepts, cap = 2000, profiles = null }) {
  if (Array.isArray(profiles) && !profiles.includes(difficulty)) throw new Error(`Unbekanntes Profil ${difficulty}`);
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  let fallback = null;
  for (let attempt = 0; attempt < cap; attempt += 1) {
    const drawn = generate(familySubseed(seed, caseId, difficulty, attempt));
    if (!wantShape(drawn)) continue;
    if (!fallback) fallback = drawn;
    if (!profileAccepts || profileAccepts(drawn.parameters)) return drawn;
  }
  if (!fallback) throw new Error(`${caseId}: keine formtreue Instanz in ${cap} Versuchen`);
  return fallback;
}

const CHOICE_IDS = ['a', 'b', 'c', 'd'];

/** Baut das Standard-Surface einer reinen Choice-Kapsel-Familie: Szenario-Bank
 *  + Antwort-Rotation. Module behalten Bank und Contract, die Generator-/
 *  Solver-Mechanik lebt hier genau einmal. `shapeError` bleibt familienspezifisch,
 *  weil Tests und Fehlertexte auf den Wortlaut pinnen. */
export function makeChoiceFamily({ contract, capsules, shapeError, keyBy = 'difficulty' }) {
  const options = (entry) => [entry.correct, ...entry.wrong];

  const capsuleOk = (parameters, capsule) => {
    try {
      if (!parameters || typeof parameters !== 'object') return false;
      const entry = capsule.bank.find((item) => item.key === parameters.scenario);
      if (!entry) return false;
      return new Set(options(entry)).size === 4;
    } catch { return false; }
  };

  const correctText = (parameters, capsule) => {
    const entry = capsule.bank.find((item) => item.key === parameters?.scenario);
    if (!entry || !capsuleOk(parameters, capsule)) throw new Error(shapeError);
    return entry.correct;
  };

  const genCapsule = (seed, capsule) => {
    const r = rng(seed);
    const entry = pick(r, capsule.bank);
    const opts = options(entry);
    const rotation = variantCaseIndex(seed, opts.length);
    return {
      parameters: { scenario: entry.key },
      expected: { correctChoice: CHOICE_IDS[rotation] },
      choices: buildRotatedChoices(opts, rotation, CHOICE_IDS),
      prompt: entry.prompt,
      fullSolution: entry.solution,
    };
  };

  const generate = ({ seed, caseId, difficulty }) => {
    const capsule = keyBy === 'caseId' ? capsules[caseId] : capsules[difficulty];
    const matches = keyBy === 'caseId' ? capsule?.difficulty === difficulty : capsule?.caseId === caseId;
    if (!capsule || !matches) {
      throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
    }
    const drawn = drawFamilyInstance((subseed) => genCapsule(subseed, capsule), {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => capsuleOk(instance.parameters, capsule),
      profileAccepts: (parameters) => capsuleOk(parameters, capsule),
      profiles: contract.difficultyProfiles,
    });
    return {
      parameters: { caseId, difficulty, ...drawn.parameters },
      expected: { ...drawn.expected },
      choices: drawn.choices,
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
      ...(capsule.competencyIds ? { competencyIds: capsule.competencyIds } : {}),
    };
  };

  const solve = (parameters) => {
    const capsule = keyBy === 'caseId'
      ? capsules[parameters?.caseId]
      : Object.values(capsules).find((item) => item.caseId === parameters?.caseId);
    if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
    return { correctText: correctText(parameters, capsule) };
  };

  return {
    capsuleOk, correctText, genCapsule, generate, solve,
    spec: { ...contract, generate, solve },
  };
}

/** Parametrisierte Choice-Kapsel-Familie: die Seed-Ziehung liefert gerechnete
 *  Parameter (nicht nur einen Bankschlüssel), Optionen/Prompt/Lösung werden aus
 *  den Parametern gebaut und die korrekte Position rotiert. Die Familie liefert
 *  die Hooks — das Kit liefert capsuleOk/correctText/genCapsule/generate/solve.
 *
 *  drawParameters(r, capsule) -> parameters
 *  buildOptions(parameters, capsule) -> [correct, wrong1, wrong2, wrong3]
 *  validate(parameters, capsule) -> boolean  (domainspezifische Kapselform;
 *    ob Optionseindeutigkeit geprueft wird, entscheidet die Familie)
 *  buildPrompt/buildSolution(parameters, capsule) -> string
 *  keyBy 'difficulty' (capsules keyed by profile) oder 'caseId'. */
export function makeChoiceCapsuleFamily({
  contract, capsules, shapeError, keyBy = 'difficulty',
  drawParameters, buildOptions, validate, buildPrompt, buildSolution,
}) {
  const capsuleOk = (parameters, capsule) => {
    try {
      if (!parameters || typeof parameters !== 'object') return false;
      return validate(parameters, capsule);
    } catch { return false; }
  };

  const correctText = (parameters, capsule) => {
    if (!capsuleOk(parameters, capsule)) throw new Error(shapeError);
    return buildOptions(parameters, capsule)[0];
  };

  const genCapsule = (seed, capsule) => {
    const r = rng(seed);
    const parameters = drawParameters(r, capsule);
    const options = buildOptions(parameters, capsule);
    const rotation = variantCaseIndex(seed, options.length);
    return {
      parameters,
      expected: { correctChoice: CHOICE_IDS[rotation] },
      choices: buildRotatedChoices(options, rotation, CHOICE_IDS),
      prompt: buildPrompt(parameters, capsule),
      fullSolution: buildSolution(parameters, capsule),
    };
  };

  const generate = ({ seed, caseId, difficulty }) => {
    const capsule = keyBy === 'caseId' ? capsules[caseId] : capsules[difficulty];
    const matches = keyBy === 'caseId' ? capsule?.difficulty === difficulty : capsule?.caseId === caseId;
    if (!capsule || !matches) {
      throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
    }
    const drawn = drawFamilyInstance((subseed) => genCapsule(subseed, capsule), {
      seed,
      caseId,
      difficulty,
      wantShape: (instance) => capsuleOk(instance.parameters, capsule),
      profileAccepts: (parameters) => capsuleOk(parameters, capsule),
      profiles: contract.difficultyProfiles,
    });
    return {
      parameters: { caseId, difficulty, ...drawn.parameters },
      expected: { ...drawn.expected },
      choices: drawn.choices,
      prompt: drawn.prompt,
      fullSolution: drawn.fullSolution,
    };
  };

  const solve = (parameters) => {
    const capsule = keyBy === 'caseId'
      ? capsules[parameters?.caseId]
      : Object.values(capsules).find((item) => item.caseId === parameters?.caseId);
    if (!capsule) throw new Error(`Unbekannter Fall ${parameters?.caseId}`);
    return { correctText: correctText(parameters, capsule) };
  };

  return {
    capsuleOk, correctText, genCapsule, generate, solve,
    spec: { ...contract, generate, solve },
  };
}
