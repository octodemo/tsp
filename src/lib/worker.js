// Runs a single solver in its own thread so solvers race in parallel and
// a runaway solver can be terminated without affecting the others.
import { parentPort, workerData } from 'node:worker_threads';
import { loadDataset } from './dataset.js';
import { buildMatrix, tourLength } from './distance.js';
import { createRng } from './random.js';
import { validateRoute } from './score.js';
import { loadSolvers } from '../solvers/index.js';
import { nearestNeighbourRoute } from '../solvers/nearest-neighbour.js';

const { datasetPath, solverName, timeLimitMs, seed } = workerData;
const ds = loadDataset(datasetPath);
const matrix = buildMatrix(ds.cities, ds.distance);
const dist = matrix.get;
const n = ds.cities.length;

const solver = (await loadSolvers()).find((s) => s.name === solverName);
const start = Date.now();
let best = Infinity;
let lastSent = 0;

function report(route) {
  try {
    validateRoute(route, n);
  } catch {
    return;
  }
  const length = tourLength(route, dist);
  const now = Date.now();
  if (length < best && (now - lastSent > 20 || length < best * 0.995)) {
    best = length;
    lastSent = now;
    parentPort.postMessage({ type: 'progress', t: now - start, distance: length, route: [...route] });
  }
}

function reportPartial(route) {
  if (route.length < n) {
    parentPort.postMessage({ type: 'progress', t: Date.now() - start, distance: null, route: [...route] });
  } else report(route);
}

try {
  const route = await solver.solve({
    cities: ds.cities,
    n,
    dist,
    rng: createRng(seed),
    timeLimitMs,
    deadline: start + timeLimitMs,
    report: reportPartial,
    initialRoute: nearestNeighbourRoute(n, dist),
  });
  validateRoute(route, n);
  parentPort.postMessage({ type: 'done', route, distance: tourLength(route, dist), ms: Date.now() - start });
} catch (err) {
  parentPort.postMessage({
    type: 'error',
    status: err.name === 'NotImplementedError' ? 'not-implemented' : 'error',
    message: err.message,
    ms: Date.now() - start,
  });
}
