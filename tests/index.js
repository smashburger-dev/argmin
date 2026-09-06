// Aggregator so that `node --test tests/` works on Node >= 26, where a
// directory argument is resolved as a module entry instead of being scanned.
// Loads every *.test.mjs in this directory (awaited so test registration
// completes before the runner finishes).
const { readdirSync } = require('node:fs');
const { join } = require('node:path');

(async () => {
  for (const f of readdirSync(__dirname).sort()) {
    if (f.endsWith('.test.mjs')) await import(join(__dirname, f));
  }
})();
