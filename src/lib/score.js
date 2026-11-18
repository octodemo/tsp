import { buildMatrix, tourLength } from './distance.js';

/** Validate a route and return its length. Throws on an invalid route. */
export function validateRoute(route, n) {
  if (!Array.isArray(route)) throw new Error('route must be an array');
  if (route.length !== n) throw new Error(`route has ${route.length} stops, expected ${n}`);
  const seen = new Uint8Array(n);
  for (const id of route) {
    if (!Number.isInteger(id) || id < 0 || id >= n) throw new Error(`invalid city id: ${id}`);
    if (seen[id]) throw new Error(`city ${id} visited more than once`);
    seen[id] = 1;
  }
}

export function scoreRoute(dataset, route, matrix = buildMatrix(dataset.cities, dataset.distance)) {
  validateRoute(route, dataset.cities.length);
  return tourLength(route, matrix.get);
}
