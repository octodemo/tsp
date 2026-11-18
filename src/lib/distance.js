const EARTH_RADIUS_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;

export function euclidean(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function distanceFn(kind) {
  if (kind === 'haversine') return haversine;
  if (kind === 'euclidean') return euclidean;
  throw new Error(`Unknown distance type: ${kind}`);
}

/** Precompute an n x n distance matrix (Float64Array, row-major). */
export function buildMatrix(cities, kind) {
  const fn = distanceFn(kind);
  const n = cities.length;
  const m = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = fn(cities[i], cities[j]);
      m[i * n + j] = d;
      m[j * n + i] = d;
    }
  }
  return { n, get: (i, j) => m[i * n + j], raw: m };
}

/** Total length of a closed tour (returns to start). */
export function tourLength(route, dist) {
  let total = 0;
  for (let i = 0; i < route.length; i++) {
    total += dist(route[i], route[(i + 1) % route.length]);
  }
  return total;
}
