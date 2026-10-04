# Margins, PCA und k-Means

Drei Verfahren, drei Bilder: eine Straße so breit wie möglich zwischen zwei Dörfern, ein Objekt so gedreht, dass sein Schatten am breitesten ist, und Pizzafilialen, die so lange umziehen, bis sie ihren Kunden am nächsten sind. Alle hängen empfindlich von Skalen und Abständen ab, und zwei kommen ohne Labels aus.

## SVM: die breiteste Straße zwischen zwei Dörfern

Eine **Support Vector Machine** trennt zwei Klassen durch eine Gerade und wählt die, die den breitesten leeren Korridor zwischen ihnen lässt. Der **Margin** ist die Breite dieses Korridors; die Punkte, die direkt am Straßenrand stehen, heißen **Stützvektoren** (englisch *support vectors*), nur sie bestimmen die Lage.

Formal sucht die Hard-Margin-SVM die kleinste Norm $\|w\|$ (sprich: Norm von w, die Länge des Normalenvektors; nach Pythagoras $\sqrt{w_1^2 + w_2^2}$) unter der Bedingung $y_i(w^\top x_i + b) \ge 1$ für alle Punkte. Die 1 ist der Sicherheitsabstand, der die Skalierung festlegt; ohne ihn wäre jedes winzige $w$ eine Lösung. Es gilt

$$\text{Margin} = \frac{2}{\|w\|}.$$

Kleines $\|w\|$ heißt großer Margin. Konzeptbeispiel: Punkte $(1,1)$ mit Klasse $+1$ und $(-1,-1)$ mit Klasse $-1$. Die Gerade $x_1 + x_2 = 0$ trennt beide. Der Abstand jedes Punkts zur Geraden ist $2/\sqrt{2} = \sqrt{2}$, der Korridor zwischen den Klassen ist also doppelt so breit: Margin $= 2\sqrt{2} \approx 2{,}83$. Zur Kontrolle über die kanonische Skalierung: Beide Punkte erfüllen $y\,(w^\top x) = 2$; teilt man durch 2, gilt $\min_i y\,(\hat{w}^\top x_i) = 1$ mit $\hat{w} = (0{,}5,\,0{,}5)$, $\|\hat{w}\| = 1/\sqrt{2}$, und der Margin ist $2/\|\hat{w}\| = 2\sqrt{2}$. Kein Vektor mit kleinerer Norm, der bei dieser Skalierung noch trennt, existiert; das ist die Hard-Margin-Lösung.

### Kernel-Trick (Konzept)

Nicht linear trennbare Punkte können nach einer Abbildung $\phi$ (sprich: phi) in einen höherdimensionalen Raum linear trennbar werden. Der **Kernel-Trick** rechnet die dafür nötigen Skalarprodukte $\phi(x_i)^{T}\phi(x_j)$ direkt als Kernel-Funktion, ohne die Koordinaten; der RBF-Kernel (radiale Basisfunktion) misst dabei eine Ähnlichkeit, die mit dem Abstand der Punkte abfällt jemals auszuweisen. `SVC(kernel='rbf')` in sklearn heißt genau das.

## PCA: den Schatten so drehen, dass er am breitesten ist

**PCA** (englisch *principal component analysis*, Hauptkomponentenanalyse) sucht die Richtung, in der die Daten am stärksten streuen, wie ein Objekt, das du so drehst, dass sein Schatten am breitesten ist. Der Ablauf mit numpy-Grundoperationen:

1. **Zentrieren**: Spaltenmittelwerte abziehen, damit jede Spalte Mittelwert 0 hat.
2. **Kovarianzmatrix**: $C = X_c^{T}X_c/(n-1)$ misst, wie stark zwei Merkmale gemeinsam schwanken.
3. **Eigenzerlegung**: `np.linalg.eigh(C)` liefert Eigenwerte und Eigenvektoren. Ein **Eigenvektor** ist eine Richtung, die die Matrix nur streckt; der **Eigenwert** ist der Streckfaktor. Achtung: `eigh` liefert aufsteigende Reihenfolge, für die größte Komponente muss absteigend sortiert werden.
4. **Projektion**: $z = X_c v$ mit dem Eigenvektor $v$ zum größten Eigenwert.
5. **Varianzanteil**: $\lambda_i / \sum_j \lambda_j$.

Ein kleines Eigenwert-Beispiel: Für $A = \begin{pmatrix}1&1\\1&1\end{pmatrix}$ und $v = (1,1)$ gilt $Av = (2,2) = 2\cdot v$, die Richtung bleibt, der Vektor wird um den Faktor 2 gestreckt. Für $(1,-1)$ gilt $Av = (0,0)$, der Eigenwert ist 0.

### Durchgerechnetes Beispiel

$$X = \begin{pmatrix}1&1\\2&2\\3&3\end{pmatrix}\;\xrightarrow{\text{zentriert}}\;\begin{pmatrix}-1&-1\\0&0\\1&1\end{pmatrix}.$$

$$C = \frac{1}{3-1}\begin{pmatrix}2&2\\2&2\end{pmatrix} = \begin{pmatrix}1&1\\1&1\end{pmatrix}.$$

Eigenwerte: $\lambda_1 = 2$, $\lambda_2 = 0$. Die erste Hauptkomponente ist die Diagonale $(1/\sqrt{2},\,1/\sqrt{2})$ und erklärt $2/(2+0) = 100\,\%$ der Varianz, die zweite Richtung ist exakt abhängig, wie in der Lektion [Lineare Unabhängigkeit und Rang verstehen](#/lesson/l-linalg-independence).

## k-Means: Pizzafilialen am Schwerpunkt platzieren

**k-Means** gruppiert Punkte in $k$ Cluster ohne Labels: Platziere $k$ Filialen, ordne jeden Kunden der nächsten zu, ziehe jede Filiale in den Schwerpunkt ihrer Kunden (**Zentroid**, Mittelpunkt der Gruppe) und wiederhole, bis sich nichts mehr ändert.

Formal wechselt der Lloyd-Algorithmus zwei Schritte:

1. **Zuordnung**: Jeder Punkt geht zum nächsten Zentroiden (bei Gleichstand: kleinster Index).
2. **Update**: Jeder Zentroid wird der Mittelwert seiner Punkte.

Die Initialisierung entscheidet über das lokale Optimum, deshalb gehört der **feste Seed** (`np.random.default_rng(seed)`) zum Vertrag. Konzeptbeispiel: Punkte $(0,0),(1,0),(10,10),(11,10)$ mit $k=2$, Startzentroiden $(0,0)$ und $(1,0)$.

- Runde 1: $(0,0)$ bleibt beim ersten Zentroiden; $(1,0),(10,10),(11,10)$ gehen zum zweiten, weil sie ihm näher sind. Neue Zentroiden: $(0,0)$ und $(\tfrac{22}{3}\approx7{,}33,\,\tfrac{20}{3}\approx6{,}67)$.
- Runde 2: Jetzt sind $(0,0)$ und $(1,0)$ dem ersten Zentroiden näher, $(10,10)$ und $(11,10)$ dem zweiten. Neue Zentroiden: $(0{,}5,\,0)$ und $(10{,}5,\,10)$.
- Runde 3: Dieselbe Zuordnung, keine Änderung mehr, der Algorithmus ist nach drei Runden fertig.

## Skalen, Aufsicht, Distanzen

- **Überwacht** heißt: Das Verfahren lernt aus Labels. Das gilt nur für die SVM. **Unüberwacht** sind PCA und k-Means; sie brauchen keine Zielvariable; $k$ ist ein Hyperparameter, kein Label.
- Alle drei reagieren auf Merkmals-Skalen: SVM und k-Means über Distanzen, PCA über Varianzen. Deshalb vorher standardisieren; die Statistiken kommen nur aus den Trainingsdaten.

## Wo dir das in der KI begegnet

PCA projiziert Embeddings auf zwei Dimensionen, um sie zu plotten, und k-Means gruppiert Embeddings. IVF-Indizes in der Vektorsuche (etwa FAISS) nutzen k-Means, um den Suchraum in Zellen zu teilen.

## Typische Fehler

- PCA ohne Zentrieren: Die erste Komponente zeigt dann oft nur in Richtung des Mittelwerts.
- `eigh`-Eigenwerte nicht absteigend sortieren.
- Varianzanteil ohne Normierung auf die Eigenwertsumme angeben.
- k-Means ohne festen Seed: jeder Lauf ein anderes Ergebnis.
- Skalen ignorieren und sich über die Dominanz eines großen Merkmals wundern.

## Direkter Check

Klär die Konzepte in der [Einstiegsaufgabe: SVM-Margin-Konzept](#/family/classify-svm-margin/hard-margin-width/0/intro) und der [Kernaufgabe: Skalen und Aufsicht](#/family/classify-supervision-scaling/supervised-vs-unsupervised-scaling/0/core), rechne den Varianzanteil in einer Einstiegsaufgabe und implementiere PCA plus k-Means in der [Kernaufgabe: PCA und k-Means](#/family/fit-pca-kmeans-pipeline/pca-eigh-projection/0/core). Transfer: [Vertiefungsaufgabe: Skalierung-PCA-Clustering](#/family/fit-pca-kmeans-pipeline/standardize-pca-kmeans/0/stretch) verkettet Skalieren, PCA und Clustering.

## Begriffe auf einen Blick

- **Margin**: Breite des leeren Korridors um die Trenngerade einer SVM.
- **Stützvektor** (englisch *support vector*): Punkt direkt am Rand des Korridors; nur die Stützvektoren bestimmen die SVM-Lösung.
- **Kernel**: Funktion, die ein Skalarprodukt in einem höherdimensionalen Raum liefert, ohne die Koordinaten auszurechnen.
- **Varianz** (englisch *variance*): Streuung einer Spalte um ihren Mittelwert.
- **Kovarianzmatrix** (englisch *covariance matrix*): Matrix $X_c^{T}X_c/(n-1)$, die misst, wie stark zwei Merkmale gemeinsam schwanken.
- **Zentrieren** (englisch *centering*): Spaltenmittelwerte abziehen, damit jede Spalte Mittelwert 0 hat.
- **Eigenvektor** (englisch *eigenvector*): Richtung, die eine Matrix nur streckt, nicht dreht.
- **Eigenwert** (englisch *eigenvalue*): Streckfaktor zum Eigenvektor.
- **Projektion** (englisch *projection*): Abbildung der Daten auf eine Achse oder Ebene; hier $z = X_c v$.
- **Zentroid** (englisch *centroid*): Mittelpunkt einer Punktgruppe; Zielpunkt beim Update von k-Means.
- **Überwacht** (englisch *supervised*): Verfahren lernt aus Labels; SVM ja, PCA und k-Means nein.
