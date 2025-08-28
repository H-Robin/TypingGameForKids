// js/lessons.js
export const Lessons = (() => {
  let db = null;

  async function load(url = "./data/lessons1.json") {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`lessons.json fetch failed: ${res.status}`);
    db = await res.json();
    return db;
  }
  function get(id) {
    if (!db) throw new Error("Lessons not loaded");
    return (db.lessons || []).find(l => l.id === id) || null;
  }

  // ランダムジェネレータ（4〜8などの可変長）
  function makeRandomGenerator({ keys, lengthMin = 4, lengthMax = 8, sep = " " }) {
    const pool = (keys || []).map(k => String(k).toLowerCase());
    function randint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    return () => {
      const len = randint(lengthMin, lengthMax);
      const arr = Array.from({ length: len }, () => pool[randint(0, pool.length - 1)]);
      return arr.join(sep);
    };
  }

  // レッスンから“シーケンス生成関数”を作る
  function makeGenerator(lesson) {
    const g = lesson?.generator || {};
    if (g.type === "random") return makeRandomGenerator(g);
    if (g.type === "repeat") {
      const pattern = String(g.pattern || "");
      return () => pattern;
    }
    // デフォルト（安全側）
    return () => "f j f j f j f j";
  }

  return { load, get, makeGenerator };
})();