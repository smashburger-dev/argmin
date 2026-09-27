// Bank families are choice families that draw their instance parameters
// straight from a scenario bank instead of computing them. The bank JSON
// carries the full family contract, so a bank family needs no JS module of
// its own. Adding a new bank family means:
//   1. a bank JSON in content/banks with a `contract` field,
//   2. an import in this module,
//   3. a matching anchor entry in content/families.
import { makeChoiceFamily } from './generator_draw_kit.mjs';

import attackSurfaceBank from '../../../content/banks/classify-attack-surface.json' with { type: 'json' };
import attentionRolesBank from '../../../content/banks/classify-attention-roles.json' with { type: 'json' };
import backpropPathBank from '../../../content/banks/classify-backprop-path-rule.json' with { type: 'json' };
import cvLeakageBank from '../../../content/banks/classify-cv-leakage.json' with { type: 'json' };
import decodingStrategyBank from '../../../content/banks/classify-decoding-strategy.json' with { type: 'json' };
import dropoutRegimeBank from '../../../content/banks/classify-dropout-regime.json' with { type: 'json' };
import evalHazardBank from '../../../content/banks/classify-eval-hazard.json' with { type: 'json' };
import evidenceDemoBank from '../../../content/banks/classify-evidence-vs-demo.json' with { type: 'json' };
import fairnessAggBank from '../../../content/banks/classify-fairness-aggregation.json' with { type: 'json' };
import freezePurposeBank from '../../../content/banks/classify-freeze-purpose.json' with { type: 'json' };
import freezeScopeBank from '../../../content/banks/classify-freeze-scope.json' with { type: 'json' };
import hashSemanticsBank from '../../../content/banks/classify-hash-semantics.json' with { type: 'json' };
import provenanceDutyBank from '../../../content/banks/classify-provenance-duty.json' with { type: 'json' };
import questionQualityBank from '../../../content/banks/classify-question-quality.json' with { type: 'json' };
import ragStageBank from '../../../content/banks/classify-rag-stage.json' with { type: 'json' };
import silentFallbackBank from '../../../content/banks/classify-silent-fallback-hazard.json' with { type: 'json' };
import subwordBank from '../../../content/banks/classify-subword-principle.json' with { type: 'json' };
import toolPolicyBank from '../../../content/banks/classify-tool-policy.json' with { type: 'json' };
import trainingCurveBank from '../../../content/banks/classify-training-curve.json' with { type: 'json' };
import linalgSynthBank from '../../../content/banks/construct-linalg-contract-synthesis.json' with { type: 'json' };

const BANKS = [
  attackSurfaceBank,
  attentionRolesBank,
  backpropPathBank,
  cvLeakageBank,
  decodingStrategyBank,
  dropoutRegimeBank,
  evalHazardBank,
  evidenceDemoBank,
  fairnessAggBank,
  freezePurposeBank,
  freezeScopeBank,
  hashSemanticsBank,
  provenanceDutyBank,
  questionQualityBank,
  ragStageBank,
  silentFallbackBank,
  subwordBank,
  toolPolicyBank,
  trainingCurveBank,
  linalgSynthBank,
];

export const CHOICE_BANK_FAMILY_SPECS = BANKS.map(
  ({ contract, capsules, shapeError, keyBy }) => (
    makeChoiceFamily({ contract, capsules, shapeError, keyBy })
  ),
);
