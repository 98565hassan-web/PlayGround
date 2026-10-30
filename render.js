/* Canvas renderer: neon maze, pellets, actors, particles, overlays. */

let wallCache = null;
let wallCacheKey = "";

function wallAt(c, r) {
  if (r < 0 || r >= ROWS) return true;
  return walls[tileKey(wrapCol(c), r)] === 1;
}

function roundedTilePath(path, c, r) {
  const rad = 0.34;
  const n = wallAt(c, r - 1);
  const s = wallAt(c, r + 1);
  const w = wallAt(c - 1, r);
  const e = wallAt(c + 1, r);
  const tl = !n && !w ? rad : 0;
  const tr = !n && !e ? rad : 0;
  const br = !s && !e ? rad : 0;
  const bl = !s && !w ? rad : 0;
  const x = c;
  const y = r;
  path.moveTo(x + tl, y);
  path.lineTo(x + 1 - tr, y);
  if (tr) path.quadraticCurveTo(x + 1, y, x + 1, y + tr);
  path.lineTo(x + 1, y + 1 - br);
  if (br) path.quadraticCurveTo(x + 1, y + 1, x + 1 - br, y + 1);
  path.lineTo(x + bl, y + 1);
  if (bl) path.quadraticCurveTo(x, y + 1, x, y + 1 - bl);
  path.lineTo(x, y + tl);
  if (tl) path.quadraticCurveTo(x, y, x + tl, y);
  path.closePath();
}

function buildWallCache() {
  if (!canvas.width || !canvas.height) return;
  wallCache = document.createElement("canvas");
  wallCache.width = canvas.width;
  wallCache.height = canvas.height;
  const g = wallCache.getContext("2d");
  g.setTransform(view.S, 0, 0, view.S, view.ox, view.oy);

  const fillPath = new Path2D();
  const edgePath = new Path2D();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!walls[tileKey(c, r)]) continue;
      roundedTilePath(fillPath, c, r);
      if (!wallAt(c, r - 1)) {
        edgePath.moveTo(c, r);
        edgePath.lineTo(c + 1, r);
      }
      if (!wallAt(c, r + 1)) {
        edgePath.moveTo(c, r + 1);
        edgePath.lineTo(c + 1, r + 1);
      }
      if (!wallAt(c - 1, r)) {
        edgePath.moveTo(c, r);
        edgePath.lineTo(c, r + 1);
      }
      if (!wallAt(c + 1, r)) {
        edgePath.moveTo(c + 1, r);
        edgePath.lineTo(c + 1, r + 1);
      }
    }
  }

  g.fillStyle = "rgba(11, 18, 46, 0.72)";
  g.fill(fillPath);

  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "rgba(52, 96, 255, 0.55)";
  g.lineWidth = 0.16;
  g.filter = `blur(${Math.max(2, view.S * 0.16)}px)`;
  g.stroke(edgePath);
  g.restore();

  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "#5f8cff";
  g.lineWidth = 0.085;
  g.shadowColor = "#2e5bff";
  g.shadowBlur = view.S * 0.45;
  g.stroke(edgePath);
  g.restore();

  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "rgba(186, 214, 255, 0.65)";
  g.lineWidth = 0.022;
  g.stroke(edgePath);
  g.restore();

  wallCacheKey = `${canvas.width}x${canvas.height}`;
}

function entityPos(entity) {
  return {
    x: entity.c + 0.5 + entity.dir.x * entity.progress,
    y: entity.r + 0.5 + entity.dir.y * entity.progress,
  };
}

function drawMaze() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (wallCache) ctx.drawImage(wallCache, 0, 0);
  ctx.setTransform(view.S, 0, 0, view.S, view.ox, view.oy);
}

function drawHeatOverlay() {
  if (!G.memoryVisible) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const h = heat[tileKey(c, r)];
      if (h < 0.06) continue;
      const strength = Math.min(1, Math.sqrt(h) * 0.72);
      const alpha = 0.06 + strength * 0.42;
      ctx.fillStyle = `rgba(255, 72, 198, ${alpha.toFixed(3)})`;
      const radius = 0.3 + strength * 0.34;
      ctx.beginPath();
      ctx.arc(c + 0.5, r + 0.5, radius, 0, Math.PI * 2);
      ctx.fill();
      if (strength > 0.45) {
        ctx.strokeStyle = `rgba(255, 174, 232, ${(strength * 0.22).toFixed(3)})`;
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(c + 0.5, r + 0.5, radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawDoor() {
  const y = 12.42;
  ctx.save();
  ctx.strokeStyle = "#ff6bce";
  ctx.lineWidth = 0.14;
  ctx.lineCap = "round";
  ctx.shadowColor = "#ff4fd8";
  ctx.shadowBlur = view.S * 0.5;
  ctx.beginPath();
  ctx.moveTo(13.08, y);
  ctx.lineTo(14.92, y);
  ctx.stroke();
  ctx.restore();
}

function drawPellets() {
  const pulse = 1 + Math.sin(G.time * 5.4) * 0.16;
  ctx.save();
  ctx.fillStyle = "#ffe9b0";
  for (const key of pellets) {
    const c = key % COLS;
    const r = (key - c) / COLS;
    ctx.beginPath();
    ctx.arc(c + 0.5, r + 0.5, 0.058, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const key of powerPellets) {
    const c = key % COLS;
    const r = (key - c) / COLS;
    const rad = 0.145 * pulse;
    const halo = ctx.createRadialGradient(c + 0.5, r + 0.5, 0, c + 0.5, r + 0.5, rad * 2.6);
    halo.addColorStop(0, "rgba(255, 238, 173, 0.5)");
    halo.addColorStop(1, "rgba(255, 196, 66, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(c + 0.5, r + 0.5, rad * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff5cd";
    ctx.beginPath();
    ctx.arc(c + 0.5, r + 0.5, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShard() {
  if (!G.fruit) return;
  const { c, r } = G.fruit;
  const t = G.time * 2.2;
  const bob = Math.sin(t * 1.8) * 0.06;
  const x = c + 0.5;
  const y = r + 0.5 + bob;
  const rad = 0.26 + Math.sin(t * 3) * 0.03;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.5);
  ctx.shadowColor = "#4ff0ff";
  ctx.shadowBlur = view.S * 0.8;
  const grad = ctx.createLinearGradient(-rad, -rad, rad, rad);
  grad.addColorStop(0, "#eaffff");
  grad.addColorStop(0.45, "#4ff0ff");
  grad.addColorStop(1, "#b44dff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -rad);
  ctx.lineTo(rad * 0.72, 0);
  ctx.lineTo(0, rad);
  ctx.lineTo(-rad * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPac() {
  const pos = entityPos(pac);
  const r = 0.45;
  let mouth;
  if (G.mode === "dying") {
    const p = Math.min(1, G.deathTimer / 1.55);
    mouth = (0.18 + (1 - p) * 0.9) * Math.PI;
  } else if (G.mode === "playing" && pac.moving) {
    mouth = (0.045 + Math.abs(Math.sin(G.time * 13.5)) * 0.26) * Math.PI;
  } else {
    mouth = 0.16 * Math.PI;
  }

  const angle = Math.atan2(pac.dir.y, pac.dir.x);
  const scale = G.mode === "dying" ? Math.max(0.15, Math.min(1, G.deathTimer / 1.2)) : 1;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.shadowColor = "#ffd93d";
  ctx.shadowBlur = view.S * 0.65;

  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r);
  grad.addColorStop(0, "#fff7b0");
  grad.addColorStop(0.55, "#ffe14a");
  grad.addColorStop(1, "#f6b512");
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (G.mode === "dying") {
    const p = 1 - G.deathTimer / 1.55;
    if (p > 0.55) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, (p - 0.55) / 0.45);
      ctx.strokeStyle = "#ffe86a";
      ctx.lineWidth = 0.08;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047 + G.time * 0.6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 0.3 + p * 0.55, a, a + 0.35);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawGhostBody(g, color, frightened) {
  const pos = entityPos(g);
  let bob = 0;
  if (g.state === "house") bob = Math.sin(G.time * 3.4 + g.phase) * 0.045;
  const r = 0.46;

  ctx.save();
  ctx.translate(pos.x, pos.y + bob);

  if (g.state === "eyes") {
    ctx.shadowColor = "#cfe6ff";
    ctx.shadowBlur = view.S * 0.45;
    drawGhostEyes(g, r, true);
    ctx.restore();
    return;
  }

  ctx.shadowColor = frightened ? "#4f7bff" : color;
  ctx.shadowBlur = view.S * 0.55;

  const grad = ctx.createLinearGradient(0, -r, 0, r);
  if (frightened) {
    const flash = G.frightTimer < 1.8 && Math.floor(G.frightTimer * 10) % 2 === 0;
    grad.addColorStop(0, flash ? "#f4f6ff" : "#5a7bff");
    grad.addColorStop(1, flash ? "#94a4ff" : "#2036c8");
  } else {
    grad.addColorStop(0, lighten(color));
    grad.addColorStop(1, color);
  }
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(-r, r * 0.92);
  ctx.lineTo(-r, -0.06);
  ctx.arc(0, -0.06, r, Math.PI, 0, false);
  ctx.lineTo(r, r * 0.92);
  const wave = Math.sin(G.time * 10 + g.phase) * 0.045;
  for (let i = 0; i < 3; i++) {
    const x0 = r - i * ((2 * r) / 3);
    const x1 = x0 - (2 * r) / 3;
    const mid = (x0 + x1) / 2;
    const dip = r * 0.66 + (i % 2 === 0 ? wave : -wave);
    ctx.quadraticCurveTo(mid, dip, x1, r * 0.92);
  }
  ctx.closePath();
  ctx.fill();

  if (frightened) {
    const flash = G.frightTimer < 1.8 && Math.floor(G.frightTimer * 10) % 2 === 0;
    ctx.fillStyle = flash ? "#2636a8" : "#f2f6ff";
    ctx.beginPath();
    ctx.arc(-0.16, -0.1, 0.072, 0, Math.PI * 2);
    ctx.arc(0.16, -0.1, 0.072, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = flash ? "#2636a8" : "#f2f6ff";
    ctx.lineWidth = 0.055;
    ctx.beginPath();
    ctx.moveTo(-0.24, 0.2);
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(-0.24 + (i + 0.5) * 0.12, 0.14);
      ctx.lineTo(-0.24 + (i + 1) * 0.12, 0.2);
    }
    ctx.stroke();
  } else {
    drawGhostEyes(g, r, false);
  }
  ctx.restore();
}

function drawGhostEyes(g, r, onlyEyes) {
  let lookX = g.dir.x * 0.055;
  let lookY = g.dir.y * 0.055;
  if (g.state === "eyes" || G.frightTimer <= 0) {
    const pos = entityPos(g);
    const dx = pac.c + 0.5 - pos.x;
    const dy = pac.r + 0.5 - pos.y;
    const len = Math.hypot(dx, dy) || 1;
    lookX = (dx / len) * 0.045;
    lookY = (dy / len) * 0.045;
  }
  const eyeY = -0.12;
  for (const side of [-1, 1]) {
    ctx.fillStyle = onlyEyes ? "rgba(255,255,255,0.92)" : "#ffffff";
    ctx.beginPath();
    ctx.ellipse(side * 0.17, eyeY, 0.125, 0.155, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2336ff";
    ctx.beginPath();
    ctx.arc(side * 0.17 + lookX, eyeY + lookY, 0.062, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lighten(hex) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((num >> 16) & 255) + 52);
  const g = Math.min(255, ((num >> 8) & 255) + 52);
  const b = Math.min(255, (num & 255) + 52);
  return `rgb(${r},${g},${b})`;
}

function drawActors() {
  for (const g of ghosts) {
    const frightened = G.frightTimer > 0 && (g.state === "active" || g.state === "leaving");
    drawGhostBody(g, g.color, frightened);
  }
  drawPac();
}

function drawParticles() {
  if (!G.particles.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of G.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters() {
  if (!G.floaters.length) return;
  const sizePx = Math.max(11, view.S * 0.48);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${sizePx}px ui-monospace, monospace`;
  for (const f of G.floaters) {
    const a = Math.max(0, Math.min(1, f.life / 0.5));
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = sizePx * 0.55;
    ctx.fillText(f.text, view.ox + f.x * view.S, view.oy + f.y * view.S);
  }
  ctx.restore();
}

function drawCenterMessage() {
  if (G.mode === "ready") {
    const title = G.readyTimer > 0.9 ? "READY!" : "GO!";
    drawCenteredText(title, 17.1, 1.05, "#ffe14a");
    if (G.readyTimer > 0.9) {
      const hint = G.level === 1 ? "SWIPE OR D-PAD TO STEER" : `GHOSTS REMEMBER ${Math.round(familiarity * 100)}%`;
      drawCenteredText(hint, 18.45, 0.28, G.level === 1 ? "#4ff0ff" : "#ff8fe0");
    }
  } else if (G.mode === "levelclear") {
    drawCenteredText("LEVEL CLEAR", 17.0, 0.9, "#4ff0ff");
    drawCenteredText(`MEMORY RETAINED ${Math.round(familiarity * 100)}%`, 18.5, 0.28, "#ff8fe0");
  } else if (G.mode === "paused") {
    drawCenteredText("PAUSED", 17.0, 0.9, "#a9bbff");
  }
}

function drawCenteredText(text, y, size, color) {
  const sizePx = Math.max(11, size * view.S);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${sizePx}px "Arial Black", Arial, sans-serif`;
  ctx.lineWidth = Math.max(2, sizePx * 0.11);
  ctx.strokeStyle = "rgba(4, 5, 12, 0.88)";
  ctx.strokeText(text, view.ox + (COLS / 2) * view.S, view.oy + y * view.S);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = sizePx * 0.5;
  ctx.fillText(text, view.ox + (COLS / 2) * view.S, view.oy + y * view.S);
  ctx.restore();
}

function render() {
  if (!canvas.width || !canvas.height) return;
  drawMaze();
  drawHeatOverlay();
  drawDoor();
  drawPellets();
  drawShard();
  drawActors();
  drawParticles();
  drawFloaters();
  drawCenterMessage();
}
