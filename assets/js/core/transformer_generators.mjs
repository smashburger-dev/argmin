// Seeded generators for transformers and LLM foundations,
// ADR-0013. Same house rules as the other generator modules:
//   - mulberry32 rng, identical to the foundations, linalg, and data-ML modules;
//   - every generator returns { parameters, expected, prompt, fullSolution };
//   - `expected` is always an exact integer (softmax weights and other
//     decimals are graded through python-code tasks, never through the
//     numeric grader);
//   - answer spaces are deliberately wide (>= 20 distinct expected values
//     over 2000 seeds, enforced by the transformer generator tests);
//   - variation is semantic (shape role, framing, metric), never just noise:
//     every family mixes >= 3 prompt shapes;
//   - the answer never appears as a standalone number in the prompt (a
//     bounded redraw guard enforces this), while full solutions always
//     contain it;
//   - degenerate draws are retried with a bounded guard.

// --- W22: attention shapes, masks, scaling -----------------------------------------

import { bindFamilyDraw, pick, randInt, rng } from './generator_draw_kit.mjs';

const { until, clean } = bindFamilyDraw({ maxTries: 96, scope: 'transformer_generators' });

export function genAttentionShape(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['score-cells', 'output-cells', 'mask-cells', 'scale-divisor']);
    if (variant === 'score-cells') {
      const n = randInt(r, 3, 14);
      const m = randInt(r, 3, 14);
      const dk = pick(r, [4, 8, 16, 32, 64]);
      const answer = n * m;
      return {
        parameters: { variant, n, m, dk },
        expected: answer,
        prompt: `Eine Attention-Berechnung hat Queries als Matrix Q mit ${n} Zeilen und ${dk} Spalten und Keys als Matrix K mit ${m} Zeilen und ${dk} Spalten. Die Score-Matrix S = Q·K^T entsteht zeilenweise aus den Skalarprodukten. Wie viele Zellen hat S insgesamt?`,
        fullSolution: `S = Q·K^T hat eine Zeile je Query und eine Spalte je Key: ${n} · ${m} = ${answer} Zellen.`,
      };
    }
    if (variant === 'output-cells') {
      const n = randInt(r, 3, 14);
      const dv = randInt(r, 2, 12);
      const m = randInt(r, 3, 14);
      const answer = n * dv;
      return {
        parameters: { variant, n, m, dv },
        expected: answer,
        prompt: `Nach dem Softmax gewichtet Attention die Values. V ist eine ${m}×${dv}-Matrix, die Attention-Gewichte A haben ${n} Zeilen und ${m} Spalten. Wie viele Zellen hat die Ausgabe A·V?`,
        fullSolution: `A·V erbt die Zeilenzahl von A (${n}) und die Spaltenzahl von V (${dv}): ${n} · ${dv} = ${answer} Zellen.`,
      };
    }
    if (variant === 'mask-cells') {
      const n = randInt(r, 4, 16);
      const answer = (n * (n - 1)) / 2;
      return {
        parameters: { variant, n },
        expected: answer,
        prompt: `Ein Decoder darf beim Token ${n} nur die Tokens 1 bis ${n} sehen (kausale Maske): alle Score-Zellen, in denen ein Token auf ein späteres Token schaut, werden vor dem Softmax auf −∞ gesetzt. Wie viele Zellen einer ${n}×${n}-Score-Matrix werden so verdeckt?`,
        fullSolution: `Verdeckt sind die Zellen oberhalb der Diagonale: ${n}·(${n}−1)/2 = ${answer} Zellen.`,
      };
    }
    const d = pick(r, [2, 3, 4, 5, 6, 7, 8]);
    const dk = d * d;
    const n = randInt(r, 3, 12);
    const answer = d;
    return {
      parameters: { variant, n, dk },
      expected: answer,
      prompt: `Scaled Dot-Product Attention teilt die Skalarprodukte vor dem Softmax durch die Wurzel der Key-Modellgröße. In einem Block ist d_k = ${dk} und Q hat ${n} Zeilen. Durch welche ganze Zahl werden alle Einträge von Q·K^T dividiert?`,
      fullSolution: `sqrt(${dk}) = ${d}, also wird Q·K^T durch ${answer} geteilt.`,
    };
  });
}

// --- W23: vocabulary accounting under BPE merges -----------------------------------

export function genVocabAfterMerges(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['total', 'merges-needed', 'specials-count']);
    const chars = randInt(r, 24, 48);
    if (variant === 'total') {
      const merges = randInt(r, 10, 90);
      const specials = randInt(r, 3, 8);
      const answer = chars + merges + specials;
      return {
        parameters: { variant, chars, merges, specials },
        expected: answer,
        prompt: `Ein Subword-Tokenizer startet mit ${chars} Zeichen-Tokens. Ein BPE-Lauf lernt ${merges} Merges; jeder Merge fügt genau ein neues Symbol ins Vokabular ein. Zusätzlich kommen ${specials} Sondertokens (etwa <pad>, <unk>, <eos>) dazu. Wie groß ist das Vokabular danach?`,
        fullSolution: `Vokabular = Zeichen ${chars} + Merges ${merges} + Sondertokens ${specials} = ${answer}.`,
      };
    }
    if (variant === 'merges-needed') {
      const specials = randInt(r, 3, 8);
      const merges = randInt(r, 10, 90);
      const target = chars + merges + specials;
      const answer = merges;
      return {
        parameters: { variant, chars, specials, target },
        expected: answer,
        prompt: `Ein Tokenizer-Vokabular soll ${target} Einträge haben. Gestartet wird mit ${chars} Zeichen-Tokens, dazu kommen ${specials} Sondertokens. Jeder BPE-Merge fügt genau ein neues Symbol hinzu. Wie viele Merges müssen gelernt werden?`,
        fullSolution: `Merges = Ziel − Zeichen − Sondertokens = ${target} − ${chars} − ${specials} = ${answer}.`,
      };
    }
    const merges = randInt(r, 10, 90);
    const specials = randInt(r, 3, 8);
    const target = chars + merges + specials;
    const answer = specials;
    return {
      parameters: { variant, chars, merges, target },
      expected: answer,
      prompt: `Ein Vokabular hat nach dem Training ${target} Einträge: ${chars} Zeichen-Tokens am Anfang und ${merges} durch BPE-Merges gelernte Symbole. Wie viele Sondertokens (<pad>, <unk>, …) wurden zusätzlich reserviert?`,
      fullSolution: `Sondertokens = ${target} − ${chars} − ${merges} = ${answer}.`,
    };
  });
}

// --- W24: greedy decoding mechanics --------------------------------------------------

export function genGreedyToken(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['argmax-position', 'margin', 'decode-length']);
    if (variant === 'argmax-position') {
      const width = pick(r, [4, 5, 6]);
      const draw = (rr) => {
        const ids = [];
        const logits = [];
        while (logits.length < width) {
          const value = randInt(rr, -9, 30);
          if (!logits.includes(value)) logits.push(value);
        }
        while (ids.length < width) {
          const value = randInt(rr, 0, 99);
          if (!ids.includes(value)) ids.push(value);
        }
        return { ids, logits };
      };
      const { ids, logits } = until(r, draw, (d) => {
        const pos = 1 + d.logits.indexOf(Math.max(...d.logits));
        return pos > 2 && !d.logits.includes(pos) && !d.ids.includes(pos);
      });
      const answer = 1 + logits.indexOf(Math.max(...logits));
      const pairs = ids.map((id, i) => `${id}:${logits[i]}`).join(', ');
      return {
        parameters: { variant, ids, logits },
        expected: answer,
        prompt: `Greedy Decoding wählt immer den Kandidaten mit der höchsten Punktzahl. Die Kandidaten-Liste eines Schritts lautet (Token:Punktzahl) ${pairs}. An welcher Position der Liste (1-basiert, von links) steht der gewählte Kandidat?`,
        fullSolution: `Höchste Punktzahl ist ${Math.max(...logits)} an Position ${answer} — dieser Kandidat wird als nächstes Token gewählt.`,
      };
    }
    if (variant === 'margin') {
      const width = pick(r, [4, 5]);
      const draw = (rr) => Array.from({ length: width }, () => randInt(rr, 10, 99));
      const logits = until(r, draw, (ls) => {
        const sorted = [...ls].sort((a, b) => b - a);
        const margin = sorted[0] - sorted[1];
        return margin >= 2 && !ls.includes(margin) && sorted[0] > sorted[1];
      });
      const sorted = [...logits].sort((a, b) => b - a);
      const answer = sorted[0] - sorted[1];
      return {
        parameters: { variant, logits },
        expected: answer,
        prompt: `Beim Greedy Decoding bekommt ein Schritt die Kandidaten-Punktzahlen ${logits.join(', ')}. Wie groß ist der Abstand zwischen der höchsten und der zweithöchsten Punktzahl (der Sicherheitsabstand der argmax-Entscheidung)?`,
        fullSolution: `Höchste Punktzahl ${sorted[0]}, zweithöchste ${sorted[1]}: Abstand = ${sorted[0]} − ${sorted[1]} = ${answer}.`,
      };
    }
    const init = randInt(r, 2, 6);
    const steps = randInt(r, 1, 5);
    const maxLen = init + steps + randInt(r, 1, 4);
    const answer = init + steps;
    return {
      parameters: { variant, init, steps, maxLen },
      expected: answer,
      prompt: `Eine Greedy-Decoding-Schleife startet mit ${init} Tokens und hängt pro Schritt genau ein Token an. Nach ${steps} weiteren Schritten gibt das Modell das <eos>-Token aus und stoppt; die Längenbegrenzung von ${maxLen} Tokens wird nicht erreicht. Wie lang ist die Tokenfolge am Ende?`,
      fullSolution: `${init} Start-Tokens + ${steps} angehängte Schritte (das letzte ist <eos>) = ${answer} Tokens.`,
    };
  });
}

// --- W25: LoRA parameter accounting ---------------------------------------------------

export function genLoraParamCount(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['lora', 'full', 'saved']);
    const dIn = 16 * randInt(r, 4, 32);
    const dOut = 16 * randInt(r, 4, 32);
    const rank = pick(r, [2, 4, 8, 16]);
    const lora = rank * (dIn + dOut);
    const full = dIn * dOut;
    if (variant === 'lora') {
      return {
        parameters: { variant, dIn, dOut, rank },
        expected: lora,
        prompt: `LoRA friert die Matrix W (${dOut}×${dIn}) ein und lernt nur ΔW = B·A mit A als ${rank}×${dIn}-Matrix und B als ${dOut}×${rank}-Matrix (Skalierung α/r frei gewählt). Wie viele freie Parameter haben A und B zusammen?`,
        fullSolution: `A trägt ${rank}·${dIn} Parameter, B trägt ${dOut}·${rank}: ${rank}·(${dIn} + ${dOut}) = ${lora}.`,
      };
    }
    if (variant === 'full') {
      return {
        parameters: { variant, dIn, dOut, rank },
        expected: full,
        prompt: `Voll-Fine-Tuning aktualisiert jede Gewichtsform. Für eine einzelne Schichtmatrix W (${dOut}×${dIn}) wird stattdessen LoRA mit Rang ${rank} verwendet. Wie viele Parameter hätte die Schicht bei vollem Fine-Tuning (nur W gezählt)?`,
        fullSolution: `Volle Matrix: ${dOut}·${dIn} = ${full} Parameter — dagegen LoRA mit Rang ${rank} nur ${rank}·(${dIn} + ${dOut}) = ${lora}.`,
      };
    }
    const answer = full - lora;
    return {
      parameters: { variant, dIn, dOut, rank },
      expected: answer,
      prompt: `Eine Schichtmatrix W ist ${dOut}×${dIn} groß. Statt vollem Fine-Tuning wird LoRA mit Rang ${rank} trainiert (ΔW = B·A). Wie viele Parameter weniger werden trainiert, gegenüber dem vollen Fine-Tuning dieser einen Matrix?`,
      fullSolution: `Voll: ${dOut}·${dIn} = ${full}. LoRA: ${rank}·(${dIn} + ${dOut}) = ${lora}. Ersparnis: ${full} − ${lora} = ${answer}.`,
    };
  });
}

// --- W26: relative vs. absolute improvement ---------------------------------------------

export function genRelativeGain(seed) {
  const random = rng(seed);
  return clean(random, (r) => {
    const variant = pick(r, ['pp-accuracy', 'relative-percent', 'error-reduction', 'count-gain']);
    if (variant === 'pp-accuracy') {
      const base = randInt(r, 40, 84);
      const gain = randInt(r, 1, 14);
      const answer = gain;
      const newer = base + gain;
      return {
        parameters: { variant, base, newer },
        expected: answer,
        prompt: `Ein Paper meldet für dieselbe Aufgabe eine Baseline-Accuracy von ${base} % und das eigene System mit ${newer} %. Wie hoch ist die absolute Verbesserung in Prozentpunkten?`,
        fullSolution: `Absolut: ${newer} % − ${base} % = ${answer} Prozentpunkte.`,
      };
    }
    if (variant === 'relative-percent') {
      const base = pick(r, [20, 25, 40, 50, 80, 100, 200, 250, 400, 500]);
      const factor = randInt(r, 1, 19);
      const gain = (base * factor) / 100;
      const newer = base + gain;
      const answer = factor;
      return {
        parameters: { variant, base, newer },
        expected: answer,
        prompt: `Eine Metrik steigt von ${base} auf ${newer}. Wie hoch ist die relative Verbesserung in ganzen Prozent (also 100·(neu − alt)/alt)?`,
        fullSolution: `Relativ: 100·(${newer} − ${base})/${base} = 100·${gain}/${base} = ${answer} %.`,
      };
    }
    if (variant === 'error-reduction') {
      const eBase = pick(r, [20, 25, 40, 50, 80, 100, 200]);
      const factor = randInt(r, 5, 60);
      const reduced = (eBase * factor) / 100;
      const eNew = eBase - reduced;
      const answer = factor;
      return {
        parameters: { variant, eBase, eNew },
        expected: answer,
        prompt: `Die Fehlerrate eines Systems sinkt von ${eBase} auf ${eNew}. Um wie viel Prozent wird der Fehler relativ reduziert (ganze Prozent, 100·(alt − neu)/alt)?`,
        fullSolution: `Relative Reduktion: 100·(${eBase} − ${eNew})/${eBase} = 100·${reduced}/${eBase} = ${answer} %.`,
      };
    }
    const n = pick(r, [20, 25, 40, 50, 100, 200]);
    const c1 = randInt(r, Math.floor(n / 4), Math.floor(n / 2));
    const c2 = randInt(r, c1 + 1, n);
    const answer = c2 - c1;
    return {
      parameters: { variant, n, c1, c2 },
      expected: answer,
      prompt: `Auf ${n} Testbeispielen klassifiziert die Baseline ${c1} Beispiele korrekt, das neue System ${c2}. Wie viele zusätzliche korrekte Beispiele bringt das neue System?`,
      fullSolution: `Zusätzliche korrekte Beispiele: ${c2} − ${c1} = ${answer}.`,
    };
  });
}
