
// js/kana-lessons.js
export const KanaLessons = (() => {
  const JSON_URL = "./data/kana_lessons.json";
  async function loadDB() {
    const res = await fetch(JSON_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("kana_lessons.json load failed");
    return res.json();
  }
  function renderList(db) {
    const el = document.getElementById("kana-lessons-container");
    if (!el) return;
    const lessons = db.lessons || [];
    el.innerHTML = lessons.map(l => `
      <div class="lesson-card">
        <h3>${l.title}</h3>
        <div class="drills">
          <button data-lesson-id="${l.id}">No.1</button>
        </div>
      </div>
    `).join("");
    el.querySelectorAll("[data-lesson-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-lesson-id");
        if (id) location.hash = "#/kana-practice?id=" + encodeURIComponent(id);
      });
    });
  }
  async function mount() {
    try {
      const db = await loadDB();
      renderList(db);
    } catch (e) {
      console.error(e);
      const el = document.getElementById("kana-lessons-container");
      if (el) el.innerHTML = "<p>読み込みに失敗しました</p>";
    }
  }
  return { mount };
})();