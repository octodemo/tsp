# Copilot instructions — TSP Route Race

This repo is a workshop on the Travelling Salesman Problem. Several agents often work **in parallel**, so keep changes isolated.

- **One solver per file** in `src/solvers/`. Solvers are auto-discovered; never add a central registry.
- When implementing a solver, only edit its own file. Put any new tests in a solver-specific file, not a shared test file.
- Follow the contract in `src/solvers/_template.js`: default-export `{ name, description, solve(ctx) }` and return a permutation of `0..n-1`.
- Use `ctx.dist(i, j)`, not your own distance maths. Use `ctx.rng()`, never `Math.random()`. Check `ctx.deadline` inside every long loop.
- Call `ctx.report(route)` whenever the best route improves.
- Compute move deltas in O(1) from the affected edges rather than re-measuring the whole tour.
- Don't modify `src/lib/`, `scripts/race.js` or `scripts/score.js` unless explicitly asked. They are the shared scoring harness.
- Plain Node.js (ES modules, Node 20 or later) with **no npm dependencies**. The viewer is vanilla JS and `<canvas>`.
- Verify with `npm test` and `npm run race -- --dataset <dataset> --solvers <name>,nearest-neighbour` for both `data/nl-30.json` and `data/uk-30.json`. Compare against each dataset's nearest-neighbour; no optimum is provided for either dataset.
