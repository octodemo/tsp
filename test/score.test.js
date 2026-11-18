import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRoute, scoreRoute } from '../src/lib/score.js';
import { haversine } from '../src/lib/distance.js';

const square = { distance: 'euclidean', cities: [
  { id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 0 }, { id: 2, x: 1, y: 1 }, { id: 3, x: 0, y: 1 },
] };

test('scores a closed tour', () => {
  assert.equal(scoreRoute(square, [0, 1, 2, 3]), 4);
});

test('a crossing tour is longer', () => {
  assert.ok(scoreRoute(square, [0, 2, 1, 3]) > 4);
});

test('rejects invalid routes', () => {
  assert.throws(() => validateRoute([0, 1, 2], 4), /expected 4/);
  assert.throws(() => validateRoute([0, 1, 1, 3], 4), /more than once/);
  assert.throws(() => validateRoute([0, 1, 2, 9], 4), /invalid city/);
});

test('haversine London -> Edinburgh is about 534 km', () => {
  const d = haversine({ lat: 51.5074, lon: -0.1278 }, { lat: 55.9533, lon: -3.1883 });
  assert.ok(Math.abs(d - 534) < 5, `got ${d}`);
});
