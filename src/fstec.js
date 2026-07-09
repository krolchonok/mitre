(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { normalizeMitreCode, estimateTextWidth, estimateCharsPerLine } =
    Mitre.utils;

  function buildFstecLookup(entries) {
    const map = new Map();
    entries.forEach((entry) => {
      (entry.fstec || []).forEach((code) => {
        const normalized = normalizeMitreCode(code);
        if (!normalized) {
          return;
        }
        if (!map.has(normalized)) {
          map.set(normalized, []);
        }
        map.get(normalized).push(entry);
      });
    });
    return map;
  }

  const FSTEC_CATEGORY_TITLES = window.translationData?.categories ?? {};
  const FSTEC_CATEGORY_ORDER = Object.keys(FSTEC_CATEGORY_TITLES);
  const FSTEC_TECHNIQUES = Array.isArray(window.translationData?.techniques)
    ? window.translationData.techniques.map((entry, index) => ({
        id: entry.id || "",
        title: entry.title || "",
        fstec: Array.isArray(entry.fstec) ? entry.fstec : [],
        category: entry.id?.split(".")?.[0] ?? "",
        order: index,
      }))
    : [];
  const MITRE_TO_FSTEC_MAP = buildFstecLookup(FSTEC_TECHNIQUES);

  function collectSelectedMitreCodes(selection) {
    const codes = new Set();
    selection.forEach((tactic) => {
      tactic.techniques.forEach((technique) => {
        if (technique.code) {
          codes.add(normalizeMitreCode(technique.code));
        }
        (technique.subtechniques || []).forEach((sub) => {
          if (sub.code) {
            codes.add(normalizeMitreCode(sub.code));
          }
        });
      });
    });
    codes.delete("");
    return codes;
  }

  function buildFstecSelectionFromSelection(mitreSelection) {
    const selectedCodes = collectSelectedMitreCodes(mitreSelection);
    const usedEntryIds = new Set();
    const missingCodes = new Set();

    selectedCodes.forEach((code) => {
      if (!code) {
        return;
      }
      // Строгое соответствие: ищем только в точном списке fstec у записей
      const exactMatches = MITRE_TO_FSTEC_MAP.get(code) || [];
      if (!exactMatches.length) {
        missingCodes.add(code);
        return;
      }
      exactMatches.forEach((entry) => {
        if (entry?.id) {
          usedEntryIds.add(entry.id);
        }
      });
    });

    const columns = FSTEC_CATEGORY_ORDER.map((category) => ({
      code: category,
      name: FSTEC_CATEGORY_TITLES[category] || category,
      techniques: [],
    }));
    const columnMap = new Map(columns.map((column) => [column.code, column]));

    FSTEC_TECHNIQUES.forEach((entry) => {
      if (!usedEntryIds.has(entry.id)) {
        return;
      }
      const column = columnMap.get(entry.category);
      if (!column) {
        return;
      }
      column.techniques.push({
        code: entry.id,
        name: entry.title || "",
        subtechniques: [],
      });
    });

    const selection = columns.filter((column) => column.techniques.length > 0);

    return {
      selection,
      missingCodes: Array.from(missingCodes).sort(),
    };
  }

  function computeFstecColumnWidths(selection, layout) {
    const minWidth = layout.columnWidth;
    const maxWidth = layout.maxColumnWidth || layout.columnWidth;

    const widths = selection.map((tactic) => {
      const candidateWidths = [];
      candidateWidths.push(estimateTextWidth(tactic.name || "", 14));
      candidateWidths.push(estimateTextWidth(tactic.code || "", 12));

      (tactic.techniques || []).forEach((technique) => {
        candidateWidths.push(estimateTextWidth(technique.name || "", 12));
        candidateWidths.push(
          estimateTextWidth(technique.code || "", 13, "bold")
        );
      });

      const widest = candidateWidths.length
        ? Math.max(...candidateWidths)
        : minWidth;
      const withPadding = widest + 24;
      return Math.min(Math.max(withPadding, minWidth), maxWidth);
    });

    const targetWidth = Math.max(...widths);
    return selection.map(() => targetWidth);
  }

  function computeFstecHeaderHeight(tacticName, columnWidth, layout) {
    const baseHeight = layout.headerHeight;
    const charsPerLine = estimateCharsPerLine(columnWidth, 14, 32);
    const lines = Math.max(
      1,
      Math.ceil((tacticName || "").length / charsPerLine)
    );
    const lineHeight = Math.round(14 * 1.3);
    const codeLineHeight = 16;
    const padding = 18;
    const neededHeight = lines * lineHeight + codeLineHeight + padding;
    return Math.max(baseHeight, neededHeight);
  }

  function computeMaxFstecHeaderHeight(selection, columnWidth, layout) {
    return selection.reduce((maxHeight, tactic) => {
      const h = computeFstecHeaderHeight(tactic.name, columnWidth, layout);
      return Math.max(maxHeight, h);
    }, layout.headerHeight);
  }

  Mitre.fstec = {
    FSTEC_CATEGORY_TITLES,
    FSTEC_CATEGORY_ORDER,
    FSTEC_TECHNIQUES,
    MITRE_TO_FSTEC_MAP,
    collectSelectedMitreCodes,
    buildFstecSelectionFromSelection,
    computeFstecColumnWidths,
    computeFstecHeaderHeight,
    computeMaxFstecHeaderHeight,
  };
})();
