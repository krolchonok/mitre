(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { presetSelect, presetNameInput, deletePresetBtn } = Mitre.dom;
  const { state } = Mitre;
  const { savePresetsToStorage } = Mitre.storage;
  const { collectSelection, setAllCheckboxes, applySelection, updateSelectionCounter } =
    Mitre.selection;

  function refreshPresetDropdown(selectedName = "") {
    if (!presetSelect) return;
    const currentValue = selectedName || presetSelect.value;

    const options =
      '<option value="">— не выбрано —</option>' +
      Object.keys(state.presets)
        .sort((a, b) => a.localeCompare(b, "ru"))
        .map((name) => `<option value="${name}">${name}</option>`)
        .join("");
    presetSelect.innerHTML = options;

    if (currentValue && state.presets[currentValue]) {
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

    state.presets[name] = selection;
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

    const preset = state.presets[name];
    if (preset) {
      presetNameInput.value = name;
      applySelection(preset);
    }
  }

  function handleDeletePreset() {
    const name = presetSelect.value;
    if (!name || !state.presets[name]) return;

    if (!confirm(`Удалить проект "${name}"?`)) {
      return;
    }

    delete state.presets[name];
    savePresetsToStorage();
    refreshPresetDropdown();
  }

  Mitre.presets = {
    refreshPresetDropdown,
    handleSavePreset,
    handlePresetSelect,
    handleDeletePreset,
  };
})();
