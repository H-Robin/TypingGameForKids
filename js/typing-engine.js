// js/typing-engine.js
// 単純なF/Jドリル用の最小エンジン（後で単語/JSON対応に差し替えやすい形）

export const TypingEngine = (() => {
  let state = {
    running: false,
    paused: false,
    over: false,
    composing: false,
    totalSec: 45,
    remain: 45,
    timer: null,
    ok: 0,
    ng: 0,
    typedRaw: "",     // スペース無しでカウント
    seqRaw: "",       // 出題の生文字列（スペース除く）
    idx: 0            // 何文字目まで正打したか
  };

  // 画面要素（practice内のID）
  const el = () => ({
    time:   document.getElementById("hud-time"),
    wpm:    document.getElementById("hud-wpm"),
    acc:    document.getElementById("hud-acc"),
    ok:     document.getElementById("hud-ok"),
    ng:     document.getElementById("hud-ng"),
    typed:  document.getElementById("typed"),
    remain: document.getElementById("remain"),
    fb:     document.getElementById("feedback")
  });

  // 文字→KeyboardEvent.code の推定（英小文字・記号の一部）
  function charToCode(ch) {
    const u = ch.toUpperCase();
    if (u >= "A" && u <= "Z") return "Key" + u;
    if (ch === ";") return "Semicolon";
    if (ch === " ") return "Space";
    return null;
  }

  function setSequence(seqString) {
    // 表示はスペース区切り、判定はスペース除去
    const raw = seqString.replace(/\s+/g, "");
    state.seqRaw = raw;
    state.idx = 0;
    // UI更新
    const e = el();
    e.typed.textContent = "";
    e.remain.textContent = raw.split("").join(" ");
    // 最初のターゲットをハイライト
    const code = charToCode(raw[0]);
    if (code) window.KeyboardUI?.clearTargets(), window.KeyboardUI?.highlightTarget(code);
  }

  function refreshHUD() {
    const e = el();
    e.time.textContent = state.remain;
    const elapsed = state.totalSec - state.remain || 1;
    const minutes = elapsed / 60;
    const cpm = Math.round((state.ok + state.ng) / minutes);
    const wpm = Math.round(((state.ok + state.ng) / 5) / minutes);
    e.wpm.textContent = Number.isFinite(wpm) ? wpm : 0;
    e.acc.textContent = (state.ok + state.ng) ? Math.round(state.ok / (state.ok + state.ng) * 100) : 100;
    e.ok.textContent = state.ok;
    e.ng.textContent = state.ng;
  }

  function tick() {
    if (state.paused || !state.running) return;
    state.remain--;
    refreshHUD();
    if (state.remain <= 0) finish();
  }

  function start(seqString = "f j f j f j f j f j") {
    if (state.running && !state.paused) return;
    state = { ...state, running: true, paused: false, over: false, ok: 0, ng: 0,
              typedRaw: "", totalSec: state.totalSec, remain: state.totalSec };
    setSequence(seqString);
    el().fb.textContent = "がんばれ！";
    refreshHUD();
    clearInterval(state.timer);
    state.timer = setInterval(tick, 1000);
  }

  function pause() {
    if (!state.running || state.over) return;
    state.paused = true;
    el().fb.textContent = "一時停止中（Enterで再開）";
  }

  function reset() {
    clearInterval(state.timer);
    state.running = false; state.paused = false; state.over = false;
    state.ok = 0; state.ng = 0; state.remain = state.totalSec; state.idx = 0; state.typedRaw = "";
    el().fb.textContent = "Spaceで開始 / Escで一時停止";
    // デフォ表示（次ターゲットは消す）
    const raw = (state.seqRaw || "fjfjfjfjfj");
    el().typed.textContent = "";
    el().remain.textContent = raw.split("").join(" ");
    window.KeyboardUI?.clearTargets();
    refreshHUD();
  }

  function finish() {
    state.running = false; state.over = true;
    clearInterval(state.timer);
    refreshHUD();
    el().fb.textContent = `WPM ${el().wpm.textContent} / 正確度 ${el().acc.textContent}%`;
    window.KeyboardUI?.clearTargets();
  }

  function handleKeydown(e) {
    if (state.composing) return;
    // グローバル操作
    if (e.code === "Space" && !state.running) { e.preventDefault(); start(); return; }
    if (e.key === "Escape") { pause(); return; }
    if (e.key === "Enter" && state.paused) { state.paused = false; el().fb.textContent = "再開"; return; }
    if (!state.running || state.paused || state.over) return;

    const need = state.seqRaw[state.idx] || "";
    if (!need) return;
    const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : "";
    if (!k) return;

    if (k === need) {
      state.ok++;
      state.typedRaw += k;
      state.idx++;
      // UI書き換え
      el().typed.textContent = state.typedRaw;
      el().remain.textContent = state.seqRaw.slice(state.idx).split("").join(" ");
      // 次のターゲット
      const next = state.seqRaw[state.idx];
      if (next) {
        const code = charToCode(next);
        if (code) window.KeyboardUI?.clearTargets(), window.KeyboardUI?.highlightTarget(code);
      } else {
        // 1巡終わったら次のセットに入れ替え（簡易）
        setSequence("f j f j f j f j f j");
      }
    } else {
      state.ng++;
      // ミス時はターゲット維持（正しいキーを押すまで）
    }
    refreshHUD();
  }

  // IME
  function onCompStart(){ state.composing = true; }
  function onCompEnd(){ state.composing = false; }

  // 外部公開
  return {
    mount() {
      // 画面が挿入された直後に呼ぶ
      // 初期シーケンスのダミーを表示
      setSequence("f j f j f j f j");
      refreshHUD();
      // リスナー
      window.addEventListener("keydown", handleKeydown);
      window.addEventListener("compositionstart", onCompStart);
      window.addEventListener("compositionend", onCompEnd);
      // ボタン
      document.getElementById("btn-start")?.addEventListener("click", ()=> start());
      document.getElementById("btn-pause")?.addEventListener("click", pause);
      document.getElementById("btn-reset")?.addEventListener("click", reset);
    },
    unmount() {
      clearInterval(state.timer);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("compositionstart", onCompStart);
      window.removeEventListener("compositionend", onCompEnd);
    }
  };
})();