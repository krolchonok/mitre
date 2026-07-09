(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});

  function compareCodes(a = "", b = "") {
    if (a === b) return 0;
    const [aMain, aSub = ""] = a.split(".");
    const [bMain, bSub = ""] = b.split(".");
    const mainDiff = aMain.localeCompare(bMain, "en", { numeric: true });
    if (mainDiff !== 0) return mainDiff;
    return aSub.localeCompare(bSub, "en", { numeric: true });
  }

  function normalizeMitreCode(code) {
    return (code || "").trim().toUpperCase();
  }

  function parseMitreCodesFromText(text) {
    const codes = new Set();
    (text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [code] = line.split(/\s+/);
        const normalized = normalizeMitreCode(code);
        if (normalized) {
          codes.add(normalized);
        }
      });
    return codes;
  }

  function getMeasureContext() {
    if (!getMeasureContext.ctx) {
      const canvas = document.createElement("canvas");
      getMeasureContext.ctx = canvas.getContext("2d");
    }
    return getMeasureContext.ctx;
  }

  function estimateTextWidth(text, fontSize = 14, fontWeight = "normal") {
    const ctx = getMeasureContext();
    if (!ctx) {
      return (text || "").length * fontSize * 0.55;
    }
    ctx.font = `${fontWeight} ${fontSize}px Helvetica, Arial, sans-serif`;
    const metrics = ctx.measureText(text || "");
    return metrics.width || (text || "").length * fontSize * 0.55;
  }

  function estimateCharsPerLine(columnWidth, fontSize = 12, padding = 16) {
    const ctx = getMeasureContext();
    if (!ctx || !columnWidth) {
      return 32;
    }

    ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
    const sample = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const metrics = ctx.measureText(sample);
    const avgCharWidth =
      metrics.width && sample.length ? metrics.width / sample.length : 6.8;

    const usableWidth = Math.max(columnWidth - padding, 60);
    const chars = Math.max(12, Math.floor(usableWidth / avgCharWidth));
    return Number.isFinite(chars) && chars > 0 ? chars : 32;
  }

  function computeCardHeight(text, baseHeight, columnWidth, options = {}) {
    const { compact = false } = options;
    const safeText = text || "";
    const charsPerLine = estimateCharsPerLine(
      columnWidth,
      12,
      compact ? 12 : 20
    );
    const lines = Math.max(1, Math.ceil(safeText.length / charsPerLine));
    const lineStep = compact ? 10 : 14;
    const adjustedBase = compact ? Math.max(baseHeight - 10, 28) : baseHeight;
    return adjustedBase + Math.max(0, lines - 1) * lineStep;
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  Mitre.utils = {
    compareCodes,
    normalizeMitreCode,
    parseMitreCodesFromText,
    estimateTextWidth,
    estimateCharsPerLine,
    computeCardHeight,
    downloadFile,
  };
})();
