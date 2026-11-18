// Race view: one map per solver, all replayed on a shared timeline, with a live leaderboard and chart.
import { createScene, buildTour, truckAt } from './scene.js';
import { SOLVER_COLORS, DRIVE_MS, searchDuration, realTimeAt, replayTimeOf, raceRealMax, stateAt, driveDuration, rankEntries, phaseLabel } from './race.js';

const HOLD_MS = 800;
const fmt = d => d.toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmtMs = ms => ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s` : `${Math.round(ms)} ms`;
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

function fitCanvas(canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return null;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(width * ratio), h = Math.round(height * ratio);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

export function createRaceView({ grid, board, chart, onProgress, onOpen, onPlayState = () => {}, reducedMotion }) {
  let tiles = [], dataset = null, units = '', optimal = null;
  let realMax = 1, searchMs = 1500, endMs = 1500, elapsed = 0, lastTime = null, animation = null;
  let playing = false, paused = false, boardKey = '', active = false;
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (entry.target === chart) drawChart();
      else {
        const tile = tiles.find(t => t.canvas === entry.target);
        if (tile) { sizeTile(tile); if (!playing) update(); }
      }
    }
  });
  observer.observe(chart);

  function sizeTile(tile) {
    const fitted = fitCanvas(tile.canvas);
    if (!fitted || !dataset) return;
    tile.scene = createScene(fitted.ctx, dataset.cities, fitted.width, fitted.height, dataset.name,
      { accent: tile.color, cab: tile.color, fixedLabels: true });
    tile.scene.setRoute(tile.result?.status === 'ok' ? tile.result.route : null);
    tile.tourRoute = undefined;
    tile.tour = null;
  }

  // WebKit caps total canvas memory, so free old tile buffers straight away.
  function release() {
    for (const tile of tiles) {
      observer.unobserve(tile.canvas);
      tile.scene?.dispose();
      tile.canvas.width = tile.canvas.height = 0;
    }
    tiles = [];
    grid.replaceChildren();
  }

  function makeTile(entry, index) {
    const color = SOLVER_COLORS[index % SOLVER_COLORS.length];
    const root = el('article', 'tile');
    root.style.setProperty('--solver', color);
    const head = el('header');
    const rank = el('span', 'rank', '-');
    const title = el('div', 'tile-title');
    const open = el('button', 'tile-open', entry.solver);
    open.title = `Open ${entry.solver} in the single route view`;
    open.onclick = () => onOpen(entry.solver);
    const state = el('p', 'tile-state', '');
    title.append(open, state);
    const distance = el('strong', 'tile-distance', '--');
    head.append(rank, title, distance);
    const map = el('div', 'tile-map');
    const canvas = el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${entry.solver} route on ${dataset.name}`);
    const overlay = el('div', 'tile-overlay');
    overlay.hidden = true;
    const flag = el('span', 'leader-flag', 'LEADER');
    flag.hidden = true;
    map.append(canvas, overlay, flag);
    root.append(head, map);
    grid.append(root);
    const tile = { ...entry, color, root, rank, state, distance, canvas, overlay, flag, s: stateAt(entry.result, 0) };
    observer.observe(canvas);
    return tile;
  }

  function drawTile(tile) {
    if (!tile.scene) return;
    tile.scene.draw(tile.s.route, tile.position, tile.visited);
  }

  function update() {
    if (!dataset) return;
    const searching = elapsed < searchMs;
    const realT = searching ? realTimeAt(elapsed, realMax, searchMs) : Infinity;
    const driving = elapsed - searchMs;
    for (const tile of tiles) {
      tile.s = stateAt(tile.result, realT);
      const complete = tile.s.route?.length === dataset.cities.length;
      if (tile.s.route !== tile.tourRoute && tile.scene) {
        tile.tourRoute = tile.s.route;
        tile.tour = complete ? buildTour(tile.s.route, tile.scene.points) : null;
      }
      tile.position = null;
      tile.visited = 0;
      tile.arrived = false;
      if (tile.tour && !searching && tile.s.phase === 'done') {
        const fraction = Math.min(1, driving / tile.drive);
        tile.position = truckAt(tile.tour, fraction);
        tile.visited = tile.position?.stops ?? 0;
        tile.arrived = fraction === 1;
      } else if (tile.tour) tile.position = truckAt(tile.tour, 0);
    }
    const ranked = rankEntries(tiles.map(t => ({ solver: t.solver, phase: t.s.phase, distance: t.s.distance, tile: t })));
    const leader = ranked[0]?.distance != null ? ranked[0].tile : null;
    ranked.forEach((entry, i) => { entry.tile.place = entry.distance != null ? i + 1 : null; });
    for (const tile of tiles) {
      const failed = !['searching', 'done', 'waiting'].includes(tile.s.phase);
      let state = phaseLabel(tile.s.phase);
      if (tile.s.phase === 'done' && !searching) state = tile.arrived ? 'Back at the depot' : `On the road / ${tile.visited} of ${dataset.cities.length} stops`;
      else if (tile.s.phase === 'searching' && tile.s.distance == null) state = 'Building first route';
      tile.state.textContent = state;
      tile.rank.textContent = tile.place ?? '-';
      tile.distance.textContent = tile.s.distance != null ? `${fmt(tile.s.distance)} ${units}` : '--';
      tile.root.classList.toggle('leader', tile === leader);
      tile.root.classList.toggle('failed', failed || tile.s.phase === 'waiting');
      tile.flag.hidden = tile !== leader;
      tile.overlay.hidden = !(failed || tile.s.phase === 'waiting');
      if (!tile.overlay.hidden) tile.overlay.textContent = tile.s.phase === 'waiting' ? 'Not raced yet' : tile.s.message ?? phaseLabel(tile.s.phase);
      drawTile(tile);
    }
    updateBoard(ranked, leader);
    drawChart(realT);
    const fraction = Math.min(1, elapsed / endMs);
    const hasRoutes = tiles.some(t => t.result?.status === 'ok');
    if (!hasRoutes) onProgress(0, tiles.length ? 'No valid routes found' : 'Waiting for race results', '');
    else if (searching) onProgress(fraction, 'Algorithms searching', `${fmtMs(realT)} / ${fmtMs(realMax)} compute`);
    else if (elapsed < endMs - HOLD_MS) onProgress(fraction, 'Trucks on the road', 'Same speed for every truck');
    else onProgress(1, leader ? `${leader.solver} wins` : 'Race finished', `${fmt(leader?.s.distance ?? 0)} ${units}`);
  }

  function updateBoard(ranked, leader) {
    const key = ranked.map(e => `${e.solver}|${e.tile.place}|${e.distance}|${e.tile.state.textContent}`).join(';');
    if (key === boardKey) return;
    boardKey = key;
    const body = board.querySelector('tbody');
    body.replaceChildren(...ranked.map(entry => {
      const tile = entry.tile;
      const tr = el('tr');
      if (tile === leader) tr.className = 'leader';
      if (tile.root.classList.contains('failed')) tr.classList.add('dim');
      tr.append(el('td', null, tile.place ?? '-'));
      const name = el('td');
      const button = el('button', 'solver-link');
      button.style.setProperty('--solver', tile.color);
      button.append(el('i', 'swatch'), tile.solver);
      button.onclick = () => onOpen(tile.solver);
      name.append(button);
      tr.append(name);
      const distance = el('td', null, entry.distance != null ? fmt(entry.distance) : '--');
      if (optimal && entry.distance != null) distance.append(el('small', null, `+${((entry.distance - optimal) / optimal * 100).toFixed(1)}%`));
      tr.append(distance, el('td', 'board-state', tile.state.textContent));
      return tr;
    }));
  }

  function drawChart(realT = elapsed < searchMs ? realTimeAt(elapsed, realMax, searchMs) : realMax) {
    const fitted = fitCanvas(chart);
    if (!fitted) return;
    const { ctx, width, height } = fitted;
    ctx.clearRect(0, 0, width, height);
    const series = tiles.map(tile => ({ tile, points: (tile.result?.progress ?? []).filter(f => f.distance != null) }))
      .filter(s => s.points.length);
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#73817b';
    if (!series.length) {
      ctx.textAlign = 'center';
      ctx.fillText('No progress to chart yet', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }
    const all = series.flatMap(s => s.points.map(p => p.distance));
    const lo = Math.min(...all, optimal ?? Infinity) * .98;
    const hi = Math.min(Math.max(...series.map(s => s.points[0].distance)), lo * 2.2) * 1.02;
    const left = 46, right = 10, top = 10, bottom = 24;
    const x = t => left + (width - left - right) * replayTimeOf(t, realMax, searchMs) / searchMs;
    const y = d => top + (height - top - bottom) * (1 - (Math.min(d, hi) - lo) / (hi - lo || 1));
    ctx.strokeStyle = '#e1e7df';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const value = lo + (hi - lo) * i / 3;
      ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(width - right, y(value)); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(value).toLocaleString(), left - 6, y(value) + 3);
    }
    ctx.textAlign = 'center';
    let lastTick = -Infinity;
    const ticks = [0, 1, 10, 100, 1000, 10000, 100000].filter(t => t < realMax * .8);
    for (const tick of [...ticks, realMax]) {
      if (x(tick) - lastTick < 42) continue;
      lastTick = x(tick);
      ctx.textAlign = x(tick) > width - right - 20 ? 'right' : 'center';
      ctx.fillText(fmtMs(tick), Math.min(x(tick), width - right), height - 7);
    }
    ctx.textAlign = 'left';
    if (optimal) {
      ctx.setLineDash([3, 4]); ctx.strokeStyle = '#c58a3f';
      ctx.beginPath(); ctx.moveTo(left, y(optimal)); ctx.lineTo(width - right, y(optimal)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#a8692b';
      ctx.fillText('optimum', left + 4, y(optimal) - 4);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(left, top, width - left - right, height - top - bottom); ctx.clip();
    for (const { tile, points } of series) {
      ctx.beginPath();
      let last = null;
      for (const p of points) {
        if (p.t > realT) break;
        if (last == null) ctx.moveTo(x(p.t), y(p.distance));
        else ctx.lineTo(x(p.t), y(last));
        ctx.lineTo(x(p.t), y(p.distance));
        last = p.distance;
      }
      if (last == null) continue;
      const endX = x(Math.min(realT, realMax));
      ctx.lineTo(endX, y(last));
      ctx.strokeStyle = tile.color;
      ctx.lineWidth = tile.root.classList.contains('leader') ? 3 : 1.6;
      ctx.stroke();
      ctx.fillStyle = tile.color;
      ctx.beginPath(); ctx.arc(Math.min(endX, width - right - 4), y(last), 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (realT < realMax) {
      ctx.strokeStyle = '#283b3955';
      ctx.beginPath(); ctx.moveTo(x(realT), top); ctx.lineTo(x(realT), height - bottom); ctx.stroke();
    }
  }

  function frame(time) {
    if (!playing || paused) return;
    if (lastTime != null) elapsed += Math.min(time - lastTime, 100);
    lastTime = time;
    if (elapsed >= endMs) { elapsed = endMs; update(); stop(); return; }
    update();
    animation = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(animation);
    animation = null;
    lastTime = null;
    const wasPlaying = playing;
    playing = false;
    paused = false;
    if (wasPlaying) onPlayState(false);
  }

  function replay() {
    stop();
    elapsed = 0;
    if (!dataset || !active) return;
    const animate = tiles.some(t => t.result?.status === 'ok') && !reducedMotion.matches;
    if (!animate) elapsed = endMs;
    update();
    if (!animate) return;
    playing = true;
    onPlayState(true);
    animation = requestAnimationFrame(frame);
  }

  return {
    get playing() { return playing; },
    get paused() { return paused; },
    get count() { return tiles.length; },
    load(nextDataset, entries, leaderboard) {
      stop();
      release();
      dataset = nextDataset;
      units = dataset.units ?? (dataset.distance === 'haversine' ? 'km' : '');
      optimal = leaderboard?.optimal ?? dataset.optimal ?? null;
      boardKey = '';
      board.querySelector('tbody').replaceChildren();
      tiles = entries.map(makeTile);
      if (!tiles.length) grid.append(el('p', 'race-empty', 'No implemented solvers have been raced for this region yet. Run a race, then refresh to see their maps.'));
      realMax = raceRealMax(tiles.map(t => t.result), leaderboard?.timeLimitMs ?? 1000);
      searchMs = searchDuration(realMax);
      const longest = Math.max(0, ...tiles.filter(t => t.result?.status === 'ok').map(t => t.result.distance));
      for (const tile of tiles) tile.drive = tile.result?.status === 'ok' ? driveDuration(tile.result.distance, longest) : 0;
      endMs = searchMs + (longest ? DRIVE_MS : 0) + HOLD_MS;
      grid.dataset.count = tiles.length;
      for (const tile of tiles) sizeTile(tile);
    },
    clear() {
      stop();
      release();
      dataset = null;
      board.querySelector('tbody').replaceChildren();
      boardKey = '';
      drawChart();
    },
    setActive(value) {
      active = value;
      if (!value) stop();
    },
    replay,
    stop,
    togglePause() {
      if (!playing) return false;
      paused = !paused;
      if (paused) cancelAnimationFrame(animation);
      else { lastTime = null; animation = requestAnimationFrame(frame); }
      return paused;
    },
    resetClock() { lastTime = null; },
  };
}
