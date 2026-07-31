(() => {
  "use strict";

  const REQUIRED_HEADERS = [
    "검수번호", "pair_id", "세트명", "쌍 구분", "중국어", "병음", "성조",
    "HSK 급수", "원본 한국어 뜻", "검수 결과", "수정 한국어 뜻", "검수 메모",
  ];
  const VALID_RESULTS = new Set(["미검수", "정확", "수정 필요", "보류"]);
  const DB_NAME = "chinese-tone-review";
  const DB_VERSION = 1;
  const STORE_NAME = "review-data";

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    startView: $("#start-view"), reviewView: $("#review-view"), resumePanel: $("#resume-panel"),
    resumeSummary: $("#resume-summary"), resumeTime: $("#resume-time"), resumeButton: $("#resume-button"),
    openFile: $("#open-file-button"), fileInput: $("#file-input"), changeFile: $("#change-file-button"),
    fileName: $("#file-name"), ratio: $("#progress-ratio"), progressBar: $("#progress-bar"),
    countUnchecked: $("#count-unchecked"), countCorrect: $("#count-correct"), countRevise: $("#count-revise"), countHold: $("#count-hold"),
    statusChips: Array.from(document.querySelectorAll(".status-chip")), goUnchecked: $("#go-unchecked-button"),
    saveXlsx: $("#save-xlsx-button"), downloadXlsx: $("#download-xlsx-link"), autosave: $("#autosave-state"), position: $("#item-position"),
    status: $("#item-status"), pairLabel: $("#pair-label"), setLabel: $("#set-label"), hanzi: $("#hanzi"),
    pinyin: $("#pinyin"), tone: $("#tone"), hsk: $("#hsk-level"), original: $("#original-meaning"),
    form: $("#review-form"), radios: Array.from(document.querySelectorAll('input[name="review-result"]')),
    revised: $("#revised-meaning"), memo: $("#review-memo"), revisedField: $("#revised-field"), memoField: $("#memo-field"),
    error: $("#form-error"), previous: $("#previous-button"), markUnchecked: $("#mark-unchecked-button"),
    toast: $("#toast"), fileDialog: $("#file-dialog"), fileDialogCopy: $("#file-dialog-copy"),
    useFileOnly: $("#use-file-only-button"), mergeBrowser: $("#merge-browser-button"),
  };

  let sourceBuffer = null;
  let sourceFileName = "중국어_뜻검수.xlsx";
  let workbookMeta = null;
  let records = [];
  let reviews = {};
  let datasetId = "";
  let currentIndex = 0;
  let activeFilter = "미검수";
  let pendingImport = null;
  let saveTimer = null;
  let toastTimer = null;
  let preparedDownloadUrl = "";

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGet(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }).finally(() => db.close());
  }

  async function dbPut(value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    }).finally(() => db.close());
  }

  async function dbDelete(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    }).finally(() => db.close());
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function toText(value) {
    return value == null ? "" : String(value).trim();
  }

  function reviewKey(record) {
    return `${record.pairId}::${record.side}`;
  }

  function reviewFor(record) {
    return reviews[reviewKey(record)] || { result: "미검수", revised: "", memo: "", updatedAt: "" };
  }

  function parseWorkbook(buffer, fileName) {
    if (!window.XLSX) throw new Error("엑셀 처리 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
    const workbook = XLSX.read(buffer, { type: "array", cellStyles: true, cellDates: true });
    let matched = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      const headerRow = rows.findIndex((row) => REQUIRED_HEADERS.every((header) => row.map(toText).includes(header)));
      if (headerRow >= 0) {
        matched = { sheetName, sheet, rows, headerRow };
        break;
      }
    }
    if (!matched) throw new Error("검수표 형식을 확인할 수 없습니다. 원본 검수 XLSX 파일을 선택해 주세요.");

    const headers = matched.rows[matched.headerRow].map(toText);
    const columns = Object.fromEntries(REQUIRED_HEADERS.map((header) => [header, headers.indexOf(header)]));
    const parsedRecords = [];
    const parsedReviews = {};
    const seen = new Set();

    for (let rowIndex = matched.headerRow + 1; rowIndex < matched.rows.length; rowIndex += 1) {
      const row = matched.rows[rowIndex];
      const pairId = toText(row[columns.pair_id]);
      const side = toText(row[columns["쌍 구분"]]).toUpperCase();
      if (!pairId && !side) continue;
      if (!pairId || !side) throw new Error(`${rowIndex + 1}행의 pair_id 또는 쌍 구분이 비어 있습니다.`);
      const key = `${pairId}::${side}`;
      if (seen.has(key)) throw new Error(`${rowIndex + 1}행에 중복된 단어 식별자가 있습니다: ${pairId} ${side}`);
      seen.add(key);

      const resultRaw = toText(row[columns["검수 결과"]]);
      const result = VALID_RESULTS.has(resultRaw) ? resultRaw : "미검수";
      const record = {
        rowIndex,
        number: toText(row[columns["검수번호"]]),
        pairId,
        side,
        setName: toText(row[columns["세트명"]]),
        hanzi: toText(row[columns["중국어"]]),
        pinyin: toText(row[columns["병음"]]),
        tone: toText(row[columns["성조"]]),
        hsk: toText(row[columns["HSK 급수"]]),
        original: toText(row[columns["원본 한국어 뜻"]]),
      };
      parsedRecords.push(record);
      parsedReviews[key] = {
        result,
        revised: toText(row[columns["수정 한국어 뜻"]]),
        memo: toText(row[columns["검수 메모"]]),
        updatedAt: "",
      };
    }

    if (!parsedRecords.length) throw new Error("검수할 단어가 없습니다.");
    const fingerprint = parsedRecords
      .map((record) => `${record.pairId}|${record.side}|${record.hanzi}|${record.original}`)
      .join("\n");
    return {
      buffer: buffer.slice(0),
      fileName,
      datasetId: `review-${parsedRecords.length}-${hashText(fingerprint)}`,
      records: parsedRecords,
      reviews: parsedReviews,
      meta: { sheetName: matched.sheetName, headerRow: matched.headerRow, columns },
    };
  }

  function countStatuses(map = reviews) {
    const counts = { "미검수": 0, "정확": 0, "수정 필요": 0, "보류": 0 };
    records.forEach((record) => {
      const result = map[reviewKey(record)]?.result;
      counts[VALID_RESULTS.has(result) ? result : "미검수"] += 1;
    });
    return counts;
  }

  function completedCount(map = reviews) {
    const counts = countStatuses(map);
    return records.length - counts["미검수"];
  }

  async function persistSource() {
    await dbPut({
      id: "source",
      datasetId,
      fileName: sourceFileName,
      buffer: sourceBuffer,
      meta: workbookMeta,
      savedAt: new Date().toISOString(),
    });
  }

  async function persistProgress() {
    const counts = countStatuses();
    await dbPut({
      id: "progress",
      datasetId,
      reviews,
      currentKey: records[currentIndex] ? reviewKey(records[currentIndex]) : "",
      activeFilter,
      total: records.length,
      counts,
      savedAt: new Date().toISOString(),
    });
    elements.autosave.textContent = `브라우저 자동 저장 · ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function schedulePersist() {
    clearTimeout(saveTimer);
    elements.autosave.textContent = "저장 중…";
    saveTimer = setTimeout(() => persistProgress().catch(() => {
      elements.autosave.textContent = "자동 저장 실패 · 엑셀로 저장해 주세요";
    }), 180);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2800);
  }

  function setFormMode(result) {
    elements.revisedField.classList.toggle("required", result === "수정 필요");
    elements.memoField.classList.toggle("required", result === "보류");
    elements.error.hidden = true;
  }

  function renderProgress() {
    const counts = countStatuses();
    const completed = records.length - counts["미검수"];
    const ratio = records.length ? Math.round((completed / records.length) * 100) : 0;
    elements.ratio.textContent = `${ratio}%`;
    elements.progressBar.style.width = `${ratio}%`;
    elements.countUnchecked.textContent = counts["미검수"].toLocaleString("ko-KR");
    elements.countCorrect.textContent = counts["정확"].toLocaleString("ko-KR");
    elements.countRevise.textContent = counts["수정 필요"].toLocaleString("ko-KR");
    elements.countHold.textContent = counts["보류"].toLocaleString("ko-KR");
    elements.statusChips.forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === activeFilter));
  }

  function renderCurrent() {
    const record = records[currentIndex];
    if (!record) return;
    const review = reviewFor(record);
    elements.position.textContent = `${(currentIndex + 1).toLocaleString("ko-KR")} / ${records.length.toLocaleString("ko-KR")}`;
    elements.status.textContent = review.result;
    elements.status.className = `status-badge ${review.result === "정확" ? "correct" : review.result === "수정 필요" ? "revise" : review.result === "보류" ? "hold" : "unchecked"}`;
    elements.pairLabel.textContent = `${record.pairId} · ${record.side}`;
    elements.setLabel.textContent = record.setName;
    elements.hanzi.textContent = record.hanzi;
    elements.pinyin.textContent = record.pinyin;
    elements.tone.textContent = record.tone.includes("·") ? `성조 ${record.tone}` : `${record.tone}성`;
    elements.hsk.textContent = `HSK ${record.hsk}급`;
    elements.original.textContent = record.original || "(원본 뜻 없음)";
    elements.radios.forEach((radio) => { radio.checked = radio.value === review.result; });
    elements.revised.value = review.revised || "";
    elements.memo.value = review.memo || "";
    elements.previous.disabled = currentIndex === 0;
    setFormMode(review.result);
    renderProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectedResult() {
    return elements.radios.find((radio) => radio.checked)?.value || "미검수";
  }

  function saveDraft({ final = false } = {}) {
    const record = records[currentIndex];
    if (!record) return false;
    let result = selectedResult();
    let revised = elements.revised.value.trim();
    let memo = elements.memo.value.trim();

    if (final && result === "미검수") {
      elements.error.textContent = "검수 결과를 선택해 주세요.";
      elements.error.hidden = false;
      return false;
    }
    if (final && result === "수정 필요" && !revised) {
      elements.error.textContent = "‘수정 필요’를 선택했으므로 수정 한국어 뜻을 입력해 주세요.";
      elements.error.hidden = false;
      elements.revised.focus();
      return false;
    }
    if (final && result === "보류" && !memo) {
      elements.error.textContent = "‘보류’를 선택했으므로 검수 메모에 이유나 확인할 사항을 입력해 주세요.";
      elements.error.hidden = false;
      elements.memo.focus();
      return false;
    }
    if (result === "정확") {
      revised = "";
      memo = "";
      elements.revised.value = "";
      elements.memo.value = "";
    }

    reviews[reviewKey(record)] = { result, revised, memo, updatedAt: new Date().toISOString() };
    invalidatePreparedDownload();
    schedulePersist();
    renderProgress();
    return true;
  }

  function findNextByStatus(status, startIndex, direction = 1) {
    if (!records.length) return -1;
    for (let offset = 1; offset <= records.length; offset += 1) {
      const index = (startIndex + direction * offset + records.length) % records.length;
      if (reviewFor(records[index]).result === status) return index;
    }
    return -1;
  }

  function goToStatus(status, fromIndex = currentIndex - 1) {
    const index = findNextByStatus(status, fromIndex, 1);
    if (index < 0) {
      showToast(status === "미검수" ? "모든 단어를 한 번씩 확인했습니다." : `‘${status}’ 항목이 없습니다.`);
      return;
    }
    activeFilter = status;
    currentIndex = index;
    renderCurrent();
    schedulePersist();
  }

  function mergeReviews(fileReviews, browserReviews) {
    const merged = { ...fileReviews };
    Object.entries(browserReviews || {}).forEach(([key, value]) => {
      if (!merged[key] || value.result !== "미검수" || value.revised || value.memo) merged[key] = value;
    });
    return merged;
  }

  async function activateSession(session, browserProgress = null) {
    invalidatePreparedDownload();
    sourceBuffer = session.buffer;
    sourceFileName = session.fileName;
    workbookMeta = session.meta;
    records = session.records;
    datasetId = session.datasetId;
    reviews = browserProgress ? mergeReviews(session.reviews, browserProgress.reviews) : session.reviews;
    activeFilter = browserProgress?.activeFilter && VALID_RESULTS.has(browserProgress.activeFilter) ? browserProgress.activeFilter : "미검수";
    const currentKey = browserProgress?.currentKey;
    const restoredIndex = currentKey ? records.findIndex((record) => reviewKey(record) === currentKey) : -1;
    currentIndex = restoredIndex >= 0 ? restoredIndex : Math.max(0, records.findIndex((record) => reviewFor(record).result === "미검수"));

    await persistSource();
    await persistProgress();
    elements.fileName.textContent = sourceFileName;
    elements.startView.hidden = true;
    elements.reviewView.hidden = false;
    elements.changeFile.hidden = false;
    renderCurrent();
  }

  async function handleFile(file) {
    if (!file) return;
    try {
      elements.openFile.disabled = true;
      elements.openFile.textContent = "파일 확인 중…";
      const session = parseWorkbook(await file.arrayBuffer(), file.name);
      const browserProgress = await dbGet("progress");
      const browserCompleted = browserProgress?.datasetId === session.datasetId ? Object.values(browserProgress.reviews || {}).filter((review) => review.result !== "미검수").length : 0;
      const fileCompleted = Object.values(session.reviews).filter((review) => review.result !== "미검수").length;
      if (browserProgress?.datasetId === session.datasetId && browserCompleted > 0) {
        pendingImport = { session, browserProgress };
        elements.fileDialogCopy.textContent = `엑셀에는 ${fileCompleted.toLocaleString("ko-KR")}개, 이 브라우저에는 ${browserCompleted.toLocaleString("ko-KR")}개의 검수 기록이 있습니다.`;
        elements.fileDialog.showModal();
      } else {
        await activateSession(session);
      }
    } catch (error) {
      showToast(error.message || "엑셀 파일을 읽지 못했습니다.");
    } finally {
      elements.openFile.disabled = false;
      elements.openFile.textContent = "엑셀 파일 선택";
      elements.fileInput.value = "";
    }
  }

  function setCell(sheet, rowIndex, columnIndex, value) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    sheet[address] = sheet[address] || {};
    sheet[address].v = value;
    sheet[address].t = typeof value === "number" ? "n" : "s";
    delete sheet[address].f;
    delete sheet[address].w;
  }

  function invalidatePreparedDownload() {
    if (preparedDownloadUrl) URL.revokeObjectURL(preparedDownloadUrl);
    preparedDownloadUrl = "";
    elements.downloadXlsx.hidden = true;
    elements.downloadXlsx.removeAttribute("href");
    elements.downloadXlsx.removeAttribute("download");
  }

  function prepareDownload(blob, fileName) {
    invalidatePreparedDownload();
    preparedDownloadUrl = URL.createObjectURL(blob);
    elements.downloadXlsx.href = preparedDownloadUrl;
    elements.downloadXlsx.download = fileName;
    elements.downloadXlsx.hidden = false;
  }

  function findWorksheetPath(workbookXml, relationsXml, sheetName) {
    const parser = new DOMParser();
    const workbookDoc = parser.parseFromString(workbookXml, "application/xml");
    const relationDoc = parser.parseFromString(relationsXml, "application/xml");
    const sheetNode = Array.from(workbookDoc.getElementsByTagNameNS("*", "sheet"))
      .find((node) => node.getAttribute("name") === sheetName);
    if (!sheetNode) throw new Error("원본 엑셀에서 검수표 시트를 찾지 못했습니다.");
    const relationId = sheetNode.getAttribute("r:id") || sheetNode.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const relationNode = Array.from(relationDoc.getElementsByTagNameNS("*", "Relationship"))
      .find((node) => node.getAttribute("Id") === relationId);
    if (!relationNode) throw new Error("원본 엑셀의 시트 연결 정보를 읽지 못했습니다.");
    const target = relationNode.getAttribute("Target").replace(/\\/g, "/");
    if (target.startsWith("/")) return target.replace(/^\//, "");
    return `xl/${target.replace(/^\.\//, "")}`;
  }

  function getOrCreateXmlCell(sheetDoc, rowIndex, columnIndex) {
    const namespace = sheetDoc.documentElement.namespaceURI;
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const rowNumber = String(rowIndex + 1);
    const sheetData = sheetDoc.getElementsByTagNameNS("*", "sheetData")[0];
    let row = Array.from(sheetDoc.getElementsByTagNameNS("*", "row")).find((node) => node.getAttribute("r") === rowNumber);
    if (!row) {
      row = sheetDoc.createElementNS(namespace, "row");
      row.setAttribute("r", rowNumber);
      sheetData.appendChild(row);
    }
    let cell = Array.from(row.getElementsByTagNameNS("*", "c")).find((node) => node.getAttribute("r") === address);
    if (!cell) {
      cell = sheetDoc.createElementNS(namespace, "c");
      cell.setAttribute("r", address);
      const targetColumn = columnIndex;
      const nextCell = Array.from(row.getElementsByTagNameNS("*", "c")).find((node) => {
        const ref = node.getAttribute("r") || "A1";
        return XLSX.utils.decode_cell(ref).c > targetColumn;
      });
      row.insertBefore(cell, nextCell || null);
    }
    return cell;
  }

  function writeXmlCell(sheetDoc, rowIndex, columnIndex, value) {
    const cell = getOrCreateXmlCell(sheetDoc, rowIndex, columnIndex);
    Array.from(cell.childNodes).forEach((node) => {
      if (["f", "v", "is"].includes(node.localName)) cell.removeChild(node);
    });
    const namespace = sheetDoc.documentElement.namespaceURI;
    if (typeof value === "number") {
      cell.setAttribute("t", "n");
      const valueNode = sheetDoc.createElementNS(namespace, "v");
      valueNode.textContent = String(value);
      cell.appendChild(valueNode);
      return;
    }
    cell.setAttribute("t", "inlineStr");
    const inline = sheetDoc.createElementNS(namespace, "is");
    const textNode = sheetDoc.createElementNS(namespace, "t");
    const textValue = value == null ? "" : String(value);
    if (/^\s|\s$/u.test(textValue)) textNode.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    textNode.textContent = textValue;
    inline.appendChild(textNode);
    cell.appendChild(inline);
  }

  function updateSummary(sheet, rows, counts) {
    const values = {
      "전체 항목": records.length,
      "검수 완료": records.length - counts["미검수"],
      "정확": counts["정확"],
      "수정 필요": counts["수정 필요"],
      "보류": counts["보류"],
      "미검수": counts["미검수"],
    };
    rows.slice(0, workbookMeta.headerRow).forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        const label = toText(value);
        if (Object.prototype.hasOwnProperty.call(values, label)) setCell(sheet, rowIndex + 1, columnIndex, values[label]);
      });
    });
  }

  async function exportWorkbook() {
    if (!sourceBuffer || !records.length) return;
    saveDraft();
    await persistProgress();
    elements.saveXlsx.disabled = true;
    elements.saveXlsx.textContent = "엑셀 만드는 중…";
    try {
      if (!window.JSZip) throw new Error("엑셀 저장 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
      const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
      const workbookXml = await zip.file("xl/workbook.xml").async("string");
      const relationsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");
      const sheetPath = findWorksheetPath(workbookXml, relationsXml, workbookMeta.sheetName);
      const sheetFile = zip.file(sheetPath);
      if (!sheetFile) throw new Error("원본 엑셀의 검수표 데이터를 찾지 못했습니다.");
      const sheetXml = await sheetFile.async("string");
      const sheetDoc = new DOMParser().parseFromString(sheetXml, "application/xml");
      if (sheetDoc.querySelector("parsererror")) throw new Error("원본 엑셀의 검수표를 해석하지 못했습니다.");
      records.forEach((record) => {
        const review = reviewFor(record);
        writeXmlCell(sheetDoc, record.rowIndex, workbookMeta.columns["검수 결과"], review.result);
        writeXmlCell(sheetDoc, record.rowIndex, workbookMeta.columns["수정 한국어 뜻"], review.revised || "");
        writeXmlCell(sheetDoc, record.rowIndex, workbookMeta.columns["검수 메모"], review.memo || "");
      });
      const counts = countStatuses();
      const summaryValues = {
        "전체 항목": records.length,
        "검수 완료": records.length - counts["미검수"],
        "정확": counts["정확"],
        "수정 필요": counts["수정 필요"],
        "보류": counts["보류"],
        "미검수": counts["미검수"],
      };
      const workbook = XLSX.read(sourceBuffer.slice(0), { type: "array", cellStyles: true, cellDates: true });
      const sourceSheet = workbook.Sheets[workbookMeta.sheetName];
      const rows = XLSX.utils.sheet_to_json(sourceSheet, { header: 1, defval: "", raw: false });
      rows.slice(0, workbookMeta.headerRow).forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
          const label = toText(value);
          if (Object.prototype.hasOwnProperty.call(summaryValues, label)) writeXmlCell(sheetDoc, rowIndex + 1, columnIndex, summaryValues[label]);
        });
      });
      zip.file(sheetPath, new XMLSerializer().serializeToString(sheetDoc));
      const date = new Date();
      const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const base = sourceFileName.replace(/\.xlsx$/i, "").replace(/_검수_\d+개_\d{4}-\d{2}-\d{2}$/u, "");
      const outputName = `${base}_검수_${completedCount()}개_${stamp}.xlsx`;
      const blob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      prepareDownload(blob, outputName);
      elements.autosave.textContent = `엑셀 생성 완료 · ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
      showToast("엑셀이 완성되었습니다. ‘완성 파일 다운로드’를 눌러 저장하세요.");
    } catch (error) {
      showToast(error.message || "엑셀 파일을 만들지 못했습니다.");
    } finally {
      elements.saveXlsx.disabled = false;
      elements.saveXlsx.textContent = "작업 엑셀 만들기";
    }
  }

  async function initializeStartView() {
    try {
      const [source, progress] = await Promise.all([dbGet("source"), dbGet("progress")]);
      if (!source || !progress || source.datasetId !== progress.datasetId) return;
      const counts = progress.counts || {};
      const completed = (progress.total || 0) - (counts["미검수"] || 0);
      elements.resumeSummary.textContent = `검수 완료 ${completed.toLocaleString("ko-KR")} / ${(progress.total || 0).toLocaleString("ko-KR")}`;
      elements.resumeTime.textContent = `마지막 작업 ${new Date(progress.savedAt).toLocaleString("ko-KR")}`;
      elements.resumePanel.hidden = false;
      elements.resumeButton.onclick = async () => {
        try {
          const session = parseWorkbook(source.buffer, source.fileName);
          await activateSession(session, progress);
        } catch (error) {
          showToast("저장된 작업을 열지 못했습니다. 엑셀 파일을 다시 불러와 주세요.");
          await Promise.all([dbDelete("source"), dbDelete("progress")]);
          elements.resumePanel.hidden = true;
        }
      };
    } catch {
      elements.resumePanel.hidden = true;
    }
  }

  elements.openFile.addEventListener("click", () => elements.fileInput.click());
  elements.changeFile.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", (event) => handleFile(event.target.files?.[0]));
  elements.statusChips.forEach((chip) => chip.addEventListener("click", () => goToStatus(chip.dataset.filter)));
  elements.goUnchecked.addEventListener("click", () => goToStatus("미검수"));
  elements.saveXlsx.addEventListener("click", exportWorkbook);
  elements.downloadXlsx.addEventListener("click", () => {
    showToast(`${completedCount().toLocaleString("ko-KR")}개 검수 기록이 담긴 엑셀을 다운로드합니다.`);
  });
  elements.previous.addEventListener("click", () => {
    saveDraft();
    currentIndex = Math.max(0, currentIndex - 1);
    renderCurrent();
    schedulePersist();
  });
  elements.markUnchecked.addEventListener("click", () => {
    elements.radios.forEach((radio) => { radio.checked = false; });
    reviews[reviewKey(records[currentIndex])] = {
      result: "미검수",
      revised: elements.revised.value.trim(),
      memo: elements.memo.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    invalidatePreparedDownload();
    setFormMode("미검수");
    renderProgress();
    schedulePersist();
    showToast("미검수 상태로 되돌렸습니다.");
  });
  elements.radios.forEach((radio) => radio.addEventListener("change", () => {
    setFormMode(radio.value);
    saveDraft();
  }));
  [elements.revised, elements.memo].forEach((field) => field.addEventListener("input", () => saveDraft()));
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const previousIndex = currentIndex;
    if (!saveDraft({ final: true })) return;
    const next = findNextByStatus("미검수", previousIndex, 1);
    if (next < 0) {
      renderCurrent();
      showToast("모든 단어를 한 번씩 확인했습니다. 보류 항목을 다시 확인해 주세요.");
      return;
    }
    activeFilter = "미검수";
    currentIndex = next;
    renderCurrent();
    schedulePersist();
  });
  elements.useFileOnly.addEventListener("click", async () => {
    const { session } = pendingImport;
    pendingImport = null;
    elements.fileDialog.close();
    await activateSession(session);
  });
  elements.mergeBrowser.addEventListener("click", async () => {
    const { session, browserProgress } = pendingImport;
    pendingImport = null;
    elements.fileDialog.close();
    await activateSession(session, browserProgress);
    showToast("엑셀 기록과 이 브라우저의 자동 저장 기록을 함께 적용했습니다.");
  });

  initializeStartView();
})();
