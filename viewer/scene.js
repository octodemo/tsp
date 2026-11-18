import { COUNTRY_OUTLINES } from './countries.js';

// Landmark metadata is presentation-only; datasets and scoring stay untouched.
export const LANDMARKS = {
  London: { name: 'Big Ben', type: 'clock' },
  Birmingham: { name: 'Library of Birmingham', type: 'library' },
  Manchester: { name: 'Beetham Tower', type: 'tower' },
  Leeds: { name: 'Town Hall', type: 'hall' },
  Liverpool: { name: 'Royal Liver Building', type: 'hall' },
  Sheffield: { name: 'City Hall', type: 'hall' },
  Bristol: { name: 'Clifton Suspension Bridge', type: 'suspension' },
  Edinburgh: { name: 'Edinburgh Castle', type: 'castle' },
  Glasgow: { name: 'Riverside Museum', type: 'museum' },
  Amsterdam: { name: 'Canal houses', type: 'canal' },
  Rotterdam: { name: 'Erasmus Bridge', type: 'bridge' },
  'Den Haag': { name: 'Peace Palace', type: 'castle' },
  Utrecht: { name: 'Dom Tower', type: 'clock' },
  Eindhoven: { name: 'Evoluon', type: 'dome' },
  Groningen: { name: 'Martini Tower', type: 'clock' },
};

export function project(cities, width, height) {
  return projectMap(cities, width, height).points;
}

export function projectMap(cities, width, height, outlines = []) {
  if (!cities.length) return { points: [], outlines: [] };
  const geo = 'lat' in cities[0];
  const latitude = geo ? cities.reduce((sum, c) => sum + c.lat, 0) / cities.length : 0;
  const longitudeScale = Math.cos(latitude * Math.PI / 180);
  const points = cities.map(c => geo ? { x: c.lon * longitudeScale, y: -c.lat } : { x: c.x, y: c.y });
  const rings = geo ? outlines.map(ring => ring.map(([lon, lat]) => ({ x: lon * longitudeScale, y: -lat }))) : [];
  const bounds = [...points, ...rings.flat()];
  const xs = bounds.map(p => p.x), ys = bounds.map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  const padX = rings.length ? Math.min(80, width * .12) : Math.min(125, width * .23);
  const padY = rings.length ? Math.min(60, height * .1) : Math.min(90, height * .15);
  const scale = Math.min((width - padX * 2) / (spanX || 1), (height - padY * 2) / (spanY || 1));
  const offsetX = (width - spanX * scale) / 2, offsetY = (height - spanY * scale) / 2;
  const transform = p => ({ x: offsetX + (p.x - minX) * scale, y: offsetY + (p.y - minY) * scale });
  return { points: points.map(transform), outlines: rings.map(ring => ring.map(transform)) };
}

const overlaps = (a, b, gap = 4) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

export function segmentIntersectsBox(from, to, box, padding = 10) {
  let enter = 0, exit = 1;
  for (const [axis, size] of [['x', 'w'], ['y', 'h']]) {
    const delta = to[axis] - from[axis], min = box[axis] - padding, max = box[axis] + box[size] + padding;
    if (delta === 0) {
      if (from[axis] < min || from[axis] > max) return false;
      continue;
    }
    const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return false;
  }
  return true;
}

export function layoutLabels(cities, points, width, height, measure, route = []) {
  const occupied = points.map(p => ({ x: p.x - 7, y: p.y - 7, w: 14, h: 14 }));
  const edges = route.flatMap((id, i) => i < route.length - 1 || route.length === cities.length
    ? [[points[id], points[route[(i + 1) % route.length]]]] : []);
  const labels = [];
  const order = cities.map((city, id) => ({ city, id, landmark: LANDMARKS[city.name] }))
    .sort((a, b) => Number(Boolean(b.landmark)) - Number(Boolean(a.landmark)));
  for (const { city, id, landmark } of order) {
    if (!city.name || (!landmark && cities.length > 60)) continue;
    const p = points[id];
    const compact = width < 320;
    const fontSize = compact ? 10 : 11;
    const w = Math.max(measure(city.name) * fontSize / 11 + 12, landmark ? 56 : 0);
    const h = landmark ? compact ? 46 : 50 : 22;
    const candidates = [];
    for (const dy of [-h / 2, -h - 14, 14, -h - 48, 48, -h - 90, 90]) {
      for (const x of [p.x + 16, p.x - w - 16]) candidates.push({ x, y: p.y + dy, w, h });
    }
    const fits = b => b.x >= 10 && b.x + b.w <= width - 10 && b.y >= 12 && b.y + b.h <= height - 42
      && !occupied.some(o => overlaps(b, o)) && !edges.some(([from, to]) => segmentIntersectsBox(from, to, b));
    let box = candidates.find(fits);
    if (!box && landmark) {
      const alternatives = [];
      for (let y = 12; y + h <= height - 42; y += 16) {
        for (let x = 10; x + w <= width - 10; x += 16) {
          const b = { x, y, w, h };
          if (fits(b)) alternatives.push(b);
        }
      }
      alternatives.sort((a, b) => Math.hypot(a.x + w / 2 - p.x, a.y + h / 2 - p.y) - Math.hypot(b.x + w / 2 - p.x, b.y + h / 2 - p.y));
      box = alternatives[0];
    }
    if (!box) continue;
    occupied.push(box);
    labels.push({ ...box, id, landmark, fontSize });
  }
  return labels;
}

export function buildTour(route, points) {
  if (!route?.length) return { segments: [], length: 0 };
  let length = 0;
  const segments = route.map((id, i) => {
    const from = points[id], to = points[route[(i + 1) % route.length]];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const segment = { from, to, start: length, distance, id, next: route[(i + 1) % route.length] };
    length += distance;
    return segment;
  });
  return { segments, length };
}

export function truckAt(tour, fraction) {
  if (!tour.segments.length) return null;
  const target = Math.max(0, Math.min(1, fraction)) * tour.length;
  let index = tour.segments.findIndex(s => s.start + s.distance > target);
  if (index < 0) index = tour.segments.length - 1;
  const s = tour.segments[index];
  const t = s.distance ? Math.min(1, (target - s.start) / s.distance) : 0;
  return { x: s.from.x + (s.to.x - s.from.x) * t, y: s.from.y + (s.to.y - s.from.y) * t,
    angle: Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x), stops: fraction >= 1 ? tour.segments.length : index };
}

function line(ctx, points, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function landmark(ctx, type, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const stone = '#84918a', light = '#b8c2af', dark = '#52695f', gold = '#c99d60';
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(0, 29, 32, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = stone;
  if (type === 'clock') {
    ctx.fillRect(-7, -4, 14, 33);
    ctx.fillStyle = light;
    ctx.fillRect(-5, 6, 5, 23);
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(0, -17); ctx.lineTo(9, -4); ctx.fill();
    line(ctx, [[0, -17], [0, -22]], dark);
    ctx.fillStyle = '#f5f3df'; ctx.beginPath(); ctx.arc(0, 2, 4.5, 0, Math.PI * 2); ctx.fill();
    line(ctx, [[0, -1], [0, 2], [3, 2]], dark);
    line(ctx, [[-3, 13], [-3, 24], [3, 24], [3, 13]], dark);
  } else if (type === 'suspension') {
    line(ctx, [[-31, 22], [31, 22]], dark, 3);
    ctx.fillRect(-23, -7, 6, 36); ctx.fillRect(17, -7, 6, 36);
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-31, 15); ctx.lineTo(-20, -7); ctx.quadraticCurveTo(0, 27, 20, -7); ctx.lineTo(31, 15); ctx.stroke();
    for (let x = -14; x <= 14; x += 7) line(ctx, [[x, 10 - x * x / 30], [x, 21]], light);
  } else if (type === 'bridge') {
    line(ctx, [[-30, 22], [30, 22]], dark, 3);
    line(ctx, [[-8, 22], [5, -17], [10, 22]], stone, 4);
    for (let i = -26; i <= 26; i += 7) line(ctx, [[5, -14], [i, 21]], light);
    line(ctx, [[-32, 29], [33, 29]], '#91b5ad', 2);
  } else if (type === 'canal') {
    for (let i = 0; i < 3; i++) {
      const left = -24 + i * 17;
      ctx.fillStyle = i === 1 ? gold : stone;
      ctx.fillRect(left, 2 + i * 2, 14, 25 - i * 2);
      ctx.beginPath(); ctx.moveTo(left, 2 + i * 2); ctx.lineTo(left + 7, -9 + i * 2); ctx.lineTo(left + 14, 2 + i * 2); ctx.fill();
      ctx.fillStyle = '#e5eadc';
      for (let row = 0; row < 3; row++) { ctx.fillRect(left + 3, 7 + row * 6, 3, 3); ctx.fillRect(left + 9, 7 + row * 6, 3, 3); }
    }
    line(ctx, [[-29, 30], [29, 30]], '#91b5ad', 3);
  } else if (type === 'tower') {
    ctx.fillStyle = dark; ctx.fillRect(-10, -19, 20, 48);
    ctx.fillStyle = '#9eafa5'; ctx.fillRect(-8, -17, 7, 44);
    for (let i = -13; i < 27; i += 6) line(ctx, [[-10, i], [10, i]], light);
    ctx.fillStyle = stone; ctx.fillRect(-10, 4, 27, 5);
  } else if (type === 'dome') {
    ctx.fillRect(-4, 13, 8, 15);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, 10, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(0, 6, 23, 7, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = stone; ctx.fillRect(-22, 6, 44, 3);
  } else if (type === 'museum') {
    ctx.beginPath(); ctx.moveTo(-30, 28); ctx.lineTo(-30, 2);
    for (let i = -30; i < 30; i += 15) { ctx.lineTo(i + 7, -9); ctx.lineTo(i + 15, 2); }
    ctx.lineTo(30, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(-25, 7, 50, 18);
    for (let i = -20; i < 26; i += 10) line(ctx, [[i, 7], [i, 25]], light);
  } else if (type === 'library') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 1 ? gold : stone;
      ctx.fillRect(-23 + i * 4, 19 - i * 13, 46 - i * 8, 12);
      for (let j = -17 + i * 4; j < 20 - i * 4; j += 8) {
        ctx.strokeStyle = light; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(j, 25 - i * 13, 4, 0, Math.PI * 2); ctx.stroke();
      }
    }
  } else {
    ctx.fillRect(-23, 7, 46, 22);
    for (const left of [-28, 16]) {
      ctx.fillRect(left, -7, 12, 36);
      ctx.fillStyle = dark;
      if (type === 'castle') {
        for (let i = 0; i < 3; i++) ctx.fillRect(left + i * 5, -12, 3, 6);
      } else {
        ctx.beginPath(); ctx.moveTo(left - 2, -7); ctx.lineTo(left + 6, -16); ctx.lineTo(left + 14, -7); ctx.fill();
      }
      ctx.fillStyle = stone;
    }
    ctx.fillStyle = dark; ctx.fillRect(-4, 16, 8, 13);
    for (const left of [-17, 11]) { ctx.fillRect(left, 13, 5, 7); }
  }
  ctx.restore();
}

export function drawTruck(ctx, position, cab = '#c58a3f') {
  if (!position) return;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(position.angle);
  ctx.fillStyle = '#263e3430';
  ctx.beginPath(); ctx.roundRect(-17, -7, 35, 19, 4); ctx.fill();
  ctx.fillStyle = '#293e38';
  for (const x of [-11, 10]) { ctx.fillRect(x, -11, 6, 4); ctx.fillRect(x, 7, 6, 4); }
  ctx.fillStyle = '#fdfcf3'; ctx.beginPath(); ctx.roundRect(-18, -8, 24, 16, 2); ctx.fill();
  ctx.fillStyle = '#d3dccc'; ctx.fillRect(-16, 5, 20, 2);
  ctx.fillStyle = cab; ctx.beginPath(); ctx.roundRect(7, -8, 12, 16, 3); ctx.fill();
  ctx.fillStyle = '#385f5c'; ctx.fillRect(13, -5, 3, 10);
  ctx.fillStyle = '#f5e8b9'; ctx.fillRect(18, -6, 2, 3); ctx.fillRect(18, 3, 2, 3);
  ctx.restore();
}

const backgrounds = new WeakMap();

export function createScene(ctx, cities, width, height, region, { accent = '#418d78', cab, fixedLabels = false } = {}) {
  const { points, outlines } = projectMap(cities, width, height, COUNTRY_OUTLINES[region]);
  let labels = [], labelRoute;
  const setRoute = route => {
    if (route === labelRoute) return;
    labelRoute = route;
    ctx.save();
    ctx.font = '11px system-ui';
    labels = layoutLabels(cities, points, width, height, text => ctx.measureText(text).width, route ?? []);
    ctx.restore();
  };
  setRoute(null);
  let background = backgrounds.get(ctx.canvas);
  if (!background) backgrounds.set(ctx.canvas, background = document.createElement('canvas'));
  background.width = ctx.canvas.width;
  background.height = ctx.canvas.height;
  const bg = background.getContext('2d');
  bg.setTransform(ctx.getTransform());
  bg.fillStyle = outlines.length ? '#e9f0ef' : '#e7eddf';
  bg.fillRect(0, 0, width, height);
  const countryPath = new Path2D();
  for (const ring of outlines) {
    ring.forEach((p, i) => i ? countryPath.lineTo(p.x, p.y) : countryPath.moveTo(p.x, p.y));
    countryPath.closePath();
  }
  if (outlines.length) {
    bg.fillStyle = '#dce7d2';
    bg.fill(countryPath);
    bg.save();
    bg.clip(countryPath);
  }
  for (let y = 28; y < height; y += 72) {
    for (let x = 30; x < width; x += 86) {
      bg.fillStyle = (Math.floor(x / 86) + Math.floor(y / 72)) % 3 === 0 ? '#dce6d3' : '#e1e9d8';
      bg.beginPath(); bg.ellipse(x, y, 30, 18, -.4, 0, Math.PI * 2); bg.fill();
      bg.fillStyle = '#c6d5bd'; bg.beginPath(); bg.arc(x + 8, y - 3, 3, 0, Math.PI * 2); bg.fill();
    }
  }
  if (outlines.length) {
    bg.restore();
    bg.strokeStyle = '#8fa98e';
    bg.lineWidth = 2;
    bg.lineJoin = 'round';
    bg.stroke(countryPath);
  }
  return {
    points,
    setRoute,
    dispose() {
      background.width = background.height = 0;
      backgrounds.delete(ctx.canvas);
    },
    // highlight: { added: [[a, b]], removed: [[a, b]], color, alpha } marks the edges a replay step changed.
    draw(route, position, visited = 0, highlight = null) {
      if (!fixedLabels) setRoute(route);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(background, 0, 0, width, height);
      if (route?.length > 1) {
        const path = () => {
          ctx.beginPath();
          route.forEach((id, i) => i ? ctx.lineTo(points[id].x, points[id].y) : ctx.moveTo(points[id].x, points[id].y));
          if (route.length === cities.length) ctx.closePath();
        };
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.setLineDash([]);
        path(); ctx.strokeStyle = '#ced7c6'; ctx.lineWidth = 13; ctx.stroke();
        path(); ctx.strokeStyle = '#66786d'; ctx.lineWidth = 9; ctx.stroke();
        path(); ctx.strokeStyle = '#b8cbb8'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
        if (position) {
          ctx.beginPath(); ctx.moveTo(points[route[0]].x, points[route[0]].y);
          for (let i = 1; i <= Math.min(visited, route.length - 1); i++) ctx.lineTo(points[route[i]].x, points[route[i]].y);
          ctx.lineTo(position.x, position.y);
          ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke();
        }
      }
      if (highlight && (highlight.added?.length || highlight.removed?.length)) {
        const segment = ([a, b]) => { ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y); };
        ctx.save();
        ctx.globalAlpha = highlight.alpha ?? 1;
        ctx.lineCap = 'round';
        ctx.beginPath(); highlight.removed?.forEach(segment);
        ctx.strokeStyle = '#c4553f'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); highlight.added?.forEach(segment);
        ctx.strokeStyle = `${highlight.color ?? '#dda547'}66`; ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = highlight.color ?? '#dda547'; ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();
      }
      points.forEach((p, i) => {
        const depot = i === (route?.[0] ?? 0);
        ctx.fillStyle = depot ? '#f8e1b7' : '#f5f7ef';
        ctx.beginPath(); ctx.arc(p.x, p.y, depot ? 8 : cities.length > 100 ? 3.5 : 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = depot ? '#bc813b' : '#527966';
        ctx.beginPath(); ctx.arc(p.x, p.y, depot ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
      });
      for (const label of labels) {
        const p = points[label.id], { x, y, w, h } = label;
        const anchorX = p.x < x ? x : x + w, anchorY = Math.max(y + 8, Math.min(y + h - 8, p.y));
        line(ctx, [[p.x, p.y], [anchorX, anchorY]], '#a9b9a0');
        ctx.textAlign = 'center'; ctx.fillStyle = '#374e43'; ctx.font = `${label.landmark ? '600' : '400'} ${label.fontSize}px system-ui`;
        ctx.strokeStyle = outlines.length ? '#f2f5ee' : '#e7eddf';
        ctx.lineWidth = 3;
        ctx.strokeText(cities[label.id].name, x + w / 2, y + 13);
        ctx.fillText(cities[label.id].name, x + w / 2, y + 13);
        if (label.landmark) {
          landmark(ctx, label.landmark.type, x + w / 2, y + 29, label.fontSize === 10 ? .5 : .55);
        }
      }
      ctx.textAlign = 'left';
      drawTruck(ctx, position, cab);
    },
  };
}
