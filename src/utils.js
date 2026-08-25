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

  const BASE_FONT_SIZE = 12;

  // Real word wrapping against measured glyph widths, in the font the export
  // actually uses. The old character-count estimate treated every glyph as
  // equally wide and over-reported lines for most names, which inflated every
  // card in the exported file — not just in the preview.
  function countWrappedLines(text, availableWidth, fontSize, fontWeight) {
    const safe = (text || "").trim();
    if (!safe) return 1;

    const ctx = getMeasureContext();
    if (!ctx || availableWidth <= 0) {
      return Math.max(1, Math.ceil(safe.length / 30));
    }

    ctx.font = `${fontWeight || "normal"} ${fontSize}px Helvetica, Arial, sans-serif`;
    const fits = (s) => ctx.measureText(s).width <= availableWidth;

    let lines = 1;
    let line = "";

    safe.split(/\s+/).forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
        return;
      }

      if (line) lines += 1;
      line = word;

      // A single word wider than the column wraps inside itself.
      while (!fits(line) && line.length > 1) {
        let cut = 1;
        while (cut < line.length && fits(line.slice(0, cut + 1))) cut += 1;
        line = line.slice(cut);
        lines += 1;
      }
    });

    return lines;
  }

  // Card geometry is driven by the font: a larger size both wraps the name
  // into more lines and needs taller lines to hold them. Everything scales
  // off the 12px reference, so the default size reproduces the original
  // single-line heights exactly.
  function computeCardHeight(text, baseHeight, columnWidth, options = {}) {
    const { compact = false, fontSize = BASE_FONT_SIZE } = options;
    const ratio = fontSize / BASE_FONT_SIZE;
    const padding = compact ? 12 : 20;
    const lines = countWrappedLines(
      text,
      Math.max(columnWidth - padding, 20),
      fontSize
    );
    const lineStep = (compact ? 10 : 14) * ratio;
    const adjustedBase =
      (compact ? Math.max(baseHeight - 10, 28) : baseHeight) * ratio;
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
    BASE_FONT_SIZE,
    compareCodes,
    normalizeMitreCode,
    parseMitreCodesFromText,
    estimateTextWidth,
    estimateCharsPerLine,
    countWrappedLines,
    computeCardHeight,
    downloadFile,
  };
})();
