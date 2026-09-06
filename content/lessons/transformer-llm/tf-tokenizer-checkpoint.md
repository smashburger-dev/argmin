# Checkpoint: Tokenisierung

Selbsttest vor dem Weitergehen:

1. Warum kann ein reiner Wort-Tokenizer den Round-Trip `decode(encode(s)) == s` für neue Texte nicht garantieren, ein Subword-Tokenizer aber schon?
2. Korpus `aa`, `aa`, `ab`: Welches Paar wird im ersten BPE-Schritt gelernt, und welcher Tie-Break greift, wenn `(a,a)` und `(a,b)` gleich oft vorkämen?
3. Ein Vokabular hat 30 Zeichen, 45 gelernte Merges und 4 Sondertokens — wie groß ist es, und wie viele Tokens hat `lowest`, wenn die Mergetabelle `es`, `est` und `lo` enthält?

Prüfe nach mit [w23-e2](#/exercise/w23-e2) und [w23-e3](#/exercise/w23-e3); die Implementierungen stehen in [w23-e4](#/exercise/w23-e4) bis [w23-e6](#/exercise/w23-e6).
