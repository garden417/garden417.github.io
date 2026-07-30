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
  },
  {
    id: "bei",
    syllable: "BEI",
    a: { hanzi: "杯", pinyin: "bēi", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "컵, 잔", speech: "杯" },
    b: { hanzi: "北", pinyin: "běi", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "북쪽", speech: "北" },
    tip: "컵의 가장자리는 평평한 <strong>bēi</strong>, 북쪽은 낮게 꺾는 <strong>běi</strong>"
  },
  {
    id: "chang",
    syllable: "CHANG",
    a: { hanzi: "长", pinyin: "cháng", tone: 2, toneName: "2성 · 위로 올리기", meaning: "길다", speech: "长" },
    b: { hanzi: "唱", pinyin: "chàng", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "노래하다", speech: "唱" },
    tip: "길이는 위로 뻗는 <strong>cháng</strong>, 노래의 끝은 내려오는 <strong>chàng</strong>"
  },
  {
    id: "dong",
    syllable: "DONG",
    a: { hanzi: "东", pinyin: "dōng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "동쪽", speech: "东" },
    b: { hanzi: "懂", pinyin: "dǒng", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "이해하다", speech: "懂" },
    tip: "동쪽 지평선은 평평한 <strong>dōng</strong>, 이해할 땐 고개를 끄덕이며 <strong>dǒng</strong>"
  },
  {
    id: "fang",
    syllable: "FANG",
    a: { hanzi: "房", pinyin: "fáng", tone: 2, toneName: "2성 · 위로 올리기", meaning: "방, 집", speech: "房" },
    b: { hanzi: "放", pinyin: "fàng", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "놓다", speech: "放" },
    tip: "방으로 올라가는 <strong>fáng</strong>, 물건을 내려놓는 <strong>fàng</strong>"
  },
  {
    id: "gao",
    syllable: "GAO",
    a: { hanzi: "高", pinyin: "gāo", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "높다", speech: "高" },
    b: { hanzi: "告", pinyin: "gào", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "알리다", speech: "告" },
    tip: "높은 곳을 길게 <strong>gāo</strong>, 소식은 분명하게 <strong>gào</strong>"
  },
  {
    id: "hai",
    syllable: "HAI",
    a: { hanzi: "海", pinyin: "hǎi", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "바다", speech: "海" },
    b: { hanzi: "害", pinyin: "hài", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "해치다", speech: "害" },
    tip: "바다의 파도는 꺾이는 <strong>hǎi</strong>, 해침은 단호한 <strong>hài</strong>"
  },
  {
    id: "he",
    syllable: "HE",
    a: { hanzi: "喝", pinyin: "hē", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "마시다", speech: "喝" },
    b: { hanzi: "河", pinyin: "hé", tone: 2, toneName: "2성 · 위로 올리기", meaning: "강", speech: "河" },
    tip: "물을 길게 마시는 <strong>hē</strong>, 강물은 위로 흐르듯 <strong>hé</strong>"
  },
  {
    id: "ji",
    syllable: "JI",
    a: { hanzi: "鸡", pinyin: "jī", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "닭", speech: "鸡" },
    b: { hanzi: "几", pinyin: "jǐ", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "몇, 얼마나", speech: "几" },
    tip: "닭 울음은 높고 평평한 <strong>jī</strong>, 몇 개인지 물을 땐 <strong>jǐ</strong>"
  },
  {
    id: "lan",
    syllable: "LAN",
    a: { hanzi: "蓝", pinyin: "lán", tone: 2, toneName: "2성 · 위로 올리기", meaning: "파란색", speech: "蓝" },
    b: { hanzi: "烂", pinyin: "làn", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "썩다, 무르다", speech: "烂" },
    tip: "파란 하늘로 올라가는 <strong>lán</strong>, 무른 것은 아래로 처지는 <strong>làn</strong>"
  },
  {
    id: "niu",
    syllable: "NIU",
    a: { hanzi: "牛", pinyin: "niú", tone: 2, toneName: "2성 · 위로 올리기", meaning: "소", speech: "牛" },
    b: { hanzi: "扭", pinyin: "niǔ", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "비틀다", speech: "扭" },
    tip: "소의 뿔은 위로 <strong>niú</strong>, 비틀 때는 꺾어 <strong>niǔ</strong>"
  },
  {
    id: "qing",
    syllable: "QING",
    a: { hanzi: "轻", pinyin: "qīng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "가볍다", speech: "轻" },
    b: { hanzi: "请", pinyin: "qǐng", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "부탁하다, 청하다", speech: "请" },
    tip: "가벼움은 평평한 <strong>qīng</strong>, 정중한 부탁은 낮게 <strong>qǐng</strong>"
  },
  {
    id: "shan",
    syllable: "SHAN",
    a: { hanzi: "山", pinyin: "shān", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "산", speech: "山" },
    b: { hanzi: "闪", pinyin: "shǎn", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "번쩍이다", speech: "闪" },
    tip: "산등성이는 길게 <strong>shān</strong>, 번개는 꺾이며 번쩍 <strong>shǎn</strong>"
  },
  {
    id: "sheng",
    syllable: "SHENG",
    a: { hanzi: "生", pinyin: "shēng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "태어나다", speech: "生" },
    b: { hanzi: "省", pinyin: "shěng", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "아끼다, 절약하다", speech: "省" },
    tip: "새 생명은 곧게 <strong>shēng</strong>, 아낄 때는 눌러 담듯 <strong>shěng</strong>"
  },
  {
    id: "ting",
    syllable: "TING",
    a: { hanzi: "听", pinyin: "tīng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "듣다", speech: "听" },
    b: { hanzi: "停", pinyin: "tíng", tone: 2, toneName: "2성 · 위로 올리기", meaning: "멈추다", speech: "停" },
    tip: "가만히 듣는 <strong>tīng</strong>, 멈추라는 신호는 올라가는 <strong>tíng</strong>"
  },
  {
    id: "xing",
    syllable: "XING",
    a: { hanzi: "星", pinyin: "xīng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "별", speech: "星" },
    b: { hanzi: "醒", pinyin: "xǐng", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "깨다, 정신 차리다", speech: "醒" },
    tip: "별빛은 길게 <strong>xīng</strong>, 잠에서 깰 땐 몸을 일으키며 <strong>xǐng</strong>"
  },
  {
    id: "zhi",
    syllable: "ZHI",
    a: { hanzi: "知", pinyin: "zhī", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "알다", speech: "知" },
    b: { hanzi: "纸", pinyin: "zhǐ", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "종이", speech: "纸" },
    tip: "아는 것은 또렷하게 <strong>zhī</strong>, 종이는 접듯 꺾어 <strong>zhǐ</strong>"
  },
  {
    id: "bian",
    syllable: "BIAN",
    a: { hanzi: "边", pinyin: "biān", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "가, 가장자리", speech: "边" },
    b: { hanzi: "变", pinyin: "biàn", tone: 4, toneName: "4성 · 강하게 내리기", meaning: "변하다", speech: "变" },
    tip: "가장자리는 평평한 <strong>biān</strong>, 변화는 확실하게 꺾는 <strong>biàn</strong>"
  },
  {
    id: "deng",
    syllable: "DENG",
    a: { hanzi: "灯", pinyin: "dēng", tone: 1, toneName: "1성 · 높고 평평하게", meaning: "등, 전등", speech: "灯" },
    b: { hanzi: "等", pinyin: "děng", tone: 3, toneName: "3성 · 낮게 꺾기", meaning: "기다리다", speech: "等" },
    tip: "등불은 한결같이 <strong>dēng</strong>, 기다릴 땐 낮게 머무는 <strong>děng</strong>"
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
  statusButton: document.querySelector("#status-button"),
  statusClose: document.querySelector("#status-close-button"),
  statusOverlay: document.querySelector("#status-overlay"),
  cueLeft: document.querySelector(".cue-left"),
  cueRight: document.querySelector(".cue-right")
};

let queue = [];
let mastered = new Set();
let failedIds = new Set();
let seenIds = new Set();
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
  seenIds = new Set();
  attempts = 0;
  retries = 0;
  animating = false;
  elements.overlay.hidden = true;
  elements.total.textContent = PAIRS.length;
  document.querySelector("#completion-total").textContent = PAIRS.length;
  updateStatusCounts();
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
  const pair = queue.shift();
  attempts += 1;
  seenIds.add(pair.id);

  if (result === "known") {
    mastered.add(pair.id);
    failedIds.delete(pair.id);
  } else {
    retries += 1;
    failedIds.add(pair.id);
    const minimumGap = Math.min(2, queue.length);
    const extraGap = Math.min(2, Math.max(0, queue.length - minimumGap));
    const insertAt = minimumGap + Math.floor(Math.random() * (extraGap + 1));
    queue.splice(insertAt, 0, pair);
  }
  updateStatusCounts();

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

function getPairsByStatus() {
  return {
    mastered: PAIRS.filter((pair) => mastered.has(pair.id)),
    failed: PAIRS.filter((pair) => failedIds.has(pair.id) && !mastered.has(pair.id)),
    unseen: PAIRS.filter((pair) => !seenIds.has(pair.id))
  };
}

function updateStatusCounts() {
  const groups = getPairsByStatus();
  setText("mastered-mini", groups.mastered.length);
  setText("failed-mini", groups.failed.length);
  setText("unseen-mini", groups.unseen.length);
  if (!elements.statusOverlay.hidden) renderStatusLists(groups);
}

function pairListMarkup(pairs, emptyText) {
  if (!pairs.length) return `<p class="empty-list">${emptyText}</p>`;
  return pairs.map((pair) => `
    <article class="status-pair">
      <div>
        <b>${pair.a.hanzi}</b><span>${pair.a.pinyin}</span>
        <i>↔</i>
        <b>${pair.b.hanzi}</b><span>${pair.b.pinyin}</span>
      </div>
      <small>${pair.a.meaning} · ${pair.b.meaning}</small>
    </article>
  `).join("");
}

function renderStatusLists(groups = getPairsByStatus()) {
  const settings = [
    ["mastered", groups.mastered, "아직 암기한 단어쌍이 없어요."],
    ["failed", groups.failed, "다시 학습할 단어쌍이 없어요."],
    ["unseen", groups.unseen, "모든 단어쌍을 확인했어요."]
  ];
  settings.forEach(([name, pairs, emptyText]) => {
    setText(`${name}-list-count`, pairs.length);
    document.querySelector(`#${name}-list`).innerHTML = pairListMarkup(pairs, emptyText);
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

elements.known.addEventListener("click", () => decide("known"));
elements.retry.addEventListener("click", () => decide("retry"));
elements.reset.addEventListener("click", startGame);
elements.restart.addEventListener("click", startGame);
elements.statusButton.addEventListener("click", openStatus);
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
