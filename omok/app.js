"use strict";

let SIZE = localStorage.getItem("omok-board-size") === "15" ? 15 : 19;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#result-overlay");
const undoButton = document.querySelector("#undo-button");
const resetButton = document.querySelector("#reset-button");
const playAgainButton = document.querySelector("#play-again-button");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const sizeButtons = [...document.querySelectorAll(".size-button")];
const resultUndoButton = document.querySelector("#result-undo-button");
const touchConfirm = document.querySelector("#touch-confirm");
const touchConfirmText = document.querySelector("#touch-confirm-text");
const touchPlaceButton = document.querySelector("#touch-place-button");
const touchCancelButton = document.querySelector("#touch-cancel-button");
const boardHint = document.querySelector("#board-hint");

let board = createBoard();
let currentPlayer = BLACK;
let gameOver = false;
let aiThinking = false;
let mode = "ai";
let history = [];
let scores = { black: 0, white: 0 };
let hoverPoint = null;
let winningLine = [];
let aiTimer = null;
let resultTimer = null;
let finishedWinner = null;
let pendingMove = null;

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const side = Math.max(300, Math.round(rect.width));
  canvas.width = side * dpr;
  canvas.height = side * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(side);
}

function draw(side = canvas.getBoundingClientRect().width) {
  const pad = side * 0.055;
  const gap = (side - pad * 2) / (SIZE - 1);

  ctx.clearRect(0, 0, side, side);
  drawWood(side);
  drawGrid(pad, gap);
  drawStars(pad, gap);

  if (hoverPoint && canPlace(hoverPoint.row, hoverPoint.col) && !aiThinking) {
    drawStone(hoverPoint.row, hoverPoint.col, currentPlayer, pad, gap, 0.34);
  }

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== EMPTY) {
        drawStone(row, col, board[row][col], pad, gap, 1);
      }
    }
  }

  if (winningLine.length) {
    drawWinningLine(pad, gap);
  }

  const last = history.at(-1);
  if (last && !winningLine.length) {
    ctx.beginPath();
    ctx.fillStyle = last.player === BLACK ? "#e9ad52" : "#8a2c20";
    ctx.arc(pad + last.col * gap, pad + last.row * gap, Math.max(2, gap * 0.085), 0, Math.PI * 2);
    ctx.fill();
  }

  if (pendingMove && board[pendingMove.row][pendingMove.col] === EMPTY) {
    drawStone(pendingMove.row, pendingMove.col, pendingMove.player, pad, gap, 0.58);
    ctx.beginPath();
    ctx.strokeStyle = "#fff2cf";
    ctx.lineWidth = Math.max(2, gap * 0.08);
    ctx.arc(pad + pendingMove.col * gap, pad + pendingMove.row * gap, gap * 0.47, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWood(side) {
  const gradient = ctx.createLinearGradient(0, 0, side, side);
  gradient.addColorStop(0, "#d3a15e");
  gradient.addColorStop(0.48, "#c48c47");
  gradient.addColorStop(1, "#b87d3b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, side, side);

  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = "#623a18";
  ctx.lineWidth = 1;
  for (let i = 0; i < 34; i += 1) {
    const y = (i / 34) * side + Math.sin(i * 1.8) * 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= side; x += 35) {
      ctx.lineTo(x, y + Math.sin(x * 0.018 + i) * 2.2);
    }
    ctx.stroke();
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(side / 2, side / 2, side * 0.2, side / 2, side / 2, side * 0.75);
  vignette.addColorStop(0, "rgba(255,255,255,0.04)");
  vignette.addColorStop(1, "rgba(65,32,8,0.18)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, side, side);
}

function drawGrid(pad, gap) {
  ctx.save();
  ctx.strokeStyle = "rgba(49, 29, 12, 0.72)";
  ctx.lineWidth = Math.max(1, gap * 0.035);
  for (let i = 0; i < SIZE; i += 1) {
    const pos = pad + i * gap;
    ctx.beginPath();
    ctx.moveTo(pad, pos);
    ctx.lineTo(pad + gap * (SIZE - 1), pos);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos, pad);
    ctx.lineTo(pos, pad + gap * (SIZE - 1));
    ctx.stroke();
  }
  ctx.restore();
}

function drawStars(pad, gap) {
  const starLines = [3, Math.floor(SIZE / 2), SIZE - 4];
  const stars = starLines.flatMap((row) => starLines.map((col) => [row, col]));
  ctx.fillStyle = "rgba(48, 27, 10, 0.84)";
  stars.forEach(([row, col]) => {
    ctx.beginPath();
    ctx.arc(pad + col * gap, pad + row * gap, Math.max(2.4, gap * 0.09), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawStone(row, col, player, pad, gap, opacity) {
  const x = pad + col * gap;
  const y = pad + row * gap;
  const radius = gap * 0.43;
  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.fillStyle = "rgba(40, 21, 6, 0.34)";
  ctx.ellipse(x + radius * 0.13, y + radius * 0.22, radius * 0.94, radius * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createRadialGradient(
    x - radius * 0.32,
    y - radius * 0.36,
    radius * 0.05,
    x,
    y,
    radius
  );
  if (player === BLACK) {
    gradient.addColorStop(0, "#77736a");
    gradient.addColorStop(0.3, "#34332f");
    gradient.addColorStop(0.78, "#10100f");
    gradient.addColorStop(1, "#050505");
  } else {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.48, "#f0ece4");
    gradient.addColorStop(0.82, "#c8c2b8");
    gradient.addColorStop(1, "#98938b");
  }
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWinningLine(pad, gap) {
  const first = winningLine[0];
  const last = winningLine.at(-1);
  ctx.save();
  ctx.strokeStyle = "#e4a946";
  ctx.lineWidth = Math.max(3, gap * 0.12);
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 185, 75, 0.7)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(pad + first.col * gap, pad + first.row * gap);
  ctx.lineTo(pad + last.col * gap, pad + last.row * gap);
  ctx.stroke();
  ctx.restore();
}

function pointerToCell(event) {
  const rect = canvas.getBoundingClientRect();
  const side = rect.width;
  const pad = side * 0.055;
  const gap = (side - pad * 2) / (SIZE - 1);
  const col = Math.round((event.clientX - rect.left - pad) / gap);
  const row = Math.round((event.clientY - rect.top - pad) / gap);
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
  const x = pad + col * gap;
  const y = pad + row * gap;
  if (Math.hypot(event.clientX - rect.left - x, event.clientY - rect.top - y) > gap * 0.52) return null;
  return { row, col };
}

function coordinateLabel(row, col) {
  const columns = "ABCDEFGHJKLMNOPQRST";
  return `${columns[col]}${SIZE - row}`;
}

function clearPendingMove() {
  pendingMove = null;
  touchConfirm.hidden = true;
  boardHint.textContent = "교차점을 눌러 돌을 놓으세요";
}

function selectTouchMove(row, col) {
  if (!canPlace(row, col)) return;
  pendingMove = { row, col, player: currentPlayer };
  const color = currentPlayer === BLACK ? "흑돌" : "백돌";
  touchConfirmText.textContent = `${coordinateLabel(row, col)}에 ${color}을 둘까요?`;
  touchConfirm.hidden = false;
  boardHint.textContent = "후보 위치를 확인한 뒤 착수 버튼을 눌러주세요";
  draw();
}

function confirmPendingMove() {
  if (!pendingMove || pendingMove.player !== currentPlayer || !canPlace(pendingMove.row, pendingMove.col)) {
    clearPendingMove();
    draw();
    return;
  }
  const { row, col } = pendingMove;
  if (placeStone(row, col, currentPlayer) && !gameOver) runAiTurn();
}

function canPlace(row, col) {
  return !gameOver && board[row][col] === EMPTY && !(mode === "ai" && currentPlayer === WHITE);
}

function placeStone(row, col, player) {
  if (board[row][col] !== EMPTY || gameOver) return false;
  clearPendingMove();
  board[row][col] = player;
  history.push({ row, col, player });
  winningLine = getWinningLine(row, col, player);
  draw();

  if (winningLine.length) {
    finishGame(player);
    return true;
  }
  if (history.length === SIZE * SIZE) {
    finishGame(EMPTY);
    return true;
  }

  currentPlayer = player === BLACK ? WHITE : BLACK;
  updateStatus();
  return true;
}

function getWinningLine(row, col, player) {
  for (const [dr, dc] of DIRECTIONS) {
    const line = [{ row, col }];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
        sign === -1 ? line.unshift({ row: r, col: c }) : line.push({ row: r, col: c });
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

function finishGame(player) {
  gameOver = true;
  aiThinking = false;
  finishedWinner = player;
  if (player === BLACK) scores.black += 1;
  if (player === WHITE) scores.white += 1;
  updateScores();
  updateStatus();
  draw();

  resultTimer = window.setTimeout(() => {
    document.querySelector("#result-title").textContent =
      player === EMPTY ? "무승부" : `${player === BLACK ? "흑돌" : "백돌"} 승리!`;
    document.querySelector("#result-message").textContent =
      player === EMPTY
        ? "빈자리가 모두 채워졌습니다."
        : mode === "ai" && player === BLACK
          ? "완벽한 한 수였어요."
          : mode === "ai"
            ? "컴퓨터가 이번 판을 가져갔네요."
            : "멋진 승부였습니다.";
    document.querySelector("#result-icon").textContent = player === EMPTY ? "○" : "●";
    overlay.hidden = false;
  }, 350);
}

function updateStatus() {
  const stone = document.querySelector("#turn-stone");
  const kicker = document.querySelector("#status-kicker");
  const text = document.querySelector("#status-text");
  stone.className = `turn-stone ${currentPlayer === BLACK ? "black" : "white"}`;

  if (gameOver) {
    kicker.textContent = "게임 종료";
    text.textContent = winningLine.length ? "승부가 결정되었습니다" : "무승부입니다";
  } else if (mode === "ai" && currentPlayer === WHITE) {
    kicker.textContent = "컴퓨터의 차례";
    text.textContent = aiThinking ? "좋은 수를 생각하는 중…" : "백돌 차례입니다";
  } else if (mode === "ai") {
    kicker.textContent = "당신의 차례";
    text.textContent = "흑돌을 놓아주세요";
  } else {
    kicker.textContent = currentPlayer === BLACK ? "플레이어 1" : "플레이어 2";
    text.textContent = `${currentPlayer === BLACK ? "흑돌" : "백돌"}을 놓아주세요`;
  }
  undoButton.disabled = history.length === 0 || aiThinking;
  resultUndoButton.disabled = history.length === 0 || aiThinking;
}

function updateScores() {
  document.querySelector("#black-score").textContent = scores.black;
  document.querySelector("#white-score").textContent = scores.white;
}

function resetGame() {
  window.clearTimeout(aiTimer);
  window.clearTimeout(resultTimer);
  board = createBoard();
  history = [];
  currentPlayer = BLACK;
  gameOver = false;
  aiThinking = false;
  winningLine = [];
  finishedWinner = null;
  hoverPoint = null;
  clearPendingMove();
  overlay.hidden = true;
  canvas.setAttribute("aria-label", `${SIZE} 곱하기 ${SIZE} 오목판`);
  sizeButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.size) === SIZE));
  updateStatus();
  draw();
}

function undo() {
  if (history.length === 0 || aiThinking) return;
  window.clearTimeout(aiTimer);
  window.clearTimeout(resultTimer);
  if (gameOver && finishedWinner === BLACK) scores.black = Math.max(0, scores.black - 1);
  if (gameOver && finishedWinner === WHITE) scores.white = Math.max(0, scores.white - 1);
  const latest = history.at(-1);
  const previous = history.at(-2);
  const count = mode === "ai" && latest?.player === WHITE && previous?.player === BLACK ? 2 : 1;
  for (let i = 0; i < count; i += 1) {
    const move = history.pop();
    if (move) board[move.row][move.col] = EMPTY;
  }
  currentPlayer = mode === "ai" ? BLACK : (history.length % 2 === 0 ? BLACK : WHITE);
  gameOver = false;
  aiThinking = false;
  finishedWinner = null;
  winningLine = [];
  overlay.hidden = true;
  clearPendingMove();
  updateScores();
  updateStatus();
  draw();
}

function scoreDirection(row, col, player, dr, dc) {
  let total = 1;
  let openEnds = 0;
  for (const sign of [-1, 1]) {
    let r = row + dr * sign;
    let c = col + dc * sign;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
      total += 1;
      r += dr * sign;
      c += dc * sign;
    }
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === EMPTY) openEnds += 1;
  }
  if (total >= 5) return 100000;
  if (total === 4 && openEnds === 2) return 18000;
  if (total === 4 && openEnds === 1) return 5000;
  if (total === 3 && openEnds === 2) return 1800;
  if (total === 3 && openEnds === 1) return 300;
  if (total === 2 && openEnds === 2) return 160;
  return total * 8 + openEnds * 3;
}

function evaluateCell(row, col, player) {
  return DIRECTIONS.reduce((sum, [dr, dc]) => sum + scoreDirection(row, col, player, dr, dc), 0);
}

function chooseAiMove() {
  const center = Math.floor(SIZE / 2);
  const candidates = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== EMPTY || !hasNearbyStone(row, col)) continue;
      const attack = evaluateCell(row, col, WHITE);
      const defense = evaluateCell(row, col, BLACK);
      const centerBias = 12 - Math.hypot(row - center, col - center);
      const jitter = Math.random() * 4;
      candidates.push({ row, col, score: attack * 1.08 + defense + centerBias + jitter });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || { row: center, col: center };
}

function hasNearbyStone(row, col) {
  for (let dr = -2; dr <= 2; dr += 1) {
    for (let dc = -2; dc <= 2; dc += 1) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] !== EMPTY) return true;
    }
  }
  return history.length === 0;
}

function runAiTurn() {
  if (mode !== "ai" || gameOver || currentPlayer !== WHITE) return;
  aiThinking = true;
  updateStatus();
  aiTimer = window.setTimeout(() => {
    const move = chooseAiMove();
    aiThinking = false;
    placeStone(move.row, move.col, WHITE);
  }, 420);
}

canvas.addEventListener("pointermove", (event) => {
  hoverPoint = pointerToCell(event);
  draw();
});

canvas.addEventListener("pointerleave", () => {
  hoverPoint = null;
  draw();
});

canvas.addEventListener("pointerdown", (event) => {
  const cell = pointerToCell(event);
  if (!cell || !canPlace(cell.row, cell.col)) return;
  if (event.pointerType === "touch") {
    selectTouchMove(cell.row, cell.col);
    return;
  }
  if (placeStone(cell.row, cell.col, currentPlayer) && !gameOver) runAiTurn();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (aiThinking) return;
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector("#black-label").textContent = mode === "ai" ? "나" : "플레이어 1";
    document.querySelector("#white-label").textContent = mode === "ai" ? "컴퓨터" : "플레이어 2";
    scores = { black: 0, white: 0 };
    updateScores();
    resetGame();
  });
});

sizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (aiThinking) return;
    const nextSize = Number(button.dataset.size);
    if (![15, 19].includes(nextSize) || nextSize === SIZE) return;
    SIZE = nextSize;
    localStorage.setItem("omok-board-size", String(SIZE));
    resetGame();
  });
});

undoButton.addEventListener("click", undo);
resultUndoButton.addEventListener("click", undo);
resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);
touchPlaceButton.addEventListener("click", confirmPendingMove);
touchCancelButton.addEventListener("click", () => { clearPendingMove(); draw(); });
window.addEventListener("resize", setupCanvas);

canvas.tabIndex = 0;
canvas.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hoverPoint = null;
    clearPendingMove();
    draw();
  }
});

setupCanvas();
resetGame();
