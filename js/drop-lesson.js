// js/drop-lesson.js
import { Lessons } from "./lessons.js";
import { Sound } from "./sound.js";

export const DropLesson = (() => {
  const state = {
    running: false,
    paused: false,
    over: false,
    totalSec: 45,
    remain: 45,
    timer: null,
    loopId: null,
    lastFrame: 0,
    nextSpawn: 0,
    fallSpeed: 120,   // px/sec
    spawnMs: 2100,
    generator: null,
    items: [],
    score: 0,
    ok: 0,
    ng: 0,
  };

  const el = () => ({
    area: document.getElementById("drop-area"),
    remain: document.getElementById("drop-remain"),
    score: document.getElementById("drop-score"),
    ok: document.getElementById("drop-ok"),
    ng: document.getElementById("drop-ng"),
    status: document.getElementById("drop-status"),
    lesson: document.getElementById("drop-lesson-name"),
    meta: document.getElementById("drop-lesson-meta"),
    playCount: document.getElementById("drop-play-count"),
    mute: document.getElementById("drop-mute"),
  });

  // keycode → 文字
  function codeToChar(code, key) {
    if (!code) return null;
    const m = code.match(/^Key([A-Z])$/);
    if (m) return m[1].toLowerCase();
    const d = code.match(/^Digit([0-9])$/);
    if (d) return d[1];
    const map = {
      Space: " ",
      Semicolon: ";",
      Comma: ",",
      Period: ".",
      Minus: "-",
      Equal: "=",
      Slash: "/",
    };
    if (map[code]) return map[code];
    // fallback: 1文字だけの e.key
    if (key && key.length === 1) return key.toLowerCase();
    return null;
  }

  function setStatus(msg) {
    const E = el();
    if (E.status) E.status.textContent = msg;
  }

  function updateHUD() {
    const E = el();
    if (E.remain) E.remain.textContent = String(state.remain);
    if (E.score) E.score.textContent = String(state.score);
    if (E.ok) E.ok.textContent = String(state.ok);
    if (E.ng) E.ng.textContent = String(state.ng);
    if (E.playCount) E.playCount.textContent = String(state.playCount);
  }

  function clearItems() {
    state.items.forEach(item => item.el?.remove());
    state.items = [];
  }

  function nextCharFromGenerator() {
    const raw = state.generator ? state.generator() : "";
    const s = String(raw || "").replace(/\s+/g, "");
    return s[0] || "";
  }

  function spawnLength() {
    const elapsed = state.totalSec - state.remain;
    if (elapsed < 10) return 1;
    if (elapsed < 15) return 2;
    return 3; // 15秒以降は3文字
  }

  function makeWord(len) {
    const chars = [];
    for (let i = 0; i < len; i++) {
      const c = nextCharFromGenerator();
      chars.push(c || "a");
    }
    return chars.join("");
  }

  function renderItem(item) {
    if (!item?.el) return;
    const upper = item.word.toUpperCase();
    const lower = item.word.toLowerCase();
    const t = item.typed;
    const upperTyped = upper.slice(0, t);
    const upperNext = upper[t] || "";
    const upperRest = upper.slice(t + 1);
    const lowerTyped = lower.slice(0, t);
    const lowerNext = lower[t] || "";
    const lowerRest = lower.slice(t + 1);

    item.el.innerHTML = `
      <span class="upper"><span class="hit">${upperTyped}</span><span class="next">${upperNext}</span><span>${upperRest}</span></span>
      <span class="lower"><span class="hit">${lowerTyped}</span><span class="next">${lowerNext}</span><span>${lowerRest}</span></span>
    `;
    item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
  }

  function spawnItem() {
    if (!state.running || state.paused) return;
    const word = makeWord(spawnLength());
    const area = el().area;
    if (!word || !area) return;
    const maxX = Math.max(0, (area.clientWidth || 0) - 120);
    const x = Math.random() * maxX + 12;
    const item = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
      word,
      typed: 0,
      x,
      y: -32,
      el: document.createElement("div"),
    };
    item.el.className = "drop-item alpha";
    area.appendChild(item.el);
    state.items.push(item);
    renderItem(item);
  }

  function removeItem(item) {
    state.items = state.items.filter(i => i.id !== item.id);
    item.el?.remove();
  }

  function missItem(item) {
    state.ng++;
    Sound.beep();
    removeItem(item);
    updateHUD();
  }

  function pickTarget() {
    if (!state.items.length) return null;
    // 一番下に近いものを優先
    return state.items.reduce((a, b) => (b.y > a.y ? b : a));
  }

  function updateDifficulty() {
    const progress = Math.max(0, Math.min(1, 1 - state.remain / state.totalSec));
    const spawnDelayFactor = 1.2;                 // 20% 遅らせる
    state.fallSpeed = 110 + progress * 50;        // 110 → 160
    state.spawnMs = (2100 - progress * 700) * spawnDelayFactor; // 2100→1400 を20%遅延
  }

  function loop(ts) {
    if (!state.running) return;
    const area = el().area;
    const limit = area ? area.clientHeight - 28 : 0;
    const dt = state.lastFrame ? (ts - state.lastFrame) / 1000 : 0;
    state.lastFrame = ts;

    if (!state.paused) {
      const itemsNow = [...state.items];
      for (const item of itemsNow) {
        item.y += dt * state.fallSpeed;
        if (item.y >= limit) {
          missItem(item);
        } else {
          renderItem(item);
        }
      }
      if (ts >= state.nextSpawn) {
        spawnItem();
        state.nextSpawn = ts + state.spawnMs;
      }
    }

    state.loopId = requestAnimationFrame(loop);
  }

  function tick() {
    if (state.paused || !state.running) return;
    state.remain--;
    updateDifficulty();
    updateHUD();
    if (state.remain <= 0) {
      finish();
    }
  }

  function start() {
    if (state.running && !state.paused) return;
    if (!state.generator) {
      setStatus("レッスンを選び直してください");
      return;
    }
    Sound.init?.();

    state.running = true;
    state.paused = false;
    state.over = false;
    state.remain = state.totalSec;
    state.score = 0;
    state.ok = 0;
    state.ng = 0;
    if (!Number.isFinite(state.playCount)) state.playCount = 0;
    state.playCount += 1;
    try { localStorage.setItem("dropPlayCount", String(state.playCount)); } catch (_) {}
    state.lastFrame = 0;
    state.nextSpawn = performance.now() + 400;
    clearItems();
    updateDifficulty();
    updateHUD();
    setStatus("がんばれ！ Spaceで開始 / Escで一時停止");

    clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
    cancelAnimationFrame(state.loopId);
    state.loopId = requestAnimationFrame(loop);
    spawnItem();
  }

  function pause() {
    if (!state.running || state.over) return;
    state.paused = true;
    setStatus("一時停止中（Enterで再開）");
  }

  function finish() {
    state.running = false;
    state.over = true;
    clearInterval(state.timer);
    cancelAnimationFrame(state.loopId);
    clearItems();
    setStatus(`終了！ スコア ${state.score} / 正打 ${state.ok} ミス ${state.ng}`);
  }

  function reset() {
    clearInterval(state.timer);
    cancelAnimationFrame(state.loopId);
    state.running = false;
    state.paused = false;
    state.over = false;
    state.remain = state.totalSec;
    state.ok = 0;
    state.ng = 0;
    state.score = 0;
    clearItems();
    updateHUD();
    setStatus("Spaceで開始 / Escで一時停止");
  }

  function handleKeydown(e) {
    if (e.isComposing) return;
    if (e.code === "Space" && !state.running) { e.preventDefault(); start(); return; }
    if (e.key === "Escape") { pause(); return; }
    if (e.key === "Enter" && state.paused) { state.paused = false; setStatus("再開！"); return; }
    if (!state.running || state.paused || state.over) return;

    const ch = codeToChar(e.code, e.key);
    if (!ch) return;

    const target = pickTarget();
    if (!target) return;
    const need = target.word[target.typed];
    if (!need) return;

    if (ch === need) {
      state.ok++;
      state.score++;
      target.typed++;
      Sound.click();

      if (target.typed >= target.word.length) {
        state.score += 2; // クリアボーナス
        Sound.success();
        removeItem(target);
      } else {
        renderItem(target);
      }
    } else {
      state.ng++;
      Sound.beep();
    }
    updateHUD();
  }

  async function mount() {
    const jsonUrl = sessionStorage.getItem("selectedLessonJson") || "./data/lessons1.json";
    const drillId = sessionStorage.getItem("selectedLessonId") || "";

    try {
      await Lessons.load(jsonUrl);
      const lesson = Lessons.get(drillId);
      state.totalSec = lesson?.durationSec || 45;
      state.remain = state.totalSec;
      state.generator = Lessons.makeGenerator(lesson);

      const E = el();
      if (E.lesson) E.lesson.textContent = lesson ? lesson.title : "レッスン未選択";
      if (E.meta) E.meta.textContent = lesson ? `時間 ${state.totalSec}s / モード ${lesson.mode || "drill"}` : "Lesson を選んでね";
    } catch (err) {
      console.error(err);
      setStatus("レッスン読み込みに失敗しました");
    }

    const E = el();
    document.getElementById("btn-drop-start")?.addEventListener("click", start);
    document.getElementById("btn-drop-pause")?.addEventListener("click", pause);
    document.getElementById("btn-drop-reset")?.addEventListener("click", reset);

    if (E.mute) {
      Sound.setMute(E.mute.checked);
      E.mute.addEventListener("change", () => Sound.setMute(E.mute.checked));
    }
    try {
      const stored = localStorage.getItem("dropPlayCount");
      const n = Number.parseInt(stored, 10);
      state.playCount = Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (_) { state.playCount = 0; }

    updateHUD();
    setStatus("Spaceで開始 / Escで一時停止");
    window.addEventListener("keydown", handleKeydown);
  }

  function unmount() {
    reset();
    window.removeEventListener("keydown", handleKeydown);
  }

  return { mount, unmount };
})();
