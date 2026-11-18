import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { project, projectMap, layoutLabels, LANDMARKS, buildTour, truckAt, segmentIntersectsBox } from '../viewer/scene.js';
import { COUNTRY_OUTLINES } from '../viewer/countries.js';

test('viewer centers Cartesian points and handles coincident cities', () => {
  const points = project([{ x: 0, y: 0 }, { x: 100, y: 100 }], 1000, 760);
  assert.equal((points[0].x + points[1].x) / 2, 500);
  assert.equal((points[0].y + points[1].y) / 2, 380);
  assert.deepEqual(project([{ x: 3, y: 3 }, { x: 3, y: 3 }], 1000, 760),
    [{ x: 500, y: 380 }, { x: 500, y: 380 }]);
  assert.deepEqual(project([], 1000, 760), []);
});

test('geographic projection preserves longitude order and puts north at the top', () => {
  const points = project([{ lat: 50, lon: 3 }, { lat: 54, lon: 3 }, { lat: 50, lon: 6 }], 1000, 760);
  assert.equal(points[0].x, points[1].x);
  assert.ok(points[1].y < points[0].y);
  assert.ok(points[2].x > points[0].x);
});

for (const name of ['uk-30', 'nl-30']) {
  for (const width of [270, 280, 340, 680, 1000]) {
    test(`${name} keeps all major-city landmarks and collision-free labels at ${width}px`, () => {
      const { cities } = JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
      const height = width < 320 ? 860 : 720;
      const { points, outlines } = projectMap(cities, width, height, COUNTRY_OUTLINES[name]);
      for (const p of [...points, ...outlines.flat()]) {
        assert.ok(p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
      }
      const route = cities.map((_, i) => i);
      const labels = layoutLabels(cities, points, width, height, text => text.length * 6, route);
      const majorIds = cities.flatMap((c, id) => LANDMARKS[c.name] ? [id] : []);
      assert.deepEqual(labels.filter(l => l.landmark).map(l => l.id).sort((a, b) => a - b), majorIds);
      labels.forEach((a, i) => {
        assert.ok(a.x >= 0 && a.x + a.w <= width);
        assert.ok(a.y >= 0 && a.y + a.h <= height);
        assert.ok(a.h <= (a.landmark ? 50 : 22));
        for (const [i, id] of route.entries()) {
          assert.equal(segmentIntersectsBox(points[id], points[route[(i + 1) % route.length]], a), false);
        }
        for (const b of labels.slice(i + 1)) {
          assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
        }
      });
    });
  }
}

test('country outlines and cities use the exact same projection', () => {
  const cities = [{ lat: 51, lon: 4 }, { lat: 53, lon: 6 }];
  const ring = [[4, 51], [6, 51], [6, 53], [4, 51]];
  const map = projectMap(cities, 1000, 760, [ring]);
  assert.deepEqual(map.points[0], map.outlines[0][0]);
  assert.deepEqual(map.points[1], map.outlines[0][2]);
  const synthetic = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
  assert.deepEqual(projectMap(synthetic, 1000, 760, [ring]),
    { points: project(synthetic, 1000, 760), outlines: [] });
});

test('country outlines are closed European rings, including Northern Ireland', () => {
  for (const rings of Object.values(COUNTRY_OUTLINES)) {
    for (const ring of rings) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1));
      for (const [lon, lat] of ring) assert.ok(lon > -9 && lon < 8 && lat > 49 && lat < 62);
    }
  }
  assert.ok(COUNTRY_OUTLINES['uk-30'].some(ring => ring.some(([lon, lat]) => lon < -7.5 && lat < 55)));
  assert.equal(COUNTRY_OUTLINES.berlin52, undefined);
});

test('route-clearance detection handles crossing, tangent and zero-length edges', () => {
  const box = { x: 20, y: 20, w: 20, h: 20 };
  assert.equal(segmentIntersectsBox({ x: 0, y: 30 }, { x: 60, y: 30 }, box), true);
  assert.equal(segmentIntersectsBox({ x: 0, y: 10 }, { x: 60, y: 10 }, box), true);
  assert.equal(segmentIntersectsBox({ x: 0, y: 9 }, { x: 60, y: 9 }, box), false);
  assert.equal(segmentIntersectsBox({ x: 30, y: 30 }, { x: 30, y: 30 }, box), true);
  assert.equal(segmentIntersectsBox({ x: 0, y: 0 }, { x: 0, y: 0 }, box), false);
});

test('truck follows proportional segment lengths and returns to the depot', () => {
  const points = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 40 }];
  const tour = buildTour([0, 1, 2], points);
  assert.equal(tour.length, 120);
  assert.equal(tour.segments.length, 3);
  assert.deepEqual(truckAt(tour, 0), { x: 0, y: 0, angle: 0, stops: 0 });
  assert.equal(truckAt(tour, .125).x, 15);
  assert.equal(truckAt(tour, .25).stops, 1);
  const returned = truckAt(tour, 1);
  assert.equal(returned.x, 0);
  assert.equal(returned.y, 0);
  assert.equal(returned.stops, 3);
});

test('empty and zero-length routes have stable truck positions', () => {
  assert.equal(truckAt(buildTour(null, []), .5), null);
  const tour = buildTour([0, 1], [{ x: 5, y: 5 }, { x: 5, y: 5 }]);
  const position = truckAt(tour, 1);
  assert.ok(Number.isFinite(position.x) && Number.isFinite(position.angle));
  assert.equal(position.stops, 2);
});
