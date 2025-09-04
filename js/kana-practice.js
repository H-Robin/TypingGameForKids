// js/kana-practice.js
import { TypingEngineKana } from "./typing-engine-kana.js";

export const KanaPractice = (() => {
  const JSON_URL = "./data/kana_lessons.json";

  function getQueryId() {
    const m = location.hash.match(/[?#&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function loadDB() {
    const res = await fetch(JSON_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("kana_lessons.json load failed");
    return res.json();
  }

  // ひらがな対応のローマ字→かなマップ（基本五十音＋一部互換）
  const ROMA2KANA = {
    a:"あ", i:"い", u:"う", e:"え", o:"お",
    ka:"か", ki:"き", ku:"く", ke:"け", ko:"こ",
    sa:"さ", shi:"し", si:"し", su:"す", se:"せ", so:"そ",
    ta:"た", chi:"ち", ti:"ち", tsu:"つ", tu:"つ", te:"て", to:"と",
    na:"な", ni:"に", nu:"ぬ", ne:"ね", no:"の",
    ha:"は", hi:"ひ", fu:"ふ", hu:"ふ", he:"へ", ho:"ほ",
    ma:"ま", mi:"み", mu:"む", me:"め", mo:"も",
    ya:"や", yu:"ゆ", yo:"よ",
    ra:"ら", ri:"り", ru:"る", re:"れ", ro:"ろ",
    wa:"わ", wo:"を", n:"ん"
  };

  function tokensToKana(tokens){
    return tokens.map(t => ROMA2KANA[t] || t);
  }

  // 長さランダムで“ローマ字トークン配列”を作る
  function makeTokenGenerator({ keys = [], lengthMin = 4, lengthMax = 8 }) {
    const pool = keys.map(s => String(s).toLowerCase());
    const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    return () => Array.from({ length: r(lengthMin, lengthMax) }, () => pool[r(0, pool.length - 1)]);
  }

  // 2段表示前提のジェネレータ：
  //  - 毎回「トークン配列」を作る
  //  - かなトークンを作る
  //  - エンジンに setTokenInfo() で両方渡す
  //  - 戻り値として “ローマ字連結文字列” を返す（上段の残り表示に使われる）
  function makeKanaAwareGenerator(lesson) {
    const genTokens = makeTokenGenerator(lesson.generator || {});
    return () => {
      const romaTokens = genTokens();             // 例: ["shi","a","ka"]
      const kanaTokens = tokensToKana(romaTokens); // 例: ["し","あ","か"]

      TypingEngineKana.setTokenInfo({
        kanaTokens,
        romaTokens,
      });

      return romaTokens.join(""); // 上段用の連結ローマ
    };
  }

  async function mount() {
    window.KeyboardUI?.load?.("JIS");

    const id = getQueryId();
    const seqEl = document.getElementById("seq");
    if (!id) { if (seqEl) seqEl.textContent = "レッスンIDが見つかりません"; return; }

    const db = await loadDB();
    const lesson = (db.lessons || []).find(l => l.id === id);
    if (!lesson) { if (seqEl) seqEl.textContent = "レッスンが見つかりません"; return; }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const gen = makeKanaAwareGenerator(lesson);

        TypingEngineKana.configure({ durationSec: lesson.durationSec || 45 });
        TypingEngineKana.setGenerator(gen);
        TypingEngineKana.mount();  // プレビューのみ
        TypingEngineKana.reset();  // 自動開始しない

        // ボタン
        document.getElementById("btn-start")?.addEventListener("click", () => TypingEngineKana.start());
        document.getElementById("btn-pause")?.addEventListener("click", () => TypingEngineKana.pause());
        document.getElementById("btn-reset")?.addEventListener("click", () => {
          TypingEngineKana.reset();
          const fb = document.getElementById("fb");
          if (fb) fb.textContent = "開始ボタンでスタート";
        });

        // ミュート
        const mute = document.getElementById("chk-mute");
        if (mute) {
          import("./sound.js").then(mod => {
            mod.Sound?.setMute?.(mute.checked);
            mute.addEventListener("change", () => mod.Sound?.setMute?.(mute.checked));
          });
        }
      });
    });
  }

  return { mount };
})();