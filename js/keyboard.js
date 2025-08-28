// js/keyboard.js
(() => {
  const state = { layout: "JIS", bound: false, loaded: false };
  const areaSel = "#keyboard-area";

  function svgPathFor(layout) {
    const key = (layout || "JIS").toLowerCase();
    return `./assets/svg/keyboard_${key}.svg`;
  }

  // #keyboard-area にSVGをインライン挿入
  async function load(layout = "JIS") {
    const area = document.querySelector(areaSel);
    if (!area) return;
    state.layout = layout;
    area.innerHTML = `<div class="loading">キーボード読込中…</div>`;
    try {
      const res = await fetch(svgPathFor(layout), { cache: "no-cache" });
      const svg = await res.text();
      area.innerHTML = svg;
      state.loaded = true;
      bindKeyPressVisualsOnce();
    } catch (e) {
      console.error(e);
      area.innerHTML = `<p class="placeholder">キーボードを読み込めませんでした。</p>`;
    }
  }

  // 指定コードのキー要素
  function keyEl(code) {
    return document.getElementById(`key-${code}`);
  }

  // 押下アニメ（keydown/keyup）
  function bindKeyPressVisualsOnce() {
    if (state.bound) return;
    let composing = false;
    addEventListener("compositionstart", () => composing = true);
    addEventListener("compositionend",   () => composing = false);

    addEventListener("keydown", (e) => {
      if (composing) return;
      if (e.code === "Space") e.preventDefault(); // スクロール防止
      const el = keyEl(e.code)?.querySelector("rect");
      if (el) el.classList.add("pressed");
    });
    addEventListener("keyup", (e) => {
      const el = keyEl(e.code)?.querySelector("rect");
      if (el) el.classList.remove("pressed");
    });
    state.bound = true;
  }

  // ターゲットの付け外し（外から使えるAPI）
  function highlightTarget(code) {
    const area = document.querySelector(areaSel);
    if (!area) return;
    area.querySelectorAll(".target").forEach(el => el.classList.remove("target"));
    const el = keyEl(code);
    if (el) el.classList.add("target");
  }
  function clearTargets() {
    const area = document.querySelector(areaSel);
    if (!area) return;
    area.querySelectorAll(".target").forEach(el => el.classList.remove("target"));
  }

  // 公開
  window.KeyboardUI = { load, highlightTarget, clearTargets };
})();