# Lineare Unabhängigkeit und Rang verstehen

Vektoren sind linear unabhängig, wenn keiner von ihnen als Linearkombination der anderen geschrieben werden kann. Für zwei Vektoren in der Ebene heißt das anschaulich: Sie zeigen nicht entlang derselben Geraden.

Formal sind $v_1,\dots,v_k$ unabhängig, wenn aus

$$c_1v_1+\dots+c_kv_k=0$$

nur die triviale Lösung $c_1=\dots=c_k=0$ folgt.

## Zwei Vektoren in $\mathbb{R}^2$

Für

$$v_1=(2,1)^T,\qquad v_2=(1,3)^T$$

prüfen wir, ob ein Vektor ein Vielfaches des anderen ist. Das ist nicht der Fall. Gleichwertig ist die Determinante der Spaltenmatrix

$$\det\begin{pmatrix}2&1\\1&3\end{pmatrix}=2\cdot3-1\cdot1=5\neq0.$$

Die beiden Vektoren sind unabhängig.

Dagegen gilt für $w_1=(2,1)^T$ und $w_2=(6,3)^T$ die Beziehung $w_2=3w_1$. Hier liefert $-3w_1+w_2=0$ eine nichttriviale Koeffizientenkombination: Die Vektoren sind abhängig.

## Rang als Zahl unabhängiger Richtungen

Der Rang einer Matrix ist die Zahl ihrer Pivotpositionen. Er beschreibt zugleich die Anzahl linear unabhängiger Zeilen und Spalten.

Für

$$
A=\begin{pmatrix}
1&0&1\\
0&1&1\\
1&1&2
\end{pmatrix}
$$

ist die dritte Zeile die Summe der ersten beiden. Sie bringt keine neue unabhängige Bedingung. Nach Gauß-Elimination bleiben zwei Pivotzeilen; der Rang ist 2.

## Was Rang nicht bedeutet

- Rang ist nicht die Summe der Einträge.
- Eine $3\times3$-Matrix hat nicht automatisch Rang 3.
- Viele von null verschiedene Einträge garantieren keine Unabhängigkeit.
- Eine einzelne Determinantenregel reicht nur für quadratische Matrizen zur Vollrangprüfung.

## Durchgerechnete Prüfstrategie

1. Prüfe bei zwei Vektoren zuerst auf offensichtliche Vielfache.
2. Nutze bei kleinen quadratischen Matrizen die Determinante als schnellen Vollrangtest.
3. Verwende Gauß-Elimination, wenn die Struktur nicht sofort sichtbar ist.
4. Begründe das Ergebnis über Pivots oder eine konkrete Abhängigkeitsbeziehung.

## Direkter Check

Starte mit [Sind $b_1=(1,2)$, $b_2=(2,4)$ linear unabhängig?](#/family/classify-independence-multiple/dependent-pair-double/0/intro), berechne danach ein Skalarprodukt in [Gegeben $u=(2,-1,3)$ und $v=(1,4,-2)$. Berechne das Skalarprodukt $u^\top v$.](#/family/formula-scalar-product/dot-product-w05-e3/0/intro) und bestimme schließlich den Rang in [Bestimme den Rang der Matrix \[A=\begin{pmatrix}2&1&1\\1&2&0\\3&3&1\end{pmatrix} …](#/family/transform-rank-dependence-rowops/rank-3x3-staircase/0/core).
