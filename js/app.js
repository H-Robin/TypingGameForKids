// js/app.js
import { TypingEngine } from "./typing-engine.js";
import { Lessons } from "./lessons.js";

document.addEventListener("view:mounted", async (e) => {
  const { path, container } = e.detail || {};

  // --- レッスン選択画面 ---
  if (path === "/lessons") {
    // ドリルボタンのクリックで選択を保存→practiceへ
    container.querySelectorAll(".drills .drill").forEach(btn => {
      btn.addEventListener("click", () => {
        const drillId = btn.getAttribute("data-drill"); // 例: p2_FJ
        // ついでに属するLessonも保存しておく（今後の拡張用）
        const lessonScope = btn.closest(".lesson-card")?.getAttribute("data-lesson") || "L1";
        sessionStorage.setItem("selectedLessonId", drillId);
        sessionStorage.setItem("selectedLessonScope", lessonScope);
        location.hash = "#/practice";
      });
    });
    return;
  }

  // --- 練習画面 ---
  if (path === "/practice") {
    await window.KeyboardUI?.load("JIS");
    await Lessons.load();

    // レッスン選択があればそれを使う。なければ FJ を既定に
    const selected = sessionStorage.getItem("selectedLessonId") || "p2_FJ";
    const lesson = Lessons.get(selected);
    const gen = Lessons.makeGenerator(lesson);

    TypingEngine.configure({ durationSec: lesson.durationSec });
    TypingEngine.setGenerator(gen);
    TypingEngine.mount();

    // 画面遷移時クリーンアップ
    document.addEventListener("hashchange", () => {
      TypingEngine.unmount?.();
      window.KeyboardUI?.clearTargets?.();
    }, { once: true });

    return;
  }
});