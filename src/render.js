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
      summaryTitle.textContent = tactic.name;
      summaryTitle.title = `${tactic.name} (${tactic.code})`;
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

          const expandBtn = techNode.querySelector(".technique-expand");
          const hasSubs = Boolean(
            technique.subtechniques && technique.subtechniques.length
          );

          title.textContent = technique.code;
          name.textContent = technique.name;
          if (techniqueCard) {
            techniqueCard.dataset.code = technique.code;
          }

          checkbox.dataset.type = "technique";
          checkbox.dataset.tacticIndex = String(tIndex);
          checkbox.dataset.techIndex = String(techIndex);

          if (hasSubs) {
            selectAllBtn?.classList.remove("hidden");
            selectAllBtn?.setAttribute("data-tactic-index", String(tIndex));
            selectAllBtn?.setAttribute("data-tech-index", String(techIndex));
            expandBtn?.classList.remove("hidden");
          } else {
            selectAllBtn?.classList.add("hidden");
            expandBtn?.classList.add("hidden");
          }

          if (techLink) {
            techLink.href = `${MITRE_LINK_BASE}${technique.code}`;
            techLink.setAttribute(
              "aria-label",
              `Открыть описание ${technique.code} на сайте MITRE`
            );
            techLink.title = `Открыть ${technique.code} на mitre.ptsecurity.com`;
          }

          // technique + its subtech list share a wrapper so the list stays the
          // technique card's immediate next sibling (import.js walks that link)
          // while the pair can be collapsed as one accordion unit.
          const group = document.createElement("div");
          group.className = "technique-group";
          group.appendChild(techNode);
          techniqueHolder.appendChild(group);

          if (hasSubs) {
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

            group.appendChild(subList);
          }
        });

      tacticsContainer.appendChild(fragment);
    });

    buildCodeIndexMap();
    updateGreenHighlights();
    updateTechniqueCounts();
    renderTacticsTabbar(tactics);
    requestAnimationFrame(updateScrollbars);
  }

  // Footer badge on each technique card: how many of its subtechniques are
  // currently selected. Mirrors the coverage badge on the reference matrix,
  // but counts the thing this tool actually acts on — the export selection.
  function updateTechniqueCounts() {
    tacticsContainer.querySelectorAll(".technique-group").forEach((group) => {
      const card = group.querySelector(".technique");
      const badge = group.querySelector(".technique-count");
      if (!card || !badge) return;

      const subInputs = group.querySelectorAll(
        '.subtech-list input[type="checkbox"]'
      );
      if (!subInputs.length) {
        const selfChecked = card.querySelector('input[type="checkbox"]')?.checked;
        badge.textContent = selfChecked ? "выбрано" : "";
        badge.classList.toggle("is-filled", Boolean(selfChecked));
        return;
      }

      const checked = Array.from(subInputs).filter((i) => i.checked).length;
      badge.textContent = `${checked}/${subInputs.length}`;
      badge.classList.toggle("is-filled", checked > 0);
    });
  }

  function setTechniqueExpanded(group, expanded) {
    group.classList.toggle("is-expanded", expanded);
    const btn = group.querySelector(".technique-expand");
    if (btn) {
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        expanded ? "Скрыть подтехники" : "Показать подтехники"
      );
    }
  }

  function handleTechniqueExpand(event) {
    const btn = event.target.closest(".technique-expand");
    if (!btn) return;
    event.preventDefault();
    const group = btn.closest(".technique-group");
    if (!group) return;
    setTechniqueExpanded(group, !group.classList.contains("is-expanded"));
    requestAnimationFrame(updateScrollbars);
  }

  function setAllSubtechniquesExpanded(expanded) {
    tacticsContainer
      .querySelectorAll(".technique-group")
      .forEach((group) => setTechniqueExpanded(group, expanded));
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
    const label = collapsed ? "Показать тактику" : "Скрыть тактику";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
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

  // Jump to a tactic by scrolling ONLY the matrix sideways. scrollIntoView is
  // deliberately not used: it also scrolls the page vertically and parks the
  // column header underneath the sticky chrome.
  function scrollTacticIntoView(tacticCard) {
    const containerRect = tacticsContainer.getBoundingClientRect();
    const cardRect = tacticCard.getBoundingClientRect();
    const padLeft =
      parseFloat(getComputedStyle(tacticsContainer).paddingLeft) || 0;
    const target =
      tacticsContainer.scrollLeft + (cardRect.left - containerRect.left) - padLeft;

    tacticsContainer.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth",
    });
  }

  // If the board's headers have already scrolled above the sticky chrome,
  // lift the page just far enough to show them again. Only ever scrolls up,
  // so a jump never drags the reader away from where they were reading.
  function revealMatrixTop() {
    const chrome = document.querySelector(".app-chrome");
    const wrapper = document.querySelector(".tactics-scroll-wrapper");
    if (!chrome || !wrapper) return;

    const isSticky = getComputedStyle(chrome).position === "sticky";
    const chromeHeight = isSticky ? chrome.getBoundingClientRect().height : 0;
    const wrapperTop = wrapper.getBoundingClientRect().top;

    if (wrapperTop < chromeHeight) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + wrapperTop - chromeHeight - 8),
        behavior: "smooth",
      });
    }
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

    tacticsTabbar.querySelectorAll(".tactics-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab === btn);
    });
    btn.scrollIntoView({ inline: "nearest", block: "nearest" });

    scrollTacticIntoView(tacticCard);
    revealMatrixTop();
  }

  Mitre.render = {
    sortTacticsData,
    renderTactics,
    buildCodeIndexMap,
    updateGreenHighlights,
    updateTechniqueCounts,
    updateScrollbars,
    syncScrollbars,
    handleWheelScroll,
    handleTacticToggle,
    updateTacticToggleButton,
    collapseAllTactics,
    expandAllTactics,
    handleTacticsTabbarClick,
    handleTechniqueExpand,
    setAllSubtechniquesExpanded,
  };
})();
