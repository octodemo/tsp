// Shared helper: the race runner uses this to build ctx.initialRoute.
export function nearestNeighbourRoute(n, dist, start = 0) {
  const visited = new Uint8Array(n);
  const route = [start];
  visited[start] = 1;
  let current = start;
  for (let step = 1; step < n; step++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && dist(current, j) < bestD) {
        bestD = dist(current, j);
        best = j;
      }
    }
    route.push(best);
    visited[best] = 1;
    current = best;
  }
  return route;
}

export default {
  name: 'nearest-neighbour',
  description: 'Greedy: always travel to the closest unvisited city (baseline)',
  solve({ n, dist, report }) {
    const route = [0];
    const visited = new Uint8Array(n);
    visited[0] = 1;
    let current = 0;
    for (let step = 1; step < n; step++) {
      let best = -1;
      let bestD = Infinity;
      for (let j = 0; j < n; j++) {
        if (!visited[j] && dist(current, j) < bestD) {
          bestD = dist(current, j);
          best = j;
        }
      }
      route.push(best);
      visited[best] = 1;
      current = best;
      // Report partial progress so the viewer can animate the greedy build-up.
      if (step % Math.max(1, Math.floor(n / 40)) === 0) report([...route]);
    }
    report(route);
    return route;
  },
};
