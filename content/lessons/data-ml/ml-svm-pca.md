# Margins, PCA und k-Means

Drei Verfahren mit einer Gemeinsamkeit: Sie hängen empfindlich von Skalen und Abständen ab. Zwei von ihnen arbeiten ganz ohne Labels.

## Margin-Idee: Hard-Margin-SVM in 2D

Eine **Support Vector Machine** sucht unter allen Trenngeraden diejenige mit dem größten Korridor. Der **Margin** ist die Breite dieses Korridors — kein Trainingspunkt liegt in seinem Inneren.

Formulierung als kleinste-Norm-Lösung: Minimiere $\|w\|^2$ unter der Bedingung, dass jede Beobachtung korrekt mit Sicherheitsabstand klassifiziert wird. Es gilt

$$\text{Margin} = \frac{2}{\|w\|}$$

Kleines $\|w\|$ heißt großer Margin. Die Punkte auf dem Korriderrand heißen **Stützvektoren** — nur sie bestimmen die Lösung.

Konzeptbeispiel: Punkte $(1,1)$ mit Klasse $+1$ und $(-1,-1)$ mit Klasse $-1$. Die Gerade $x_1 + x_2 = 0$ trennt beide. Der Abstand jedes Punkts zur Geraden ist $2/\sqrt{2} = \sqrt{2}$ — der Korridor zwischen den Klassen ist also doppelt so breit: Margin $= 2\sqrt{2} \approx 2{,}83$. Zur Kontrolle über die kanonische Skalierung: Beide Punkte erfüllen $y\,(w^\top x) = 2$; teilt man durch 2, gilt $\min_i y\,(\hat{w}^\top x_i) = 1$ mit $\hat{w} = (0{,}5,\,0{,}5)$, $\|\hat{w}\| = 1/\sqrt{2}$ — und der Margin ist $2/\|\hat{w}\| = 2\sqrt{2}$. Kein Vektor mit kleinerer Norm, der bei dieser Skalierung noch trennt, existiert — das ist die Hard-Margin-Lösung.

## Kernel-Trick (Konzept)

Nicht linear trennbare Punkte können nach einer Abbildung $\phi$ in einen höherdimensionalen Raum linear trennbar werden. Der **Kernel-Trick** rechnet die dafür nötigen Skalarprodukte $\phi(x_i)^{T}\phi(x_j)$ direkt als Kernel-Funktion (z. B. RBF), ohne die Koordinaten jemals auszuweisen. Für diese Woche reicht die Lesekompetenz: `SVC(kernel='rbf')` in sklearn heißt genau das.

## PCA Schritt für Schritt

**PCA** sucht Richtungen größter Varianz. Der Ablauf mit numpy-Grundoperationen:

1. **Zentrieren**: Spaltenmittelwerte abziehen.
2. **Kovarianzmatrix**: $C = X_c^{T}X_c/(n-1)$.
3. **Eigenzerlegung**: `np.linalg.eigh(C)` — Achtung, `eigh` liefert **aufsteigende** Reihenfolge; für die größte Komponente muss absteigend sortiert werden.
4. **Projektion**: $z = X_c v$ mit dem Eigenvektor $v$ zum größten Eigenwert.
5. **Varianzanteil**: $\lambda_i / \sum_j \lambda_j$.

### Durchgerechnetes Beispiel

$$X = \begin{pmatrix}1&1\\2&2\\3&3\end{pmatrix}\;\xrightarrow{\text{zentriert}}\;\begin{pmatrix}-1&-1\\0&0\\1&1\end{pmatrix}$$

$$C = \frac{1}{3-1}\begin{pmatrix}2&2\\2&2\end{pmatrix} = \begin{pmatrix}1&1\\1&1\end{pmatrix}$$

Eigenwerte: $\lambda_1 = 2$, $\lambda_2 = 0$. Die erste Hauptkomponente ist die Diagonale $(1/\sqrt{2},\,1/\sqrt{2})$ und erklärt $2/(2+0) = 100\,\%$ der Varianz — die zweite Richtung ist exakt abhängig (Rückbindung: lineare Abhängigkeit aus der Lineare-Algebra-Woche).

## k-Means mit fester Initialisierung

**k-Means** (Lloyd-Algorithmus) wechselt zwei Schritte:

1. **Zuordnung**: Jeder Punkt geht zum nächsten Zentroid (bei Gleichstand: kleinster Index).
2. **Update**: Jedes Zentroid wird der Mittelwert seiner Punkte.

Die Initialisierung entscheidet über das lokale Optimum — deshalb gehört der **feste Seed** (`np.random.default_rng(seed)`) zum Vertrag. Konzeptbeispiel: Punkte $(0,0),(1,0),(10,10),(11,10)$ mit $k=2$. Startet man mit zwei Punkten aus unterschiedlichen Naturclustern (z. B. $(0,0)$ und $(10,10)$), landet die Zuordnung in einer Runde bei $\{(0,0),(1,0)\}$ und $\{(10,10),(11,10)\}$ mit Zentroiden $(0{,}5,\,0)$ und $(10{,}5,\,10)$. Startet man dagegen mit zwei Punkten aus demselben Naturcluster (z. B. $(0,0)$ und $(1,0)$), braucht es einige Runden, bis die Zentroiden auseinanderwandern — dasselbe Endresultat, aber nicht in einer Runde.

## Skalen, Aufsicht, Distanzen

- **Abstandsbasierte Verfahren** (SVM, k-Means, kNN) und die varianzbasierte PCA brauchen vergleichbare Merkmals-Skalen — sonst dominiert das Merkmal mit den größten Zahlenwerten. Standardisieren (Mittelwert 0, Standardabweichung 1), Statistiken nur aus den Trainingsdaten.
- **Überwacht**: SVM (braucht Labels). **Unüberwacht**: PCA und k-Means (keine Labels). $k$ ist ein Hyperparameter, kein Label — k-Means ist trotzdem unüberwacht.

## Typische Fehler

- PCA ohne Zentrieren — dann ist die erste Komponente oft nur der Mittelwert.
- `eigh`-Eigenwerte nicht absteigend sortieren.
- Varianzanteil ohne Normierung auf die Eigenwertsumme angeben.
- k-Means ohne festen Seed: jeder Lauf ein anderes Ergebnis.
- Skalen ignorieren und die Dominanz eines großen Merkmals wundern.

## Direkter Check

Klär die Konzepte in [w16-e1](#/exercise/w16-e1) und [w16-e3](#/exercise/w16-e3), rechne den Varianzanteil in [w16-e2](#/exercise/w16-e2) und implementiere PCA plus k-Means in [w16-e4](#/exercise/w16-e4). Transfer: [w16-e5](#/exercise/w16-e5) verkettet Skalieren, PCA und Clustering.
