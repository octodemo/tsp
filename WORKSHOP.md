# Workshop: TSP Route Race (60 minutes)

**Goal:** use the GitHub Copilot app to run **several agents in parallel**, each building a different solver for the Travelling Salesman Problem, then bring the work together and watch the solvers race in a **live canvas**.

**What attendees learn**
- Splitting a problem into independent pieces with a clear contract
- Running parallel coding sessions and merging their output
- Using canvases (browser, terminal) to visualise and verify agent work
- Steering agents with good prompts, tests and constraints

---

## Agenda

| Time | Step | Who |
|---|---|---|
| 0–10 | [1. Kick-off and explore](#step-1--kick-off-and-explore-10-min) | Everyone |
| 10–35 | [2. Parallel solver sprint](#step-2--parallel-solver-sprint-25-min) | 4 parallel sessions |
| 35–45 | [3. Bring the solvers together](#step-3--bring-the-solvers-together-10-min) | Race control |
| 45–55 | [4. Create the final race canvas](#step-4--create-the-final-race-canvas-10-min) | Race control |
| 55–60 | [5. Debrief](#step-5--debrief-5-min) | Everyone |

Attendees can work alone, or in teams of 2–3 with one person driving the app.

---

## Before the session (facilitator)

1. Push this repo to a template repository and ask each team to create a copy.
2. Check `npm test` and races on both `data/nl-30.json` and `data/uk-30.json` work on a clean machine.
3. Optional: prepare a reference branch with working solvers as a fallback for teams that get stuck.

All race exercises use both `data/nl-30.json`, covering 30 Dutch cities across all 12 provinces, and `data/uk-30.json`, covering 30 UK cities. Compare solvers separately on each dataset. Other datasets remain available as optional backups.

---

## Step 1 — Kick-off and explore (10 min)

Present the problem: the van must visit every city exactly once, return to the depot, and the shortest route wins. Then show why brute force fails: 52 cities have about 10⁶⁶ possible tours.

Each team opens the repo in the Copilot app and asks its first session:

> Explain this repository to me: the solver contract, how the race runner works, and what I need to do to add a solver. Then run the tests and a race on each of data/nl-30.json and data/uk-30.json. Show me both leaderboards.

Then open the viewer:

> Start the viewer with `npm run serve` and open it in a browser canvas.

✅ **Checkpoint:** everyone can switch between Netherlands and UK and see each nearest-neighbour route. Four solver tasks are still unimplemented.

---

## Step 2 — Parallel solver sprint (25 min)

Start **four sessions at once**, one per solver. Each one edits only its own file in `src/solvers/`, so there are no merge conflicts.

Shared rules, already applied automatically from [`.github/copilot-instructions.md`](.github/copilot-instructions.md), so attendees don't need to paste them:
- Only edit `src/solvers/<your-file>.js`, plus a test file if you want one
- Keep to the contract in `_template.js`; use `ctx.rng` for randomness and respect `ctx.deadline`
- Prove it works with `npm test` and `npm run race -- --dataset <dataset> --solvers <name>,nearest-neighbour` for each of `data/nl-30.json` and `data/uk-30.json`

### Session A — 2-opt local search 🟢 easiest
> Implement the two-opt solver in src/solvers/two-opt.js following the hints in the file. Start from ctx.initialRoute, apply improving 2-opt moves until none remain or the deadline passes, and call ctx.report on improvements. Verify with npm test and races on data/nl-30.json and data/uk-30.json; include nearest-neighbour in each race and compare distances separately for each dataset.

### Session B — Simulated annealing 🟡
> Implement simulated-annealing in src/solvers/simulated-annealing.js using 2-opt neighbour moves with O(1) delta calculation, a geometric cooling schedule and ctx.rng. Use the whole time budget and track the best route. Tune and race on data/nl-30.json and data/uk-30.json; include nearest-neighbour in each race and compare distances separately for each dataset.

### Session C — Genetic algorithm 🟡
> Implement genetic-algorithm in src/solvers/genetic.js: tournament selection, Order Crossover (OX1), inversion mutation and elitism. Seed the population with ctx.initialRoute. Race it on data/nl-30.json and data/uk-30.json; include nearest-neighbour in each race and compare each dataset separately. If it underperforms, try a memetic variant with a quick 2-opt pass on children.

### Session D — Ant colony optimisation 🔴 hardest
> Implement ant-colony in src/solvers/ant-colony.js following the hints in the file (alpha=1, beta=3, rho=0.1). Use nearest-neighbour candidate lists so it scales to 500 cities. Race it on data/nl-30.json and data/uk-30.json; include nearest-neighbour in each race and compare each dataset separately.

💡 **Facilitator tips**
- Show the sessions running side by side in the app. Parallelism is the main point of the workshop.
- Encourage teams to look at each agent's plan before approving it.
- If a session stalls, have it run `npm run race -- --dataset <dataset> --solvers <name>,nearest-neighbour --time 1000` for both `data/nl-30.json` and `data/uk-30.json` to get fast feedback.

✅ **Checkpoint:** aim for at least two solvers to beat nearest-neighbour on each of the Netherlands and UK datasets.

---

## Step 3 — Bring the solvers together (10 min)

Bring the completed solver work into Race control. Coordinate commits directly with the solver sessions and report unfinished work. Stop on failed checks, unrelated or uncommitted changes, or conflicts; do not push or create pull requests.

Run the tests and race the combined solvers on both datasets, then independently score each successful result with its matching dataset:
   ```bash
   npm test
   npm run race -- --dataset data/nl-30.json --time 10000
   npm run race -- --dataset data/uk-30.json --time 10000
   npm run score -- data/nl-30.json results/nl-30/<solver>.json
   npm run score -- data/uk-30.json results/uk-30/<solver>.json
   ```

Resolve failed tests, races, or scoring before proceeding. Exclude invalid results.

---

## Step 4 — Create the final race canvas (10 min)

In **Race control**, select `/create-canvas`, then enter:

> Make the existing race viewer available as a project-scoped canvas in .github/extensions/race-viewer/. Show solver maps, synchronized replay, the distance chart, and leader. Use this workspace's latest results for data/nl-30.json and data/uk-30.json. Let me switch between Netherlands and UK, with Netherlands selected initially. Add a refresh action for this workspace's latest race results. Keep the solver and scoring code unchanged. Open the canvas.

The canvas reads the race results saved in Race control. Replay shows recorded progress rather than streaming an ongoing race. If the results are missing, return to step 3.

**Stretch prompts**
- "Add a button that triggers a race and streams progress live using server-sent events."
- "Colour each route segment by length so long jumps stand out."
- "Show each solver's improvement over nearest-neighbour on both the Netherlands and UK charts."

**Scoring**
- 🥇 Shortest valid route separately on the Netherlands and UK datasets
- 🎨 Best visualisation (audience vote)
- ⚡ Fastest to beat nearest-neighbour by 10%
- Invalid routes and timeouts score zero, and `score.js` decides disputes

---

## Step 5 — Debrief (5 min)

Discussion questions:
- What made this easy to run in parallel? (One file per solver, a shared contract, auto-discovery.)
- Where did agents go wrong? (Ignoring the deadline, using `Math.random`, recomputing the whole tour length.)
- Which prompts worked best? What context did the agents need?
- How would you apply the same pattern to your own codebase? Splitting work along a stable interface is the key idea.

---

## Challenge menu

Use these for fast finishers, as homework, or to extend the session to 90 minutes.
Validate every solver or visualization challenge on both `data/nl-30.json` and `data/uk-30.json`; larger generated datasets are additional scalability checks.

| Level | Challenge |
|---|---|
| 🟢 | Beat nearest-neighbour on both the Netherlands and UK datasets |
| 🟢 | Add an `or-opt` solver that moves segments of 1–3 cities |
| 🟡 | Improve on nearest-neighbour by **10%** on each dataset within 5 seconds |
| 🟡 | **Hybrid:** run simulated annealing first, then polish with 2-opt |
| 🟡 | Add a **multi-start** solver that runs 2-opt from many random starts and keeps the best |
| 🔴 | Implement **Or-opt + 2-opt with neighbour lists** that handles 5,000 cities in 10 seconds |
| 🔴 | Use the **Lin-Kernighan** heuristic (or a 3-opt approximation) to improve your best Netherlands and UK routes |
| 🔴 | **Parallelism inside a solver:** run an island-model genetic algorithm across several worker threads |
| 🎨 | Animate the nl-30 and uk-30 routes on real map tile backgrounds |
| 🚚 | **Vehicle routing:** add 3 vans with capacity limits and show each van's route in a different colour |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| A solver shows `timeout` | The solver isn't checking `ctx.deadline` inside its main loop |
| Results differ between runs | Use `ctx.rng()`, not `Math.random()` |
| The animation jumps straight to the end | Call `ctx.report(route)` more often (the harness throttles it) |
| The viewer shows no results | Run a race first, then refresh |
