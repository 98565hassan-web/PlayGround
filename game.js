(() => {
  "use strict";

  const COLS = 21;
  const ROWS = 22;
  const TUNNEL_ROW = 10;
  const HERO_START = { c: 10, r: 16 };
  const HOUSE_DOOR = { c: 10, r: 9 };
  const HOUSE_EXIT = { c: 10, r: 8 };
  const HOUSE_HOME = { c: 10, r: 10 };
  const STORAGE = { best: "memoryMaze.best", mute: "memoryMaze.mute" };

  const BASE_MAZE = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#o###.###.#.###.###o#",
    "#...................#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "    #.#.......#.#    ",
    "#####.#.##=##.#.#####",
    "......  #   #  ......",
    "#####.#.#####.#.#####",
    "    #.#.......#.#    ",
    "#####.#.#####.#.#####",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#o..#...........#..o#",
    "###.#.#.#####.#.#.###",
    "#.....#...#...#.....#",
    "#.#######.#.#######.#",
    "#...................#",
    "#####################",
  ];

  const DIRS = {
    up: { x: 0, y: -1, name: "up", angle: -Math.PI / 2 },
    left: { x: -1, y: 0, name: "left", angle: Math.PI },
    down: { x: 0, y: 1, name: "down", angle: Math.PI / 2 },
    right: { x: 1, y: 0, name: "right", angle: 0 },
    none: { x: 0, y: 0, name: "none", angle: 0 },
  };
  const DIR_LIST = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];

  const GHOST_DEFS = [
    {
      id: "blinky",
      name: "Blinky",
      role: "The Chaser",
      color: "#ff526e",
      light: "#ff9aa8",
      start: { x: 10.5, y: 8.5 },
      house: false,
      release: 0,
      learn: 1.18,
      corner: { c: 19, r: 1 },
    },
    {
      id: "pinky",
      name: "Pinky",
      role: "The Ambusher",
      color: "#ff5bd8",
      light: "#ffb1ee",
      start: { x: 10.5, y: 10.5 },
      house: true,
      release: 1.6,
      learn: 1.04,
      corner: { c: 1, r: 1 },
    },
    {
      id: "inky",
      name: "Inky",
      role: "The Flanker",
      color: "#56edff",
      light: "#b7fbff",
      start: { x: 9.5, y: 10.5 },
      house: true,
      release: 3.2,
      learn: 0.86,
      corner: { c: 19, r: 20 },
    },
    {
      id: "clyde",
      name: "Clyde",
      role: "The Wildcard",
      color: "#ffb34f",
      light: "#ffdca5",
      start: { x: 11.5, y: 10.5 },
      house: true,
      release: 4.8,
      learn: 0.7,
      corner: { c: 1, r: 20 },
    },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const dom = {
    score: document.getElementById("score"),
    best: document.getElementById("best"),
    level: document.getElementById("level"),
    lives: document.getElementById("lives"),
    memoryPct: document.getElementById("memoryPct"),
    memoryFill: document.getElementById("memoryFill"),
    memoryChip: document.getElementById("memoryChip"),
    memoryBtn: document.getElementById("memoryBtn"),
    sideMemory: document.getElementById("sideMemory"),
    sideMemoryFill: document.getElementById("sideMemoryFill"),
    sideMemoryBtn: document.getElementById("sideMemoryBtn"),
    memoryLevel: document.getElementById("memoryLevel"),
    tileCount: document.getElementById("tileCount"),
    mobileMemory: document.getElementById("mobileMemory"),
    mobileMemoryFill: document.getElementById("mobileMemoryFill"),
    mobileIntelNote: document.getElementById("mobileIntelNote"),
    statusText: document.getElementById("statusText"),
    liveDot: document.getElementById("liveDot"),
    roundStatus: document.querySelector(".round-status"),
    ghostList: document.getElementById("ghostList"),
    startScreen: document.getElementById("startScreen"),
    levelScreen: document.getElementById("levelScreen"),
    endScreen: document.getElementById("endScreen"),
    pauseScreen: document.getElementById("pauseScreen"),
    levelNumber: document.getElementById("levelNumber"),
    levelMemory: document.getElementById("levelMemory"),
    levelThreat: document.getElementById("levelThreat"),
    levelCopy: document.getElementById("levelCopy"),
    nextLevelLabel: document.getElementById("nextLevelLabel"),
    endMemory: document.getElementById("endMemory"),
    endScore: document.getElementById("endScore"),
    newBest: document.getElementById("newBest"),
    startBtn: document.getElementById("startBtn"),
    nextBtn: document.getElementById("nextBtn"),
    restartBtn: document.getElementById("restartBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    soundBtn: document.getElementById("soundBtn"),
    tiltBtn: document.getElementById("tiltBtn"),
    tiltState: document.getElementById("tiltState"),
    swipeArea: document.getElementById("swipeArea"),
    touchDeck: document.getElementById("touchDeck"),
    toast: document.getElementById("toast"),
    brandHome: document.getElementById("brandHome"),
  };
  const ghostRows = {};
  if (dom.ghostList) {
    dom.ghostList.querySelectorAll(".ghost-row").forEach((row) => {
      ghostRows[row.dataset.ghost] = {
        row,
        meter: row.querySelector(".ghost-meter i"),
        rate: row.querySelector(".ghost-rate"),
      };
    });
  }

  const view = { w: 0, h: 0, tile: 24, ox: 0, oy: 0, dpr: 1 };
  let mazeTexture = null;
  let pellets = [];
  let pelletTotal = 0;
  let pelletsLeft = 0;
  let zone = [];
  let floorTiles = 0;
  const stars = [];
  const effects = { particles: [], scores: [] };

  const game = {
    state: "start",
    previousState: "playing",
    level: 1,
    score: 0,
    best: 0,
    lives: 3,
    time: 0,
    readyTimer: 0,
    frightTimer: 0,
    ghostCombo: 0,
    deathTimer: 0,
    shake: 0,
    flash: 0,
    mode: "scatter",
    modeTimer: 4,
    modePhase: 0,
    pac: null,
    ghosts: [],
    showMemory: false,
    lastHud: 0,
  };

  const memory = {
    longTerm: new Float32Array(COLS * ROWS),
    current: new Float32Array(COLS * ROWS),
    max: 1,
    lastTile: -1,
    trailCount: 0,
  };

  const input = {
    desired: null,
    lastDir: DIRS.left,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pad(value, size) {
    return String(value).padStart(size, "0");
  }

  function mod(value, size) {
    return ((value % size) + size) % size;
  }

  function idx(c, r) {
    return r * COLS + c;
  }

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      /* storage can be unavailable in private mode */
    }
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function opposite(a, b) {
    return Boolean(a && b && a.x === -b.x && a.y === -b.y && (a.x || a.y));
  }

  class AudioEngine {
    constructor() {
      this.context = null;
      this.muted = readStorage(STORAGE.mute, "0") === "1";
      this.munchToggle = false;
    }

    init() {
      if (!this.context) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
          this.context = new AudioCtor();
        } catch (error) {
          this.context = null;
        }
      }
      if (this.context && this.context.state === "suspended") {
        this.context.resume().catch(() => {});
      }
    }

    setMuted(muted) {
      this.muted = muted;
      writeStorage(STORAGE.mute, muted ? "1" : "0");
      if (dom.soundBtn) {
        dom.soundBtn.classList.toggle("is-muted", muted);
        dom.soundBtn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
      }
    }

    tone(freq, duration, type = "sine", volume = 0.025, slide = 0, delay = 0) {
      if (this.muted) return;
      this.init();
      const audio = this.context;
      if (!audio) return;
      const start = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freq), start);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    munch() {
      this.munchToggle = !this.munchToggle;
      this.tone(this.munchToggle ? 380 : 285, 0.045, "square", 0.012, 90);
    }

    power() {
      [220, 330, 440, 660].forEach((freq, i) => {
        this.tone(freq, 0.16, "triangle", 0.03, 60, i * 0.055);
      });
    }

    ghostEaten() {
      [520, 690, 880].forEach((freq, i) => {
        this.tone(freq, 0.11, "square", 0.024, 180, i * 0.045);
      });
    }

    death() {
      this.tone(510, 0.75, "sawtooth", 0.045, -460);
      this.tone(260, 0.9, "triangle", 0.035, -170, 0.08);
    }

    levelUp() {
      [392, 523, 659, 784].forEach((freq, i) => {
        this.tone(freq, 0.22, "triangle", 0.03, 0, i * 0.095);
      });
    }

    start() {
      this.tone(330, 0.12, "square", 0.018, 120);
      this.tone(494, 0.18, "triangle", 0.024, 80, 0.11);
    }
  }

  const audio = new AudioEngine();

  function buildZones() {
    zone = BASE_MAZE.map((row) =>
      row.split("").map((ch) => (ch === "#" ? "wall" : "void")),
    );
    const queue = [[HERO_START.c, HERO_START.r]];
    zone[HERO_START.r][HERO_START.c] = "floor";
    while (queue.length) {
      const [c, r] = queue.shift();
      for (const dir of DIR_LIST) {
        let nc = c + dir.x;
        const nr = r + dir.y;
        if (nr < 0 || nr >= ROWS) continue;
        if (nc < 0 || nc >= COLS) {
          if (r !== TUNNEL_ROW) continue;
          nc = mod(nc, COLS);
        }
        if (zone[nr][nc] !== "void") continue;
        if (BASE_MAZE[nr][nc] === "#" || BASE_MAZE[nr][nc] === "=") continue;
        zone[nr][nc] = "floor";
        queue.push([nc, nr]);
      }
    }
    zone[HOUSE_DOOR.r][HOUSE_DOOR.c] = "house";
    for (let c = 9; c <= 11; c += 1) zone[HOUSE_HOME.r][c] = "house";
    floorTiles = 0;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (zone[r][c] === "floor") floorTiles += 1;
      }
    }
  }

  function createPellets() {
    pellets = BASE_MAZE.map((row) =>
      row.split("").map((ch) => (ch === "." || ch === "o" ? ch : "")),
    );
    pelletTotal = 0;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (pellets[r][c]) pelletTotal += 1;
      }
    }
    pelletsLeft = pelletTotal;
  }

  function wrapCol(c) {
    return mod(c, COLS);
  }

  function isWalkable(c, r, allowDoor = false) {
    if (r < 0 || r >= ROWS) return false;
    let col = c;
    if (col < 0 || col >= COLS) {
      if (r !== TUNNEL_ROW) return false;
      col = wrapCol(col);
    }
    const ch = BASE_MAZE[r][col];
    if (ch === "#") return false;
    if (ch === "=") return allowDoor;
    return true;
  }

  function canMove(c, r, dir, allowDoor = false) {
    if (!dir || (!dir.x && !dir.y)) return false;
    return isWalkable(c + dir.x, r + dir.y, allowDoor);
  }

  function bfsNextDir(startC, startR, targetC, targetR, allowDoor = false) {
    if (startC === targetC && startR === targetR) return null;
    const visited = new Uint8Array(COLS * ROWS);
    const queue = [];
    visited[idx(startC, startR)] = 1;
    for (const dir of DIR_LIST) {
      let nc = startC + dir.x;
      const nr = startR + dir.y;
      if (!isWalkable(nc, nr, allowDoor)) continue;
      nc = wrapCol(nc);
      const key = idx(nc, nr);
      if (visited[key]) continue;
      if (nc === targetC && nr === targetR) return dir;
      visited[key] = 1;
      queue.push({ c: nc, r: nr, first: dir });
    }
    let head = 0;
    while (head < queue.length) {
      const node = queue[head];
      head += 1;
      for (const dir of DIR_LIST) {
        let nc = node.c + dir.x;
        const nr = node.r + dir.y;
        if (!isWalkable(nc, nr, allowDoor)) continue;
        nc = wrapCol(nc);
        const key = idx(nc, nr);
        if (visited[key]) continue;
        if (nc === targetC && nr === targetR) return node.first;
        visited[key] = 1;
        queue.push({ c: nc, r: nr, first: node.first });
      }
    }
    return null;
  }

  function resetMemory() {
    memory.longTerm.fill(0);
    memory.current.fill(0);
    memory.max = 1;
    memory.lastTile = -1;
    memory.trailCount = 0;
  }

  function rememberTile(c, r) {
    const col = wrapCol(c);
    const key = idx(col, r);
    if (key === memory.lastTile) return;
    memory.lastTile = key;
    memory.current[key] += 1;
    memory.max = Math.max(memory.max, memory.current[key]);
    memory.trailCount += 1;
  }

  function memoryValueAt(c, r) {
    let col = c;
    if (col < 0 || col >= COLS) col = wrapCol(col);
    if (r < 0 || r >= ROWS) return 0;
    const key = idx(col, r);
    const live = memory.current[key] / memory.max;
    return clamp(memory.longTerm[key] * 0.92 + live * 0.58, 0, 1);
  }

  function bakeMemoryForNextLevel() {
    const max = Math.max(1, memory.max);
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (zone[r][c] !== "floor") continue;
        const key = idx(c, r);
        const fresh = memory.current[key] / max;
        memory.longTerm[key] = clamp(memory.longTerm[key] * 0.89 + fresh * 0.76, 0, 1);
      }
    }
    memory.current.fill(0);
    memory.max = 1;
    memory.lastTile = -1;
  }

  function getMemoryStats() {
    let known = 0;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (zone[r][c] === "floor" && memoryValueAt(c, r) > 0.035) known += 1;
      }
    }
    return {
      known,
      total: floorTiles,
      pct: floorTiles ? Math.round((known / floorTiles) * 100) : 0,
    };
  }

  function makePac() {
    return {
      x: HERO_START.c + 0.5,
      y: HERO_START.r + 0.5,
      dir: DIRS.left,
      lastDir: DIRS.left,
      speed: 5.82,
      mouthTime: 0,
      lastTile: -1,
    };
  }

  function makeGhosts() {
    return GHOST_DEFS.map((def, index) => ({
      ...def,
      x: def.start.x,
      y: def.start.y,
      dir: def.house ? DIRS.up : DIRS.left,
      state: def.house ? "house" : "active",
      house: def.house,
      frightened: false,
      releaseTimer: def.release,
      bob: index * 1.7,
      reverseQueued: false,
    }));
  }

  function resetRound() {
    game.pac = makePac();
    game.ghosts = makeGhosts();
    game.frightTimer = 0;
    game.ghostCombo = 0;
    game.mode = "scatter";
    game.modeTimer = 4.2;
    game.modePhase = 0;
    game.deathTimer = 0;
    game.shake = 0;
    game.flash = 0;
    game.state = "ready";
    game.readyTimer = 2.05;
    memory.lastTile = -1;
    input.desired = null;
    input.lastDir = DIRS.left;
    effects.particles.length = 0;
    effects.scores.length = 0;
    hideAllScreens();
    setStatus("THEY ARE WATCHING", "normal");
    updateHud(true);
  }

  function resetLevel() {
    createPellets();
    resetRound();
  }

  function newGame() {
    game.level = 1;
    game.score = 0;
    game.lives = 3;
    resetMemory();
    resetLevel();
    audio.start();
    updateHud(true);
  }

  function startFromTitle() {
    audio.init();
    newGame();
  }

  function hideAllScreens() {
    [dom.startScreen, dom.levelScreen, dom.endScreen, dom.pauseScreen].forEach((screen) => {
      if (screen) screen.classList.remove("is-active");
    });
  }

  function showScreen(screen) {
    hideAllScreens();
    if (screen) screen.classList.add("is-active");
  }

  function setStatus(text, type = "normal") {
    if (dom.statusText) dom.statusText.textContent = text;
    if (dom.roundStatus) {
      dom.roundStatus.classList.toggle("is-danger", type === "danger");
      dom.roundStatus.classList.toggle("is-fright", type === "fright");
    }
  }

  function toast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, 2600);
  }

  function updateHud(force = false) {
    const pct = getMemoryStats().pct;
    if (dom.score) dom.score.textContent = pad(game.score, 6);
    if (dom.best) dom.best.textContent = pad(game.best, 6);
    if (dom.level) dom.level.textContent = pad(game.level, 2);
    if (dom.memoryPct) dom.memoryPct.textContent = pct + "%";
    if (dom.memoryFill) dom.memoryFill.style.width = pct + "%";
    if (dom.sideMemory) dom.sideMemory.textContent = pct + "%";
    if (dom.sideMemoryFill) dom.sideMemoryFill.style.width = pct + "%";
    if (dom.mobileMemory) dom.mobileMemory.textContent = pct + "%";
    if (dom.mobileMemoryFill) dom.mobileMemoryFill.style.width = pct + "%";
    if (dom.memoryLevel) dom.memoryLevel.textContent = "LEVEL " + pad(game.level, 2);
    if (dom.mobileIntelNote) {
      const note = pct === 0
        ? "Four minds. One maze. They are watching."
        : pct < 24
          ? "They are tracing your usual turns."
          : pct < 48
            ? "Your route is becoming their map."
            : pct < 72
              ? "They know where you like to run."
              : "Almost no surprises left in your route.";
      dom.mobileIntelNote.textContent = note;
    }
    if (dom.tileCount) {
      const stats = getMemoryStats();
      dom.tileCount.textContent = stats.known + " / " + stats.total + " TILES";
    }
    if (dom.lives) {
      let html = "";
      for (let i = 0; i < 3; i += 1) {
        html += '<span class="pac-life' + (i < game.lives ? "" : " is-lost") + '"></span>';
      }
      dom.lives.innerHTML = html;
      dom.lives.setAttribute("aria-label", game.lives + (game.lives === 1 ? " life" : " lives"));
    }
    if (dom.memoryChip) dom.memoryChip.classList.toggle("is-active", game.showMemory);
    if (dom.memoryBtn) dom.memoryBtn.classList.toggle("is-active", game.showMemory);
    GHOST_DEFS.forEach((def) => {
      const row = ghostRows[def.id];
      if (!row) return;
      const rate = Math.min(100, Math.round(pct * def.learn));
      row.meter.style.width = rate + "%";
      row.rate.textContent = rate + "%";
    });
    if (force) {
      if (dom.pauseBtn) dom.pauseBtn.classList.toggle("is-paused", game.state === "paused");
    }
  }

  function saveBest() {
    if (game.score > game.best) {
      game.best = game.score;
      writeStorage(STORAGE.best, game.best);
    }
  }

  function addScore(amount) {
    game.score += amount;
    saveBest();
    updateHud();
  }

  function addParticles(x, y, color, count = 5, power = 1) {
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.8, 2.7) * power;
      effects.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomBetween(0.24, 0.58),
        maxLife: 0.58,
        size: randomBetween(0.04, 0.12),
        color,
      });
    }
  }

  function addFloatingScore(x, y, value, color = "#ffe35c") {
    effects.scores.push({ x, y, value, color, life: 0.9, maxLife: 0.9 });
  }

  function wrapActor(actor) {
    if (actor.x < -0.49) actor.x += COLS;
    else if (actor.x > COLS + 0.49) actor.x -= COLS;
  }

  function moveActor(actor, speed, dt, onCenter) {
    let remaining = speed * dt;
    let guard = 0;
    while (remaining > 0.000001 && guard < 16) {
      guard += 1;
      wrapActor(actor);
      const tx = Math.floor(actor.x);
      const ty = Math.floor(actor.y);
      const cx = tx + 0.5;
      const cy = ty + 0.5;
      const centered = Math.abs(actor.x - cx) < 0.0001 && Math.abs(actor.y - cy) < 0.0001;
      if (centered) {
        actor.x = cx;
        actor.y = cy;
        onCenter(actor, tx, ty);
      }
      const dir = actor.dir;
      if (!dir || (!dir.x && !dir.y)) break;
      let step;
      if (dir.x) {
        const nextCenter = dir.x > 0
          ? Math.floor(actor.x - 0.5) + 1.5
          : Math.ceil(actor.x - 0.5) - 0.5;
        step = Math.abs(nextCenter - actor.x);
        const amount = Math.min(step, remaining);
        actor.x += dir.x * amount;
        remaining -= amount;
      } else {
        const nextCenter = dir.y > 0
          ? Math.floor(actor.y - 0.5) + 1.5
          : Math.ceil(actor.y - 0.5) - 0.5;
        step = Math.abs(nextCenter - actor.y);
        const amount = Math.min(step, remaining);
        actor.y += dir.y * amount;
        remaining -= amount;
      }
      if (step < 0.000001) break;
    }
    wrapActor(actor);
  }

  function pacAtCenter(pac, c, r) {
    if (input.desired && canMove(c, r, input.desired, false)) {
      pac.dir = input.desired;
      pac.lastDir = input.desired;
      input.lastDir = input.desired;
      input.desired = null;
    } else if (!canMove(c, r, pac.dir, false)) {
      pac.dir = DIRS.none;
    }
    if (pac.dir && (pac.dir.x || pac.dir.y)) pac.lastDir = pac.dir;
  }

  function updatePac(dt) {
    const pac = game.pac;
    if (input.desired && opposite(pac.dir, input.desired)) {
      pac.dir = input.desired;
      pac.lastDir = input.desired;
      input.lastDir = input.desired;
    }
    moveActor(pac, pac.speed, dt, pacAtCenter);

    const c = wrapCol(Math.floor(pac.x));
    const r = clamp(Math.floor(pac.y), 0, ROWS - 1);
    const nearCenter = Math.abs(pac.x - (c + 0.5)) < 0.46 && Math.abs(pac.y - (r + 0.5)) < 0.46;
    if (nearCenter && zone[r] && zone[r][c] === "floor") {
      rememberTile(c, r);
      if (pellets[r][c]) consumePellet(c, r);
    }
    if (pac.dir && (pac.dir.x || pac.dir.y)) pac.mouthTime += dt * 11.5;
    else pac.mouthTime += dt * 2;
  }

  function consumePellet(c, r) {
    const pellet = pellets[r][c];
    if (!pellet) return;
    pellets[r][c] = "";
    pelletsLeft -= 1;
    if (pellet === "o") {
      addScore(50);
      game.frightTimer = Math.max(7.2, 7.8 - game.level * 0.06);
      game.ghostCombo = 0;
      game.flash = 0.36;
      game.shake = Math.max(game.shake, 0.2);
      game.ghosts.forEach((ghost) => {
        if (ghost.state === "active" || ghost.state === "leaving") {
          ghost.frightened = true;
          ghost.dir = {
            x: -ghost.dir.x,
            y: -ghost.dir.y,
            name: ghost.dir.name,
            angle: ghost.dir.angle + Math.PI,
          };
        }
      });
      addParticles(c + 0.5, r + 0.5, "#7cf6ff", 16, 1.5);
      addParticles(c + 0.5, r + 0.5, "#ffffff", 8, 1.1);
      audio.power();
      setStatus("POWER SURGE", "fright");
      toast("POWER PELLET — the hunters are blind. For now.");
    } else {
      addScore(10);
      addParticles(c + 0.5, r + 0.5, "#ffe35c", 3, 0.65);
      audio.munch();
    }
    if (pelletsLeft <= 0) {
      finishLevel();
    }
  }

  function ghostSpeed(ghost) {
    if (ghost.state === "eyes") return 9.4;
    if (ghost.state === "leaving") return 3.7;
    if (ghost.frightened) return 3.22 + Math.min(0.35, game.level * 0.018);
    let speed = 4.94 + Math.min(1.12, (game.level - 1) * 0.085);
    speed += Math.min(0.32, (game.cachedPct || 0) * 0.0032);
    if (ghost.id === "blinky") speed += 0.12;
    if (ghost.id === "clyde") speed -= 0.06;
    const c = wrapCol(Math.floor(ghost.x));
    const r = Math.floor(ghost.y);
    if (r === TUNNEL_ROW && (c <= 5 || c >= 15)) speed *= 0.84;
    return speed;
  }

  function ghostTarget(ghost) {
    const pac = game.pac;
    const pacC = wrapCol(Math.floor(pac.x));
    const pacR = clamp(Math.floor(pac.y), 0, ROWS - 1);
    const facing = pac.lastDir || DIRS.left;
    if (game.mode === "scatter") {
      const cycle = game.modePhase % 2 === 0 ? ghost.corner : {
        c: ghost.corner.c === 1 ? 1 : COLS - 2,
        r: ghost.corner.r === 1 ? 1 : ROWS - 2,
      };
      return { c: cycle.c, r: cycle.r };
    }
    if (ghost.id === "blinky") {
      return { c: pacC, r: pacR };
    }
    if (ghost.id === "pinky") {
      return { c: wrapCol(pacC + facing.x * 4), r: clamp(pacR + facing.y * 4, 0, ROWS - 1) };
    }
    if (ghost.id === "inky") {
      const blinky = game.ghosts.find((item) => item.id === "blinky");
      const aheadC = pacC + facing.x * 2;
      const aheadR = pacR + facing.y * 2;
      const blinkyC = blinky ? wrapCol(Math.floor(blinky.x)) : pacC;
      const blinkyR = blinky ? clamp(Math.floor(blinky.y), 0, ROWS - 1) : pacR;
      return {
        c: wrapCol(aheadC + (aheadC - blinkyC)),
        r: clamp(aheadR + (aheadR - blinkyR), 0, ROWS - 1),
      };
    }
    const distance = Math.hypot(pacC - ghost.x, pacR - ghost.y);
    if (distance > 7.5) return { c: pacC, r: pacR };
    return { c: ghost.corner.c, r: ghost.corner.r };
  }

  function ghostAtCenter(ghost, c, r) {
    if (ghost.state === "leaving") {
      if (c === HOUSE_EXIT.c && r === HOUSE_EXIT.r) {
        ghost.state = "active";
        ghost.house = false;
        const options = DIR_LIST.filter((dir) => canMove(c, r, dir, false));
        ghost.dir = options.length ? options[Math.floor(Math.random() * options.length)] : DIRS.left;
        return;
      }
      const next = bfsNextDir(c, r, HOUSE_EXIT.c, HOUSE_EXIT.r, true);
      if (next) ghost.dir = next;
      return;
    }

    if (ghost.state === "eyes") {
      if (c === HOUSE_HOME.c && r === HOUSE_HOME.r) {
        ghost.state = "house";
        ghost.house = true;
        ghost.releaseTimer = 1.15;
        ghost.frightened = false;
        ghost.dir = DIRS.up;
        return;
      }
      const next = bfsNextDir(c, r, HOUSE_HOME.c, HOUSE_HOME.r, true);
      if (next) ghost.dir = next;
      return;
    }

    chooseGhostDirection(ghost, c, r);
  }

  function chooseGhostDirection(ghost, c, r) {
    const options = DIR_LIST.filter(
      (dir) => canMove(c, r, dir, false) && !(opposite(dir, ghost.dir) && DIR_LIST.some((other) => other !== dir && canMove(c, r, other, false))),
    );
    const fallback = DIR_LIST.filter((dir) => canMove(c, r, dir, false));
    const legal = options.length ? options : fallback;
    if (!legal.length) {
      ghost.dir = DIRS.none;
      return;
    }

    if (ghost.frightened) {
      ghost.dir = legal[Math.floor(Math.random() * legal.length)];
      return;
    }

    const target = ghostTarget(ghost);
    let bestDir = legal[0];
    let bestScore = -Infinity;
    const memoryWeight = ghost.learn * (game.mode === "scatter" ? 4.6 : 9.4);

    legal.forEach((dir) => {
      let nc = c + dir.x;
      const nr = r + dir.y;
      if (nc < 0 || nc >= COLS) nc = wrapCol(nc);
      const distance = Math.hypot(nc - target.c, nr - target.r);
      const heat = memoryValueAt(nc, nr) + memoryValueAt(nc + dir.x, nr + dir.y) * 0.45;
      let score = -distance * 1.85 + heat * memoryWeight + Math.random() * 0.34;
      if (dir === ghost.dir) score += 0.18;
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    });
    ghost.dir = bestDir;
  }

  function updateGhost(ghost, dt) {
    if (ghost.state === "house") {
      ghost.releaseTimer -= dt;
      if (ghost.releaseTimer <= 0) {
        ghost.state = "leaving";
        ghost.dir = DIRS.up;
      }
      return;
    }
    moveActor(ghost, ghostSpeed(ghost), dt, ghostAtCenter);
  }

  function reverseGhosts() {
    game.ghosts.forEach((ghost) => {
      if (ghost.state === "active" && (ghost.dir.x || ghost.dir.y)) {
        ghost.dir = {
          x: -ghost.dir.x,
          y: -ghost.dir.y,
          name: ghost.dir.name,
          angle: ghost.dir.angle + Math.PI,
        };
      }
    });
  }

  function updateModes(dt) {
    if (game.frightTimer > 0) return;
    game.modeTimer -= dt;
    if (game.modeTimer > 0) return;
    game.modePhase += 1;
    if (game.mode === "scatter") {
      game.mode = "chase";
      game.modeTimer = 19 + Math.min(10, game.level * 1.5);
      setStatus("HUNT MODE", "danger");
    } else {
      game.mode = "scatter";
      game.modeTimer = 6.4;
      setStatus("SCATTER", "normal");
    }
    reverseGhosts();
  }

  function checkCollisions() {
    const pac = game.pac;
    for (const ghost of game.ghosts) {
      if (ghost.state === "eyes" || ghost.state === "house") continue;
      const distance = Math.hypot(pac.x - ghost.x, pac.y - ghost.y);
      if (distance > 0.68) continue;
      if (ghost.frightened) {
        eatGhost(ghost);
      } else {
        loseLife();
        return;
      }
    }
  }

  function eatGhost(ghost) {
    const points = 200 * Math.pow(2, Math.min(3, game.ghostCombo));
    game.ghostCombo += 1;
    addScore(points);
    addFloatingScore(ghost.x, ghost.y, points, ghost.color);
    addParticles(ghost.x, ghost.y, ghost.color, 18, 1.5);
    addParticles(ghost.x, ghost.y, "#ffffff", 7, 1.1);
    ghost.state = "eyes";
    ghost.frightened = false;
    ghost.house = false;
    ghost.dir = DIRS.up;
    game.shake = Math.max(game.shake, 0.22);
    audio.ghostEaten();
    setStatus("GHOST REVERSED", "fright");
  }

  function loseLife() {
    if (game.state !== "playing") return;
    game.state = "dying";
    game.deathTimer = 0;
    game.shake = 0.8;
    game.frightTimer = 0;
    game.ghosts.forEach((ghost) => {
      ghost.frightened = false;
    });
    addParticles(game.pac.x, game.pac.y, "#ffe35c", 26, 1.8);
    addParticles(game.pac.x, game.pac.y, "#ff8a68", 10, 1.2);
    addFloatingScore(game.pac.x, game.pac.y - 0.4, "OUCH", "#ff6d86");
    audio.death();
    setStatus("SIGNAL LOST", "danger");
    saveBest();
  }

  function updateDying(dt) {
    game.deathTimer += dt;
    if (game.deathTimer < 1.55) return;
    game.lives -= 1;
    updateHud();
    if (game.lives <= 0) {
      finishGame();
    } else {
      resetRound();
      toast(game.lives + (game.lives === 1 ? " life" : " lives") + " left. They kept your route.");
    }
  }

  function finishGame() {
    game.state = "gameover";
    saveBest();
    const stats = getMemoryStats();
    if (dom.endMemory) dom.endMemory.textContent = stats.pct + "%";
    if (dom.endScore) dom.endScore.textContent = pad(game.score, 6);
    if (dom.newBest) {
      dom.newBest.classList.toggle("is-hidden", game.score < game.best);
    }
    showScreen(dom.endScreen);
    setStatus("RUN TERMINATED", "danger");
    updateHud(true);
  }

  function finishLevel() {
    if (game.state !== "playing") return;
    game.state = "levelclear";
    const bonus = 700 + game.level * 125;
    addScore(bonus);
    bakeMemoryForNextLevel();
    const stats = getMemoryStats();
    game.cachedPct = stats.pct;
    if (dom.levelNumber) dom.levelNumber.textContent = pad(game.level + 1, 2);
    if (dom.levelMemory) dom.levelMemory.textContent = stats.pct + "%";
    if (dom.levelThreat) {
      const threat = Math.min(46, 8 + game.level * 5 + Math.round(stats.pct * 0.16));
      dom.levelThreat.textContent = "+" + threat + "%";
    }
    if (dom.levelCopy) {
      dom.levelCopy.textContent =
        "Eye-witness data confirmed. They memorized " + stats.pct + "% of the routes you use.";
    }
    if (dom.nextLevelLabel) dom.nextLevelLabel.textContent = pad(game.level + 1, 2);
    showScreen(dom.levelScreen);
    setStatus("PATTERN LOGGED", "fright");
    game.shake = Math.max(game.shake, 0.3);
    addParticles(game.pac.x, game.pac.y, "#5cf4ff", 26, 1.4);
    audio.levelUp();
    updateHud(true);
  }

  function nextLevel() {
    game.level += 1;
    resetLevel();
    audio.start();
    updateHud(true);
  }

  function updateEffects(dt) {
    for (let i = effects.particles.length - 1; i >= 0; i -= 1) {
      const particle = effects.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        effects.particles.splice(i, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.965;
      particle.vy *= 0.965;
    }
    for (let i = effects.scores.length - 1; i >= 0; i -= 1) {
      const score = effects.scores[i];
      score.life -= dt;
      score.y -= dt * 0.62;
      if (score.life <= 0) effects.scores.splice(i, 1);
    }
    game.shake = Math.max(0, game.shake - dt * 2.6);
    game.flash = Math.max(0, game.flash - dt * 2.8);
  }

  function update(dt) {
    if (game.state === "playing") {
      game.time += dt;
      updateModes(dt);
      if (game.frightTimer > 0) {
        game.frightTimer -= dt;
        if (game.frightTimer <= 0) {
          game.frightTimer = 0;
          game.ghostCombo = 0;
          game.ghosts.forEach((ghost) => {
            ghost.frightened = false;
          });
          setStatus(game.mode === "chase" ? "HUNT MODE" : "SCATTER", game.mode === "chase" ? "danger" : "normal");
        }
      }
      updatePac(dt);
      game.ghosts.forEach((ghost) => updateGhost(ghost, dt));
      checkCollisions();
      if (pelletsLeft <= 0) finishLevel();
      game.lastHud += dt;
      if (game.lastHud > 0.24) {
        game.lastHud = 0;
        const stats = getMemoryStats();
        game.cachedPct = stats.pct;
        updateHud();
      }
    } else if (game.state === "ready") {
      game.time += dt;
      game.readyTimer -= dt;
      if (game.readyTimer <= 0) {
        game.state = "playing";
        game.time = 0;
        setStatus(game.mode === "chase" ? "HUNT MODE" : "SCATTER", game.mode === "chase" ? "danger" : "normal");
      }
    } else if (game.state === "dying") {
      game.time += dt;
      updateDying(dt);
    } else if (game.state === "start" || game.state === "gameover" || game.state === "levelclear") {
      game.time += dt * 0.5;
    }
    updateEffects(dt);
  }

  function togglePause() {
    if (game.state === "playing" || game.state === "ready") {
      game.previousState = game.state;
      game.state = "paused";
      showScreen(dom.pauseScreen);
      if (dom.pauseBtn) dom.pauseBtn.classList.add("is-paused");
      setStatus("SIGNAL PAUSED", "normal");
    } else if (game.state === "paused") {
      game.state = game.previousState || "playing";
      hideAllScreens();
      if (dom.pauseBtn) dom.pauseBtn.classList.remove("is-paused");
      setStatus(game.mode === "chase" ? "HUNT MODE" : "SCATTER", game.mode === "chase" ? "danger" : "normal");
    } else if (game.state === "start") {
      toast("Press start, then pause whenever you need.");
    }
  }

  function setDirection(name) {
    const dir = DIRS[name];
    if (!dir) return;
    if (game.state === "start") startFromTitle();
    if (game.state === "gameover" || game.state === "levelclear" || game.state === "paused") return;
    input.desired = dir;
    input.lastDir = dir;
    const pac = game.pac;
    if (!pac) return;
    if (opposite(pac.dir, dir)) {
      pac.dir = dir;
      pac.lastDir = dir;
    }
  }

  function toggleMemoryVision() {
    game.showMemory = !game.showMemory;
    updateHud(true);
    toast(game.showMemory ? "MEMORY VISION — magenta trails are paths the ghosts remember." : "Memory vision off.");
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function resizeCanvas() {
    if (!zone.length) return;
    const rect = dom.swipeArea.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = width;
    view.h = height;
    view.dpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    view.tile = Math.min(width / COLS, height / ROWS);
    view.ox = (width - COLS * view.tile) / 2;
    view.oy = (height - ROWS * view.tile) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildMazeTexture();
    makeStars();
  }

  function makeStars() {
    stars.length = 0;
    for (let i = 0; i < 58; i += 1) {
      stars.push({
        x: Math.random() * view.w,
        y: Math.random() * view.h,
        size: randomBetween(0.35, 1.1),
        alpha: randomBetween(0.08, 0.34),
        phase: randomBetween(0, Math.PI * 2),
      });
    }
  }

  function buildMazeTexture() {
    if (!view.w || !view.h) return;
    mazeTexture = document.createElement("canvas");
    mazeTexture.width = canvas.width;
    mazeTexture.height = canvas.height;
    const m = mazeTexture.getContext("2d");
    m.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    const t = view.tile;
    const ox = view.ox;
    const oy = view.oy;
    const lineWidth = clamp(t * 0.09, 1.2, 3.1);

    // House wash and gate.
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (zone[r][c] !== "house") continue;
        m.fillStyle = "rgba(255, 83, 212, 0.035)";
        m.fillRect(ox + c * t, oy + r * t, t, t);
      }
    }

    // Unreachable pockets read as solid masonry, not holes.
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (zone[r][c] !== "void") continue;
        const voidGradient = m.createLinearGradient(ox + c * t, oy + r * t, ox + c * t, oy + (r + 1) * t);
        voidGradient.addColorStop(0, "rgba(10, 26, 57, 0.9)");
        voidGradient.addColorStop(1, "rgba(5, 15, 35, 0.9)");
        m.fillStyle = voidGradient;
        m.fillRect(ox + c * t, oy + r * t, t + 0.4, t + 0.4);
      }
    }

    // Wall bodies.
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (BASE_MAZE[r][c] !== "#") continue;
        const gradient = m.createLinearGradient(ox + c * t, oy + r * t, ox + c * t, oy + (r + 1) * t);
        gradient.addColorStop(0, "rgba(11, 30, 64, 0.98)");
        gradient.addColorStop(0.55, "rgba(7, 20, 44, 0.98)");
        gradient.addColorStop(1, "rgba(5, 14, 32, 0.98)");
        m.fillStyle = gradient;
        m.fillRect(ox + c * t, oy + r * t, t + 0.4, t + 0.4);
      }
    }

    // Neon edges against floor and house tiles.
    m.lineCap = "round";
    m.lineJoin = "round";
    const exposed = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (BASE_MAZE[r][c] !== "#") continue;
        const x = ox + c * t;
        const y = oy + r * t;
        const sides = [
          { dx: 0, dy: -1, x1: x, y1: y, x2: x + t, y2: y },
          { dx: 1, dy: 0, x1: x + t, y1: y, x2: x + t, y2: y + t },
          { dx: 0, dy: 1, x1: x, y1: y + t, x2: x + t, y2: y + t },
          { dx: -1, dy: 0, x1: x, y1: y, x2: x, y2: y + t },
        ];
        for (const side of sides) {
          const nr = r + side.dy;
          const nc = c + side.dx;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
              exposed.push(side);
            }
            continue;
          }
          if (zone[nr][nc] === "floor" || zone[nr][nc] === "house") exposed.push(side);
        }
      }
    }

    m.save();
    m.shadowColor = "rgba(39, 103, 255, 0.72)";
    m.shadowBlur = t * 0.6;
    m.strokeStyle = "rgba(54, 105, 220, 0.92)";
    m.lineWidth = lineWidth;
    m.beginPath();
    for (const side of exposed) {
      m.moveTo(side.x1, side.y1);
      m.lineTo(side.x2, side.y2);
    }
    m.stroke();
    m.restore();

    m.strokeStyle = "rgba(123, 180, 255, 0.7)";
    m.lineWidth = Math.max(0.7, lineWidth * 0.36);
    m.beginPath();
    for (const side of exposed) {
      m.moveTo(side.x1, side.y1);
      m.lineTo(side.x2, side.y2);
    }
    m.stroke();

    // Gate.
    const gateX = ox + (HOUSE_DOOR.c + 0.5) * t;
    const gateY = oy + (HOUSE_DOOR.r + 0.78) * t;
    m.save();
    m.shadowColor = "rgba(255, 83, 212, 0.9)";
    m.shadowBlur = t * 0.45;
    m.strokeStyle = "rgba(255, 147, 229, 0.9)";
    m.lineWidth = Math.max(1.2, t * 0.075);
    m.beginPath();
    m.moveTo(gateX - t * 0.34, gateY);
    m.lineTo(gateX + t * 0.34, gateY);
    m.stroke();
    m.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#03050d";
    ctx.fillRect(0, 0, view.w, view.h);
    const cx = view.w / 2;
    const cy = view.h * 0.48;
    const radius = Math.max(view.w, view.h) * 0.72;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, "rgba(23, 47, 108, 0.2)");
    glow.addColorStop(0.42, "rgba(10, 22, 58, 0.09)");
    glow.addColorStop(1, "rgba(1, 3, 9, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, view.w, view.h);

    for (const star of stars) {
      const flicker = 0.65 + Math.sin(game.time * 0.7 + star.phase) * 0.35;
      ctx.fillStyle = "rgba(176, 203, 255, " + star.alpha * flicker + ")";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMemoryVision() {
    const t = view.tile;
    const ox = view.ox;
    const oy = view.oy;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (zone[r][c] !== "floor") continue;
        const value = memoryValueAt(c, r);
        if (value <= 0.025) continue;
        if (game.showMemory) {
          const x = ox + c * t + t * 0.08;
          const y = oy + r * t + t * 0.08;
          const s = t * 0.84;
          const pulse = 0.74 + Math.sin(game.time * 2.4 + c * 0.7 + r * 0.4) * 0.26;
          ctx.fillStyle = "rgba(255, 55, 196, " + (0.035 + value * 0.19) * pulse + ")";
          roundRect(ctx, x, y, s, s, t * 0.24);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 125, 225, " + (0.06 + value * 0.24) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
          if (value > 0.36) {
            ctx.fillStyle = "rgba(255, 185, 239, " + (0.16 + value * 0.5) + ")";
            ctx.beginPath();
            ctx.arc(ox + (c + 0.5) * t, oy + (r + 0.5) * t, Math.max(0.8, t * 0.055), 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (value > 0.2) {
          ctx.fillStyle = "rgba(255, 83, 212, " + (value * 0.09) + ")";
          ctx.beginPath();
          ctx.arc(ox + (c + 0.5) * t, oy + (r + 0.5) * t, Math.max(0.7, t * 0.045), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPellets() {
    const t = view.tile;
    const ox = view.ox;
    const oy = view.oy;
    const pulse = 0.5 + Math.sin(game.time * 4.6) * 0.5;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const pellet = pellets[r] && pellets[r][c];
        if (!pellet) continue;
        const x = ox + (c + 0.5) * t;
        const y = oy + (r + 0.5) * t;
        if (pellet === "o") {
          ctx.save();
          ctx.shadowColor = "rgba(255, 91, 210, 0.92)";
          ctx.shadowBlur = t * (0.7 + pulse * 0.2);
          ctx.fillStyle = "#ffeefb";
          ctx.beginPath();
          ctx.arc(x, y, t * (0.15 + pulse * 0.024), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 105, 219, " + (0.45 + pulse * 0.4) + ")";
          ctx.lineWidth = Math.max(0.8, t * 0.035);
          ctx.beginPath();
          ctx.arc(x, y, t * (0.28 + pulse * 0.045), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.shadowColor = "rgba(255, 224, 96, 0.72)";
          ctx.shadowBlur = t * 0.42;
          ctx.fillStyle = "#ffe994";
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1.2, t * 0.078), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  function drawGhost(ghost) {
    const t = view.tile;
    const bob = ghost.state === "house" ? Math.sin(game.time * 3.4 + ghost.bob) * t * 0.08 : 0;
    const x = view.ox + ghost.x * t;
    const y = view.oy + ghost.y * t + bob;
    const r = t * 0.385;
    const frightened = ghost.frightened && game.frightTimer > 0;
    const flashing = frightened && game.frightTimer < 2.2 && Math.sin(game.time * 18) > 0;
    const eyesOnly = ghost.state === "eyes";

    if (eyesOnly) {
      ctx.save();
      ctx.shadowColor = "rgba(137, 214, 255, 0.85)";
      ctx.shadowBlur = t * 0.55;
      drawGhostEyes(x, y, r, ghost.dir, false);
      ctx.restore();
      return;
    }

    const base = frightened ? (flashing ? "#f4f6ff" : "#2347e9") : ghost.color;
    const light = frightened ? (flashing ? "#ffffff" : "#5c85ff") : ghost.light;
    ctx.save();
    ctx.shadowColor = frightened ? "rgba(71, 110, 255, 0.72)" : ghost.color;
    ctx.shadowBlur = t * 0.5;
    const gradient = ctx.createLinearGradient(x, y - r * 1.2, x, y + r);
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.42, base);
    gradient.addColorStop(1, base);

    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.92);
    ctx.lineTo(x - r, y - r * 0.08);
    ctx.bezierCurveTo(x - r * 0.94, y - r * 1.38, x + r * 0.94, y - r * 1.38, x + r, y - r * 0.08);
    ctx.lineTo(x + r, y + r * 0.92);
    ctx.lineTo(x + r * 0.64, y + r * 0.72);
    ctx.lineTo(x + r * 0.31, y + r * 0.94);
    ctx.lineTo(x, y + r * 0.7);
    ctx.lineTo(x - r * 0.31, y + r * 0.94);
    ctx.lineTo(x - r * 0.64, y + r * 0.72);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = frightened ? "rgba(175, 203, 255, 0.32)" : "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = Math.max(0.7, t * 0.026);
    ctx.stroke();

    if (frightened) {
      const eyeColor = flashing ? "#2449e4" : "#dce7ff";
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(x - r * 0.34, y - r * 0.18, r * 0.19, 0, Math.PI * 2);
      ctx.arc(x + r * 0.34, y - r * 0.18, r * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = Math.max(1, t * 0.05);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - r * 0.48, y + r * 0.43);
      ctx.lineTo(x - r * 0.24, y + r * 0.25);
      ctx.lineTo(x, y + r * 0.43);
      ctx.lineTo(x + r * 0.24, y + r * 0.25);
      ctx.lineTo(x + r * 0.48, y + r * 0.43);
      ctx.stroke();
    } else {
      drawGhostEyes(x, y, r, ghost.dir, true);
    }
    ctx.restore();
  }

  function drawGhostEyes(x, y, r, dir, withFace) {
    const lookX = dir ? dir.x * r * 0.11 : 0;
    const lookY = dir ? dir.y * r * 0.11 : 0;
    ctx.fillStyle = "#f7fbff";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.33, y - r * 0.18, r * 0.25, r * 0.29, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.33, y - r * 0.18, r * 0.25, r * 0.29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withFace ? "#233f95" : "#3d9dff";
    ctx.beginPath();
    ctx.arc(x - r * 0.3 + lookX, y - r * 0.16 + lookY, r * 0.12, 0, Math.PI * 2);
    ctx.arc(x + r * 0.36 + lookX, y - r * 0.16 + lookY, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPac() {
    if (!game.pac) return;
    const pac = game.pac;
    const t = view.tile;
    const x = view.ox + pac.x * t;
    const y = view.oy + pac.y * t;
    let r = t * 0.43;
    const dying = game.state === "dying";
    const dieT = dying ? clamp(game.deathTimer / 1.35, 0, 1) : 0;
    let mouth = 0.22 + (0.5 + Math.sin(pac.mouthTime) * 0.5) * 0.55;
    if (!pac.dir || (!pac.dir.x && !pac.dir.y)) mouth = 0.42;

    if (dying) {
      r *= Math.max(0, 1 - dieT * 0.88);
      mouth = 0.2 + dieT * Math.PI * 0.82;
    }
    if (r <= 0.2) return;

    const angle = (pac.dir && (pac.dir.x || pac.dir.y) ? pac.dir.angle : pac.lastDir.angle) + (dying ? dieT * 4.8 : 0);
    ctx.save();
    if (dying) {
      ctx.translate(x, y);
      ctx.rotate(angle);
    } else {
      ctx.translate(x, y);
      ctx.rotate(angle);
    }

    if (!dying) {
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
      halo.addColorStop(0, "rgba(255, 227, 92, 0.17)");
      halo.addColorStop(0.45, "rgba(255, 207, 30, 0.05)");
      halo.addColorStop(1, "rgba(255, 207, 30, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = "rgba(255, 220, 57, 0.9)";
    ctx.shadowBlur = t * 0.6;
    const gradient = ctx.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, "#fff9b6");
    gradient.addColorStop(0.42, "#ffe35c");
    gradient.addColorStop(1, "#ffc21f");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();

    if (!dying) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#2a2304";
      ctx.beginPath();
      ctx.arc(r * 0.2, -r * 0.42, Math.max(0.9, r * 0.075), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
      ctx.beginPath();
      ctx.arc(-r * 0.24, -r * 0.48, Math.max(0.7, r * 0.055), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEffects() {
    const t = view.tile;
    ctx.save();
    for (const particle of effects.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(
        view.ox + particle.x * t,
        view.oy + particle.y * t,
        Math.max(0.8, particle.size * t),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.max(7, Math.round(t * 0.32)) + 'px "Press Start 2P", monospace';
    for (const score of effects.scores) {
      const progress = 1 - score.life / score.maxLife;
      ctx.globalAlpha = Math.min(1, score.life * 2.4);
      ctx.fillStyle = score.color;
      ctx.shadowColor = score.color;
      ctx.shadowBlur = 10;
      ctx.fillText(
        String(score.value),
        view.ox + score.x * t,
        view.oy + score.y * t - progress * t * 0.45,
      );
    }
    ctx.restore();
  }

  function drawReadyMessage() {
    if (game.state !== "ready") return;
    const t = view.tile;
    const progress = 1 - game.readyTimer / 2.05;
    const alpha = Math.min(1, progress * 6) * Math.min(1, (1 - progress) * 12);
    if (alpha <= 0) return;
    const x = view.ox + (COLS / 2) * t;
    const y = view.oy + (ROWS / 2 + 3.15) * t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(3, 6, 15, 0.58)";
    ctx.fillRect(view.ox, y - t * 1.2, COLS * t, t * 2.4);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.max(13, Math.round(t * 0.62)) + 'px "Press Start 2P", monospace';
    ctx.fillStyle = "#ffe35c";
    ctx.shadowColor = "rgba(255, 227, 92, 0.8)";
    ctx.shadowBlur = t * 0.9;
    ctx.fillText("READY!", x, y);
    ctx.shadowBlur = 0;
    ctx.font = Math.max(5, Math.round(t * 0.16)) + 'px "Press Start 2P", monospace';
    ctx.fillStyle = "rgba(186, 202, 240, 0.78)";
    ctx.fillText("THEY ARE LEARNING", x, y + t * 0.85);
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    drawBackground();

    const shake = game.shake > 0.01 ? game.shake : 0;
    const shakeX = shake ? Math.sin(game.time * 71) * shake * view.tile * 0.11 : 0;
    const shakeY = shake ? Math.cos(game.time * 57) * shake * view.tile * 0.09 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const boardX = view.ox;
    const boardY = view.oy;
    const boardW = COLS * view.tile;
    const boardH = ROWS * view.tile;

    if (game.pac && game.state !== "start") {
      const halo = ctx.createRadialGradient(
        boardX + game.pac.x * view.tile,
        boardY + game.pac.y * view.tile,
        0,
        boardX + game.pac.x * view.tile,
        boardY + game.pac.y * view.tile,
        view.tile * 4.2,
      );
      halo.addColorStop(0, "rgba(255, 227, 92, 0.055)");
      halo.addColorStop(1, "rgba(255, 227, 92, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(boardX, boardY, boardW, boardH);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(boardX, boardY, boardW, boardH);
    ctx.clip();
    drawMemoryVision();
    if (mazeTexture) ctx.drawImage(mazeTexture, 0, 0, view.w, view.h);
    drawPellets();
    if (game.ghosts) {
      game.ghosts
        .slice()
        .sort((a, b) => a.y - b.y)
        .forEach(drawGhost);
    }
    if (game.pac && game.state !== "start") drawPac();
    drawEffects();
    if (game.frightTimer > 0) {
      const pulse = 0.5 + Math.sin(game.time * 5.5) * 0.5;
      ctx.fillStyle = "rgba(56, 104, 255, " + (0.018 + pulse * 0.012) + ")";
      ctx.fillRect(boardX, boardY, boardW, boardH);
    }
    ctx.restore();

    drawReadyMessage();
    ctx.restore();

    if (game.flash > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, " + game.flash * 0.15 + ")";
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  const motion = {
    enabled: false,
    baseline: null,
    lastDirection: "",
    received: false,
    denied: false,
    listenerAttached: false,
  };

  function motionSupported() {
    return typeof window.DeviceOrientationEvent !== "undefined";
  }

  async function toggleTilt() {
    if (!motionSupported()) {
      toast("Motion sensors are not available in this browser. Use swipe or the thumb pad.");
      if (dom.tiltState) dom.tiltState.textContent = "NOT AVAILABLE";
      if (dom.tiltBtn) dom.tiltBtn.classList.add("is-denied");
      return;
    }
    if (motion.enabled) {
      motion.enabled = false;
      motion.baseline = null;
      motion.lastDirection = "";
      if (dom.tiltBtn) {
        dom.tiltBtn.classList.remove("is-on");
        dom.tiltBtn.setAttribute("aria-pressed", "false");
      }
      if (dom.tiltState) dom.tiltState.textContent = "TAP TO ENABLE";
      toast("Tilt control off. Swipe and thumb pad still work.");
      return;
    }

    let request = null;
    if (
      typeof window.DeviceOrientationEvent !== "undefined" &&
      typeof window.DeviceOrientationEvent.requestPermission === "function"
    ) {
      request = window.DeviceOrientationEvent.requestPermission.bind(window.DeviceOrientationEvent);
    } else if (
      typeof window.DeviceMotionEvent !== "undefined" &&
      typeof window.DeviceMotionEvent.requestPermission === "function"
    ) {
      request = window.DeviceMotionEvent.requestPermission.bind(window.DeviceMotionEvent);
    }

    if (request) {
      try {
        const response = await request();
        if (response !== "granted") {
          motion.denied = true;
          if (dom.tiltBtn) dom.tiltBtn.classList.add("is-denied");
          if (dom.tiltState) dom.tiltState.textContent = "PERMISSION DENIED";
          toast("Motion access was declined. You can still swipe or use the thumb pad.");
          return;
        }
      } catch (error) {
        motion.denied = true;
        if (dom.tiltBtn) dom.tiltBtn.classList.add("is-denied");
        if (dom.tiltState) dom.tiltState.textContent = "PERMISSION DENIED";
        toast("iOS blocked motion access. Enable it in Settings or use the thumb pad.");
        return;
      }
    }

    if (!motion.listenerAttached) {
      window.addEventListener("deviceorientation", handleOrientation, true);
      motion.listenerAttached = true;
    }
    motion.enabled = true;
    motion.baseline = null;
    motion.lastDirection = "";
    motion.received = false;
    if (dom.tiltBtn) {
      dom.tiltBtn.classList.remove("is-denied");
      dom.tiltBtn.classList.add("is-on");
      dom.tiltBtn.setAttribute("aria-pressed", "true");
    }
    if (dom.tiltState) dom.tiltState.textContent = "ON · HOLD FLAT";
    toast("Tilt control on. Hold your phone naturally to calibrate.");
    window.setTimeout(() => {
      if (motion.enabled && !motion.received) {
        toast("No motion data yet. Keep the phone steady for a moment.");
      }
    }, 1900);
  }

  function handleOrientation(event) {
    if (!motion.enabled) return;
    if (event.beta === null || event.gamma === null) return;
    motion.received = true;
    if (!motion.baseline) {
      motion.baseline = { beta: event.beta, gamma: event.gamma };
      if (dom.tiltState) dom.tiltState.textContent = "ON · TILT TO STEER";
      return;
    }

    let dx = event.gamma - motion.baseline.gamma;
    let dy = -(event.beta - motion.baseline.beta);
    const screenAngle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    if (screenAngle === 90) {
      const oldX = dx;
      dx = dy;
      dy = -oldX;
    } else if (screenAngle === -90 || screenAngle === 270) {
      const oldX = dx;
      dx = -dy;
      dy = oldX;
    } else if (Math.abs(screenAngle) === 180) {
      dx = -dx;
      dy = -dy;
    }

    const threshold = 8;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < threshold) {
      if (Math.max(ax, ay) < 4) motion.lastDirection = "";
      return;
    }

    const direction = ax > ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "up" : "down");
    if (direction === motion.lastDirection) return;
    motion.lastDirection = direction;
    if (game.state === "playing" || game.state === "ready") {
      setDirection(direction);
    }
  }

  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    a: "left",
    A: "left",
    s: "down",
    S: "down",
    d: "right",
    D: "right",
  };

  function handleKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const direction = keyMap[event.key];
    if (direction) {
      event.preventDefault();
      setDirection(direction);
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (game.state === "start") startFromTitle();
      else if (game.state === "gameover") newGame();
      else togglePause();
      return;
    }
    if (event.key === "Enter") {
      if (game.state === "start") {
        event.preventDefault();
        startFromTitle();
      } else if (game.state === "levelclear") {
        event.preventDefault();
        nextLevel();
      } else if (game.state === "gameover") {
        event.preventDefault();
        newGame();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "p" || event.key === "P") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      toggleMemoryVision();
    }
  }

  function setupTouchControls() {
    document.querySelectorAll(".pad").forEach((pad) => {
      const release = () => pad.classList.remove("is-pressed");
      pad.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        pad.classList.add("is-pressed");
        setDirection(pad.dataset.dir);
        if (pad.setPointerCapture) {
          try {
            pad.setPointerCapture(event.pointerId);
          } catch (error) {
            /* noop */
          }
        }
      });
      pad.addEventListener("pointerup", release);
      pad.addEventListener("pointercancel", release);
      pad.addEventListener("pointerleave", release);
      pad.addEventListener("click", (event) => {
        if (event.detail === 0) setDirection(pad.dataset.dir);
      });
      pad.addEventListener("contextmenu", (event) => event.preventDefault());
    });

    let swipe = null;
    dom.swipeArea.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });
    dom.swipeArea.addEventListener("pointerup", (event) => {
      if (!swipe || swipe.id !== event.pointerId) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if (game.state === "start") startFromTitle();
      if (game.state === "gameover" || game.state === "levelclear") return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? "right" : "left");
      } else {
        setDirection(dy > 0 ? "down" : "up");
      }
    });
    dom.swipeArea.addEventListener("pointercancel", () => {
      swipe = null;
    });
  }

  function bindUi() {
    dom.startBtn.addEventListener("click", startFromTitle);
    dom.restartBtn.addEventListener("click", () => {
      audio.init();
      newGame();
    });
    dom.nextBtn.addEventListener("click", nextLevel);
    dom.resumeBtn.addEventListener("click", togglePause);
    dom.pauseBtn.addEventListener("click", togglePause);
    dom.soundBtn.addEventListener("click", () => {
      audio.init();
      audio.setMuted(!audio.muted);
      if (!audio.muted) audio.tone(520, 0.08, "triangle", 0.025, 60);
    });
    dom.tiltBtn.addEventListener("click", toggleTilt);
    dom.memoryBtn.addEventListener("click", toggleMemoryVision);
    dom.memoryChip.addEventListener("click", toggleMemoryVision);
    dom.sideMemoryBtn.addEventListener("click", toggleMemoryVision);
    dom.brandHome.addEventListener("click", (event) => {
      event.preventDefault();
      if (game.state === "start") return;
      toast("Memory Maze — break your pattern before they learn it.");
    });
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && (game.state === "playing" || game.state === "ready")) {
        togglePause();
      }
    });
    window.addEventListener("orientationchange", () => {
      if (motion.enabled) {
        motion.baseline = null;
        motion.lastDirection = "";
        if (dom.tiltState) dom.tiltState.textContent = "ON · HOLD FLAT";
      }
      window.setTimeout(resizeCanvas, 300);
    });
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeCanvas, 80);
    });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(dom.swipeArea);
    }
  }

  function updateTiltSupport() {
    if (!motionSupported()) {
      if (dom.tiltState) dom.tiltState.textContent = "NOT AVAILABLE";
      if (dom.tiltBtn) dom.tiltBtn.classList.add("is-denied");
    }
  }

  let lastFrame = performance.now();

  function frame(now) {
    const dt = Math.min(0.045, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    draw();
    window.requestAnimationFrame(frame);
  }

  function init() {
    buildZones();
    createPellets();
    game.pac = makePac();
    game.ghosts = makeGhosts();
    game.best = Number(readStorage(STORAGE.best, "0")) || 0;
    audio.setMuted(audio.muted);
    updateTiltSupport();
    bindUi();
    setupTouchControls();
    resizeCanvas();
    updateHud(true);
    if (dom.statusText) dom.statusText.textContent = "GHOSTS ARE WATCHING";
    setStatus("GHOSTS ARE WATCHING", "normal");
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      resizeCanvas();
    });
  }
})();
