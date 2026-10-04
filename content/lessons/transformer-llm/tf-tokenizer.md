# Tokenisierung und Modellfamilien

Jede Chat-Antwort eines Sprachmodells beginnt, bevor das Modell rechnet: Ein Tokenizer zerlegt deinen Text in Zahlen. Wer diese Zerlegung versteht, versteht auch, warum API-Preise in Tokens abgerechnet werden und warum ein Modell manche Wörter „anders sieht“ als du.

## Das Bild dahinter: Lego und Kurzschrift

Stell dir Wörter aus Lego-Bausteinen vor. Häufige Wortstücke bekommen einen eigenen Baustein, seltene werden aus Einzelteilen zusammengesetzt. BPE (englisch *byte pair encoding*) verklebt dabei immer das häufigste Nachbarpaar zu einem neuen Baustein, wie eine Kurzschrift, die häufige Silben abkürzt.

Wo der Vergleich hinkt: Eine Kurzschrift ist für Menschen lesbar gemacht. BPE entscheidet nur nach Häufigkeit; was dabei herauskommt, muss niemand mehr lesen können.

## Zeichen, Wörter, Subwords

Sprachmodelle rechnen nicht mit Buchstaben oder Wörtern, sondern mit **Tokens**: Indizes in ein festes Vokabular. Drei Strategien teilen den Text:

- **Zeichen-Tokenisierung**: Jedes Zeichen ist ein Token. Vokabular winzig, nie ein unbekanntes Token, aber Sequenzen werden lang (deutsch „Donaudampfschifffahrt“ = 21 Tokens).
- **Wort-Tokenisierung**: Jedes Wort ist ein Token. Sequenzen kurz, aber das Vokabular explodiert, und jedes neue Wort (Name, Tippfehler, Flexionsform) ist **OOV** (englisch *out of vocabulary*) und landet in `<unk>`. Damit geht Information verloren.
- **Subword-Tokenisierung** (Kompromiss der großen Modelle): Häufige Wörter bleiben ganz, seltene werden in bekannte Teile zerlegt („unbekannt“ → „un“ + „bekannt“). OOV verschwindet praktisch: Jedes Wort lässt sich notfalls bis auf Zeichenebene zerlegen, die Teile sind bekannt.

## Vokabular, Encode, Decode

Das **Vokabular** ist eine Abbildung Token-String $\to$ Index. Dazu kommen **Sondertokens** wie `<pad>` (Fülltoken für Batches), `<unk>` (Unbekannt), `<bos>`/`<eos>` (Anfang/Ende).

- **Encode**: Text $\to$ Tokenliste. Wortweise Tokenisierer hängen oft einen **End-of-Word-Marker** `</w>` an jedes Wort, damit „Tor“ als Wort von der Zeichenfolge „t“ + „o“ + „r“ innerhalb eines längeren Wortes unterscheidbar bleibt.
- **Decode**: Tokenliste $\to$ Text. Die Grundanforderung an jeden ernsthaften Tokenizer ist der **Round-Trip**: $\mathrm{decode}(\mathrm{encode}(s)) = s$ für jeden legalen String $s$. Verletzt eine Implementierung das, verliert sie Information.

Die Vokabulargröße setzt sich aus drei Posten zusammen:

$$
|\text{Vokabular}| = |\text{Alphabet}| + |\text{Merges}| + |\text{Sondertokens}|.
$$

Jedes gelernte Merge fügt genau ein neues Symbol hinzu.

## Mini-BPE mit festen Regeln

BPE startet mit Zeichen-Symbolen und lernt aus einem Korpus Paare, die oft nebeneinander stehen. Damit der Ablauf reproduzierbar ist, pinnen wir jede Freiheit fest:

1. Jedes Wort wird als Symbolfolge dargestellt, letztes Symbol ist der Marker `</w>`.
2. Zähle alle benachbarten Symbolpaare im Korpus.
3. Wähle das häufigste Paar. **Tie-Break**: Bei gleicher Häufigkeit gewinnt das lexikographisch kleinste Paar.
4. Ersetze im ganzen Korpus jedes Vorkommen dieses Paars durch das verschmolzene Symbol.
5. Zurück zu 2, bis die gewünschte Zahl an Merges erreicht ist.

Beispiel mit Korpus `low`, `low`, `lower`, `lowest`, jedes Wort mit `</w>`: In der ersten Zählung kommt `(l,o)` 4-mal vor und `(o,w)` ebenfalls 4-mal, ein Gleichstand. Lexikographisch ist `("l","o") < ("o","w")`, also wird zuerst `lo` gelernt. Danach zählt `(lo,w)` 4-mal und gewinnt die nächste Runde. In der dritten Runde stehen `("low","</w>")` (2-mal, aus den beiden `low`) und `("low","e")` (2-mal, aus `lower` und `lowest`) gleichauf; der Marker `</w>` ist lexikographisch kleiner als `e`, also wird `low</w>` gelernt. Nach drei Merges steht `lowest` als `low|e|s|t|</w>`: Aus 7 Symbolen (6 Zeichen plus Marker) sind 5 Tokens geworden, ohne dass ein Wort unbekannt bleiben kann. Das Paar `(e,s)` kommt im Korpus nur 1-mal vor und kann daher nie gegen Paare mit Häufigkeit 2 gewinnen.

Beim **Anwenden** einer gelernten Mergetabelle auf ein neues Wort geht man die Tabelle in ihrer Reihenfolge durch und wendet jeden Merge auf alle Vorkommen an: dieselben Regeln, derselbe Marker, dasselbe Ergebnis.

## Modellfamilien und ihre Aufgaben

| Familie | Sichtbarkeit | Beispiel | Typische Aufgaben |
|---|---|---|---|
| **Encoder** (bidirektional) | jedes Token sieht alle | BERT | Klassifikation, Entity-Erkennung, Retrieval-Encoder |
| **Decoder** (kausal) | jedes Token sieht nur die Vergangenheit | GPT | Textgenerierung, autoregressive Fortsetzung |
| **Encoder-Decoder** | Encoder liest alles, Decoder generiert kausal | T5 | Übersetzung, Zusammenfassung |

Die Maskierung aus [Queries, Keys und Values erklären](#/lesson/l-tf-attention) ist der Unterschied im Kern: Decoder nutzen die kausale Maske, Encoder nicht. Daraus folgt auch, warum Decoder natürlich generieren können (jede Position darf nur aus der Vergangenheit vorhersagen) und Encoder besser verstehen (Kontext aus beiden Richtungen).

## Typische Fehler

- Wort-Tokenizer ohne Marker: Präfixe und Komposita kollidieren mit ganzen Wörtern.
- Merge-Tie-Break undefiniert lassen; zwei Implementierungen lernen dann verschiedene Vokabulare.
- OOV stillschweigend wegwerfen statt auf `<unk>` zu mappen oder zu zerlegen.
- Decode mit leerem Padding rechnen und den Round-Trip nie testen.
- Vokabulargröße falsch zählen: Merges und Sondertokens sind separate Posten.

## Wo dir das in der KI begegnet

API-Preise und Kontextlängen werden in Tokens gemessen. Dieselbe Aussage braucht in verschiedenen Sprachen unterschiedlich viele Tokens, je nachdem, auf welchen Texten der Tokenizer trainiert wurde. Wer Token zählt, bevor er promptet, kalkuliert Kosten und Kontext realistisch.

## Direkter Check

Zähle in einer Einstiegsaufgabe Vokabulargrößen nach. Lies in der [Kernaufgabe: Encode-Trace](#/family/trace-assignment-state/char-encode-roundtrip-trace/0/core) einen Encode-Ablauf vorher. In der [Kernaufgabe: Encode/Decode-Round-Trip](#/family/transform-tokenize-roundtrip/char-encode-roundtrip/0/core) baust du Encode/Decode mit Round-Trip-Garantie; die [Vertiefungsaufgabe: BPE-Merges anwenden](#/family/transform-bpe-merge-apply/bpe-merge-apply/0/stretch) wendet eine feste Mergetabelle an; die [Herausforderung](#/family/optimize-bpe-merge-learn/bpe-merge-learn/0/challenge) lernt Merges mit gepinntem Tie-Break.

## Begriffe auf einen Blick

- **Token**: Index in ein festes Vokabular; die Einheit, mit der Sprachmodelle rechnen.
- **Vokabular** (englisch *vocabulary*): die feste Abbildung von Token-Strings auf Indizes.
- **Encode/Decode**: Übersetzung Text zu Tokenliste und zurück; der Round-Trip muss den Ausgangstext exakt liefern.
- **Subword** (englisch *subword token*): Wortteil unter Wortebene; macht seltene Wörter aus bekannten Teilen.
- **BPE** (englisch *byte pair encoding*): Lernverfahren, das schrittweise das häufigste Nachbarpaar zu einem neuen Symbol verschmilzt.
- **Merge-Regel**: ein gelerntes Paar in der BPE-Tabelle; wird in fester Reihenfolge angewendet.
- **Sondertoken** (englisch *special token*): Steuerzeichen im Vokabular wie `<pad>`, `<unk>`, `<bos>` oder `<eos>`.
- **Modellfamilie**: Einteilung in Encoder, Decoder und Encoder-Decoder, je nachdem, welche Token einander sehen dürfen.
