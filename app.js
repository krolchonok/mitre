

const tacticsContainer = document.getElementById("tactics-container");
const topScrollbar = document.getElementById("tactics-scrollbar");
const topScrollbarInner = document.getElementById("tactics-scrollbar-inner");
const tacticTemplate = document.getElementById("tactic-template");
const techniqueTemplate = document.getElementById("technique-template");
const subtechTemplate = document.getElementById("subtech-template");

const generateBtn = document.getElementById("generate-btn");
const generateFstecBtn = document.getElementById("generate-fstec-btn");
const selectAllBtn = document.getElementById("select-all-btn");
const clearBtn = document.getElementById("clear-btn");
const selectionCounter = document.getElementById("selection-counter");
const presetSelect = document.getElementById("preset-select");
const presetNameInput = document.getElementById("preset-name");
const savePresetBtn = document.getElementById("save-preset-btn");
const deletePresetBtn = document.getElementById("delete-preset-btn");
const importInput = document.getElementById("drawio-import");
const importBtn = document.getElementById("import-btn");
const importStatus = document.getElementById("import-status");
const greenFilterToggle = document.getElementById("green-filter-toggle");
const settingsToggleBtn = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const textImportTextarea = document.getElementById("text-import-textarea");
const textImportBtn = document.getElementById("text-import-btn");
const textImportClearToggle = document.getElementById("text-import-clear-toggle");
const textImportStatus = document.getElementById("text-import-status");
const previewToggleBtn = document.getElementById("preview-toggle-btn");
const previewWindow = document.getElementById("preview-window");
const previewCloseBtn = document.getElementById("preview-close-btn");
const previewModeMitre = document.getElementById("preview-mode-mitre");
const previewModeFstec = document.getElementById("preview-mode-fstec");

const DRAWIO_LAYOUT = {
  originX: 40,
  originY: 140,
  columnWidth: 230,
  maxColumnWidth: 420,
  columnGap: 30,
  headerHeight: 40,
  techniqueBaseHeight: 52,
  subTechniqueBaseHeight: 46,
  verticalGap: 18,
  subAccentWidth: 6,
};

const COLOR_CONFIG = {
  default: { step: "#AE4132", card: "#FAD9D5" },
  recon: { step: "#10739E", card: "#B1DDF0" },
};

const PRESETS_STORAGE_KEY = "mitre-drawio-presets";
const LAST_SELECTION_STORAGE_KEY = "mitre-drawio-last-selection";
const SETTINGS_STATE_STORAGE_KEY = "mitre-drawio-settings-open";
const TACTIC_STATE_STORAGE_KEY = "mitre-drawio-tactics";
const GREEN_FILTER_STORAGE_KEY = "mitre-drawio-green-filter";
const MITRE_LINK_BASE = "https://mitre.ptsecurity.com/ru-RU/";

const GREEN_TECHNIQUES_URL = "pt_nad_green_techniques.txt";
const GREEN_SUBTECHNIQUES_URL = "pt_nad_green_subtechniques.txt";

const SUB_ACCENT_COLOR = "#6C5E5C";
const GREEN_COLOR_CONFIG = {
  step: "#2D8A45",
  card: "#BFE8B8",
  subAccent: "#4FB86A",
};

const STYLES = {
  tactic:
    "shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=10;strokeColor=none;fontSize=17;fontColor=#FFFFFF;fontStyle=1;align=center;rounded=0;verticalAlign=middle;fontFamily=Helvetica;spacingTop=5;spacingBottom=5;spacingRight=5;spacingLeft=6;",
  technique:
    "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;align=left;verticalAlign=middle;fontFamily=Helvetica;fontSize=12;spacingTop=2;spacingBottom=2;spacingRight=2;spacingLeft=6;",
  subtech:
    "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;align=left;verticalAlign=middle;fontFamily=Helvetica;fontSize=10;spacingTop=2;spacingBottom=2;spacingRight=2;spacingLeft=6;",
};

const FSTEC_CATEGORY_TITLES = translationData?.categories ?? {};
const FSTEC_CATEGORY_ORDER = Object.keys(FSTEC_CATEGORY_TITLES);
const FSTEC_TECHNIQUES = Array.isArray(translationData?.techniques)
  ? translationData.techniques.map((entry, index) => ({
      id: entry.id || "",
      title: entry.title || "",
      fstec: Array.isArray(entry.fstec) ? entry.fstec : [],
      category: entry.id?.split(".")?.[0] ?? "",
      order: index,
    }))
  : [];
const MITRE_TO_FSTEC_MAP = buildFstecLookup(FSTEC_TECHNIQUES);

let tacticsData = [];
let isSyncingScroll = false;
let presets = {};
let greenTechniques = new Set();
let greenSubtechniques = new Set();

const codeIndexMap = {
  tactics: new Map(),
  techniques: new Map(),
  subtechniques: new Map(),
};
const tacticCollapseState = new Map();

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    tacticsContainer.innerHTML =
      '<div class="error">Не удалось загрузить данные MITRE.</div>';
  });

  tacticsContainer.addEventListener("change", (event) => {
    const target = event.target;
    if (!target.matches('input[type="checkbox"]')) return;

    const { type, tacticIndex, techIndex } = target.dataset;
    if (type === "subtechnique" && target.checked) {
      const parent = tacticsContainer.querySelector(
        `input[data-type="technique"][data-tactic-index="${tacticIndex}"][data-tech-index="${techIndex}"]`
      );
      if (parent && !parent.checked) {
        parent.checked = true;
      }
    } else if (type === "technique" && !target.checked) {
      tacticsContainer
        .querySelectorAll(
          `input[data-type="subtechnique"][data-tactic-index="${tacticIndex}"][data-tech-index="${techIndex}"]`
        )
        .forEach((sub) => {
          sub.checked = false;
        });
    }

    updateSelectionCounter();
  });

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
});

async function init() {
  loadPresetsFromStorage();
  loadTacticState();
  loadGreenFilterState();
  await loadGreenCodeLists();
  if (!window.mitreData) {
    throw new Error("Failed to load mitreData from mitre_ru.js");
  }
  tacticsData = window.mitreData.tactics || [];
  sortTacticsData(tacticsData);
  renderTactics(tacticsData);
  refreshPresetDropdown();
  applyInitialSelection();
  updateSelectionCounter();
  applySettingsPanelState();
}

function renderTactics(tactics) {
  tacticsContainer.innerHTML = "";
  tactics.forEach((tactic, tIndex) => {
    const fragment = tacticTemplate.content.cloneNode(true);
    const details = fragment.querySelector("details");
    const summary = fragment.querySelector("summary");
    const summaryTitle = summary.querySelector(".tactic-title");
    const toggleBtn = summary.querySelector(".tactic-toggle");
    summaryTitle.textContent = `${tactic.name} (${tactic.code})`;
    toggleBtn.dataset.tacticCode = tactic.code;
    details.dataset.tacticCode = tactic.code;

    const isCollapsed = tacticCollapseState.get(tactic.code) === true;
    details.classList.toggle("collapsed", isCollapsed);
    details.open = !isCollapsed;
    updateTacticToggleButton(toggleBtn, isCollapsed);

    const techniqueHolder = fragment.querySelector(".techniques");
    tactic.techniques
      .slice()
      .sort((a, b) => compareCodes(a.code, b.code))
      .forEach((technique, techIndex) => {
      const techNode = techniqueTemplate.content.cloneNode(true);
      const techniqueCard = techNode.querySelector(".technique");
      const label = techNode.querySelector(".technique-checkbox");
      const checkbox = techNode.querySelector('input[type="checkbox"]');
      const title = techNode.querySelector(".technique-title");
      const name = techNode.querySelector(".technique-name");
      const selectAllBtn = techNode.querySelector(".technique-select-all");
      const techLink = techNode.querySelector(".technique-link");

      title.textContent = technique.code;
      name.textContent = technique.name;
      if (techniqueCard) {
        techniqueCard.dataset.code = technique.code;
      }

      checkbox.dataset.type = "technique";
      checkbox.dataset.tacticIndex = String(tIndex);
      checkbox.dataset.techIndex = String(techIndex);

      if (technique.subtechniques && technique.subtechniques.length) {
        selectAllBtn?.classList.remove("hidden");
        selectAllBtn?.setAttribute("data-tactic-index", String(tIndex));
        selectAllBtn?.setAttribute("data-tech-index", String(techIndex));
      } else {
        selectAllBtn?.classList.add("hidden");
      }

      if (techLink) {
        techLink.href = `${MITRE_LINK_BASE}${technique.code}`;
        techLink.setAttribute(
          "aria-label",
          `Открыть описание ${technique.code} на сайте MITRE`
        );
        techLink.title = `Открыть ${technique.code} на mitre.ptsecurity.com`;
      }

      techniqueHolder.appendChild(techNode);

      if (technique.subtechniques && technique.subtechniques.length) {
        const subList = document.createElement("div");
        subList.className = "subtech-list";
        technique.subtechniques.forEach((sub, subIndex) => {
          const subNode = subtechTemplate.content.cloneNode(true);
          const subCard = subNode.querySelector(".subtechnique");
          const subCheckbox = subNode.querySelector('input[type="checkbox"]');
          const subTitle = subNode.querySelector(".subtech-title");
          const subName = subNode.querySelector(".subtech-name");
          const subLink = subNode.querySelector(".subtech-link");

          subTitle.textContent = sub.code;
          subName.textContent = sub.name;
          if (subCard) {
            subCard.dataset.code = sub.code;
          }

          subCheckbox.dataset.type = "subtechnique";
          subCheckbox.dataset.tacticIndex = String(tIndex);
          subCheckbox.dataset.techIndex = String(techIndex);
          subCheckbox.dataset.subIndex = String(subIndex);

          if (subLink) {
            subLink.href = `${MITRE_LINK_BASE}${sub.code}`;
            subLink.setAttribute(
              "aria-label",
              `Открыть описание ${sub.code} на сайте MITRE`
            );
            subLink.title = `Открыть ${sub.code} на mitre.ptsecurity.com`;
          }

          subList.appendChild(subNode);
        });

        techniqueHolder.appendChild(subList);
      }
    });

    tacticsContainer.appendChild(fragment);
  });

  buildCodeIndexMap();
  updateGreenHighlights();
  requestAnimationFrame(updateScrollbars);
}

function compareCodes(a = "", b = "") {
  if (a === b) return 0;
  const [aMain, aSub = ""] = a.split(".");
  const [bMain, bSub = ""] = b.split(".");
  const mainDiff = aMain.localeCompare(bMain, "en", { numeric: true });
  if (mainDiff !== 0) return mainDiff;
  return aSub.localeCompare(bSub, "en", { numeric: true });
}

function sortTacticsData(data) {
  data.forEach((tactic) => {
    tactic.techniques?.sort((a, b) => compareCodes(a.code, b.code));
    tactic.techniques?.forEach((technique) => {
      technique.subtechniques?.sort((a, b) => compareCodes(a.code, b.code));
    });
  });
}

function toggleAll(targetState) {
  setAllCheckboxes(targetState);
  updateSelectionCounter();
}

function setAllCheckboxes(state) {
  document
    .querySelectorAll('#tactics-container input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = state;
    });
}

function updateSelectionCounter() {
  const totalSelected = Array.from(
    document.querySelectorAll("#tactics-container input[type='checkbox']")
  ).filter((input) => input.checked).length;

  selectionCounter.textContent = `${totalSelected} элементов выбрано`;
  generateBtn.disabled = totalSelected === 0;
  if (generateFstecBtn) {
    generateFstecBtn.disabled = totalSelected === 0;
  }
  persistCurrentSelection();
  updatePreview();
}

function updateScrollbars() {
  const width = `${tacticsContainer.scrollWidth}px`;
  if (topScrollbarInner) {
    topScrollbarInner.style.width = width;
  }
  syncScrollbars(tacticsContainer, topScrollbar);
}

function syncScrollbars(source, target) {
  if (!target || isSyncingScroll) return;
  isSyncingScroll = true;
  target.scrollLeft = source.scrollLeft;
  isSyncingScroll = false;
}

function handleWheelScroll(event) {
  if (!tacticsContainer) return;
  if (
    !event.target.closest ||
    event.target.closest(".presets, .import-drawio")
  ) {
    return;
  }
  const preferHorizontal =
    Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.shiftKey;
  if (!preferHorizontal) {
    return;
  }
  event.preventDefault();
  const delta = event.deltaX || event.deltaY;
  tacticsContainer.scrollLeft += delta;
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
      ? "По выбранным техникам нет соответствий в базе ФСТЭК: " + missingCodes.join(', ')
      : "По выбранным техникам нет соответствий в базе ФСТЭК.";
    alert(message);
    return;
  }

  if (missingCodes.length) {
    alert("Следующие техники MITRE пропущены, так как нет соответствий ФСТЭК: " + missingCodes.join(', '));
  }

  const xml = buildDrawioXml(selection, { mode: 'fstec' });
  downloadFile(`fstec-${Date.now()}.drawio`, xml);
}

function collectSelection() {
  const tacticMap = new Map();

  const ensureTacticEntry = (tactic, order) => {
    let entry = tacticMap.get(tactic.code);
    if (!entry) {
      entry = {
        code: tactic.code,
        name: tactic.name,
        order,
        techniques: [],
        _techMap: new Map(),
      };
      tacticMap.set(tactic.code, entry);
    }
    return entry;
  };

  const ensureTechniqueEntry = (tacticEntry, technique, order) => {
    let techEntry = tacticEntry._techMap.get(technique.code);
    if (!techEntry) {
      techEntry = {
        code: technique.code,
        name: technique.name,
        order,
        subtechniques: [],
      };
      tacticEntry._techMap.set(technique.code, techEntry);
      tacticEntry.techniques.push(techEntry);
    }
    return techEntry;
  };

  document
    .querySelectorAll('input[data-type="technique"]:checked')
    .forEach((input) => {
      const tIndex = Number(input.dataset.tacticIndex);
      const techIndex = Number(input.dataset.techIndex);
      const tactic = tacticsData[tIndex];
      const technique = tactic?.techniques?.[techIndex];
      if (!tactic || !technique) return;

      const tacticEntry = ensureTacticEntry(tactic, tIndex);
      ensureTechniqueEntry(tacticEntry, technique, techIndex);
    });

  document
    .querySelectorAll('input[data-type="subtechnique"]:checked')
    .forEach((input) => {
      const tIndex = Number(input.dataset.tacticIndex);
      const techIndex = Number(input.dataset.techIndex);
      const subIndex = Number(input.dataset.subIndex);

      const tactic = tacticsData[tIndex];
      const technique = tactic?.techniques?.[techIndex];
      const subtech = technique?.subtechniques?.[subIndex];
      if (!tactic || !technique || !subtech) return;

      const tacticEntry = ensureTacticEntry(tactic, tIndex);
      const techniqueEntry = ensureTechniqueEntry(
        tacticEntry,
        technique,
        techIndex
      );

      if (
        !techniqueEntry.subtechniques.some(
          (existing) => existing.code === subtech.code
        )
      ) {
        techniqueEntry.subtechniques.push({
          code: subtech.code,
          name: subtech.name,
          order: subIndex,
        });
      }
    });

  const normalized = Array.from(tacticMap.values())
    .sort((a, b) => a.order - b.order)
    .map((tacticEntry) => {
    tacticEntry.techniques.sort((a, b) => compareCodes(a.code, b.code));
    tacticEntry.techniques.forEach((tech) =>
      tech.subtechniques.sort((a, b) => compareCodes(a.code, b.code))
      );
      return {
        code: tacticEntry.code,
        name: tacticEntry.name,
        techniques: tacticEntry.techniques.map((tech) => ({
          code: tech.code,
          name: tech.name,
          subtechniques: tech.subtechniques.map((sub) => ({
            code: sub.code,
            name: sub.name,
          })),
        })),
      };
    });

  return normalized;
}

function buildFstecSelectionFromSelection(mitreSelection) {
  const selectedCodes = collectSelectedMitreCodes(mitreSelection);
  const usedEntryIds = new Set();
  const missingCodes = new Set();

  selectedCodes.forEach((code) => {
    if (!code) {
      return;
    }
    // Строгое соответствие: ищем только в точном списке fstec у записей
    const exactMatches = MITRE_TO_FSTEC_MAP.get(code) || [];
    if (!exactMatches.length) {
      missingCodes.add(code);
      return;
    }
    exactMatches.forEach((entry) => {
      if (entry?.id) {
        usedEntryIds.add(entry.id);
      }
    });
  });

  const columns = FSTEC_CATEGORY_ORDER.map((category) => ({
    code: category,
    name: FSTEC_CATEGORY_TITLES[category] || category,
    techniques: [],
  }));
  const columnMap = new Map(columns.map((column) => [column.code, column]));

  FSTEC_TECHNIQUES.forEach((entry) => {
    if (!usedEntryIds.has(entry.id)) {
      return;
    }
    const column = columnMap.get(entry.category);
    if (!column) {
      return;
    }
    column.techniques.push({
      code: entry.id,
      name: entry.title || "",
      subtechniques: [],
    });
  });

  const selection = columns.filter((column) => column.techniques.length > 0);

  return {
    selection,
    missingCodes: Array.from(missingCodes).sort(),
  };
}

function collectSelectedMitreCodes(selection) {
  const codes = new Set();
  selection.forEach((tactic) => {
    tactic.techniques.forEach((technique) => {
      if (technique.code) {
        codes.add(normalizeMitreCode(technique.code));
      }
      (technique.subtechniques || []).forEach((sub) => {
        if (sub.code) {
          codes.add(normalizeMitreCode(sub.code));
        }
      });
    });
  });
  codes.delete("");
  return codes;
}

function findFstecEntriesForCode(code) {
  const normalized = normalizeMitreCode(code);
  if (!normalized) {
    return [];
  }
  const direct = MITRE_TO_FSTEC_MAP.get(normalized);
  return direct?.length ? direct : [];
}

function normalizeMitreCode(code) {
  return (code || "").trim().toUpperCase();
}

function buildFstecLookup(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    (entry.fstec || []).forEach((code) => {
      const normalized = normalizeMitreCode(code);
      if (!normalized) {
        return;
      }
      if (!map.has(normalized)) {
        map.set(normalized, []);
      }
      map.get(normalized).push(entry);
    });
  });
  return map;
}

function loadGreenFilterState() {
  const saved = loadSelectionFromStorage(GREEN_FILTER_STORAGE_KEY);
  if (greenFilterToggle) {
    greenFilterToggle.checked = saved === true;
  }
}

async function loadGreenCodeLists() {
  try {
    if (window.greenTechniquesRaw) {
      greenTechniques = parseMitreCodesFromText(window.greenTechniquesRaw);
    }
    if (window.greenSubtechniquesRaw) {
      greenSubtechniques = parseMitreCodesFromText(window.greenSubtechniquesRaw);
    }
  } catch (error) {
    console.warn("Не удалось загрузить списки зеленых техник", error);
  }
}

function parseMitreCodesFromText(text) {
  const codes = new Set();
  (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [code] = line.split(/\s+/);
      const normalized = normalizeMitreCode(code);
      if (normalized) {
        codes.add(normalized);
      }
    });
  return codes;
}

function buildDrawioXml(selection, options = {}) {
  const { mode = "mitre" } = options;
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

  const createCell = ({
    value,
    style,
    vertex = true,
    parent = "1",
    geometry,
  }) => {
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

  let currentX = layout.originX;
  selection.forEach((tactic, columnIndex) => {
    const columnWidth = isFstecMode
      ? normalizedColumnWidth
      : columnWidths[columnIndex] || layout.columnWidth;
    const isRecon = tactic.code === "TA0043";
    const colors = isRecon ? COLOR_CONFIG.recon : COLOR_CONFIG.default;
    const x = currentX;
    let currentY = layout.originY;
    const useGreen = greenFilterToggle?.checked === true;

    const tacticLabel = isFstecMode
      ? `<div style="line-height: 130%;"><font style="font-size: 14px;">${tactic.name}</font></div><div style="font-size: 12px;">${tactic.code}</div>`
      : `<div style="line-height: 100%;"><font style="font-size: 16px;">${tactic.name} ${tactic.code}</font></div>`;
    const headerHeight = isFstecMode ? sharedHeaderHeight : layout.headerHeight;

    createCell({
      value: tacticLabel,
      style: `${STYLES.tactic}fillColor=${colors.step};`,
      geometry: {
        x: String(x),
        y: String(currentY),
        width: String(columnWidth),
        height: String(headerHeight),
      },
    });

    currentY += headerHeight + layout.verticalGap;

    tactic.techniques
      .slice()
      .sort((a, b) => compareCodes(a.code, b.code))
      .forEach((technique) => {
      const techHeight = computeCardHeight(
        technique.name,
        layout.techniqueBaseHeight,
        columnWidth,
        { compact: isFstecMode }
      );
      const techniqueValue = isFstecMode
        ? [
            technique.code
              ? `<div style="font-size: 13px;"><b>${technique.code}</b></div>`
              : "",
            `<div style="font-size: 12px;">${technique.name}</div>`,
          ].join("")
        : `<span style="font-size: 14px;"><b>${technique.code}</b></span><div style="font-size: 12px;">${technique.name}</div>`;

      const techniqueIsGreen =
        useGreen && technique.code && greenTechniques.has(normalizeMitreCode(technique.code));
      const techniqueFill = techniqueIsGreen ? GREEN_COLOR_CONFIG.card : colors.card;

      createCell({
        value: techniqueValue,
        style: `${STYLES.technique}fillColor=${techniqueFill};`,
        geometry: {
          x: String(x),
          y: String(currentY),
          width: String(columnWidth),
          height: String(techHeight),
        },
      });

      currentY += techHeight;

      technique.subtechniques
        .slice()
        .sort((a, b) => compareCodes(a.code, b.code))
        .forEach((sub) => {
        const subIsGreen =
          useGreen && sub.code && greenSubtechniques.has(normalizeMitreCode(sub.code));
        const subFill = subIsGreen ? GREEN_COLOR_CONFIG.card : colors.card;
        const subAccent = subIsGreen ? GREEN_COLOR_CONFIG.subAccent : SUB_ACCENT_COLOR;
        const subHeight = computeCardHeight(
          sub.name,
          layout.subTechniqueBaseHeight,
          columnWidth - layout.subAccentWidth,
          { compact: isFstecMode }
        );
        const subValue = `<span style="font-size: 12px;"><b>${sub.code}</b></span><div style="font-size: 10px;">${sub.name}</div>`;

        createCell({
          value: subValue,
          style: `${STYLES.subtech}fillColor=${subFill};`,
          geometry: {
            x: String(x + layout.subAccentWidth),
            y: String(currentY),
            width: String(columnWidth - layout.subAccentWidth),
            height: String(subHeight),
          },
        });

        createCell({
          value: "",
          style:
            "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;fillColor=" +
            subAccent +
            ";",
          geometry: {
            x: String(x),
            y: String(currentY),
            width: String(layout.subAccentWidth),
            height: String(subHeight),
          },
        });

        currentY += subHeight;
      });

      currentY += layout.verticalGap;
    });

    currentX += columnWidth + layout.columnGap;
  });

  return new XMLSerializer().serializeToString(doc);
}

function computeCardHeight(text, baseHeight, columnWidth, options = {}) {
  const { compact = false } = options;
  const safeText = text || "";
  const charsPerLine = estimateCharsPerLine(
    columnWidth,
    12,
    compact ? 12 : 20
  );
  const lines = Math.max(1, Math.ceil(safeText.length / charsPerLine));
  const lineStep = compact ? 10 : 14;
  const adjustedBase = compact ? Math.max(baseHeight - 10, 28) : baseHeight;
  return adjustedBase + Math.max(0, lines - 1) * lineStep;
}

function computeFstecColumnWidths(selection, layout) {
  const minWidth = layout.columnWidth;
  const maxWidth = layout.maxColumnWidth || layout.columnWidth;

  const widths = selection.map((tactic) => {
    const widths = [];
    widths.push(estimateTextWidth(tactic.name || "", 14));
    widths.push(estimateTextWidth(tactic.code || "", 12));

    (tactic.techniques || []).forEach((technique) => {
      widths.push(estimateTextWidth(technique.name || "", 12));
      widths.push(estimateTextWidth(technique.code || "", 13, "bold"));
    });

    const widest = widths.length ? Math.max(...widths) : minWidth;
    const withPadding = widest + 24;
    return Math.min(Math.max(withPadding, minWidth), maxWidth);
  });

  const targetWidth = Math.max(...widths);
  return selection.map(() => targetWidth);
}

function computeFstecHeaderHeight(tacticName, columnWidth, layout) {
  const baseHeight = layout.headerHeight;
  const charsPerLine = estimateCharsPerLine(columnWidth, 14, 32);
  const lines = Math.max(1, Math.ceil((tacticName || "").length / charsPerLine));
  const lineHeight = Math.round(14 * 1.3);
  const codeLineHeight = 16;
  const padding = 18;
  const neededHeight = lines * lineHeight + codeLineHeight + padding;
  return Math.max(baseHeight, neededHeight);
}

function computeMaxFstecHeaderHeight(selection, columnWidth, layout) {
  return selection.reduce((maxHeight, tactic) => {
    const h = computeFstecHeaderHeight(tactic.name, columnWidth, layout);
    return Math.max(maxHeight, h);
  }, layout.headerHeight);
}

function getMeasureContext() {
  if (!getMeasureContext.ctx) {
    const canvas = document.createElement("canvas");
    getMeasureContext.ctx = canvas.getContext("2d");
  }
  return getMeasureContext.ctx;
}

function estimateTextWidth(text, fontSize = 14, fontWeight = "normal") {
  const ctx = getMeasureContext();
  if (!ctx) {
    return (text || "").length * fontSize * 0.55;
  }
  ctx.font = `${fontWeight} ${fontSize}px Helvetica, Arial, sans-serif`;
  const metrics = ctx.measureText(text || "");
  return metrics.width || (text || "").length * fontSize * 0.55;
}

function estimateCharsPerLine(columnWidth, fontSize = 12, padding = 16) {
  const ctx = getMeasureContext();
  if (!ctx || !columnWidth) {
    return 32;
  }

  ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
  const sample = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const metrics = ctx.measureText(sample);
  const avgCharWidth =
    metrics.width && sample.length ? metrics.width / sample.length : 6.8;

  const usableWidth = Math.max(columnWidth - padding, 60);
  const chars = Math.max(12, Math.floor(usableWidth / avgCharWidth));
  return Number.isFinite(chars) && chars > 0 ? chars : 32;
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCodeIndexMap() {
  codeIndexMap.tactics.clear();
  codeIndexMap.techniques.clear();
  codeIndexMap.subtechniques.clear();

  tacticsData.forEach((tactic, tIndex) => {
    codeIndexMap.tactics.set(tactic.code, tIndex);
    tactic.techniques
      .slice()
      .sort((a, b) => compareCodes(a.code, b.code))
      .forEach((technique, techIndex) => {
        codeIndexMap.techniques.set(`${tactic.code}|${technique.code}`, {
          tacticIndex: tIndex,
          techIndex,
        });

        technique.subtechniques
          .slice()
          .sort((a, b) => compareCodes(a.code, b.code))
          .forEach((sub, subIndex) => {
            codeIndexMap.subtechniques.set(
              `${tactic.code}|${technique.code}|${sub.code}`,
              {
                tacticIndex: tIndex,
                techIndex,
                subIndex,
              }
            );
          });
      });
  });
}

function persistCurrentSelection() {
  if (!tacticsData.length) return;
  try {
    const selection = collectSelection();
    localStorage.setItem(
      LAST_SELECTION_STORAGE_KEY,
      JSON.stringify(selection)
    );
  } catch (error) {
    console.warn("Не удалось сохранить текущее состояние", error);
  }
}

function applySelection(selection) {
  if (!Array.isArray(selection)) {
    setAllCheckboxes(false);
    updateSelectionCounter();
    return;
  }

  setAllCheckboxes(false);

  selection.forEach((tactic) => {
    tactic.techniques?.forEach((technique) => {
      const mapping = codeIndexMap.techniques.get(
        `${tactic.code}|${technique.code}`
      );
      if (!mapping) return;

      const techniqueCheckbox = tacticsContainer.querySelector(
        `input[data-type="technique"][data-tactic-index="${mapping.tacticIndex}"][data-tech-index="${mapping.techIndex}"]`
      );
      if (!techniqueCheckbox) return;
      techniqueCheckbox.checked = true;

      technique.subtechniques?.forEach((sub) => {
        const subMapping = codeIndexMap.subtechniques.get(
          `${tactic.code}|${technique.code}|${sub.code}`
        );
        if (!subMapping) return;
        const subCheckbox = tacticsContainer.querySelector(
          `input[data-type="subtechnique"][data-tactic-index="${subMapping.tacticIndex}"][data-tech-index="${subMapping.techIndex}"][data-sub-index="${subMapping.subIndex}"]`
        );
        if (subCheckbox) {
          subCheckbox.checked = true;
        }
      });
    });
  });

  updateSelectionCounter();
  updateGreenHighlights();
}

function updateGreenHighlights() {
  const enabled = greenFilterToggle?.checked === true;

  document.querySelectorAll(".technique").forEach((node) => {
    const code = normalizeMitreCode(node.dataset.code);
    const shouldMark = enabled && code && greenTechniques.has(code);
    node.classList.toggle("green-mark", shouldMark);
  });

  document.querySelectorAll(".subtechnique").forEach((node) => {
    const code = normalizeMitreCode(node.dataset.code);
    const shouldMark = enabled && code && greenSubtechniques.has(code);
    node.classList.toggle("green-mark", shouldMark);
  });
}

function loadSelectionFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Не удалось прочитать сохранённые данные", error);
    return null;
  }
}

function applyInitialSelection() {
  const saved = loadSelectionFromStorage(LAST_SELECTION_STORAGE_KEY);
  if (saved && saved.length) {
    applySelection(saved);
  }
}

function applySettingsPanelState() {
  const saved = loadSelectionFromStorage(SETTINGS_STATE_STORAGE_KEY);
  const isOpen = saved === true;
  if (!settingsPanel || !settingsToggleBtn) return;
  settingsPanel.classList.toggle("hidden", !isOpen);
  settingsToggleBtn.textContent = isOpen
    ? "Скрыть проекты"
    : "Проекты и импорт";
}

function loadPresetsFromStorage() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    presets = raw ? JSON.parse(raw) || {} : {};
  } catch (error) {
    console.warn("Не удалось загрузить проекты", error);
    presets = {};
  }
}

function savePresetsToStorage() {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.warn("Не удалось сохранить проекты", error);
  }
}

function loadTacticState() {
  const saved = loadSelectionFromStorage(TACTIC_STATE_STORAGE_KEY);
  if (saved && typeof saved === "object") {
    Object.entries(saved).forEach(([code, value]) => {
      if (value) {
        tacticCollapseState.set(code, true);
      }
    });
  }
}

function persistTacticState() {
  try {
    const payload = {};
    tacticCollapseState.forEach((value, code) => {
      if (value) payload[code] = true;
    });
    localStorage.setItem(TACTIC_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Не удалось сохранить состояние тактик", error);
  }
}

function refreshPresetDropdown(selectedName = "") {
  if (!presetSelect) return;
  const currentValue = selectedName || presetSelect.value;

  const options =
    '<option value="">— не выбрано —</option>' +
    Object.keys(presets)
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
  presetSelect.innerHTML = options;

  if (currentValue && presets[currentValue]) {
    presetSelect.value = currentValue;
    presetNameInput.value = currentValue;
  } else {
    presetSelect.value = "";
  }

  deletePresetBtn.disabled = !presetSelect.value;
}

function handleSavePreset() {
  const name = (presetNameInput.value || presetSelect.value || "").trim();
  if (!name) {
    alert("Введите название проекта.");
    return;
  }

  const selection = collectSelection();
  if (!selection.length) {
    alert("Выберите техники перед сохранением проекта.");
    return;
  }

  presets[name] = selection;
  savePresetsToStorage();
  refreshPresetDropdown(name);
  presetNameInput.value = "";
}

function handlePresetSelect() {
  const name = presetSelect.value;
  deletePresetBtn.disabled = !name;
  if (!name) {
    setAllCheckboxes(false);
    updateSelectionCounter();
    presetNameInput.value = "";
    return;
  }

  const preset = presets[name];
  if (preset) {
    presetNameInput.value = name;
    applySelection(preset);
  }
}

function handleDeletePreset() {
  const name = presetSelect.value;
  if (!name || !presets[name]) return;

  if (!confirm(`Удалить проект "${name}"?`)) {
    return;
  }

  delete presets[name];
  savePresetsToStorage();
  refreshPresetDropdown();
}

function toggleSettingsPanel() {
  if (!settingsPanel) return;
  const hidden = settingsPanel.classList.toggle("hidden");
  const isOpen = !hidden;
  settingsToggleBtn.textContent = isOpen
    ? "Скрыть проекты"
    : "Проекты и импорт";
  localStorage.setItem(SETTINGS_STATE_STORAGE_KEY, JSON.stringify(isOpen));
}

function handleGreenFilterToggle() {
  if (!greenFilterToggle) return;
  const enabled = greenFilterToggle.checked;
  localStorage.setItem(GREEN_FILTER_STORAGE_KEY, JSON.stringify(enabled));
  updateGreenHighlights();
}

function handleImportInputChange() {
  if (!importBtn) return;
  importBtn.disabled = !(importInput.files && importInput.files.length);
  setImportStatus("");
}

async function handleImportDrawio() {
  const file = importInput.files?.[0];
  if (!file) {
    setImportStatus("Выберите файл для импорта.", true);
    return;
  }

  importBtn.disabled = true;
  setImportStatus(`Импортируем "${file.name}"...`);

  try {
    const text = await file.text();
    const selection = parseSelectionFromDrawio(text);
    if (!selection.length) {
      throw new Error("Не удалось найти техники в файле.");
    }
    applySelection(selection);
    const name = file.name.replace(/\.drawio$/i, "");
    presetNameInput.value = name;
    setImportStatus("Импорт успешно завершён.");
  } catch (error) {
    console.error(error);
    setImportStatus(
      `Ошибка импорта: ${error.message || "неизвестная ошибка"}`,
      true
    );
  } finally {
    importBtn.disabled = false;
  }
}

function handleTechniqueSelectAll(event) {
  const button = event.target.closest(".technique-select-all");
  if (!button) return;

  const tacticIndex = Number(button.dataset.tacticIndex);
  const techIndex = Number(button.dataset.techIndex);
  if (Number.isNaN(tacticIndex) || Number.isNaN(techIndex)) return;

  const techniqueCheckbox = tacticsContainer.querySelector(
    `input[data-type="technique"][data-tactic-index="${tacticIndex}"][data-tech-index="${techIndex}"]`
  );
  if (!techniqueCheckbox) return;

  const shouldCheck = !techniqueCheckbox.checked;
  techniqueCheckbox.checked = shouldCheck;

  tacticsContainer
    .querySelectorAll(
      `input[data-type="subtechnique"][data-tactic-index="${tacticIndex}"][data-tech-index="${techIndex}"]`
    )
    .forEach((input) => {
      input.checked = shouldCheck;
    });

  updateSelectionCounter();
}

function handleTacticToggle(event) {
  const button = event.target.closest(".tactic-toggle");
  if (!button) return;
  event.preventDefault();
  const tacticCard = button.closest(".tactic");
  if (!tacticCard) return;
  const code = button.dataset.tacticCode;
  const collapsed = !tacticCard.classList.contains("collapsed");
  tacticCard.classList.toggle("collapsed", collapsed);
  tacticCard.open = !collapsed;
  if (collapsed) {
    tacticCollapseState.set(code, true);
  } else {
    tacticCollapseState.delete(code);
  }
  updateTacticToggleButton(button, collapsed);
  persistTacticState();
}

function updateTacticToggleButton(button, collapsed) {
  if (!button) return;
  button.textContent = collapsed ? "▣" : "▢";
  button.setAttribute(
    "aria-label",
    collapsed ? "Показать тактику" : "Скрыть тактику"
  );
  button.setAttribute(
    "title",
    collapsed ? "Показать тактику" : "Скрыть тактику"
  );
}

function parseSelectionFromDrawio(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Файл содержит некорректный XML.");
  }

  const cells = Array.from(doc.getElementsByTagName("mxCell"));
  const techniqueCodes = new Set();
  const subTechniqueCodes = new Set();

  cells.forEach((cell) => {
    const value = cell.getAttribute("value");
    if (!value) return;
    const style = cell.getAttribute("style") || "";
    if (style.includes("shape=step")) {
      return;
    }
    const codeMatch = value.match(/T\d{4}(?:\.\d{3})?/);
    if (!codeMatch) return;
    const code = codeMatch[0];
    if (code.includes(".")) {
      subTechniqueCodes.add(code);
    } else {
      techniqueCodes.add(code);
    }
  });

  const selection = [];
  tacticsData.forEach((tactic) => {
    const selectedTechniques = [];
    tactic.techniques
      .slice()
      .sort((a, b) => compareCodes(a.code, b.code))
      .forEach((technique) => {
        const selectedSubs = technique.subtechniques
          .slice()
          .sort((a, b) => compareCodes(a.code, b.code))
          .filter((sub) => subTechniqueCodes.has(sub.code))
          .map((sub) => ({ code: sub.code, name: sub.name }));

        if (techniqueCodes.has(technique.code) || selectedSubs.length) {
          selectedTechniques.push({
            code: technique.code,
            name: technique.name,
            subtechniques: selectedSubs,
          });
        }
      });

    if (selectedTechniques.length) {
      selection.push({
        code: tactic.code,
        name: tactic.name,
        techniques: selectedTechniques,
      });
    }
  });

  return selection;
}

function setImportStatus(message, isError = false) {
  if (!importStatus) return;
  importStatus.textContent = message;
  importStatus.classList.toggle("error", Boolean(isError));
}


function handleTextImport() {
  if (!textImportTextarea) return;
  const text = textImportTextarea.value || "";
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  if (!lines.length) {
    setTextImportStatus("Введите хотя бы одну технику для импорта.", true);
    return;
  }

  if (textImportClearToggle && textImportClearToggle.checked) {
    setAllCheckboxes(false);
  }

  let selectedCount = 0;
  const notFoundCodes = [];
  const parsedCodes = [];

  lines.forEach(line => {
    const match = line.match(/T\d{4}(?:\.\d{3})?/i);
    if (match) {
      parsedCodes.push(match[0].toUpperCase());
    }
  });

  if (!parsedCodes.length) {
    setTextImportStatus("Не найдено корректных ID техник (например, T1003 или T1027.001).", true);
    return;
  }

  const uniqueCodes = Array.from(new Set(parsedCodes));

  uniqueCodes.forEach(code => {
    const targets = tacticsContainer.querySelectorAll(
      `.technique[data-code="${code}"], .subtechnique[data-code="${code}"]`
    );

    if (targets.length > 0) {
      targets.forEach(target => {
        const checkbox = target.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = true;

          const subCard = checkbox.closest(".subtechnique");
          if (subCard) {
            const subtechList = subCard.closest(".subtech-list");
            if (subtechList) {
              const parentTechCard = subtechList.previousElementSibling;
              if (parentTechCard && parentTechCard.classList.contains("technique")) {
                const parentCheckbox = parentTechCard.querySelector('input[type="checkbox"]');
                if (parentCheckbox) {
                  parentCheckbox.checked = true;
                }
              }
            }
          }
        }
      });
      selectedCount++;
    } else {
      notFoundCodes.push(code);
    }
  });

  updateSelectionCounter();
  updateGreenHighlights();

  let statusMsg = `Выбрано техник/субтехник: ${selectedCount} из ${uniqueCodes.length}.`;
  if (notFoundCodes.length > 0) {
    statusMsg += ` Пропущено (не найдено в матрице): ${notFoundCodes.join(", ")}`;
  }
  
  setTextImportStatus(statusMsg, notFoundCodes.length > 0);
  
  if (selectedCount > 0) {
    textImportTextarea.value = "";
  }
}

function setTextImportStatus(message, isWarningOrError = false) {
  if (!textImportStatus) return;
  textImportStatus.textContent = message;
  textImportStatus.classList.toggle("error", isWarningOrError);
}
