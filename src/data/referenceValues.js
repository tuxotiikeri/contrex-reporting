// Reference sets are deliberately kept outside the report components so new
// populations can be added without changing the rendering code.
export const referenceValues = {
  "Miehet maantiepyöräily, kilpailutaso (tutkimusviite)": {
    label: "Miesmaantiepyöräilijät, kilpailutaso",
    source: "Rannama et al. (2013), n=17 maantiepyöräilijää.",
    metrics: {
      kons60: {
        torqueExt: { mean: 223, sd: 34.2 }, bwExt: { mean: 3.0, sd: 0.41 },
        torqueFlex: { mean: 127, sd: 23.2 }, bwFlex: { mean: 1.7, sd: 0.24 },
      },
      kons240: {
        torqueExt: { mean: 135, sd: 20.6 }, bwExt: { mean: 1.83, sd: 0.25 },
        torqueFlex: { mean: 83, sd: 13 }, bwFlex: { mean: 1.12, sd: 0.15 },
      },
      kons180: {
        torqueExt: { mean: 158, sd: 23.9 }, bwExt: { mean: 2.13, sd: 0.3 },
        torqueFlex: { mean: 94, sd: 13.7 }, bwFlex: { mean: 1.27, sd: 0.17 },
      },
    },
  },
  "Miehet jalkapallo, elite": {
    label: "Miehet jalkapallo, elite",
    source: "van Melick et al. (2022), n=1499 nuorta aikuista.",
    metrics: {
      kons60: {
        torqueExt: { mean: 239, sd: 16 },
        bwExt: { mean: 3.17, sd: 0.10 },
        torqueFlex: { mean: 138, sd: 4 },
        bwFlex: { mean: 1.78, sd: 0.10 },
        lsiExt: { mean: 99, sd: 2 },
        lsiFlex: { mean: 102, sd: 3 },
        hq: { mean: 60, sd: 3, minimum: 60, direction: "higher" },
      },
      kons180: {
        torqueExt: { mean: 168, sd: 14 }, bwExt: { mean: 2.56, sd: 0.10 }, lsiExt: { mean: 103, sd: 0 },
        torqueFlex: { mean: 106, sd: 7 }, bwFlex: { mean: 1.62, sd: 0.05 }, lsiFlex: { mean: 102, sd: 0 },
        hq: { mean: 62, sd: 6 },
      },
      kons300: {
        torqueExt: { mean: 134, sd: 6 }, bwExt: { mean: 1.87, sd: 0.01 }, lsiExt: { mean: 102, sd: 0 },
        torqueFlex: { mean: 93, sd: 7 }, bwFlex: { mean: 1.33, sd: 0.01 }, lsiFlex: { mean: 101, sd: 4 },
        hq: { mean: 68, sd: 6 },
      },
      eks30: { mixedRatio: { minimum: 100, maximum: 130 } },
    },
  },
  "Pojat jalkapallo, elite": {
    label: "Pojat jalkapallo, elite (adolescent)",
    source: "van Melick et al. (2022), scoping review. Elite adolescents, n=58.",
    metrics: {
      kons60: { torqueExt: { mean: 182, sd: 28 }, lsiExt: { mean: 102, sd: 15 }, torqueFlex: { mean: 97, sd: 18 }, lsiFlex: { mean: 108, sd: 18 }, hq: { mean: 84 } },
      kons180: { torqueExt: { mean: 145, sd: 13 }, lsiExt: { mean: 99 }, torqueFlex: { mean: 87, sd: 15 }, lsiFlex: { mean: 98 }, hq: { mean: 61, sd: 9 } },
      kons300: { torqueExt: { mean: 122, sd: 14 }, lsiExt: { mean: 99 }, torqueFlex: { mean: 72, sd: 9 }, lsiFlex: { mean: 99 }, hq: { mean: 61, sd: 7 } },
      eks30: { mixedRatio: { minimum: 100, maximum: 130 } },
    },
  },
  "Naiset jalkapallo, elite": {
    label: "Naiset jalkapallo, elite",
    source: "van Melick et al. (2022), scoping review. Elite female young adults, n=213.",
    metrics: {
      kons60: { torqueExt: { mean: 149, sd: 3 }, bwExt: { mean: 2.32, sd: 0.36 }, lsiExt: { mean: 101 }, torqueFlex: { mean: 87, sd: 1 }, bwFlex: { mean: 1.36, sd: 0.21 }, lsiFlex: { mean: 103 }, hq: { mean: 59, sd: 1 } },
      kons300: { torqueExt: { mean: 83, sd: 12 }, torqueFlex: { mean: 60, sd: 9 }, hq: { mean: 72, sd: 11 } },
      eks30: { mixedRatio: { minimum: 100, maximum: 130 } },
    },
  },
  "Miehet jalkapallo, non-elite": {
    label: "Miehet jalkapallo, non-elite",
    source: "van Melick et al. (2022), scoping review. Young adults, n=106.",
    metrics: {
      kons60: { torqueExt: { mean: 225, sd: 0 }, bwExt: { mean: 2.76, sd: 0.41 }, lsiExt: { mean: 106, sd: 1 }, torqueFlex: { mean: 130, sd: 5 }, bwFlex: { mean: 1.57, sd: 0.23 }, lsiFlex: { mean: 106, sd: 6 }, hq: { mean: 61, sd: 3 } },
      kons180: { torqueExt: { mean: 150, sd: 3 }, torqueFlex: { mean: 105, sd: 7 }, hq: { mean: 71, sd: 8 } },
      kons300: { torqueExt: { mean: 125, sd: 5 }, bwExt: { mean: 1.27, sd: 0.23 }, lsiExt: { mean: 106 }, torqueFlex: { mean: 90, sd: 7 }, bwFlex: { mean: 0.98, sd: 0.19 }, lsiFlex: { mean: 114 }, hq: { mean: 79, sd: 1 } },
      eks30: { mixedRatio: { minimum: 100, maximum: 130 } },
    },
  },
  "Miehet koripallo, elite": {
    label: "Miehet koripallo, elite",
    source: "van Melick et al. (2022), scoping review. Male elite, n=73.",
    metrics: {
      kons60: { torqueExt: { mean: 289, sd: 3 }, bwExt: { mean: 3.21, sd: 0.47 }, lsiExt: { mean: 105 }, torqueFlex: { mean: 157, sd: 8 }, bwFlex: { mean: 2.06, sd: 0.35 }, lsiFlex: { mean: 107 }, hq: { mean: 55, sd: 3 } },
      kons180: { torqueExt: { mean: 190, sd: 12 }, bwExt: { mean: 1.73, sd: 0.31 }, lsiExt: { mean: 98 }, torqueFlex: { mean: 107, sd: 7 }, bwFlex: { mean: 1.45, sd: 0.27 }, lsiFlex: { mean: 100 }, hq: { mean: 58, sd: 9 } },
      kons300: { torqueExt: { mean: 147, sd: 27 }, torqueFlex: { mean: 82, sd: 19 }, hq: { mean: 56, sd: 10 } },
    },
  },
  "Naiset koripallo, elite": {
    label: "Naiset koripallo, elite",
    source: "van Melick et al. (2022), scoping review. Female elite, n=14.",
    metrics: {
      kons60: { torqueExt: { mean: 185, sd: 15 }, bwExt: { mean: 2.50, sd: 0.15 }, torqueFlex: { mean: 100, sd: 10 }, bwFlex: { mean: 1.50, sd: 0.08 }, hq: { mean: 57, sd: 9 } },
      kons180: { torqueExt: { mean: 120, sd: 10 }, bwExt: { mean: 1.70, sd: 0.08 }, torqueFlex: { mean: 55, sd: 5 }, bwFlex: { mean: 0.90, sd: 0.06 }, hq: { mean: 55, sd: 10 } },
      kons300: { torqueExt: { mean: 75, sd: 10 }, bwExt: { mean: 1.20, sd: 0.08 }, torqueFlex: { mean: 30, sd: 4 }, bwFlex: { mean: 0.50, sd: 0.08 }, hq: { mean: 51, sd: 10 } },
    },
  },
  "Miehet käsipallo, elite": {
    label: "Miehet käsipallo, elite",
    source: "van Melick et al. (2022), scoping review.",
    metrics: {
      kons60: { torqueExt: { mean: 122, sd: 14 }, lsiExt: { mean: 99 }, torqueFlex: { mean: 72, sd: 9 }, lsiFlex: { mean: 99 }, hq: { mean: 61, sd: 7 } },
      kons300: { torqueExt: { mean: 181, sd: 36 }, torqueFlex: { mean: 113, sd: 22 }, hq: { mean: 63, sd: 9 } },
    },
  },
  "Naiset käsipallo, elite": {
    label: "Naiset käsipallo, elite",
    source: "van Melick et al. (2022), scoping review. Female elite, n=293.",
    metrics: {
      kons60: { torqueExt: { mean: 169, sd: 5 }, bwExt: { mean: 2.44, sd: 0.05 }, lsiExt: { mean: 100 }, torqueFlex: { mean: 95, sd: 2 }, bwFlex: { mean: 1.38, sd: 0.02 }, lsiFlex: { mean: 103 }, hq: { mean: 57, sd: 1 } },
      kons180: { torqueExt: { mean: 110, sd: 7 }, bwExt: { mean: 1.70, sd: 0.08 }, torqueFlex: { mean: 40, sd: 7 }, bwFlex: { mean: 0.90, sd: 0.06 }, hq: { mean: 55, sd: 10 } },
      kons300: { torqueExt: { mean: 91, sd: 16 }, bwExt: { mean: 1.10, sd: 0.08 }, torqueFlex: { mean: 53, sd: 18 }, bwFlex: { mean: 0.50, sd: 0.06 }, hq: { mean: 61, sd: 5 } },
    },
  },
  "Lentopallo, elite (valmistelussa)": {
    label: "Lentopallo, elite", source: "Viiteaineistoa ei ole vielä lisätty.", metrics: {},
  },
  "Alppihiihto naiset, elite (kaikki lajit)": {
    label: "Alppihiihto naiset, elite (kaikki lajit)",
    source: "Alhammoud et al. (2019), elite-alppihiihtäjät, naiset.",
    metrics: {
      kons60: { bwExt: { mean: 2.77, sd: 0.21 }, bwFlex: { mean: 1.38, sd: 0.18 }, hq: { mean: 50, sd: 7 } },
      kons180: { bwExt: { mean: 1.97, sd: 0.19 }, bwFlex: { mean: 1.09, sd: 0.13 }, hq: { mean: 56, sd: 7 } },
    },
  },
  "Alppihiihto miehet, elite (kaikki lajit)": {
    label: "Alppihiihto miehet, elite (kaikki lajit)",
    source: "Alhammoud et al. (2019), elite-alppihiihtäjät, miehet.",
    metrics: {
      kons60: { bwExt: { mean: 3.35, sd: 0.50 }, bwFlex: { mean: 1.71, sd: 0.22 }, hq: { mean: 52, sd: 7 } },
      kons180: { bwExt: { mean: 2.37, sd: 0.34 }, bwFlex: { mean: 1.29, sd: 0.16 }, hq: { mean: 55, sd: 6 } },
    },
  },
};

export const referenceValueOptions = Object.keys(referenceValues);
