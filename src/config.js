(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});

  Mitre.config = {
    DRAWIO_LAYOUT: {
      originX: 40,
      originY: 140,
      columnWidth: 230,
      minColumnWidth: 120,
      maxColumnWidth: 600,
      baseFontSize: 12,
      minFontSize: 6,
      maxFontSize: 24,
      headerFontSize: 16,
      minHeaderFontSize: 8,
      maxHeaderFontSize: 32,
      titleFontSize: 14,
      minTitleFontSize: 6,
      maxTitleFontSize: 28,
      columnGap: 30,
      headerHeight: 40,
      techniqueBaseHeight: 52,
      subTechniqueBaseHeight: 46,
      verticalGap: 18,
      subAccentWidth: 6,
    },

    COLOR_CONFIG: {
      default: { step: "#AE4132", card: "#FAD9D5" },
      recon: { step: "#10739E", card: "#B1DDF0" },
    },

    SUB_ACCENT_COLOR: "#6C5E5C",

    GREEN_COLOR_CONFIG: {
      step: "#2D8A45",
      card: "#BFE8B8",
      subAccent: "#4FB86A",
    },

    STYLES: {
      // spacingLeft/Right clear the step shape's 10px point and notch and
      // leave the label breathing room instead of butting against the bevels.
      tactic:
        "shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=10;strokeColor=none;fontColor=#FFFFFF;fontStyle=1;align=center;rounded=0;verticalAlign=middle;fontFamily=Helvetica;spacingTop=6;spacingBottom=6;spacingRight=18;spacingLeft=18;",
      technique:
        "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;align=left;verticalAlign=middle;fontFamily=Helvetica;spacingTop=2;spacingBottom=2;spacingRight=2;spacingLeft=6;",
      subtech:
        "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;align=left;verticalAlign=middle;fontFamily=Helvetica;spacingTop=2;spacingBottom=2;spacingRight=2;spacingLeft=6;",
      subAccent:
        "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;",
    },

    // Three independent bases: `base` sizes the description text (technique
    // and subtechnique names), `head` sizes the tactic headers, `title`
    // sizes the bold technique/subtechnique code line. `head` and `title`
    // are the on-screen label sizes directly, so the number in the UI is
    // the number on screen. At base 12 / head 16 / title 14 these reproduce
    // the original hardcoded sizes.
    fontScale(base, head, isFstec, title = base + 2) {
      return isFstec
        ? {
            tacticStyle: head + 1,
            tacticName: head - 2,
            tacticCode: head - 4,
            techniqueStyle: base,
            techniqueCode: title,
            techniqueName: base,
            subStyle: base - 2,
            subCode: title,
            subName: base - 2,
          }
        : {
            tacticStyle: head + 1,
            tacticName: head,
            tacticCode: head,
            techniqueStyle: base,
            techniqueCode: title,
            techniqueName: base,
            subStyle: base - 2,
            subCode: title,
            subName: base - 2,
          };
    },

    // Page sizes in px at 100dpi (mm / 25.4 * 100), matching drawio's own
    // page-size convention so pageWidth/pageHeight line up with real paper.
    PAGE_SIZES: {
      a4: { portrait: { width: 827, height: 1169 }, landscape: { width: 1169, height: 827 } },
      a3: { portrait: { width: 1169, height: 1654 }, landscape: { width: 1654, height: 1169 } },
    },

    PRESETS_STORAGE_KEY: "mitre-drawio-presets",
    LAST_SELECTION_STORAGE_KEY: "mitre-drawio-last-selection",
    SETTINGS_STATE_STORAGE_KEY: "mitre-drawio-settings-open",
    TACTIC_STATE_STORAGE_KEY: "mitre-drawio-tactics",
    GREEN_FILTER_STORAGE_KEY: "mitre-drawio-green-filter",
    PAGE_FIT_STORAGE_KEY: "mitre-drawio-page-fit",

    MITRE_LINK_BASE: "https://mitre.ptsecurity.com/ru-RU/",
  };
})();
