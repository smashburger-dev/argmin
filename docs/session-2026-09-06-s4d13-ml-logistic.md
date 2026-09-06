# S4D13: W11 Logistische Regression & Klassifikation → Modul lm-ml-logistic

Stand: 2026-09-06. Branch `devin/1788712456-s4d13-ml-logistic` auf S4D12.

## Gebaut

- Modul `lm-ml-logistic` (Lektion `l-ml-logistic`, `c-ml-logistic`): w11-e1…e5 + Übungsraum.
- Gemischte Familie `aggregate-confusion-metric`: seeded `confusion-marginal-count`
  (genConfusionCount, Seed 11001 = 117; intro = vorhergesagt positiv,
  stretch = tatsächlich negativ, Rohakzeptanz 33,1 % / 33,6 %) + drei statische
  Fälle (Schwellen-MC bei asymmetrischen Kosten, Sigmoid-NumPy, Kostenreport).
  W28/W29/W33 liefern später weitere Fälle.
- Statik-JSON `classify-sigmoid-regime` (w11-e1, intro-MC, kein Mastery).

## Gates

Suite 1039/1042 (Host-`sympy`), Typecheck, Build (JS 84,9 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Offen

S4D14 W12 Kreuzvalidierung (genCvSpread; `reproduce-seeded-split` bekommt w12-e4).
