/* Game rules, actor movement, learning cycle, levels and effects. */

let walls = new Uint8Array(N_TILES);
let doors = new Uint8Array(N_TILES);
let pellets = new Set();
let powerPellets = new Set();
let heat = new Float32Array(N_TILES);
let scent = new Float32Array(N_TILES);
let experience = 0;
let familiarity = 0;
let scentDirty = true;

const pac = {
  c: PAC_START.c,
  r: PAC_START.r,
  dir: { x: -1, y: 0 },
  want: { x: -1, y: 0 },
  progress: 0,
  moving: false,
};

let ghosts = [];

const G = {
  mode: "title",
  prevMode: "playing",
  time: 0,
  score: 0,
  high: 0,
  level: 1,
  lives: 3,
  readyTimer: 0,
  deathTimer: 0,
  levelTimer: 0,
  pelletsLeft: 0,
  eaten: 0,
  frightTimer: 0,
  ghostChain: 0,
  globalMode: "scatter",
  modePlan: [],
  modeIndex: 0,
  modeTimer: 0,
  memoryVisible: false,
  particles: [],
  floaters: [],
  fruit: null,
  shardsSpawned: 0,
  heatClock: 0,
  scentClock: 0,
  tiltOn: false,
  highDirty: false,
};

const SHARD_TILES = [
  { c: 13, r: 17 },
  { c: 1, r: 5 },
  { c: 26, r: 26 },
];
const SHARD_THRESHOLDS = [55, 140, 220];

function parseMazeFlags() {
  walls = new Uint8Array(N_TILES);
  doors = new Uint8Array(N_TILES);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c];
      if (ch === "#") walls[tileKey(c, r)] = 1;
      if (ch === "-") doors[tileKey(c, r)] = 1;
    }
  }
}

function placePellets() {
  pellets = new Set();
  powerPellets = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c];
      if (ch === ".") pellets.add(tileKey(c, r));
      if (ch === "o") powerPellets.add(tileKey(c, r));
    }
  }
  G.pelletsLeft = pellets.size + powerPellets.size;
}

function makeGhosts() {
  ghosts = GHOST_DEFS.map((def, index) => ({
    id: def.id,
    name: def.name,
    color: def.color,
    corner: { ...def.corner },
    memory: def.memory,
    c: def.start.c,
    r: def.start.r,
    dir: { ...def.dir },
    progress: 0,
    moving: def.outside,
    state: def.outside ? "active" : "house",
    releaseTimer: Math.max(0.4, def.release - (G.level - 1) * 0.28),
    phase: index * 1.73,
  }));
}

function makeModePlan() {
  const factor = Math.max(0.5, 1 - (G.level - 1) * 0.045);
  return [
    { mode: "scatter", dur: 6 * factor },
    { mode: "chase", dur: 18 },
    { mode: "scatter", dur: 5 * factor },
    { mode: "chase", dur: 20 },
    { mode: "scatter", dur: 4 * factor },
    { mode: "chase", dur: Infinity },
  ];
}

function resetModes() {
  G.modePlan = makeModePlan();
  G.modeIndex = 0;
  G.globalMode = "scatter";
  G.modeTimer = G.modePlan[0].dur;
}

function resetActors() {
  pac.c = PAC_START.c;
  pac.r = PAC_START.r;
  pac.dir = { x: -1, y: 0 };
  pac.want = { x: 0, y: 0 };
  pac.progress = 0;
  pac.moving = false;
  makeGhosts();
  resetModes();
  G.frightTimer = 0;
  G.ghostChain = 0;
  G.fruit = null;
}

function startLevel() {
  placePellets();
  G.eaten = 0;
  G.shardsSpawned = 0;
  resetActors();
  G.mode = "ready";
  G.readyTimer = G.level === 1 ? 2.2 : 2.0;
  updateHUD(true);
}

function startRun() {
  G.score = 0;
  G.level = 1;
  G.lives = 3;
  G.particles = [];
  G.floaters = [];
  experience = 0;
  familiarity = 0;
  heat.fill(0);
  scent.fill(0);
  scentDirty = false;
  startLevel();
  Sound.start();
}

function bootEngine() {
  parseMazeFlags();
  placePellets();
  resetActors();
  G.mode = "title";
  G.readyTimer = 0;
  try {
    G.high = Number(localStorage.getItem("pacMemoryHigh")) || 0;
  } catch (_) {
    G.high = 0;
  }
  recomputeScent();
}

function saveHigh() {
  try {
    localStorage.setItem("pacMemoryHigh", String(G.high));
  } catch (_) {}
}

function reverseEntity(entity) {
  if (!entity.moving) {
    entity.dir = { x: -entity.dir.x, y: -entity.dir.y };
    return;
  }
  if (entity.progress > 0.0001) {
    entity.c = wrapCol(entity.c + entity.dir.x);
    entity.r += entity.dir.y;
    entity.progress = 1 - entity.progress;
    entity.dir = { x: -entity.dir.x, y: -entity.dir.y };
  } else {
    entity.dir = { x: -entity.dir.x, y: -entity.dir.y };
  }
}

function setPacDirection(dir) {
  pac.want = { x: dir.x, y: dir.y };
  if (G.mode !== "playing") return;
  if (!pac.moving) {
    if (stepIsOpen(pac.c, pac.r, dir, false)) {
      pac.dir = { x: dir.x, y: dir.y };
      pac.moving = true;
    }
    return;
  }
  if (dir.x === -pac.dir.x && dir.y === -pac.dir.y && pac.progress > 0.0001) {
    reverseEntity(pac);
    return;
  }
  if (pac.progress < 0.001 && stepIsOpen(pac.c, pac.r, dir, false)) {
    pac.dir = { x: dir.x, y: dir.y };
  }
}

function advanceEntity(entity, speed, dt, onEnter) {
  if (!entity.moving) return;
  let remaining = speed * dt;
  let guard = 0;
  while (remaining > 0 && entity.moving && guard++ < 40) {
    const step = Math.min(remaining, 1 - entity.progress);
    entity.progress += step;
    remaining -= step;
    if (entity.progress >= 1 - 1e-9) {
      entity.c = wrapCol(entity.c + entity.dir.x);
      entity.r += entity.dir.y;
      entity.progress = 0;
      onEnter(entity);
    }
  }
}

function pacEnterTile() {
  recordPacTile(pac.c, pac.r);
  consumeAt(pac.c, pac.r);
  if (G.mode !== "playing") return;

  if (stepIsOpen(pac.c, pac.r, pac.want, false)) {
    pac.dir = { x: pac.want.x, y: pac.want.y };
  }
  if (!stepIsOpen(pac.c, pac.r, pac.dir, false)) {
    pac.moving = false;
    pac.progress = 0;
  }
}

function consumeAt(c, r) {
  const key = tileKey(c, r);
  let ate = false;

  if (pellets.has(key)) {
    pellets.delete(key);
    G.score += 10;
    G.eaten++;
    G.pelletsLeft--;
    ate = true;
    Sound.pellet();
  } else if (powerPellets.has(key)) {
    powerPellets.delete(key);
    G.score += 50;
    G.eaten++;
    G.pelletsLeft--;
    ate = true;
    triggerFright();
    Sound.power();
  }

  if (ate) {
    updateHUD();
    maybeSpawnShard();
    if (G.pelletsLeft <= 0) levelClear();
  }

  if (G.fruit && G.fruit.c === c && G.fruit.r === r) collectShard();
}

function maybeSpawnShard() {
  if (G.shardsSpawned >= SHARD_THRESHOLDS.length) return;
  if (G.eaten < SHARD_THRESHOLDS[G.shardsSpawned]) return;
  const spot = SHARD_TILES[G.shardsSpawned];
  G.shardsSpawned++;
  G.fruit = { c: spot.c, r: spot.r, timer: 9.5 };
  if (typeof notify === "function") notify("MEMORY SHARD DETECTED");
}

function collectShard() {
  if (!G.fruit) return;
  const points = 150 * G.level;
  const x = G.fruit.c + 0.5;
  const y = G.fruit.r + 0.5;
  G.score += points;
  G.fruit = null;
  spawnBurst(x, y, "#4ff0ff", 16, 3.2);
  addFloater(x, y - 0.3, `+${points}`, "#4ff0ff");
  if (typeof notify === "function") notify(`MEMORY SHARD +${points}`);
  Sound.shard();
  updateHUD();
}

function triggerFright() {
  G.frightTimer = Math.max(2.4, 7.4 - (G.level - 1) * 0.42);
  G.ghostChain = 0;
  for (const g of ghosts) {
    if (g.state === "active" && g.moving) reverseEntity(g);
  }
}

function ghostSpeed(g) {
  if (g.state === "eyes") return 12;
  if (g.state === "leaving") return 5.2;
  if (G.frightTimer > 0) return 3.7 + Math.min(0.6, (G.level - 1) * 0.04);
  let speed = 5.5 + Math.min(1.4, (G.level - 1) * 0.13);
  if (g.r === TUNNEL_ROW && (g.c < 6 || g.c > 21)) speed *= 0.72;
  return speed;
}

function ghostEnterTile(g) {
  if (g.state === "leaving" && g.c === GHOST_EXIT.c && g.r === GHOST_EXIT.r) {
    g.state = "active";
  }
  if (g.state === "eyes" && g.c === GHOST_HOME.c && g.r === GHOST_HOME.r) {
    g.state = "house";
    g.moving = false;
    g.progress = 0;
    g.dir = { x: 0, y: -1 };
    g.releaseTimer = 1.2;
    return;
  }
  if (!chooseGhostDirection(g)) {
    g.moving = false;
  }
}

function updateFright(dt) {
  if (G.frightTimer <= 0) return;
  G.frightTimer -= dt;
  if (G.frightTimer < 0) G.frightTimer = 0;
}

function updateModeCycle(dt) {
  if (G.frightTimer > 0) return;
  const current = G.modePlan[G.modeIndex];
  if (!current || !isFinite(current.dur)) return;
  G.modeTimer -= dt;
  if (G.modeTimer > 0) return;
  if (G.modeIndex < G.modePlan.length - 1) {
    G.modeIndex++;
    const next = G.modePlan[G.modeIndex];
    G.globalMode = next.mode;
    G.modeTimer = next.dur;
    for (const g of ghosts) {
      if (g.state === "active" && g.moving) reverseEntity(g);
    }
  }
}

function updateLearningClock(dt) {
  G.heatClock += dt;
  if (G.heatClock >= 1) {
    G.heatClock = 0;
    for (let i = 0; i < N_TILES; i++) heat[i] *= 0.985;
    scentDirty = true;
  }
  G.scentClock += dt;
  if (scentDirty && G.scentClock >= 0.35) {
    G.scentClock = 0;
    scentDirty = false;
    recomputeScent();
  }
}

function updatePlaying(dt) {
  updateFright(dt);
  updateModeCycle(dt);
  updateLearningClock(dt);

  if (G.fruit) {
    G.fruit.timer -= dt;
    if (G.fruit.timer <= 0) G.fruit = null;
  }

  for (const g of ghosts) {
    if (g.state === "house") {
      g.releaseTimer -= dt;
      if (g.releaseTimer <= 0) {
        g.state = "leaving";
        g.moving = true;
        if (!chooseGhostDirection(g)) g.moving = false;
      }
    }
  }

  advanceEntity(pac, 6.4 + Math.min(0.7, (G.level - 1) * 0.07), dt, pacEnterTile);
  if (G.mode !== "playing") return;

  for (const g of ghosts) {
    if (g.state === "house" || !g.moving) continue;
    advanceEntity(g, ghostSpeed(g), dt, ghostEnterTile);
  }

  checkCollisions();
}

function checkCollisions() {
  if (G.mode !== "playing") return;
  const pp = entityPos(pac);
  for (const g of ghosts) {
    if (g.state !== "active") continue;
    const gp = entityPos(g);
    let dx = Math.abs(gp.x - pp.x);
    dx = Math.min(dx, COLS - dx);
    const dy = Math.abs(gp.y - pp.y);
    if (Math.hypot(dx, dy) > 0.66) continue;
    if (G.frightTimer > 0) {
      eatGhost(g);
    } else {
      pacDie();
      return;
    }
  }
}

function eatGhost(g) {
  const points = 200 * Math.pow(2, Math.min(3, G.ghostChain));
  G.ghostChain++;
  G.score += points;
  const pos = entityPos(g);
  spawnBurst(pos.x, pos.y, "#8ecbff", 18, 3.6);
  addFloater(pos.x, pos.y - 0.4, `+${points}`, "#9fe7ff");
  Sound.ghost();
  if (navigator.vibrate) navigator.vibrate(18);
  g.state = "eyes";
  g.moving = true;
  updateHUD();
}

function pacDie() {
  G.mode = "dying";
  G.prevMode = "dying";
  G.deathTimer = 1.55;
  pac.moving = false;
  G.frightTimer = 0;
  const pos = entityPos(pac);
  spawnBurst(pos.x, pos.y, "#ffe14a", 22, 4);
  Sound.death();
  if (navigator.vibrate) navigator.vibrate([40, 40, 80]);
}

function finishDeath() {
  G.lives--;
  if (G.lives <= 0) {
    G.high = Math.max(G.high, G.score);
    saveHigh();
    G.mode = "gameover";
    updateHUD(true);
    if (typeof showGameOver === "function") showGameOver();
    return;
  }
  resetActors();
  G.mode = "ready";
  G.readyTimer = 1.7;
  updateHUD(true);
}

function levelClear() {
  if (G.mode !== "playing") return;
  const bonus = 500 + G.level * 100;
  G.score += bonus;
  G.mode = "levelclear";
  G.levelTimer = 2.8;
  pac.moving = false;
  G.frightTimer = 0;
  addFloater(COLS / 2, 12.4, `+${bonus}`, "#ffdf3d");
  Sound.level();
  updateHUD(true);
  saveHigh();
}

function finishLevel() {
  G.level++;
  let extraLife = false;
  if (G.level % 3 === 0 && G.lives < 5) {
    G.lives++;
    extraLife = true;
  }
  experience *= 0.58;
  for (let i = 0; i < N_TILES; i++) heat[i] *= 0.52;
  familiarity = 1 - Math.exp(-experience / 64);
  scentDirty = true;
  recomputeScent();
  startLevel();
  if (extraLife) {
    Sound.extraLife();
    if (typeof notify === "function") notify("EXTRA LIFE — THE MAZE GROWS HUNGRY");
  }
}

function beginPlaying() {
  G.mode = "playing";
  if (G.modePlan.length && G.modePlan[0]) {
    G.globalMode = G.modePlan[G.modeIndex].mode;
  }
  const hasInput = pac.want.x !== 0 || pac.want.y !== 0;
  if (hasInput && stepIsOpen(pac.c, pac.r, pac.want, false)) {
    pac.dir = { x: pac.want.x, y: pac.want.y };
  }
  pac.moving = hasInput && stepIsOpen(pac.c, pac.r, pac.dir, false);
}

function updateGame(dt) {
  if (G.mode === "title" || G.mode === "paused" || G.mode === "gameover") return;

  if (G.mode === "playing") {
    updatePlaying(dt);
    return;
  }

  if (G.mode === "ready") {
    G.readyTimer -= dt;
    if (G.readyTimer <= 0) {
      G.readyTimer = 0;
      beginPlaying();
    }
    return;
  }

  if (G.mode === "dying") {
    G.deathTimer -= dt;
    if (G.deathTimer <= 0) finishDeath();
    return;
  }

  if (G.mode === "levelclear") {
    G.levelTimer -= dt;
    if (G.levelTimer <= 0) finishLevel();
  }
}

function updateEffects(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
  }
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.life -= dt;
    if (f.life <= 0) {
      G.floaters.splice(i, 1);
      continue;
    }
    f.y -= dt * 0.85;
  }
}

function spawnBurst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.25 + Math.random() * 0.75);
    G.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.55,
      maxLife: 0.9,
      size: 0.035 + Math.random() * 0.05,
      color,
    });
  }
}

function addFloater(x, y, text, color) {
  G.floaters.push({ x, y, text, color, life: 1.15 });
}

function pauseGame() {
  if (G.mode !== "playing" && G.mode !== "ready" && G.mode !== "levelclear") return false;
  G.prevMode = G.mode;
  G.mode = "paused";
  return true;
}

function resumeGame() {
  if (G.mode !== "paused") return;
  G.mode = G.prevMode || "playing";
}

function endRunToTitle() {
  G.mode = "title";
  G.prevMode = "title";
  G.particles = [];
  G.floaters = [];
  G.readyTimer = 0;
  resetActors();
}
