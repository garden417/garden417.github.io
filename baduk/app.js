"use strict";

let SIZE = localStorage.getItem("baduk-board-size") === "15" ? 15 : 19;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const KOMI = 6.5;
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#result-overlay");
const modeButtons = [...document.querySelectorAll(".mode")];
const engineButtons = [...document.querySelectorAll(".engine-option")];
const sizeButtons = [...document.querySelectorAll(".size-button")];
const enginePanel = document.querySelector("#ai-engine-panel");
const modelSettings = document.querySelector("#model-settings");
const modelWarning = document.querySelector("#model-warning");
const modelProgressWrap = document.querySelector("#model-progress-wrap");
const modelProgress = document.querySelector("#model-progress");
const modelProgressText = document.querySelector("#model-progress-text");
const modelDownloadButton = document.querySelector("#model-download");
const recommendationButton = document.querySelector("#recommendation-button");
const resultUndoButton = document.querySelector("#result-undo-button");
const touchConfirm = document.querySelector("#touch-confirm");
const touchConfirmText = document.querySelector("#touch-confirm-text");
const touchPlaceButton = document.querySelector("#touch-place-button");
const touchCancelButton = document.querySelector("#touch-cancel-button");
const SMALL_MODEL_URL = "./katago-engine/models/katago-small.bin.gz";
const BROWSER_ENGINE_CONFIG = {
  "browser-small": { label: "작은 브라우저 모델", size: "약 3.8MB", url: SMALL_MODEL_URL, visits: 24, maxTimeMs: 7000 },
  "browser-b18": {
    label: "실전용 b18 모델",
    size: "약 96MB",
    parts: Array.from({ length: 6 }, (_, index) => `./katago-engine/models/b18/b18.part${String(index).padStart(2, "0")}`),
    bytes: 97898094,
    visits: 24,
    maxTimeMs: 10000
  }
};

let board = emptyBoard();
let currentPlayer = BLACK;
let mode = "ai";
let aiEngine = ["local", "browser-small", "browser-b18"].includes(localStorage.getItem("baduk-ai-engine"))
  ? localStorage.getItem("baduk-ai-engine")
  : "local";
let captures = { [BLACK]: 0, [WHITE]: 0 };
let history = [];
let gameMoves = [];
let positionHistory = [boardHash(board)];
let consecutivePasses = 0;
let gameOver = false;
let aiThinking = false;
let recommendationThinking = false;
let recommendationPoint = null;
let browserEngineModulePromise = null;
let browserModelLoading = false;
const readyBrowserModels = new Set();
const browserModelErrors = new Map();
const browserModelUrls = new Map();
let hoverPoint = null;
let lastMove = null;
let aiTimer = null;
let pendingMove = null;

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
    gameMoves: gameMoves.map((move) => [...move]),
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
  clearPendingMove();
  recommendationPoint = null;
  history.push(snapshot());
  board = result.next;
  gameMoves.push([player === BLACK ? "B" : "W", toKataGoCoordinate(row, col)]);
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
  if (gameOver || aiThinking || recommendationThinking || (mode === "ai" && currentPlayer === WHITE)) return;
  clearPendingMove();
  recommendationPoint = null;
  history.push(snapshot());
  gameMoves.push([currentPlayer === BLACK ? "B" : "W", "pass"]);
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
  clearPendingMove();
  recommendationPoint = null;
  history.push(snapshot());
  gameMoves.push(["W", "pass"]);
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
  recommendationThinking = false;
  recommendationPoint = null;
  clearPendingMove();
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
  if (!history.length || aiThinking || recommendationThinking) return;
  window.clearTimeout(aiTimer);
  let state = history.pop();
  if (mode === "ai" && state?.currentPlayer === WHITE && history.length) state = history.pop() || state;
  if (!state) return;
  board = cloneBoard(state.board);
  currentPlayer = state.currentPlayer;
  captures = { ...state.captures };
  positionHistory = [...state.positionHistory];
  gameMoves = state.gameMoves.map((move) => [...move]);
  consecutivePasses = state.consecutivePasses;
  lastMove = state.lastMove;
  gameOver = false;
  overlay.hidden = true;
  recommendationPoint = null;
  clearPendingMove();
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
  gameMoves = [];
  positionHistory = [boardHash(board)];
  consecutivePasses = 0;
  gameOver = false;
  aiThinking = false;
  recommendationThinking = false;
  recommendationPoint = null;
  hoverPoint = null;
  lastMove = null;
  clearPendingMove();
  overlay.hidden = true;
  canvas.setAttribute("aria-label", `${SIZE} 곱하기 ${SIZE} 바둑판`);
  sizeButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.size) === SIZE));
  showMessage("교차점을 눌러 돌을 놓으세요");
  updateUI();
  draw();
}

function legalAiMoves(player = WHITE) {
  const opponent = player === BLACK ? WHITE : BLACK;
  const middle = Math.floor(SIZE / 2);
  const far = SIZE - 4;
  const openingPoints = new Set([
    `3,3`, `3,${far}`, `${far},3`, `${far},${far}`,
    `3,${middle}`, `${middle},3`, `${middle},${far}`, `${far},${middle}`
  ]);
  const urgentLiberties = new Map();
  const scannedGroups = new Set();

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== player || scannedGroups.has(`${row},${col}`)) continue;
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
      const result = simulateMove(row, col, player);
      if (!result.legal) continue;

      const ownGroup = groupAt(result.next, row, col);
      const liberties = ownGroup.liberties.size;
      const adjacentOwn = adjacentGroups(board, row, col, player);
      const adjacentEnemy = adjacentGroups(board, row, col, opponent);
      const pressuredEnemy = adjacentGroups(result.next, row, col, opponent)
        .filter((group) => group.liberties.size === 1)
        .reduce((sum, group) => sum + group.stones.length, 0);
      const rescueSize = urgentLiberties.get(`${row},${col}`) || 0;
      const centerDistance = Math.hypot(row - middle, col - middle);
      const edgeDistance = Math.min(row, col, SIZE - 1 - row, SIZE - 1 - col);
      const openingBonus = history.length < 12 && openingPoints.has(`${row},${col}`) ? 150 : 0;
      const edgeScore = edgeDistance <= 1 ? -90 : edgeDistance === 2 ? 4 : edgeDistance === 3 ? 20 : 0;
      const selfAtariPenalty = liberties === 1 && result.captured === 0 ? 900 + ownGroup.stones.length * 30 : 0;
      const connectionBonus = adjacentOwn.length > 1 ? (adjacentOwn.length - 1) * 28 : 0;
      const cutBonus = adjacentEnemy.length > 1 ? (adjacentEnemy.length - 1) * 24 : 0;
      const localResponse = lastMove ? Math.max(0, 10 - Math.hypot(row - lastMove.row, col - lastMove.col)) * 4 : 0;
      const spacingScore = stoneSpacingScore(row, col, player);

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

function stoneSpacingScore(row, col, player = WHITE) {
  let nearestOwn = Infinity;
  let nearestEnemy = Infinity;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === EMPTY) continue;
      const distance = Math.hypot(row - r, col - c);
      if (board[r][c] === player) nearestOwn = Math.min(nearestOwn, distance);
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

function runLocalAiTurn(delay = 480, fallbackMessage = "") {
  if (mode !== "ai" || gameOver || currentPlayer !== WHITE) return;
  aiThinking = true;
  updateUI();
  aiTimer = window.setTimeout(() => {
    const moves = legalAiMoves(WHITE);
    aiThinking = false;
    if (!moves.length || (history.length > 180 && moves[0].score < 4)) {
      aiPass();
      return;
    }
    playMove(moves[0].row, moves[0].col, WHITE);
    if (fallbackMessage) showMessage(fallbackMessage, true);
  }, delay);
}

function toKataGoCoordinate(row, col) {
  const columns = "ABCDEFGHJKLMNOPQRST";
  return `${columns[col]}${SIZE - row}`;
}

function getBrowserEngineConfig() {
  return BROWSER_ENGINE_CONFIG[aiEngine] || null;
}

function resolvedModelUrl(config) {
  return config.url ? new URL(config.url, window.location.href).href : browserModelUrls.get(aiEngine);
}

function loadBrowserEngineModule() {
  if (!browserEngineModulePromise) {
    browserEngineModulePromise = import("./katago-engine/badukAdapter.js");
  }
  return browserEngineModulePromise;
}

function setModelProgress(percent, text) {
  modelProgressWrap.hidden = false;
  if (Number.isFinite(percent)) {
    modelProgress.removeAttribute("value");
    modelProgress.value = Math.max(0, Math.min(100, percent));
  } else {
    modelProgress.removeAttribute("value");
  }
  modelProgressText.textContent = text;
}

async function preloadModel(config) {
  if (config.parts) {
    const buffers = [];
    let received = 0;
    for (let index = 0; index < config.parts.length; index += 1) {
      const partUrl = new URL(config.parts[index], window.location.href).href;
      const response = await fetch(partUrl, { cache: "force-cache" });
      if (!response.ok) throw new Error(`b18 모델 조각 다운로드 실패 (${index + 1}/${config.parts.length})`);
      const buffer = await response.arrayBuffer();
      buffers.push(buffer);
      received += buffer.byteLength;
      const percent = received / config.bytes * 100;
      setModelProgress(percent, `${index + 1}/${config.parts.length} · ${(received / 1024 / 1024).toFixed(1)}MB`);
    }
    setModelProgress(100, "다운로드 완료");
    return URL.createObjectURL(new Blob(buffers, { type: "application/gzip" }));
  }

  const response = await fetch(config.url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`모델 다운로드 실패 (${response.status})`);
  const total = Number(response.headers.get("Content-Length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) {
    await response.arrayBuffer();
    setModelProgress(100, "다운로드 완료");
    return resolvedModelUrl(config);
  }

  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    const downloadedMb = (received / 1024 / 1024).toFixed(1);
    if (total) {
      const percent = received / total * 100;
      setModelProgress(percent, `${Math.round(percent)}% · ${downloadedMb}MB`);
    } else {
      setModelProgress(NaN, `${downloadedMb}MB 받는 중`);
    }
  }
  setModelProgress(100, "다운로드 완료");
  return resolvedModelUrl(config);
}

async function prepareBrowserModel() {
  const config = getBrowserEngineConfig();
  if (!config || readyBrowserModels.has(aiEngine)) return true;
  if (browserModelLoading) return false;

  const targetEngine = aiEngine;
  browserModelLoading = true;
  browserModelErrors.delete(targetEngine);
  modelDownloadButton.disabled = true;
  modelDownloadButton.textContent = "AI 모델 준비 중…";
  setEngineStatus(config.label, "다운로드 중");
  setModelProgress(0, `${config.size} 다운로드 시작`);

  try {
    const modelUrl = await preloadModel(config);
    browserModelUrls.set(targetEngine, modelUrl);
    setModelProgress(NaN, "모델을 GPU에 불러오는 중");
    const engine = await loadBrowserEngineModule();
    const info = await engine.initializeBrowserKataGo(modelUrl, "webgpu");
    readyBrowserModels.add(targetEngine);
    setModelProgress(100, "준비 완료");
    setEngineStatus(config.label, info.backend || "준비됨", "ready");
    showMessage(`${config.label} 준비가 완료되었습니다.`);
    return true;
  } catch (error) {
    const reason = error?.message || "브라우저 AI를 준비하지 못했습니다.";
    browserModelErrors.set(targetEngine, reason);
    setEngineStatus(config.label, "준비 실패", "error");
    setModelProgress(0, "다시 시도해 주세요");
    showMessage(`${reason} 현재 AI를 대신 사용할 수 있습니다.`, true);
    return false;
  } finally {
    browserModelLoading = false;
    modelDownloadButton.disabled = false;
    updateEngineUI();
  }
}

async function runBrowserAiTurn() {
  if (mode !== "ai" || gameOver || currentPlayer !== WHITE) return;
  const config = getBrowserEngineConfig();
  if (!config) return;
  aiThinking = true;
  updateUI();
  showMessage(`${config.label}이 다음 수를 계산하고 있습니다.`);

  try {
    if (!readyBrowserModels.has(aiEngine)) {
      const ready = await prepareBrowserModel();
      if (!ready) throw new Error("브라우저 모델 준비에 실패했습니다.");
    }
    const engine = await loadBrowserEngineModule();
    const result = await engine.chooseBrowserKataGoMove({
      board: cloneBoard(board),
      currentPlayer: WHITE,
      moves: gameMoves.map((move) => [...move]),
      modelUrl: resolvedModelUrl(config),
      backend: "webgpu",
      visits: config.visits,
      maxTimeMs: config.maxTimeMs
    });
    aiThinking = false;
    if (result.pass) {
      aiPass();
      return;
    }
    if (!simulateMove(result.move.row, result.move.col, WHITE).legal) {
      throw new Error("브라우저 AI가 둘 수 없는 수를 선택했습니다.");
    }
    playMove(result.move.row, result.move.col, WHITE);
    setEngineStatus(config.label, result.backend || "실행 중", "ready");
  } catch (error) {
    aiThinking = false;
    const reason = error?.message || "브라우저 AI 실행 오류";
    browserModelErrors.set(aiEngine, reason);
    setEngineStatus(config.label, "대체 실행", "error");
    runLocalAiTurn(260, `${reason} 현재 AI가 대신 두었습니다.`);
  }
}

function runAiTurn() {
  if (aiEngine.startsWith("browser-")) runBrowserAiTurn();
  else runLocalAiTurn();
}

function setRecommendation(move, label) {
  recommendationPoint = move ? { row: move.row, col: move.col } : null;
  if (move) {
    showMessage(`${label} 추천: ${toKataGoCoordinate(move.row, move.col)} · 표시된 교차점은 참고용이며 직접 착수해 주세요.`);
  } else {
    showMessage(`${label} 추천: 지금은 한 수 쉬는 수를 권합니다.`);
  }
}

async function requestAiRecommendation() {
  if (mode !== "ai" || gameOver || currentPlayer !== BLACK || aiThinking || recommendationThinking) return;

  clearPendingMove();
  const targetEngine = aiEngine;
  const config = getBrowserEngineConfig();
  recommendationPoint = null;
  recommendationThinking = true;
  updateUI();
  draw();
  showMessage(`${config?.label || "현재 AI"}가 흑의 추천 수를 계산하고 있습니다.`);

  try {
    if (!config) {
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      const moves = legalAiMoves(BLACK);
      setRecommendation(moves[0] || null, "현재 AI");
      return;
    }

    if (!readyBrowserModels.has(targetEngine)) {
      const ready = await prepareBrowserModel();
      if (!ready) throw new Error("브라우저 모델 준비에 실패했습니다.");
    }
    if (aiEngine !== targetEngine) throw new Error("AI 엔진이 변경되어 추천을 취소했습니다.");

    const engine = await loadBrowserEngineModule();
    const result = await engine.chooseBrowserKataGoMove({
      board: cloneBoard(board),
      currentPlayer: BLACK,
      moves: gameMoves.map((move) => [...move]),
      modelUrl: resolvedModelUrl(config),
      backend: "webgpu",
      visits: config.visits,
      maxTimeMs: config.maxTimeMs
    });
    if (!result.pass && !simulateMove(result.move.row, result.move.col, BLACK).legal) {
      throw new Error("브라우저 AI가 둘 수 없는 수를 추천했습니다.");
    }
    setRecommendation(result.pass ? null : result.move, config.label);
    setEngineStatus(config.label, result.backend || "실행 중", "ready");
  } catch (error) {
    const moves = legalAiMoves(BLACK);
    const reason = error?.message || "브라우저 AI 추천 오류";
    if (moves.length) {
      setRecommendation(moves[0], "현재 AI 대체");
      showMessage(`${reason} 현재 AI가 대신 ${toKataGoCoordinate(moves[0].row, moves[0].col)}을 추천했습니다.`, true);
    } else {
      recommendationPoint = null;
      showMessage(`${reason} 추천할 수 있는 수를 찾지 못했습니다.`, true);
    }
  } finally {
    recommendationThinking = false;
    updateUI();
    draw();
  }
}

function setEngineStatus(title, badge, state = "") {
  document.querySelector("#engine-status").textContent = title;
  const badgeElement = document.querySelector("#engine-badge");
  badgeElement.textContent = badge;
  badgeElement.className = `engine-badge ${state}`.trim();
}

function updateEngineUI() {
  enginePanel.hidden = mode !== "ai";
  const config = getBrowserEngineConfig();
  modelSettings.hidden = !config;
  engineButtons.forEach((button) => {
    const active = button.dataset.engine === aiEngine;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
    button.disabled = aiThinking || recommendationThinking || browserModelLoading;
  });
  if (!config) {
    setEngineStatus("현재 AI 버전", "바로 사용", "ready");
    return;
  }

  modelWarning.textContent = aiEngine === "browser-small"
    ? "작은 모델은 바둑 실력이 약합니다. 한 수 계산이 느리고 배터리 사용량이 커질 수 있습니다."
    : "실전용 b18 모델입니다. 최초 약 96MB를 다운로드하며, 계산 중 기기가 뜨거워지거나 배터리 사용량이 커질 수 있습니다.";
  if (readyBrowserModels.has(aiEngine)) {
    modelDownloadButton.textContent = "AI 모델 준비 완료";
    modelDownloadButton.disabled = true;
    setEngineStatus(config.label, "준비됨", "ready");
  } else if (browserModelLoading) {
    modelDownloadButton.textContent = "AI 모델 준비 중…";
    modelDownloadButton.disabled = true;
  } else {
    modelDownloadButton.textContent = aiEngine === "browser-b18"
      ? "실전용 AI 모델 다운로드 · 약 96MB"
      : "작은 AI 모델 준비 · 약 3.8MB";
    modelDownloadButton.disabled = false;
    if (browserModelErrors.has(aiEngine)) setEngineStatus(config.label, "다시 시도", "error");
    else setEngineStatus(config.label, "준비 필요");
  }
}

function updateUI() {
  updateEngineUI();
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
    text.textContent = recommendationThinking ? "추천 수를 계산하는 중…" : "흑돌을 놓아주세요";
  } else {
    kicker.textContent = currentPlayer === BLACK ? "플레이어 1" : "플레이어 2";
    text.textContent = `${currentPlayer === BLACK ? "흑돌" : "백돌"}을 놓아주세요`;
  }
  recommendationButton.hidden = mode !== "ai";
  recommendationButton.disabled = gameOver || aiThinking || recommendationThinking || currentPlayer !== BLACK;
  recommendationButton.textContent = recommendationThinking
    ? "추천 수 계산 중…"
    : recommendationPoint
      ? "추천 다시 받기"
      : "AI 추천 수 보기";
  document.querySelector("#undo-button").disabled = !history.length || aiThinking || recommendationThinking;
  resultUndoButton.disabled = !history.length || aiThinking || recommendationThinking;
  document.querySelector("#pass-button").disabled = gameOver || aiThinking || recommendationThinking || (mode === "ai" && currentPlayer === WHITE);
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
    ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(pad + gap * (SIZE - 1), p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, pad + gap * (SIZE - 1)); ctx.stroke();
  }

  ctx.fillStyle = "rgba(43, 25, 10, .86)";
  const starLines = [3, Math.floor(SIZE / 2), SIZE - 4];
  starLines.forEach((row) => starLines.forEach((col) => {
    ctx.beginPath();
    ctx.arc(pad + col * gap, pad + row * gap, Math.max(2.2, gap * .1), 0, Math.PI * 2);
    ctx.fill();
  }));

  if (hoverPoint && !gameOver && !aiThinking && !recommendationThinking && board[hoverPoint.row][hoverPoint.col] === EMPTY && !(mode === "ai" && currentPlayer === WHITE)) {
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
  if (recommendationPoint && board[recommendationPoint.row][recommendationPoint.col] === EMPTY) {
    drawRecommendation(recommendationPoint.row, recommendationPoint.col, pad, gap);
  }
  if (pendingMove && board[pendingMove.row][pendingMove.col] === EMPTY) {
    drawStone(pendingMove.row, pendingMove.col, pendingMove.player, pad, gap, .58);
    ctx.beginPath();
    ctx.strokeStyle = "#e8f6eb";
    ctx.lineWidth = Math.max(2, gap * .08);
    ctx.arc(pad + pendingMove.col * gap, pad + pendingMove.row * gap, gap * .49, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRecommendation(row, col, pad, gap) {
  const x = pad + col * gap;
  const y = pad + row * gap;
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "rgba(18, 52, 38, .88)";
  ctx.strokeStyle = "#d9f2df";
  ctx.lineWidth = Math.max(2, gap * .08);
  ctx.arc(x, y, gap * .31, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d9f2df";
  ctx.font = `800 ${Math.max(8, gap * .28)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AI", x, y + gap * .01);
  ctx.restore();
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

function clearPendingMove() {
  pendingMove = null;
  touchConfirm.hidden = true;
}

function selectTouchMove(row, col) {
  const result = simulateMove(row, col, currentPlayer);
  if (!result.legal) {
    showMessage(result.reason, true);
    return;
  }
  pendingMove = { row, col, player: currentPlayer };
  const color = currentPlayer === BLACK ? "흑돌" : "백돌";
  touchConfirmText.textContent = `${toKataGoCoordinate(row, col)}에 ${color}을 둘까요?`;
  touchConfirm.hidden = false;
  showMessage("후보 위치를 확인한 뒤 착수 버튼을 눌러주세요");
  draw();
}

function confirmPendingMove() {
  if (!pendingMove || pendingMove.player !== currentPlayer) {
    clearPendingMove();
    draw();
    return;
  }
  const { row, col } = pendingMove;
  if (playMove(row, col, currentPlayer) && mode === "ai" && !gameOver) runAiTurn();
}

canvas.addEventListener("pointermove", (event) => { hoverPoint = pointerCell(event); draw(); });
canvas.addEventListener("pointerleave", () => { hoverPoint = null; draw(); });
canvas.addEventListener("pointerdown", (event) => {
  if (gameOver || aiThinking || recommendationThinking || (mode === "ai" && currentPlayer === WHITE)) return;
  const point = pointerCell(event);
  if (!point) return;
  if (event.pointerType === "touch") {
    selectTouchMove(point.row, point.col);
    return;
  }
  if (playMove(point.row, point.col, currentPlayer) && mode === "ai" && !gameOver) runAiTurn();
});

modeButtons.forEach((button) => button.addEventListener("click", () => {
  if (aiThinking || recommendationThinking) return;
  clearPendingMove();
  mode = button.dataset.mode;
  modeButtons.forEach((item) => item.classList.toggle("active", item === button));
  document.querySelector("#black-name").textContent = mode === "ai" ? "나" : "플레이어 1";
  document.querySelector("#white-name").textContent = mode === "ai" ? "컴퓨터" : "플레이어 2";
  resetGame();
}));

engineButtons.forEach((button) => button.addEventListener("click", () => {
  if (aiThinking || recommendationThinking || browserModelLoading) return;
  recommendationPoint = null;
  clearPendingMove();
  aiEngine = button.dataset.engine;
  localStorage.setItem("baduk-ai-engine", aiEngine);
  modelProgressWrap.hidden = true;
  modelProgress.value = 0;
  modelProgressText.textContent = "모델 준비 중";
  updateEngineUI();
  const config = getBrowserEngineConfig();
  showMessage(config
    ? `${config.label}을 선택했습니다. 대국 전에 AI 모델을 준비해 주세요.`
    : "현재 AI 버전을 선택했습니다.");
}));

sizeButtons.forEach((button) => button.addEventListener("click", () => {
  if (aiThinking || recommendationThinking || browserModelLoading) return;
  const nextSize = Number(button.dataset.size);
  if (![15, 19].includes(nextSize) || nextSize === SIZE) return;
  SIZE = nextSize;
  localStorage.setItem("baduk-board-size", String(SIZE));
  resetGame();
}));

modelDownloadButton.addEventListener("click", prepareBrowserModel);

recommendationButton.addEventListener("click", requestAiRecommendation);
document.querySelector("#pass-button").addEventListener("click", passTurn);
document.querySelector("#undo-button").addEventListener("click", undo);
resultUndoButton.addEventListener("click", undo);
document.querySelector("#reset-button").addEventListener("click", resetGame);
document.querySelector("#again-button").addEventListener("click", resetGame);
touchPlaceButton.addEventListener("click", confirmPendingMove);
touchCancelButton.addEventListener("click", () => { clearPendingMove(); showMessage("교차점을 눌러 돌을 놓으세요"); draw(); });
window.addEventListener("resize", setupCanvas);

canvas.tabIndex = 0;
setupCanvas();
resetGame();
