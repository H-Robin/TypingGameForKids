// js/fingers.js
(() => {
  // 指マス要素の取得
  const box = {
    Lp: () => document.getElementById("finger-left-pinky"),
    Lr: () => document.getElementById("finger-left-ring"),
    Lm: () => document.getElementById("finger-left-middle"),
    Li: () => document.getElementById("finger-left-index"),
    Ri: () => document.getElementById("finger-right-index"),
    Rm: () => document.getElementById("finger-right-middle"),
    Rr: () => document.getElementById("finger-right-ring"),
    Rp: () => document.getElementById("finger-right-pinky"),
  };

  // JIS準拠の推奨指マッピング（主要キー）
  // 左: 小薬中人 / 右: 人中薬小 の順で割り当て
  const map = {
    // 数字段（左手）
    Backquote:"Lp", Digit1:"Lp", Digit2:"Lr", Digit3:"Lm", Digit4:"Li", Digit5:"Li",
    // 数字段（右手）
    Digit6:"Ri", Digit7:"Ri", Digit8:"Rm", Digit9:"Rr", Digit0:"Rp", Minus:"Rp", Equal:"Rp",

    // QWERTY 段
    KeyQ:"Lp", KeyW:"Lr", KeyE:"Lm", KeyR:"Li", KeyT:"Li",
    KeyY:"Ri", KeyU:"Ri", KeyI:"Rm", KeyO:"Rr", KeyP:"Rp",
    BracketLeft:"Rp", BracketRight:"Rp",

    // ASDF 段
    KeyA:"Lp", KeyS:"Lr", KeyD:"Lm", KeyF:"Li", KeyG:"Li",
    KeyH:"Ri", KeyJ:"Ri", KeyK:"Rm", KeyL:"Rr", Semicolon:"Rp", Quote:"Rp",

    // ZXCV 段
    KeyZ:"Lp", KeyX:"Lr", KeyC:"Lm", KeyV:"Li", KeyB:"Li",
    KeyN:"Ri", KeyM:"Ri", Comma:"Rm", Period:"Rr", Slash:"Rp",

    // スペース
    Space:"Ri", // 実用上は親指だが、右人差しに点灯（変更可）
  };

  function clear() {
    document.querySelectorAll("#finger-panel .finger.active").forEach(el => el.classList.remove("active"));
  }

  function highlight(code) {
    clear();
    const id = map[code];
    if (!id) return;
    const el =
      id === "Lp" ? box.Lp() :
      id === "Lr" ? box.Lr() :
      id === "Lm" ? box.Lm() :
      id === "Li" ? box.Li() :
      id === "Ri" ? box.Ri() :
      id === "Rm" ? box.Rm() :
      id === "Rr" ? box.Rr() :
      id === "Rp" ? box.Rp() : null;
    el?.classList.add("active");
  }

  window.Fingers = { highlight, clear };
})();