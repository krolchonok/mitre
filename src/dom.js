(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});

  Mitre.dom = {
    tacticsContainer: document.getElementById("tactics-container"),
    topScrollbar: document.getElementById("tactics-scrollbar"),
    topScrollbarInner: document.getElementById("tactics-scrollbar-inner"),
    tacticTemplate: document.getElementById("tactic-template"),
    techniqueTemplate: document.getElementById("technique-template"),
    subtechTemplate: document.getElementById("subtech-template"),

    generateBtn: document.getElementById("generate-btn"),
    generateFstecBtn: document.getElementById("generate-fstec-btn"),
    selectAllBtn: document.getElementById("select-all-btn"),
    clearBtn: document.getElementById("clear-btn"),
    selectionCounter: document.getElementById("selection-counter"),
    presetSelect: document.getElementById("preset-select"),
    presetNameInput: document.getElementById("preset-name"),
    savePresetBtn: document.getElementById("save-preset-btn"),
    deletePresetBtn: document.getElementById("delete-preset-btn"),
    importInput: document.getElementById("drawio-import"),
    importBtn: document.getElementById("import-btn"),
    importStatus: document.getElementById("import-status"),
    greenFilterToggle: document.getElementById("green-filter-toggle"),
    settingsToggleBtn: document.getElementById("settings-toggle"),
    settingsPanel: document.getElementById("settings-panel"),
    textImportTextarea: document.getElementById("text-import-textarea"),
    textImportBtn: document.getElementById("text-import-btn"),
    textImportClearToggle: document.getElementById("text-import-clear-toggle"),
    textImportStatus: document.getElementById("text-import-status"),
    previewToggleBtn: document.getElementById("preview-toggle-btn"),
    previewWindow: document.getElementById("preview-window"),
    previewCloseBtn: document.getElementById("preview-close-btn"),
    previewModeMitre: document.getElementById("preview-mode-mitre"),
    previewModeFstec: document.getElementById("preview-mode-fstec"),
    previewWorkspace: document.getElementById("preview-workspace"),
    tacticsTabbar: document.getElementById("tactics-tabbar"),
    expandAllTacticsBtn: document.getElementById("expand-all-tactics-btn"),
    collapseAllTacticsBtn: document.getElementById("collapse-all-tactics-btn"),
  };
})();
