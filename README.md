# 🚚 TSP Route Race

A starter repo for a 60-minute workshop on the **GitHub Copilot app**. Teams use several agents working in parallel to solve the classic **Travelling Salesman Problem (TSP)**, then watch their solvers race in a live canvas.

> **The problem:** OctoCAT Supply's delivery van must visit every city exactly once and return to the depot. Find the shortest route.

The number of possible routes grows factorially. With 52 cities there are about 10⁶⁶ possible tours. Exhaustive search is impossible, so heuristics win.

See **[WORKSHOP.md](WORKSHOP.md)** for the session plan, agent prompts and challenges.

## Quick start

Requires Node.js 20 or later. No `npm install` is needed because there are no dependencies.

`npm test` uses Node's built-in test discovery to find the `test/*.test.js` files, without relying on directory arguments or shell-expanded globs.

```bash
npm test                                          # contract tests (stubs are skipped)
npm run race -- --dataset data/nl-30.json         # race every solver in parallel
npm run race -- --dataset data/uk-30.json         # repeat for the UK dataset
npm run serve                                     # open http://localhost:3000
```

Switch between **Netherlands** and **UK** in the viewer. All race exercises use both datasets, comparing solvers separately for each. The Netherlands dataset includes 30 Dutch cities across all 12 provinces, including Amsterdam, Rotterdam, Utrecht, Groningen and Maastricht; the UK dataset includes 30 UK cities. Berlin and synthetic datasets remain available as optional alternatives.

The viewer shows a simplified delivery map with roads, an animated truck, and small, caption-free landmark icons beneath major UK and Dutch city names. Labels stay clear of the selected tour. Country datasets include recognizable coastlines and borders, aligned with the cities; synthetic datasets keep the abstract background. It opens in the **race view**: selecting a dataset gives each implemented solver from its latest race a map. Unimplemented solvers and old results from solvers excluded from that race are hidden, including in the algorithm selector and leaderboards. For a kickoff, run `npm run race -- --dataset data/nl-30.json --solvers nearest-neighbour`, then refresh to see just that solver's map. When all six solvers are implemented and raced together, all six maps appear. Every solver's reported progress is replayed on one shared timeline, using a square-root scale so the first busy milliseconds stay visible. Then all trucks leave together at the same speed, so the shortest tour gets back to the depot first. A live leaderboard, a distance-over-time chart and a gold *Leader* highlight track the race. Failed solvers remain visible with their status. **Run race** in the sidebar runs `scripts/race.js` on the server for the selected dataset, with 2, 5 or 10 s per solver, then replays the new results. Switch to **Single route** (or click a solver's name) to inspect one tour: select an algorithm, then replay or pause its tour. Playback first shows reported routes, then previews a delivery lap; truck speed is illustrative and independent of compute time. Maps use straight-line connections, not real roads. Reduced-motion preferences show a static final tour. Without results, you can still explore the city map in **Single route**.

## Repository layout

```
data/                     Datasets (JSON)
  uk-30.json              30 UK cities, lat/lon, haversine km       (workshop)
  nl-30.json              30 Dutch cities, lat/lon, haversine km    (workshop)
  berlin52.json           TSPLIB classic, known optimum = 7542       (benchmark)
  random-100.json         100 uniform random points                  (development)
  clustered-200.json      200 points in 8 clusters                   (traps greedy solvers)
src/
  lib/                    Distance, scoring, seeded RNG, worker harness  (don't edit during the race)
  solvers/
    _template.js          The solver contract - copy this
    random.js             ✅ Floor
    nearest-neighbour.js  ✅ Baseline
    two-opt.js            🛠️ Workshop task
    simulated-annealing.js 🛠️ Workshop task
    genetic.js            🛠️ Workshop task
    ant-colony.js         🛠️ Workshop task
scripts/
  race.js                 Runs every solver in its own worker thread, in parallel
  score.js                Independently verifies a solution file
  generate.js             Creates new (or hidden) datasets
  serve.js                Serves the viewer and results
viewer/                   Canvas viewer (workshop challenge: make it a live race)
results/                  Race output (git-ignored)
```

## The solver contract

Each solver is one file in `src/solvers/`. Files are **auto-discovered**, so parallel sessions never edit a shared registry and never hit merge conflicts.

```js
export default {
  name: 'two-opt',
  description: 'One-line summary',
  solve({ cities, n, dist, rng, timeLimitMs, deadline, report, initialRoute }) {
    // return a permutation of 0..n-1 (the tour returns to the start)
  },
};
```

| Field | Meaning |
|---|---|
| `dist(i, j)` | Precomputed distance between two cities (fast lookup) |
| `rng()` | Seeded random number generator. Use it instead of `Math.random` so runs are reproducible |
| `deadline` | Finish before `Date.now()` reaches this. Solvers are terminated 2 seconds after the time limit |
| `report(route)` | Call when you find an improvement. It drives the animation |
| `initialRoute` | A ready-made nearest-neighbour tour to improve on |

## Commands

| Command | Purpose |
|---|---|
| `npm run race -- --dataset data/nl-30.json --time 5000` | Race all solvers, 5 seconds each |
| `npm run race -- --dataset data/nl-30.json --solvers two-opt,simulated-annealing` | Race a subset of solvers |
| `npm run score -- data/nl-30.json results/nl-30/two-opt.json` | Verify a result |
| `npm run generate -- --n 500 --seed 1234 --clustered --name hidden-final` | Create a dataset |
| `npm test` | Check every implemented solver returns a valid route |

## Dataset format

```json
{ "name": "uk-30", "distance": "haversine", "cities": [{ "id": 0, "name": "London", "lat": 51.5074, "lon": -0.1278 }] }
{ "name": "random-100", "distance": "euclidean", "cities": [{ "id": 0, "x": 512.3, "y": 88.1 }] }
```

City `id`s must be `0..n-1` in order. The optional field `optimal` holds the known best tour length; the race reports each solver's gap to it.

> **Note:** TSPLIB's optimum for berlin52 (7542) uses rounded distances. This repo uses exact distances, so treat a gap under about 0.1% as optimal.

## Data sources

- `berlin52` comes from [TSPLIB](http://comopt.ifi.uni-heidelberg.de/software/TSPLIB95/) (Reinelt, 1991).
- UK city coordinates are approximate city-centre locations.
- Dutch city coordinates are approximate city-centre locations. Distances are great-circle kilometres, not road distances.
- Viewer country outlines are simplified European polygons from [Natural Earth 1:50m admin-0 countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson), in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/). They are visual context, not survey-grade boundaries.
