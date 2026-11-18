import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export function loadDataset(path) {
  const ds = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(ds.cities) || ds.cities.length < 3) {
    throw new Error(`${path}: dataset must contain at least 3 cities`);
  }
  ds.name ??= basename(path, '.json');
  ds.distance ??= 'lat' in ds.cities[0] ? 'haversine' : 'euclidean';
  ds.cities.forEach((c, i) => {
    if (c.id !== i) throw new Error(`${path}: city ids must be 0..n-1 in order (bad id at index ${i})`);
  });
  return ds;
}
