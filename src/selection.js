(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { tacticsContainer, selectionCounter, generateBtn, generateFstecBtn } =
    Mitre.dom;
  const { state } = Mitre;
  const { compareCodes } = Mitre.utils;
  const { saveLastSelection, loadLastSelection } = Mitre.storage;
  const { updateGreenHighlights } = Mitre.render;

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
        const tactic = state.tacticsData[tIndex];
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

        const tactic = state.tacticsData[tIndex];
        const technique = tactic?.techniques?.[techIndex];
        const subtech = technique?.subtechniques?.[subIndex];
        if (!tactic || !technique || !subtech) return;

        const tacticEntry = ensureTacticEntry(tactic, tIndex);
        const techniqueEntry = ensureTechniqueEntry(tacticEntry, technique, techIndex);

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

    return Array.from(tacticMap.values())
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
  }

  function setAllCheckboxes(checked) {
    document
      .querySelectorAll('#tactics-container input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = checked;
      });
  }

  function toggleAll(targetState) {
    setAllCheckboxes(targetState);
    updateSelectionCounter();
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
    state.emitSelectionChanged();
  }

  function persistCurrentSelection() {
    if (!state.tacticsData.length) return;
    saveLastSelection(collectSelection());
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
        const mapping = state.codeIndexMap.techniques.get(
          `${tactic.code}|${technique.code}`
        );
        if (!mapping) return;

        const techniqueCheckbox = tacticsContainer.querySelector(
          `input[data-type="technique"][data-tactic-index="${mapping.tacticIndex}"][data-tech-index="${mapping.techIndex}"]`
        );
        if (!techniqueCheckbox) return;
        techniqueCheckbox.checked = true;

        technique.subtechniques?.forEach((sub) => {
          const subMapping = state.codeIndexMap.subtechniques.get(
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

  function applyInitialSelection() {
    const saved = loadLastSelection();
    if (saved && saved.length) {
      applySelection(saved);
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

  function handleSelectionCheckboxChange(event) {
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
  }

  Mitre.selection = {
    collectSelection,
    setAllCheckboxes,
    toggleAll,
    updateSelectionCounter,
    persistCurrentSelection,
    applySelection,
    applyInitialSelection,
    handleTechniqueSelectAll,
    handleSelectionCheckboxChange,
  };
})();
