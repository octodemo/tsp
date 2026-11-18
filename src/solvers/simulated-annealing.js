// WORKSHOP TASK: implement this solver.
// See src/solvers/_template.js for the full solver contract.
//
// Approach:
// 1. Start from ctx.initialRoute. Pick a starting temperature T (e.g. average edge length).
// 2. Loop until ctx.deadline: propose a random 2-opt reversal; compute delta length.
// 3. Accept if delta < 0, or with probability exp(-delta / T) (use ctx.rng()).
// 4. Cool T geometrically (e.g. T *= 0.9999). Track and report the best route seen.
// Tip: compute delta in O(1) from the four affected edges - never re-measure the whole tour.
import { NotImplementedError } from '../lib/errors.js';

export default {
  name: 'simulated-annealing',
  description: 'Accept worse moves with decreasing probability to escape local optima',
  solve(ctx) {
    throw new NotImplementedError('simulated-annealing');
  },
};
