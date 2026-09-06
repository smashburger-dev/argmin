# Tokenisierung und Modellfamilien

Sprachmodelle rechnen nicht mit Buchstaben oder Wörtern, sondern mit **Tokens**: Indizes in ein festes Vokabular. Tokenisierung ist die Brücke zwischen Text und Zahlen — und sie ist deterministisch definiert oder sie ist kaputt.

## Zeichen, Wörter, Subwords

- **Zeichen-Tokenisierung**: Jedes Zeichen ist ein Token. Vokabular winzig, nie ein unbekanntes Token — aber Sequenzen werden lang (deutsch „Donaudampfschifffahrt“ = 21 Tokens).
- **Wort-Tokenisierung**: Jedes Wort ist ein Token. Sequenzen kurz — aber das Vokabular explodiert, und jedes neue Wort (Name, Tippfehler, Flexionsform) ist **OOV** (out of vocabulary) und landet in `<unk>`. Damit geht Information verloren.
- **Subword-Tokenisierung** (Kompromiss der großen Modelle): Häufige Wörter bleiben ganz, seltene werden in bekannte Teile zerlegt („unbekannt“ → „un“ + „bekannt“). OOV verschwindet praktisch: Jedes Wort lässt sich notfalls bis auf Zeichenebene zerlegen, die Teile sind bekannt.

## Vokabular, Encode, Decode

Das Vokabular ist eine Abbildung Token-String $\to$ Index. Dazu kommen **Sondertokens** wie `<pad>` (Fülltoken für Batches), `<unk>` (Unbekannt), `<bos>`/`<eos>` (Anfang/Ende).

- **Encode**: Text $\to$ Tokenliste. Wortweise Tokenisierer hängen oft einen **End-of-Word-Marker** `</w>` an jedes Wort, damit „Tor“ als Wort von der Zeichenfolge „t“+„o“+„r“ innerhalb eines längeren Wortes unterscheidbar bleibt.
- **Decode**: Tokenliste $\to$ Text. Die Grundanforderung an jeden ernsthaften Tokenizer ist der **Round-Trip**: $\mathrm{decode}(\mathrm{encode}(s)) = s$ für jeden legalen String $s$. Verletzt eine Implementierung das, verliert sie Information.

Zeichen-Vokabulare mit Marker: $\text{Vokabular} = |\text{Alphabet}| + |\text{Merges}| + |\text{Sondertokens}|$ — jedes gelernte Merge fügt genau ein neues Symbol hinzu.

## Mini-BPE mit festen Regeln

Byte-Pair-Encoding startet mit Zeichen-Symbolen und lernt aus einem Korpus Paare, die oft nebeneinander stehen. Damit der Ablauf **reproduzierbar** ist, pinnen wir jede Freiheit fest:

1. Jedes Wort wird als Symbolfolge dargestellt, letztes Symbol ist der Marker `</w>`.
2. Zähle alle benachbarten Symbolpaare im Korpus.
3. Wähle das häufigste Paar. **Tie-Break**: Bei gleicher Häufigkeit gewinnt das **lexikographisch kleinste** Paar.
4. Ersetze im ganzen Korpus jedes Vorkommen dieses Paars durch das verschmolzene Symbol.
5. Zurück zu 2 — bis die gewünschte Zahl an Merges erreicht ist.

**Beispiel** (Korpus: `low`, `low`, `lower`, `lowest`, jedes Wort mit `</w>`): Erste Zählung: `(l,o)` kommt 4-mal vor, `(o,w)` ebenfalls 4-mal — Gleichstand. Lexikographisch ist `("l","o") < ("o","w")`, also wird zuerst `lo` gelernt. Danach zählt `(lo,w)` 4-mal und gewinnt die nächste Runde. In der dritten Runde stehen `("low","</w>")` (2-mal, aus den beiden `low`) und `("low","e")` (2-mal, aus `lower` und `lowest`) gleichauf — der Marker `</w>` ist lexikographisch kleiner als `e`, also wird `low</w>` gelernt. Nach drei Merges steht `lowest` als `low|e|s|t|</w>` — aus 7 Symbolen (6 Zeichen plus Marker) sind 5 Tokens geworden, ohne dass ein Wort Unbekannt bleiben kann. Das Paar `(e,s)` kommt im Korpus nur 1-mal vor und kann daher nie gegen Paare mit Häufigkeit 2 gewinnen.

Beim **Anwenden** einer gelernten Mergetabelle auf ein neues Wort geht man die Tabelle in ihrer Reihenfolge durch und wendet jeden Merge auf alle Vorkommen an — dieselben Regeln, derselbe Marker, dasselbe Ergebnis.

## Modellfamilien und ihre Aufgaben

| Familie | Sichtbarkeit | Beispiel | Typische Aufgaben |
|---|---|---|---|
| **Encoder** (bidirektional) | jedes Token sieht alle | BERT | Klassifikation, Entity-Erkennung, Retrieval-Encoder |
| **Decoder** (kausal) | jedes Token sieht nur die Vergangenheit | GPT | Textgenerierung, autoregressive Fortsetzung |
| **Encoder-Decoder** | Encoder liest alles, Decoder generiert kausal | T5 | Übersetzung, Summarisierung |

Die Maskierung aus der Attention-Lektion ist der Unterschied im Kern: Decoder nutzen die kausale Maske, Encoder nicht. Daraus folgt auch, warum Decoder natürlich generieren können (jede Position darf nur aus der Vergangenheit vorhersagen) und Encoder besser verstehen (Kontext aus beiden Richtungen).

## Typische Fehler

- Wort-Tokenizer ohne Marker: Präfixe/Komposita kollidieren mit ganzen Wörtern.
- Merge-Tie-Break undefiniert lassen — zwei Implementierungen lernen verschiedene Vokabulare.
- OOV stillschweigend wegwerfen statt `<unk>` zu mappen oder zu zerlegen.
- Decode mit leerem Padding rechnen und den Round-Trip nie zu testen.
- Vokabulargröße falsch zählen: Merges und Sondertokens sind separate Posten.

## Direkter Check

Zähle in [w23-e2](#/exercise/w23-e2) Vokabulargrößen nach. Lies in [w23-e3](#/exercise/w23-e3) einen Encode-Ablauf vorher. In [w23-e4](#/exercise/w23-e4) baust du Encode/Decode mit Round-Trip-Garantie; [w23-e5](#/exercise/w23-e5) wendet eine feste Mergetabelle an; [w23-e6](#/exercise/w23-e6) lernt Merges mit gepinntem Tie-Break — der Endgegner der Woche.
