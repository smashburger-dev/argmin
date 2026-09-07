# Checkpoint: Tokenisierung

Selbsttest vor dem Weitergehen:

1. Warum kann ein reiner Wort-Tokenizer den Round-Trip `decode(encode(s)) == s` für neue Texte nicht garantieren, ein Subword-Tokenizer aber schon?
2. Korpus `aa`, `aa`, `ab`: Welches Paar wird im ersten BPE-Schritt gelernt, und welcher Tie-Break greift, wenn `(a,a)` und `(a,b)` gleich oft vorkämen?
3. Ein Vokabular hat 30 Zeichen, 45 gelernte Merges und 4 Sondertokens — wie groß ist es, und wie viele Tokens hat `lowest`, wenn die Mergetabelle `es`, `est` und `lo` enthält?

Prüfe danach mit einer Einstiegsaufgabe und der [Kernaufgabe](#/family/trace-assignment-state/char-encode-roundtrip-trace/0/core); die Implementierungen reichen von der [Kernaufgabe](#/family/transform-tokenize-roundtrip/char-encode-roundtrip/0/core) bis zur [Herausforderung](#/family/optimize-bpe-merge-learn/bpe-merge-learn/0/challenge).
