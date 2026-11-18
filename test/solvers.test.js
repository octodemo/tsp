// Every implemented solver must return a valid route on a small dataset.
// Unimplemented workshop stubs are skipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSolvers } from '../src/solvers/index.js';
import { buildMatrix } from '../src/lib/distance.js';
import { createRng } from '../src/lib/random.js';
import { validateRoute } from '../src/lib/score.js';
import { nearestNeighbourRoute } from '../src/solvers/nearest-neighbour.js';
import { loadDataset } from '../src/lib/dataset.js';

const ds = loadDataset('data/uk-30.json');
const { get: dist } = buildMatrix(ds.cities, ds.distance);
const n = ds.cities.length;

for (const solver of await loadSolvers()) {
  test(`${solver.name} returns a valid route`, async (t) => {
    const ctx = {
      cities: ds.cities, n, dist, rng: createRng(1), timeLimitMs: 500,
      deadline: Date.now() + 500, report: () => {}, initialRoute: nearestNeighbourRoute(n, dist),
    };
    let route;
    try {
      route = await solver.solve(ctx);
    } catch (err) {
      if (err.name === 'NotImplementedError') return t.skip('not implemented yet');
      throw err;
    }
    validateRoute(route, n);
    assert.equal(route.length, n);
  });
}
