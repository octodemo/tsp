import test from 'node:test';
import assert from 'node:assert/strict';
import { replaySteps, edgeChanges } from '../viewer/replay.js';

test('replay steps flag each new best and the edges it changed', () => {
  const steps = replaySteps({
    progress: [
      { t: 0, distance: null, route: [0, 1] },
      { t: 5, distance: 20, route: [0, 1, 2, 3] },
      { t: 9, distance: 20, route: [0, 1, 3, 2] },
      { t: 12, distance: 14, route: [0, 2, 1, 3] },
    ],
  }, 4);
  assert.deepEqual(steps.map(s => s.kind), ['building', 'first', 'no-change', 'improved']);
  assert.deepEqual(steps.map(s => s.best), [null, 20, 20, 14]);
  assert.equal(steps[3].delta, 6);
  assert.equal(steps[3].previousBest, 20);
  assert.deepEqual(steps[1].added, [[1, 2], [2, 3], [3, 0]]);
  assert.deepEqual(steps[1].removed, []);
});

test('edge changes ignore direction so a reversed segment is unchanged', () => {
  assert.deepEqual(edgeChanges([0, 1, 2, 3], [0, 3, 2, 1], 4), { added: [], removed: [] });
  const { added, removed } = edgeChanges([0, 1, 2, 3, 4], [0, 2, 1, 3, 4], 5);
  assert.deepEqual(added, [[0, 2], [1, 3]]);
  assert.deepEqual(removed, [[0, 1], [2, 3]]);
});
