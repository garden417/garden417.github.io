"use strict";

const PAIRS = [
  {
    id: "mai",
    syllable: "MAI",
    a: { hanzi: "买", pinyin: "mǎi", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "사다", speech: "买" },
    b: { hanzi: "卖", pinyin: "mài", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "팔다", speech: "卖" },
    tip: "살 때는 낮게 <strong>mǎi</strong>, 팔 때는 단호하게 <strong>mài</strong>"
  },
  {
    id: "ma",
    syllable: "MA",
    a: { hanzi: "妈", pinyin: "mā", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "엄마", speech: "妈" },
    b: { hanzi: "马", pinyin: "mǎ", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "말", speech: "马" },
    tip: "엄마는 길고 평평하게 <strong>mā</strong>, 말은 낮게 꺾어 <strong>mǎ</strong>"
  },
  {
    id: "tang",
    syllable: "TANG",
    a: { hanzi: "汤", pinyin: "tāng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "국, 탕", speech: "汤" },
    b: { hanzi: "糖", pinyin: "táng", tone: 2, toneName: "2성 · 위로 올리기", meaning: "설탕", speech: "糖" },
    tip: "뜨거운 국은 평평한 <strong>tāng</strong>, 달콤함은 올라가는 <strong>táng</strong>"
  },
  {
    id: "wen",
    syllable: "WEN",
    a: { hanzi: "温", pinyin: "wēn", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "따뜻하다", speech: "温" },
    b: { hanzi: "问", pinyin: "wèn", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "묻다", speech: "问" },
    tip: "온기는 잔잔하게 <strong>wēn</strong>, 질문은 또렷하게 <strong>wèn</strong>"
  },
  {
    id: "shu",
    syllable: "SHU",
    a: { hanzi: "书", pinyin: "shū", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "책", speech: "书" },
    b: { hanzi: "树", pinyin: "shù", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "나무", speech: "树" },
    tip: "책장은 평평하게 <strong>shū</strong>, 나무는 아래로 뿌리내리듯 <strong>shù</strong>"
  },
  {
    id: "yan",
    syllable: "YAN",
    a: { hanzi: "盐", pinyin: "yán", tone: 2, toneName: "2성 · 위로 올리기", meaning: "소금", speech: "盐" },
    b: { hanzi: "眼", pinyin: "yǎn", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "눈", speech: "眼" },
    tip: "소금은 살짝 올려 <strong>yán</strong>, 눈은 아래로 꺾어 <strong>yǎn</strong>"
  },
  {
    id: "yu",
    syllable: "YU",
    a: { hanzi: "鱼", pinyin: "yú", tone: 2, toneName: "2성 · 위로 올리기", meaning: "물고기", speech: "鱼" },
    b: { hanzi: "雨", pinyin: "yǔ", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "비", speech: "雨" },
    tip: "물고기는 물 위로 <strong>yú</strong>, 비는 아래로 떨어져 <strong>yǔ</strong>"
  },
  {
    id: "hua",
    syllable: "HUA",
    a: { hanzi: "花", pinyin: "huā", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "꽃", speech: "花" },
    b: { hanzi: "画", pinyin: "huà", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "그림, 그리다", speech: "画" },
    tip: "꽃은 활짝 평평하게 <strong>huā</strong>, 그림은 붓을 내리듯 <strong>huà</strong>"
  },
  {
    id: "bao",
    syllable: "BAO",
    a: { hanzi: "包", pinyin: "bāo", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "가방, 싸다", speech: "包" },
    b: { hanzi: "饱", pinyin: "bǎo", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "배부르다", speech: "饱" },
    tip: "가방끈은 곧게 <strong>bāo</strong>, 배부르면 묵직하게 <strong>bǎo</strong>"
  },
  {
    id: "jing",
    syllable: "JING",
    a: { hanzi: "京", pinyin: "jīng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "수도", speech: "京" },
    b: { hanzi: "井", pinyin: "jǐng", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "우물", speech: "井" },
    tip: "수도는 넓고 평평하게 <strong>jīng</strong>, 우물은 깊고 낮게 <strong>jǐng</strong>"
  },
  {
    id: "shi",
    syllable: "SHI",
    a: { hanzi: "十", pinyin: "shí", tone: 2, toneName: "2성 · 위로 올리기", meaning: "열, 10", speech: "十" },
    b: { hanzi: "是", pinyin: "shì", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "~이다, 맞다", speech: "是" },
    tip: "숫자 10은 올라가는 <strong>shí</strong>, 확답은 내려찍는 <strong>shì</strong>"
  },
  {
    id: "qi",
    syllable: "QI",
    a: { hanzi: "七", pinyin: "qī", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "일곱, 7", speech: "七" },
    b: { hanzi: "起", pinyin: "qǐ", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "일어나다", speech: "起" },
    tip: "숫자 7은 곧게 <strong>qī</strong>, 일어날 땐 힘을 모아 꺾는 <strong>qǐ</strong>"
  }
];

const elements = {
  card: document.querySelector("#word-card"),
  stage: document.querySelector("#card-stage"),
  mastered: document.querySelector("#mastered-count"),
  total: document.querySelector("#total-count"),
  progress: document.querySelector(".progress-track"),
  fill: document.querySelector("#progress-fill"),
  round: document.querySelector("#round-label"),
  retryBadge: document.querySelector("#retry-badge"),
  overlay: document.querySelector("#completion-overlay"),
  known: document.querySelector("#known-button"),
  retry: document.querySelector("#retry-button"),
  reset: document.querySelector("#reset-button"),
  restart: document.querySelector("#restart-button"),
  cueLeft: document.querySelector(".cue-left"),
  cueRight: document.querySelector(".cue-right")
};

let queue = [];
let mastered = new Set();
let failedIds = new Set();
let attempts = 0;
let retries = 0;
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

function startGame() {
  queue = shuffle(PAIRS);
  mastered = new Set();
  failedIds = new Set();
  attempts = 0;
  retries = 0;
  animating = false;
  elements.overlay.hidden = true;
  elements.total.textContent = PAIRS.length;
  document.querySelector("#completion-total").textContent = PAIRS.length;
  renderCard();
}

function currentPair() {
  return queue[0];
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
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
    setText(`tone-number-${side}`, word.tone);
    setText(`tone-name-${side}`, word.toneName);
    setText(`meaning-${side}`, word.meaning);
  });
  document.querySelector("#memory-tip").innerHTML = `<b>기억 한 끗</b> ${pair.tip}`;

  const progress = (mastered.size / PAIRS.length) * 100;
  elements.mastered.textContent = mastered.size;
  elements.fill.style.width = `${progress}%`;
  elements.progress.setAttribute("aria-valuenow", mastered.size);
  elements.progress.setAttribute("aria-valuemax", PAIRS.length);
  elements.round.textContent = `${attempts + 1}번째 카드 · 남은 단어쌍 ${PAIRS.length - mastered.size}`;
  elements.retryBadge.hidden = !failedIds.has(pair.id);

  elements.card.style.transform = "";
  elements.card.style.opacity = "";
  elements.card.classList.remove("fly-left", "fly-right", "dragging");
  elements.card.classList.add("enter");
  window.setTimeout(() => elements.card.classList.remove("enter"), 380);
}

function decide(result) {
  if (animating || !currentPair()) return;
  animating = true;
  const pair = queue.shift();
  attempts += 1;

  if (result === "known") {
    mastered.add(pair.id);
  } else {
    retries += 1;
    failedIds.add(pair.id);
    const minimumGap = Math.min(2, queue.length);
    const extraGap = Math.min(2, Math.max(0, queue.length - minimumGap));
    const insertAt = minimumGap + Math.floor(Math.random() * (extraGap + 1));
    queue.splice(insertAt, 0, pair);
  }

  elements.card.classList.add(result === "known" ? "fly-left" : "fly-right");
  window.setTimeout(() => {
    animating = false;
    renderCard();
  }, 350);
}

function finishGame() {
  elements.mastered.textContent = PAIRS.length;
  elements.fill.style.width = "100%";
  elements.progress.setAttribute("aria-valuenow", PAIRS.length);
  setText("retry-count", retries);
  setText("attempt-count", attempts);
  elements.overlay.hidden = false;
  elements.restart.focus();
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

elements.known.addEventListener("click", () => decide("known"));
elements.retry.addEventListener("click", () => decide("retry"));
elements.reset.addEventListener("click", startGame);
elements.restart.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => {
  if (!elements.overlay.hidden || event.target.matches("button")) return;
  if (event.key === "ArrowLeft") decide("known");
  if (event.key === "ArrowRight") decide("retry");
});

startGame();
