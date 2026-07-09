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
    settingsToggleBtn,
    settingsPanel,
    textImportBtn,
    previewToggleBtn,
    previewWindow,
    previewCloseBtn,
    previewModeMitre,
    previewModeFstec,
    tacticsTabbar,
    expandAllTacticsBtn,
    collapseAllTacticsBtn,
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
  } = Mitre.storage;
  const {
    renderTactics,
    sortTacticsData,
    updateGreenHighlights,
    handleTacticToggle,
    syncScrollbars,
    updateScrollbars,
    handleWheelScroll,
    collapseAllTactics,
    expandAllTactics,
    handleTacticsTabbarClick,
  } = Mitre.render;
  const {
    collectSelection,
    toggleAll,
    updateSelectionCounter,
    applyInitialSelection,
    handleTechniqueSelectAll,
    handleSelectionCheckboxChange,
  } = Mitre.selection;
  const { refreshPresetDropdown, handleSavePreset, handleDeletePreset, handlePresetSelect } =
    Mitre.presets;
  const { handleImportInputChange, handleImportDrawio, handleTextImport } =
    Mitre.import;
  const { buildFstecSelectionFromSelection, FSTEC_TECHNIQUES } = Mitre.fstec;
  const { buildDrawioXml } = Mitre.drawioExport;
  const { updatePreview, togglePreviewWindow, setPreviewMode } = Mitre.preview;

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

  function handleGenerate() {
    const selection = collectSelection();
    if (!selection.length) {
      alert("Выберите хотя бы одну технику или подпункт.");
      return;
    }

    const xml = buildDrawioXml(selection);
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

    const xml = buildDrawioXml(selection, { mode: "fstec" });
    downloadFile(`fstec-${Date.now()}.drawio`, xml);
  }

  async function init() {
    loadPresetsFromStorage();
    loadTacticState();
    if (greenFilterToggle) {
      greenFilterToggle.checked = loadGreenFilterState();
    }
    loadGreenCodeLists();

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
    tacticsContainer.addEventListener("click", handleTechniqueSelectAll);
    tacticsContainer.addEventListener("click", handleTacticToggle);
    if (tacticsTabbar) {
      tacticsTabbar.addEventListener("click", handleTacticsTabbarClick);
    }
    if (expandAllTacticsBtn) {
      expandAllTacticsBtn.addEventListener("click", expandAllTactics);
    }
    if (collapseAllTacticsBtn) {
      collapseAllTacticsBtn.addEventListener("click", collapseAllTactics);
    }
    settingsToggleBtn.addEventListener("click", toggleSettingsPanel);
    if (textImportBtn) {
      textImportBtn.addEventListener("click", handleTextImport);
    }
    if (previewToggleBtn) {
      previewToggleBtn.addEventListener("click", togglePreviewWindow);
    }
    if (previewCloseBtn) {
      previewCloseBtn.addEventListener("click", () => {
        if (previewWindow) previewWindow.style.display = "none";
      });
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
