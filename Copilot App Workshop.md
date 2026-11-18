# 🚚 Route Race: can your agents beat the delivery planner?

**A 60-minute hands-on workshop with the GitHub Copilot app.** 🏁

OctoCAT Supply's van must visit every city and return to the depot. The current planner works, but can your team find a shorter route?

All race exercises use both `data/nl-30.json` (30 Dutch cities across all 12 provinces) and `data/uk-30.json` (30 UK cities). Compare solvers separately on each dataset. Other datasets remain available as optional backups.

You will put four agents to work on different approaches, watch their progress, and race the results. You do not need to know the algorithms in advance: your job is to direct the work and decide whether the results make sense.

The rules are simple: visit every city once, return to the start, and minimize the total distance. This is the Travelling Salesman Problem. Our maps use straight-line distances, not actual roads or traffic.

## 🎒 Before you start

- Open the **workshop repository** supplied by your facilitator.
- Have the [GitHub Copilot app](https://github.com/features/copilot) installed and signed in, with access to that repository.
- Have Node.js 20 or later available locally. There are no npm dependencies to install.
- Use **[Copilot Fusion Standard](https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/models/copilot-fusion)** for every session and the optional automation. Ask the facilitator if it is unavailable.
- Work individually, or in a group of 2–3 people. In a group, one person drives while the others review the plans and results. Swap roles during the workshop.

You will use one home session called **Race control**. It creates and keeps track of your coding sessions. You visit those sessions to paste the exercise prompts, then return to Race control when it is time to bring the work together.

**You do not need to copy branch names, commit IDs, or result files between sessions.** Race control handles that coordination. You still review changes and answer any permission or plan-approval requests.

## 🗺️ Agenda

| Time | Exercise | Where you work |
|---|---|---|
| 0–10 | [1. Kick-off and explore](#1-kick-off-and-explore-) | Race control |
| 10–35 | [2. Parallel solver sprint](#2-parallel-solver-sprint-%E2%80%8D) | Four solver sessions |
| 35–45 | [3. Bring the solvers together](#3-bring-the-solvers-together-) | Race control |
| 45–55 | [4. Create the final race canvas](#4-create-the-final-race-canvas-) | Race control |
| 55–60 | [5. Debrief](#5-debrief-) | With your partner and facilitator |

If time remains after the main exercises, try [Race steward automation (optional)](#race-steward-automation-optional). The [Challenge menu](#challenge-menu) is last.

## 1. Kick-off and explore 👀

**Your mission:** meet the current delivery planner and see the route you want to beat.

### Open your home session

1. In the GitHub Copilot app, create a new **Session** from the left menu
2. Select your team's workshop repository. Connect or clone it first if needed.
3. Select **This computer** and **New worktree**.
4. Select **Interactive** mode and **Copilot Fusion Standard**.
5. Start with the following prompt to explore the repo:

### Exploration prompt

```text
Explain this repository to me: the solver contract, how the race runner works, and what I need to do
to add a solver. Then run the tests and a race on each of data/nl-30.json and data/uk-30.json.
Show me both leaderboards.
```

Read the response. You are looking for three things: where a solver lives, what makes a route valid, and how the race measures it.

> [!Note]
> **If tests cannot start:** confirm Node.js 20 or later is available and that your team's starter includes the current `npm test` script (`node --test`).

Then paste:

```text
Start the viewer with `npm run serve` and open it in a browser.
```

### Check the starting point

Select **Netherlands**, then **UK**, and inspect the **nearest-neighbour** route on each. The baseline chooses the closest unvisited city each time. The **random** solver provides a comparison.

Four solver tasks are still unimplemented. Skipped tests or grey placeholders for those solvers are expected in the starter.

> [!TIP]
> Before you go any further, rename this session **Race control**. Keep this session available throughout the workshop.

🎯 **Quick prediction:** point at one awkward detour on the map. What would you try first: reverse a section, explore a different route, or combine routes? Keep your guess in mind for the race.

✅ **Checkpoint**. You can see a map, a working baseline route, and its distance for both datasets. Discuss / predict where each route could be shorter.

## 2. Parallel solver sprint 🧑‍💻

**Your mission:** launch all four original solver exercises, each in its own session.

### Let Race control create the sessions

Stay in the **Race control** session and paste this setup instruction:

```text
Create four coordinated child sessions for this workshop repository:
A - 2-opt
B - Simulated annealing
C - Genetic algorithm
D - Ant colony

Give each its own local worktree, based on the same starter revision as this session, and use
Copilot Fusion Standard and Plan mode.
Keep track of these sessions so you can collect their work later.
Do not start implementing anything yet; I will paste the exercise prompt into each session.
Give me links to open them.
Do not create pull requests or merge anything at this stage.
```

This instruction sets up the workspaces; it does not replace the solver prompts below. Having Race control create them means it knows which sessions belong to this exercise.

1. Open **A - 2-opt** from the returned link.
2. Confirm **Fusion Standard** and **Plan** mode are selected.
3. Paste the Session A prompt below.
4. Review the plan and approve it when ready.
5. Repeat for **B**, **C**, and **D**, letting earlier sessions work while you start the next one.
6. The agent may ask you a question(s) before producing a plan. Keep an eye on the session icon to see if your input is required.

If session creation or linking is unavailable in your app, ask the facilitator before creating unrelated sessions manually. The automatic handoff later depends on Race control knowing its coding sessions.

### Shared rules

You don't need to paste these. They are already in the repository's custom instructions, [`.github/copilot-instructions.md`](.github/copilot-instructions.md), which every session applies automatically:

- Only edit your solver's file in `src/solvers/`, plus a solver-specific test file if you want one.
- Keep to the contract in `_template.js`; use `ctx.rng` for randomness and respect `ctx.deadline`.
- Prove it works with `npm test` and a race against nearest-neighbour on both `data/nl-30.json` and `data/uk-30.json`.

Keeping each session to its own files is what lets the four agents work in parallel without conflicts.

#### Session A — 2-opt local search

**In plain English:** untangle the route by reversing sections when that makes it shorter.

Paste into **A - 2-opt**:

```text
Implement the two-opt solver in src/solvers/two-opt.js following the hints in the file. Start from
ctx.initialRoute, apply improving 2-opt moves until none remain or the deadline passes, and call
ctx.report on improvements. Verify with npm test and races on data/clustered-200.json and data/random-100.json;
include nearest-neighbour in each race and compare distances separately for each dataset.
```

#### Session B — Simulated annealing

**In plain English:** allow occasional detours to escape a route that looks good locally but is not the best overall.

Paste into **B - Simulated annealing**:

```text
Implement simulated-annealing in src/solvers/simulated-annealing.js using 2-opt neighbour moves
with O(1) delta calculation, a geometric cooling schedule and ctx.rng. Use the whole time budget
and track the best route. Tune and race on data/clustered-200.json and data/random-100.json; include
nearest-neighbour in each race and compare distances separately for each dataset.
```

#### Session C — Genetic algorithm

**In plain English:** combine promising routes and keep the strongest candidates.

Paste into **C - Genetic algorithm**:

```text
Implement genetic-algorithm in src/solvers/genetic.js: tournament selection, Order Crossover (OX1),
inversion mutation and elitism. Seed the population with ctx.initialRoute.
Race it on data/clustered-200.json and data/random-100.json;
include nearest-neighbour in each race and compare each dataset separately.
If it underperforms, try a memetic variant with a quick 2-opt pass on children.
```

#### Session D — Ant colony optimisation

**In plain English:** simulated ants reinforce promising connections between cities.

Paste into **D - Ant colony**:

```text
Implement ant-colony in src/solvers/ant-colony.js following the hints in the file (alpha=1, beta=3,
rho=0.1). Use nearest-neighbour candidate lists so it scales to 500 cities.
Race it on data/clustered-200.json and data/random-100.json;
include nearest-neighbour in each race and compare each dataset separately.
```

### While the agents work

Look at each session's plan and changed files. Is it working on the assigned solver? Has it reported an actual race result?

🗳️ **Make your call:** rank the four approaches from most to least likely to win. If you are working in a team, discuss your predictions with your partner. You are not expected to understand every implementation detail; ask an agent to explain anything you want to inspect.

As the sessions run, check in on each one: **What file changed? What did the tests say? What would you ask the agent next?** Compare your answers with your partner rather than simply waiting for all four to finish.

> [!NOTE]
> Fusion selects models for a task; the four sessions divide the implementation work. Keep **Fusion Standard** selected. Where supported, hover over the effort label below a response to inspect the models used.

> [!NOTE]
> Your facilitator may briefly explain **sandboxes** here. A worktree separates edits. Local sandboxing limits access on your machine; a cloud sandbox moves execution off your machine. Keep these workshop sessions local.

### Get the agents to implement their plans

We explicitly asked the agents to work in plan mode and not implement anything. 

1. Review each agent's plan and select "Approve and implement this plan" when you're happy to proceed

✅ **Checkpoint:** all four solver exercises are underway and use both datasets. Aim for at least two to beat nearest-neighbour on each dataset. A valid implementation is the first milestone; improvement is a challenge, not a reason to get stuck.

💡 **Keep the energy up:** if one agent finishes early, ask it to explain its best Dutch and UK routes in plain English. If another is still working, predict whether it will beat nearest-neighbour.

## 3. Bring the solvers together 🏆

**Your mission:** bring the completed solver work into Race control and run both Netherlands and UK races.

When you're happy with your solvers, return to the **Race control** session and paste:

```text
Commit all changes across the four solver sessions
```

Race control will send instructions to each session to commit its changes and wait for confirmation. Then proceed with:

```text
Collect and merge completed work from our four solver sessions into Race control.
Coordinate commits directly with them. Report unfinished sessions.
Stop on failed checks, unrelated or uncommitted changes, or conflicts.
Do not push or create pull requests.

Run npm test, then fresh races on data/nl-30.json and data/uk-30.json, each with a 10-second limit.
Verify every successful route with scripts/score.js; report failures and exclude invalid results.
Use the matching dataset when scoring each result. Do not display anything more than indicative results.
Do not invent an optimum for either dataset.
Report pending work or problems.
```

Review the summary and respond to any approval requests. If a session needs your input, Race control should identify it so you can open it directly.

It is still a Git merge, but the agent handles the branch details. It combines code from **your team's sessions**, not submissions from every team in the room. Result files are not merged; the race generates new ones.

If some implementations are pending, the ready ones can race first on both datasets. Once the others finish, ask Race control to collect them and rerun and verify both races.

✅ **Checkpoint:** the tests passed and the fresh Netherlands and UK race results are independently verified in Race control. Resolve any blockers before creating the canvas.

## 4. Create the final race canvas 🎨

**Your mission:** bring the race viewer into the Copilot app with `/create-canvas`.

Before opening the results, each person pick a solver they expect to win and say why.

Stay in **Race control**. Type `/create-canvas` and select it from the slash-command menu, then enter this prompt:

```text
Make the existing race viewer available as a project-scoped canvas in .github/extensions/race-viewer/.
Show solver maps, synchronized replay, the distance chart, and leader.
Use this workspace's latest results for data/nl-30.json and data/uk-30.json.
Let me switch between Netherlands and UK, with Netherlands selected initially.
Add a refresh action for this workspace's latest race results.
Keep the solver and scoring code unchanged. Open the canvas.
```

A **canvas** is an interactive workspace inside the Copilot app, alongside your conversation. Instead of only describing results in chat, an agent can open a visual interface you can explore and control. It can also call actions exposed by that canvas, such as refreshing the displayed results.

Here, we bring the existing race viewer into that workspace so you can compare solver routes, replay their progress, and see how their distances improve. The canvas reads the saved race results; it does not replace running the solvers or verifying their routes. You get the visual comparison and the conversation in one place.

**Run race** computes fresh results. **Replay race** plays recorded results; it does not stream a running computation. Independently verify any fresh race before declaring a winner.

**Stretch prompts**, only if time allows:

- "Add a button inside the app canvas that triggers a race and streams progress live using server-sent events."
- "Colour each route segment by length so long jumps stand out."
- "Show each solver's improvement over nearest-neighbour on both the Netherlands and UK charts."

👀 **Viewer scavenger hunt:** find the current leader, the distance-over-time chart, and a solver's progress. What does the viewer tell you that a table alone would not?

### Compare the results

- **Shortest valid route** separately on the Netherlands and UK datasets.
- **Best visualization**, by audience vote.
- **Fastest to beat nearest-neighbour by 10%**, where the progress data supports it.

Invalid routes and timeouts do not qualify; the independent scorer decides route validity and distance. For a class-wide performance ranking, the facilitator should rerun finalists in one common environment.

**Checkpoint:** you can switch between the combined Netherlands and UK results and explain which approach won on each.

🎉 **Celebrate the surprise:** ask each team to share its solver, verified distance, and one thing it learned from an agent's result. The winner is the shortest *valid* route—not the most complicated algorithm.

<a id="5-debrief"></a>

## 5. Debrief 💬

Discuss with your partner:

- What made the work safe to divide across separate sessions?
- What did you check before approving the agents' plans and changes?
- Where did agents need steering?
- What similar task could you delegate in your own codebase?

Your facilitator may briefly show **Copilot Projects** as a way to coordinate an ongoing goal across one or more repositories. You do not need to create a Project for this exercise.

The takeaway is not memorizing an algorithm. It is learning to **delegate, review, and verify**, while letting the app handle coordination.

<a id="race-steward-automation-optional"></a>

## 🤖 Race steward automation (optional)

**Allow 5–10 minutes only if time remains after the main exercises.**

Save the checking and interpretation as a task you can run again on demand. **Race steward** is not a nightly job: it runs only when you trigger it.

### Create it in the Copilot app

Do **not** ask a chat session to create or configure this automation. Set it up directly in the app:

1. In the Copilot app sidebar, open **Automations**.
2. Click **Create automation**, then choose **Create manually**.
3. Enter **Race steward** as the name.
4. Leave **Run in the cloud** off. This is a local automation.
5. Set the trigger to **Manual / on demand**. Do not add a schedule or repository-event trigger.
6. If asked for an automation type, choose **Personal**.
7. Set the model to **Copilot Fusion Standard**.
8. Select the local workshop repository or folder that contains the combined code from Race control. Check its path or branch in Race control first; do not select a separate coding session's worktree or the untouched starter.
9. If the form offers tool or permission controls, enable only the local tools needed to read the repository, run its tests and race commands, and score results. Do not grant tools to edit source, push, create pull requests, or merge.
10. Paste the task below into the automation's **run prompt**. This is what Race steward does when you trigger it; it does not create or configure the automation.

<details>
<summary><strong>Copy the Race steward task instructions</strong></summary>

```text
Act as the Race steward for this TSP workshop repository.
Assess the current code and return a concise race briefing.

First report the branch and commit being assessed. If the checkout has uncommitted tracked changes,
stop and ask me to commit the intended work before assessing it. Do not switch branches or modify
source code.

Run these existing commands once each:
  npm test
  npm run race -- --dataset data/nl-30.json --time 2000 --seed 1
  npm run race -- --dataset data/uk-30.json --time 2000 --seed 1

Read the fresh leaderboard and solver results for each completed race.
Use only entries produced by these runs, not old result files. If a command fails, report its error;
do not substitute an earlier result.
For each solver with status "ok", independently verify its result using:
  npm run score -- <dataset-path> <result-file-path>
Treat a scoring failure or distance mismatch as a failed verification.

Return:
1. A test summary that separates passes, failures, and skipped stubs.
2. Separate tables for the Netherlands and UK with solver, status, verified distance, and percentage
   improvement over that dataset's nearest-neighbour:
   100 * (baseline distance - solver distance) / baseline distance.
   If the baseline is not valid, report the comparison as unavailable.
3. For each dataset, the shortest verified route and any invalid routes, timeouts, errors, or stubs.
4. One evidence-backed observation and one next experiment to try.
   Recommend the experiment; do not implement it.

Do not invent an optimum for either dataset, missing measurements, or comparisons with earlier runs
that you have not recorded.

Do not edit tracked files, install packages, push commits, create issues or pull requests, or merge
anything. Generated output may be written only under the ignored results/ directory.
Run this assessment once and stop. Do not create a schedule, another automation, or an automatic
retry loop.
```

</details>

### Save, run, and inspect

1. Before saving, check the selected local repository/folder, **Fusion Standard**, **Personal** ownership (if offered), and **manual-only** trigger. If the app cannot target the completed code locally, ask the facilitator before proceeding.
2. Click **Create** to save. Do not choose a scheduled trigger or an option that automatically starts a run.
3. In **Automations**, find **Race steward** and click **Run now / play** once.
4. Open the run and inspect its briefing. Does it assess the intended code and distinguish working solvers from stubs or failures?
5. Compare one winning distance with the underlying race result. Discuss its recommended next experiment; do not implement it automatically.

**Checkpoint:** a saved automation, a briefing you can evaluate, and no recurring schedule. Keep the briefing if you want to compare runs later, because new races overwrite the dataset result files.

The facilitator can demonstrate this instead if time or configuration gets in the way. A prepared result should be clearly identified as an earlier run.

## 🧰 Troubleshooting

| What you see | What to do |
|---|---|
| Race control cannot identify a coding session | Ask the facilitator. Do not guess branches or let it collect unrelated sessions. |
| Some implementations are pending | Race the ready work first; ask Race control to collect the rest when it finishes. |
| The viewer shows old results | Confirm it belongs to Race control, then rerun and invoke the canvas refresh action. Replay does not recompute. |
| Exercise 4 opens only a Browser tab | Use `/create-canvas` to create the project extension, then reload, inspect, and open its registered canvas. A browser preview is not the extension. |
| The canvas extension does not appear | Confirm `.github/extensions/race-viewer/` was created, reload project extensions in Race control, and inspect the extension's status and log. |
| The server port is occupied | Ask the agent to choose another port. Do not stop an unrelated server. |
| A solver times out | Ask its agent to check the deadline inside long loops. |
| Results vary between runs | Use seeded randomness and consistent settings. Machine load and deadline-limited search can still affect results. |
| Integration encounters a conflict | Stop and involve the facilitator rather than forcing the merge or discarding work. |

<a id="challenge-menu"></a>

## 🌟 Challenge menu

Use these for fast finishers, as homework, or to extend the session to 90 minutes.

Pick a challenge as a team, then make it your next prompt. Bonus points for predicting what will happen before you run it.
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
