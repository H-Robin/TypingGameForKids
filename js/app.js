// js/app.js
import { TypingEngine } from "./typing-engine.js";
import { Lessons } from "./lessons.js";

document.addEventListener("view:mounted", async (e) => {
  const { path, container } = e.detail || {};

  // --- レッスン選択画面 ---
  if (path === "/lessons") {
    // 各 lesson-card を走査
    const cards = container.querySelectorAll(".lesson-card");
    for (const card of cards) {
      const jsonUrl = card.getAttribute("data-json");
      const drillsBox = card.querySelector(".drills");
      if (!jsonUrl || !drillsBox) continue;

      // それぞれのJSONをロードして中身からボタン生成
      const db = await Lessons.load(jsonUrl);
      drillsBox.innerHTML = ""; // 初期化
      (db.lessons || []).forEach((lesson, idx) => {
        const btn = document.createElement("button");
        btn.className = "drill";
        btn.textContent = `No.${idx + 1} ${lesson.title}`;
        btn.dataset.drill = lesson.id;
        btn.addEventListener("click", () => {
          sessionStorage.setItem("selectedLessonJson", jsonUrl);
          sessionStorage.setItem("selectedLessonId", lesson.id);
          sessionStorage.setItem("selectedLessonScope", card.getAttribute("data-lesson") || "");
          location.hash = "#/practice";
        });
        drillsBox.appendChild(btn);
      });
    }
    return;
  }

  // --- 練習画面 ---
  if (path === "/practice") {
    await window.KeyboardUI?.load("JIS");

    const jsonUrl = sessionStorage.getItem("selectedLessonJson") || "./data/lesson1.json";
    const drillId = sessionStorage.getItem("selectedLessonId")  || "";

    await Lessons.load(jsonUrl);
    const lesson = Lessons.get(drillId);
    const gen = Lessons.makeGenerator(lesson);

    // HUD に選択名を表示
    const fb = document.getElementById("feedback");
    if (fb && lesson?.title) fb.textContent = `選択中：${lesson.title}（Spaceで開始）`;

    TypingEngine.configure({ durationSec: lesson?.durationSec || 45 });
    TypingEngine.setGenerator(gen);
    TypingEngine.mount();

    document.addEventListener("hashchange", () => {
      TypingEngine.unmount?.();
      window.KeyboardUI?.clearTargets?.();
    }, { once: true });
  }
});