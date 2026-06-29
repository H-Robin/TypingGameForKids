import { Sound } from "./sound.js";

export const ColorBarGame = (() => {
  const LEFT_KEYS = "qwertasdfgzxcvb".split("");
  const RIGHT_KEYS = "yuiophjklnm".split("");
  const COLORS = [
    { name: "red", label: "赤", side: "left", fill: "#ef4444" },
    { name: "yellow", label: "黄", side: "left", fill: "#facc15" },
    { name: "blue", label: "青", side: "right", fill: "#3b82f6" },
    { name: "green", label: "緑", side: "right", fill: "#22c55e" },
  ];

  const TOTAL_BALLS = 75;
  const GAME_BPM = 25;
  const PLAY_TIME_MS = 30000;
  const SPREAD_DEG = 5;
  const BAR_ANGLE = { neutral: 0, left: -90, right: 90 };
  const BAR_SWING_DEG_PER_SEC = 360;
  const FLIPPER_RESTITUTION = 0.88;
  const FLIPPER_ENERGY_TRANSFER = 0.18;

  const state = {
    running: false,
    over: false,
    playerSide: "neutral",
    barAngle: 0,
    targetBarAngle: 0,
    barAngularVelocity: 0,
    leftKey: "a",
    rightKey: "j",
    score: 0,
    miss: 0,
    streak: 0,
    combo: 0,
    timeLeftMs: PLAY_TIME_MS,
    startedAt: 0,
    spawned: 0,
    settled: 0,
    active: [],
    loopId: 0,
    lastFrame: 0,
    nextSpawnAt: 0,
    mounted: false,
    w: 430,
    h: 700,
    ctx: null,
    hitCanvas: null,
    hitCtx: null,
    resizeHandler: null,
    boundStart: null,
    boundReset: null,
    canvasElement: null,
  };

  const el = () => ({
    field: document.getElementById("colorBarField"),
    canvas: document.getElementById("colorBarCanvas"),
    score: document.getElementById("colorBarScore"),
    miss: document.getElementById("colorBarMiss"),
    time: document.getElementById("colorBarTime"),
    streak: document.getElementById("colorBarStreak"),
    combo: document.getElementById("colorBarCombo"),
    bpm: document.getElementById("colorBarBpm"),
    status: document.getElementById("colorBarStatus"),
    start: document.getElementById("colorBarStart"),
    reset: document.getElementById("colorBarReset"),
  });

  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function currentBpm() {
    return GAME_BPM;
  }

  function spawnIntervalMs() {
    return 60000 / currentBpm();
  }

  function speedForBpm(bpm) {
    return Math.max(34, state.h * bpm / 150);
  }

  function fallSpeed() {
    return speedForBpm(currentBpm());
  }

  function setStatus(text) {
    const E = el();
    if (E.status) E.status.textContent = text;
  }

  function updateKeys() {
    state.leftKey = randomFrom(LEFT_KEYS);
    state.rightKey = randomFrom(RIGHT_KEYS);
  }

  function updateHud() {
    const E = el();
    if (E.score) E.score.textContent = String(state.score);
    if (E.miss) E.miss.textContent = String(state.miss);
    if (E.time) E.time.textContent = formatTime(state.timeLeftMs);
    if (E.streak) E.streak.textContent = String(state.streak);
    if (E.combo) E.combo.textContent = String(state.combo);
    if (E.bpm) E.bpm.textContent = String(currentBpm());
  }

  function formatTime(ms) {
    const clamped = Math.max(0, Math.ceil(ms));
    const sec = Math.floor(clamped / 1000);
    const centi = Math.floor((clamped % 1000) / 10);
    return `${String(sec).padStart(2, "0")}s:${String(centi).padStart(2, "0")}`;
  }

  function setupCanvas() {
    const E = el();
    if (!E.field || !E.canvas) return;

    const rect = E.field.getBoundingClientRect();
    const compact = window.matchMedia?.("(max-width: 720px)")?.matches;
    const maxStageWidth = compact ? 380 : 430;
    const availableWidth = Math.max(280, Math.min(maxStageWidth, Math.floor((window.innerWidth || maxStageWidth) * 0.96)));
    const measuredWidth = rect.width > 0 ? Math.round(rect.width) : availableWidth;
    state.w = Math.max(280, Math.min(maxStageWidth, availableWidth, measuredWidth));
    state.h = Math.round(state.w * 70 / 43);

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    E.canvas.width = Math.round(state.w * dpr);
    E.canvas.height = Math.round(state.h * dpr);
    E.canvas.style.width = "100%";
    E.canvas.style.height = "100%";

    const ctx = E.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.ctx = ctx;
    state.canvasElement = E.canvas;

    state.hitCanvas = document.createElement("canvas");
    state.hitCanvas.width = state.w;
    state.hitCanvas.height = state.h;
    state.hitCtx = state.hitCanvas.getContext("2d", { willReadFrequently: true });
  }

  function clearBalls() {
    state.active = [];
  }

  function ballRadius() {
    return Math.max(14, Math.min(22, state.w * 0.05));
  }

  function spawnBall(ts) {
    if (state.spawned >= TOTAL_BALLS) return;

    state.spawned += 1;
    const color = randomFrom(COLORS);
    const angle = ((Math.random() * 2 - 1) * SPREAD_DEG) * Math.PI / 180;
    const speed = fallSpeed();
    const radius = ballRadius();
    state.active.push({
      id: `${Date.now()}-${Math.random()}`,
      color,
      x: state.w / 2,
      y: -radius,
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      radius,
      phase: "falling",
    });
    state.nextSpawnAt = ts + spawnIntervalMs();
    updateHud();
  }

  function award(isCorrect, message) {
    if (isCorrect) {
      state.score += 1;
      state.streak += 1;
      if (state.streak % 5 === 0) {
        state.combo += 1;
        Sound.success();
      } else {
        Sound.click();
      }
    } else {
      state.score -= 1;
      state.miss += 1;
      state.streak = 0;
      Sound.beep();
    }
    setStatus(message);
    updateHud();
  }

  function settleBall(ball, pocketSide, message) {
    state.active = state.active.filter(item => item.id !== ball.id);
    state.settled += 1;

    if (!pocketSide) {
      setStatus(message || "ポケットに入らず 0");
      updateHud();
    } else if (ball.color.side === pocketSide) {
      award(true, `${ball.color.label}を正しいポケットへ +1`);
    } else {
      award(false, `${ball.color.label}が違うポケットへ -1`);
    }

    if (state.settled >= TOTAL_BALLS && state.active.length === 0) finish();
  }

  function pivot() {
    return { x: state.w / 2, y: state.h * 0.92 };
  }

  function barMetrics() {
    return {
      width: 24,
      length: Math.min(state.h * 0.31, 190),
      pivot: pivot(),
      angleRad: state.barAngle * Math.PI / 180,
    };
  }

  function pocketRect(side) {
    const w = Math.min(state.w * 0.22, 104);
    const h = Math.min(state.h * 0.15, 92);
    return {
      x: side === "left" ? 0 : state.w - w,
      y: state.h * 0.7,
      w,
      h,
    };
  }

  function sideEnteredPocket(ball) {
    for (const side of ["left", "right"]) {
      const rect = pocketRect(side);
      if (ball.x >= rect.x && ball.x <= rect.x + rect.w && ball.y >= rect.y && ball.y <= rect.y + rect.h) {
        return side;
      }
    }
    return null;
  }

  function updateBarAngle(dt) {
    const before = state.barAngle;
    const diff = state.targetBarAngle - state.barAngle;
    const maxStep = BAR_SWING_DEG_PER_SEC * dt;
    if (Math.abs(diff) <= maxStep) {
      state.barAngle = state.targetBarAngle;
    } else {
      state.barAngle += Math.sign(diff) * maxStep;
    }
    state.barAngularVelocity = dt > 0 ? (state.barAngle - before) / dt : 0;
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function fillRoundedRect(ctx, x, y, w, h, r, fill) {
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawStage(ctx) {
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(0, 0, state.w, state.h);

    ctx.strokeStyle = "rgba(74, 52, 32, 0.18)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(state.w / 2, 0);
    ctx.lineTo(state.w / 2, state.h);
    ctx.stroke();

    fillRoundedRect(ctx, state.w * 0.31, 0, state.w * 0.38, state.h * 0.14, 12, "#c56517");
    fillRoundedRect(ctx, state.w * 0.36, state.h * 0.04, state.w * 0.28, state.h * 0.06, 5, "#8f3d0f");

    fillRoundedRect(ctx, state.w * 0.24, state.h * 0.08, state.w * 0.52, state.h * 0.78, 10, "#d29b4f");
    fillRoundedRect(ctx, state.w * 0.14, state.h * 0.8, state.w * 0.72, state.h * 0.2, 10, "#d6a55c");

    drawPocket(ctx, "left");
    drawPocket(ctx, "right");
    drawKeyHint(ctx, "left", state.leftKey);
    drawKeyHint(ctx, "right", state.rightKey);

    ctx.save();
    ctx.translate(state.w / 2, state.h * 0.9);
    ctx.scale(1, 0.72);
    ctx.strokeStyle = "rgba(217, 86, 164, 0.82)";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(state.w * 0.14, 65), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPocket(ctx, side) {
    const rect = pocketRect(side);
    fillRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8, "#1597ca");
    ctx.strokeStyle = "#006ca1";
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.stroke();

    const colors = side === "left" ? ["#ff1f14", "#eaff00"] : ["#1251ff", "#078963"];
    colors.forEach((fill, idx) => {
      const cx = rect.x + rect.w * (0.36 + idx * 0.28);
      const cy = rect.y + rect.h * (0.44 + idx * 0.12);
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;
      ctx.arc(cx, cy, Math.min(18, rect.w * 0.18), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawKeyHint(ctx, side, key) {
    const radius = Math.max(28, Math.min(41, state.w * 0.08));
    const pocket = pocketRect(side);
    const x = pocket.x + pocket.w / 2;
    const y = Math.min(state.h - radius - 10, pocket.y + pocket.h + radius + 10);
    const pressed = state.playerSide === side;
    ctx.beginPath();
    ctx.fillStyle = pressed ? "#f9a8d4" : "#f8fafc";
    ctx.strokeStyle = pressed ? "#be185d" : "#0f172a";
    ctx.lineWidth = 4;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = side === "left" ? "#dc2626" : "#2563eb";
    ctx.font = `900 ${Math.round(radius * 1.2)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(key.toUpperCase(), x, y + 1);
  }

  function drawFlipper(ctx, mode = "display") {
    const { width, length, pivot: p, angleRad } = barMetrics();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angleRad);

    if (mode === "hit") {
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-width / 2, -length, width / 2, length);
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(0, -length, width / 2, length);
      ctx.restore();
      return;
    }

    ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#ff3434";
    fillRoundedRect(ctx, -width / 2, -length, width / 2, length, 8, "#ff3434");
    ctx.fillStyle = "#2f6dff";
    fillRoundedRect(ctx, 0, -length, width / 2, length, 8, "#2f6dff");
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, -width / 2, -length, width, length, 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawBalls(ctx) {
    for (const ball of state.active) {
      ctx.beginPath();
      ctx.fillStyle = ball.color.fill;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
      ctx.lineWidth = 2;
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.arc(ball.x + ball.radius * 0.32, ball.y - ball.radius * 0.28, ball.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function flipperGeometry() {
    const { width, length, pivot: p, angleRad } = barMetrics();
    return {
      width,
      length,
      pivot: p,
      angleRad,
      along: { x: Math.sin(angleRad), y: -Math.cos(angleRad) },
      across: { x: Math.cos(angleRad), y: Math.sin(angleRad) },
    };
  }

  function closestPointOnFlipper(ball) {
    const geom = flipperGeometry();
    const relX = ball.x - geom.pivot.x;
    const relY = ball.y - geom.pivot.y;
    const alongPos = relX * geom.along.x + relY * geom.along.y;
    const acrossPos = relX * geom.across.x + relY * geom.across.y;
    const halfWidth = geom.width / 2;
    const clampedAlong = clamp(alongPos, 0, geom.length);
    const clampedAcross = clamp(acrossPos, -halfWidth, halfWidth);

    return {
      geom,
      alongPos,
      acrossPos,
      clampedAlong,
      clampedAcross,
      x: geom.pivot.x + geom.along.x * clampedAlong + geom.across.x * clampedAcross,
      y: geom.pivot.y + geom.along.y * clampedAlong + geom.across.y * clampedAcross,
    };
  }

  function edgeNormal(point) {
    const { geom, alongPos, acrossPos } = point;
    const halfWidth = geom.width / 2;
    const distances = [
      { d: Math.abs(acrossPos + halfWidth), x: -geom.across.x, y: -geom.across.y },
      { d: Math.abs(halfWidth - acrossPos), x: geom.across.x, y: geom.across.y },
      { d: Math.abs(alongPos), x: -geom.along.x, y: -geom.along.y },
      { d: Math.abs(geom.length - alongPos), x: geom.along.x, y: geom.along.y },
    ];
    distances.sort((a, b) => a.d - b.d);
    return { x: distances[0].x, y: distances[0].y };
  }

  function surfaceVelocityAt(point) {
    const angularVelocity = state.barAngularVelocity * Math.PI / 180;
    const angle = point.geom.angleRad;
    const u = point.clampedAlong;
    const v = point.clampedAcross;
    const dxDa = Math.cos(angle) * u - Math.sin(angle) * v;
    const dyDa = Math.sin(angle) * u + Math.cos(angle) * v;
    return {
      x: dxDa * angularVelocity * FLIPPER_ENERGY_TRANSFER,
      y: dyDa * angularVelocity * FLIPPER_ENERGY_TRANSFER,
    };
  }

  function detectFlipperHit(ball) {
    const point = closestPointOnFlipper(ball);
    const dx = ball.x - point.x;
    const dy = ball.y - point.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > ball.radius * ball.radius) return null;

    const distance = Math.sqrt(distanceSq);
    let normal;
    if (distance > 0.001) {
      normal = { x: dx / distance, y: dy / distance };
    } else {
      normal = edgeNormal(point);
    }

    return {
      x: point.x,
      y: point.y,
      normal,
      surfaceVelocity: surfaceVelocityAt(point),
    };
  }

  function limitBounceSpeed(ball) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const min = fallSpeed() * 0.75;
    const max = fallSpeed() * 1.85;
    if (speed < 0.001) return;
    if (speed < min || speed > max) {
      const target = clamp(speed, min, max);
      ball.vx = ball.vx / speed * target;
      ball.vy = ball.vy / speed * target;
    }
  }

  function bounceBall(ball, hit) {
    const sx = hit.surfaceVelocity.x;
    const sy = hit.surfaceVelocity.y;
    let vx = ball.vx - sx;
    let vy = ball.vy - sy;
    const impact = vx * hit.normal.x + vy * hit.normal.y;

    if (impact < 0) {
      vx -= (1 + FLIPPER_RESTITUTION) * impact * hit.normal.x;
      vy -= (1 + FLIPPER_RESTITUTION) * impact * hit.normal.y;
    }

    let nextVx = vx + sx;
    let nextVy = vy + sy;
    const separating = (nextVx - sx) * hit.normal.x + (nextVy - sy) * hit.normal.y;
    const minSeparating = fallSpeed() * 0.18;
    if (separating < minSeparating) {
      const add = minSeparating - separating;
      nextVx += hit.normal.x * add;
      nextVy += hit.normal.y * add;
    }

    ball.x = hit.x + hit.normal.x * (ball.radius + 0.8);
    ball.y = hit.y + hit.normal.y * (ball.radius + 0.8);
    ball.vx = nextVx;
    ball.vy = nextVy;
    limitBounceSpeed(ball);
    ball.phase = "bounced";
    Sound.click();
  }

  function draw() {
    if (!state.ctx) return;
    drawStage(state.ctx);
    drawBalls(state.ctx);
    drawFlipper(state.ctx, "display");
  }

  function loop(ts) {
    const dt = state.lastFrame ? Math.min(0.04, (ts - state.lastFrame) / 1000) : 0;
    state.lastFrame = ts;
    updateBarAngle(dt);

    if (state.running) {
      state.timeLeftMs = Math.max(0, PLAY_TIME_MS - (ts - state.startedAt));
      updateHud();

      if (state.timeLeftMs <= 0) {
        finish();
      } else {
        if (state.spawned < TOTAL_BALLS && ts >= state.nextSpawnAt) spawnBall(ts);

        for (const ball of [...state.active]) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          if (ball.phase === "falling") {
            const hit = detectFlipperHit(ball);
            if (hit) {
              bounceBall(ball, hit);
              continue;
            }
          }

          if (ball.phase === "bounced") {
            const pocketSide = sideEnteredPocket(ball);
            if (pocketSide) {
              settleBall(ball, pocketSide);
              continue;
            }
          }

          const out = ball.y > state.h + ball.radius || ball.x < -ball.radius || ball.x > state.w + ball.radius;
          if (out) {
            const message = ball.phase === "falling" ? "バーに当たらず 0" : "ポケットに入らず 0";
            settleBall(ball, null, message);
          }
        }
      }
    }

    draw();
    state.loopId = requestAnimationFrame(loop);
  }

  function start() {
    if (state.running) return;
    Sound.init?.();
    setupCanvas();
    state.running = true;
    state.over = false;
    state.playerSide = "neutral";
    state.barAngle = 0;
    state.targetBarAngle = 0;
    state.barAngularVelocity = 0;
    state.timeLeftMs = PLAY_TIME_MS;
    state.startedAt = performance.now();
    state.score = 0;
    state.miss = 0;
    state.streak = 0;
    state.combo = 0;
    state.spawned = 0;
    state.settled = 0;
    state.lastFrame = 0;
    state.nextSpawnAt = performance.now();
    clearBalls();
    updateHud();
    setStatus("色を見て、左右のキーでバーを動かそう");
    draw();
    state.loopId = requestAnimationFrame(loop);
  }

  function finish() {
    state.running = false;
    state.over = true;
    clearBalls();
    draw();
    updateHud();
    setStatus(`できた！ 得点 ${state.score} / ここだけ直そう ${state.miss}`);
  }

  function reset() {
    state.running = false;
    state.over = false;
    clearBalls();
    state.playerSide = "neutral";
    state.barAngle = 0;
    state.targetBarAngle = 0;
    state.barAngularVelocity = 0;
    state.timeLeftMs = PLAY_TIME_MS;
    state.startedAt = 0;
    state.score = 0;
    state.miss = 0;
    state.streak = 0;
    state.combo = 0;
    state.spawned = 0;
    state.settled = 0;
    updateKeys();
    updateHud();
    setStatus("Spaceで開始");
    draw();
  }

  function movePlayer(side) {
    state.playerSide = side;
    state.targetBarAngle = BAR_ANGLE[side];
    updateHud();
  }

  function codeToChar(code, key) {
    const match = String(code || "").match(/^Key([A-Z])$/);
    if (match) return match[1].toLowerCase();
    return key && key.length === 1 ? key.toLowerCase() : "";
  }

  function handleKeydown(e) {
    if (e.isComposing) return;
    if (e.code === "Space") {
      e.preventDefault();
      start();
      return;
    }
    const ch = codeToChar(e.code, e.key);
    if (!ch) return;
    if (ch === state.leftKey) {
      e.preventDefault();
      movePlayer("left");
    } else if (ch === state.rightKey) {
      e.preventDefault();
      movePlayer("right");
    }
  }

  function handleKeyup(e) {
    if (e.isComposing) return;
    const ch = codeToChar(e.code, e.key);
    if (!ch) return;
    if ((state.playerSide === "left" && ch === state.leftKey) ||
        (state.playerSide === "right" && ch === state.rightKey)) {
      e.preventDefault();
      state.playerSide = "neutral";
      state.targetBarAngle = BAR_ANGLE.neutral;
      updateHud();
    }
  }

  function mount() {
    if (state.mounted) unmount();
    state.mounted = true;
    setupCanvas();
    const E = el();
    state.boundStart = E.start;
    state.boundReset = E.reset;
    E.start?.addEventListener("click", start);
    E.reset?.addEventListener("click", reset);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    state.resizeHandler = () => {
      setupCanvas();
      draw();
    };
    window.addEventListener("resize", state.resizeHandler);
    reset();
    requestAnimationFrame(() => {
      if (!state.mounted) return;
      setupCanvas();
      draw();
    });
    state.lastFrame = 0;
    state.loopId = requestAnimationFrame(loop);
  }

  function unmount() {
    state.running = false;
    state.over = false;
    clearBalls();
    cancelAnimationFrame(state.loopId);
    state.boundStart?.removeEventListener("click", start);
    state.boundReset?.removeEventListener("click", reset);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
    if (state.resizeHandler) window.removeEventListener("resize", state.resizeHandler);
    state.ctx = null;
    state.hitCanvas = null;
    state.hitCtx = null;
    state.resizeHandler = null;
    state.boundStart = null;
    state.boundReset = null;
    state.canvasElement = null;
    state.mounted = false;
  }

  return { mount, unmount };
})();
