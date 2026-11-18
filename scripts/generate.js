// Generate a synthetic dataset.
//   npm run generate -- --n 500 --seed 42 [--clustered] [--clusters 8] [--name hidden-final]
import { writeFileSync } from 'node:fs';
import { parseArgs } from '../src/lib/args.js';
import { createRng } from '../src/lib/random.js';

const args = parseArgs();
const n = Number(args.n ?? 100);
const seed = Number(args.seed ?? Date.now() % 1e9);
const clustered = Boolean(args.clustered);
const size = 1000;
const rng = createRng(seed);
const name = args.name ?? `${clustered ? 'clustered' : 'random'}-${n}`;

// Box-Muller normal sample
const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
const clamp = (v) => Math.min(size, Math.max(0, v));

const centres = Array.from({ length: Number(args.clusters ?? 8) }, () => ({
  x: 100 + rng() * (size - 200),
  y: 100 + rng() * (size - 200),
}));

const cities = Array.from({ length: n }, (_, id) => {
  let x, y;
  if (clustered) {
    const c = centres[Math.floor(rng() * centres.length)];
    x = clamp(c.x + normal() * 45);
    y = clamp(c.y + normal() * 45);
  } else {
    x = rng() * size;
    y = rng() * size;
  }
  return { id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
});

const dataset = { name, seed, distance: 'euclidean', width: size, height: size, cities };
const out = args.out ?? `data/${name}.json`;
writeFileSync(out, JSON.stringify(dataset, null, 1) + '\n');
console.log(`Wrote ${out} (${n} cities, seed ${seed}${clustered ? ', clustered' : ''})`);
