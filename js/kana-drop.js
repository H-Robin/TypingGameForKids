// js/kana-drop.js
import { Sound } from "./sound.js";

export const KanaDrop = (() => {
  const JSON_URL = "./data/kana_lessons.json";
  const ROMA2KANA = {
    a:"あ", i:"い", u:"う", e:"え", o:"お",
    ka:"か", ki:"き", ku:"く", ke:"け", ko:"こ",
    sa:"さ", shi:"し", si:"し", su:"す", se:"せ", so:"そ",
    ta:"た", chi:"ち", ti:"ち", tsu:"つ", tu:"つ", te:"て", to:"と",
    na:"な", ni:"に", nu:"ぬ", ne:"ね", no:"の",
    ha:"は", hi:"ひ", fu:"ふ", hu:"ふ", he:"へ", ho:"ほ",
    ma:"ま", mi:"み", mu:"む", me:"め", mo:"も",
    ya:"や", yu:"ゆ", yo:"よ",
    ra:"ら", ri:"り", ru:"る", re:"れ", ro:"ろ",
    wa:"わ", wo:"を", n:"ん"
  };

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
    fallSpeed: 120,
    spawnMs: 2100,
    generator: null, // () => { kana, roma }
    items: [],
    score: 0,
    ok: 0,
    ng: 0,
  };

  const el = () => ({
    area: document.getElementById("kdrop-area"),
    remain: document.getElementById("kdrop-remain"),
    score: document.getElementById("kdrop-score"),
    ok: document.getElementById("kdrop-ok"),
    ng: document.getElementById("kdrop-ng"),
    status: document.getElementById("kdrop-status"),
    name: document.getElementById("kana-drop-name"),
    meta: document.getElementById("kana-drop-meta"),
    playCount: document.getElementById("kdrop-play-count"),
    mute: document.getElementById("kdrop-mute"),
  });

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
    state.items.forEach(i => i.el?.remove());
    state.items = [];
  }

  function renderItem(item) {
    if (!item.el) return;
    const displayRoma = item.roma.toUpperCase();
    const typed = displayRoma.slice(0, item.typed);
    const next = displayRoma[item.typed] || "";
    const rest = displayRoma.slice(item.typed + 1);
    item.el.innerHTML = `
      <span class="kana-big">${item.kana}</span>
      <span class="roma-mini"><span class="hit">${typed}</span><span class="next">${next}</span><span>${rest}</span></span>
    `;
    item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
  }

  function spawnItem() {
    if (!state.running || state.paused) return;
    const w = state.generator ? state.generator() : null;
    if (!w || !w.kana || !w.roma) return;
    const area = el().area;
    if (!area) return;
    const maxX = Math.max(0, (area.clientWidth || 0) - 140);
    const x = Math.random() * maxX + 12;
    const item = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
      kana: w.kana,
      roma: w.roma,
      typed: 0,
      x,
      y: -32,
      el: document.createElement("div"),
    };
    item.el.className = "drop-item kana";
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
    return state.items.reduce((a, b) => (b.y > a.y ? b : a));
  }

  function updateDifficulty() {
    const progress = Math.max(0, Math.min(1, 1 - state.remain / state.totalSec));
    const spawnDelayFactor = 1.2; // 20%遅らせる
    state.fallSpeed = 110 + progress * 50;
    state.spawnMs = (2100 - progress * 700) * spawnDelayFactor;
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
    if (state.remain <= 0) finish();
  }

  function start() {
    if (state.running && !state.paused) return;
    if (!state.generator) { setStatus("レッスンを選び直してください"); return; }
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
    try { localStorage.setItem("kdropPlayCount", String(state.playCount)); } catch (_) {}
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
    const need = target.roma[target.typed];
    if (!need) return;

    if (ch === need) {
      state.ok++;
      state.score++;
      target.typed++;
      Sound.click();

      if (target.typed >= target.roma.length) {
        state.score += 2;
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

  function makeGenerator(lesson) {
    const keys = (lesson?.generator?.keys || []).map(s => String(s).toLowerCase());
    return () => {
      if (!keys.length) return { kana: "あ", roma: "a" };
      const roma = keys[Math.floor(Math.random() * keys.length)];
      const kana = ROMA2KANA[roma] || roma;
      return { kana, roma };
    };
  }

  async function mount() {
    const idMatch = location.hash.match(/[?#&]id=([^&]+)/);
    const lessonId = idMatch ? decodeURIComponent(idMatch[1]) : null;

    try {
      const res = await fetch(JSON_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("kana_lessons.json load failed");
      const db = await res.json();
      const lesson = (db.lessons || []).find(l => l.id === lessonId);
      state.totalSec = lesson?.durationSec || 45;
      state.remain = state.totalSec;
      state.generator = makeGenerator(lesson);

      const E = el();
      if (E.name) E.name.textContent = lesson ? lesson.title : "レッスン未選択";
      if (E.meta) E.meta.textContent = lesson ? `時間 ${state.totalSec}s / ひらがな1文字×ローマ字入力` : "レッスンを選んでね";
    } catch (err) {
      console.error(err);
      setStatus("レッスン読み込みに失敗しました");
    }

    const E = el();
    document.getElementById("btn-kdrop-start")?.addEventListener("click", start);
    document.getElementById("btn-kdrop-pause")?.addEventListener("click", pause);
    document.getElementById("btn-kdrop-reset")?.addEventListener("click", reset);

    if (E.mute) {
      Sound.setMute(E.mute.checked);
      E.mute.addEventListener("change", () => Sound.setMute(E.mute.checked));
    }
    try {
      const stored = localStorage.getItem("kdropPlayCount");
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
