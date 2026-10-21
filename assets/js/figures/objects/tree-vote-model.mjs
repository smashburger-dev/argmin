import { bootstrapRecords } from './seeded-examples.mjs';

export const treeRows = Object.freeze([0, 0, 1, 1, 0, 0, 1, 1].map((label, i) => Object.freeze({ id: i, x: i + 1, y: i % 2 + 1, label })));
export function gini(rows) {
  if (!rows.length) throw new Error('Empty node');
  const labels = [...new Set(rows.map(row => row.label))];
  return 1 - labels.reduce((sum, label) => sum + (rows.filter(row => row.label === label).length / rows.length) ** 2, 0);
}

export function splitCandidates(rows, features = ['x']) {
  return features.flatMap(feature => {
    const values = [...new Set(rows.map(row => row[feature]))].sort((a, b) => a - b);
    return values.slice(1).map((value, i) => {
      const threshold = (values[i] + value) / 2;
      const left = rows.filter(row => row[feature] <= threshold), right = rows.filter(row => row[feature] > threshold);
      return { feature, threshold, left, right, leftGini: gini(left), rightGini: gini(right),
        score: (left.length * gini(left) + right.length * gini(right)) / rows.length };
    });
  });
}

// Return every optimum; deterministic ordering is only a display convention.
export function optimalSplits(rows, features = ['x']) {
  const candidates = splitCandidates(rows, features);
  const minimum = Math.min(...candidates.map(candidate => candidate.score));
  return candidates.filter(candidate => Math.abs(candidate.score - minimum) <= 1e-12);
}

function majority(rows) {
  const counts = rows.map(row => rows.filter(other => other.label === row.label).length);
  return rows[counts.indexOf(Math.max(...counts))].label;
}

export function trainTree(rows, depth = 2) {
  const prediction = majority(rows);
  if (depth === 0 || gini(rows) === 0) return { prediction };
  const split = optimalSplits(rows)[0];
  if (!split) return { prediction };
  return { prediction, feature: split.feature, threshold: split.threshold,
    left: trainTree(split.left, depth - 1), right: trainTree(split.right, depth - 1) };
}

export function treePrediction(tree, row) {
  if (!tree.left) return tree.prediction;
  return treePrediction(row[tree.feature] <= tree.threshold ? tree.left : tree.right, row);
}

export function treeVoteModel() {
  const best = optimalSplits(treeRows), chosen = best[0];
  const tree = trainTree(treeRows);
  const rightChosen = optimalSplits(chosen.right)[0];
  const refinedScore = (chosen.left.length * chosen.leftGini + chosen.right.length * rightChosen.score) / treeRows.length;
  const bootstrap = bootstrapRecords.map(record => record.indices.map(index => treeRows[index]));
  const trees = bootstrap.map(rows => trainTree(rows));
  const query = { x: 7, y: 1 }, votes = trees.map(t => treePrediction(t, query));
  const count = votes.filter(vote => vote === 1).length;
  return { rows: treeRows, parentGini: gini(treeRows), candidates: splitCandidates(treeRows), best, chosen, rightChosen, refinedScore, tree, bootstrap, trees, query, votes,
    voteCounts: [votes.length - count, count], prediction: count > votes.length / 2 ? 1 : 0 };
}
