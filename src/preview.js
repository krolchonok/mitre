(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const {
    previewWindow,
    previewWorkspace,
    previewModeMitre,
    previewModeFstec,
    greenFilterToggle,
  } = Mitre.dom;
  const { state } = Mitre;
  const { computeLayout } = Mitre.layout;
  const { buildFstecSelectionFromSelection, FSTEC_TECHNIQUES } = Mitre.fstec;
  const { collectSelection } = Mitre.selection;

  function togglePreviewWindow() {
    if (!previewWindow) return;
    const isHidden = previewWindow.style.display === "none";
    previewWindow.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      updatePreview();
      previewWindow.scrollIntoView({ behavior: "smooth" });
    }
  }

  function setPreviewMode(mode) {
    state.setPreviewModeState(mode);
    if (previewModeMitre && previewModeFstec) {
      previewModeMitre.style.fontWeight = mode === "mitre" ? "bold" : "normal";
      previewModeFstec.style.fontWeight = mode === "fstec" ? "bold" : "normal";
    }
    updatePreview();
  }

  function showMessage(message) {
    previewWorkspace.innerHTML = `<div style="color: #fff; padding: 20px; font-weight: bold; font-family: Tahoma, sans-serif;">${message}</div>`;
  }

  function updatePreview() {
    if (!previewWindow || previewWindow.style.display === "none") return;
    if (!previewWorkspace) return;
    previewWorkspace.innerHTML = "";

    const mitreSelection = collectSelection();
    if (!mitreSelection.length) {
      showMessage("Выберите хотя бы одну технику для предпросмотра схемы.");
      return;
    }

    let selection = mitreSelection;
    const isFstecMode = state.previewMode === "fstec";

    if (isFstecMode) {
      if (!FSTEC_TECHNIQUES.length) {
        showMessage("Каталог соответствий ФСТЭК не загружен.");
        return;
      }
      const fstec = buildFstecSelectionFromSelection(mitreSelection);
      selection = fstec.selection;
      if (!selection.length) {
        showMessage("По выбранным техникам нет соответствий в базе ФСТЭК.");
        return;
      }
    }

    const useGreen = greenFilterToggle?.checked === true;
    const { columns, bounds } = computeLayout(selection, {
      mode: isFstecMode ? "fstec" : "mitre",
      useGreen,
      greenTechniques: state.greenTechniques,
      greenSubtechniques: state.greenSubtechniques,
    });

    columns.forEach((tactic) => {
      previewWorkspace.appendChild(renderTacticCard(tactic, isFstecMode));

      tactic.techniques.forEach((technique) => {
        previewWorkspace.appendChild(renderTechniqueCard(technique, isFstecMode));

        technique.subtechniques.forEach((sub) => {
          previewWorkspace.appendChild(renderSubtechCard(sub));
          previewWorkspace.appendChild(renderSubtechAccent(sub));
        });
      });
    });

    const spacer = document.createElement("div");
    spacer.style.width = `${bounds.width}px`;
    spacer.style.height = `${bounds.height}px`;
    spacer.style.position = "absolute";
    spacer.style.left = "0";
    spacer.style.top = "0";
    spacer.style.pointerEvents = "none";
    previewWorkspace.appendChild(spacer);
  }

  function renderTacticCard(tactic, isFstecMode) {
    const card = document.createElement("div");
    card.className = "preview-card preview-tactic";
    card.style.left = `${tactic.x}px`;
    card.style.top = `${tactic.y}px`;
    card.style.width = `${tactic.width}px`;
    card.style.height = `${tactic.height}px`;
    card.style.backgroundColor = tactic.fillColor;
    card.style.border = "1px solid rgba(0, 0, 0, 0.25)";

    card.innerHTML = isFstecMode
      ? `<div style="line-height: 130%; font-size: 11px;">${tactic.name}</div><div style="font-size: 9px; opacity: 0.85; margin-top: 4px;">${tactic.code}</div>`
      : `<div style="line-height: 110%; font-size: 12px; font-weight: bold;">${tactic.name} ${tactic.code}</div>`;

    return card;
  }

  function renderTechniqueCard(technique, isFstecMode) {
    const card = document.createElement("div");
    card.className = "preview-card preview-technique";
    card.style.left = `${technique.x}px`;
    card.style.top = `${technique.y}px`;
    card.style.width = `${technique.width}px`;
    card.style.height = `${technique.height}px`;
    card.style.backgroundColor = technique.fill;
    card.style.borderLeft = `5px solid ${technique.accent}`;

    card.innerHTML = isFstecMode
      ? `<div style="font-size: 10px; font-weight: bold;">${technique.code || ""}</div><div style="font-size: 9px; line-height: 1.1; margin-top: 2px;">${technique.name}</div>`
      : `<div style="font-size: 11px;"><b>${technique.code}</b></div><div style="font-size: 9px; margin-top: 2px; line-height: 1.1;">${technique.name}</div>`;

    return card;
  }

  function renderSubtechCard(sub) {
    const card = document.createElement("div");
    card.className = "preview-card preview-subtech";
    card.style.left = `${sub.x}px`;
    card.style.top = `${sub.y}px`;
    card.style.width = `${sub.width}px`;
    card.style.height = `${sub.height}px`;
    card.style.backgroundColor = sub.fill;
    card.innerHTML = `<div style="font-size: 9px;"><b>${sub.code}</b></div><div style="font-size: 8px; line-height: 1.1; margin-top: 1px;">${sub.name}</div>`;
    return card;
  }

  function renderSubtechAccent(sub) {
    const bar = document.createElement("div");
    bar.className = "preview-subtech-accent";
    bar.style.left = `${sub.accentX}px`;
    bar.style.top = `${sub.y}px`;
    bar.style.width = `${sub.accentWidth}px`;
    bar.style.height = `${sub.height}px`;
    bar.style.backgroundColor = sub.accent;
    return bar;
  }

  Mitre.preview = { togglePreviewWindow, setPreviewMode, updatePreview };
})();
