# Ridge und Lasso: Schrumpfen statt Überanpassen

Wer für eine Prüfung die Fragen der Vorjahre auswendig lernt, scheitert an der neuen Frage. Ein lineares Modell, das jedes Detail der Trainingsdaten auswendig lernt, macht dasselbe. Diese Lektion zeigt zwei Bremsen dagegen: Ridge, das jeden Koeffizienten Richtung null zieht, und Lasso, das kleine Beiträge ganz streicht.

## Das Bild dahinter: Gummiband und Gebühr

Bei **Ridge** hängt an jedem [Koeffizienten](#/glossary/koeffizient) ein Gummiband: Es zieht Richtung null, und zwar umso stärker, je weiter der Wert weg ist. Kein Koeffizient erreicht exakt null, aber große Ausreißer werden gebremst.

Bei **Lasso** kostet jede Einheit Abstand von null eine feste Gebühr. Lohnt sich ein kleiner Beitrag nicht, wird er gestrichen; der Koeffizient fällt auf exakt null.

Wo der Vergleich hinkt: Das Gummiband zieht proportional zur Auslenkung, die Lasso-Gebühr ist pro Einheit konstant. Beide wirken nur auf die Koeffizienten, nicht auf die Daten, und beide brauchen einen Stellregler $\lambda$ (sprich: lambda), der die Strafhöhe setzt.

**Regularisierung** heißt genau dieses Einengen der Freiheitsgrade: Ein **Hyperparameter** wie $\lambda$ wird nicht aus den Daten gelernt, sondern von dir vorgegeben. Im Austausch für etwas **Bias** (eine leichte Verzerrung der Vorhersage im Mittel) sinkt die [**Varianz**](#/glossary/varianz), die Wackeligkeit der Vorhersage. „Bias“ meint hier die statistische Verzerrung, nicht den Bias-Term einer Schicht.

## Ridge: die geschlossene Form

Die **Ridge-Regression (L2)** minimiert die quadrierten Fehler plus $\lambda\sum_j w_j^2$ (sprich: Summe der quadrierten Gewichte). Die Lösung lässt sich direkt hinschreiben:

$$w_{\text{ridge}} = (X^{T}X + \lambda I)^{-1}X^{T}y.$$

Dabei ist $X^{T}$ (sprich: X transponiert) die gespiegelte Design-Matrix, $I$ die **Einheitsmatrix** (Einsen auf der Diagonale, sonst Nullen) und $(\cdot)^{-1}$ die Matrixinversion. $\lambda = 0$ liefert die OLS-Lösung (englisch *ordinary least squares*, Methode der kleinsten Quadrate). Wächst $\lambda$, schrumpfen alle Koeffizienten Richtung null.

### Durchgerechnet: ein Merkmal

Mit einem Merkmal wird $X^{T}X$ zur Zahl $\sum x_i^2$ und $X^{T}y$ zu $\sum x_i y_i$:

$$w_{\text{ridge}} = \frac{\sum x_i y_i}{\sum x_i^2 + \lambda}.$$

Zahlen: $\sum x_i^2 = 8$, $\sum x_i y_i = 16$.

- OLS: $w = 16/8 = 2$
- Ridge mit $\lambda = 2$: $w = 16/(8+2) = 1{,}6$
- Schrumpfung: $1 - 1{,}6/2 = 0{,}2$, also **20 %**

Allgemein gilt $w_{\text{ridge}}/w_{\text{OLS}} = \sum x_i^2 / (\sum x_i^2 + \lambda)$, der Schrumpfungsfaktor hängt nur von $\lambda$ und der Skala der Daten ab. Deshalb muss vor Ridge standardisiert werden.

### Durchgerechnet: zwei Merkmale

$$X=\begin{pmatrix}1&1\\1&2\\1&3\end{pmatrix},\qquad y=\begin{pmatrix}2\\2\\4\end{pmatrix}.$$

$$X^{T}X=\begin{pmatrix}3&6\\6&14\end{pmatrix},\qquad X^{T}y=\begin{pmatrix}8\\18\end{pmatrix}.$$

Mit $\lambda = 1$:

$$X^{T}X+\lambda I=\begin{pmatrix}4&6\\6&15\end{pmatrix},\qquad \det=4\cdot15-6\cdot6=24.$$

$$w=\tfrac{1}{24}\begin{pmatrix}15&-6\\-6&4\end{pmatrix}\begin{pmatrix}8\\18\end{pmatrix}=\tfrac{1}{24}\begin{pmatrix}120-108\\-48+72\end{pmatrix}=\begin{pmatrix}0{,}5\\1{,}0\end{pmatrix}.$$

OLS ($\lambda=0$) liefert $(2/3,\,1)$; Ridge mit $\lambda=1$ liefert $(0{,}5,\,1)$, der erste Koeffizient schrumpft, der zweite bleibt hier zufällig exakt bei $1$.

## Lasso: Soft-Thresholding und Sparsity

Das **Lasso (L1)** bestraft $\lambda\sum_j |w_j|$ statt der Quadrate; $|w|$ (sprich: Betrag von w) ist der Abstand eines Koeffizienten von null. Mit einem Merkmal hat die Lösung die **Soft-Thresholding-Form**

$$w = \operatorname{sign}(c)\cdot\max\!\left(\frac{|c|-\lambda}{s},\,0\right),\qquad c=\sum_i x_i y_i,\quad s=\sum_i x_i^2.$$

Dabei liefert $\operatorname{sign}(c)$ das Vorzeichen von $c$ und $\max(a, 0)$ den größeren Wert von $a$ und $0$. Bei normierten Merkmalen ($s = 1$) vereinfacht sich das zu $\operatorname{sign}(c)\cdot\max(|c|-\lambda, 0)$. Beispiele (mit $s=1$): $c=5$, $\lambda=2$ ergibt $w=3$. Und $c=1{,}5$, $\lambda=2$ ergibt $w=0$, exakt null.

Das ist der Kernunterschied: **Lasso setzt Koeffizienten exakt auf null** (automatische Merkmalsauswahl, englisch *sparsity*); Ridge schrumpft sie nur gegen null.

## λ wählen: Kreuzvalidierung

$\lambda$ ist ein Hyperparameter und wird wie in der Lektion [Folds erzeugen und Leakage finden](#/lesson/l-ml-cv) gewählt: ein $\lambda$-Gitter aufstellen, **Kreuzvalidierung** (englisch *cross-validation*) auf den Trainingsdaten mit $k$ Teilmengen durchführen, das $\lambda$ mit der besten mittleren Validierungsleistung nehmen und dann final trainieren. Das Testset wird dafür nicht angefasst.

## Merkmalsaufbereitung vor Ridge

- **Kategorial** (z. B. Stadtteil mit 8 Ausprägungen): **One-Hot-Kodierung**, jede Ausprägung bekommt eine eigene 0/1-Spalte. Nicht 1 bis 8 durchnummerieren, das erzeugt eine falsche Reihenfolge.
- **Interaktionen** (z. B. Fläche × Lage) werden zu neuen Spalten, erst danach regularisieren.
- **Standardisierung** vor Ridge: Jede Spalte auf Mittelwert 0 und Standardabweichung 1 bringen, Statistiken **nur aus dem Trainingsteil**. Da $\lambda$ alle Koeffizienten gleich bestraft, bekommen Merkmale in kleinen Zahlenskalen große Koeffizienten und werden unfair bestraft.
- **Leakage-Verdacht**: Jedes Merkmal, das aus dem Ziel berechnet wurde (z. B. Preis pro m² beim Mietpreis-Target), trägt die Antwort ins Modell und muss raus.

## Wo dir das in der KI begegnet

Beim Training großer Sprachmodelle ist **Weight Decay** Standard: In AdamW zieht es die Gewichte wie das Ridge-Gummiband Richtung null. Mit Adam ist das nicht exakt dasselbe wie eine L2-Strafe; daher der Name „decoupled“ (entkoppelt).

## Typische Fehler

- Auf dem kompletten Datensatz standardisieren und erst danach splitten, Testset-Information sickert in die Trainingsstatistiken.
- $\lambda$ auf dem Testset optimieren statt per Kreuzvalidierung.
- Ridge und Lasso verwechseln: Nur L1 erzeugt exakte Nullen.
- Kategoriale Merkmale als Zahlen kodieren und die implizite Ordnung ignorieren.
- Beim Nachrechnen von sklearn-Ridge-Ergebnissen vergessen, dass `Ridge` den Achsenabschnitt nicht bestraft, die geschlossene Form oben bestraft jede Spalte von $X$.

## Direkter Check

Starte mit der [Einstiegsaufgabe: L1-vs-L2-Effekt](#/family/classify-regularizer-effect/l1-vs-l2-effect/0/intro) (Konzept L1/L2), rechne in einer Einstiegsaufgabe den Schrumpfungsprozentsatz aus und kläre die Vorverarbeitung in der [Kernaufgabe: Target-Encoding-Leakage](#/family/classify-cv-leakage/target-encoding-leakage/0/core). Danach implementiere die [Kernaufgabe: Ridge-Normalengleichung](#/family/formula-ridge-lasso-closed-form/ridge-normal-equation/0/core): Ridge aus der Formel und Lasso per Soft-Thresholding, exakt gegen die Handrechnung. Der Final Boss, die [Vertiefungsaufgabe: Lasso-Koeffizientenpfad](#/family/formula-ridge-lasso-closed-form/lasso-soft-threshold/0/stretch) (Koeffizientenpfad), verbindet beide Wege.

## Begriffe auf einen Blick

- **Regularisierung** (englisch *regularization*): Einengung der Modellfreiheit durch eine Strafe auf die Koeffizienten, gesteuert über $\lambda$.
- **Bias (statistisch)**: die Verzerrung der Vorhersage im Mittel; nicht der Verschiebungsvektor einer Schicht.
- **OLS** (englisch *ordinary least squares*): Methode der kleinsten Quadrate; die unregularisierte Referenz.
- **Einheitsmatrix** (englisch *identity matrix*): quadratische Matrix $I$ mit Einsen auf der Diagonale und sonst Nullen; $I\cdot w = w$.
- **Soft-Thresholding**: Wert um $\lambda$ Richtung null schieben und bei zu kleinen Beträgen exakt null setzen.
- **Sparsity**: Eigenschaft, dass viele Koeffizienten exakt null sind.
- **Hyperparameter**: Parameter, der nicht aus den Daten gelernt wird, sondern vorgegeben ist, etwa $\lambda$.
- **Kreuzvalidierung** (englisch *cross-validation*): Aufteilen der Trainingsdaten in $k$ Teilmengen, um Hyperparameter zu wählen.
- **One-Hot-Kodierung** (englisch *one-hot encoding*): jedes kategoriale Merkmal bekommt eine eigene 0/1-Spalte.
- **Standardisierung** (englisch *standardization*): Spalten auf Mittelwert 0 und Standardabweichung 1 bringen; Statistiken nur aus dem Trainingsteil.
- **Leakage**: Information aus dem Ziel oder dem Testset sickert in Merkmale oder Statistiken.
