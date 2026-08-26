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
    getMinRequiredColumnWidth,
  } = Mitre.utils;
  const { computeFstecColumnWidths, computeMaxFstecHeaderHeight } =
    Mitre.fstec;

  const RECON_TACTIC_CODE = "TA0043";

  function clampHeaderFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return DRAWIO_LAYOUT.headerFontSize;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minHeaderFontSize),
      DRAWIO_LAYOUT.maxHeaderFontSize
    );
  }

  function clampTitleFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return DRAWIO_LAYOUT.titleFontSize;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minTitleFontSize),
      DRAWIO_LAYOUT.maxTitleFontSize
    );
  }

  function clampFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return DRAWIO_LAYOUT.baseFontSize;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minFontSize),
      DRAWIO_LAYOUT.maxFontSize
    );
  }

  // Resolves a pageFit option ({ size: 'a4'|'a3', orientation: 'portrait'|'landscape' })
  // into target pixel dimensions, or null if fitting is disabled. A caller
  // that already knows the exact pixels to fill — the live preview fitting
  // to its own viewport, which is no fixed paper size — passes them
  // directly via customTarget and skips the paper lookup entirely.
  function resolvePageTarget(pageFit) {
    if (pageFit?.customTarget?.width > 0 && pageFit?.customTarget?.height > 0) {
      return pageFit.customTarget;
    }
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
    const compact = {
      compact: opts.isFstecMode,
      fontSize: opts.fontSize,
      titleFontSize: opts.titleFontSize,
    };
    // Floor is the height of a single line at this font — taking the raw
    // base height instead pinned small fonts to a 52px cell they did not
    // need, which read as bloated padding.
    let techniqueHeight = computeCardHeight(
      "",
      layout.techniqueBaseHeight,
      columnWidth,
      compact
    );
    let subtechniqueHeight = computeCardHeight(
      "",
      layout.subTechniqueBaseHeight,
      columnWidth - layout.subAccentWidth,
      compact
    );

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
  function computeMitreHeaderHeight(selection, columnWidth, layout, headerFont) {
    const lineHeight = Math.round(headerFont * 1.25);
    // Floor tracks the header font for the same reason the cell floor does.
    const floor = Math.round(
      (layout.headerHeight * headerFont) / DRAWIO_LAYOUT.headerFontSize
    );
    const padX = Math.round(18 * (headerFont / DRAWIO_LAYOUT.headerFontSize));
    const usable = Math.max(columnWidth - padX * 2, 20);
    return selection.reduce((tallest, tactic) => {
      const lines = countWrappedLines(
        `${tactic.name} ${tactic.code}`,
        usable,
        headerFont,
        "bold"
      );
      return Math.max(tallest, lines * lineHeight + 16);
    }, floor);
  }

  function buildAllColumns(selection, columnWidth, layout, opts) {
    const headerHeight = opts.isFstecMode
      ? computeMaxFstecHeaderHeight(selection, columnWidth, layout)
      : computeMitreHeaderHeight(
          selection,
          columnWidth,
          layout,
          opts.headerFontSize
        );
    const cell = computeCellSize(selection, columnWidth, layout, opts);
    return selection.map((tactic) =>
      buildColumn(tactic, columnWidth, headerHeight, layout, opts, cell)
    );
  }

  // Distributes the leftover height between a column's technique blocks so
  // it ends flush with a target height instead of trailing off early. Card
  // sizes are untouched — only the gaps grow — so this can never overflow a
  // card's own content or affect line wrapping. There are (n + 1) gaps in
  // buildColumn's cursor (one before the first technique, one after each),
  // so growing every gap by the same amount adds exactly (n + 1) * extra to
  // the total, which is what extra is solved for below.
  function stretchColumn(col, targetHeight) {
    const n = col.techniques.length;
    if (!n || targetHeight <= col.totalHeight) return col;
    const extra = (targetHeight - col.totalHeight) / (n + 1);
    return {
      ...col,
      totalHeight: targetHeight,
      techniques: col.techniques.map((t, i) => {
        const shift = (i + 1) * extra;
        return {
          ...t,
          relY: t.relY + shift,
          subtechniques: t.subtechniques.map((s) => ({
            ...s,
            relY: s.relY + shift,
          })),
        };
      }),
    };
  }

  // Places built columns into `perRow` bands and resolves relative geometry
  // into absolute coordinates. One band per row of tactics; a band is as tall
  // as its tallest column. With equalizeHeight on, every column in a band is
  // stretched to that same height instead of a shorter tactic's column
  // trailing off with blank space under it while its row-mates run on.
  function placeColumns(built, perRow, layout, equalizeHeight) {
    const bandGap = layout.verticalGap * 2;
    const columns = [];
    let bandTop = layout.originY;
    let widest = 0;

    for (let start = 0; start < built.length; start += perRow) {
      let band = built.slice(start, start + perRow);
      if (equalizeHeight && band.length > 1) {
        const bandHeight = Math.max(...band.map((c) => c.totalHeight));
        band = band.map((c) => stretchColumn(c, bandHeight));
      }
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
  function fitToPage(selection, layout, opts, pageTarget, flow, fixedWidth, allowUpscale, equalizeHeight) {
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
      // Usable width and candidate column widths
      const candidates = new Set();
      if (fixedWidth) {
        candidates.add(Math.min(Math.max(fixedWidth, minWidth), maxWidth));
      } else {
        candidates.add(Math.min(Math.max(exact, minWidth), maxWidth));
        candidates.add(minWidth);
        candidates.add(Math.min(maxWidth, Math.max(minWidth, layout.columnWidth)));
        for (let w = minWidth; w <= maxWidth; w += 20) {
          candidates.add(w);
        }
      }

      candidates.forEach((columnWidth) => {
        const built = buildAllColumns(selection, columnWidth, layout, opts);
        const placed = placeColumns(built, perRow, layout, equalizeHeight);
        // Normally scale only ever shrinks (never past 1) — a small
        // selection is left at its natural size rather than blown up.
        // With upscaling allowed the diagram is grown to the sheet's
        // tighter dimension too, capped so a handful of techniques on an
        // A3 sheet doesn't turn into oversized cards.
        const fitRatio = Math.min(
          pageTarget.width / placed.width,
          pageTarget.height / placed.height
        );
        const scale = allowUpscale ? Math.min(fitRatio, 4) : Math.min(1, fitRatio);

        // Prefer the least shrinking. Ties are broken by how close the
        // diagram's proportions are to the sheet's, which varies smoothly
        // with the inputs — an area-coverage tie-break flipped between
        // wildly different arrangements on a one-step font change, so the
        // board appeared to jump around while dragging a slider.
        const diagramAspect = placed.width / placed.height;
        const pageAspect = pageTarget.width / pageTarget.height;
        const aspectFit =
          Math.min(diagramAspect, pageAspect) /
          Math.max(diagramAspect, pageAspect);
        const score = scale * 1000 + aspectFit;

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

    const fontSize = clampFontSize(options.fontSize);
    const headerFontSize = clampHeaderFontSize(options.headerFontSize);
    const titleFontSize = clampTitleFontSize(options.titleFontSize);

    // Gutters and margins are part of the type scale, not fixed furniture.
    // Left absolute they stayed 30px wide while the cards shrank, so at a
    // small font the diagram read as mostly gap — a quarter of the column
    // width at 6px against a fourteenth at 24px.
    const gapRatio = fontSize / DRAWIO_LAYOUT.baseFontSize;
    const scaleGap = (v) => Math.max(1, Math.round(v * gapRatio));

    const layout = {
      ...DRAWIO_LAYOUT,
      originX: scaleGap(DRAWIO_LAYOUT.originX),
      originY: scaleGap(DRAWIO_LAYOUT.originY),
      columnGap: scaleGap(DRAWIO_LAYOUT.columnGap),
      verticalGap: scaleGap(DRAWIO_LAYOUT.verticalGap),
      subAccentWidth: scaleGap(DRAWIO_LAYOUT.subAccentWidth),
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
    const opts = {
      useGreen,
      greenTechniques,
      greenSubtechniques,
      isFstecMode,
      fontSize,
      headerFontSize,
      titleFontSize,
    };
    const pageTarget = resolvePageTarget(options.pageFit);

    // Column width tracks the font by default. Holding it fixed while the
    // font grows starves the text: names rewrap into far more lines, the
    // diagram balloons vertically, and the page fitter answers by shrinking
    // everything — so a bigger font setting produced narrower boxes and
    // barely larger print. Scaling the width keeps characters-per-line, and
    // therefore the line count, constant.
    const rawWidth = Number(options.columnWidth) || 0;
    // Width follows whichever type needs more room. Keying it to the tile
    // font alone let the header change shape whenever the tiles were
    // resized: at 8px tiles the column narrowed to 153 and a 16px header
    // wrapped to 96px tall, at 20px tiles it widened and the same header
    // collapsed to 40 — the header font never moved.
    const widthRatio = Math.max(
      fontSize / DRAWIO_LAYOUT.baseFontSize,
      headerFontSize / DRAWIO_LAYOUT.headerFontSize,
      titleFontSize / DRAWIO_LAYOUT.titleFontSize
    );
    const requestedWidth =
      rawWidth && options.widthMode !== "fixed"
        ? Math.min(
            Math.max(
              Math.round(rawWidth * widthRatio),
              DRAWIO_LAYOUT.minColumnWidth
            ),
            DRAWIO_LAYOUT.maxColumnWidth
          )
        : rawWidth;

    if (!pageTarget) {
      // No sheet chosen: keep natural width with requested or default perRow.
      const naturalWidth =
        requestedWidth ||
        (isFstecMode
          ? computeFstecColumnWidths(selection, layout)[0] || layout.columnWidth
          : layout.columnWidth);
      const built = buildAllColumns(selection, naturalWidth, layout, opts);
      const perRow = options.perRow || (options.pageFit?.flow === "multi" ? Math.min(5, built.length) : built.length);
      const placed = placeColumns(
        built,
        perRow,
        layout,
        Boolean(options.equalizeHeight)
      );

      return {
        isFstecMode,
        layout,
        columns: placed.columns,
        bounds: { width: placed.width, height: placed.height },
        scale: 1,
        fontSize,
        headerFontSize,
        titleFontSize,
        requestedWidth,
        perRow,
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
      requestedWidth,
      Boolean(options.allowUpscale),
      Boolean(options.equalizeHeight)
    );
    if (!best) {
      const built = buildAllColumns(selection, layout.columnWidth, layout, opts);
      const placed = placeColumns(
        built,
        built.length || 1,
        layout,
        Boolean(options.equalizeHeight)
      );
      return {
        isFstecMode,
        layout,
        columns: placed.columns,
        bounds: { width: placed.width, height: placed.height },
        scale: 1,
        fontSize,
        headerFontSize,
        titleFontSize,
        requestedWidth,
        perRow: built.length,
        columnWidth: layout.columnWidth,
        pageWidth: pageTarget.width,
        pageHeight: pageTarget.height,
      };
    }

    const scaledColumns = scaleColumns(best.placed.columns, best.scale);

    // If widthMode is not fixed and fitting to a sheet, stretch columns to fill 100% of sheet width evenly
    if (options.widthMode !== "fixed" && pageTarget) {
      const rows = [];
      for (let i = 0; i < scaledColumns.length; i += best.perRow) {
        rows.push(scaledColumns.slice(i, i + best.perRow));
      }

      rows.forEach((rowCols) => {
        const numCols = rowCols.length;
        if (!numCols) return;

        const totalGaps = (numCols - 1) * layout.columnGap * best.scale;
        const totalMargins = layout.originX * 2 * best.scale;
        const availableWidth = pageTarget.width - totalMargins - totalGaps;
        if (availableWidth > 0) {
          const newColWidth = availableWidth / numCols;

          rowCols.forEach((col, idx) => {
            const oldX = col.x;
            const oldW = col.width;
            const newX = layout.originX * best.scale + idx * (newColWidth + layout.columnGap * best.scale);

            col.x = newX;
            col.width = newColWidth;

            col.techniques.forEach((t) => {
              t.x = newX;
              t.width = newColWidth;
              t.subtechniques.forEach((s) => {
                s.x = newX + (s.x - oldX);
                s.width = newColWidth - (oldW - s.width);
                s.accentX = newX + (s.accentX - oldX);
              });
            });
          });
        }
      });
    }

    return {
      isFstecMode,
      layout,
      columns: scaledColumns,
      bounds: {
        width: pageTarget ? pageTarget.width : best.placed.width * best.scale,
        height: best.placed.height * best.scale,
      },
      scale: best.scale,
      fontSize,
      headerFontSize,
      titleFontSize,
      requestedWidth,
      perRow: best.perRow,
      columnWidth: best.columnWidth,
      pageWidth: pageTarget.width,
      pageHeight: pageTarget.height,
    };
  }

  // Calculates optimal layout parameters (column width, font sizes)
  // to fit the chosen sheet format (A4/A3) in a single row ("в одну строку")
  // guaranteeing large, crystal-clear readable font sizes for any selection size.
  function autoFitLayout(selection, options = {}) {
    if (!selection || !selection.length) return null;

    const mode = options.mode || "mitre";
    const isFstecMode = mode === "fstec";
    const useGreen = Boolean(options.useGreen);
    const greenTechniques = options.greenTechniques || new Set();
    const greenSubtechniques = options.greenSubtechniques || new Set();

    const orientation = options.orientation || "landscape";
    const flow = options.flow || "single";
    const equalizeHeight = false;

    const fontSizes = [22, 20, 18, 16, 15, 14, 13, 12];
    const widths = [200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 440, 480];

    // Try A4, then A3 to find a sheet size that preserves large legible text
    for (const targetSize of ["a4", "a3"]) {
      let bestCandidate = null;
      let bestScore = -Infinity;

      for (const fontSize of fontSizes) {
        const headerFontSize = Math.min(
          DRAWIO_LAYOUT.maxHeaderFontSize,
          Math.max(DRAWIO_LAYOUT.minHeaderFontSize, Math.round(fontSize * 1.33))
        );
        const titleFontSize = Math.min(
          DRAWIO_LAYOUT.maxTitleFontSize,
          Math.max(DRAWIO_LAYOUT.minTitleFontSize, Math.round(fontSize * 1.15))
        );

        const minReqWidth = getMinRequiredColumnWidth(
          selection,
          fontSize,
          isFstecMode ? 36 : 28
        );

        for (const rawWidth of widths) {
          const columnWidth = Math.max(rawWidth, minReqWidth);
          const res = computeLayout(selection, {
            mode,
            useGreen,
            greenTechniques,
            greenSubtechniques,
            pageFit: { size: targetSize, orientation, flow },
            columnWidth,
            fontSize,
            headerFontSize,
            titleFontSize,
            widthMode: "auto",
            allowUpscale: true,
            equalizeHeight: false,
          });

          const effectiveFont = fontSize * res.scale;
          const effectiveWidth = columnWidth * res.scale;

          const widthRatio = Math.min(1, res.bounds.width / res.pageWidth);
          const heightRatio = Math.min(1, res.bounds.height / res.pageHeight);
          const areaFill = widthRatio * heightRatio;

          // DISCARD MICRO-PRINT: effective font MUST be >= 10px and scale >= 0.60 for printed sheets!
          if (effectiveFont < 10.0 || res.scale < 0.60 || effectiveWidth < 140) continue;

          let score = (widthRatio * 2000) + (effectiveFont * 500) + (areaFill * 800) + (res.scale * 300);

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = {
              size: targetSize,
              orientation,
              flow,
              columnWidth: res.columnWidth,
              fontSize,
              headerFontSize,
              titleFontSize,
              equalizeHeight: false,
              allowUpscale: true,
            };
          }
        }
      }

      if (bestCandidate) return bestCandidate;
    }

    // When the selection has tall columns (10+ techniques), fitting on A4/A3 would crush fonts down to 5-7px.
    // We automatically choose "none" (1:1 Full Scale) so letters are 100% full 18px-24px size: huge, bold, and readable!
    return {
      size: "none",
      orientation,
      flow,
      columnWidth: 280,
      fontSize: 18,
      headerFontSize: 24,
      titleFontSize: 22,
      equalizeHeight: false,
      allowUpscale: true,
    };
  }

  Mitre.layout = { computeLayout, autoFitLayout };
})();
