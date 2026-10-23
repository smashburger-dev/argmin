## Wo dir das in der KI begegnet

In GPT-2 small hat der Zustand zwischen den Schichten die Form (Batch, Sequenzlänge, 768), zum Beispiel $(8, 1024, 768)$ bei 8 Texten mit je 1024 Tokens; 1024 ist die maximale Kontextlänge von GPT-2. Jede Schicht transformiert die letzte Achse; die ersten beiden bleiben erhalten.

## Typische Fehler

- Formen $(n, d)$ und $(d, n)$ verwechseln; der Fehler zeigt sich oft erst drei Zeilen später als Broadcast-Überraschung.
- Bias als Zeilen- statt Spaltenvektor deklarieren und still verbrauchen.
- Parameterzahl ohne Bias rechnen ($d \cdot h$ statt $d \cdot h + h$).
- Bei `reshape` still eine Dimension der Größe $1$ einziehen und später über falsche Achsen mitteln.

## Direkter Check

Zähle in einer Einstiegsaufgabe Parameter einer Schicht und eines kleinen MLP. Lies in der [Kernaufgabe: Formen und Broadcasting](#/family/validate-shape-contract/shapes-w18-broadcast-axes/0/core) Formen und Broadcasting ab. In der [Kernaufgabe: Lineare Schicht](#/family/fit-forward-layer-chain-contract/linear-forward-contract/0/core) implementierst du eine lineare Schicht mit Dimensionskontrolle; die [Vertiefungsaufgabe: MLP-Forward mit ReLU](#/family/fit-forward-layer-chain-contract/mlp-forward-relu/0/stretch) baut den MLP-Forward mit ReLU, und die [Herausforderung](#/family/fit-forward-layer-chain-contract/deep-forward-chain/0/challenge) verallgemeinert auf beliebig tiefe Netze mit strikten Verträgen.

## Begriffe auf einen Blick

- **Tensor**: numerisches Array mit fester Form; Skalare, Vektoren und Matrizen sind Sonderfälle.
- **Achse** (englisch *axis*): eine Zählrichtung des Arrays; Zeilen sind Achse 0, Spalten Achse 1.
- **Form** (englisch *shape*): wie viele Einträge ein Array entlang jeder Richtung hat; bei einer Matrix Zeilen mal Spalten, zum Beispiel $2\times3$, in NumPy `A.shape == (2, 3)`.
- **Batch**: Gruppe von Beispielen, die gemeinsam durch das Netz laufen; erste Achse der Eingabe.
- **Lineare Schicht** (englisch *linear layer*): Abbildung $XW + b$ mit Gewichtsmatrix und Bias.
- **Bias (Schicht)**: Verschiebungsvektor einer Schicht; nicht zu verwechseln mit der statistischen Verzerrung.
- **Broadcasting**: automatisches Ausdehnen kompatibler Achsen, sodass ein kleineres Array auf jede Zeile oder Spalte des größeren wirkt.
- **Parameter (Modell)**: trainierbare Zahlen des Modells; eine lineare Schicht hat $d \cdot h + h$.
- **ReLU** (englisch *rectified linear unit*): Aktivierungsfunktion $\max(0, x)$, elementweise.
