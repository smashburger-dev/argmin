# Algebra als überprüfbare Umformung

Fast jede Formel, die dir in KI-Texten begegnet, ist eine Gleichung: Verlust gleich Summe der Fehler, neues Gewicht gleich altes Gewicht minus Schritt. Wer Gleichungen sicher umformt, kann solche Formeln lesen statt nur anzustarren. Hier lernst du die eine Regel, die alles trägt, und den Logarithmus, der hinter Log-Loss und Bit-Rechnungen steckt.

## Das Bild dahinter: die Balkenwaage

Eine **Gleichung** behauptet, dass zwei Ausdrücke denselben Wert haben. Stell dir eine Balkenwaage vor: links und rechts liegt gleich viel Gewicht; die Waage ist im Gleichgewicht. Was du auf einer Seite tust, musst du auf der anderen Seite genauso tun. Nimmst du links 3 weg und rechts 3 weg, bleibt die Waage im Gleichgewicht. Verdoppelst du beide Seiten, ebenfalls.

Die Zuordnung:

- die zwei Waagschalen: die beiden Seiten der Gleichung
- das Gewicht in einer Schale: der Wert des Ausdrucks
- eine erlaubte Umformung: dieselbe Operation auf beiden Seiten

Die Menge aller Werte, die die Waage im Gleichgewicht halten, heißt **Lösungsmenge**. Jede erlaubte Operation lässt die Lösungsmenge unverändert, darum heißt sie Äquivalenzumformung.

Wo der Vergleich hinkt: Auf einer Waage gibt es keine negativen Gewichte, in einer Gleichung schon. Und Teilen durch einen Ausdruck ist nur erlaubt, wenn dieser Ausdruck nicht null sein kann; die Waage hilft dir bei dieser Bedingung nicht weiter.

## Durchgerechnetes Beispiel

Löse $5x - 7 = 2x + 8$. Steht eine Klammer im Weg, multipliziere sie zuerst aus; hier ist keine nötig.

1. **x-Terme auf einer Seite sammeln**: Subtrahiere $2x$ auf beiden Seiten: $3x - 7 = 8$.
2. **Konstanten auf die andere Seite bringen**: Addiere $7$ auf beiden Seiten: $3x = 15$.
3. **Nach x auflösen**: Teile beide Seiten durch $3$: $x = 5$.
4. **Probe im Original: dein Zug**: Setze $x = 5$ ein und rechne beide Seiten aus: links $5 \cdot 5 - 7 = ???$, rechts $2 \cdot 5 + 8 = ???$. Beide Seiten müssen denselben Wert ergeben.

Die Probe ist kein Schmuck am Ende. Sie trennt einen plausibel aussehenden Rechenweg von einer bestätigten Lösung.

## Potenzen zählen Vervielfachungen

In $a^n$ heißt $a$ die **Basis** und $n$ der **Exponent**; gesprochen „$a$ hoch $n$“. Der Exponent zählt, wie oft die Basis mit sich selbst multipliziert wird: $2^4 = 2 \cdot 2 \cdot 2 \cdot 2 = 16$.

Daraus folgen zwei Regeln. Multiplizierst du zwei Potenzen mit gleicher Basis, addieren sich die Exponenten:

$$a^m \cdot a^n = a^{m+n}.$$

Beispiel: $2^3 \cdot 2^4 = 2^{3+4} = 2^7 = 128$, weil du drei Zweien und vier Zweien zu sieben Zweien zusammenlegst.

Wird eine Potenz erneut potenziert, multiplizieren sich die Exponenten:

$$(a^m)^n = a^{m \cdot n}.$$

Beispiel: $(3^2)^3 = 3^{2 \cdot 3} = 3^6 = 729$, denn $3^2 \cdot 3^2 \cdot 3^2$ enthält dreimal zwei Dreier. Beide Regeln gelten nicht für eine Addition wie $a^m + a^n$.

## Logarithmus: die Exponentenfrage

Der **Logarithmus** dreht die Frage um. Nicht „was kommt bei $2^5$ heraus“, sondern „welcher Exponent liefert 32?“. Ein Mini-Bild dafür: Starte bei 1 und verdopple:

$$1 \to 2 \to 4 \to 8 \to 16 \to 32.$$

Das sind 5 Verdopplungen, also $\log_2(32) = 5$, gesprochen „Logarithmus von 32 zur Basis 2“. Allgemein ist $\log_2(y)$ die Zahl $k$ mit $2^k = y$. Bei Unsicherheit übersetze eine Logarithmusaufgabe immer in diese Potenzform zurück.

Logarithmen zur Basis 2 zählen also Verdopplungen, zur Basis 10 Zehnerpotenzen. Werte zwischen zwei Potenzen liegen zwischen den ganzen Antworten: $\log_2(50)$ liegt zwischen 5 und 6, weil 50 zwischen $2^5 = 32$ und $2^6 = 64$ liegt.

## Wo dir das in der KI begegnet

Lernraten werden als Zehnerpotenzen geschrieben: $10^{-3}$ bedeutet $\frac{1}{10^3} = 0{,}001$, ein Tausendstel. Wenn eine Anleitung „Lernrate $10^{-4}$ bis $10^{-2}$“ empfiehlt, probierst du Werte im Abstand von Faktor zehn: 0,0001, 0,001, 0,01.

Bits sind Exponenten zur Basis 2. Das Modell GPT-2 hat ein Vokabular von 50 257 Tokens; eine Token-ID braucht deshalb $\log_2(50\,257) \approx 15{,}6$ Bit, also 16 Bit gerundet. Dieselbe Rechnung steckt in der Frage, wie viele Bits ein Merkmal mit $n$ Ausprägungen braucht.

Der Logarithmus steckt außerdem im Log-Loss, dem Verlust der logistischen Regression: Dort kostet eine Vorhersage $-\log(p)$; je kleiner die Wahrscheinlichkeit $p$ für die richtige Klasse, desto größer der Verlust. Mehr dazu in der Lektion [Sigmoid auswerten und Labels setzen](#/lesson/l-ml-logistic).

## Typische Fehler

- Ein Vorzeichen ändert sich nicht von selbst, sondern weil du einen [Term](#/glossary/term) auf beiden Seiten addierst oder subtrahierst.
- Aus $a^m + a^n$ wird nicht $a^{m+n}$. Die Regel gilt nur für Multiplikation.
- Basis und Exponent vertauschen: $2^3 = 8$, aber $3^2 = 9$.
- Durch einen Ausdruck teilen, der null sein kann. Prüfe die Bedingung vor dem Teilen.
- $\log_2(y)$ als „2 hoch y“ lesen. Gesucht ist der Exponent, nicht die Potenz.

## Kurzer Abruf

Erkläre ohne Rechnung, welcher Schritt in $4x + 3 = 19 \to 4x = 16$ ausgeführt wurde. Löse danach $7x - 4 = 3x + 20$ und prüfe das Ergebnis im Original. Notiere bei jedem Schritt die Operation, nicht nur die neue Zeile.

## Begriffe auf einen Blick

- **Gleichung** (englisch *equation*): Aussage, dass zwei Ausdrücke denselben Wert haben.
- **Lösungsmenge** (englisch *solution set*): Menge aller Werte, für die eine Gleichung stimmt.
- **Basis** (englisch *base*): die Zahl, die in $a^n$ mit sich selbst multipliziert wird.
- **Exponent**: das hochgestellte $n$ in $a^n$; zählt die Vervielfachungen der Basis.
- **Potenz** (englisch *power*): Ausdruck der Form $a^n$, also wiederholte Multiplikation der Basis.
- **Logarithmus** (englisch *logarithm*): $\log_b(y)$ ist die Zahl $k$ mit $b^k = y$; bei Basis 2 zählt er Verdopplungen.
- **Äquivalenzumformung**: dieselbe Operation auf beiden Seiten einer Gleichung; lässt die Lösungsmenge unverändert.
