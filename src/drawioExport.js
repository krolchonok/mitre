(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { STYLES, fontScale } = Mitre.config;
  const { computeLayout } = Mitre.layout;

  function buildDrawioXml(selection, options = {}) {
    // The export must render exactly what the preview showed: preview.js's
    // own contract is "whatever is on screen is exactly what the export
    // buttons will produce". So the page-fit choice (none/A4/A3) is passed
    // through untouched — the same computeLayout call the preview makes —
    // instead of being forced to "none" here. Only the multi-row balancing
    // for the "flow" is decided locally, same as before.
    const userFlow = options.pageFit?.flow;
    const isMulti = userFlow === "multi" || userFlow === "auto";

    // If multi-row, balance the row splits so no row is left with 1 lonely column.
    // This only takes effect when no page size is chosen (pageFit.size === "none"):
    // with a real page target, fitToPage searches every split itself and this
    // perRow is ignored (see computeLayout).
    let perRow = selection.length;
    if (isMulti && selection.length > 6) {
      const targetRows = selection.length <= 12 ? 2 : Math.ceil(selection.length / 5);
      perRow = Math.ceil(selection.length / targetRows);
    }

    const exportOptions = {
      ...options,
      perRow,
      pageFit: {
        ...options.pageFit,
        flow: isMulti ? "multi" : "single",
      },
    };

    const {
      isFstecMode,
      columns,
      bounds,
      scale,
      fontSize,
      headerFontSize,
      titleFontSize,
    } = computeLayout(selection, exportOptions);

    const { PAGE_SIZES } = Mitre.config;
    const targetSize = options.pageFit ? options.pageFit.size : "a4";
    const targetOrient = options.pageFit ? (options.pageFit.orientation || "landscape") : "landscape";
    const paperSize = (PAGE_SIZES[targetSize] && PAGE_SIZES[targetSize][targetOrient])
      ? PAGE_SIZES[targetSize][targetOrient]
      : { width: 1169, height: 827 };

    // Canvas size in Draw.io: match the actual diagram dimensions so Draw.io opens at 100% zoom with huge text!
    const canvasWidth = Math.max(paperSize.width, Math.round(bounds.width + 120));
    const canvasHeight = Math.max(paperSize.height, Math.round(bounds.height + 120));

    const F = fontScale(fontSize, headerFontSize, isFstecMode, titleFontSize);
    // Matches preview.js's renderTechniqueCard/renderSubtechCard exactly:
    // the nominal font size scaled by the same factor the geometry was
    // scaled by, so text and box always agree. No artificial floor here —
    // if a selection is large enough that page-fit needs to shrink hard,
    // the preview already showed that (and warns below scale 35%); export
    // must match it instead of silently overriding it back up.
    const fs = (basePx) => Math.max(1, Math.round(basePx * scale));

    const doc = document.implementation.createDocument("", "", null);
    const mxfile = doc.createElement("mxfile");
    mxfile.setAttribute("host", "app.diagrams.net");
    mxfile.setAttribute("modified", new Date().toISOString());
    mxfile.setAttribute("agent", "custom-mitre-exporter");
    mxfile.setAttribute("version", "29.0.3");
    mxfile.setAttribute("editor", "www.diagrams.net");
    doc.appendChild(mxfile);

    const diagram = doc.createElement("diagram");
    diagram.setAttribute("id", `diagram-${Date.now()}`);
    diagram.setAttribute("name", isFstecMode ? "ФСТЭК схема" : "MITRE схема");
    mxfile.appendChild(diagram);

    const isInfinitePage = !options.pageFit || options.pageFit.size === "none";

    const graphModel = doc.createElement("mxGraphModel");
    Object.entries({
      dx: "1042",
      dy: "626",
      grid: "1",
      gridSize: "10",
      guides: "1",
      tooltips: "1",
      connect: "1",
      arrows: "1",
      fold: "1",
      page: isInfinitePage ? "0" : "1",
      pageScale: "1",
      pageWidth: String(canvasWidth),
      pageHeight: String(canvasHeight),
      math: "0",
      shadow: "0",
    }).forEach(([key, value]) => graphModel.setAttribute(key, value));
    diagram.appendChild(graphModel);

    const root = doc.createElement("root");
    graphModel.appendChild(root);

    const baseCell = doc.createElement("mxCell");
    baseCell.setAttribute("id", "0");
    root.appendChild(baseCell);

    const firstCell = doc.createElement("mxCell");
    firstCell.setAttribute("id", "1");
    firstCell.setAttribute("parent", "0");
    root.appendChild(firstCell);

    let idCounter = 2;
    const nextId = () => `cell-${idCounter++}`;

    const createCell = ({ value, style, vertex = true, parent = "1", geometry }) => {
      const cell = doc.createElement("mxCell");
      cell.setAttribute("id", nextId());
      if (value) cell.setAttribute("value", value);
      if (style) cell.setAttribute("style", style);
      cell.setAttribute("vertex", vertex ? "1" : "0");
      cell.setAttribute("parent", parent);

      if (geometry) {
        const geo = doc.createElement("mxGeometry");
        Object.entries(geometry).forEach(([key, val]) =>
          geo.setAttribute(key, val)
        );
        geo.setAttribute("as", "geometry");
        cell.appendChild(geo);
      }

      root.appendChild(cell);
      return cell;
    };

    // countWrappedLines (utils.js) sizes every card assuming an over-long
    // single word can break mid-word to fit the column. draw.io's own
    // whiteSpace=wrap only breaks at spaces, so without this the label
    // stayed on one line and ran past the shape instead of wrapping —
    // most visibly past the tactic header's chevron point.
    const WRAP = "overflow-wrap:normal;word-break:normal;";

    const padX = Math.max(2, Math.round(14 * scale));
    const stepSize = Math.max(2, Math.round(10 * scale));

    columns.forEach((tactic) => {
      const fontHeader = Mitre.utils.fitTacticHeaderFont(
        tactic.name,
        tactic.code,
        tactic.width,
        F.tacticName,
        scale
      );

      const tacticLabel = isFstecMode
        ? `<div style="line-height: 130%;${WRAP}"><font style="font-size: ${fontHeader}px;">${tactic.name}</font></div><div style="font-size: ${Math.max(8, fontHeader - 2)}px;${WRAP}">${tactic.code}</div>`
        : `<div style="line-height: 110%;${WRAP}"><font style="font-size: ${fontHeader}px;">${tactic.name} ${tactic.code}</font></div>`;

      createCell({
        value: tacticLabel,
        style: `${STYLES.tactic}fillColor=${tactic.fillColor};fontSize=${fontHeader};size=${stepSize};spacingRight=${padX};spacingLeft=${padX};`,
        geometry: {
          x: String(tactic.x),
          y: String(tactic.y),
          width: String(tactic.width),
          height: String(tactic.height),
        },
      });

      tactic.techniques.forEach((technique) => {
        const techniqueValue = isFstecMode
          ? [
              technique.code
                ? `<div style="font-size: ${fs(F.techniqueCode)}px;${WRAP}"><b>${technique.code}</b></div>`
                : "",
              `<div style="font-size: ${fs(F.techniqueName)}px;${WRAP}">${technique.name}</div>`,
            ].join("")
          : `<span style="font-size: ${fs(F.techniqueCode)}px;${WRAP}"><b>${technique.code}</b></span><div style="font-size: ${fs(F.techniqueName)}px;${WRAP}">${technique.name}</div>`;

        createCell({
          value: techniqueValue,
          style: `${STYLES.technique}fillColor=${technique.fill};fontSize=${fs(F.techniqueStyle)};`,
          geometry: {
            x: String(technique.x),
            y: String(technique.y),
            width: String(technique.width),
            height: String(technique.height),
          },
        });

        technique.subtechniques.forEach((sub) => {
          const subValue = `<span style="font-size: ${fs(F.subCode)}px;${WRAP}"><b>${sub.code}</b></span><div style="font-size: ${fs(F.subName)}px;${WRAP}">${sub.name}</div>`;

          createCell({
            value: subValue,
            style: `${STYLES.subtech}fillColor=${sub.fill};fontSize=${fs(F.subStyle)};`,
            geometry: {
              x: String(sub.x),
              y: String(sub.y),
              width: String(sub.width),
              height: String(sub.height),
            },
          });

          createCell({
            value: "",
            style: `${STYLES.subAccent}fillColor=${sub.accent};`,
            geometry: {
              x: String(sub.accentX),
              y: String(sub.y),
              width: String(sub.accentWidth),
              height: String(sub.height),
            },
          });
        });
      });
    });

    return new XMLSerializer().serializeToString(doc);
  }

  Mitre.drawioExport = { buildDrawioXml };
})();
