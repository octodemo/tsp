// Pure helpers for the slowed-down single-solver replay (no DOM, so they can be unit tested).
export const REPLAY_SPEEDS = { slow: 1500, normal: 700, fast: 250 };

const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function edges(route, closed) {
  const out = new Map();
  if (!route || route.length < 2) return out;
  const count = closed ? route.length : route.length - 1;
  for (let i = 0; i < count; i++) {
    const a = route[i], b = route[(i + 1) % route.length];
    out.set(key(a, b), [a, b]);
  }
  return out;
}

// Edges present in `next` but not `previous`, and vice versa. Partial routes are open paths.
export function edgeChanges(previous, next, n) {
  const before = edges(previous, previous?.length === n);
  const after = edges(next, next?.length === n);
  return {
    added: [...after].filter(([k]) => !before.has(k)).map(([, e]) => e),
    removed: [...before].filter(([k]) => !after.has(k)).map(([, e]) => e),
  };
}

// One step per recorded progress frame. kind is 'building' (partial route),
// 'first' (first complete route), 'improved' (beats the best so far) or 'no-change'.
export function replaySteps(result, n) {
  const steps = [];
  let best = null, previous = null;
  for (const frame of result?.progress ?? []) {
    const complete = frame.distance != null && frame.route?.length === n;
    let kind = 'building';
    if (complete) kind = best == null ? 'first' : frame.distance < best ? 'improved' : 'no-change';
    const previousBest = best;
    if (kind === 'first' || kind === 'improved') best = frame.distance;
    steps.push({
      t: frame.t,
      route: frame.route,
      distance: complete ? frame.distance : null,
      best,
      previousBest,
      delta: kind === 'improved' ? previousBest - frame.distance : null,
      kind,
      ...edgeChanges(previous, frame.route, n),
    });
    previous = frame.route;
  }
  return steps;
}
