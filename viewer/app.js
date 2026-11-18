import { createScene, buildTour, truckAt, LANDMARKS } from './scene.js';
import { createRaceView } from './race-view.js';
import { visibleRaceEntries } from './race.js';

const $ = id => document.getElementById(id);
const canvas = $('map');
const ctx = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const regionNames = { 'uk-30': 'United Kingdom', 'nl-30': 'Netherlands', berlin52: 'Berlin / 52 stops',
  'random-100': 'Random / 100 stops', 'clustered-200': 'Clusters / 200 stops' };
let dataset = null, result = null, scene = null, tour = null;
let animation = null, elapsed = 0, lastTime = null, paused = false, playing = false;
let currentRoute = null, position = null, visited = 0, requestVersion = 0;
let view = 'race', allResults = new Map();
const previewMs = 20000;

async function getJson(url, optional = false) {
  const response = await fetch(url);
  if (optional && response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status}).`);
  return response.json();
}

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

const race = createRaceView({
  grid: $('race-grid'),
  board: $('race-board'),
  chart: $('race-chart'),
  reducedMotion,
  onProgress: (fraction, label, detail) => setBar(fraction, label, detail),
  onOpen: solver => {
    if (![...$('solver').options].some(option => option.value === solver)) return;
    $('solver').value = solver;
    setView('single');
  },
  onPlayState: playing => {
    if (view !== 'race') return;
    $('pause').disabled = !playing;
    $('pause').textContent = 'Pause';
  },
});

function setBar(fraction, label, detail) {
  $('progress').style.width = `${fraction * 100}%`;
  $('progress').parentElement.setAttribute('aria-valuenow', Math.round(fraction * 100));
  $('phase').textContent = label;
  $('stops').textContent = detail;
}

function setView(next) {
  view = next;
  document.body.classList.toggle('view-race', view === 'race');
  document.body.classList.toggle('view-single', view === 'single');
  $('view-race').setAttribute('aria-pressed', view === 'race');
  $('view-single').setAttribute('aria-pressed', view === 'single');
  $('play').textContent = view === 'race' ? 'Replay race' : 'Replay route';
  stop();
  race.setActive(view === 'race');
  if (view === 'race') {
    $('play').disabled = !dataset || !race.count;
    race.replay();
    status(raceStatus());
  } else {
    resize();
    selectSolver();
  }
}

function raceStatus() {
  if (!dataset) return 'Loading region...';
  const ok = [...allResults.values()].filter(r => r?.status === 'ok').length;
  if (race.count && !ok) return 'No algorithms found a valid route in the latest race. Check their statuses in the leaderboard.';
  return ok ? `${ok} of ${race.count} algorithms found a route. Search time is replayed on a square-root scale, then every truck drives at the same speed.`
    : 'No race results for this region yet. Press "Run race" or use the command on the right.';
}

function stop() {
  race.stop();
  cancelAnimationFrame(animation);
  animation = null;
  lastTime = null;
  playing = false;
  paused = false;
  $('pause').disabled = true;
  $('pause').textContent = 'Pause';
}

function setProgress(fraction, label, stops) {
  if (view === 'single') setBar(fraction, label, `${stops} / ${dataset?.cities.length ?? 0} stops`);
}

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (!dataset) return;
  scene = createScene(ctx, dataset.cities, width, height, dataset.name);
  scene.setRoute(result?.status === 'ok' ? result.route : null);
  tour = buildTour(currentRoute, scene.points);
  position = truckAt(tour, Math.max(0, (elapsed - optimizationMs()) / previewMs));
  scene.draw(currentRoute, position, visited);
}

function optimizationMs() {
  return result?.progress?.length ? Math.min(3200, result.progress.length * 180) : 0;
}

function render(time) {
  if (!playing || paused || !scene) return;
  if (lastTime != null) elapsed += Math.min(time - lastTime, 100);
  lastTime = time;
  const optimize = optimizationMs();
  if (elapsed < optimize) {
    const frames = result.progress;
    const index = Math.min(frames.length - 1, Math.floor(elapsed / optimize * frames.length));
    const frame = frames[index];
    if (currentRoute !== frame.route) {
      currentRoute = frame.route;
      tour = buildTour(currentRoute, scene.points);
    }
    position = truckAt(tour, 0);
    visited = 0;
    setProgress(0, 'Finding a shorter tour', 0);
  } else {
    if (currentRoute !== result.route) {
      currentRoute = result.route;
      tour = buildTour(currentRoute, scene.points);
    }
    const fraction = Math.min(1, (elapsed - optimize) / previewMs);
    position = truckAt(tour, fraction);
    visited = position?.stops ?? 0;
    setProgress(fraction, fraction === 1 ? 'Back at the depot' : 'Delivery preview', visited);
    if (fraction === 1) stop();
  }
  scene.draw(currentRoute, position, visited);
  if (playing) animation = requestAnimationFrame(render);
}

function replay() {
  stop();
  if (view === 'race') { race.replay(); return; }
  if (!scene) return;
  elapsed = 0;
  visited = 0;
  currentRoute = result?.status === 'ok' ? result.route : null;
  scene.setRoute(currentRoute);
  tour = buildTour(currentRoute, scene.points);
  position = truckAt(tour, 0);
  scene.draw(currentRoute, position, 0);
  setProgress(0, currentRoute ? 'Delivery preview' : 'Waiting for a route', 0);
  if (!currentRoute) return;
  status(`${result.solver}: ${result.progress?.length ?? 0} reported routes. Preview is illustrative, not road navigation.`);
  if (reducedMotion.matches) {
    $('phase').textContent = 'Final tour';
    status('Reduced motion is enabled. Showing the final tour without animation.');
    return;
  }
  playing = true;
  $('pause').disabled = false;
  animation = requestAnimationFrame(render);
}

function updateSummary() {
  const ok = result?.status === 'ok';
  $('selected-solver').textContent = result?.solver ?? 'No route yet';
  $('distance').textContent = ok ? result.distance.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--';
  $('units').textContent = dataset?.units ?? (dataset?.distance === 'haversine' ? 'km' : 'units');
  $('compute-time').textContent = ok && result.ms != null ? `${result.ms} ms` : '--';
  $('improvements').textContent = ok ? result.progress?.length ?? 0 : '--';
  $('play').disabled = view === 'race' ? !dataset || !race.count : !ok;
  document.querySelectorAll('#leaderboard tbody tr').forEach(row => row.classList.toggle('selected', row.dataset.solver === $('solver').value));
}

function showLeaderboard(lb) {
  const body = $('leaderboard').querySelector('tbody');
  body.replaceChildren();
  const rows = (lb?.leaderboard ?? []).filter(row => allResults.has(row.solver));
  $('leaderboard-empty').hidden = rows.length > 0;
  for (const [i, row] of rows.entries()) {
    const tr = document.createElement('tr');
    tr.dataset.solver = row.solver;
    if (row.status !== 'ok') tr.className = 'dim';
    const values = [i + 1, row.solver, row.distance?.toFixed(1) ?? row.status, row.ms != null ? `${row.ms} ms` : '--'];
    values.forEach((value, column) => {
      const td = document.createElement('td');
      if (column === 1 && [...$('solver').options].some(option => option.value === row.solver)) {
        const button = document.createElement('button');
        button.className = 'solver-link';
        button.textContent = value;
        button.onclick = () => { $('solver').value = row.solver; selectSolver(); };
        td.append(button);
      } else td.textContent = value;
      tr.append(td);
    });
    body.append(tr);
  }
}

function options(select, names, labels = {}) {
  select.replaceChildren(...names.map(name => new Option(labels[name] ?? name, name)));
}

function displayResult() {
  updateSummary();
  replay();
  if (view !== 'single') return;
  if (!result) status('No results yet. Run the command on the right, then refresh to put a truck on the road.');
  else if (result.status !== 'ok') status(`${result.solver}: ${result.message ?? result.status}`, true);
}

async function selectSolver() {
  const version = ++requestVersion;
  stop();
  $('play').disabled = true;
  if (version !== requestVersion) return;
  result = allResults.get($('solver').value) ?? null;
  displayResult();
}

async function selectDataset() {
  const version = ++requestVersion;
  stop();
  result = null;
  currentRoute = null;
  dataset = null;
  scene = null;
  allResults = new Map();
  race.clear();
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  $('region').textContent = 'Loading region...';
  updateSummary();
  showLeaderboard(null);
  $('solver').disabled = true;
  $('play').disabled = true;
  $('city-detail').hidden = true;
  setProgress(0, 'Loading region', 0);
  status('Loading region...');
  try {
    const name = $('dataset').value;
    const next = await getJson(`/data/${encodeURIComponent(name)}.json`);
    if (version !== requestVersion) return;
    if (!Array.isArray(next.cities) || !next.cities.length) throw new Error('This dataset has no cities to display.');
    dataset = next;
    dataset.name ??= name;
    $('region').textContent = regionNames[name] ?? name;
    $('city-count').textContent = `${dataset.cities.length} cities`;
    $('race-command').textContent = `npm run race -- --dataset data/${name}.json`;
    canvas.setAttribute('aria-label', `${$('region').textContent}: ${dataset.cities.map(c => c.name ?? `City ${c.id}`).join(', ')}. Route roads are schematic.`);
    elapsed = 0;
    visited = 0;
    resize();
    const [solvers, leaderboard] = await Promise.all([
      getJson(`/api/results/${encodeURIComponent(dataset.name)}`),
      getJson(`/results/${encodeURIComponent(dataset.name)}/leaderboard.json`, true),
    ]);
    const loaded = await Promise.all(solvers.map(solver =>
      getJson(`/results/${encodeURIComponent(dataset.name)}/${encodeURIComponent(solver)}.json`, true)));
    if (version !== requestVersion) return;
    const entries = visibleRaceEntries(solvers.map((solver, i) => ({ solver, result: loaded[i] })), leaderboard);
    allResults = new Map(entries.map(entry => [entry.solver, entry.result]));
    const names = entries.map(entry => entry.solver);
    race.load(dataset, entries, leaderboard);
    options($('solver'), names.length ? names : [''], { '': 'No results yet' });
    $('solver').disabled = !names.length;
    const leader = leaderboard?.leaderboard?.find(row => row.status === 'ok' && allResults.has(row.solver));
    if (leader) $('solver').value = leader.solver;
    showLeaderboard(leaderboard);
    updateSummary();
    if (view === 'race') {
      race.replay();
      status(raceStatus());
    } else await selectSolver();
  } catch (error) {
    if (version !== requestVersion) return;
    updateSummary();
    if (!dataset) $('region').textContent = 'Region unavailable';
    status(error.message, true);
  }
}

$('dataset').onchange = selectDataset;
$('solver').onchange = selectSolver;
$('play').onclick = replay;
$('view-race').onclick = () => view !== 'race' && setView('race');
$('view-single').onclick = () => view !== 'single' && setView('single');
$('run-race').onclick = async () => {
  if (!dataset) return;
  const name = $('dataset').value, seconds = Number($('race-time').value) / 1000;
  $('run-race').disabled = true;
  $('dataset').disabled = true;
  stop();
  setBar(0, 'Racing on the server', `${seconds} s per algorithm, all in parallel`);
  status(`Running every algorithm on ${regionNames[name] ?? name} for up to ${seconds} s...`);
  try {
    const response = await fetch(`/api/race?dataset=${encodeURIComponent(name)}&time=${$('race-time').value}`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.output || `Race failed (HTTP ${response.status}).`);
    $('dataset').disabled = false;
    await selectDataset();
  } catch (error) {
    status(error.message, true);
  } finally {
    $('run-race').disabled = false;
    $('dataset').disabled = false;
  }
};
$('pause').onclick = () => {
  if (view === 'race') {
    $('pause').textContent = race.togglePause() ? 'Resume' : 'Pause';
    return;
  }
  paused = !paused;
  $('pause').textContent = paused ? 'Resume' : 'Pause';
  if (paused) cancelAnimationFrame(animation);
  else { lastTime = null; animation = requestAnimationFrame(render); }
};
reducedMotion.addEventListener('change', () => { if (dataset) replay(); });
document.addEventListener('visibilitychange', () => { lastTime = null; race.resetClock(); });
// WebKit frees canvas memory lazily across reloads; release it eagerly when leaving the page.
addEventListener('pagehide', () => {
  stop();
  race.clear();
  scene?.dispose();
  for (const node of document.querySelectorAll('canvas')) node.width = node.height = 0;
});
addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
new ResizeObserver(resize).observe(canvas);
canvas.addEventListener('pointermove', event => {
  if (!scene) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const id = scene.points.findIndex(p => Math.hypot(p.x - x, p.y - y) < 16);
  $('city-detail').hidden = id < 0;
  if (id < 0) return;
  const city = dataset.cities[id], landmark = LANDMARKS[city.name];
  $('city-detail').textContent = `${city.name ?? `City ${city.id}`}${landmark ? ` / ${landmark.name}` : ''}${id === (currentRoute?.[0] ?? 0) ? ' / Depot' : ''}`;
});
canvas.addEventListener('pointerleave', () => { $('city-detail').hidden = true; });

try {
  const names = await getJson('/api/datasets');
  if (!names.length) throw new Error('No datasets found in data/.');
  options($('dataset'), names, regionNames);
  $('dataset').disabled = false;
  if (names.includes('uk-30')) $('dataset').value = 'uk-30';
  setView(new URLSearchParams(location.search).get('view') === 'single' ? 'single' : 'race');
  await selectDataset();
} catch (error) {
  status(error.message, true);
}
