#!/bin/bash
# Vendor pinned runtime dependencies for the KI-Lernplattform.
# Everything is fetched once into ki-lernplattform/vendor/ so the app runs
# fully offline from a local HTTP server. No CDN at runtime.
set -euo pipefail
cd "$(dirname "$0")/.."
V=vendor
mkdir -p "$V" "$V/tmp" "$V/licenses"
fetch() { # fetch <url> <out>
  echo ">> $1"
  curl -fL --retry 3 --max-time 600 -o "$2" "$1"
}

# --- KaTeX 0.18.4 (MIT) ---
if [ ! -f "$V/katex/package.json" ]; then
  fetch "https://registry.npmjs.org/katex/-/katex-0.18.4.tgz" "$V/tmp/katex.tgz"
  mkdir -p "$V/katex" && tar -xzf "$V/tmp/katex.tgz" -C "$V/katex" --strip-components=1
  rm "$V/tmp/katex.tgz"
fi

# --- JSXGraph 1.13.2 (MIT OR LGPL-3.0-or-later; MIT chosen) ---
if [ ! -f "$V/jsxgraph/package.json" ]; then
  fetch "https://registry.npmjs.org/jsxgraph/-/jsxgraph-1.13.2.tgz" "$V/tmp/jsxgraph.tgz"
  mkdir -p "$V/jsxgraph" && tar -xzf "$V/tmp/jsxgraph.tgz" -C "$V/jsxgraph" --strip-components=1
  rm "$V/tmp/jsxgraph.tgz"
fi

# --- Pyodide 314.0.5 core (MPL-2.0) + numpy/sympy wheels from the lockfile ---
P=314.0.5
if [ ! -f "$V/pyodide/pyodide.mjs" ]; then
  fetch "https://github.com/pyodide/pyodide/releases/download/$P/pyodide-core-$P.tar.bz2" "$V/tmp/pyodide-core.tar.bz2"
  mkdir -p "$V/pyodide" && tar -xjf "$V/tmp/pyodide-core.tar.bz2" -C "$V/pyodide"
  rm "$V/tmp/pyodide-core.tar.bz2"
fi
fetch "https://cdn.jsdelivr.net/pyodide/v$P/full/pyodide-lock.json" "$V/pyodide/pyodide-lock.json"
for pkg in numpy sympy mpmath; do
  fn=$(python3 - "$V/pyodide/pyodide-lock.json" "$pkg" <<'EOF'
import json, sys
lock = json.load(open(sys.argv[1]))
pkg = lock["packages"].get(sys.argv[2]) or next(
    v for k, v in lock["packages"].items() if k.split("-")[0] == sys.argv[2])
print(pkg["file_name"])
EOF
)
  if [ ! -f "$V/pyodide/$fn" ]; then
    fetch "https://cdn.jsdelivr.net/pyodide/v$P/full/$fn" "$V/pyodide/$fn"
  fi
done
if [ ! -f "$V/licenses/pyodide-$P-MPL-2.0.txt" ]; then
  fetch "https://raw.githubusercontent.com/pyodide/pyodide/$P/LICENSE" "$V/licenses/pyodide-$P-MPL-2.0.txt"
fi
PY=3.14.2
if [ ! -f "$V/licenses/python-$PY-PSF-LICENSE.txt" ]; then
  fetch "https://raw.githubusercontent.com/python/cpython/v$PY/LICENSE" "$V/licenses/python-$PY-PSF-LICENSE.txt"
fi
python3 - "$V/pyodide" "$V/licenses" <<'EOF'
from pathlib import Path
from sys import argv
from zipfile import ZipFile

root, out = map(Path, argv[1:])
specs = [
    ('numpy-2.4.6-cp314-cp314-pyemscripten_2026_0_wasm32.whl', 'numpy-2.4.6-LICENSES.txt', lambda n: '.dist-info/licenses/' in n),
    ('sympy-1.14.0-py3-none-any.whl', 'sympy-1.14.0-LICENSES.txt', lambda n: '.dist-info/licenses/' in n or n == 'sympy/parsing/latex/LICENSE.txt'),
    ('mpmath-1.4.1-py3-none-any.whl', 'mpmath-1.4.1-BSD-3-Clause.txt', lambda n: n.endswith('.dist-info/licenses/LICENSE')),
]
for wheel, target, include in specs:
    with ZipFile(root / wheel) as archive:
        entries = sorted(name for name in archive.namelist() if include(name))
        if not entries:
            raise RuntimeError(f'No license entries in {wheel}')
        sections = []
        for entry in entries:
            sections.extend(['=' * 80, entry, '=' * 80, archive.read(entry).decode('utf-8', 'replace').rstrip(), ''])
    (out / target).write_text('\n'.join(sections), encoding='utf-8')
EOF

# --- MathLive 0.110.0 (MIT) — math input, pinned by SHA-256 ---
ML_SHA="3d8ce458805388d65b2a6743eafbb712afbdd77793255f0a010b20d27513217d"
if [ ! -f "$V/mathlive/mathlive.min.mjs" ]; then
  fetch "https://registry.npmjs.org/mathlive/-/mathlive-0.110.0.tgz" "$V/tmp/mathlive.tgz"
  echo "$ML_SHA  $V/tmp/mathlive.tgz" | shasum -a 256 -c -
  mkdir -p "$V/mathlive" && tar -xzf "$V/tmp/mathlive.tgz" -C "$V/mathlive" --strip-components=1 \
    package/mathlive.min.mjs package/LICENSE.txt package/package.json package/fonts
  rm "$V/tmp/mathlive.tgz"
fi

echo "ALL DOWNLOADS DONE"
du -sh "$V"/* | sed 's/^/  /'
