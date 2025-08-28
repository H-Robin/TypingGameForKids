// js/router.js
(() => {
  // ---- 設定：パス → パーシャルHTMLの対応表 ----
const routes = {
   "/home":       "views/home.html",
   "/lessons":    "views/lessons.html",
   "/practice":   "views/practice.html",
   "/timeattack": "views/timeattack.html",
   "/settings":   "views/settings.html",
   "/result":     "views/result.html",
};

  const DEFAULT_ROUTE = "/home";
  const appEl = document.getElementById("app");
  const cache = new Map(); // 取得済みパーシャルのメモリキャッシュ

  // ルート正規化（#/xxx → /xxx、空は /home）
  function normalizeHash(hash) {
    const h = (hash || "").replace(/^#/, "");
    if (!h || h === "/") return DEFAULT_ROUTE;
    return h.startsWith("/") ? h : "/" + h;
  }

  // data-link のデリゲート（<button data-link="#/practice"> など）
  function wireDataLinkClicks() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-link]");
      if (!el) return;
      const to = el.getAttribute("data-link");
      if (!to) return;
      e.preventDefault();
      location.hash = to; // ハッシュを書き換えるだけでOK（hashchange発火）
    });
  }

  // 読み込み中表示
  function showLoading() {
    if (!appEl) return;
    appEl.innerHTML = `<div class="loading" aria-live="polite">読み込み中…</div>`;
  }

  // 404表示
  function showNotFound(path) {
    appEl.innerHTML = `
      <section class="view not-found">
        <h2>ページが見つかりません</h2>
        <p><code>${path}</code> は存在しません。</p>
        <p><a href="#/home">ホームに戻る</a></p>
      </section>
    `;
  }

  // 部品を取得（キャッシュあり）
  async function fetchView(url) {
    if (cache.has(url)) return cache.get(url);
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
    const html = await res.text();
    cache.set(url, html);
    return html;
  }

  // 差し込み＋マウントイベント発火
  function mountView(path, html) {
    appEl.innerHTML = html;
    // スクロール位置リセット
    window.scrollTo(0, 0);
    // 画面ごとの初期化を知らせるカスタムイベント
    // app.js などで: document.addEventListener("view:mounted", (e)=>{ if(e.detail.path==="/practice"){ ... } })
    const ev = new CustomEvent("view:mounted", {
      detail: { path, container: appEl }
    });
    document.dispatchEvent(ev);
  }

  // ルート解決→表示
  async function navigate(rawHash) {
    const path = normalizeHash(rawHash);
    const url = routes[path];
    if (!url) {
      showNotFound(path);
      return;
    }
    try {
      showLoading();
      const html = await fetchView(url);
      mountView(path, html);
    } catch (err) {
      console.error(err);
      showNotFound(path);
    }
  }

  // 初期化
  function initRouter() {
    wireDataLinkClicks();
    // 初回
    navigate(location.hash);
    // 以降、ハッシュが変わるたびに遷移
    window.addEventListener("hashchange", () => navigate(location.hash));
    // ハッシュが空でアクセスされたときに /home へ誘導
    if (!location.hash) location.hash = "#"+DEFAULT_ROUTE;
  }

  // DOM構築後に開始
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRouter);
  } else {
    initRouter();
  }
})();