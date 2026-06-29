// js/typing-engine.js
import { Sound } from "./sound.js";   // ← 追加

export const TypingEngine = (() => {
  let state = {
    running:false, paused:false, over:false, composing:false,
    totalSec:45, remain:45, timer:null, ok:0, ng:0, typedRaw:"",
    seqRaw:"", idx:0, playCount: 0,
    generator: null,        // ← 追加：動的シーケンス生成関数
  };

  const el = () => ({
    time:   document.getElementById("hud-time"),
    wpm:    document.getElementById("hud-wpm"),
    acc:    document.getElementById("hud-acc"),
    ok:     document.getElementById("hud-ok"),
    ng:     document.getElementById("hud-ng"),
    playCount: document.getElementById("hud-play-count"),
    typed:  document.getElementById("typed"),
    remain: document.getElementById("remain"),
    fb:     document.getElementById("feedback")
  });

  function charToCode(ch){
    const u = (ch||"").toUpperCase();
    if (u >= "A" && u <= "Z") return "Key"+u;
    if (ch === ";") return "Semicolon";
    if (ch === " ") return "Space";
    if (ch === ",") return "Comma";
    if (ch === ".") return "Period";
    if (ch === "-") return "Minus";
    if (ch === "=") return "Equal";
    if (ch === "/") return "Slash";
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
    Slash: "/",
  };
  return map[code] || null;
}

  function setSequence(seqString){
    const raw = seqString.replace(/\s+/g,"");
    state.seqRaw = raw; state.idx = 0;
    const E = el();
    E.typed.textContent = "";                   // 履歴は表示しない
    E.remain.textContent = raw.split("").join(" ");
    const code = charToCode(raw[0]);
    if (code) { window.KeyboardUI?.clearTargets(); window.KeyboardUI?.highlightTarget(code); }
  }

  function refreshHUD(){
    const E = el();
    E.time.textContent = state.remain;
    const elapsed = state.totalSec - state.remain || 1;
    const minutes = elapsed / 60;
    const cpm = Math.round((state.ok + state.ng) / minutes);
    const wpm = Math.round(((state.ok + state.ng) / 5) / minutes);
    E.wpm.textContent = Number.isFinite(wpm)? wpm : 0;
    E.acc.textContent = (state.ok+state.ng) ? Math.round(state.ok/(state.ok+state.ng)*100) : 100;
    E.ok.textContent = state.ok; E.ng.textContent = state.ng;
    if (E.playCount) E.playCount.textContent = String(state.playCount);
  }

  function tick(){ if(state.paused||!state.running) return;
    state.remain--; refreshHUD(); if(state.remain<=0) finish(); }

  function start(){
    if (state.running && !state.paused) return;
    state.running = true; state.paused = false; state.over = false;
    state.ok = 0; state.ng = 0; state.typedRaw = "";
    state.remain = state.totalSec;
    if (!Number.isFinite(state.playCount)) state.playCount = 0;
    state.playCount += 1;
    try { localStorage.setItem("typingPlayCount", String(state.playCount)); } catch (_) {}
    // ここでジェネレータから初期シーケンスを生成
    const firstSeq = state.generator ? state.generator() : "Spaceボタンを押してスタート";
    setSequence(firstSeq);
    el().fb.textContent = "出ている文字を順番に押そう";
    refreshHUD();
    clearInterval(state.timer); state.timer = setInterval(tick,1000);
　  // ★ キーボードを下に合わせて表示
/* スクロール移動は行わない（finger-panel を維持する）
　  const kb = document.getElementById("keyboard-area");
　  if (kb) {
　    kb.scrollIntoView({ behavior: "smooth", block: "end" });
　　 }
*/
  }

  function pause(){ if(!state.running||state.over) return; state.paused=true; el().fb.textContent="ひと休み中（Enterで再開）"; }
  function reset(){ clearInterval(state.timer); state.running=false; state.paused=false; state.over=false;
    state.ok=0; state.ng=0; state.remain=state.totalSec; state.idx=0; state.typedRaw="";
    el().fb.textContent="Spaceで開始 / Escで一時停止";
    // 初期プレビュー（次の開始時に新規生成）
    const preview = state.generator ? state.generator() : "fjfjfjfj";
    el().typed.textContent=""; el().remain.textContent=preview.replace(/\s+/g,"").split("").join(" ");
    window.KeyboardUI?.clearTargets(); refreshHUD(); }

  function finish(){ state.running=false; state.over=true; clearInterval(state.timer); refreshHUD();
    el().fb.textContent = `できた！ 正確度 ${el().acc.textContent}% / WPM ${el().wpm.textContent}`;
    window.KeyboardUI?.clearTargets(); }

  function handleKeydown(e){
    if(state.composing) return;
    if(e.code==="Space" && !state.running){ e.preventDefault(); start(); return; }
    if(e.key==="Escape"){ pause(); return; }
    if(e.key==="Enter" && state.paused){ state.paused=false; el().fb.textContent="つづきを入力しよう"; return; }
    if(!state.running||state.paused||state.over) return;

    const need = state.seqRaw[state.idx] || "";
    if(!need) return;
    const k = (e.key && e.key.length===1) ? e.key.toLowerCase() : "";
    if(!k) return;

    if(k===need){
      state.ok++; state.typedRaw += k; state.idx++;
      // ★ 正打のタッチ音
      Sound.click();

      el().remain.textContent = state.seqRaw.slice(state.idx).split("").join(" ");
      const next = state.seqRaw[state.idx];
      if(next){
        const code = charToCode(next);
        if(code){ window.KeyboardUI?.clearTargets(); window.KeyboardUI?.highlightTarget(code); }
      }else{
        // このセット終了：新しいランダム列を生成して続ける
        // ★ このセットをクリアした！ご褒美音を鳴らす
        Sound.success();
        const newSeq = state.generator ? state.generator() : "f j f j";
        setSequence(newSeq);
      }
    }else{
      state.ng++;
      // ★ ミスのビープ音
      Sound.beep();
      // ミス時はターゲット維持
    }
    refreshHUD();
  }

  function onCompStart(){ state.composing = true; }
  function onCompEnd(){ state.composing = false; }

  // 公開API
  return {
    configure({ durationSec } = {}) {
      if (durationSec>0) { state.totalSec = durationSec; state.remain = durationSec; }
      try {
        const stored = localStorage.getItem("typingPlayCount");
        const n = Number.parseInt(stored, 10);
        state.playCount = Number.isFinite(n) && n >= 0 ? n : 0;
      } catch (_) { state.playCount = 0; }
    },
    setGenerator(fn){ state.generator = fn; },
    mount(){
      // 初期プレビュー
      const preview = state.generator ? state.generator() : "fjfj";
      setSequence(preview);
      refreshHUD();
      // リスナー
      window.addEventListener("keydown", handleKeydown);
      window.addEventListener("compositionstart", onCompStart);
      window.addEventListener("compositionend", onCompEnd);
      // ボタン
      document.getElementById("btn-start")?.addEventListener("click", ()=> start());
      document.getElementById("btn-pause")?.addEventListener("click", pause);
      document.getElementById("btn-reset")?.addEventListener("click", reset);
      // ← ミュート連動（既存のチェックボックスを活用）
      const mute = document.getElementById("chk-mute");
      if (mute) {
        Sound.setMute(mute.checked);
        mute.addEventListener("change", () => Sound.setMute(mute.checked));
      }
    
    },
    unmount(){
      clearInterval(state.timer);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("compositionstart", onCompStart);
      window.removeEventListener("compositionend", onCompEnd);
    }
  };
})();
