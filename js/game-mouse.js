(() => {
  const board = document.getElementById("board");
  const timeLeftEl = document.getElementById("timeLeft");
  const scoreEl = document.getElementById("score");
  const hitsEl = document.getElementById("hits");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const durationInput = document.getElementById("durationInput");

  const GRID = 3;
const LIT_MS = 2000;   // 点灯時間 2秒
  let cells = [];
  let running = false;
  let currentLitIndex = null;
  let score = 0;
  let hits = 0;
  let timeLeftMs = 0;
  let timerHandle = null;
  let countdownHandle = null;

  function buildBoard() {
    board.innerHTML = "";
    cells = [];
    for (let i = 0; i < GRID * GRID; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("aria-label", `セル ${i + 1}`);
      cell.dataset.index = String(i);

      cell.addEventListener("pointerdown", onCellClick);
      cell.addEventListener("mousedown", (e) => { if (e.button !== 0) e.preventDefault(); });

      board.appendChild(cell);
      cells.push(cell);
    }
  }

  function updateUI() {
    scoreEl.textContent = String(score);
    hitsEl.textContent = String(hits);
    timeLeftEl.textContent = (timeLeftMs / 1000).toFixed(1);
  }

  function pickRandomIndex(exclude) {
    if (cells.length <= 1) return 0;
    let idx;
    do { idx = Math.floor(Math.random() * cells.length); } while (idx === exclude);
    return idx;
  }

  function clearLight() {
    if (currentLitIndex !== null) {
      cells[currentLitIndex].classList.remove("lit");
      currentLitIndex = null;
    }
  }

  function lightOnce() {
    if (!running || timeLeftMs <= 0) return;
    const nextIndex = pickRandomIndex(currentLitIndex);
    clearLight();
    currentLitIndex = nextIndex;
    cells[currentLitIndex].classList.add("lit");

    timerHandle = setTimeout(() => {
      if (currentLitIndex !== null) clearLight();
      lightOnce();
    }, LIT_MS);
  }

  function onCellClick(e) {
    if (!running) return;
    const target = e.currentTarget;
    const idx = Number(target.dataset.index);

    if (idx === currentLitIndex) {
      score += 1;
      hits += 1;
      clearTimeout(timerHandle);
      clearLight();
      updateUI();
      lightOnce();
    } else {
      score -= 1;
      updateUI();
    }
  }

  function startGame() {
    if (running) return;
    running = true;
    score = 0;
    hits = 0;
    timeLeftMs = clampDuration(Number(durationInput.value)) * 1000;
    durationInput.disabled = true;
    startBtn.disabled = true;

    updateUI();

    const startedAt = performance.now();
    const endAt = startedAt + timeLeftMs;

    const tick = () => {
      if (!running) return;
      const now = performance.now();
      timeLeftMs = Math.max(0, Math.ceil(endAt - now));
      updateUI();

      if (timeLeftMs <= 0) {
        endGame();
      } else {
        countdownHandle = requestAnimationFrame(tick);
      }
    };
    countdownHandle = requestAnimationFrame(tick);

    lightOnce();
  }

  function endGame() {
    running = false;
    clearTimeout(timerHandle);
    cancelAnimationFrame(countdownHandle);
    clearLight();
    durationInput.disabled = false;
    startBtn.disabled = false;
  }

  function resetGame() {
    endGame();
    score = 0;
    hits = 0;
    timeLeftMs = clampDuration(Number(durationInput.value)) * 1000;
    updateUI();
  }

  function clampDuration(sec) {
    if (Number.isNaN(sec)) return 30;
    return Math.min(180, Math.max(5, Math.floor(sec)));
  }

  buildBoard();
  resetGame();
  startBtn.addEventListener("click", startGame);
  resetBtn.addEventListener("click", resetGame);
  durationInput.addEventListener("change", () => {
    if (!running) {
      timeLeftMs = clampDuration(Number(durationInput.value)) * 1000;
      updateUI();
    }
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(timerHandle);
    cancelAnimationFrame(countdownHandle);
  });
})();