// WORKSHOP TASK: implement this solver.
// See src/solvers/_template.js for the full solver contract.
//
// Approach:
// 1. Initialise a pheromone matrix tau (n x n) to a small constant.
// 2. Each iteration, each of m ants builds a tour: from city i choose j with
//    probability proportional to tau[i][j]^alpha * (1/dist(i,j))^beta (alpha=1, beta=3).
// 3. Evaporate: tau *= (1 - rho), rho ~ 0.1. Deposit Q/length on the edges of each tour
//    (or only the best tour).
// 4. Run until ctx.deadline; report the best tour when it improves.
// Tip: restrict choices to each city's 15 nearest neighbours for large n.
import { NotImplementedError } from '../lib/errors.js';

export default {
  name: 'ant-colony',
  description: 'Simulated ants lay pheromone on short routes',
  solve(ctx) {
    throw new NotImplementedError('ant-colony');
  },
};
