/** Canonical Pyodide result from fit-pca-kmeans-pipeline / pca-eigh-projection. */
export const KMEANS_PIZZA_TRACE = Object.freeze({
  solver: 'fit-pca-kmeans-pipeline/pca-eigh-projection:kmeans',
  solverSha256: 'c1fc4023325a20d2453c0ca188258ec210e23a6f5f27b0bd58d40f543f6aa5b4',
  seed: 0,
  points: Object.freeze([[0, 0], [1, 0], [10, 10], [11, 10]]),
  initialCenters: Object.freeze([[10, 10], [11, 10]]),
  rounds: Object.freeze([
    Object.freeze({ assignments: Object.freeze([0, 0, 0, 1]), centers: Object.freeze([[11 / 3, 10 / 3], [11, 10]]) }),
    Object.freeze({ assignments: Object.freeze([0, 0, 1, 1]), centers: Object.freeze([[0.5, 0], [10.5, 10]]) }),
    Object.freeze({ assignments: Object.freeze([0, 0, 1, 1]), centers: Object.freeze([[0.5, 0], [10.5, 10]]) }),
  ]),
});

