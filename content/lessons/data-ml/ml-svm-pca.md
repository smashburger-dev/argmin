# Margins, PCA und k-Means

Drei Verfahren, drei Bilder: eine Straße so breit wie möglich zwischen zwei Dörfern, ein Objekt so gedreht, dass sein Schatten am breitesten ist, und Pizzafilialen, die so lange umziehen, bis sie ihren Kunden am nächsten sind. Alle hängen empfindlich von Skalen und Abständen ab, und zwei kommen ohne Labels aus.

## SVM: die breiteste Straße zwischen zwei Dörfern

Eine **Support Vector Machine** trennt zwei Klassen durch eine Gerade und wählt die, die den breitesten leeren Korridor zwischen ihnen lässt. Der **Margin** ist die Breite dieses Korridors; die Punkte, die direkt am Straßenrand stehen, heißen **Stützvektoren** (englisch *support vectors*), nur sie bestimmen die Lage.

Formal sucht die Hard-Margin-SVM die kleinste Norm $\|w\|$ (sprich: Norm von w, die Länge des Normalenvektors; nach Pythagoras $\sqrt{w_1^2 + w_2^2}$) unter der Bedingung $y_i(w^\top x_i + b) \ge 1$ für alle Punkte. Die 1 ist der Sicherheitsabstand, der die Skalierung festlegt; ohne ihn wäre jedes winzige $w$ eine Lösung. Es gilt

$$\text{Margin} = \frac{2}{\|w\|}.$$

Kleines $\|w\|$ heißt großer Margin. Konzeptbeispiel: Punkte $(1,1)$ mit Klasse $+1$ und $(-1,-1)$ mit Klasse $-1$. Die Gerade $x_1 + x_2 = 0$ trennt beide. Der Abstand jedes Punkts zur Geraden ist $2/\sqrt{2} = \sqrt{2}$, der Korridor zwischen den Klassen ist also doppelt so breit: Margin $= 2\sqrt{2} \approx 2{,}83$. Zur Kontrolle über die kanonische Skalierung: Beide Punkte erfüllen $y\,(w^\top x) = 2$; teilt man durch 2, gilt $\min_i y\,(\hat{w}^\top x_i) = 1$ mit $\hat{w} = (0{,}5,\,0{,}5)$, $\|\hat{w}\| = 1/\sqrt{2}$, und der Margin ist $2/\|\hat{w}\| = 2\sqrt{2}$. Kein Vektor mit kleinerer Norm, der bei dieser Skalierung noch trennt, existiert; das ist die Hard-Margin-Lösung.

### Kernel-Trick (Konzept)

Nicht linear trennbare Punkte können nach einer Abbildung $\phi$ (sprich: phi) in einen höherdimensionalen Raum linear trennbar werden. Der **Kernel-Trick** rechnet die dafür nötigen Skalarprodukte $\phi(x_i)^{T}\phi(x_j)$ direkt als Kernel-Funktion, ohne die Koordinaten; der RBF-Kernel (radiale Basisfunktion) misst dabei eine Ähnlichkeit, die mit dem Abstand der Punkte abfällt jemals auszuweisen. `SVC(kernel='rbf')` in sklearn heißt genau das.

## Eigenvektoren: Richtungen, die eine Matrix nur streckt

Eine Matrix $A$ bildet jeden Vektor $v$ auf $Av$ ab und dreht oder streckt ihn dabei meist. Ein **Eigenvektor** ist eine Richtung, die die Matrix nur streckt, nicht dreht; der Streckfaktor heißt **Eigenwert** $\lambda$ (sprich: Lambda). Die Definition ist eine einzige Gleichung:

$$Av = \lambda v.$$

Konkret für $A = \begin{pmatrix}2&1\\1&2\end{pmatrix}$:

$$A\begin{pmatrix}1\\1\end{pmatrix} = \begin{pmatrix}3\\3\end{pmatrix} = 3\begin{pmatrix}1\\1\end{pmatrix}, \qquad A\begin{pmatrix}1\\-1\end{pmatrix} = \begin{pmatrix}1\\-1\end{pmatrix} = 1\cdot\begin{pmatrix}1\\-1\end{pmatrix}.$$

Die Richtung $(1,1)$ wird mit Eigenwert 3 verlängert, die Richtung $(1,-1)$ behält mit Eigenwert 1 ihre Länge. Jede andere Richtung wird aus ihrer Linie herausgedreht; genau das zeigt die Visualisierung unten, wenn der Pfeil $Av$ nicht mehr parallel zu $v$ liegt.

Dieselbe Bauart trägt die **Kovarianzmatrix**: Auf der Diagonale stehen die Varianzen der Merkmale, daneben die Kovarianz, also wie stark zwei Merkmale gemeinsam schwanken. Die Matrix $\begin{pmatrix}2&1\\1&2\end{pmatrix}$ beschreibt etwa Daten mit Varianz 2 je Merkmal und positivem Zusammenhang. Ihre Eigenvektoren zerlegen die Streuung sauber in Richtungen: entlang $(1,1)$ Varianz 3, entlang $(1,-1)$ Varianz 1.
