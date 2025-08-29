// js/sound.js
export const Sound = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function envGain(duration = 0.1, peak = 0.25) {
    const ctx = ensureCtx();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.005); // 立ち上がり
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);             // 減衰
    gain.connect(ctx.destination);
    return { ctx, gain, t };
  }

  // キータッチ音：短い「コツッ」
  function click() {
    if (muted) return;
    const { ctx, gain, t } = envGain(0.06, 0.2);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // ミス時のビープ：短い「ビー」
  function beep() {
    if (muted) return;
    const { ctx, gain, t } = envGain(0.15, 0.25);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.16);
  }
  // 成功音（クリア時）：ベル風
  function success() {
    if (muted) return;
    const { ctx, gain, t } = envGain(0.6, 0.3);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.setValueAtTime(1175, t + 0.2); // D6
    osc.frequency.setValueAtTime(1568, t + 0.4); // G6
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  return { init, click, beep, success, setMute, isMuted };

  // 初回のユーザー操作で呼ぶ（ブラウザの自動再生ポリシー対策）
  function init() { ensureCtx(); }

  function setMute(val) { muted = !!val; }
  function isMuted() { return muted; }

  return { init, click, beep, setMute, isMuted };
})();