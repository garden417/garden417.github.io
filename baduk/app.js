"use strict";

const SIZE = 19;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const KOMI = 6.5;
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#result-overlay");
const modeButtons = [...document.querySelectorAll(".mode")];

let board = emptyBoard();
let currentPlayer = BLACK;
let mode = "ai";
let captures = { [BLACK]: 0, [WHITE]: 0 };
let history = [];
let positionHistory = [boardHash(board)];
let consecutivePasses = 0;
let gameOver = false;
let aiThinking = false;
let hoverPoint = null;
let lastMove = null;
let aiTimer = null;

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function cloneBoard(source) {
  return source.map((row) => [...row]);
}

function boardHash(source) {
  return source.map((row) => row.join("")).join("");
}

function inside(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function groupAt(source, row, col) {
  const color = source[row][col];
  const stones = [];
  const liberties = new Set();
  const seen = new Set([`${row},${col}`]);
  const stack = [[row, col]];

  while (stack.length) {
    const [r, c] = stack.pop();
    stones.push([r, c]);
    for (const [dr, dc] of NEIGHBORS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inside(nr, nc)) continue;
      if (source[nr][nc] === EMPTY) {
        liberties.add(`${nr},${nc}`);
      } else if (source[nr][nc] === color && !seen.has(`${nr},${nc}`)) {
        seen.add(`${nr},${nc}`);
        stack.push([nr, nc]);
      }
    }
  }
  return { stones, liberties };
}

function simulateMove(row, col, player) {
  if (!inside(row, col) || board[row][col] !== EMPTY || gameOver) return { legal: false, reason: "이미 돌이 놓여 있습니다." };
  const next = cloneBoard(board);
  next[row][col] = player;
  const opponent = player === BLACK ? WHITE : BLACK;
  let captured = 0;
  const checked = new Set();

  for (const [dr, dc] of NEIGHBORS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inside(nr, nc) || next[nr][nc] !== opponent || checked.has(`${nr},${nc}`)) continue;
    const group = groupAt(next, nr, nc);
    group.stones.forEach(([r, c]) => checked.add(`${r},${c}`));
    if (group.liberties.size === 0) {
      captured += group.stones.length;
      group.stones.forEach(([r, c]) => { next[r][c] = EMPTY; });
    }
  }

  if (groupAt(next, row, col).liberties.size === 0) {
    return { legal: false, reason: "자충수는 둘 수 없습니다." };
  }

  const hash = boardHash(next);
  if (positionHistory.length >= 2 && hash === positionHistory[positionHistory.length - 2]) {
    return { legal: false, reason: "패 규칙으로 바로 되잡을 수 없습니다." };
  }
  return { legal: true, next, captured, hash };
}

function snapshot() {
  return {
    board: cloneBoard(board),
    currentPlayer,
    captures: { ...captures },
    positionHistory: [...positionHistory],
    consecutivePasses,
    lastMove: lastMove ? { ...lastMove } : null
  };
}

function playMove(row, col, player) {
  const result = simulateMove(row, col, player);
  if (!result.legal) {
    showMessage(result.reason, true);
    return false;
  }
  history.push(snapshot());
  board = result.next;
  captures[player] += result.captured;
  positionHistory.push(result.hash);
  consecutivePasses = 0;
  lastMove = { row, col, player };
  currentPlayer = player === BLACK ? WHITE : BLACK;
  showMessage(result.captured ? `${result.captured}개의 돌을 잡았습니다.` : "교차점을 눌러 돌을 놓으세요");
  updateUI();
  draw();
  return true;
}

function passTurn() {
  if (gameOver || aiThinking || (mode === "ai" && currentPlayer === WHITE)) return;
  history.push(snapshot());
  consecutivePasses += 1;
  lastMove = null;
  positionHistory.push(boardHash(board));
  if (consecutivePasses >= 2) {
    finishByScore();
    return;
  }
  currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
  showMessage(`${currentPlayer === BLACK ? "백" : "흑"}이 한 수 쉬었습니다.`);
  updateUI();
  draw();
  if (mode === "ai") runAiTurn();
}

function aiPass() {
  history.push(snapshot());
  consecutivePasses += 1;
  lastMove = null;
  positionHistory.push(boardHash(board));
  if (consecutivePasses >= 2) {
    finishByScore();
    return;
  }
  currentPlayer = BLACK;
  showMessage("컴퓨터가 한 수 쉬었습니다.");
  updateUI();
  draw();
}

function territoryScore() {
  const visited = new Set();
  const territory = { [BLACK]: 0, [WHITE]: 0 };
  const stones = { [BLACK]: 0, [WHITE]: 0 };

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== EMPTY) {
        stones[board[row][col]] += 1;
        continue;
      }
      const key = `${row},${col}`;
      if (visited.has(key)) continue;
      const region = [];
      const borders = new Set();
      const stack = [[row, col]];
      visited.add(key);
      while (stack.length) {
        const [r, c] = stack.pop();
        region.push([r, c]);
        for (const [dr, dc] of NEIGHBORS) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inside(nr, nc)) continue;
          if (board[nr][nc] === EMPTY && !visited.has(`${nr},${nc}`)) {
            visited.add(`${nr},${nc}`);
            stack.push([nr, nc]);
          } else if (board[nr][nc] !== EMPTY) {
            borders.add(board[nr][nc]);
          }
        }
      }
      if (borders.size === 1) territory[[...borders][0]] += region.length;
    }
  }
  return {
    black: stones[BLACK] + territory[BLACK],
    white: stones[WHITE] + territory[WHITE] + KOMI,
    territory,
    stones
  };
}

function finishByScore() {
  gameOver = true;
  aiThinking = false;
  const score = territoryScore();
  const winner = score.black > score.white ? BLACK : WHITE;
  const margin = Math.abs(score.black - score.white).toFixed(1).replace(".0", "");
  document.querySelector("#result-title").textContent = `${winner === BLACK ? "흑" : "백"} ${margin}집 승`;
  document.querySelector("#result-score").textContent = `흑 ${score.black}집 · 백 ${score.white}집`;
  overlay.hidden = false;
  showMessage("대국이 끝났습니다.");
  updateUI();
}

function undo() {
  if (!history.length || gameOver || aiThinking) return;
  const count = mode === "ai" && history.length >= 2 ? 2 : 1;
  let state;
  for (let i = 0; i < count; i += 1) state = history.pop() || state;
  if (!state) return;
  board = cloneBoard(state.board);
  currentPlayer = state.currentPlayer;
  captures = { ...state.captures };
  positionHistory = [...state.positionHistory];
  consecutivePasses = state.consecutivePasses;
  lastMove = state.lastMove;
  showMessage("마지막 수를 되돌렸습니다.");
  updateUI();
  draw();
}

function resetGame() {
  window.clearTimeout(aiTimer);
  board = emptyBoard();
  currentPlayer = BLACK;
  captures = { [BLACK]: 0, [WHITE]: 0 };
  history = [];
  positionHistory = [boardHash(board)];
  consecutivePasses = 0;
  gameOver = false;
  aiThinking = false;
  hoverPoint = null;
  lastMove = null;
  overlay.hidden = true;
  showMessage("교차점을 눌러 돌을 놓으세요");
  updateUI();
  draw();
}

function legalAiMoves() {
  const openingPoints = new Set(["3,3", "3,15", "15,3", "15,15", "3,9", "9,3", "9,15", "15,9"]);
  const urgentLiberties = new Map();
  const scannedGroups = new Set();

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== WHITE || scannedGroups.has(`${row},${col}`)) continue;
      const group = groupAt(board, row, col);
      group.stones.forEach(([r, c]) => scannedGroups.add(`${r},${c}`));
      if (group.liberties.size === 1) {
        const liberty = [...group.liberties][0];
        urgentLiberties.set(liberty, (urgentLiberties.get(liberty) || 0) + group.stones.length);
      }
    }
  }

  const moves = [];
  const hasStone = board.some((row) => row.some((cell) => cell !== EMPTY));
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== EMPTY) continue;
      let nearby = !hasStone;
      for (let dr = -2; dr <= 2 && !nearby; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          if (inside(row + dr, col + dc) && board[row + dr][col + dc] !== EMPTY) {
            nearby = true;
            break;
          }
        }
      }
      if (history.length < 12 && openingPoints.has(`${row},${col}`)) nearby = true;
      if (!nearby) continue;
      const result = simulateMove(row, col, WHITE);
      if (!result.legal) continue;

      const ownGroup = groupAt(result.next, row, col);
      const liberties = ownGroup.liberties.size;
      const adjacentOwn = adjacentGroups(board, row, col, WHITE);
      const adjacentEnemy = adjacentGroups(board, row, col, BLACK);
      const pressuredEnemy = adjacentGroups(result.next, row, col, BLACK)
        .filter((group) => group.liberties.size === 1)
        .reduce((sum, group) => sum + group.stones.length, 0);
      const rescueSize = urgentLiberties.get(`${row},${col}`) || 0;
      const centerDistance = Math.hypot(row - 9, col - 9);
      const edgeDistance = Math.min(row, col, SIZE - 1 - row, SIZE - 1 - col);
      const openingBonus = history.length < 12 && openingPoints.has(`${row},${col}`) ? 150 : 0;
      const edgeScore = edgeDistance <= 1 ? -90 : edgeDistance === 2 ? 4 : edgeDistance === 3 ? 20 : 0;
      const selfAtariPenalty = liberties === 1 && result.captured === 0 ? 900 + ownGroup.stones.length * 30 : 0;
      const connectionBonus = adjacentOwn.length > 1 ? (adjacentOwn.length - 1) * 28 : 0;
      const cutBonus = adjacentEnemy.length > 1 ? (adjacentEnemy.length - 1) * 24 : 0;
      const localResponse = lastMove ? Math.max(0, 10 - Math.hypot(row - lastMove.row, col - lastMove.col)) * 4 : 0;
      const spacingScore = stoneSpacingScore(row, col);

      moves.push({
        row, col,
        score:
          result.captured * 1400 +
          rescueSize * 1100 +
          pressuredEnemy * 115 +
          liberties * 11 +
          connectionBonus +
          cutBonus +
          openingBonus +
          edgeScore +
          localResponse +
          spacingScore -
          centerDistance * .12 -
          selfAtariPenalty +
          Math.random() * 7
      });
    }
  }
  moves.sort((a, b) => b.score - a.score);
  return moves;
}

function adjacentGroups(source, row, col, color) {
  const groups = [];
  const seen = new Set();
  for (const [dr, dc] of NEIGHBORS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inside(nr, nc) || source[nr][nc] !== color || seen.has(`${nr},${nc}`)) continue;
    const group = groupAt(source, nr, nc);
    group.stones.forEach(([r, c]) => seen.add(`${r},${c}`));
    groups.push(group);
  }
  return groups;
}

function stoneSpacingScore(row, col) {
  let nearestOwn = Infinity;
  let nearestEnemy = Infinity;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === EMPTY) continue;
      const distance = Math.hypot(row - r, col - c);
      if (board[r][c] === WHITE) nearestOwn = Math.min(nearestOwn, distance);
      else nearestEnemy = Math.min(nearestEnemy, distance);
    }
  }

  let score = 0;
  if (history.length < 30) {
    if (nearestOwn >= 3 && nearestOwn <= 7) score += 32;
    if (nearestOwn < 2) score -= 22;
    if (nearestEnemy >= 2 && nearestEnemy <= 5) score += 18;
  } else {
    if (nearestEnemy <= 3) score += 16;
    if (nearestOwn <= 3) score += 8;
  }
  return score;
}

function runAiTurn() {
  if (mode !== "ai" || gameOver || currentPlayer !== WHITE) return;
  aiThinking = true;
  updateUI();
  aiTimer = window.setTimeout(() => {
    const moves = legalAiMoves();
    aiThinking = false;
    if (!moves.length || (history.length > 180 && moves[0].score < 4)) {
      aiPass();
      return;
    }
    playMove(moves[0].row, moves[0].col, WHITE);
  }, 480);
}

function updateUI() {
  document.querySelector("#black-captures").textContent = captures[BLACK];
  document.querySelector("#white-captures").textContent = captures[WHITE];
  document.querySelector("#black-player").classList.toggle("active", currentPlayer === BLACK && !gameOver);
  document.querySelector("#white-player").classList.toggle("active", currentPlayer === WHITE && !gameOver);
  document.querySelector("#turn-dot").className = `turn-dot ${currentPlayer === BLACK ? "black" : "white"}`;
  const kicker = document.querySelector("#turn-kicker");
  const text = document.querySelector("#turn-text");
  if (gameOver) {
    kicker.textContent = "대국 종료";
    text.textContent = "계가가 완료되었습니다";
  } else if (mode === "ai" && currentPlayer === WHITE) {
    kicker.textContent = "컴퓨터의 차례";
    text.textContent = aiThinking ? "다음 수를 생각하는 중…" : "백돌 차례입니다";
  } else if (mode === "ai") {
    kicker.textContent = "당신의 차례";
    text.textContent = "흑돌을 놓아주세요";
  } else {
    kicker.textContent = currentPlayer === BLACK ? "플레이어 1" : "플레이어 2";
    text.textContent = `${currentPlayer === BLACK ? "흑돌" : "백돌"}을 놓아주세요`;
  }
  document.querySelector("#undo-button").disabled = !history.length || gameOver || aiThinking;
  document.querySelector("#pass-button").disabled = gameOver || aiThinking || (mode === "ai" && currentPlayer === WHITE);
}

function showMessage(text, error = false) {
  const element = document.querySelector("#board-message");
  element.textContent = text;
  element.classList.toggle("error", error);
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
  const pad = side * .052;
  const gap = (side - pad * 2) / (SIZE - 1);
  ctx.clearRect(0, 0, side, side);

  const wood = ctx.createLinearGradient(0, 0, side, side);
  wood.addColorStop(0, "#d7a965");
  wood.addColorStop(.5, "#ca9651");
  wood.addColorStop(1, "#b97f3e");
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, side, side);
  ctx.save();
  ctx.globalAlpha = .11;
  ctx.strokeStyle = "#603815";
  for (let i = 0; i < 40; i += 1) {
    const y = i / 40 * side;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(i) * 3);
    for (let x = 0; x <= side; x += 36) ctx.lineTo(x, y + Math.sin(x * .02 + i) * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(43, 25, 10, .78)";
  ctx.lineWidth = Math.max(1, gap * .035);
  for (let i = 0; i < SIZE; i += 1) {
    const p = pad + i * gap;
    ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(pad + gap * 18, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, pad + gap * 18); ctx.stroke();
  }

  ctx.fillStyle = "rgba(43, 25, 10, .86)";
  [3, 9, 15].forEach((row) => [3, 9, 15].forEach((col) => {
    ctx.beginPath();
    ctx.arc(pad + col * gap, pad + row * gap, Math.max(2.2, gap * .1), 0, Math.PI * 2);
    ctx.fill();
  }));

  if (hoverPoint && !gameOver && !aiThinking && board[hoverPoint.row][hoverPoint.col] === EMPTY && !(mode === "ai" && currentPlayer === WHITE)) {
    drawStone(hoverPoint.row, hoverPoint.col, currentPlayer, pad, gap, .35);
  }
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== EMPTY) drawStone(row, col, board[row][col], pad, gap, 1);
    }
  }
  if (lastMove) {
    const x = pad + lastMove.col * gap;
    const y = pad + lastMove.row * gap;
    ctx.beginPath();
    ctx.strokeStyle = lastMove.player === BLACK ? "#d7aa62" : "#7a3328";
    ctx.lineWidth = Math.max(1.5, gap * .06);
    ctx.arc(x, y, gap * .11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawStone(row, col, player, pad, gap, opacity) {
  const x = pad + col * gap;
  const y = pad + row * gap;
  const radius = gap * .46;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.fillStyle = "rgba(45, 23, 7, .34)";
  ctx.ellipse(x + radius * .15, y + radius * .23, radius * .92, radius * .7, 0, 0, Math.PI * 2);
  ctx.fill();
  const gradient = ctx.createRadialGradient(x - radius * .32, y - radius * .36, radius * .05, x, y, radius);
  if (player === BLACK) {
    gradient.addColorStop(0, "#72756e"); gradient.addColorStop(.3, "#30322f"); gradient.addColorStop(.82, "#0a0b0a"); gradient.addColorStop(1, "#020302");
  } else {
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(.48, "#f1eee7"); gradient.addColorStop(.84, "#c2beb5"); gradient.addColorStop(1, "#929087");
  }
  ctx.beginPath(); ctx.fillStyle = gradient; ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function pointerCell(event) {
  const rect = canvas.getBoundingClientRect();
  const pad = rect.width * .052;
  const gap = (rect.width - pad * 2) / (SIZE - 1);
  const col = Math.round((event.clientX - rect.left - pad) / gap);
  const row = Math.round((event.clientY - rect.top - pad) / gap);
  if (!inside(row, col)) return null;
  if (Math.hypot(event.clientX - rect.left - (pad + col * gap), event.clientY - rect.top - (pad + row * gap)) > gap * .53) return null;
  return { row, col };
}

canvas.addEventListener("pointermove", (event) => { hoverPoint = pointerCell(event); draw(); });
canvas.addEventListener("pointerleave", () => { hoverPoint = null; draw(); });
canvas.addEventListener("pointerdown", (event) => {
  if (gameOver || aiThinking || (mode === "ai" && currentPlayer === WHITE)) return;
  const point = pointerCell(event);
  if (!point) return;
  if (playMove(point.row, point.col, currentPlayer) && mode === "ai" && !gameOver) runAiTurn();
});

modeButtons.forEach((button) => button.addEventListener("click", () => {
  mode = button.dataset.mode;
  modeButtons.forEach((item) => item.classList.toggle("active", item === button));
  document.querySelector("#black-name").textContent = mode === "ai" ? "나" : "플레이어 1";
  document.querySelector("#white-name").textContent = mode === "ai" ? "컴퓨터" : "플레이어 2";
  resetGame();
}));

document.querySelector("#pass-button").addEventListener("click", passTurn);
document.querySelector("#undo-button").addEventListener("click", undo);
document.querySelector("#reset-button").addEventListener("click", resetGame);
document.querySelector("#again-button").addEventListener("click", resetGame);
window.addEventListener("resize", setupCanvas);

canvas.tabIndex = 0;
setupCanvas();
updateUI();
