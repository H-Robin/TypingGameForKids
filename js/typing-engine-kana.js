// js/typing-engine-kana.js
import { Sound } from "./sound.js";

export const TypingEngineKana = (() => {
  const state = {
    running: false,
    paused: false,
    over: false,
    composing: false,
    totalSec: 45,
    remain: 45,
    timer: null,
    ok: 0,
    ng: 0,

    // 入力進捗
    typedRaw: "",
    seqRaw: "",      // 現在の「ローマ字の連結文字列」（判定は1文字ずつ）
    idx: 0,          // seqRaw のうち、既に正しく打鍵した文字数

    // 出題生成
    generator: null,

    // 2段表示のためのトークン情報
    kanaTokens: [],      // かなトークン配列（例: ["あ","い","う"]）
    romaTokens: [],      // ローマ字トークン配列（例: ["a","i","u"]）
    romaCumLens: [],     // ローマ字トークンの累積長（例: ["a","i","u"] → [1,2,3]）
  };

  // HUD（ひらがな用）
  const el = () => ({
    time: document.getElementById("remain"),
    wpm:  document.getElementById("wpm"),
    ok:   document.getElementById("ok"),
    ng:   document.getElementById("ng"),
    fb:   document.getElementById("fb"),
    romaLine: document.getElementById("roma-line"),
    kanaLine: document.getElementById("kana-line"),
  });

  // 文字→キーコード（ハイライト用）
  function charToCode(ch) {
    const u = (ch || "").toUpperCase();
    if (u >= "A" && u <= "Z") return "Key" + u;
    if (ch === " ") return "Space";
    if (ch === ";") return "Semicolon";
    if (ch === ",") return "Comma";
    if (ch === ".") return "Period";
    if (ch === "-") return "Minus";
    if (ch === "=") return "Equal";
    return null;
  }

  function codeToChar(code) {
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
    };
    return map[code] || null;
  }

  // ---- 2段表示 ユーティリティ ----
  function setTwoLineDisplay(romaString, kanaString) {
    const E = el();
    if (E.romaLine) E.romaLine.textContent = (romaString || "").split("").join(" ");
    if (E.kanaLine) E.kanaLine.textContent = kanaString || "";
  }

  function currentTokenIndexByCharIdx(charIdx) {
    // 累積長 romaCumLens = [1, 3, 5, ...]
    // charIdx = 打鍵済み文字数（0-based）
    // charIdx を超える最初のインデックスが「次に打つトークン」の位置
    const arr = state.romaCumLens;
    for (let i = 0; i < arr.length; i++) {
      if (charIdx < arr[i]) return i;
    }
    return arr.length; // すべて打ち切り
  }

  function updateTwoLineRemaining() {
    // 上段（ローマ）は残り文字＝seqRaw.slice(idx)
    const romaRemain = state.seqRaw.slice(state.idx);
    // 下段（かな）は「未了トークン」を並べる
    const tokenIdx = currentTokenIndexByCharIdx(state.idx);
    const kanaRemain = state.kanaTokens.slice(tokenIdx).join("");
    setTwoLineDisplay(romaRemain, kanaRemain);
  }

  // ---- シーケンス制御 ----
  function setSequence(romaString) {
    const raw = String(romaString || "");
    state.seqRaw = raw.replace(/\s+/g, "");
    state.idx = 0;

    // 初期表示（残り＝全文）
    updateTwoLineRemaining();

    // 次ターゲットをハイライト
    const code = charToCode(state.seqRaw[0]);
    if (code) {
      window.KeyboardUI?.clearTargets?.();
      window.KeyboardUI?.highlightTarget?.(code);
    } else {
      window.KeyboardUI?.clearTargets?.();
    }
  }

  function refreshHUD() {
    const E = el();
    if (E.time) E.time.textContent = String(state.remain);
    const elapsed = Math.max(1, state.totalSec - state.remain);
    const minutes = elapsed / 60;
    const wpmVal = Math.round(((state.ok + state.ng) / 5) / minutes);
    if (E.wpm) E.wpm.textContent = Number.isFinite(wpmVal) ? String(wpmVal) : "0";
    if (E.ok)  E.ok.textContent  = String(state.ok);
    if (E.ng)  E.ng.textContent  = String(state.ng);
  }

  function tick() {
    if (state.paused || !state.running) return;
    state.remain--;
    refreshHUD();
    if (state.remain <= 0) finish();
  }

  function start() {
    if (state.running && !state.paused) return;
    Sound.init?.();
    state.running = true;
    state.paused = false;
    state.over = false;
    state.ok = 0;
    state.ng = 0;
    state.typedRaw = "";
    state.remain = state.totalSec;

    const firstRoma = state.generator ? state.generator() : "aiueo";
    setSequence(firstRoma);

    const E = el();
    if (E.fb) E.fb.textContent = "がんばれ！";
    refreshHUD();
    clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);

    const kb = document.getElementById("keyboard-area");
    if (kb) kb.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function pause() {
    if (!state.running || state.over) return;
    state.paused = true;
    const E = el();
    if (E.fb) E.fb.textContent = "一時停止中（Enterで再開）";
  }

  function reset() {
    clearInterval(state.timer);
    state.running = false;
    state.paused = false;
    state.over = false;
    state.ok = 0;
    state.ng = 0;
    state.remain = state.totalSec;
    state.idx = 0;
    state.typedRaw = "";

    // プレビュー（開始はしない）
    const previewRoma = state.generator ? state.generator() : "aiueo";
    setSequence(previewRoma);

    const E = el();
    if (E.fb) E.fb.textContent = "Spaceで開始 / Escで一時停止";
    window.KeyboardUI?.clearTargets?.();
    refreshHUD();
  }

  function finish() {
    state.running = false;
    state.over = true;
    clearInterval(state.timer);
    refreshHUD();
    const E = el();
    if (E.fb) {
      const w = E.wpm ? E.wpm.textContent : "0";
      E.fb.textContent = `WPM ${w} おつかれさま！`;
    }
    window.KeyboardUI?.clearTargets?.();
  }

  function processCharInput(k) {
    if (!state.running || state.paused || state.over) return;
    const need = state.seqRaw[state.idx] || "";
    if (!need) return;
    const ch = (k || "").toLowerCase();
    if (!ch) return;

    if (ch === need) {
      state.ok++;
      state.typedRaw += ch;
      state.idx++;
      Sound.click?.();

      // 2段表示の残りを更新
      updateTwoLineRemaining();

      const next = state.seqRaw[state.idx];
      if (next) {
        const code = charToCode(next);
        if (code) {
          window.KeyboardUI?.clearTargets?.();
          window.KeyboardUI?.highlightTarget?.(code);
        }
      } else {
        // セット完了 → 次のセットを生成
        Sound.success?.();
        const nextRoma = state.generator ? state.generator() : "aiueo";
        setSequence(nextRoma);
      }
      refreshHUD();
    } else {
      state.ng++;
      Sound.beep?.();
      refreshHUD();
    }
  }

  function inputVirtual(code) {
    if (code === "Space" && !state.running) { start(); return; }
    if (code === "Enter" && state.paused) {
      state.paused = false;
      const E = el(); if (E.fb) E.fb.textContent = "再開";
      return;
    }
    const ch = codeToChar(code);
    if (!ch) return;
    processCharInput(ch);
  }

  function handleKeydown(e) {
    if (state.composing) return;
    const isSpace = (e.code === "Space" || e.code === "Spacebar" || e.key === " ");
    if (isSpace && !state.running) { e.preventDefault(); start(); return; }
    if (e.key === "Escape" || e.code === "Escape") { pause(); return; }
    if ((e.key === "Enter" || e.code === "Enter") && state.paused) {
      state.paused = false;
      const E = el(); if (E.fb) E.fb.textContent = "再開";
      return;
    }
    if (!state.running || state.paused || state.over) return;

    const k = (e.key && e.key.length === 1) ? e.key : (isSpace ? " " : "");
    if (k) processCharInput(k);
  }

  function onCompStart() { state.composing = true; }
  function onCompEnd()   { state.composing = false; }

  // ---- 外部API ----
  function configure({ durationSec } = {}) {
    if (durationSec > 0) {
      state.totalSec = durationSec;
      state.remain = durationSec;
    }
  }

  function setGenerator(fn) { state.generator = fn; }

  // ★ 2段表示のため、トークン情報をセット（kanaTokens と romaTokens）
  function setTokenInfo({ kanaTokens = [], romaTokens = [] } = {}) {
    state.kanaTokens = Array.isArray(kanaTokens) ? kanaTokens.slice() : [];
    state.romaTokens = Array.isArray(romaTokens) ? romaTokens.slice() : [];
    // 累積長を作成（例: ["shi","a","ka"] → [3,4,6]）
    const cum = [];
    let total = 0;
    for (const t of state.romaTokens) {
      total += String(t).length;
      cum.push(total);
    }
    state.romaCumLens = cum;
    // 初期表示も更新（次の generator() / setSequence() 呼び出しで整合）
    updateTwoLineRemaining();
  }

  function mount() {
    // プレビューだけ（開始はしない）
    const previewRoma = state.generator ? state.generator() : "aiueo";
    setSequence(previewRoma);

    refreshHUD();
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("compositionstart", onCompStart);
    window.addEventListener("compositionend", onCompEnd);

    // ボタン
    document.getElementById("btn-start")?.addEventListener("click", () => start());
    document.getElementById("btn-pause")?.addEventListener("click", () => pause());
    document.getElementById("btn-reset")?.addEventListener("click", () => reset());

    // ミュート
    const mute = document.getElementById("chk-mute");
    if (mute) {
      Sound.setMute?.(mute.checked);
      mute.addEventListener("change", () => Sound.setMute?.(mute.checked));
    }
  }

  function unmount() {
    clearInterval(state.timer);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("compositionstart", onCompStart);
    window.removeEventListener("compositionend", onCompEnd);
  }

  const api = {
    configure,
    setGenerator,
    setTokenInfo,      // ← 追加
    setTwoLineDisplay, // 必要なら外部から強制更新も可能
    mount,
    unmount,
    inputVirtual,
    start, pause, reset,
  };

  if (typeof window !== "undefined") {
    window.TypingEngineKana = api;
  }
  return api;
})();