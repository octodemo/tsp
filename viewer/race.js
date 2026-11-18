// Pure helpers for the multi-map race view (no DOM, so they can be unit tested).
export const SOLVER_COLORS = ['#2f7f6c', '#c47f35', '#4f6fb3', '#b2546a', '#76883a', '#8360b0', '#3b8fa8', '#a8693e'];
export const SEARCH_MS = 7000;
export const DRIVE_MS = 12000;

export function visibleRaceEntries(entries, leaderboard) {
  const raced = leaderboard?.leaderboard ? new Set(leaderboard.leaderboard.map(row => row.solver)) : null;
  return entries.filter(entry => entry.result && entry.result.status !== 'not-implemented' &&
    (!raced || raced.has(entry.solver)));
}

// Instant solvers get a short search phase; long searches get the full replay.
export function searchDuration(realMax) {
  return realMax < 100 ? 1500 : SEARCH_MS;
}

const finishedAt = result => result.ms ?? result.progress?.at(-1)?.t ?? 0;

// Compute time is replayed on a square-root curve so the first busy milliseconds stay visible.
export function realTimeAt(elapsed, realMax, searchMs = SEARCH_MS) {
  return realMax * Math.min(1, Math.max(0, elapsed / searchMs)) ** 2;
}

export function replayTimeOf(realT, realMax, searchMs = SEARCH_MS) {
  return realMax > 0 ? searchMs * Math.sqrt(Math.min(1, Math.max(0, realT / realMax))) : 0;
}

export function raceRealMax(results, fallback = 1000) {
  const times = results.filter(Boolean).flatMap(r => [r.ms ?? 0, r.progress?.at(-1)?.t ?? 0]);
  const max = Math.max(0, ...times);
  return max > 0 ? max : fallback;
}

// The solver's best known state at compute time realT.
export function stateAt(result, realT) {
  if (!result) return { phase: 'waiting', route: null, distance: null };
  const done = realT >= finishedAt(result);
  if (done && result.status === 'ok') return { phase: 'done', route: result.route, distance: result.distance };
  let route = null, distance = null;
  for (const frame of result.progress ?? []) {
    if (frame.t > realT) break;
    route = frame.route;
    if (frame.distance != null) distance = frame.distance;
  }
  if (done) return { phase: result.status ?? 'error', route: null, distance: null, message: result.message };
  return { phase: 'searching', route, distance };
}

// Trucks share one speed, so the shortest tour arrives first.
export function driveDuration(distance, longest, driveMs = DRIVE_MS) {
  return longest > 0 ? driveMs * Math.min(1, distance / longest) : driveMs;
}

export function rankEntries(entries) {
  const failed = phase => !['searching', 'done', 'waiting'].includes(phase);
  return [...entries].sort((a, b) =>
    (failed(a.phase) - failed(b.phase)) ||
    ((a.distance ?? Infinity) - (b.distance ?? Infinity)) ||
    a.solver.localeCompare(b.solver));
}

export function phaseLabel(phase) {
  return {
    waiting: 'Not raced yet', searching: 'Searching', done: 'Finished',
    'not-implemented': 'Not implemented', timeout: 'Timed out', invalid: 'Invalid route', error: 'Crashed',
  }[phase] ?? phase;
}
