/* Bootstrap, responsive layout, HUD, overlays, input (touch / keyboard / tilt). */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const overlay = document.getElementById("overlay");
const toastEl = document.getElementById("toast");
const tiltBadge = document.getElementById("tiltBadge");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const levelEl = document.getElementById("level");
const livesEl = document.getElementById("lives");
const memoryBtn = document.getElementById("memoryBtn");
const memoryFill = document.getElementById("memoryFill");
const memoryPct = document.getElementById("memoryPct");
const dpad = document.getElementById("dpad");
const tiltBtn = document.getElementById("tiltBtn");
const tiltState = document.getElementById("tiltState");
const soundBtn = document.getElementById("soundBtn");
const soundState = document.getElementById("soundState");
const pauseBtn = document.getElementById("pauseBtn");

const view = { S: 1, ox: 0, oy: 0 };

const uiCache = { score: -1, high: -1, level: -1, lives: -1, mem: -1 };

let toastTimer = 0;

const tilt = {
  on: false,
  baseX: null,
  baseY: null,
  lastDir: null,
  suppressUntil: 0,
};

function fmt(n) {
  return Math.max(0, Math.floor(n)).toLocaleString("en-US");
}

function updateHUD(force = false) {
  if (G.score > G.high) G.high = G.score;
  if (force || G.score !== uiCache.score) {
    uiCache.score = G.score;
    scoreEl.textContent = fmt(G.score);
  }
  if (force || G.high !== uiCache.high) {
    uiCache.high = G.high;
    highEl.textContent = fmt(G.high);
  }
  if (force || G.level !== uiCache.level) {
    uiCache.level = G.level;
    levelEl.textContent = String(G.level).padStart(2, "0");
  }
  if (force || G.lives !== uiCache.lives) {
    uiCache.lives = G.lives;
    renderLives();
  }
  const pct = Math.round(familiarity * 100);
  if (force || pct !== uiCache.mem) {
    uiCache.mem = pct;
    memoryPct.textContent = `${pct}%`;
    memoryFill.style.transform = `scaleX(${Math.max(0.004, familiarity)})`;
  }
}

function renderLives() {
  let html = "";
  for (let i = 0; i < G.lives; i++) html += '<span class="life"></span>';
  livesEl.innerHTML = html;
}

function notify(message, duration = 2200) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

function openOverlay(html) {
  overlay.innerHTML = html;
  overlay.classList.add("is-open");
}

function closeOverlay() {
  overlay.classList.remove("is-open");
}

function showTitle() {
  openOverlay(`
    <div class="overlay-card">
      <p class="eyebrow">Neon arcade // 1980 rewired</p>
      <div class="ghost-row" aria-hidden="true">
        <i class="ghost-dot" style="color:#ff4d5e"></i>
        <i class="ghost-dot" style="color:#ff8fe0"></i>
        <i class="ghost-dot" style="color:#54e6ff"></i>
        <i class="ghost-dot" style="color:#ffb45c"></i>
      </div>
      <h1 class="title">PAC-MAN<span>MEMORY MAZE</span></h1>
      <p class="tagline">The ghosts watch every corridor you take.<br>
        Clear a level and they <b>remember your route</b> — the next maze is hunted smarter.</p>
      <button class="primary" type="button" data-action="start">START RUN</button>
      <div class="hints">
        <span>SWIPE OR D-PAD</span>
        <span>TILT OPTIONAL</span>
        <span>P TO PAUSE</span>
      </div>
      <small class="fine">Tap <b>GHOST MEMORY</b> to reveal their learned route.<br>Tilt asks for motion access on iOS.</small>
    </div>
  `);
}

function showGameOver() {
  setPauseButton(false);
  openOverlay(`
    <div class="overlay-card">
      <p class="eyebrow">Run terminated</p>
      <h1 class="big">GAME OVER</h1>
      <div class="result-grid">
        <div><span>SCORE</span><b>${fmt(G.score)}</b></div>
        <div><span>LEVEL</span><b>${G.level}</b></div>
        <div><span>MEMORY</span><b>${Math.round(familiarity * 100)}%</b></div>
      </div>
      <button class="primary" type="button" data-action="restart">PLAY AGAIN</button>
      <small class="fine">Best run <b>${fmt(Math.max(G.high, G.score))}</b> · the maze forgets, the ghosts do not.</small>
    </div>
  `);
}

function showPause() {
  openOverlay(`
    <div class="overlay-card">
      <p class="eyebrow">Signal held</p>
      <h1 class="big" style="color:#a9bbff;text-shadow:0 0 24px rgba(120,150,255,.4)">PAUSED</h1>
      <p class="tagline">The ghosts are still learning.<br>They remember <b>${Math.round(familiarity * 100)}%</b> of your route.</p>
      <button class="primary" type="button" data-action="resume">RESUME</button>
      <button class="secondary" type="button" data-action="restart">RESTART RUN</button>
      <small class="fine">Memory overlay: ${G.memoryVisible ? "ON" : "OFF"} · Tilt: ${tilt.on ? "ON" : "OFF"}</small>
    </div>
  `);
}

function beginRun() {
  Sound.init();
  closeOverlay();
  setPauseButton(false);
  startRun();
  updateHUD(true);
}

function doPause() {
  if (G.mode === "paused") {
    resumeGame();
    closeOverlay();
    setPauseButton(false);
    Sound.ui();
    return;
  }
  if (pauseGame()) {
    showPause();
    setPauseButton(true);
    Sound.ui();
  }
}

function setPauseButton(paused) {
  const label = pauseBtn.querySelector("span");
  if (label) label.textContent = paused ? "RESUME" : "PAUSE";
}

function toggleSound() {
  Sound.init();
  const muted = Sound.toggle();
  soundState.textContent = muted ? "OFF" : "ON";
  soundBtn.classList.toggle("on", !muted);
  soundBtn.setAttribute("aria-pressed", String(!muted));
}

function toggleMemory() {
  G.memoryVisible = !G.memoryVisible;
  memoryBtn.setAttribute("aria-pressed", String(G.memoryVisible));
  Sound.init();
  Sound.ui();
  notify(G.memoryVisible ? "GHOST MEMORY OVERLAY — ON" : "GHOST MEMORY OVERLAY — OFF");
}

/* ---------- Tilt ---------- */

function screenAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") return screen.orientation.angle;
  return window.orientation || 0;
}

function updateTiltUI() {
  tiltState.textContent = tilt.on ? "ON" : "OFF";
  tiltBtn.classList.toggle("on", tilt.on);
  tiltBtn.setAttribute("aria-pressed", String(tilt.on));
  tiltBadge.classList.toggle("show", tilt.on);
}

function onOrientation(event) {
  if (!tilt.on) return;
  if (performance.now() < tilt.suppressUntil) return;
  if (event.beta == null && event.gamma == null) return;

  const rad = (screenAngle() * Math.PI) / 180;
  const rawX = event.gamma || 0;
  const rawY = event.beta || 0;
  const x = rawX * Math.cos(rad) + rawY * Math.sin(rad);
  const y = -rawX * Math.sin(rad) + rawY * Math.cos(rad);

  if (tilt.baseX === null) {
    tilt.baseX = x;
    tilt.baseY = y;
    return;
  }

  const dx = x - tilt.baseX;
  const dy = y - tilt.baseY;
  const threshold = 9;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    tilt.lastDir = null;
    return;
  }

  let name;
  if (Math.abs(dx) >= Math.abs(dy)) {
    name = dx > 0 ? "right" : "left";
  } else {
    name = dy > 0 ? "down" : "up";
  }

  if (name === tilt.lastDir) return;
  tilt.lastDir = name;
  steer(name, true);
}

async function toggleTilt() {
  if (tilt.on) {
    tilt.on = false;
    tilt.baseX = null;
    tilt.baseY = null;
    tilt.lastDir = null;
    window.removeEventListener("deviceorientation", onOrientation);
    updateTiltUI();
    notify("TILT OFF");
    return;
  }

  if (typeof DeviceOrientationEvent === "undefined") {
    notify("TILT UNAVAILABLE ON THIS DEVICE");
    return;
  }

  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        notify("MOTION ACCESS DENIED — USE SWIPE OR D-PAD");
        return;
      }
    }
    tilt.on = true;
    tilt.baseX = null;
    tilt.baseY = null;
    tilt.lastDir = null;
    window.addEventListener("deviceorientation", onOrientation);
    updateTiltUI();
    Sound.init();
    Sound.ui();
    notify("TILT ON — HOLD NATURALLY TO CALIBRATE", 3200);
  } catch (_) {
    notify("MOTION ACCESS UNAVAILABLE — USE SWIPE OR D-PAD");
  }
}

/* ---------- Input ---------- */

function steer(name, fromTilt = false) {
  const dir = DIRECTIONS[name];
  if (!dir) return;
  if (!fromTilt) {
    tilt.suppressUntil = performance.now() + 500;
    Sound.init();
  }
  setPacDirection(dir);
}

dpad.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-dir]");
  if (!button) return;
  event.preventDefault();
  button.classList.add("pressed");
  try {
    button.setPointerCapture(event.pointerId);
  } catch (_) {}
  steer(button.dataset.dir);
});

function releasePadButton(event) {
  const button = event.target.closest("button[data-dir]");
  if (button) button.classList.remove("pressed");
}

dpad.addEventListener("pointerup", releasePadButton);
dpad.addEventListener("pointercancel", releasePadButton);
dpad.addEventListener("lostpointercapture", releasePadButton);

let swipe = null;
stage.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".overlay") || event.target.closest("button")) return;
  if (G.mode === "title" || G.mode === "gameover") return;
  swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
  try {
    stage.setPointerCapture(event.pointerId);
  } catch (_) {}
});

stage.addEventListener("pointermove", (event) => {
  if (!swipe || event.pointerId !== swipe.id) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  if (Math.abs(dx) >= Math.abs(dy)) {
    steer(dx > 0 ? "right" : "left");
  } else {
    steer(dy > 0 ? "down" : "up");
  }
  swipe.x = event.clientX;
  swipe.y = event.clientY;
});

function endSwipe(event) {
  if (swipe && event.pointerId === swipe.id) swipe = null;
}
stage.addEventListener("pointerup", endSwipe);
stage.addEventListener("pointercancel", endSwipe);

window.addEventListener("keydown", (event) => {
  const key = event.key;
  const map = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right",
  };
  if (map[key]) {
    event.preventDefault();
    steer(map[key]);
    return;
  }
  if (key === "p" || key === "P" || key === "Escape") {
    event.preventDefault();
    doPause();
  } else if (key === "Enter") {
    if (G.mode === "title" || G.mode === "gameover") beginRun();
    else if (G.mode === "paused") doPause();
  } else if (key === "m" || key === "M") {
    toggleSound();
  } else if (key === "t" || key === "T") {
    toggleTilt();
  }
});

overlay.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "start" || action === "restart") {
    beginRun();
  } else if (action === "resume") {
    doPause();
  }
});

memoryBtn.addEventListener("click", toggleMemory);
tiltBtn.addEventListener("click", toggleTilt);
soundBtn.addEventListener("click", toggleSound);
pauseBtn.addEventListener("click", doPause);

document.addEventListener("visibilitychange", () => {
  lastTime = performance.now();
  if (document.hidden) {
    if (G.score > G.high) G.high = G.score;
    saveHigh();
    if (pauseGame()) {
      showPause();
      setPauseButton(true);
    }
  }
});

window.addEventListener("pagehide", () => {
  if (G.score > G.high) G.high = G.score;
  saveHigh();
});

/* ---------- Layout ---------- */

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const style = getComputedStyle(stage);
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const availW = Math.max(120, rect.width - padX - 6);
  const availH = Math.max(120, rect.height - padY - 8);
  const scale = Math.min(availW / COLS, availH / ROWS);
  const cssW = Math.max(120, Math.floor(scale * COLS));
  const cssH = Math.floor((cssW * ROWS) / COLS);

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));

  view.S = Math.min(canvas.width / COLS, canvas.height / ROWS);
  view.ox = (canvas.width - view.S * COLS) / 2;
  view.oy = (canvas.height - view.S * ROWS) / 2;
  buildWallCache();
}

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(stage);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => {
  tilt.baseX = null;
  tilt.baseY = null;
  tilt.lastDir = null;
  setTimeout(resizeCanvas, 120);
});

/* ---------- Boot / loop ---------- */

bootEngine();
resizeCanvas();
updateHUD(true);
showTitle();
soundState.textContent = Sound.muted ? "OFF" : "ON";
soundBtn.classList.toggle("on", !Sound.muted);
soundBtn.setAttribute("aria-pressed", String(!Sound.muted));
updateTiltUI();

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.045, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  G.time += dt;
  updateEffects(dt);
  updateGame(dt);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
