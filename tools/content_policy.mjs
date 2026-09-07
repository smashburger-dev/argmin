// Single owner of the fail-closed content policy constants shared by the
// public-build validators.
// OUTPUT marker union is the strictest set any consumer ever shipped:
// adopting it everywhere can only reject more, never less — the
// cs50p-psets-harvard gap in the export scan and the .pyc/.jpeg binary
// drifts are closed by construction. Two sets deliberately stay elsewhere:
// the compile-time BUNDLE markers (tools/compile_content.mjs, field-level
// semantics like locatorPath/localPath) and the independent mirror in
// tests/source_rights_integrity.test.mjs, which must not import this module.

export const OUTPUT_PRIVATE_MARKERS = [
  /library-staging/i,
  /private-extracts/i,
  /(^|\/)library(-private)?\//i,
  /\/Users\/no8/i,
  /Draft \(2024-01-15\) of "Mathematics for Machine Learning"/i,
  /\bmml-book\b/i,
  /\bmurphy-pml\b/i,
  /\bcs50p-psets-harvard\b/i,
  /\blibrary-private\//i,
  /\bMML\s*§/i,
  // Tombstone: Numbas retired in S1B; a numbas-src revival must stay fail-closed private.
  /numbas-src/i,
];

/** File names matching this pattern must never ship in a public artifact. */
export const CANARY_NAME = /private|canary|secret/i;

/** Binary artifacts are hashed and size-counted but never decoded as UTF-8
 *  text (scanning them for private markers produces false results). */
export const BINARY_EXT = /\.(wasm|woff2?|ttf|zip|whl|exe|png|jpe?g|svg|ico|wav|pyc)$/i;
