(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});

  Mitre.config = {
    DRAWIO_LAYOUT: {
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
      tactic:
        "shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=10;strokeColor=none;fontSize=17;fontColor=#FFFFFF;fontStyle=1;align=center;rounded=0;verticalAlign=middle;fontFamily=Helvetica;spacingTop=5;spacingBottom=5;spacingRight=5;spacingLeft=6;",
      technique:
        "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;align=left;verticalAlign=middle;fontFamily=Helvetica;fontSize=12;spacingTop=2;spacingBottom=2;spacingRight=2;spacingLeft=6;",
      subtech:
        "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;align=left;verticalAlign=middle;fontFamily=Helvetica;fontSize=10;spacingTop=2;spacingBottom=2;spacingRight=2;spacingLeft=6;",
      subAccent:
        "rounded=0;whiteSpace=wrap;html=1;strokeColor=none;fontColor=#000000;",
    },

    PRESETS_STORAGE_KEY: "mitre-drawio-presets",
    LAST_SELECTION_STORAGE_KEY: "mitre-drawio-last-selection",
    SETTINGS_STATE_STORAGE_KEY: "mitre-drawio-settings-open",
    TACTIC_STATE_STORAGE_KEY: "mitre-drawio-tactics",
    GREEN_FILTER_STORAGE_KEY: "mitre-drawio-green-filter",

    MITRE_LINK_BASE: "https://mitre.ptsecurity.com/ru-RU/",
  };
})();
