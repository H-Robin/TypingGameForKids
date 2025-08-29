// js/keyboard.js
(() => {
  const state = { layout: "JIS", bound: false, loaded: false };
  const areaSel = "#keyboard-area";
  const svgPathFor = (layout) => `./assets/svg/keyboard_${(layout||"JIS").toLowerCase()}.svg`;

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

  // 頑丈：厳密→緩めの順で要素を探す（右手記号の表記揺れにも耐える）
  function keyEl(code) {
    if (!code) return null;
    return (
      document.getElementById(`key-${code}`) ||                              // 例: key-Semicolon
      document.getElementById(code) ||                                        // 例: Semicolon
      document.querySelector(`${areaSel} [id$="${CSS.escape(code)}"]`) ||     // 末尾一致の保険
      null
    );
  }

  // 押下アニメは rect に .pressed（<g> の transform を壊さない）
  function bindKeyPressVisualsOnce() {
    if (state.bound) return;
    let composing = false;
    addEventListener("compositionstart", () => (composing = true));
    addEventListener("compositionend",   () => (composing = false));

    addEventListener("keydown", (e) => {
      if (composing) return;
      if (e.code === "Space") e.preventDefault();
      const g = keyEl(e.code);
      const rect = g?.querySelector?.("rect");
      if (rect) rect.classList.add("pressed");
    });

    addEventListener("keyup", (e) => {
      const g = keyEl(e.code);
      const rect = g?.querySelector?.("rect");
      if (rect) rect.classList.remove("pressed");
    });

    state.bound = true;
  }

  // target 付け外し：<g>.target と rect.target の両対応
  function clearTargets() {
    const area = document.querySelector(areaSel);
    if (!area) return;
    area.querySelectorAll(".key.target").forEach((g) => g.classList.remove("target")); // <g>
    area.querySelectorAll("rect.target").forEach((r) => r.classList.remove("target")); // <rect>
  }

  function highlightTarget(code) {
    clearTargets();
    const el = keyEl(code);
    if (!el) { console.warn("[KeyboardUI] target not found:", code); return; }
    if (el.tagName.toLowerCase() === "g") {
      el.classList.add("target");
    } else {
      (el.querySelector?.("rect") || el).classList.add("target");
    }
  }

  window.KeyboardUI = { load, highlightTarget, clearTargets };
})();