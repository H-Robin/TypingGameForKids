// js/app.js
// 画面ごとの初期化フック
document.addEventListener("view:mounted", async (e) => {
  const { path } = e.detail || {};

  if (path === "/home") {
    // ここで home のボタンに追加のイベント付与など
    // 例）document.querySelector('#home .menu [data-link="#/practice"]')?.focus();
  }

  if (path === "/practice") {
    // 4) practiceビューでSVGキーボードを読み込み、仮ターゲットを表示
    try {
      // キーボード（JIS）を読み込み
      await window.KeyboardUI?.load("JIS");
      // 最初の目標キー（仮）：F
      window.KeyboardUI?.highlightTarget("KeyF");
    } catch (err) {
      console.error("KeyboardUI init failed:", err);
    }

    // ※この後、タイピングエンジン実装時に
    //   - Spaceで開始
    //   - 期待キーに合わせて highlightTarget(...) を更新
    //   - 正打/ミスで演出クラスを付与
    // へ拡張していきます。
  }
});