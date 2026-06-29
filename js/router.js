// js/router.js
(() => {
  const routes = {
    "/home":          "views/home.html",
    "/lessons":       "views/lessons.html",
    "/practice":      "views/practice.html",
    "/drop-lesson":   "views/drop_lesson.html",
    "/kana-lessons":  "views/kana_lessons.html",
    "/kana-practice": "views/kana_practice.html",
    "/kana-drop":     "views/kana_drop.html",
    "/timeattack":    "views/timeattack.html",
    "/settings":      "views/settings.html",
    "/result":        "views/result.html",
    "/mouse":         "views/game_mouse.html",
    "/reaction-games": "views/reaction_games.html",
    "/color-bar":     "views/color_bar.html",
  };

  const DEFAULT_ROUTE = "/home";
  const appEl = document.getElementById("app");
  const cache = new Map();

  function normalizeHash(hash) {
    const h = (hash || "").replace(/^#/, "");
    if (!h || h === "/") return DEFAULT_ROUTE;
    const pathOnly = h.split("?")[0];
    return pathOnly.startsWith("/") ? pathOnly : "/" + pathOnly;
  }

  function navHrefForPath(path) {
    if (path === "/practice" || path === "/drop-lesson") return "#/lessons";
    if (path === "/kana-practice" || path === "/kana-drop") return "#/kana-lessons";
    if (path === "/color-bar") return "#/reaction-games";
    if (path === "/mouse") return "#/mouse";
    if (path === "/reaction-games") return "#/reaction-games";
    if (path === "/kana-lessons") return "#/kana-lessons";
    if (path === "/lessons") return "#/lessons";
    return "#/home";
  }

  function updateNavigationState(path) {
    const currentHref = navHrefForPath(path);
    document.querySelectorAll("#header nav a").forEach((link) => {
      const isCurrent = link.getAttribute("href") === currentHref;
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function wireDataLinkClicks() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-link]");
      if (!el) return;
      const to = el.getAttribute("data-link");
      if (!to) return;
      e.preventDefault();
      location.hash = to;
    });
  }

  function showLoading() {
    if (!appEl) return;
    appEl.innerHTML = `<div class="loading" aria-live="polite">読み込み中…</div>`;
  }

  function showNotFound(path) {
    appEl.innerHTML = `
      <section class="view not-found">
        <h2>ページが見つかりません</h2>
        <p><code>${path}</code> は存在しません。</p>
        <p><a href="#/home" data-link="#/home">ホームに戻る</a></p>
      </section>
    `;
  }

  async function fetchView(url) {
    if (cache.has(url)) return cache.get(url);
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
    const html = await res.text();
    cache.set(url, html);
    return html;
  }

  // 画面切替前に、両エンジンを確実に停止・初期化
  function teardownEngines() {
    try { window.TypingEngine?.reset?.();     window.TypingEngine?.unmount?.(); } catch(_) {}
    try { window.TypingEngineKana?.reset?.(); window.TypingEngineKana?.unmount?.(); } catch(_) {}
    try { window.ColorBarGame?.unmount?.(); } catch(_) {}
  }

  // ---- タイマ方式で“準備完了”を待ってから finger-panel へスクロール ----
  // 条件：finger-panel が存在 かつ keyboard-area に SVG が入っている（どちらか満たす/最大2秒）
  function scrollToFingerPanelWhenReady() {
    const deadline = performance.now() + 2000; // 最大2秒
    const intervalMs = 50;

    const tick = () => {
      const panel = document.getElementById("finger-panel");
      const svgLoaded = !!document.querySelector("#keyboard-area svg");
      const ready = !!panel && svgLoaded;

      if (ready) {
        // 指パネルの下端をビューポート下端へ
        panel.scrollIntoView({ behavior: "auto", block: "end" });
        return; // 完了
      }
      if (performance.now() > deadline) {
        // 打ち切り：保険でページ最下部へ
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
        return;
      }
      // まだなら再試行
      setTimeout(tick, intervalMs);
    };

    // 最初のキック
    setTimeout(tick, 0);
  }

  function mountView(path, html) {
    appEl.innerHTML = html;

    // 挿入 <script> を実行可能に置換
    const scriptNodes = Array.from(appEl.querySelectorAll("script"));
    for (const old of scriptNodes) {
      const s = document.createElement("script");
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      if (!old.src) s.textContent = old.textContent || "";
      old.replaceWith(s);
    }

    const ev = new CustomEvent("view:mounted", { detail: { path, container: appEl } });
    document.dispatchEvent(ev);

    // ビュー固有の初期化
    if (path === "/kana-lessons") {
      requestAnimationFrame(() => { import("./kana-lessons.js").then(m => m.KanaLessons.mount()); });
    }
    if (path === "/kana-practice") {
      requestAnimationFrame(() => { import("./kana-practice.js").then(m => m.KanaPractice.mount()); });
    }

    // practice 系は、“準備が整ったら” 指パネルまでスクロール（タイマ待機で堅牢）
    if (path === "/practice" || path === "/kana-practice") {
      scrollToFingerPanelWhenReady();
    }
  }

  async function navigate(rawHash) {
    const path = normalizeHash(rawHash);
    updateNavigationState(path);
    const url = routes[path];
    if (!url) {
      showNotFound(path);
      return;
    }
    try {
      teardownEngines();
      showLoading();
      const html = await fetchView(url);
      mountView(path, html);
    } catch (err) {
      console.error(err);
      showNotFound(path);
    }
  }

  function initRouter() {
    wireDataLinkClicks();
    navigate(location.hash);
    window.addEventListener("hashchange", () => navigate(location.hash));
    if (!location.hash) location.hash = "#" + DEFAULT_ROUTE;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRouter);
  } else {
    initRouter();
  }
})();
