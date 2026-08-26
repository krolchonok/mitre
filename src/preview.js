(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const {
    previewWindow,
    previewWorkspace,
    previewModeMitre,
    previewModeFstec,
    greenFilterToggle,
    pageFitSize,
    pageFitOrientation,
    pageFitFlow,
    pvSize,
    pvOrientation,
    pvFlow,
    pvWidth,
    pvWidthValue,
    pvReset,
    pvReadout,
    pageFitWidth,
    pageFitWidthRange,
    pageFitFont,
    pageFitFontRange,
    pageFitWidthMode,
    pageFitHeadFont,
    pageFitHeadFontRange,
    pageFitTitleFont,
    pageFitTitleFontRange,
    pageFitAllowUpscale,
    pageFitEqualizeBtn,
    pvFont,
    pvFontValue,
    pvHeadFont,
    pvHeadFontValue,
    pvTitleFont,
    pvTitleFontValue,
    pvAllowUpscale,
    pvEqualizeBtn,
  } = Mitre.dom;
  const { state } = Mitre;
  const { computeLayout } = Mitre.layout;
  const { DRAWIO_LAYOUT, fontScale } = Mitre.config;
  const { buildFstecSelectionFromSelection, FSTEC_TECHNIQUES } = Mitre.fstec;
  const { collectSelection } = Mitre.selection;
  const { savePageFitState } = Mitre.storage;

  const DEFAULT_WIDTH = DRAWIO_LAYOUT.columnWidth;
  const DEFAULT_FONT = DRAWIO_LAYOUT.baseFontSize;
  const DEFAULT_HEAD_FONT = DRAWIO_LAYOUT.headerFontSize;
  const DEFAULT_TITLE_FONT = DRAWIO_LAYOUT.titleFontSize;

  function isPreviewOpen() {
    return Boolean(previewWindow?.classList.contains("is-open"));
  }

  function openPreviewWindow() {
    if (!previewWindow || isPreviewOpen()) return;
    previewWindow.classList.add("is-open");
    document.body.classList.add("no-scroll");
    updatePreview();
  }

  function closePreviewWindow() {
    if (!previewWindow) return;
    previewWindow.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  function togglePreviewWindow() {
    if (isPreviewOpen()) closePreviewWindow();
    else openPreviewWindow();
  }

  function handlePreviewKeydown(event) {
    if (event.key === "Escape" && isPreviewOpen()) closePreviewWindow();
  }

  function setPreviewMode(mode) {
    state.setPreviewModeState(mode);
    if (previewModeMitre && previewModeFstec) {
      previewModeMitre.classList.toggle("is-active", mode === "mitre");
      previewModeFstec.classList.toggle("is-active", mode === "fstec");
    }
    updatePreview();
  }

  function showMessage(message) {
    previewWorkspace.innerHTML = `<div class="preview-message">${message}</div>`;
    if (pvReadout) pvReadout.textContent = "";
  }

  // The preview controls are the working copy of the export settings: editing
  // them here writes straight back to the settings panel and to storage, so
  // whatever is on screen is exactly what the export buttons will produce.
  function currentSettings() {
    return {
      size: pvSize ? pvSize.value : "none",
      orientation: pvOrientation ? pvOrientation.value : "portrait",
      flow: pvFlow ? pvFlow.value : "auto",
      columnWidth: pvWidth ? Number(pvWidth.value) : DEFAULT_WIDTH,
      fontSize: pvFont ? Number(pvFont.value) : DEFAULT_FONT,
      widthMode: pageFitWidthMode ? pageFitWidthMode.value : "auto",
      headerFontSize: pvHeadFont ? Number(pvHeadFont.value) : DEFAULT_HEAD_FONT,
      titleFontSize: pvTitleFont ? Number(pvTitleFont.value) : DEFAULT_TITLE_FONT,
      allowUpscale: Boolean(pvAllowUpscale?.checked || pageFitAllowUpscale?.checked),
      equalizeHeight: Boolean(
        pvEqualizeBtn?.classList.contains("is-active") ||
          pageFitEqualizeBtn?.classList.contains("is-active")
      ),
    };
  }

  function syncSettingsPanel(s) {
    if (pageFitSize) pageFitSize.value = s.size;
    if (pageFitOrientation) pageFitOrientation.value = s.orientation;
    if (pageFitFlow) pageFitFlow.value = s.flow;
    savePageFitState({
      size: s.size,
      orientation: s.orientation,
      flow: s.flow,
      columnWidth: s.columnWidth,
      fontSize: s.fontSize,
      headerFontSize: s.headerFontSize,
      titleFontSize: s.titleFontSize,
      widthMode: s.widthMode,
      allowUpscale: s.allowUpscale,
      equalizeHeight: s.equalizeHeight,
    });
  }

  // The same width is offered by four controls (slider + number box, in the
  // preview and in the settings panel). This is the one place that writes
  // them, so they can never drift apart.
  const WIDTH_INPUTS = () => [pvWidth, pvWidthValue, pageFitWidth, pageFitWidthRange];

  function clampWidth(value) {
    const min = pvWidth ? Number(pvWidth.min) : 120;
    const max = pvWidth ? Number(pvWidth.max) : 600;
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_WIDTH;
    return Math.min(Math.max(Math.round(n), min), max);
  }

  function setColumnWidth(value, { silent = false } = {}) {
    const w = clampWidth(value);
    WIDTH_INPUTS().forEach((el) => {
      if (el && el.value !== String(w)) el.value = String(w);
    });
    if (!silent) {
      syncSettingsPanel(currentSettings());
      updatePreview();
    }
    return w;
  }

  const FONT_INPUTS = () => [pvFont, pvFontValue, pageFitFont, pageFitFontRange];
  const HEAD_FONT_INPUTS = () =>
    [pvHeadFont, pvHeadFontValue, pageFitHeadFont, pageFitHeadFontRange];
  const TITLE_FONT_INPUTS = () =>
    [pvTitleFont, pvTitleFontValue, pageFitTitleFont, pageFitTitleFontRange];
  const ALLOW_UPSCALE_INPUTS = () => [pvAllowUpscale, pageFitAllowUpscale];
  const EQUALIZE_BUTTONS = () => [pvEqualizeBtn, pageFitEqualizeBtn];

  function clampHeadFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_HEAD_FONT;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minHeaderFontSize),
      DRAWIO_LAYOUT.maxHeaderFontSize
    );
  }

  function setHeadFontSize(value, { silent = false } = {}) {
    const f = clampHeadFontSize(value);
    HEAD_FONT_INPUTS().forEach((el) => {
      if (el && el.value !== String(f)) el.value = String(f);
    });
    if (!silent) {
      syncSettingsPanel(currentSettings());
      updatePreview();
    }
    return f;
  }

  function clampTitleFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_TITLE_FONT;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minTitleFontSize),
      DRAWIO_LAYOUT.maxTitleFontSize
    );
  }

  function setTitleFontSize(value, { silent = false } = {}) {
    const f = clampTitleFontSize(value);
    TITLE_FONT_INPUTS().forEach((el) => {
      if (el && el.value !== String(f)) el.value = String(f);
    });
    if (!silent) {
      syncSettingsPanel(currentSettings());
      updatePreview();
    }
    return f;
  }

  // The preview and settings-panel checkboxes are two views of one flag —
  // kept in lockstep the same way the width/font inputs are.
  function setAllowUpscale(value, { silent = false } = {}) {
    const v = Boolean(value);
    ALLOW_UPSCALE_INPUTS().forEach((el) => {
      if (el && el.checked !== v) el.checked = v;
    });
    if (!silent) {
      syncSettingsPanel(currentSettings());
      updatePreview();
    }
    return v;
  }

  // A pressed-state button rather than a checkbox — same lockstep pattern,
  // toggled via .is-active instead of .checked.
  function setEqualizeHeight(value, { silent = false } = {}) {
    const v = Boolean(value);
    EQUALIZE_BUTTONS().forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-active", v);
      el.setAttribute("aria-pressed", String(v));
    });
    if (!silent) {
      syncSettingsPanel(currentSettings());
      updatePreview();
    }
    return v;
  }

  function clampFontSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_FONT;
    return Math.min(
      Math.max(Math.round(n), DRAWIO_LAYOUT.minFontSize),
      DRAWIO_LAYOUT.maxFontSize
    );
  }

  function setFontSize(value, { silent = false } = {}) {
    const f = clampFontSize(value);
    FONT_INPUTS().forEach((el) => {
      if (el && el.value !== String(f)) el.value = String(f);
    });
    if (!silent) {
      syncSettingsPanel(currentSettings());
      updatePreview();
    }
    return f;
  }

  // Pulls values the other way: the settings panel changed, mirror it here.
  function syncFromSettings(saved) {
    if (!saved) return;
    if (pvSize && saved.size) pvSize.value = saved.size;
    if (pvOrientation && saved.orientation) pvOrientation.value = saved.orientation;
    if (pvFlow && saved.flow) pvFlow.value = saved.flow;
    if (pageFitWidthMode && saved.widthMode) pageFitWidthMode.value = saved.widthMode;
    if (saved.columnWidth) setColumnWidth(saved.columnWidth, { silent: true });
    if (saved.fontSize) setFontSize(saved.fontSize, { silent: true });
    if (saved.headerFontSize)
      setHeadFontSize(saved.headerFontSize, { silent: true });
    if (saved.titleFontSize)
      setTitleFontSize(saved.titleFontSize, { silent: true });
    if (typeof saved.allowUpscale === "boolean")
      setAllowUpscale(saved.allowUpscale, { silent: true });
    if (typeof saved.equalizeHeight === "boolean")
      setEqualizeHeight(saved.equalizeHeight, { silent: true });
  }

  function handleControlChange() {
    syncSettingsPanel(currentSettings());
    updatePreview();
  }

  function handleWidthInput(event) {
    setColumnWidth(event.target.value);
  }

  function handleFontInput(event) {
    setFontSize(event.target.value);
  }

  function handleHeadFontInput(event) {
    setHeadFontSize(event.target.value);
  }

  function handleTitleFontInput(event) {
    setTitleFontSize(event.target.value);
  }

  function handleAllowUpscaleChange(event) {
    setAllowUpscale(event.target.checked);
  }

  function handleEqualizeClick() {
    setEqualizeHeight(!currentSettings().equalizeHeight);
  }

  function resetControls() {
    if (pvFlow) pvFlow.value = "auto";
    setFontSize(DEFAULT_FONT, { silent: true });
    setHeadFontSize(DEFAULT_HEAD_FONT, { silent: true });
    setTitleFontSize(DEFAULT_TITLE_FONT, { silent: true });
    setAllowUpscale(false, { silent: true });
    setEqualizeHeight(false, { silent: true });
    setColumnWidth(DEFAULT_WIDTH);
  }

  function updatePreview() {
    if (!isPreviewOpen()) return;
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

    const s = currentSettings();
    const useGreen = greenFilterToggle?.checked === true;
    const result = computeLayout(selection, {
      mode: isFstecMode ? "fstec" : "mitre",
      useGreen,
      greenTechniques: state.greenTechniques,
      greenSubtechniques: state.greenSubtechniques,
      pageFit: { size: s.size, orientation: s.orientation, flow: s.flow },
      columnWidth: s.columnWidth,
      fontSize: s.fontSize,
      headerFontSize: s.headerFontSize,
      titleFontSize: s.titleFontSize,
      widthMode: s.widthMode,
      allowUpscale: s.allowUpscale,
      equalizeHeight: s.equalizeHeight,
    });

    const { columns, bounds, scale, perRow, pageWidth, pageHeight } = result;
    const F = fontScale(
      result.fontSize,
      result.headerFontSize,
      isFstecMode,
      result.titleFontSize
    );
    const showSheet = s.size !== "none";

    // Canvas is the sheet when one is chosen, otherwise the diagram itself.
    const canvasW = showSheet ? pageWidth : bounds.width;
    const canvasH = showSheet ? pageHeight : bounds.height;

    // Zoom the whole thing down so the full sheet is visible at once —
    // that is the point of a fit preview.
    const viewW = previewWorkspace.clientWidth - 24;
    const viewH = previewWorkspace.clientHeight - 24;
    const zoom = Math.min(1, viewW / canvasW, viewH / canvasH);

    const stage = document.createElement("div");
    stage.className = "preview-stage";
    stage.style.width = `${canvasW}px`;
    stage.style.height = `${canvasH}px`;
    stage.style.transform = `scale(${zoom})`;

    if (showSheet) stage.classList.add("is-sheet");

    columns.forEach((tactic) => {
      stage.appendChild(renderTacticCard(tactic, isFstecMode, scale, F));
      tactic.techniques.forEach((technique) => {
        stage.appendChild(renderTechniqueCard(technique, isFstecMode, scale, F));
        technique.subtechniques.forEach((sub) => {
          stage.appendChild(renderSubtechCard(sub, scale, F));
          stage.appendChild(renderSubtechAccent(sub));
        });
      });
    });

    const holder = document.createElement("div");
    holder.className = "preview-stage-holder";
    holder.style.width = `${canvasW * zoom}px`;
    holder.style.height = `${canvasH * zoom}px`;
    holder.appendChild(stage);
    previewWorkspace.appendChild(holder);

    renderReadout(s, result, zoom);
  }

  function renderReadout(s, result, zoom) {
    if (!pvReadout) return;
    if (s.size === "none") {
      pvReadout.className = "pv-readout";
      pvReadout.textContent = `Без подгонки · схема ${Math.round(
        result.bounds.width
      )}×${Math.round(result.bounds.height)} px · просмотр ${Math.round(
        zoom * 100
      )}%`;
      return;
    }

    const rows = result.perRow
      ? Math.ceil(result.columns.length / result.perRow)
      : 1;
    const shape =
      rows > 1 ? `${result.perRow} в ряд × ${rows}` : "в один ряд";
    const pct = Math.round(result.scale * 100);
    const fill = Math.round(
      (result.bounds.height / result.pageHeight) * 100
    );

    pvReadout.className = "pv-readout";
    if (result.scale < 0.35) pvReadout.classList.add("is-tight");
    else if (result.scale >= 0.999) pvReadout.classList.add("is-good");

    pvReadout.textContent =
      `Масштаб ${pct}% · ${shape} · заполнение по высоте ${fill}%` +
      (result.scale < 0.35 ? " · текст будет нечитаем при печати" : "");
  }

  function renderTacticCard(tactic, isFstecMode, scale = 1, F) {
    const fs = (px) => Math.max(1, px * scale);
    const card = document.createElement("div");
    card.className = "preview-card preview-tactic";
    card.style.left = `${tactic.x}px`;
    card.style.top = `${tactic.y}px`;
    card.style.width = `${tactic.width}px`;
    card.style.height = `${tactic.height}px`;
    card.style.backgroundColor = tactic.fillColor;

    card.innerHTML = isFstecMode
      ? `<div style="line-height: 130%; font-size: ${fs(F.tacticName)}px;">${tactic.name}</div><div style="font-size: ${fs(F.tacticCode)}px; opacity: 0.85; margin-top: 4px;">${tactic.code}</div>`
      : `<div style="line-height: 110%; font-size: ${fs(F.tacticName)}px; font-weight: bold;">${tactic.name} ${tactic.code}</div>`;

    return card;
  }

  function renderTechniqueCard(technique, isFstecMode, scale = 1, F) {
    const fs = (px) => Math.max(1, px * scale);
    const card = document.createElement("div");
    card.className = "preview-card preview-technique";
    card.style.left = `${technique.x}px`;
    card.style.top = `${technique.y}px`;
    card.style.width = `${technique.width}px`;
    card.style.height = `${technique.height}px`;
    card.style.backgroundColor = technique.fill;

    card.innerHTML = isFstecMode
      ? `<div style="font-size: ${fs(F.techniqueCode)}px; font-weight: bold;">${technique.code || ""}</div><div style="font-size: ${fs(F.techniqueName)}px; line-height: 1.15; margin-top: 2px;">${technique.name}</div>`
      : `<div style="font-size: ${fs(F.techniqueCode)}px;"><b>${technique.code}</b></div><div style="font-size: ${fs(F.techniqueName)}px; margin-top: 2px; line-height: 1.15;">${technique.name}</div>`;

    return card;
  }

  function renderSubtechCard(sub, scale = 1, F) {
    const fs = (px) => Math.max(1, px * scale);
    const card = document.createElement("div");
    card.className = "preview-card preview-subtech";
    card.style.left = `${sub.x}px`;
    card.style.top = `${sub.y}px`;
    card.style.width = `${sub.width}px`;
    card.style.height = `${sub.height}px`;
    card.style.backgroundColor = sub.fill;
    card.innerHTML = `<div style="font-size: ${fs(F.subCode)}px;"><b>${sub.code}</b></div><div style="font-size: ${fs(F.subName)}px; line-height: 1.15; margin-top: 1px;">${sub.name}</div>`;
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

  function wirePreviewControls() {
    [pvSize, pvOrientation, pvFlow, pageFitWidthMode].forEach((el) => {
      if (el) el.addEventListener("change", handleControlChange);
    });
    // input, not change: the diagram must move while a slider is dragged.
    [pvWidth, pvWidthValue, pageFitWidth, pageFitWidthRange].forEach((el) => {
      if (el) el.addEventListener("input", handleWidthInput);
    });
    [pvFont, pvFontValue, pageFitFont, pageFitFontRange].forEach((el) => {
      if (el) el.addEventListener("input", handleFontInput);
    });
    HEAD_FONT_INPUTS().forEach((el) => {
      if (el) el.addEventListener("input", handleHeadFontInput);
    });
    TITLE_FONT_INPUTS().forEach((el) => {
      if (el) el.addEventListener("input", handleTitleFontInput);
    });
    ALLOW_UPSCALE_INPUTS().forEach((el) => {
      if (el) el.addEventListener("change", handleAllowUpscaleChange);
    });
    EQUALIZE_BUTTONS().forEach((el) => {
      if (el) el.addEventListener("click", handleEqualizeClick);
    });
    if (pvReset) pvReset.addEventListener("click", resetControls);
    window.addEventListener("resize", updatePreview);
    document.addEventListener("keydown", handlePreviewKeydown);
  }

  Mitre.preview = {
    togglePreviewWindow,
    closePreviewWindow,
    setPreviewMode,
    updatePreview,
    wirePreviewControls,
    syncFromSettings,
    clampWidth,
    clampFontSize,
    clampHeadFontSize,
    clampTitleFontSize,
  };
})();
