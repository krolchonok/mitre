(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { STYLES } = Mitre.config;
  const { computeLayout } = Mitre.layout;

  function buildDrawioXml(selection, options = {}) {
    const { isFstecMode, columns } = computeLayout(selection, options);

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
      page: "1",
      pageScale: "1",
      pageWidth: "827",
      pageHeight: "1169",
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

    columns.forEach((tactic) => {
      const tacticLabel = isFstecMode
        ? `<div style="line-height: 130%;"><font style="font-size: 14px;">${tactic.name}</font></div><div style="font-size: 12px;">${tactic.code}</div>`
        : `<div style="line-height: 100%;"><font style="font-size: 16px;">${tactic.name} ${tactic.code}</font></div>`;

      createCell({
        value: tacticLabel,
        style: `${STYLES.tactic}fillColor=${tactic.fillColor};`,
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
                ? `<div style="font-size: 13px;"><b>${technique.code}</b></div>`
                : "",
              `<div style="font-size: 12px;">${technique.name}</div>`,
            ].join("")
          : `<span style="font-size: 14px;"><b>${technique.code}</b></span><div style="font-size: 12px;">${technique.name}</div>`;

        createCell({
          value: techniqueValue,
          style: `${STYLES.technique}fillColor=${technique.fill};`,
          geometry: {
            x: String(technique.x),
            y: String(technique.y),
            width: String(technique.width),
            height: String(technique.height),
          },
        });

        technique.subtechniques.forEach((sub) => {
          const subValue = `<span style="font-size: 12px;"><b>${sub.code}</b></span><div style="font-size: 10px;">${sub.name}</div>`;

          createCell({
            value: subValue,
            style: `${STYLES.subtech}fillColor=${sub.fill};`,
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
