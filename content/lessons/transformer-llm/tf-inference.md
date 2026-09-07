# Toy-Inferenz: Eine komplette Pipeline im Kleinen

Was passiert, wenn ein Sprachmodell aufgerufen wird? Immer dieselbe Pipeline: **Tokenisieren → Forward-Pass → Logits → Dekodieren**. In dieser Lektion baust du diese Pipeline nach — aber mit einem ehrlichen Etikett.

> **Dies ist eine Toy-Pipeline mit gestellten Gewichten — sie demonstriert Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt lokales Projekt.**

Wir laden keine Modellgewichte, rufen keine API, nutzen kein Netzwerk. Die Gewichte sind kleine **Fixtur-Literale** im Testcode — Zahlen, die wir selbst hinschreiben. Damit ist jeder Ausgangswert bekannt und jede Ausgabe erklärbar.

## Station 1: Tokenisieren

Ein fester Zeichen-Tokenizer (Vokabular aus der letzten Lektion, mit `<eos>`) übersetzt den Text in eine Indizesliste. Encode ist deterministisch: gleicher Text, gleiche Indizes — keine Zufälligkeit an dieser Station.

## Station 2: Forward-Pass mit gestellten Gewichten

Das Toy-Modell besteht aus genau drei Teilen, alle Matrizen sind Literale:

1. **Embedding**: Zeile $i$ der Matrix $E \in \mathbb{R}^{V \times d}$ ersetzt jeden Token-Index durch einen Vektor der Länge $d$ — die Eingabe wird zur Matrix $X \in \mathbb{R}^{n \times d}$.
2. **Ein Attention-Block**: $\mathrm{heads} = \mathrm{softmax}(XW_Q(XW_K)^\top/\sqrt{d})$ mit $W_V$ für die Values — mit kausaler Maske, weil ein Decodermodell nur die Vergangenheit sehen darf. Skalierung durch $\sqrt{d}$ wie in der Lektion „Attention und Transformer-Grundlagen“; wählen wir $d$ als Quadratzahl (etwa $d = 4$), bleibt die Division ganzzahlig.
3. **Logits**: Eine letzte Projektion $W_{\text{out}} \in \mathbb{R}^{d \times V}$ macht aus der letzten Position (oder dem Positionsmittel) einen Vektor von Rohwerten — **Logits**, eines pro Vokabulareintrag.

## Station 3: Logits lesen

Logits sind unnormalisierte Punktzahlen. `softmax` würde sie zu Wahrscheinlichkeiten machen — für die nächste Entscheidung reicht aber der **argmax**: die Position der höchsten Punktzahl. Diese Position ist ein Token-Index; margin = Abstand zum zweithöchsten Logit misst, wie sicher sich das Modell (hier: die Fixtur) ist.

## Station 4: Greedy Decoding

Die Dekodierschleife ist bewusst simpel:

```python
def greedy_decode(step_fn, init_ids, max_len, eos):
    ids = list(init_ids)          # never mutate the caller's list
    while len(ids) < max_len:
        nxt = step_fn(ids)        # toy forward pass -> argmax token
        ids.append(nxt)
        if nxt == eos:
            break
    return ids
```

Drei Verträge halten die Schleife ehrlich:

- **argmax**: immer das Token mit der höchsten Punktzahl — deterministisch, kein Sampling.
- **max_len**: harte Obergrenze; wird sie zuerst erreicht, stoppt die Schleife ohne `<eos>`.
- **eos**: gibt das Modell `<eos>` aus, endet die Folge sofort — mitgezählt, nicht weggeworfen.

## Determinismus als Testfall

An einer Toy-Pipeline ist Determinismus keine Hoffnung, sondern eine prüfbare Eigenschaft: **Doppelaufruf** — `pipeline(text, weights)` zweimal aufgerufen muss byte-identische Ergebnisse liefern (fixe Seeds, keine Globalzustände, kein `np.random` ohne Seed im Lauf). Ist das verletzt, ist die Pipeline wertlos: Man könnte Ergebnisse nicht mehr zuordnen.

Warum trotzdem kein echtes Modell? Ein reales LLM hat Milliarden trainierter Gewichte — die Dateien sind groß, die Läufe teuer, und die Ausgaben wären hier nicht per Hand nachrechenbar. Die **Mechanik** (Stationen, Verträge, Determinismus) ist bei einer Fixtur exakt dieselbe. Wer sie am Toy beherrscht, kann eine echte Inferenz lokal (nanoGPT-artige Projekte) als Vertiefung angehen — als Projekt jenseits dieser Plattform.

## Typische Fehler

- `init_ids` mutiert statt kopiert — die Schleife zerstört die Eingabe des Aufrufers.
- `max_len` als exklusive Grenze falsch interpretiert (`<` vs `<=`): Off-by-one verschiebt die Stoppposition.
- `<eos>` angehängt, aber Schleife läuft weiter — die Folge wächst über das Ende hinaus.
- Argmax über die falsche Achse (Zeilen statt Spalten der Logits).
- Globale Zufallszustände im Forward: der Doppelaufruf-Test fällt durch, obwohl „der Code stimmt".

## Direkter Check

Übe argmax-Entscheidungen in [w24-e2](#/exercise/w24-e2) und [w24-e3](#/exercise/w24-e3). Implementiere die Schleife in [w24-e4](#/exercise/w24-e4), den Toy-Forward-Pass in [w24-e5](#/exercise/w24-e5) und die komplette Pipeline mit Determinismus-Doppelaufruf in [w24-e6](#/exercise/w24-e6).
