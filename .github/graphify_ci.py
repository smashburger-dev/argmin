#!/usr/bin/env python3
"""Generate a portable AST graph and publish it to the dedicated graphify branch."""

import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

PRODUCER = 'lifemaxxing-graphify/v1'


def run(*arguments, cwd=None):
    return subprocess.check_output(arguments, cwd=cwd, text=True).strip()


def validate(graph):
    ids = {node['id'] for node in graph['nodes']}
    if not ids or len(ids) != len(graph['nodes']):
        raise ValueError('Empty graph or duplicate node IDs')
    for edge in graph['links']:
        if edge['source'] not in ids or edge['target'] not in ids:
            raise ValueError('Dangling graph edge')
    for node in graph['nodes']:
        source = node.get('source_file') or ''
        if Path(source).is_absolute() or '..' in Path(source).parts:
            raise ValueError(f'Nonportable source path: {source}')


def metadata(root, graph_path):
    return {'producer': PRODUCER, 'repository': os.environ['GITHUB_REPOSITORY'],
        'source_sha': os.environ['GITHUB_SHA'],
        'graphify_version': importlib.metadata.version('graphifyy'),
        'policy_sha256': hashlib.sha256((root / '.graphifyignore').read_bytes()).hexdigest(),
        'graph_sha256': hashlib.sha256(graph_path.read_bytes()).hexdigest()}


def build(root, output):
    run('graphify', 'extract', str(root), '--code-only', '--force', '--no-cluster',
        '--max-workers', '2', '--out', str(output))
    graph = output / 'graphify-out/graph.json'
    run('graphify', 'cluster-only', str(root), '--graph', str(graph), '--no-label', '--no-viz')
    validate(json.loads(graph.read_text()))
    (graph.parent / 'metadata.json').write_text(json.dumps(metadata(root, graph), indent=2) + '\n')
    return graph.parent


def publication_tree(root, target):
    # Only the CI checkout is modified. Existing graphify history stays versioned.
    ref = run('git', 'ls-remote', 'origin', 'refs/heads/graphify', cwd=root)
    if ref:
        run('git', 'fetch', '--depth', '1', 'origin',
            'refs/heads/graphify:refs/remotes/origin/graphify', cwd=root)
        run('git', 'worktree', 'add', '--detach', str(target), 'refs/remotes/origin/graphify', cwd=root)
        previous = json.loads((target / 'metadata.json').read_text())
        if previous.get('producer') != PRODUCER:
            raise ValueError('graphify branch is not owned by this workflow')
    else:
        run('git', 'worktree', 'add', '--detach', str(target), 'HEAD', cwd=root)
        # switch --orphan clears tracked source files and the index together.
        run('git', 'switch', '--orphan', 'graphify-output', cwd=target)
    return target


def publish(root, bundle, output):
    latest = run('git', 'ls-remote', 'origin', 'refs/heads/main', cwd=root).split()[0]
    if latest != os.environ['GITHUB_SHA']:
        print('main advanced during extraction; newer workflow will publish')
        return
    target = publication_tree(root, output / 'publication')
    for name in ('graph.json', 'GRAPH_REPORT.md', 'metadata.json'):
        shutil.copyfile(bundle / name, target / name)
    run('git', 'config', 'user.name', 'github-actions[bot]', cwd=target)
    run('git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com', cwd=target)
    run('git', 'add', 'graph.json', 'GRAPH_REPORT.md', 'metadata.json', cwd=target)
    if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=target).returncode == 0:
        print('Graph is already published')
        return
    run('git', 'commit', '-m', f'Graph for {os.environ["GITHUB_SHA"]}', cwd=target)
    run('git', 'push', 'origin', 'HEAD:refs/heads/graphify', cwd=target)


def main():
    if os.environ.get('GITHUB_REF') != 'refs/heads/main':
        raise ValueError('Only main may publish the graphify branch')
    root = Path.cwd()
    if run('git', 'rev-parse', 'HEAD') != os.environ['GITHUB_SHA']:
        raise ValueError('Checkout does not match event SHA')
    output = Path(tempfile.mkdtemp(dir=os.environ.get('RUNNER_TEMP'), prefix='graphify-ci-'))
    bundle = build(root, output)
    publish(root, bundle, output)


if __name__ == '__main__':
    main()
