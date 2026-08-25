(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { DRAWIO_LAYOUT, COLOR_CONFIG, SUB_ACCENT_COLOR, GREEN_COLOR_CONFIG, PAGE_SIZES } =
    Mitre.config;
  const {
    compareCodes,
    computeCardHeight,
    normalizeMitreCode,
    countWrappedLines,
  } = Mitre.utils;
  const { computeFstecColumnWidths, computeMaxFstecHeaderHeight } =
    Mitre.fstec;

  const RECON_TACTIC_CODE = "TA0043";

  function clampFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return DRAWIO_LAYOUT.baseFontSize;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minFontSize),
      DRAWIO_LAYOUT.maxFontSize
    );
  }

  // Resolves a pageFit option ({ size: 'a4'|'a3', orientation: 'portrait'|'landscape' })
  // into target pixel dimensions, or null if fitting is disabled.
  function resolvePageTarget(pageFit) {
    if (!pageFit || !pageFit.size || pageFit.size === "none") return null;
    const bySize = PAGE_SIZES[pageFit.size];
    if (!bySize) return null;
    return bySize[pageFit.orientation] || bySize.portrait;
  }

  // Uniformly shrinks every geometry field of the computed columns by
  // `scale`. Because box width and font size are scaled by the same
  // factor, drawio's own dynamic text wrapping (whiteSpace=wrap) reflows
  // to the same number of lines as the unscaled layout, so the
  // precomputed card heights stay valid at any scale.
  function scaleColumns(columns, scale) {
    if (scale === 1) return columns;
    const s = (n) => n * scale;
    return columns.map((tactic) => ({
      ...tactic,
      x: s(tactic.x),
      y: s(tactic.y),
      width: s(tactic.width),
      height: s(tactic.height),
      techniques: tactic.techniques.map((technique) => ({
        ...technique,
        x: s(technique.x),
        y: s(technique.y),
        width: s(technique.width),
        height: s(technique.height),
        subtechniques: technique.subtechniques.map((sub) => ({
          ...sub,
          x: s(sub.x),
          y: s(sub.y),
          width: s(sub.width),
          height: s(sub.height),
          accentX: s(sub.accentX),
          accentWidth: s(sub.accentWidth),
        })),
      })),
    }));
  }

  // Builds one tactic column's content at a given width, with geometry
  // relative to the column's own origin (0, 0). Card heights depend on the
  // width because text rewraps, which is exactly what lets the page fitter
  // trade width for height when searching for a layout.
  function buildColumn(tactic, columnWidth, headerHeight, layout, opts, cell) {
    const { useGreen, greenTechniques, greenSubtechniques } = opts;
    const isRecon = tactic.code === RECON_TACTIC_CODE;
    const colors = isRecon ? COLOR_CONFIG.recon : COLOR_CONFIG.default;

    let cursorY = headerHeight + layout.verticalGap;

    const techniques = tactic.techniques
      .slice()
      .sort((a, b) => compareCodes(a.code, b.code))
      .map((technique) => {
        const techHeight = cell.techniqueHeight;
        const isGreen =
          useGreen &&
          technique.code &&
          greenTechniques.has(normalizeMitreCode(technique.code));

        const y = cursorY;
        cursorY += techHeight;

        const subtechniques = technique.subtechniques
          .slice()
          .sort((a, b) => compareCodes(a.code, b.code))
          .map((sub) => {
            const subIsGreen =
              useGreen &&
              sub.code &&
              greenSubtechniques.has(normalizeMitreCode(sub.code));
            const subHeight = cell.subtechniqueHeight;

            const subY = cursorY;
            cursorY += subHeight;

            return {
              code: sub.code,
              name: sub.name,
              relX: layout.subAccentWidth,
              relY: subY,
              width: columnWidth - layout.subAccentWidth,
              height: subHeight,
              fill: subIsGreen ? GREEN_COLOR_CONFIG.card : colors.card,
              accent: subIsGreen ? GREEN_COLOR_CONFIG.subAccent : SUB_ACCENT_COLOR,
              accentRelX: 0,
              accentWidth: layout.subAccentWidth,
            };
          });

        cursorY += layout.verticalGap;

        return {
          code: technique.code,
          name: technique.name,
          relX: 0,
          relY: y,
          width: columnWidth,
          height: techHeight,
          fill: isGreen ? GREEN_COLOR_CONFIG.card : colors.card,
          accent: isGreen ? GREEN_COLOR_CONFIG.subAccent : colors.step,
          subtechniques,
        };
      });

    return {
      code: tactic.code,
      name: tactic.name,
      width: columnWidth,
      headerHeight,
      fillColor: colors.step,
      isRecon,
      techniques,
      totalHeight: cursorY,
    };
  }

  // One cell size for the whole diagram, per tier: the largest height any
  // single card genuinely needs at this column width. Every technique cell
  // then gets that height (and likewise every subtechnique), so the grid
  // stays regular instead of each card being cropped to its own text.
  // Recomputed per candidate width, because wider columns rewrap text and
  // therefore lower the maximum.
  function computeCellSize(selection, columnWidth, layout, opts) {
    const compact = { compact: opts.isFstecMode, fontSize: opts.fontSize };
    let techniqueHeight = layout.techniqueBaseHeight;
    let subtechniqueHeight = layout.subTechniqueBaseHeight;

    selection.forEach((tactic) => {
      tactic.techniques.forEach((technique) => {
        techniqueHeight = Math.max(
          techniqueHeight,
          computeCardHeight(
            technique.name,
            layout.techniqueBaseHeight,
            columnWidth,
            compact
          )
        );
        technique.subtechniques.forEach((sub) => {
          subtechniqueHeight = Math.max(
            subtechniqueHeight,
            computeCardHeight(
              sub.name,
              layout.subTechniqueBaseHeight,
              columnWidth - layout.subAccentWidth,
              compact
            )
          );
        });
      });
    });

    return { techniqueHeight, subtechniqueHeight };
  }

  // Tactic headers share one height too, taken from whichever label needs the
  // most lines at this width. Without it the header stays at its 40px default
  // and long tactic names spill out of the chevron as soon as columns narrow.
  // The step shape's arrow point eats horizontal room, hence the wider padding.
  function computeMitreHeaderHeight(selection, columnWidth, layout, fontSize) {
    const headerFont = fontSize + 4;
    const lineHeight = Math.round(headerFont * 1.25);
    // The step shape's arrow point and notch eat ~20px of the usable width.
    const usable = Math.max(columnWidth - 26, 20);
    return selection.reduce((tallest, tactic) => {
      const lines = countWrappedLines(
        `${tactic.name} ${tactic.code}`,
        usable,
        headerFont,
        "bold"
      );
      return Math.max(tallest, lines * lineHeight + 16);
    }, layout.headerHeight);
  }

  function buildAllColumns(selection, columnWidth, layout, opts) {
    const headerHeight = opts.isFstecMode
      ? computeMaxFstecHeaderHeight(selection, columnWidth, layout)
      : computeMitreHeaderHeight(selection, columnWidth, layout, opts.fontSize);
    const cell = computeCellSize(selection, columnWidth, layout, opts);
    return selection.map((tactic) =>
      buildColumn(tactic, columnWidth, headerHeight, layout, opts, cell)
    );
  }

  // Places built columns into `perRow` bands and resolves relative geometry
  // into absolute coordinates. One band per row of tactics; a band is as tall
  // as its tallest column.
  function placeColumns(built, perRow, layout) {
    const bandGap = layout.verticalGap * 2;
    const columns = [];
    let bandTop = layout.originY;
    let widest = 0;

    for (let start = 0; start < built.length; start += perRow) {
      const band = built.slice(start, start + perRow);
      let x = layout.originX;

      band.forEach((col) => {
        columns.push({
          code: col.code,
          name: col.name,
          x,
          y: bandTop,
          width: col.width,
          height: col.headerHeight,
          fillColor: col.fillColor,
          isRecon: col.isRecon,
          techniques: col.techniques.map((t) => ({
            code: t.code,
            name: t.name,
            x: x + t.relX,
            y: bandTop + t.relY,
            width: t.width,
            height: t.height,
            fill: t.fill,
            accent: t.accent,
            subtechniques: t.subtechniques.map((s) => ({
              code: s.code,
              name: s.name,
              x: x + s.relX,
              y: bandTop + s.relY,
              width: s.width,
              height: s.height,
              fill: s.fill,
              accent: s.accent,
              accentX: x + s.accentRelX,
              accentWidth: s.accentWidth,
            })),
          })),
        });
        x += col.width + layout.columnGap;
      });

      widest = Math.max(widest, x - layout.columnGap);
      bandTop += Math.max(...band.map((c) => c.totalHeight)) + bandGap;
    }

    return {
      columns,
      width: widest + layout.originX,
      height: bandTop - bandGap + layout.originY,
    };
  }

  // Fits the diagram to a sheet by reflowing rather than only shrinking.
  // A single row of tactics is very wide and short, which matches no paper
  // aspect ratio — so every "columns per row" split is tried, each at the
  // column width that would fill the sheet, and the arrangement needing the
  // least shrinking wins. Wider columns rewrap text into fewer lines, so
  // width and height genuinely trade against each other here.
  function fitToPage(selection, layout, opts, pageTarget, flow, fixedWidth) {
    const minWidth = layout.minColumnWidth || 150;
    const maxWidth = layout.maxColumnWidth || 420;
    let best = null;

    // "single" keeps every tactic on one row so the kill chain still reads
    // left to right; only the column width is searched, and whatever is left
    // over is taken out in uniform shrinking.
    const splits =
      flow === "single"
        ? [selection.length]
        : Array.from({ length: selection.length }, (_, i) => i + 1);

    for (const perRow of splits) {
      const gaps = (perRow - 1) * layout.columnGap;
      const usable = pageTarget.width - layout.originX * 2 - gaps;
      // With many tactics forced onto one row the sheet runs out of width
      // entirely; fall back to the narrowest legal column and let the final
      // uniform scale absorb the overflow rather than dropping the split.
      const exact = usable > 0 ? usable / perRow : minWidth;
      // A width set by the user wins outright — the fitter then only chooses
      // how many columns go per row and how much to shrink at the end.
      const candidates = fixedWidth
        ? new Set([Math.min(Math.max(fixedWidth, minWidth), maxWidth)])
        : new Set([
            Math.min(Math.max(exact, minWidth), maxWidth),
            minWidth,
            Math.min(maxWidth, Math.max(minWidth, layout.columnWidth)),
          ]);

      candidates.forEach((columnWidth) => {
        const built = buildAllColumns(selection, columnWidth, layout, opts);
        const placed = placeColumns(built, perRow, layout);
        const scale = Math.min(
          1,
          pageTarget.width / placed.width,
          pageTarget.height / placed.height
        );

        // Prefer the least shrinking; break ties toward filling more of
        // the sheet so the result does not float in a sea of margin.
        const coverage =
          (placed.width * scale * (placed.height * scale)) /
          (pageTarget.width * pageTarget.height);
        const score = scale * 1000 + coverage;

        if (!best || score > best.score) {
          best = { score, scale, placed, perRow, columnWidth };
        }
      });
    }

    return best;
  }

  // Single source of truth for diagram geometry/colors. Both the draw.io
  // XML exporter and the live HTML preview consume the same computed
  // layout so their positioning math can never drift apart.
  function computeLayout(selection, options = {}) {
    const {
      mode = "mitre",
      useGreen = false,
      greenTechniques = new Set(),
      greenSubtechniques = new Set(),
    } = options;
    const isFstecMode = mode === "fstec";

    const layout = {
      ...DRAWIO_LAYOUT,
      headerHeight: isFstecMode
        ? DRAWIO_LAYOUT.headerHeight + 40
        : DRAWIO_LAYOUT.headerHeight,
      techniqueBaseHeight: isFstecMode
        ? DRAWIO_LAYOUT.techniqueBaseHeight + 30
        : DRAWIO_LAYOUT.techniqueBaseHeight,
      subTechniqueBaseHeight: isFstecMode
        ? DRAWIO_LAYOUT.subTechniqueBaseHeight + 18
        : DRAWIO_LAYOUT.subTechniqueBaseHeight,
    };

    const fontSize = clampFontSize(options.fontSize);
    const opts = {
      useGreen,
      greenTechniques,
      greenSubtechniques,
      isFstecMode,
      fontSize,
    };
    const pageTarget = resolvePageTarget(options.pageFit);

    // Column width tracks the font by default. Holding it fixed while the
    // font grows starves the text: names rewrap into far more lines, the
    // diagram balloons vertically, and the page fitter answers by shrinking
    // everything — so a bigger font setting produced narrower boxes and
    // barely larger print. Scaling the width keeps characters-per-line, and
    // therefore the line count, constant.
    const rawWidth = Number(options.columnWidth) || 0;
    const requestedWidth =
      rawWidth && options.widthMode !== "fixed"
        ? Math.min(
            Math.max(
              Math.round((rawWidth * fontSize) / DRAWIO_LAYOUT.baseFontSize),
              DRAWIO_LAYOUT.minColumnWidth
            ),
            DRAWIO_LAYOUT.maxColumnWidth
          )
        : rawWidth;

    if (!pageTarget) {
      // No sheet chosen: keep the classic single row at natural width.
      const naturalWidth =
        requestedWidth ||
        (isFstecMode
          ? computeFstecColumnWidths(selection, layout)[0] || layout.columnWidth
          : layout.columnWidth);
      const built = buildAllColumns(selection, naturalWidth, layout, opts);
      const placed = placeColumns(built, built.length || 1, layout);

      return {
        isFstecMode,
        layout,
        columns: placed.columns,
        bounds: { width: placed.width, height: placed.height },
        scale: 1,
        fontSize,
        requestedWidth,
        perRow: built.length,
        columnWidth: naturalWidth,
        pageWidth: PAGE_SIZES.a4.portrait.width,
        pageHeight: PAGE_SIZES.a4.portrait.height,
      };
    }

    const best = fitToPage(
      selection,
      layout,
      opts,
      pageTarget,
      options.pageFit?.flow,
      requestedWidth
    );
    if (!best) {
      const built = buildAllColumns(selection, layout.columnWidth, layout, opts);
      const placed = placeColumns(built, built.length || 1, layout);
      return {
        isFstecMode,
        layout,
        columns: placed.columns,
        bounds: { width: placed.width, height: placed.height },
        scale: 1,
        fontSize,
        requestedWidth,
        perRow: built.length,
        columnWidth: layout.columnWidth,
        pageWidth: pageTarget.width,
        pageHeight: pageTarget.height,
      };
    }

    return {
      isFstecMode,
      layout,
      columns: scaleColumns(best.placed.columns, best.scale),
      bounds: {
        width: best.placed.width * best.scale,
        height: best.placed.height * best.scale,
      },
      scale: best.scale,
      fontSize,
      requestedWidth,
      perRow: best.perRow,
      columnWidth: best.columnWidth,
      pageWidth: pageTarget.width,
      pageHeight: pageTarget.height,
    };
  }

  Mitre.layout = { computeLayout };
})();
