import test from 'node:test';
import assert from 'node:assert/strict';
import { realTimeAt, replayTimeOf, raceRealMax, stateAt, driveDuration, rankEntries, searchDuration, phaseLabel, visibleRaceEntries } from '../viewer/race.js';

const result = {
  solver: 'two-opt', status: 'ok', route: [0, 1, 2, 3], distance: 10, ms: 400,
  progress: [
    { t: 0, distance: null, route: [0, 1] },
    { t: 10, distance: 20, route: [0, 2, 1, 3] },
    { t: 300, distance: 10, route: [0, 1, 2, 3] },
  ],
};

test('race maps show only non-stub results from the latest race', () => {
  const entries = [
    { solver: 'two-opt', result },
    { solver: 'random', result: { ...result, solver: 'random' } },
    { solver: 'genetic', result: { status: 'not-implemented' } },
    { solver: 'missing', result: null },
    { solver: 'broken', result: { status: 'error' } },
    { solver: 'slow', result: { status: 'timeout' } },
    { solver: 'invalid', result: { status: 'invalid' } },
  ];
  const leaderboard = { leaderboard: ['two-opt', 'genetic', 'broken', 'slow', 'invalid'].map(solver => ({ solver })) };
  assert.deepEqual(visibleRaceEntries(entries, leaderboard).map(entry => entry.solver),
    ['two-opt', 'broken', 'slow', 'invalid']);
  assert.deepEqual(visibleRaceEntries(entries, { leaderboard: [{ solver: 'two-opt' }] }), [entries[0]]);
  assert.deepEqual(visibleRaceEntries(entries, { leaderboard: [] }), []);
  assert.deepEqual(visibleRaceEntries(entries, null).map(entry => entry.solver),
    ['two-opt', 'random', 'broken', 'slow', 'invalid']);
  assert.deepEqual(visibleRaceEntries([entries[2], entries[3]], null), []);
  assert.deepEqual(visibleRaceEntries([], null), []);
});

test('the workshop final includes all six solvers once implemented and raced together', () => {
  const names = ['ant-colony', 'genetic-algorithm', 'nearest-neighbour', 'random', 'simulated-annealing', 'two-opt'];
  const entries = names.map(solver => ({ solver, result: { ...result, solver } }));
  const leaderboard = { leaderboard: names.map(solver => ({ solver })) };
  assert.deepEqual(visibleRaceEntries(entries, leaderboard), entries);
});

test('race replay maps compute time on a reversible square-root curve', () => {
  assert.equal(realTimeAt(0, 5000, 7000), 0);
  assert.equal(realTimeAt(3500, 4000, 7000), 1000);
  assert.equal(realTimeAt(9000, 4000, 7000), 4000);
  assert.ok(Math.abs(replayTimeOf(realTimeAt(2100, 5000, 7000), 5000, 7000) - 2100) < 1e-9);
  assert.equal(searchDuration(2), 1500);
  assert.equal(searchDuration(5000), 7000);
});

test('race state follows reported progress until the solver finishes', () => {
  assert.deepEqual(stateAt(null, 0), { phase: 'waiting', route: null, distance: null });
  assert.deepEqual(stateAt(result, 5), { phase: 'searching', route: [0, 1], distance: null });
  assert.deepEqual(stateAt(result, 50), { phase: 'searching', route: [0, 2, 1, 3], distance: 20 });
  assert.deepEqual(stateAt(result, 400), { phase: 'done', route: [0, 1, 2, 3], distance: 10 });
  const stub = { solver: 'genetic', status: 'not-implemented', message: 'not implemented yet', ms: 1, progress: [] };
  assert.equal(stateAt(stub, 0).phase, 'searching');
  assert.deepEqual(stateAt(stub, Infinity), { phase: 'not-implemented', route: null, distance: null, message: 'not implemented yet' });
  assert.equal(stateAt({ ...result, status: 'timeout', ms: undefined }, Infinity).phase, 'timeout');
  assert.equal(phaseLabel('not-implemented'), 'Not implemented');
});

test('race length uses the slowest solver and trucks share one speed', () => {
  assert.equal(raceRealMax([result, null, { ms: 2, progress: [] }]), 400);
  assert.equal(raceRealMax([null], 5000), 5000);
  assert.equal(driveDuration(5, 10, 12000), 6000);
  assert.equal(driveDuration(10, 10, 12000), 12000);
});

test('race ranking puts the shortest route first and failures last', () => {
  const ranked = rankEntries([
    { solver: 'stub', phase: 'not-implemented', distance: null },
    { solver: 'random', phase: 'done', distance: 90 },
    { solver: 'building', phase: 'searching', distance: null },
    { solver: 'two-opt', phase: 'searching', distance: 40 },
  ]);
  assert.deepEqual(ranked.map(entry => entry.solver), ['two-opt', 'random', 'building', 'stub']);
});
