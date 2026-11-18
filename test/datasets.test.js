import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../src/lib/dataset.js';
import { buildMatrix } from '../src/lib/distance.js';
import { scoreRoute, validateRoute } from '../src/lib/score.js';
import { nearestNeighbourRoute } from '../src/solvers/nearest-neighbour.js';

const ds = loadDataset('data/nl-30.json');

test('nl-30 contains 30 distinct Dutch city locations in dataset order', () => {
  assert.equal(ds.name, 'nl-30');
  assert.equal(ds.units, 'km');
  assert.equal(ds.distance, 'haversine');
  assert.equal(ds.cities.length, 30);
  assert.equal(new Set(ds.cities.map((city) => city.name)).size, 30);
  assert.equal(new Set(ds.cities.map((city) => `${city.lat},${city.lon}`)).size, 30);
  ds.cities.forEach((city, i) => {
    assert.equal(city.id, i);
    assert.ok(typeof city.name === 'string' && city.name.length > 0);
    assert.ok(Number.isFinite(city.lat) && city.lat >= 50.7 && city.lat <= 53.6);
    assert.ok(Number.isFinite(city.lon) && city.lon >= 3.3 && city.lon <= 7.3);
  });
});

test('nl-30 supports distance calculation and a scored solver route', () => {
  const { get: dist } = buildMatrix(ds.cities, ds.distance);
  const amsterdam = ds.cities.find((city) => city.name === 'Amsterdam');
  const rotterdam = ds.cities.find((city) => city.name === 'Rotterdam');
  assert.ok(Math.abs(dist(amsterdam.id, rotterdam.id) - 57) < 2);
  for (let i = 0; i < ds.cities.length; i++) {
    assert.equal(dist(i, i), 0);
    for (let j = i + 1; j < ds.cities.length; j++) {
      assert.ok(Number.isFinite(dist(i, j)) && dist(i, j) > 0);
      assert.equal(dist(i, j), dist(j, i));
    }
  }
  const route = nearestNeighbourRoute(ds.cities.length, dist);
  validateRoute(route, ds.cities.length);
  const distance = scoreRoute(ds, route);
  assert.ok(Number.isFinite(distance) && distance > 0);
});
