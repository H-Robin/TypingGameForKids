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
        const cell = document.createElement("div");
        cell.className = "drill-cell";

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

        const dropBtn = document.createElement("button");
        dropBtn.className = "drill drop-mode";
        dropBtn.textContent = "落ちゲーで遊ぶ";
        dropBtn.title = "落ちてくる文字を撃ち落として練習するモード";
        dropBtn.dataset.drill = lesson.id;
        dropBtn.addEventListener("click", () => {
          sessionStorage.setItem("selectedLessonJson", jsonUrl);
          sessionStorage.setItem("selectedLessonId", lesson.id);
          sessionStorage.setItem("selectedLessonScope", card.getAttribute("data-lesson") || "");
          location.hash = "#/drop-lesson";
        });

        cell.appendChild(btn);
        cell.appendChild(dropBtn);
        drillsBox.appendChild(cell);
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

  // --- 落ちゲー練習 ---
  if (path === "/drop-lesson") {
    const { DropLesson } = await import("./drop-lesson.js");
    await DropLesson.mount();
    document.addEventListener("hashchange", () => DropLesson.unmount?.(), { once: true });
  }
});
