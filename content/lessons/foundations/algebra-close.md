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

