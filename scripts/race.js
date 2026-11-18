// Race every solver (in parallel worker threads) on one dataset.
//   npm run race -- --dataset data/uk-30.json [--time 5000] [--solvers two-opt,genetic-algorithm] [--seed 1]
import { Worker } from 'node:worker_threads';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../src/lib/args.js';
import { loadDataset } from '../src/lib/dataset.js';
import { loadSolvers } from '../src/solvers/index.js';

const args = parseArgs();
const datasetPath = args.dataset ?? args._[0] ?? 'data/uk-30.json';
const timeLimitMs = Number(args.time ?? 5000);
const seed = Number(args.seed ?? 1);
const ds = loadDataset(datasetPath);

let solvers = await loadSolvers();
if (args.solvers) {
  const wanted = String(args.solvers).split(',');
  solvers = solvers.filter((s) => wanted.includes(s.name));
}

const outDir = `results/${ds.name}`;
mkdirSync(outDir, { recursive: true });
const workerUrl = fileURLToPath(new URL('../src/lib/worker.js', import.meta.url));
const MAX_SNAPSHOTS = 300;

console.log(`\nRace: ${ds.name} (${ds.cities.length} cities), ${solvers.length} solvers, ${timeLimitMs} ms each, in parallel\n`);

function runSolver(solver) {
  return new Promise((resolve) => {
    const progress = [];
    const worker = new Worker(workerUrl, { workerData: { datasetPath, solverName: solver.name, timeLimitMs, seed } });
    const base = { solver: solver.name, description: solver.description, dataset: ds.name };
    const kill = setTimeout(() => {
      worker.terminate();
      resolve({ ...base, status: 'timeout', message: `exceeded ${timeLimitMs} ms limit (+2s grace)`, progress });
    }, timeLimitMs + 2000);

    worker.on('message', (msg) => {
      if (msg.type === 'progress') progress.push({ t: msg.t, distance: msg.distance, route: msg.route });
      else {
        clearTimeout(kill);
        worker.terminate();
        if (msg.type === 'done' && progress.at(-1)?.distance !== msg.distance) {
          progress.push({ t: msg.ms, distance: msg.distance, route: msg.route });
        }
        if (msg.type === 'done') resolve({ ...base, status: 'ok', route: msg.route, distance: msg.distance, ms: msg.ms, progress });
        else resolve({ ...base, status: msg.status, message: msg.message, ms: msg.ms, progress });
      }
    });
    worker.on('error', (err) => {
      clearTimeout(kill);
      resolve({ ...base, status: 'error', message: err.message, progress });
    });
  });
}

function downsample(arr, max) {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out = Array.from({ length: max - 1 }, (_, i) => arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

const results = await Promise.all(solvers.map(runSolver));

for (const r of results) {
  r.progress = downsample(r.progress, MAX_SNAPSHOTS);
  writeFileSync(`${outDir}/${r.solver}.json`, JSON.stringify(r));
}

const leaderboard = results
  .map(({ solver, description, status, distance, ms, message }) => ({
    solver, description, status, distance, ms, message,
    gapPct: ds.optimal && distance ? ((distance - ds.optimal) / ds.optimal) * 100 : undefined,
  }))
  .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

writeFileSync(`${outDir}/leaderboard.json`, JSON.stringify({ dataset: ds.name, optimal: ds.optimal, timeLimitMs, at: new Date().toISOString(), leaderboard }, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('#', 4) + pad('Solver', 24) + pad('Distance', 14) + pad('Time', 10) + (ds.optimal ? 'Gap' : ''));
console.log('-'.repeat(60));
leaderboard.forEach((r, i) => {
  if (r.status !== 'ok') return console.log(pad(i + 1, 4) + pad(r.solver, 24) + `(${r.status})`);
  console.log(pad(i + 1, 4) + pad(r.solver, 24) + pad(r.distance.toFixed(1), 14) + pad(`${r.ms} ms`, 10) + (r.gapPct !== undefined ? `${r.gapPct.toFixed(2)}%` : ''));
});
console.log(`\nResults written to ${outDir}/ - view them with: npm run serve\n`);
