(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const {
    tacticsContainer,
    topScrollbar,
    topScrollbarInner,
    tacticTemplate,
    techniqueTemplate,
    subtechTemplate,
    greenFilterToggle,
    tacticsTabbar,
  } = Mitre.dom;
  const { MITRE_LINK_BASE } = Mitre.config;
  const { state } = Mitre;
  const { compareCodes, normalizeMitreCode } = Mitre.utils;
  const { persistTacticState } = Mitre.storage;

  function sortTacticsData(data) {
    data.forEach((tactic) => {
      tactic.techniques?.sort((a, b) => compareCodes(a.code, b.code));
      tactic.techniques?.forEach((technique) => {
        technique.subtechniques?.sort((a, b) => compareCodes(a.code, b.code));
      });
    });
  }

  function renderTactics(tactics) {
    tacticsContainer.innerHTML = "";
    tactics.forEach((tactic, tIndex) => {
      const fragment = tacticTemplate.content.cloneNode(true);
      const tacticEl = fragment.querySelector(".tactic");
      const summary = fragment.querySelector(".tactic-summary");
      const summaryTitle = summary.querySelector(".tactic-title");
      const toggleBtn = summary.querySelector(".tactic-toggle");
      summaryTitle.textContent = `${tactic.name} (${tactic.code})`;
      toggleBtn.dataset.tacticCode = tactic.code;
      tacticEl.dataset.tacticCode = tactic.code;

      const isCollapsed = state.tacticCollapseState.get(tactic.code) === true;
      tacticEl.classList.toggle("collapsed", isCollapsed);
      updateTacticToggleButton(toggleBtn, isCollapsed);

      const techniqueHolder = fragment.querySelector(".techniques");
      tactic.techniques
        .slice()
        .sort((a, b) => compareCodes(a.code, b.code))
        .forEach((technique, techIndex) => {
          const techNode = techniqueTemplate.content.cloneNode(true);
          const techniqueCard = techNode.querySelector(".technique");
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
    renderTacticsTabbar(tactics);
    requestAnimationFrame(updateScrollbars);
  }

  function buildCodeIndexMap() {
    state.codeIndexMap.tactics.clear();
    state.codeIndexMap.techniques.clear();
    state.codeIndexMap.subtechniques.clear();

    state.tacticsData.forEach((tactic, tIndex) => {
      state.codeIndexMap.tactics.set(tactic.code, tIndex);
      tactic.techniques
        .slice()
        .sort((a, b) => compareCodes(a.code, b.code))
        .forEach((technique, techIndex) => {
          state.codeIndexMap.techniques.set(`${tactic.code}|${technique.code}`, {
            tacticIndex: tIndex,
            techIndex,
          });

          technique.subtechniques
            .slice()
            .sort((a, b) => compareCodes(a.code, b.code))
            .forEach((sub, subIndex) => {
              state.codeIndexMap.subtechniques.set(
                `${tactic.code}|${technique.code}|${sub.code}`,
                { tacticIndex: tIndex, techIndex, subIndex }
              );
            });
        });
    });
  }

  function updateGreenHighlights() {
    const enabled = greenFilterToggle?.checked === true;

    document.querySelectorAll(".technique").forEach((node) => {
      const code = normalizeMitreCode(node.dataset.code);
      const shouldMark = enabled && code && state.greenTechniques.has(code);
      node.classList.toggle("green-mark", shouldMark);
    });

    document.querySelectorAll(".subtechnique").forEach((node) => {
      const code = normalizeMitreCode(node.dataset.code);
      const shouldMark = enabled && code && state.greenSubtechniques.has(code);
      node.classList.toggle("green-mark", shouldMark);
    });
  }

  function updateScrollbars() {
    const width = `${tacticsContainer.scrollWidth}px`;
    if (topScrollbarInner) {
      topScrollbarInner.style.width = width;
    }
    syncScrollbars(tacticsContainer, topScrollbar);
  }

  function syncScrollbars(source, target) {
    if (!target || state.isSyncingScroll) return;
    state.setSyncingScroll(true);
    target.scrollLeft = source.scrollLeft;
    state.setSyncingScroll(false);
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

  function setTacticCollapsed(tacticCard, collapsed) {
    const code = tacticCard.dataset.tacticCode;
    const toggleBtn = tacticCard.querySelector(".tactic-toggle");
    tacticCard.classList.toggle("collapsed", collapsed);
    if (collapsed) {
      state.tacticCollapseState.set(code, true);
    } else {
      state.tacticCollapseState.delete(code);
    }
    updateTacticToggleButton(toggleBtn, collapsed);
  }

  function handleTacticToggle(event) {
    const button = event.target.closest(".tactic-toggle");
    if (!button) return;
    event.preventDefault();
    const tacticCard = button.closest(".tactic");
    if (!tacticCard) return;
    setTacticCollapsed(tacticCard, !tacticCard.classList.contains("collapsed"));
    persistTacticState();
    updateTacticsTabbarState();
  }

  function collapseAllTactics() {
    tacticsContainer
      .querySelectorAll(".tactic")
      .forEach((tacticCard) => setTacticCollapsed(tacticCard, true));
    persistTacticState();
    updateTacticsTabbarState();
    requestAnimationFrame(updateScrollbars);
  }

  function expandAllTactics() {
    tacticsContainer
      .querySelectorAll(".tactic")
      .forEach((tacticCard) => setTacticCollapsed(tacticCard, false));
    persistTacticState();
    updateTacticsTabbarState();
    requestAnimationFrame(updateScrollbars);
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

  // Quick-jump tab strip: with 14 tactic columns laid out side by side,
  // hunting for one via horizontal scroll is the main usability complaint.
  // These buttons mirror the tactic list and jump/expand on click.
  function renderTacticsTabbar(tactics) {
    if (!tacticsTabbar) return;
    tacticsTabbar.innerHTML = "";
    tactics.forEach((tactic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tactics-tab";
      btn.dataset.tacticCode = tactic.code;
      btn.textContent = tactic.name;
      btn.title = `${tactic.name} (${tactic.code})`;
      tacticsTabbar.appendChild(btn);
    });
    updateTacticsTabbarState();
  }

  function updateTacticsTabbarState() {
    if (!tacticsTabbar) return;
    tacticsTabbar.querySelectorAll(".tactics-tab").forEach((btn) => {
      const collapsed =
        state.tacticCollapseState.get(btn.dataset.tacticCode) === true;
      btn.classList.toggle("is-collapsed", collapsed);
    });
  }

  function handleTacticsTabbarClick(event) {
    const btn = event.target.closest(".tactics-tab");
    if (!btn) return;
    const tacticCard = tacticsContainer.querySelector(
      `.tactic[data-tactic-code="${btn.dataset.tacticCode}"]`
    );
    if (!tacticCard) return;

    if (tacticCard.classList.contains("collapsed")) {
      setTacticCollapsed(tacticCard, false);
      persistTacticState();
      updateTacticsTabbarState();
    }
    tacticCard.scrollIntoView({ inline: "start", block: "nearest" });
  }

  Mitre.render = {
    sortTacticsData,
    renderTactics,
    buildCodeIndexMap,
    updateGreenHighlights,
    updateScrollbars,
    syncScrollbars,
    handleWheelScroll,
    handleTacticToggle,
    updateTacticToggleButton,
    collapseAllTactics,
    expandAllTactics,
    handleTacticsTabbarClick,
  };
})();
