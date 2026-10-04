# Terme strukturiert umformen

Wenn du später eine Verlustfunktion ableitest oder ein Modell vereinfachst, multiplizierst du genau solche Klammern aus und fasst gleichartige Teile zusammen. Diese Lektion zeigt die zwei Fragen, die jede Umformung tragen: Welche Operation verbindet die Teile, und welche Terme sind gleichartig?

## Das Bild dahinter: Einkaufstüten

Ein **Term** ist ein Rechenausdruck wie $3x + 6$. Er kann **Variablen** enthalten, das sind Platzhalter für noch unbekannte [Werte](#/glossary/wert). Die Zahl vor einer Variable heißt **Koeffizient**: In $3x$ ist 3 der Koeffizient.

Das **Distributivgesetz** verteilt einen Faktor auf eine Klammer. Stell dir $3(x + 2)$ als drei Einkaufstüten vor, in jeder liegt ein Apfel (der Wert $x$) und 2 Bananen. Drei Tüten ergeben drei Äpfel und sechs Bananen:

$$3(x + 2) = 3x + 6.$$

Ein Minus vor der Klammer heißt: Du gibst die Tüten zurück. Dann dreht sich das Vorzeichen jedes Inhalts um: Aus $-2(x - 1)$ wird $-2x + 2$, weil du zweimal $x$ zurückgibst und zweimal $-1$.

Terme sind nur dann **gleichartig**, wenn ihr Variablenteil exakt übereinstimmt. $x$ und $x^2$ sind wie Meter und Quadratmeter: verwandt, aber nicht addierbar. Nur gleichartige Terme darfst du über ihre Koeffizienten zusammenfassen.

Wo der Vergleich hinkt: In einer Tüte kann $x$ nur eine positive Anzahl sein. Als Variable darf $x$ auch negativ oder ein Bruch sein, die Umformung bleibt trotzdem dieselbe.

## Durchgerechnetes Beispiel

Vereinfache $3(x + 2) - 2(x - 1)$.

1. **Erste Klammer ausmultiplizieren**: Verteile $3$ auf beide Teile der ersten Klammer: $3x + 6$.
2. **Zweite Klammer mit Vorzeichen ausmultiplizieren**: Verteile $-2$ auf beide Teile der zweiten Klammer: $-2x + 2$.
3. **Term vollständig anschreiben**: $3x + 6 - 2x + 2$.
4. **Gleichartige Terme zusammenfassen: dein Zug**: $x$-Terme: $3x - 2x = ???$; Zahlen: $6 + 2 = ???$. Ergebnis: $???$.

Das Vorzeichen vor der zweiten Klammer gehört zum Faktor. Aus $-2(x - 1)$ wird deshalb $-2x + 2$ und nicht $-2x - 2$.

## Kontrolle durch Einsetzen

Eine Termumformung verändert die Darstellung, nicht den Wert. Das kannst du prüfen: Setze in Ausgangsterm und Ergebnis zum Beispiel $x = 2$ ein.

- Ausgang: $3(2 + 2) - 2(2 - 1) = 12 - 2 = 10$.
- Ergebnis: $2 + 8 = 10$.

Ein einzelner Prüfwert beweist keine allgemeine Gleichheit. Er findet aber viele Vorzeichen- und Verteilungsfehler schnell.

## Wo dir das in der KI begegnet

Die Linearität von Matrixoperationen ist das Distributivgesetz: $A(x + y) = Ax + Ay$ verteilt die Matrix $A$ auf die Summe, genau wie $3$ auf $(x + 2)$. Eine verwandte Regel, das Assoziativgesetz $A(Bx) = (AB)x$, zeigt: Zwei lineare Schichten ohne Aktivierung dazwischen lassen sich zu einer einzigen Schicht zusammenfassen, weil das Produkt $AB$ wieder eine einzige Matrix ist. Beim Ableiten von Verlustfunktionen multiplizierst du Klammern aus und fasst gleichartige Terme zusammen, wie in der Lektion [Gradienten von Hand herleiten](#/lesson/l-grad-regression).

## Typische Fehler

- Das Minus vor der Klammer nur auf den ersten Summanden anwenden. Es gilt für jeden Inhalt der Tüte.
- Ungleichartige Terme addieren, etwa $x + x^2 = x^3$. Meter plus Quadratmeter ergibt nichts.
- Den Faktor nur auf den ersten Klammerinhalt verteilen: $3(x + 2)$ ist nicht $3x + 2$.
- Nach dem Zusammenfassen stehen bleiben und die Einsetzprobe weglassen.

## Kurzer Abruf

Vereinfache $5(2x - 1) - 3(x + 4)$. Markiere zuerst die beiden Verteilungen. Fasse danach die $x$-Terme und die Zahlen getrennt zusammen. Prüfe deinen Term mit $x = 1$.

## Begriffe auf einen Blick

- **Term**: Rechenausdruck aus Zahlen, Variablen und Operationen, zum Beispiel $3x + 6$.
- **Variable**: Platzhalter für einen noch unbekannten oder veränderlichen Wert.
- **Koeffizient** (englisch *coefficient*): die Zahl, die vor einer Variablen steht und sie multipliziert.
- **Gleichartige Terme** (englisch *like terms*): Terme mit exakt demselben Variablenteil; nur sie lassen sich über die Koeffizienten zusammenfassen.
- **Distributivgesetz** (englisch *distributive law*): Regel $a(b + c) = ab + ac$; verteilt einen Faktor auf jeden Klammerinhalt.
