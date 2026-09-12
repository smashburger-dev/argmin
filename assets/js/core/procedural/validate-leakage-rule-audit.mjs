// Procedural family validate-leakage-rule-audit: the task text, starter code
// and reference solver stay fixed; the seed draws fresh pipelines (dict steps
// for the stretch case, plain action strings for the challenge case) that get
// appended to the curated base test block as literal __check lines. Expected
// values are asserted inline against a __ref_ copy of the reference solver,
// so the grading contract cannot drift. Mirrors palindromExtraCases in
// foundations_construct_families.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';

const AUDIT_STARTER = `def audit_pipeline(steps):
    # a step leaks if its lower-cased action matches at least one rule:
    # 1) 'ziel' AND 'feature'  (target leak)
    # 2) 'alle zeilen'         (statistic computed before the split)
    # 3) 'test' AND 'fit'      (fitted on the test set)
    # return the sorted list of 0-based indices of leaking steps
    ...
`;

const SPLIT_STARTER = `def audit_pipeline(steps):
    # return sorted indices matching the three leakage rules
    ...
`;

const AUDIT_BASE_TESTS = `clean = [
    {'step': 'split',  'action': 'Deterministischer Train/Test-Split mit Seed'},
    {'step': 'impute', 'action': 'Mittelwert der Train-Spalten als Fill-Wert'},
    {'step': 'fit',    'action': 'Modell auf Train gefittet'},
    {'step': 'report', 'action': 'Bewertung auf Test'},
]
__check('saubere Pipeline: keine Leaks', audit_pipeline(clean) == [])
target_leak = [
    {'step': 'features', 'action': 'Ziel-Spalte als Feature uebernommen'},
    {'step': 'split',    'action': 'Deterministischer Train/Test-Split'},
    {'step': 'fit',      'action': 'Modell auf Train gefittet'},
]
__check('Ziel-Leak an Position 0', audit_pipeline(target_leak) == [0])
scaler_leak = [
    {'step': 'scale', 'action': 'Standardisierung ueber alle Zeilen'},
    {'step': 'split', 'action': 'Deterministischer Train/Test-Split'},
    {'step': 'fit',   'action': 'Modell auf Train gefittet'},
]
__check('Skalier-Leak vor Split an Position 0', audit_pipeline(scaler_leak) == [0])
multi_leak = [
    {'step': 'engineer', 'action': 'Ziel-Mittelwert als Feature eingefuegt'},
    {'step': 'scale',    'action': 'Standardisierung ueber alle Zeilen'},
    {'step': 'split',    'action': 'Deterministischer Train/Test-Split'},
    {'step': 'refit',    'action': 'Transformation auf Test neu gefittet'},
]
__check('drei Leaks: Indizes [0, 1, 3] sortiert', audit_pipeline(multi_leak) == [0, 1, 3])
__check('leere Pipeline: leere Liste', audit_pipeline([]) == [])
hidden_case = [
    {'step': 'build', 'action': 'Feature aus Ziel-Transformation abgeleitet'},
    {'step': 'valid', 'action': 'Cross-Validation ueber fuenf Folds'},
]
__check('unbekannte Pipeline: nur Regel 1 schlaegt zu', audit_pipeline(hidden_case) == [0])
`;

const SPLIT_BASE_TESTS = `steps = ["split train and test", "fit scaler on train rows", "fit model on train features", "score on test rows"]
__check("clean", audit_pipeline(steps) == [])
leaky = ["Mittelwert über alle Zeilen berechnen", "fit scaler on train", "fit model on test features"]
__check("all-rows and test-fit", audit_pipeline(leaky) == [0, 2])
__check("case-insensitive", audit_pipeline(["ZIEL als FEATURE verwenden"]) == [0])`;

const AUDIT_REFERENCE = `def audit_pipeline(steps):
    '''Return sorted indices of leaking steps by three keyword rules.'''
    leaks = []
    for idx, step in enumerate(steps):
        action = str(step.get('action', '')).lower()
        is_leak = False
        if 'ziel' in action and 'feature' in action:
            is_leak = True
        if 'alle zeilen' in action:
            is_leak = True
        if 'test' in action and 'fit' in action:
            is_leak = True
        if is_leak:
            leaks.append(idx)
    return leaks
`;

const SPLIT_REFERENCE = `def audit_pipeline(steps):
    out = []
    for i, step in enumerate(steps):
        text = str(step).lower()
        if ("ziel" in text and "feature" in text) or "alle zeilen" in text or ("test" in text and "fit" in text):
            out.append(i)
    return out`;

const AUDIT_PROMPT = 'Final Boss: Leakage-Auditor für beschriebene Pipelines. `audit_pipeline(steps)` bekommt eine Liste von Schritten, jeder Schritt ist `{\'step\': name, \'action\': beschreibung}`. Rückgabe: aufsteigend sortierte Liste der 0-basierten Indizes aller Schritte, die leaken. Ein Schritt leakt, wenn seine kleingeschriebene Aktion mindestens eine Regel trifft: (1) Ziel-Leak: enthält \'ziel\' UND \'feature\'; (2) Statistik vor dem Split: enthält \'alle zeilen\'; (3) Fit auf Test: enthält \'test\' UND \'fit\'. Beispiel: \'Standardisierung über alle Zeilen\' → Regel 2; \'Modell auf Train gefittet\' → keine Regel (kein \'test\').';

const SPLIT_PROMPT = 'Implementiere den Audit-Vertrag: melde die sortierten 0-basierten Indizes von Schritten, die Ziel-Leakage, Vorab-Statistiken über alle Zeilen oder Fitting auf Testdaten enthalten.';

const AUDIT_SOLUTION = AUDIT_REFERENCE;
const SPLIT_SOLUTION = SPLIT_REFERENCE;

// Draw banks: clean strings contain at most one marker of each AND-rule and
// never 'alle zeilen'; leak strings each trigger at least one rule. The
// __ref_ oracle decides, so any mixture is contract-true.
const CLEAN_ACTIONS = [
  'Deterministischer Train/Test-Split mit Seed',
  'Mittelwert der Train-Spalten als Fill-Wert',
  'Modell auf Train gefittet',
  'Bewertung auf Test',
  'Cross-Validation ueber fuenf Folds',
  'Feature-Selektion auf Train',
  'Ziel-Verteilung der Train-Daten geprueft',
  'Imputation auf Train gefittet',
  'Test-Metriken in den Bericht geschrieben',
  'Kalendarischer Split nach Datum',
  'fit model on train features',
  'score on test rows',
];

const LEAK_ACTIONS = [
  'Ziel-Spalte als Feature uebernommen',
  'Ziel-Mittelwert als Feature eingefuegt',
  'Feature aus Ziel-Transformation abgeleitet',
  'Standardisierung ueber alle Zeilen',
  'Skalierung ueber alle Zeilen berechnet',
  'Imputation ueber alle Zeilen gelernt',
  'Transformation auf Test neu gefittet',
  'Scorer auf dem Test-Set gefittet',
  'Kalibrierung auf Testdaten gefittet',
  'fit model on test features',
];

const STEP_NAMES = ['split', 'scale', 'impute', 'fit', 'report', 'engineer', 'valid', 'build', 'score', 'select'];

// Minimal JS -> Python literal serializer for the JSON-safe draw structures.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Renames the public functions of the reference solver so the test block can
// keep an inline oracle copy next to the seeded literals.
const refCopy = (source, names) => names.reduce(
  (text, name) => text.replaceAll(`def ${name}(`, `def __ref_${name}(`),
  source,
);

const drawActions = (r, len) => Array.from(
  { length: len },
  () => (r() < 0.4 ? pick(r, LEAK_ACTIONS) : pick(r, CLEAN_ACTIONS)),
);

export const LEAKAGE_AUDIT_CASES = {
  'pipeline-leakage-audit': {
    difficulty: 'stretch',
    packages: ['numpy'],
    starterCode: AUDIT_STARTER,
    baseTests: AUDIT_BASE_TESTS,
    referenceSolver: AUDIT_REFERENCE,
    prompt: AUDIT_PROMPT,
    fullSolution: AUDIT_SOLUTION,
    prelude: refCopy(AUDIT_REFERENCE, ['audit_pipeline']),
    draw(r) {
      const len = randInt(r, 3, 6);
      const steps = drawActions(r, len).map((action) => ({ step: pick(r, STEP_NAMES), action }));
      return { steps };
    },
    emit({ steps }, index) {
      return [
        `__steps${index} = ${pyLit(steps)}`,
        `__check('seeded audit ${index}', audit_pipeline(__steps${index}) == __ref_audit_pipeline(__steps${index}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'pipeline-clean-split': {
    difficulty: 'challenge',
    packages: [],
    starterCode: SPLIT_STARTER,
    baseTests: SPLIT_BASE_TESTS,
    referenceSolver: SPLIT_REFERENCE,
    prompt: SPLIT_PROMPT,
    fullSolution: SPLIT_SOLUTION,
    prelude: refCopy(SPLIT_REFERENCE, ['audit_pipeline']),
    draw(r) {
      return { steps: drawActions(r, randInt(r, 3, 6)) };
    },
    emit({ steps }, index) {
      return [
        `__steps${index} = ${pyLit(steps)}`,
        `__check('seeded audit ${index}', audit_pipeline(__steps${index}) == __ref_audit_pipeline(__steps${index}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const LEAKAGE_AUDIT_CONTRACT = {
  familyId: 'validate-leakage-rule-audit',
  familyGroup: 'validate-contract',
  summary: 'Prüft Pipelines auf Ziel-, Statistik- und Test-Leakage.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'pipeline-leakage-audit', propertyTest: false },
    { caseId: 'pipeline-clean-split', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'challenge'],
  competencyIds: ['c-ml-cv'],
};

// The per-case prelude (renamed reference copy) is emitted once at the top of
// the seeded block; all per-draw checks call into it.
const FAMILY = makeCaseFamily({
  contract: LEAKAGE_AUDIT_CONTRACT,
  cases: LEAKAGE_AUDIT_CASES,
  shapeError: 'Leakage-Audit-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${[
      caseDef.prelude,
      ...seedCases.map((entry, i) => caseDef.emit(entry, i + 1)),
    ].join('\n\n')}`,
});

export const leakageAuditCaseOk = FAMILY.caseOk;
export const genLeakageAuditCase = FAMILY.genCase;
export const solveLeakageAuditFamily = FAMILY.solve;
export const generateLeakageAuditFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
