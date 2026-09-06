# S4D10: W08 Gradientenabstieg & Regression → Modul lm-grad-regression

Stand: 2026-09-06. Branch `devin/1788710932-s4d10-grad-regression` auf S4D9.

## Gebaut

- Modul `lm-grad-regression` (Lektion `l-grad-regression`, `c-grad-regression`):
  Platzierungen w08-e1…e5 + Übungsraum.
- Erste gemischte Data/ML-Familie `optimize-mse-gradient-closed-form`:
  seeded `mse-gradient-wrt-w` (genMseGradient; intro n=2, stretch n=4, Seed
  8001 = −20 wie Legacy, unabhängiger Solver aus den Punkten) + statischer
  Pyodide-Fall `grad-mse-numpy-reference` (w08-e4). Statik-Zweig in der
  Familientabelle: Fall ohne Generator → `staticCaseBody`, Profil erzwungen.
- Statik-JSON `optimize-gradient-update-rule` (w08-e1 intro-MC ohne Mastery,
  w08-e5 Pyodide stretch).
- `trace-assignment-state` (Foundations) erhält statischen Fall
  `gradient-loop-two-updates` (w08-e3, Kompetenz-Override E9).

## Gates

Suite 1029/1032 (Host-`sympy`), Typecheck, Build (JS 83,5 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Messung

Runtime 11.880 → 11.983 (+103), Tests +80, Content-JSON +353.

## Offen

- Linalg-Mischfamilien (`formula-scalar-product` u. a.) und der neue Trace-
  Statikfall erzwingen das Ein-Profil nicht am Generator (nur Registry-Regel
  für rein statische Familien). Kandidat für S5A: Statik-Zweig zentral in
  der Registry statt pro Familiendatei.
- S4D11 W09 (Baselines: genBaselineCorrect).
