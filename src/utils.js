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
  // Real word wrapping against measured glyph widths between spaces (unbroken whole words).
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
    });

    return lines;
  }

  function getMinRequiredColumnWidth(selection, fontSize = 12, padding = 24) {
    let maxWordWidth = 0;
    const headerFontSize = Math.round(fontSize * 1.33);

    (selection || []).forEach((tactic) => {
      (tactic.name || "").split(/\s+/).forEach((w) => {
        const wHeader = estimateTextWidth(w, headerFontSize, "bold") + 48;
        maxWordWidth = Math.max(maxWordWidth, wHeader - padding);
      });
      (tactic.techniques || []).forEach((technique) => {
        (technique.name || "").split(/\s+/).forEach((w) => {
          maxWordWidth = Math.max(maxWordWidth, estimateTextWidth(w, fontSize, "normal"));
        });
        (technique.subtechniques || []).forEach((sub) => {
          (sub.name || "").split(/\s+/).forEach((w) => {
            maxWordWidth = Math.max(maxWordWidth, estimateTextWidth(w, fontSize, "normal"));
          });
        });
      });
    });
    return Math.max(160, Math.ceil(maxWordWidth + padding));
  }

  function fitTacticHeaderFont(name, code, tacticWidth, baseHeaderFont, scale = 1) {
    const step = Math.max(3, 10 * scale);
    const padX = Math.max(4, 14 * scale);
    const usableWidth = tacticWidth - (step + padX) * 2;

    let targetFont = baseHeaderFont * scale;

    const words = `${name || ""} ${code || ""}`.split(/\s+/);
    words.forEach((word) => {
      while (
        targetFont > 0.5 &&
        estimateTextWidth(word, targetFont, "bold") > usableWidth - 2
      ) {
        targetFont -= 0.1;
      }
    });

    return targetFont;
  }

  function computeCardHeight(text, baseHeight, columnWidth, options = {}) {
    const { compact = false, fontSize = 16, titleFontSize = 20 } = options;
    const padding = compact ? 8 : 12;
    const lines = countWrappedLines(
      text,
      Math.max(columnWidth - padding * 2, 20),
      fontSize
    );
    const titleH = Math.round(titleFontSize * 1.3);
    const descLineH = Math.round(fontSize * 1.25);
    const totalTextH = titleH + Math.max(1, lines) * descLineH;
    const verticalPad = compact ? 10 : 16;
    return Math.max(baseHeight || 54, totalTextH + verticalPad);
  }

  function downloadFile(arg1, arg2, contentType = "application/xml") {
    let content = arg1;
    let filename = arg2;
    if (
      typeof arg1 === "string" &&
      (arg1.endsWith(".drawio") || arg1.endsWith(".json") || arg1.endsWith(".xml") || arg1.endsWith(".txt"))
    ) {
      filename = arg1;
      content = arg2;
    }
    const blob = new Blob([content], { type: contentType });
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
    getMinRequiredColumnWidth,
    fitTacticHeaderFont,
    computeCardHeight,
    downloadFile,
  };
})();
