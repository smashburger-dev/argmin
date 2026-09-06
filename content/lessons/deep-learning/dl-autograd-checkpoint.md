# Checkpoint: Kettenregel im Graph

1. Ein Pfad trägt die lokalen Gradienten $-2$, $3$ und $5$; der Upstream-Gradient am Ausgang ist $2$. Wie groß ist $\partial L / \partial x$ am Eingang?
2. Ein Eingang geht in zwei Zweige: Zweig A multipliziert mit $4$, Zweig B quadriert (lokaler Gradient $2x$ bei $x = 3$). Beide Zweige enden in $L$. Wie groß ist $\partial L / \partial x$, wenn der Upstream in beiden Zweigen $1$ ist?
3. Warum steht im Backward-Pass einer ReLU-Schicht die Maske $(H > 0)$ und nicht der Wert $H$?

Kontrolliere: (1) $2 \cdot (-2 \cdot 3 \cdot 5) = -60$ — lokal mal upstream, Produkt entlang des Pfades; (2) $1 \cdot 4 + 1 \cdot 6 = 10$ — Summe über die Zweige; (3) die Ableitung von $\max(0, z)$ ist $1$ für $z > 0$ und $0$ sonst — ein Schalter, keine Skalierung.
