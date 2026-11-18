// Copy this file to create a new solver, e.g. src/solvers/my-solver.js
//
// THE SOLVER CONTRACT
// -------------------
// default export: { name, description, solve(ctx) }
//
// ctx = {
//   cities,        // [{ id, x, y } | { id, name, lat, lon }]  (ids are 0..n-1)
//   n,             // number of cities
//   dist(i, j),    // precomputed distance between city i and city j (fast)
//   rng(),         // seeded random number in [0, 1) - use this, not Math.random
//   timeLimitMs,   // your time budget
//   deadline,      // Date.now() value you must finish by
//   report(route), // call whenever you find a better route (drives the animation)
//   initialRoute,  // a nearest-neighbour route you may use as a starting point
// }
//
// solve(ctx) returns (or resolves to) a route: a permutation of 0..n-1.
// The tour implicitly returns to the first city.

export default {
  name: 'template',
  description: 'Describe your approach in one line',
  solve(ctx) {
    const route = [...ctx.initialRoute];
    ctx.report(route);
    return route;
  },
};
