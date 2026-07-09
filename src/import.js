(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const {
    importInput,
    importBtn,
    importStatus,
    presetNameInput,
    tacticsContainer,
    textImportTextarea,
    textImportClearToggle,
    textImportStatus,
  } = Mitre.dom;
  const { state } = Mitre;
  const { compareCodes } = Mitre.utils;
  const { applySelection, setAllCheckboxes, updateSelectionCounter } =
    Mitre.selection;
  const { updateGreenHighlights } = Mitre.render;

  function setImportStatus(message, isError = false) {
    if (!importStatus) return;
    importStatus.textContent = message;
    importStatus.classList.toggle("error", Boolean(isError));
  }

  function setTextImportStatus(message, isWarningOrError = false) {
    if (!textImportStatus) return;
    textImportStatus.textContent = message;
    textImportStatus.classList.toggle("error", isWarningOrError);
  }

  function handleImportInputChange() {
    if (!importBtn) return;
    importBtn.disabled = !(importInput.files && importInput.files.length);
    setImportStatus("");
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
    state.tacticsData.forEach((tactic) => {
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

  function handleTextImport() {
    if (!textImportTextarea) return;
    const text = textImportTextarea.value || "";
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    if (!lines.length) {
      setTextImportStatus("Введите хотя бы одну технику для импорта.", true);
      return;
    }

    if (textImportClearToggle && textImportClearToggle.checked) {
      setAllCheckboxes(false);
    }

    const parsedCodes = [];
    lines.forEach((line) => {
      const match = line.match(/T\d{4}(?:\.\d{3})?/i);
      if (match) {
        parsedCodes.push(match[0].toUpperCase());
      }
    });

    if (!parsedCodes.length) {
      setTextImportStatus(
        "Не найдено корректных ID техник (например, T1003 или T1027.001).",
        true
      );
      return;
    }

    const uniqueCodes = Array.from(new Set(parsedCodes));
    let selectedCount = 0;
    const notFoundCodes = [];

    uniqueCodes.forEach((code) => {
      const targets = tacticsContainer.querySelectorAll(
        `.technique[data-code="${code}"], .subtechnique[data-code="${code}"]`
      );

      if (targets.length > 0) {
        targets.forEach((target) => {
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

  Mitre.import = { handleImportInputChange, handleImportDrawio, handleTextImport };
})();
