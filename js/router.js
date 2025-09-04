// js/router.js
(() => {
  // ---- 画面パス → HTMLパーシャル ----
  const routes = {
    "/home":         "views/home.html",
    "/lessons":      "views/lessons.html",
    "/practice":     "views/practice.html",
    "/kana-lessons": "views/kana_lessons.html",
    "/kana-practice":"views/kana_practice.html",
    "/timeattack":   "views/timeattack.html",
    "/settings":     "views/settings.html",
    "/result":       "views/result.html",
    "/mouse":        "views/game_mouse.html",
  };

  const DEFAULT_ROUTE = "/home";
  const appEl = document.getElementById("app");
  const cache = new Map();

  function normalizeHash(hash) {
    const h = (hash || "").replace(/^#/, "");
    if (!h || h === "/") return DEFAULT_ROUTE;
    const pathOnly = h.split("?")[0]; // ← クエリを除去
    return pathOnly.startsWith("/") ? pathOnly : "/" + pathOnly;
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
        <p><a href="#/home">ホームに戻る</a></p>
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

  // どの画面へ遷移する前でも、既存のエンジンを“必ず”終了＆リセット
  function teardownEngines() {
    try {
      if (window.TypingEngine) {
        window.TypingEngine.reset?.();
        window.TypingEngine.unmount?.();
      }
    } catch (_) {}
    try {
      if (window.TypingEngineKana) {
        window.TypingEngineKana.reset?.();
        window.TypingEngineKana.unmount?.();
      }
    } catch (_) {}
  }
  function mountView(path, html) {
    appEl.innerHTML = html;

    // 挿入された <script> を有効化
    const scriptNodes = Array.from(appEl.querySelectorAll("script"));
    for (const old of scriptNodes) {
      const s = document.createElement("script");
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      if (!old.src) s.textContent = old.textContent || "";
      old.replaceWith(s);
    }

    window.scrollTo(0, 0);
    const ev = new CustomEvent("view:mounted", { detail: { path, container: appEl } });
    document.dispatchEvent(ev);

    // ひらがな練習だけ専用JSを初期化（既存の /lessons は触らない）
    if (path === "/kana-lessons") {
      requestAnimationFrame(() => {
        import("./kana-lessons.js").then(mod => mod.KanaLessons.mount());
      });
    }
    if (path === "/kana-practice") {
      requestAnimationFrame(() => {
        import("./kana-practice.js").then(mod => mod.KanaPractice.mount());
      });
    }
  }

  async function navigate(rawHash) {
    const path = normalizeHash(rawHash);
    const url = routes[path];
    if (!url) {
      showNotFound(path);
      return;
    }
    try {
      // ★ 画面切替のたびに、既存エンジンを確実に停止/解放
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