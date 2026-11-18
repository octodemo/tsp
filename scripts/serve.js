// Static server for the viewer + JSON API over data/ and results/.
//   npm run serve  ->  http://localhost:3000
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execFile } from 'node:child_process';
import { loadSolvers } from '../src/solvers/index.js';

const port = Number(process.env.PORT ?? 3000);
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const json = (res, body) => {
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

function safeFile(base, rel) {
  const p = normalize(join(root, base, rel));
  if (!p.startsWith(join(root, base))) return null;
  return existsSync(p) && statSync(p).isFile() ? p : null;
}

let racing = null;

function runRace(name, timeMs) {
  return new Promise((resolve) => {
    execFile(process.execPath, ['scripts/race.js', '--dataset', join('data', `${name}.json`), '--time', String(timeMs)],
      { cwd: root, timeout: timeMs * 4 + 30000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, output: error ? `${stderr || error.message}`.trim() : stdout.trim() }));
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = decodeURIComponent(url.pathname);

  if (path === '/api/solvers') {
    try {
      return json(res, (await loadSolvers()).map(({ name, description }) => ({ name, description })));
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: error.message }));
    }
  }
  if (path === '/api/race' && req.method === 'POST') {
    const name = url.searchParams.get('dataset') ?? '';
    const timeMs = Math.min(30000, Math.max(500, Number(url.searchParams.get('time')) || 5000));
    if (!/^[\w.-]+$/.test(name) || !existsSync(join('data', `${name}.json`))) {
      res.writeHead(400, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, output: 'Unknown dataset.' }));
    }
    if (racing) {
      res.writeHead(409, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, output: `A race on ${racing} is already running.` }));
    }
    racing = name;
    try {
      return json(res, await runRace(name, timeMs));
    } finally {
      racing = null;
    }
  }

  if (path === '/api/datasets') {
    return json(res, readdirSync('data').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')));
  }
  if (path.startsWith('/api/results/')) {
    const name = path.split('/')[3];
    const dir = join('results', name);
    if (!/^[\w.-]+$/.test(name) || !existsSync(dir)) return json(res, []);
    return json(res, readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'leaderboard.json').map((f) => f.replace(/\.json$/, '')));
  }

  let file = null;
  if (path.startsWith('/data/')) file = safeFile('data', path.slice(6));
  else if (path.startsWith('/results/')) file = safeFile('results', path.slice(9));
  else file = safeFile('viewer', path === '/' ? 'index.html' : path.slice(1));

  if (!file) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`TSP viewer running at http://localhost:${port}`));
