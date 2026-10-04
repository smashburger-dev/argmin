# Toy-Inferenz: Eine komplette Pipeline im Kleinen

Jede Chat-Antwort entsteht Token für Token in derselben Schleife: **Tokenisieren → Forward-Pass → Logits → Dekodieren**. In dieser Lektion baust du diese Pipeline nach, aber mit einem ehrlichen Etikett.

> **Dies ist eine Toy-Pipeline mit gestellten Gewichten: Sie demonstriert Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt lokales Projekt.**

Wir laden keine Modellgewichte, rufen keine API, nutzen kein Netzwerk. Die Gewichte sind kleine **Fixtur-Literale** im Testcode, Zahlen, die wir selbst hinschreiben. Damit ist jeder Ausgangswert bekannt und jede Ausgabe erklärbar.

## Das Bild dahinter: Fließband und Navi

Stell dir ein Fließband mit vier Stationen vor: Der Text kommt als Rohmaterial an, jede Station übergibt ihr Ergebnis an die nächste. Für Greedy Decoding ein zweites Bild: ein Navi, das an jeder Kreuzung die im Moment kürzeste Straße nimmt, ohne zu prüfen, ob der Gesamtweg der kürzeste ist.

Wo der Vergleich hinkt: Ein echtes Fließband kehrt nicht zurück. Die Dekodierschleife füttert jedes neue Token wieder vorne ein, bis das Ende-Token kommt oder die Längengrenze greift.

## Station 1: Tokenisieren

Ein fester Zeichen-Tokenizer (Vokabular aus [Tokenisierung mit Folgen vergleichen](#/lesson/l-tf-tokenizer), mit `<eos>`) übersetzt den Text in eine Indizesliste. Encode ist deterministisch: gleicher Text, gleiche Indizes, keine Zufälligkeit an dieser Station.

## Station 2: Forward-Pass mit gestellten Gewichten

Der [Forward-Pass](#/glossary/forward-pass) ist der Vorwärtsdurchlauf von Eingabe zu Ausgabe. Das Toy-Modell besteht aus genau drei Teilen; alle Matrizen sind Literale:

1. **Embedding**: Zeile $i$ der Matrix $E \in \mathbb{R}^{V \times d}$ ersetzt jeden Token-Index durch einen Vektor der Länge $d$; die Eingabe wird zur Matrix $X \in \mathbb{R}^{n \times d}$.
2. **Ein Attention-Block**: $\mathrm{heads} = \mathrm{softmax}(XW_Q(XW_K)^\top/\sqrt{d})$ (sprich: Köpfe gleich Softmax von X mal W-Q mal X mal W-K transponiert, geteilt durch Wurzel d), mit $W_V$ für die Values und kausaler Maske, weil ein Decodermodell nur die Vergangenheit sehen darf. Die Skalierung durch $\sqrt{d}$ kommt aus [Queries, Keys und Values erklären](#/lesson/l-tf-attention); wählen wir $d$ als Quadratzahl (etwa $d = 4$), bleibt die Division ganzzahlig.
3. **Logits**: Eine letzte Projektion $W_{\text{out}} \in \mathbb{R}^{d \times V}$ macht aus der letzten Position (oder dem Positionsmittel) einen Vektor von Rohwerten, die **Logits**, einer pro Vokabulareintrag.

## Station 3: Logits lesen

Logits sind unnormalisierte Punktzahlen. Die [Softmax](#/glossary/softmax) würde sie zu Wahrscheinlichkeiten machen; für die nächste Entscheidung reicht aber der **argmax**, die Position der höchsten Punktzahl (sprich: argmax, das Argument des Maximums). Diese Position ist ein Token-Index. Der Abstand zum zweithöchsten Logit misst, wie sicher sich das Modell (hier: die Fixtur) ist.

## Station 4: Greedy Decoding

**Greedy Decoding** (englisch *greedy decoding*) heißt: an jedem Schritt das Token mit der höchsten Punktzahl nehmen. Die Dekodierschleife ist bewusst simpel:

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

- **argmax**: immer das Token mit der höchsten Punktzahl, deterministisch, kein Sampling.
- **max_len**: harte Obergrenze; wird sie zuerst erreicht, stoppt die Schleife ohne `<eos>`.
- **eos**: gibt das Modell `<eos>` aus, endet die Folge sofort, mitgezählt, nicht weggeworfen.

## Determinismus als Testfall

An einer Toy-Pipeline ist Determinismus keine Hoffnung, sondern eine prüfbare Eigenschaft: **Doppelaufruf**. `pipeline(text, weights)` zweimal aufgerufen muss byte-identische Ergebnisse liefern (fixe Seeds, keine Globalzustände, kein `np.random` ohne [Seed](#/glossary/seed) im Lauf). Ist das verletzt, ist die Pipeline wertlos: Man könnte Ergebnisse nicht mehr zuordnen.

Warum trotzdem kein echtes Modell? Ein reales LLM hat Milliarden trainierter Gewichte; die Dateien sind groß, die Läufe teuer, und die Ausgaben wären hier nicht per Hand nachrechenbar. Die **Mechanik** (Stationen, Verträge, Determinismus) ist bei einer Fixtur exakt dieselbe. Wer sie am Toy beherrscht, kann eine echte Inferenz lokal (nanoGPT-artige Projekte) als Vertiefung angehen, als Projekt jenseits dieser Plattform.

## Typische Fehler

- `init_ids` mutiert statt kopiert; die Schleife zerstört die Eingabe des Aufrufers.
- `max_len` als exklusive Grenze falsch interpretiert (`<` vs `<=`): Off-by-one verschiebt die Stoppposition.
- `<eos>` angehängt, aber Schleife läuft weiter; die Folge wächst über das Ende hinaus.
- Argmax über die falsche Achse (Zeilen statt Spalten der Logits).
- Globale Zufallszustände im Forward: der Doppelaufruf-Test fällt durch, obwohl „der Code stimmt“.

## Wo dir das in der KI begegnet

Jede Chat-Antwort entsteht in genau dieser Schleife. Statt Greedy wird oft mit Temperatur gesampelt: Die Logits werden vor dem Softmax durch eine Temperatur $T$ geteilt. Bei $T > 1$ wird die Verteilung flacher, bei $T \to 0$ nähert sie sich argmax an.

## Direkter Check

Übe argmax-Entscheidungen in einer Einstiegsaufgabe und bearbeite die [Kernaufgabe: Dekodierschleife-Trace](#/family/optimize-decode-greedy-loop/greedy-loop-trace/0/core). Implementiere die Schleife in der [Kernaufgabe: greedy_decode](#/family/optimize-decode-greedy-loop/greedy-decode-function/0/core), den Toy-Forward-Pass in der [Vertiefungsaufgabe: Toy-Forward-Pass](#/family/optimize-softmax-attention-mask/toy-forward-pass/0/stretch) und schließlich die komplette Pipeline mit Determinismus-Doppelaufruf in der [Herausforderung](#/family/compose-toy-inference-pipeline/toy-inference-pipeline/0/challenge).

## Begriffe auf einen Blick

- **Logit**: unnormalisierte Punktzahl eines Vokabular-Eintrags; der argmax darüber wählt das nächste Token.
- **Greedy Decoding**: Dekodierstrategie, die in jedem Schritt das Token mit der höchsten Punktzahl wählt.
- **argmax**: Position des größten Werts in einem Vektor; hier der Index des nächsten Tokens.
- **Ende-Token** (englisch *end-of-sequence token*): Sondertoken `<eos>`, das die generierte Folge abschließt.
- **Determinismus**: gleiche Eingabe und gleiche Gewichte liefern byte-identisch dieselbe Ausgabe.
