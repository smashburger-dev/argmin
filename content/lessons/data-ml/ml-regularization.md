# Ridge und Lasso: Schrumpfen statt Überanpassen

Ein lineares Modell mit zu vielen Freiheitsgraden kann Trainingsdaten perfekt durchs Rauschen fitten. **Regularisierung** schränkt die Größe der Koeffizienten ein und tauscht etwas **Bias** gegen deutlich weniger **Varianz**. Der Stellregler dafür ist $\lambda$ (sprich: lambda).

## Ridge: die geschlossene Form

Die **Ridge-Regression (L2)** minimiert die quadrierten Fehler plus $\lambda\sum_j w_j^2$. Die Lösung lässt sich direkt hinschreiben:

$$w_{\text{ridge}} = (X^{T}X + \lambda I)^{-1}X^{T}y$$

Bei $\lambda = 0$ steht dort genau die OLS-Lösung. Wächst $\lambda$, schrumpfen alle Koeffizienten Richtung null.

### Durchgerechnet: ein Feature

Mit nur einem Feature wird $X^{T}X$ zur Zahl $\sum x_i^2$ und $X^{T}y$ zu $\sum x_i y_i$:

$$w_{\text{ridge}} = \frac{\sum x_i y_i}{\sum x_i^2 + \lambda}$$

Zahlen: $\sum x_i^2 = 8$, $\sum x_i y_i = 16$.

- OLS: $w = 16/8 = 2$
- Ridge mit $\lambda = 2$: $w = 16/(8+2) = 1{,}6$
- Schrumpfung: $1 - 1{,}6/2 = 0{,}2$, also **20 %**

Allgemein gilt $w_{\text{ridge}}/w_{\text{OLS}} = \sum x_i^2 / (\sum x_i^2 + \lambda)$ — der Schrumpfungsfaktor hängt nur von $\lambda$ und der Skala der Daten ab. Deshalb muss vor Ridge skaliert werden.

### Durchgerechnet: zwei Features

$$X=\begin{pmatrix}1&1\\1&2\\1&3\end{pmatrix},\qquad y=\begin{pmatrix}2\\2\\4\end{pmatrix}$$

$$X^{T}X=\begin{pmatrix}3&6\\6&14\end{pmatrix},\qquad X^{T}y=\begin{pmatrix}8\\18\end{pmatrix}$$

Mit $\lambda = 1$:

$$X^{T}X+\lambda I=\begin{pmatrix}4&6\\6&15\end{pmatrix},\qquad \det=4\cdot15-6\cdot6=24$$

$$w=\tfrac{1}{24}\begin{pmatrix}15&-6\\-6&4\end{pmatrix}\begin{pmatrix}8\\18\end{pmatrix}=\tfrac{1}{24}\begin{pmatrix}120-108\\-48+72\end{pmatrix}=\begin{pmatrix}0{,}5\\1{,}0\end{pmatrix}$$

OLS ($\lambda=0$) liefert $(2/3,\,1)$; Ridge mit $\lambda=1$ liefert $(0{,}5,\,1)$ — der erste Koeffizient schrumpft, der zweite bleibt hier zufällig exakt bei $1$.

## Lasso: Soft-Thresholding und Sparsity

Das **Lasso (L1)** bestraft $\lambda\sum_j |w_j|$ statt der Quadrate. Mit einem Feature hat die Lösung die **Soft-Thresholding-Form**

$$w = \operatorname{sign}(c)\cdot\max\!\left(\frac{|c|-\lambda}{s},\,0\right),\qquad c=\sum_i x_i y_i,\quad s=\sum_i x_i^2$$

Bei normierten Features ($s = 1$, wie in Aufgabe w14-e4) vereinfacht sich das zu $\operatorname{sign}(c)\cdot\max(|c|-\lambda, 0)$. Beispiele (mit $s=1$): $c=5$, $\lambda=2$ ergibt $w=3$. Und $c=1{,}5$, $\lambda=2$ ergibt $w=0$ — exakt null.

Das ist der Kernunterschied: **Lasso setzt Koeffizienten exakt auf null** (automatische Feature-Selektion), Ridge schrumpft sie nur gegen null.

## λ wählen: Cross-Validation (Rückbindung an die Lektion „Cross-Validation und Leakage-Kontrolle“)

$\lambda$ ist ein Hyperparameter und wird wie in der Lektion „Cross-Validation und Leakage-Kontrolle“ gewählt: $\lambda$-Grid aufstellen, $k$-fold Cross-Validation **auf den Trainingsdaten**, das $\lambda$ mit der besten mittleren Validierungsleistung nehmen, dann final trainieren. Das Testset wird dafür nicht angefasst.

## Feature Engineering vor Ridge

- **Kategorial** (z. B. Stadtteil mit 8 Ausprägungen): One-Hot-Kodierung. Nicht 1 bis 8 durchnummerieren — das erzeugt eine falsche Reihenfolge.
- **Interaktionen** (z. B. Fläche × Lage) werden zu neuen Spalten — erst danach regularisieren.
- **Skalieren VOR Ridge**: Standardisierung mit Mittelwert und Standardabweichung **nur aus dem Trainingsteil**. Da $\lambda$ alle Koeffizienten gleich bestraft, bekommen Merkmale in kleinen Zahlenskalen große Koeffizienten und werden unfair bestraft.
- **Leakage-Verdacht**: Jedes Feature, das aus dem Ziel berechnet wurde (z. B. Preis pro m² beim Mietpreis-Target), muss raus — es trägt die Antwort ins Modell.

## Typische Fehler

- Auf dem kompletten Datensatz standardisieren und erst danach splitten — Testset-Information sickert in die Trainingsstatistiken.
- $\lambda$ auf dem Testset optimieren statt per Cross-Validation.
- Ridge und Lasso verwechseln: nur L1 erzeugt exakte Nullen.
- Kategoriale Merkmale als Zahlen kodieren und die implizite Ordnung ignorieren.
- Beim Nachrechnen von sklearn-Ridge-Ergebnissen vergessen, dass `Ridge` das Intercept nicht bestraft — die geschlossene Form oben bestraft jede Spalte von $X$.

## Direkter Check

Starte mit der [Einstiegsaufgabe](#/family/classify-regularizer-effect/l1-vs-l2-effect/0/intro) (Konzept L1/L2), rechne in einer Einstiegsaufgabe den Schrumpfungsprozentsatz aus und kläre die Vorverarbeitung in der [Kernaufgabe](#/family/classify-cv-leakage/target-encoding-leakage/0/core). Danach implementiere die [Kernaufgabe](#/family/formula-ridge-lasso-closed-form/ridge-normal-equation/0/core): Ridge aus der Formel und Lasso per Soft-Thresholding, exakt gegen die Handrechnung. Der Final Boss, die [Vertiefungsaufgabe](#/family/formula-ridge-lasso-closed-form/lasso-soft-threshold/0/stretch) (Koeffizientenpfad), verbindet beide Wege.
