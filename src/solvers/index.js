// Auto-discovers every solver in this folder, so parallel sessions can each add
// a file without editing a shared registry (and without merge conflicts).
// Files starting with "_" are ignored.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export async function loadSolvers() {
  const files = readdirSync(here)
    .filter((f) => f.endsWith('.js') && f !== 'index.js' && !f.startsWith('_'))
    .sort();
  const solvers = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(here, f)).href);
    const solver = mod.default;
    if (!solver?.name || typeof solver.solve !== 'function') {
      throw new Error(`${f} must default-export { name, description, solve }`);
    }
    solvers.push(solver);
  }
  return solvers;
}
