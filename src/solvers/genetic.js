// WORKSHOP TASK: implement this solver.
// See src/solvers/_template.js for the full solver contract.
//
// Approach:
// 1. Create a population (e.g. 100) of routes: some random, one from ctx.initialRoute.
// 2. Each generation: select parents (tournament selection), breed with
//    Order Crossover (OX1), mutate (swap or inversion), keep the elite few.
// 3. Run until ctx.deadline; report the best route each time it improves.
// Stretch: apply a quick 2-opt pass to children (a 'memetic' algorithm).
import { NotImplementedError } from '../lib/errors.js';

export default {
  name: 'genetic-algorithm',
  description: 'Evolve a population of routes with crossover and mutation',
  solve(ctx) {
    throw new NotImplementedError('genetic-algorithm');
  },
};
