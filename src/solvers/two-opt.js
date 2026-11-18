// WORKSHOP TASK: implement this solver.
// See src/solvers/_template.js for the full solver contract.
//
// Approach:
// 1. Start from ctx.initialRoute (nearest-neighbour).
// 2. For every pair of edges (a-b, c-d), if dist(a,c) + dist(b,d) < dist(a,b) + dist(c,d),
//    reverse the segment between b and c. This removes a crossing.
// 3. Repeat until no improving move exists or ctx.deadline is reached.
// 4. Call ctx.report(route) after each improvement (throttle for large n).
// Stretch: Or-opt moves, neighbour lists, or 3-opt.
import { NotImplementedError } from '../lib/errors.js';

export default {
  name: 'two-opt',
  description: 'Local search: repeatedly reverse route segments that cross',
  solve(ctx) {
    throw new NotImplementedError('two-opt');
  },
};
