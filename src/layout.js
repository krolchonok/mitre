(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { DRAWIO_LAYOUT, COLOR_CONFIG, SUB_ACCENT_COLOR, GREEN_COLOR_CONFIG } =
    Mitre.config;
  const { compareCodes, computeCardHeight, normalizeMitreCode } = Mitre.utils;
  const { computeFstecColumnWidths, computeMaxFstecHeaderHeight } =
    Mitre.fstec;

  const RECON_TACTIC_CODE = "TA0043";

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

    const columnWidths = isFstecMode
      ? computeFstecColumnWidths(selection, layout)
      : selection.map(() => layout.columnWidth);

    const normalizedColumnWidth =
      columnWidths.length > 0 ? columnWidths[0] : layout.columnWidth;
    const sharedHeaderHeight = isFstecMode
      ? computeMaxFstecHeaderHeight(selection, normalizedColumnWidth, layout)
      : layout.headerHeight;

    let currentX = layout.originX;
    let maxX = 0;
    let maxY = 0;

    const columns = selection.map((tactic, columnIndex) => {
      const columnWidth = isFstecMode
        ? normalizedColumnWidth
        : columnWidths[columnIndex] || layout.columnWidth;
      const isRecon = tactic.code === RECON_TACTIC_CODE;
      const colors = isRecon ? COLOR_CONFIG.recon : COLOR_CONFIG.default;
      const x = currentX;
      const headerHeight = isFstecMode ? sharedHeaderHeight : layout.headerHeight;
      let currentY = layout.originY;

      currentY += headerHeight + layout.verticalGap;

      const techniques = tactic.techniques
        .slice()
        .sort((a, b) => compareCodes(a.code, b.code))
        .map((technique) => {
          const techHeight = computeCardHeight(
            technique.name,
            layout.techniqueBaseHeight,
            columnWidth,
            { compact: isFstecMode }
          );
          const isGreen =
            useGreen &&
            technique.code &&
            greenTechniques.has(normalizeMitreCode(technique.code));
          const fill = isGreen ? GREEN_COLOR_CONFIG.card : colors.card;
          const accent = isGreen ? GREEN_COLOR_CONFIG.subAccent : colors.step;

          const y = currentY;
          currentY += techHeight;

          const subtechniques = technique.subtechniques
            .slice()
            .sort((a, b) => compareCodes(a.code, b.code))
            .map((sub) => {
              const subIsGreen =
                useGreen &&
                sub.code &&
                greenSubtechniques.has(normalizeMitreCode(sub.code));
              const subFill = subIsGreen
                ? GREEN_COLOR_CONFIG.card
                : colors.card;
              const subAccent = subIsGreen
                ? GREEN_COLOR_CONFIG.subAccent
                : SUB_ACCENT_COLOR;
              const subHeight = computeCardHeight(
                sub.name,
                layout.subTechniqueBaseHeight,
                columnWidth - layout.subAccentWidth,
                { compact: isFstecMode }
              );

              const subY = currentY;
              currentY += subHeight;

              return {
                code: sub.code,
                name: sub.name,
                x: x + layout.subAccentWidth,
                y: subY,
                width: columnWidth - layout.subAccentWidth,
                height: subHeight,
                fill: subFill,
                accent: subAccent,
                accentX: x,
                accentWidth: layout.subAccentWidth,
              };
            });

          currentY += layout.verticalGap;

          return {
            code: technique.code,
            name: technique.name,
            x,
            y,
            width: columnWidth,
            height: techHeight,
            fill,
            accent,
            subtechniques,
          };
        });

      maxX = Math.max(maxX, x + columnWidth + 100);
      maxY = Math.max(maxY, currentY + 100);
      currentX += columnWidth + layout.columnGap;

      return {
        code: tactic.code,
        name: tactic.name,
        x,
        y: layout.originY,
        width: columnWidth,
        height: headerHeight,
        fillColor: colors.step,
        isRecon,
        techniques,
      };
    });

    return {
      isFstecMode,
      layout,
      columns,
      bounds: { width: maxX, height: maxY },
    };
  }

  Mitre.layout = { computeLayout };
})();
