// Independently verify a solution file.
//   npm run score -- data/uk-30.json results/uk-30/two-opt.json
import { readFileSync } from 'node:fs';
import { loadDataset } from '../src/lib/dataset.js';
import { scoreRoute } from '../src/lib/score.js';

const [dsPath, solPath] = process.argv.slice(2);
if (!dsPath || !solPath) {
  console.error('Usage: npm run score -- <dataset.json> <solution.json>');
  process.exit(1);
}
const ds = loadDataset(dsPath);
const sol = JSON.parse(readFileSync(solPath, 'utf8'));
try {
  const length = scoreRoute(ds, sol.route);
  const claimed = sol.distance;
  console.log(`${sol.solver ?? solPath}: valid route, length ${length.toFixed(2)}`);
  if (claimed !== undefined && Math.abs(claimed - length) > 1e-6) {
    console.warn(`WARNING: claimed distance ${claimed} does not match verified ${length}`);
    process.exit(2);
  }
  if (ds.optimal) console.log(`Gap to known optimum (${ds.optimal}): ${(((length - ds.optimal) / ds.optimal) * 100).toFixed(2)}%`);
} catch (err) {
  console.error(`INVALID: ${err.message}`);
  process.exit(1);
}
