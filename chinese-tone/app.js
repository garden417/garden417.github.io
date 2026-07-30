"use strict";

const SETS = window.HSK_PAIR_SETS;
const DEFAULT_SET_ID = "hsk1-4";

const elements = {
  card: document.querySelector("#word-card"),
  stage: document.querySelector("#card-stage"),
  mastered: document.querySelector("#mastered-count"),
  total: document.querySelector("#total-count"),
  currentSetName: document.querySelector("#current-set-name"),
  progress: document.querySelector(".progress-track"),
  fill: document.querySelector("#progress-fill"),
  round: document.querySelector("#round-label"),
  retryBadge: document.querySelector("#retry-badge"),
  overlay: document.querySelector("#completion-overlay"),
  completionTitle: document.querySelector("#completion-title"),
  known: document.querySelector("#known-button"),
  retry: document.querySelector("#retry-button"),
  reset: document.querySelector("#reset-button"),
  restart: document.querySelector("#restart-button"),
  statusButton: document.querySelector("#status-button"),
  mobileStatusButton: document.querySelector("#mobile-status-button"),
  mobileProgressText: document.querySelector("#mobile-progress-text"),
  statusClose: document.querySelector("#status-close-button"),
  statusOverlay: document.querySelector("#status-overlay"),
  statusSetLabel: document.querySelector("#status-set-label"),
  cueLeft: document.querySelector(".cue-left"),
  cueRight: document.querySelector(".cue-right"),
  setButtons: [...document.querySelectorAll(".set-button")]
};

const sessions = {};
let activeSetId = DEFAULT_SET_ID;
let activeSet = SETS[activeSetId];
let pairs = activeSet.pairs;
let session = null;
let animating = false;
let drag = null;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createSession() {
  return {
    queue: shuffle(pairs),
    mastered: new Set(),
    failedIds: new Set(),
    seenIds: new Set(),
    attempts: 0,
    retries: 0
  };
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

const CLASSIC_MEMORY_TIPS = {
  "买|卖": "살 때는 낮게 <strong>mǎi</strong>, 팔 때는 단호하게 <strong>mài</strong>",
  "妈|马": "엄마는 길고 평평하게 <strong>mā</strong>, 말은 낮게 꺾어 <strong>mǎ</strong>",
  "汤|糖": "뜨거운 국은 평평한 <strong>tāng</strong>, 달콤함은 올라가는 <strong>táng</strong>",
  "温|问": "온기는 잔잔하게 <strong>wēn</strong>, 질문은 또렷하게 <strong>wèn</strong>",
  "书|树": "책장은 평평하게 <strong>shū</strong>, 나무는 아래로 뿌리내리듯 <strong>shù</strong>",
  "盐|眼": "소금은 살짝 올려 <strong>yán</strong>, 눈은 아래로 꺾어 <strong>yǎn</strong>",
  "鱼|雨": "물고기는 물 위로 <strong>yú</strong>, 비는 아래로 떨어져 <strong>yǔ</strong>",
  "花|画": "꽃은 활짝 평평하게 <strong>huā</strong>, 그림은 붓을 내리듯 <strong>huà</strong>",
  "包|饱": "가방끈은 곧게 <strong>bāo</strong>, 배부르면 묵직하게 <strong>bǎo</strong>",
  "京|井": "수도는 넓고 평평하게 <strong>jīng</strong>, 우물은 깊고 낮게 <strong>jǐng</strong>",
  "十|是": "숫자 10은 올라가는 <strong>shí</strong>, 확답은 내려찍는 <strong>shì</strong>",
  "七|起": "숫자 7은 곧게 <strong>qī</strong>, 일어날 땐 힘을 모아 꺾는 <strong>qǐ</strong>",
  "杯|北": "컵의 가장자리는 평평한 <strong>bēi</strong>, 북쪽은 낮게 꺾는 <strong>běi</strong>",
  "长|唱": "길이는 위로 뻗는 <strong>cháng</strong>, 노래의 끝은 내려오는 <strong>chàng</strong>",
  "东|懂": "동쪽 지평선은 평평한 <strong>dōng</strong>, 이해할 땐 고개를 끄덕이며 <strong>dǒng</strong>",
  "房|放": "방으로 올라가는 <strong>fáng</strong>, 물건을 내려놓는 <strong>fàng</strong>"
};

const TONE_IMAGES = {
  1: ["수평선처럼 곧게", "외줄을 타듯 반듯하게", "음을 길게 편 채"],
  2: ["엘리베이터처럼 위로", "물음표 꼬리처럼 올려", "연을 띄우듯 끌어올려"],
  3: ["웅크렸다 튀듯 낮게 꺾어", "그네가 바닥을 찍듯 푹 꺾어", "잠깐 숨었다 나오듯 낮게 꺾어"],
  4: ["마침표를 찍듯 단호하게 내려", "낙하산 없이 툭 떨어뜨려", "도장을 찍듯 힘있게 내려"],
  5: ["깃털처럼 가볍게", "끝음을 살짝 놓듯 가볍게", "속삭이듯 짧고 가볍게"]
};

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stableNumber(value) {
  return [...value].reduce((total, character) => total + character.codePointAt(0), 0);
}

function compactMeaning(value) {
  const firstMeaning = String(value).split(/[;；]/)[0].trim();
  const compact = firstMeaning.length > 18
    ? `${firstMeaning.slice(0, 18)}…`
    : firstMeaning;
  return escapeHTML(compact);
}

function firstDifferentTone(pair) {
  const tonesA = String(pair.a.tones).split("·").map(Number);
  const tonesB = String(pair.b.tones).split("·").map(Number);
  const length = Math.max(tonesA.length, tonesB.length);
  for (let index = 0; index < length; index += 1) {
    if (tonesA[index] !== tonesB[index]) {
      return [tonesA[index] || 5, tonesB[index] || 5];
    }
  }
  return [tonesA[0] || 5, tonesB[0] || 5];
}

function memoryTip(pair) {
  const classic = CLASSIC_MEMORY_TIPS[`${pair.a.hanzi}|${pair.b.hanzi}`];
  if (classic) return classic;
  if (pair.tip) return pair.tip;

  const seed = stableNumber(pair.id);
  const [toneA, toneB] = firstDifferentTone(pair);
  const cueA = (TONE_IMAGES[toneA] || TONE_IMAGES[5])[seed % 3];
  const cueB = (TONE_IMAGES[toneB] || TONE_IMAGES[5])[(seed + 1) % 3];
  const meaningA = compactMeaning(pair.a.meaning);
  const meaningB = compactMeaning(pair.b.meaning);
  const pinyinA = escapeHTML(pair.a.pinyin);
  const pinyinB = escapeHTML(pair.b.pinyin);

  const templates = [
    `“${meaningA}”는 ${cueA} <strong>${pinyinA}</strong>, “${meaningB}”는 ${cueB} <strong>${pinyinB}</strong>!`,
    `${meaningA}을 떠올리며 ${cueA} <strong>${pinyinA}</strong>. ${meaningB}은 ${cueB} <strong>${pinyinB}</strong>!`,
    `소리는 쌍둥이, 움직임은 딴판! ${cueA} <strong>${pinyinA}</strong>는 ${meaningA}, ${cueB} <strong>${pinyinB}</strong>는 ${meaningB}.`
  ];
  return templates[seed % templates.length];
}

function currentPair() {
  return session.queue[0];
}

function updateSetButtons() {
  elements.setButtons.forEach((button) => {
    const setId = button.dataset.set;
    const selected = setId === activeSetId;
    const setSession = sessions[setId];
    const done = setSession?.mastered.size || 0;
    const total = SETS[setId].pairs.length;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected);
    setText(`set-progress-${setId}`, `${done}/${total}`);
  });
}

function startGame() {
  session = createSession();
  sessions[activeSetId] = session;
  animating = false;
  elements.overlay.hidden = true;
  elements.statusOverlay.hidden = true;
  updateSetChrome();
  updateStatusCounts();
  renderCard();
}

function switchSet(setId) {
  if (!SETS[setId] || setId === activeSetId || animating) return;
  activeSetId = setId;
  activeSet = SETS[setId];
  pairs = activeSet.pairs;
  session = sessions[setId] || createSession();
  sessions[setId] = session;
  elements.overlay.hidden = true;
  elements.statusOverlay.hidden = true;
  updateSetChrome();
  updateStatusCounts();
  renderCard();
}

function updateSetChrome() {
  elements.total.textContent = pairs.length;
  elements.currentSetName.textContent = activeSet.shortTitle;
  elements.progress.setAttribute("aria-valuemax", pairs.length);
  elements.statusSetLabel.textContent = `${activeSet.title} · ${pairs.length}개 단어쌍`;
  document.querySelector("#completion-total").textContent = pairs.length;
  elements.completionTitle.innerHTML = `${activeSet.title}<br />세트 완료!`;
  updateSetButtons();
}

function renderCard() {
  const pair = currentPair();
  if (!pair) {
    finishGame();
    return;
  }

  setText("syllable-label", `${pair.syllable} · 성조 비교`);
  ["a", "b"].forEach((side) => {
    const word = pair[side];
    setText(`hanzi-${side}`, word.hanzi);
    setText(`pinyin-${side}`, word.pinyin);
    document.querySelector(`#hanzi-${side}`).className =
      `hanzi length-${Math.min(word.hanzi.length, 4)}`;
    document.querySelector(`#pinyin-${side}`).className =
      `pinyin length-${Math.min(word.pinyin.length, 12)}`;
    setText(`tone-number-${side}`, word.tones);
    setText(`meaning-${side}`, word.meaning);
  });
  document.querySelector("#memory-tip").innerHTML =
    `<b>기억 한 끗</b> ${memoryTip(pair)}`;

  const progress = (session.mastered.size / pairs.length) * 100;
  elements.mastered.textContent = session.mastered.size;
  elements.fill.style.width = `${progress}%`;
  elements.progress.setAttribute("aria-valuenow", session.mastered.size);
  elements.round.textContent =
    `${activeSet.shortTitle} · ${session.attempts + 1}번째 카드 · ` +
    `남은 단어쌍 ${pairs.length - session.mastered.size}`;
  elements.retryBadge.hidden = !session.failedIds.has(pair.id);
  updateStatusCounts();

  elements.card.style.transform = "";
  elements.card.style.opacity = "";
  elements.card.classList.remove("fly-left", "fly-right", "dragging");
  elements.card.classList.add("enter");
  window.setTimeout(() => elements.card.classList.remove("enter"), 380);
}

function decide(result) {
  if (animating || !currentPair()) return;
  animating = true;
  const pair = session.queue.shift();
  session.attempts += 1;
  session.seenIds.add(pair.id);

  if (result === "known") {
    session.mastered.add(pair.id);
    session.failedIds.delete(pair.id);
  } else {
    session.retries += 1;
    session.failedIds.add(pair.id);
    const minimumGap = Math.min(2, session.queue.length);
    const extraGap = Math.min(3, Math.max(0, session.queue.length - minimumGap));
    const insertAt = minimumGap + Math.floor(Math.random() * (extraGap + 1));
    session.queue.splice(insertAt, 0, pair);
  }

  updateStatusCounts();
  updateSetButtons();
  elements.card.classList.add(result === "known" ? "fly-left" : "fly-right");
  window.setTimeout(() => {
    animating = false;
    renderCard();
  }, 350);
}

function finishGame() {
  elements.mastered.textContent = pairs.length;
  elements.fill.style.width = "100%";
  elements.progress.setAttribute("aria-valuenow", pairs.length);
  setText("retry-count", session.retries);
  setText("attempt-count", session.attempts);
  updateSetButtons();
  elements.overlay.hidden = false;
  elements.restart.focus();
}

function getPairsByStatus() {
  return {
    mastered: pairs.filter((pair) => session.mastered.has(pair.id)),
    failed: pairs.filter(
      (pair) => session.failedIds.has(pair.id) && !session.mastered.has(pair.id)
    ),
    unseen: pairs.filter((pair) => !session.seenIds.has(pair.id))
  };
}

function updateStatusCounts() {
  const groups = getPairsByStatus();
  setText("mastered-mini", groups.mastered.length);
  setText("failed-mini", groups.failed.length);
  setText("unseen-mini", groups.unseen.length);
  elements.mobileProgressText.textContent =
    `${activeSet.shortTitle} · ${groups.mastered.length}/${pairs.length}`;
  if (!elements.statusOverlay.hidden) renderStatusLists(groups);
}

function pairListMarkup(list, emptyText) {
  if (!list.length) return `<p class="empty-list">${emptyText}</p>`;
  return list.map((pair) => `
    <article class="status-pair">
      <div>
        <b>${pair.a.hanzi}</b><span>${pair.a.pinyin}</span>
        <i>↔</i>
        <b>${pair.b.hanzi}</b><span>${pair.b.pinyin}</span>
      </div>
      <small>HSK ${pair.a.level}·${pair.b.level}급 · ${pair.a.meaning} · ${pair.b.meaning}</small>
    </article>
  `).join("");
}

function renderStatusLists(groups = getPairsByStatus()) {
  const settings = [
    ["mastered", groups.mastered, "아직 암기한 단어쌍이 없어요."],
    ["failed", groups.failed, "다시 학습할 단어쌍이 없어요."],
    ["unseen", groups.unseen, "모든 단어쌍을 확인했어요."]
  ];
  settings.forEach(([name, list, emptyText]) => {
    setText(`${name}-list-count`, list.length);
    document.querySelector(`#${name}-list`).innerHTML = pairListMarkup(list, emptyText);
  });
}

function openStatus() {
  renderStatusLists();
  elements.statusOverlay.hidden = false;
  elements.statusClose.focus();
}

function closeStatus() {
  elements.statusOverlay.hidden = true;
  elements.statusButton.focus();
}

function speak(side) {
  const pair = currentPair();
  if (!pair || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(pair[side].speech);
  utterance.lang = "zh-CN";
  utterance.rate = 0.72;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function updateDrag(x) {
  if (!drag || animating) return;
  const delta = x - drag.startX;
  drag.delta = delta;
  const rotation = Math.max(-8, Math.min(8, delta / 28));
  elements.card.style.transform = `translateX(${delta}px) rotate(${rotation}deg)`;
  const strength = Math.min(1, Math.abs(delta) / 120);
  elements.cueLeft.style.opacity = delta < 0 ? strength : 0;
  elements.cueRight.style.opacity = delta > 0 ? strength : 0;
}

function endDrag() {
  if (!drag) return;
  const delta = drag.delta || 0;
  drag = null;
  elements.card.classList.remove("dragging");
  elements.cueLeft.style.opacity = 0;
  elements.cueRight.style.opacity = 0;
  if (Math.abs(delta) >= 95) {
    decide(delta < 0 ? "known" : "retry");
  } else {
    elements.card.style.transition = "transform 180ms ease";
    elements.card.style.transform = "";
    window.setTimeout(() => { elements.card.style.transition = ""; }, 190);
  }
}

elements.card.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button") || animating) return;
  drag = { startX: event.clientX, delta: 0 };
  elements.card.classList.add("dragging");
  elements.card.setPointerCapture(event.pointerId);
});
elements.card.addEventListener("pointermove", (event) => updateDrag(event.clientX));
elements.card.addEventListener("pointerup", endDrag);
elements.card.addEventListener("pointercancel", endDrag);

document.querySelectorAll(".sound-button").forEach((button) => {
  button.addEventListener("click", () => speak(button.dataset.sound));
});
elements.setButtons.forEach((button) => {
  button.addEventListener("click", () => switchSet(button.dataset.set));
});
elements.known.addEventListener("click", () => decide("known"));
elements.retry.addEventListener("click", () => decide("retry"));
elements.reset.addEventListener("click", startGame);
elements.restart.addEventListener("click", startGame);
elements.statusButton.addEventListener("click", openStatus);
elements.mobileStatusButton.addEventListener("click", openStatus);
elements.statusClose.addEventListener("click", closeStatus);
elements.statusOverlay.addEventListener("click", (event) => {
  if (event.target === elements.statusOverlay) closeStatus();
});

window.addEventListener("keydown", (event) => {
  if (!elements.statusOverlay.hidden) {
    if (event.key === "Escape") closeStatus();
    return;
  }
  if (!elements.overlay.hidden || event.target.matches("button")) return;
  if (event.key === "ArrowLeft") decide("known");
  if (event.key === "ArrowRight") decide("retry");
});

startGame();
