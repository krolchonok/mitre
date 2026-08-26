(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const {
    tacticsContainer,
    topScrollbar,
    generateBtn,
    generateFstecBtn,
    selectAllBtn,
    clearBtn,
    savePresetBtn,
    deletePresetBtn,
    presetSelect,
    importInput,
    importBtn,
    greenFilterToggle,
    pageFitSize,
    pageFitOrientation,
    pageFitFlow,
    settingsToggleBtn,
    settingsPanel,
    textImportBtn,
    previewToggleBtn,
    previewCloseBtn,
    previewModeMitre,
    previewModeFstec,
    tacticsTabbar,
    subtechToggle,
    legendBtn,
    legendPopover,
  } = Mitre.dom;
  const { state } = Mitre;
  const { parseMitreCodesFromText, downloadFile } = Mitre.utils;
  const {
    loadPresetsFromStorage,
    loadTacticState,
    loadGreenFilterState,
    loadSettingsPanelState,
    saveSettingsPanelState,
    saveGreenFilterState,
    loadPageFitState,
    savePageFitState,
  } = Mitre.storage;
  const {
    renderTactics,
    sortTacticsData,
    updateGreenHighlights,
    handleTacticToggle,
    syncScrollbars,
    updateScrollbars,
    handleWheelScroll,
    handleTacticsTabbarClick,
    handleTechniqueExpand,
    setAllSubtechniquesExpanded,
  } = Mitre.render;
  const {
    collectSelection,
    toggleAll,
    updateSelectionCounter,
    applyInitialSelection,
    handleTechniqueSelectAll,
    handleSelectionCheckboxChange,
    handleCardClick,
  } = Mitre.selection;
  const { refreshPresetDropdown, handleSavePreset, handleDeletePreset, handlePresetSelect } =
    Mitre.presets;
  const { handleImportInputChange, handleImportDrawio, handleTextImport } =
    Mitre.import;
  const { buildFstecSelectionFromSelection, FSTEC_TECHNIQUES } = Mitre.fstec;
  const { buildDrawioXml } = Mitre.drawioExport;
  const {
    updatePreview,
    togglePreviewWindow,
    closePreviewWindow,
    setPreviewMode,
    wirePreviewControls,
    syncFromSettings,
  } = Mitre.preview;

  function loadGreenCodeLists() {
    try {
      const techniques = window.greenTechniquesRaw
        ? parseMitreCodesFromText(window.greenTechniquesRaw)
        : new Set();
      const subtechniques = window.greenSubtechniquesRaw
        ? parseMitreCodesFromText(window.greenSubtechniquesRaw)
        : new Set();
      state.setGreenCodeLists(techniques, subtechniques);
    } catch (error) {
      console.warn("Не удалось загрузить списки зеленых техник", error);
    }
  }

  function applySettingsPanelState() {
    if (!settingsPanel || !settingsToggleBtn) return;
    const isOpen = loadSettingsPanelState();
    settingsPanel.classList.toggle("hidden", !isOpen);
    settingsToggleBtn.textContent = isOpen ? "Скрыть проекты" : "Проекты и импорт";
  }

  function toggleSettingsPanel() {
    if (!settingsPanel) return;
    const hidden = settingsPanel.classList.toggle("hidden");
    const isOpen = !hidden;
    settingsToggleBtn.textContent = isOpen ? "Скрыть проекты" : "Проекты и импорт";
    saveSettingsPanelState(isOpen);
  }

  function handleGreenFilterToggle() {
    if (!greenFilterToggle) return;
    saveGreenFilterState(greenFilterToggle.checked);
    updateGreenHighlights();
  }

  function handlePageFitChange() {
    const next = {
      ...getPageFitOption(),
      columnWidth: getColumnWidth(),
      fontSize: getFontSize(),
      headerFontSize: getHeaderFontSize(),
      titleFontSize: getTitleFontSize(),
      widthMode: getWidthMode(),
      allowUpscale: getAllowUpscale(),
      equalizeHeight: getEqualizeHeight(),
    };
    savePageFitState(next);
    syncFromSettings(next);
    updatePreview();
  }

  function toggleLegend() {
    const isOpen = legendPopover.classList.toggle("hidden") === false;
    legendBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeLegendOnOutsideClick(event) {
    if (legendPopover.classList.contains("hidden")) return;
    if (event.target.closest(".legend-wrap")) return;
    legendPopover.classList.add("hidden");
    legendBtn.setAttribute("aria-expanded", "false");
  }

  function getPageFitOption() {
    return {
      size: pageFitSize ? pageFitSize.value : "none",
      orientation: pageFitOrientation ? pageFitOrientation.value : "portrait",
      flow: pageFitFlow ? pageFitFlow.value : "auto",
    };
  }

  // The width shown by the controls is the width that gets exported. All four
  // width inputs are kept in sync, so any of them is a valid source.
  function getColumnWidth() {
    const source = Mitre.dom.pageFitWidth || Mitre.dom.pvWidth;
    return source
      ? Mitre.preview.clampWidth(source.value)
      : Mitre.config.DRAWIO_LAYOUT.columnWidth;
  }

  function getWidthMode() {
    return Mitre.dom.pageFitWidthMode
      ? Mitre.dom.pageFitWidthMode.value
      : "auto";
  }

  function getFontSize() {
    const source = Mitre.dom.pageFitFont || Mitre.dom.pvFont;
    return source
      ? Mitre.preview.clampFontSize(source.value)
      : Mitre.config.DRAWIO_LAYOUT.baseFontSize;
  }

  function getHeaderFontSize() {
    const source = Mitre.dom.pageFitHeadFont || Mitre.dom.pvHeadFont;
    return source
      ? Mitre.preview.clampHeadFontSize(source.value)
      : Mitre.config.DRAWIO_LAYOUT.headerFontSize;
  }

  function getTitleFontSize() {
    const source = Mitre.dom.pageFitTitleFont || Mitre.dom.pvTitleFont;
    return source
      ? Mitre.preview.clampTitleFontSize(source.value)
      : Mitre.config.DRAWIO_LAYOUT.titleFontSize;
  }

  function getAllowUpscale() {
    return Boolean(
      Mitre.dom.pageFitAllowUpscale?.checked || Mitre.dom.pvAllowUpscale?.checked
    );
  }

  function getEqualizeHeight() {
    return Boolean(
      Mitre.dom.pageFitEqualizeBtn?.classList.contains("is-active") ||
        Mitre.dom.pvEqualizeBtn?.classList.contains("is-active")
    );
  }

  function handleGenerate() {
    const selection = collectSelection();
    if (!selection.length) {
      alert("Выберите хотя бы одну технику или подпункт.");
      return;
    }

    const xml = buildDrawioXml(selection, {
      pageFit: getPageFitOption(),
      columnWidth: getColumnWidth(),
      fontSize: getFontSize(),
      headerFontSize: getHeaderFontSize(),
      titleFontSize: getTitleFontSize(),
      widthMode: getWidthMode(),
      allowUpscale: getAllowUpscale(),
      equalizeHeight: getEqualizeHeight(),
    });
    downloadFile(`mitre-${Date.now()}.drawio`, xml);
  }

  function handleGenerateFstec() {
    const mitreSelection = collectSelection();
    if (!mitreSelection.length) {
      alert("Выберите хотя бы одну технику или подпункт.");
      return;
    }

    if (!FSTEC_TECHNIQUES.length) {
      alert("Каталог соответствий ФСТЭК не загружен.");
      return;
    }

    const { selection, missingCodes } = buildFstecSelectionFromSelection(mitreSelection);

    if (!selection.length) {
      const message = missingCodes.length
        ? "По выбранным техникам нет соответствий в базе ФСТЭК: " + missingCodes.join(", ")
        : "По выбранным техникам нет соответствий в базе ФСТЭК.";
      alert(message);
      return;
    }

    if (missingCodes.length) {
      alert("Следующие техники MITRE пропущены, так как нет соответствий ФСТЭК: " + missingCodes.join(", "));
    }

    const xml = buildDrawioXml(selection, {
      mode: "fstec",
      pageFit: getPageFitOption(),
      columnWidth: getColumnWidth(),
      fontSize: getFontSize(),
      headerFontSize: getHeaderFontSize(),
      titleFontSize: getTitleFontSize(),
      widthMode: getWidthMode(),
      allowUpscale: getAllowUpscale(),
      equalizeHeight: getEqualizeHeight(),
    });
    downloadFile(`fstec-${Date.now()}.drawio`, xml);
  }

  async function init() {
    loadPresetsFromStorage();
    loadTacticState();
    if (greenFilterToggle) {
      greenFilterToggle.checked = loadGreenFilterState();
    }
    loadGreenCodeLists();

    const pageFit = loadPageFitState();
    if (pageFitSize) pageFitSize.value = pageFit.size;
    if (pageFitOrientation) pageFitOrientation.value = pageFit.orientation;
    if (pageFitFlow) pageFitFlow.value = pageFit.flow;
    syncFromSettings(pageFit);

    if (!window.mitreData) {
      throw new Error("Failed to load mitreData from mitre_ru.js");
    }
    const tacticsData = window.mitreData.tactics || [];
    sortTacticsData(tacticsData);
    state.setTacticsData(tacticsData);

    renderTactics(tacticsData);
    refreshPresetDropdown();
    applyInitialSelection();
    updateSelectionCounter();
    applySettingsPanelState();
  }

  function wireEvents() {
    tacticsContainer.addEventListener("change", handleSelectionCheckboxChange);

    selectAllBtn.addEventListener("click", () => toggleAll(true));
    clearBtn.addEventListener("click", () => toggleAll(false));
    generateBtn.addEventListener("click", handleGenerate);
    if (generateFstecBtn) {
      generateFstecBtn.addEventListener("click", handleGenerateFstec);
    }
    savePresetBtn.addEventListener("click", handleSavePreset);
    deletePresetBtn.addEventListener("click", handleDeletePreset);
    presetSelect.addEventListener("change", handlePresetSelect);
    importInput.addEventListener("change", handleImportInputChange);
    importBtn.addEventListener("click", handleImportDrawio);
    if (greenFilterToggle) {
      greenFilterToggle.addEventListener("change", handleGreenFilterToggle);
    }
    if (pageFitSize) {
      pageFitSize.addEventListener("change", handlePageFitChange);
    }
    if (pageFitOrientation) {
      pageFitOrientation.addEventListener("change", handlePageFitChange);
    }
    if (pageFitFlow) {
      pageFitFlow.addEventListener("change", handlePageFitChange);
    }
    tacticsContainer.addEventListener("click", handleTechniqueSelectAll);
    tacticsContainer.addEventListener("click", handleTacticToggle);
    tacticsContainer.addEventListener("click", handleTechniqueExpand);
    tacticsContainer.addEventListener("click", handleCardClick);
    if (tacticsTabbar) {
      tacticsTabbar.addEventListener("click", handleTacticsTabbarClick);
    }
    if (subtechToggle) {
      subtechToggle.addEventListener("change", () =>
        setAllSubtechniquesExpanded(subtechToggle.checked)
      );
    }
    if (legendBtn && legendPopover) {
      legendBtn.addEventListener("click", toggleLegend);
      document.addEventListener("click", closeLegendOnOutsideClick);
    }
    settingsToggleBtn.addEventListener("click", toggleSettingsPanel);
    if (textImportBtn) {
      textImportBtn.addEventListener("click", handleTextImport);
    }
    if (previewToggleBtn) {
      previewToggleBtn.addEventListener("click", togglePreviewWindow);
    }
    if (previewCloseBtn) {
      previewCloseBtn.addEventListener("click", closePreviewWindow);
    }
    if (previewModeMitre) {
      previewModeMitre.addEventListener("click", () => setPreviewMode("mitre"));
    }
    if (previewModeFstec) {
      previewModeFstec.addEventListener("click", () => setPreviewMode("fstec"));
    }

    if (topScrollbar) {
      topScrollbar.addEventListener("scroll", () =>
        syncScrollbars(topScrollbar, tacticsContainer)
      );
    }
    tacticsContainer.addEventListener("scroll", () =>
      syncScrollbars(tacticsContainer, topScrollbar)
    );
    document.addEventListener("wheel", handleWheelScroll, { passive: false });
    window.addEventListener("resize", updateScrollbars);

    wirePreviewControls();
    state.onSelectionChanged(updatePreview);
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    init().catch((error) => {
      console.error(error);
      tacticsContainer.innerHTML =
        '<div class="error">Не удалось загрузить данные MITRE.</div>';
    });
  });
})();
