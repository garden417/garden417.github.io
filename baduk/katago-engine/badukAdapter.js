function u() {
  try {
    const r = globalThis.Worker;
    return typeof r == "function" ? r : null;
  } catch {
    return null;
  }
}
const a = (r) => r.length <= 5 ? r : r.slice(r.length - 5);
class p extends Error {
  canceled = !0;
  constructor(e = "Analysis canceled") {
    super(e), this.name = "KataGoCanceledError";
  }
}
class h {
  worker;
  nextId = 1;
  pendingInit = null;
  pending = /* @__PURE__ */ new Map();
  pendingEval = /* @__PURE__ */ new Map();
  pendingEvalBatch = /* @__PURE__ */ new Map();
  backend = null;
  modelName = null;
  lastLoggedEngineLabel = null;
  constructor() {
    if (!u())
      throw new Error("Browser Worker API is unavailable; KataGo analysis cannot run in this browser context.");
    try {
      this.worker = new Worker(new URL(
        /* @vite-ignore */
        "" + new URL("assets/worker-BVwZ0nEi.js", import.meta.url).href,
        import.meta.url
      ), { type: "module" });
    } catch (e) {
      throw c(e, "KataGo worker failed to start");
    }
    this.worker.onmessage = (e) => {
      const n = e.data;
      if (n.type === "katago:init_result") {
        const t = this.pendingInit;
        if (!t) return;
        this.pendingInit = null, n.ok && this.syncEngineInfo(n), n.ok ? t.resolve() : t.reject(new Error(n.error ?? "Init failed"));
        return;
      }
      if (n.type === "katago:analyze_update") {
        const t = this.pending.get(n.id);
        if (!t || n.canceled || n.error === "canceled" || (this.syncEngineInfo(n), !n.ok || !n.analysis)) return;
        t.onProgress?.(n.analysis);
        return;
      }
      if (n.type === "katago:analyze_result") {
        const t = this.pending.get(n.id);
        if (!t) return;
        if (this.pending.delete(n.id), n.canceled || n.error === "canceled") {
          t.reject(new p());
          return;
        }
        this.syncEngineInfo(n), !n.ok || !n.analysis ? t.reject(new Error(n.error ?? "Analysis failed")) : t.resolve(n.analysis);
        return;
      }
      if (n.type === "katago:eval_result") {
        const t = this.pendingEval.get(n.id);
        if (!t) return;
        this.pendingEval.delete(n.id), this.syncEngineInfo(n), !n.ok || !n.eval ? t.reject(new Error(n.error ?? "Eval failed")) : t.resolve(n.eval);
        return;
      }
      if (n.type === "katago:eval_batch_result") {
        const t = this.pendingEvalBatch.get(n.id);
        if (!t) return;
        this.pendingEvalBatch.delete(n.id), this.syncEngineInfo(n), !n.ok || !n.evals ? t.reject(new Error(n.error ?? "Eval batch failed")) : t.resolve(n.evals);
      }
    };
  }
  dispose() {
    this.worker.terminate();
  }
  postToWorker(e) {
    try {
      this.worker.postMessage(e);
    } catch (n) {
      throw c(n, "KataGo worker message failed");
    }
  }
  syncEngineInfo(e) {
    let n = !1;
    if (typeof e.backend == "string" && e.backend !== this.backend && (this.backend = e.backend, n = !0), typeof e.modelName == "string" && e.modelName !== this.modelName && (this.modelName = e.modelName, n = !0), !n) return;
    const t = [];
    this.backend && t.push(this.backend), this.modelName && t.push(this.modelName);
    const i = t.join(" / ");
    !i || i === this.lastLoggedEngineLabel || (this.lastLoggedEngineLabel = i, console.info(`[katago] engine: ${i}`));
  }
  getEngineInfo() {
    return { backend: this.backend, modelName: this.modelName };
  }
  init(e, n) {
    return this.pendingInit ? Promise.reject(new Error("Init already in progress")) : new Promise((t, i) => {
      this.pendingInit = { resolve: t, reject: i };
      const o = { type: "katago:init", modelUrl: e, backend: n };
      try {
        this.postToWorker(o);
      } catch (s) {
        this.pendingInit = null, i(s);
      }
    });
  }
  async analyze(e) {
    const n = this.nextId++, t = {
      type: "katago:analyze",
      id: n,
      analysisGroup: e.analysisGroup,
      positionId: e.positionId,
      parentPositionId: e.parentPositionId,
      positionKey: e.positionKey,
      parentPositionKey: e.parentPositionKey,
      modelUrl: e.modelUrl,
      backend: e.backend,
      board: e.board,
      previousBoard: e.previousBoard,
      previousPreviousBoard: e.previousPreviousBoard,
      currentPlayer: e.currentPlayer,
      moveHistory: a(e.moveHistory),
      komi: e.komi,
      rules: e.rules,
      regionOfInterest: e.regionOfInterest,
      topK: e.topK,
      analysisPvLen: e.analysisPvLen,
      includeMovesOwnership: e.includeMovesOwnership,
      wideRootNoise: e.wideRootNoise,
      nnRandomize: e.nnRandomize,
      conservativePass: e.conservativePass,
      visits: e.visits,
      maxTimeMs: e.maxTimeMs,
      batchSize: e.batchSize,
      maxChildren: e.maxChildren,
      reportDuringSearchEveryMs: e.reportDuringSearchEveryMs,
      ownershipRefreshIntervalMs: e.ownershipRefreshIntervalMs,
      reuseTree: e.reuseTree,
      ownershipMode: e.ownershipMode
    }, i = new Promise((o, s) => {
      this.pending.set(n, { resolve: o, reject: s, onProgress: e.onProgress });
    });
    try {
      this.postToWorker(t);
    } catch (o) {
      throw this.pending.delete(n), o;
    }
    return i;
  }
  async evaluate(e) {
    const n = this.nextId++, t = {
      type: "katago:eval",
      id: n,
      modelUrl: e.modelUrl,
      backend: e.backend,
      board: e.board,
      previousBoard: e.previousBoard,
      previousPreviousBoard: e.previousPreviousBoard,
      currentPlayer: e.currentPlayer,
      moveHistory: a(e.moveHistory),
      komi: e.komi,
      rules: e.rules,
      conservativePass: e.conservativePass
    }, i = new Promise((o, s) => {
      this.pendingEval.set(n, { resolve: o, reject: s });
    });
    try {
      this.postToWorker(t);
    } catch (o) {
      throw this.pendingEval.delete(n), o;
    }
    return i;
  }
  async evaluateBatch(e) {
    const n = this.nextId++, t = {
      type: "katago:eval_batch",
      id: n,
      modelUrl: e.modelUrl,
      backend: e.backend,
      positions: e.positions.map((o) => ({
        board: o.board,
        previousBoard: o.previousBoard,
        previousPreviousBoard: o.previousPreviousBoard,
        currentPlayer: o.currentPlayer,
        moveHistory: a(o.moveHistory),
        komi: o.komi
      })),
      rules: e.rules,
      conservativePass: e.conservativePass
    }, i = new Promise((o, s) => {
      this.pendingEvalBatch.set(n, { resolve: o, reject: s });
    });
    try {
      this.postToWorker(t);
    } catch (o) {
      throw this.pendingEvalBatch.delete(n), o;
    }
    return i;
  }
}
let l = null;
function c(r, e) {
  const n = r instanceof Error ? r.message : String(r);
  return new Error(n ? `${e}: ${n}` : e);
}
function d() {
  return l || (l = new h()), l;
}
const v = "ABCDEFGHJKLMNOPQRST";
function m([r, e], o = 19) {
  const n = r.toUpperCase() === "B" ? "black" : "white";
  if (e.toLowerCase() === "pass") return { x: -1, y: -1, player: n };
  const t = e.toUpperCase().match(/^([A-HJ-T])(\d{1,2})$/);
  if (!t) throw new Error(`Unsupported move coordinate: ${e}`);
  return {
    x: v.indexOf(t[1]),
    y: o - Number(t[2]),
    player: n
  };
}
function y(r) {
  return r.map((e) => e.map((n) => n === 1 ? "black" : n === 2 ? "white" : null));
}
async function f(r, e = "webgpu") {
  const n = d();
  return await n.init(r, e), n.getEngineInfo();
}
async function k(r) {
  const e = d(), n = await e.analyze({
    analysisGroup: "interactive",
    modelUrl: r.modelUrl,
    backend: r.backend ?? "webgpu",
    board: y(r.board),
    currentPlayer: r.currentPlayer === 1 ? "black" : "white",
    moveHistory: r.moves.map((o) => m(o, r.board.length)),
    komi: 6.5,
    rules: "chinese",
    topK: 5,
    analysisPvLen: 8,
    visits: r.visits ?? 64,
    maxTimeMs: r.maxTimeMs ?? 9e3,
    batchSize: 1,
    maxChildren: 16,
    reuseTree: !0,
    ownershipMode: "none",
    conservativePass: !0
  }), t = n.moves[0] ?? null;
  return {
    move: t ? { row: t.y, col: t.x } : null,
    pass: !t || t.x < 0 || t.y < 0,
    winRate: t?.winRate ?? n.rootWinRate,
    visits: n.rootVisits,
    ...e.getEngineInfo()
  };
}
export {
  k as chooseBrowserKataGoMove,
  f as initializeBrowserKataGo
};
