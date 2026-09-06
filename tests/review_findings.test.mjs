import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = compileContent({ projectRoot: root, profile: 'public' });

test('specialist, methodology and critical reviews remain machine-readable', () => {
  assert.equal(bundle.reviews.length, 14);
  assert.ok(bundle.reviews.some((review) => review.reviewId === 'r-learning-methodology'));
  assert.ok(bundle.reviews.some((review) => review.reviewId === 'r-critical-program-review'));
  assert.ok(bundle.reviews.some((review) => review.reviewId === 'r-roadmap-weeks-31-39'));
});

test('every finding exposes evidence, uncertainty, action, priority and human-review state', () => {
  for (const review of bundle.reviews) {
    assert.ok(review.findings.length > 0);
    for (const finding of review.findings) {
      assert.ok(finding.evidence.length > 0, finding.findingId);
      assert.equal(typeof finding.uncertainty, 'string');
      assert.ok(finding.recommendation.length > 0);
      assert.ok(finding.suggestedImplementation.length > 0);
      assert.ok(finding.affectedContent.length > 0);
      assert.equal(typeof finding.humanReviewRequired, 'boolean');
      assert.ok(finding.implementationStatus);
    }
  }
});

test('unfinished roadmap phases are not represented as completed reviews', () => {
  const roadmap = bundle.reviews.filter((review) => review.reviewId.startsWith('r-roadmap-weeks-'));
  assert.equal(roadmap.length, 3);
  // ADR-0014: all three roadmap phases (W6-W17, W18-W30, W31-W39) are
  // implemented and await human didactic review; none stays blocked.
  assert.equal(roadmap.filter((review) => review.status === 'blocked').length, 0);
  assert.equal(roadmap.filter((review) => review.status === 'needs-human-review').length, 3);
  assert.equal(roadmap.flatMap((review) => review.findings).every((finding) => ['not-started', 'implemented', 'planned', 'partially-implemented', 'not-applicable'].includes(finding.implementationStatus)), true);
});
