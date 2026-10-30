/* Grid queries, pathfinding, and the ghosts' route-learning brain. */

const N_TILES = COLS * ROWS;
const DIR_LIST = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
];

const scentTmpA = new Float32Array(N_TILES);
const scentTmpB = new Float32Array(N_TILES);
let scentMax = 1;

function passable(c, r, allowDoor = false) {
  if (r < 0 || r >= ROWS) return false;
  c = wrapCol(c);
  const idx = tileKey(c, r);
  if (walls[idx]) return false;
  if (doors[idx]) return allowDoor;
  return true;
}

function neighborTile(c, r, dir) {
  return { c: wrapCol(c + dir.x), r: r + dir.y };
}

function stepIsOpen(c, r, dir, allowDoor = false) {
  const n = neighborTile(c, r, dir);
  return passable(n.c, n.r, allowDoor) ? n : null;
}

function nearestOpen(c, r, allowDoor = false) {
  c = wrapCol(c);
  r = Math.max(0, Math.min(ROWS - 1, r));
  if (passable(c, r, allowDoor)) return { c, r };
  for (let radius = 1; radius <= 6; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const nc = wrapCol(c + dx);
        const nr = r + dy;
        if (passable(nc, nr, allowDoor)) return { c: nc, r: nr };
      }
    }
  }
  return { c: PAC_START.c, r: PAC_START.r };
}

function bfsDistances(startC, startR, allowDoor = false) {
  const dist = new Int16Array(N_TILES);
  dist.fill(-1);
  const start = nearestOpen(startC, startR, allowDoor);
  const queue = new Int16Array(N_TILES);
  let head = 0;
  let tail = 0;
  const startIdx = tileKey(start.c, start.r);
  dist[startIdx] = 0;
  queue[tail++] = startIdx;
  while (head < tail) {
    const idx = queue[head++];
    const c = idx % COLS;
    const r = (idx - c) / COLS;
    const d = dist[idx];
    for (const dir of DIR_LIST) {
      const n = stepIsOpen(c, r, dir, allowDoor);
      if (!n) continue;
      const nIdx = tileKey(n.c, n.r);
      if (dist[nIdx] !== -1) continue;
      dist[nIdx] = d + 1;
      queue[tail++] = nIdx;
    }
  }
  return dist;
}

function nearestGhostTarget(g) {
  if (G.globalMode === "scatter") return g.corner;

  const pc = pac.c;
  const pr = pac.r;
  let c = pc;
  let r = pr;

  if (g.id === "pinky") {
    c = pc + pac.dir.x * 4;
    r = pr + pac.dir.y * 4;
  } else if (g.id === "inky") {
    const blinky = ghosts[0];
    const aheadC = pc + pac.dir.x * 2;
    const aheadR = pr + pac.dir.y * 2;
    c = aheadC * 2 - blinky.c;
    r = aheadR * 2 - blinky.r;
  } else if (g.id === "clyde") {
    const dx = Math.abs(pc - g.c);
    const dy = Math.abs(pr - g.r);
    if (Math.hypot(dx, dy) <= 7) {
      c = g.corner.c;
      r = g.corner.r;
    }
  }

  return nearestOpen(c, r, false);
}

function memoryWeightFor(g) {
  if (G.globalMode !== "chase") return 0;
  const base = 0.18 + familiarity * 0.66 + Math.min(0.35, (G.level - 1) * 0.035);
  return base * g.memory * 5.2;
}

function chooseGhostDirection(g) {
  const allowDoor = g.state === "leaving" || g.state === "eyes";
  const reverse = { x: -g.dir.x, y: -g.dir.y };
  let options = [];

  for (const dir of DIR_LIST) {
    if (dir.x === reverse.x && dir.y === reverse.y) continue;
    if (stepIsOpen(g.c, g.r, dir, allowDoor)) options.push(dir);
  }
  if (!options.length && stepIsOpen(g.c, g.r, reverse, allowDoor)) options = [reverse];
  if (!options.length) return false;

  let field = null;
  let fleeField = null;
  let weight = 0;

  if (g.state === "leaving") {
    field = bfsDistances(GHOST_EXIT.c, GHOST_EXIT.r, true);
  } else if (g.state === "eyes") {
    field = bfsDistances(GHOST_HOME.c, GHOST_HOME.r, true);
  } else if (G.frightTimer > 0) {
    fleeField = bfsDistances(pac.c, pac.r, false);
  } else {
    const target = nearestGhostTarget(g);
    field = bfsDistances(target.c, target.r, false);
    weight = memoryWeightFor(g);
  }

  let best = null;
  let bestScore = -Infinity;

  for (const dir of options) {
    const n = neighborTile(g.c, g.r, dir);
    const idx = tileKey(n.c, n.r);
    let score;

    if (fleeField) {
      const d = fleeField[idx];
      score = (d < 0 ? 0 : d) + Math.random() * 1.8;
    } else {
      const d = field[idx];
      const distanceScore = d < 0 ? -999 : -d;
      const lure = weight > 0 ? scent[idx] * weight : 0;
      score = distanceScore + lure + Math.random() * 0.18;
    }

    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }

  g.dir = best;
  return true;
}

function boxBlur(src, dst, radius) {
  const window = radius * 2 + 1;
  const horizontal = scentTmpA;
  for (let r = 0; r < ROWS; r++) {
    let sum = 0;
    for (let c = -radius; c <= radius; c++) {
      sum += src[r * COLS + wrapCol(c)];
    }
    for (let c = 0; c < COLS; c++) {
      horizontal[r * COLS + c] = sum / window;
      sum -= src[r * COLS + wrapCol(c - radius)];
      sum += src[r * COLS + wrapCol(c + radius + 1)];
    }
  }
  for (let c = 0; c < COLS; c++) {
    let sum = 0;
    for (let r = -radius; r <= radius; r++) {
      sum += horizontal[Math.max(0, Math.min(ROWS - 1, r)) * COLS + c];
    }
    for (let r = 0; r < ROWS; r++) {
      dst[r * COLS + c] = sum / window;
      sum -= horizontal[Math.max(0, Math.min(ROWS - 1, r - radius)) * COLS + c];
      sum += horizontal[Math.min(ROWS - 1, r + radius + 1) * COLS + c];
    }
  }
}

function recomputeScent() {
  let src = heat;
  let dst = scentTmpB;
  boxBlur(src, dst, 2);
  src = dst;
  dst = scent;
  boxBlur(src, dst, 2);
  scentMax = 0;
  for (let i = 0; i < N_TILES; i++) {
    if (scent[i] > scentMax) scentMax = scent[i];
  }
  const inv = scentMax > 0 ? 1 / scentMax : 0;
  for (let i = 0; i < N_TILES; i++) {
    scent[i] = Math.pow(scent[i] * inv, 0.78);
  }
}

function recordPacTile(c, r) {
  const idx = tileKey(c, r);
  const fresh = heat[idx] < 0.45;
  heat[idx] += 1;
  experience += fresh ? 1 : 0.42;
  familiarity = 1 - Math.exp(-experience / 64);
  scentDirty = true;
}
