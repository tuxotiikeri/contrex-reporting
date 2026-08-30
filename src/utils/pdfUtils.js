import { parsedFileData, patientProfile } from "../signals";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { symmetryPercent, padRoundDecimalsToLength } from "./numberUtils";
import tickIcon from "../assets/icons/tick.png";
import crossIcon from "../assets/icons/delete.png";
import { numberUtils } from "./utils";
import {referenceValues} from "../data/referenceValues.js";
import {mixedRatio, reportMetricIndices} from "./reportMetricDefinitions.js";
import {resolveComparisonSides} from "./comparisonSides.js";
const reportColors = {
  ink: [42, 57, 64],
  accent: [255, 80, 0],
  pale: [246, 247, 248],
  border: [221, 225, 227],
  pass: [20, 135, 67],
  fail: [205, 45, 48],
};

function addPatientInfo(pdf, patientInfo, files) {
  const involved = String(patientInfo.involvedSide ?? "").includes("vasen") ? "Vasen" : String(patientInfo.involvedSide ?? "").includes("oikea") ? "Oikea" : "–";
  const subjectName = [patientInfo.subjectNameFirst, patientInfo.subjectName].filter(Boolean).join(" ");
  const subjectId = patientInfo.subjectId ?? patientInfo["subject id"] ?? patientInfo.subjectID;
  const subjectLabel = subjectId ? `ID: ${subjectId}` : `Nimi: ${subjectName || "–"}`;
  const date = files[0]?.rawObject?.measurement?.["date(dd/mm/yyyy)"] ?? "–";
  const comment = String(patientInfo.additionalComment || "–");

  pdf.setFillColor(...reportColors.accent);
  pdf.roundedRect(10, 8, 190, 3, 1.5, 1.5, "F");
  pdf.setTextColor(...reportColors.ink);
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Metropolia liikelaboratorio", 10, 19);
  pdf.setFontSize(8.5);
  pdf.text("Isokineettinen polven ojennus- ja koukistusvoimamittaus", 10, 25);
  pdf.setFillColor(...reportColors.pale);
  pdf.setDrawColor(...reportColors.border);
  pdf.roundedRect(126, 14, 74, 29, 2, 2, "FD");
  pdf.setTextColor(...reportColors.ink);
  pdf.setFontSize(6.6);
  pdf.setFont("Helvetica", "bold");
  pdf.text(`Testi pvm: ${date}`, 130, 19.5);
  pdf.text(subjectLabel, 130, 25.5);
  pdf.text(`Kehonpaino: ${patientInfo.subjectWeight ?? "–"} kg`, 130, 31.5);
  pdf.text(`Oireinen jalka: ${involved}`, 130, 37.5);
  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(6.8);
  pdf.setTextColor(95, 105, 110);
  pdf.text("Myllypurontie 1, 00920 | liikelaboratorio@metropolia.fi", 10, 36);
  if (comment && comment !== "–") pdf.text(`Lisäkommentti: ${comment}`, 10, 41);
  pdf.setTextColor(0);
}

const METRICS = [
  { idx: 110, label: "Huippuvääntö ojennus", unit: "Nm" },
  { idx: 111, label: "Huippuvääntö koukistus", unit: "Nm" },
  { idx: 112, label: "Huippuvääntö keskiarvo ojennus", unit: "Nm" },
  { idx: 113, label: "Huippuvääntö keskiarvo koukistus", unit: "Nm" },

  { idx: 122, label: "Työ keskiarvo ojennus", unit: "J" },
  { idx: 123, label: "Työ keskiarvo koukistus", unit: "J" },

  { idx: 124, label: "Teho keskiarvo ojennus", unit: "W" },
  { idx: 125, label: "Teho keskiarvo koukistus", unit: "W" },
  { idx: 130, label: "Työ väsymys ojennus", unit: "J/s" },
  { idx: 131, label: "Työ väsymys koukistus", unit: "J/s" },

  { idx: 250, label: "Huippuväännön vaihtelu ojennus", unit: "Nm" },
  { idx: 251, label: "Huippuväännön vaihtelu koukistus", unit: "Nm" },

  { idx: 146, label: "Huipputeho keskiarvo ojennus", unit: "W" },
  { idx: 147, label: "Huipputeho keskiarvo koukistus", unit: "W" },

  { idx: 148, label: "Huipputeho keskiarvo ojennus", unit: "W" },
  { idx: 149, label: "Huipputeho keskiarvo koukistus", unit: "W" },
  { idx: 150, label: "Huipputeho keskiarvo ojennus / kg", unit: "W/kg" },
  { idx: 151, label: "Huipputeho keskiarvo koukistus / kg", unit: "W/kg" },
];

const TESTS = [
  {
    key: "kons60",
    title: "Maksimivoima",
    match: "oj/kouk 500 Nm isokin. ballistinen kons/kons 60/60",
  },
  {
    key: "kons240",
    title: "Nopeusvoima",
    match: "oj/kouk 500 Nm isokin. ballistinen kons/kons 240/240",
  },
  {
    key: "eks30",
    title: "Jarruttava voima",
    match: "oj/kouk 500 Nm isokin. ballistinen eks/eks 30/30",
  },
  {
    key: "kons180",
    title: "Kestovoima",
    match: "oj/kouk 500 Nm isokin. ballistinen kons/kons 180/180",
  },
];

const DETAIL_PROTOCOLS = {
  kons60: "Konsentrinen 60°/s, isokineettinen ballistinen, 3 toistoa, painovoimakorjaus, alipäästösuodatus, kitkakompensointi.",
  kons240: "Konsentrinen 240°/s, isokineettinen ballistinen, 3 toistoa, painovoimakorjaus, alipäästösuodatus, kitkakompensointi.",
  eks30: "Eksentrinen 30°/s, isokineettinen ballistinen, 2 toistoa, painovoimakorjaus, alipäästösuodatus, kitkakompensointi.",
  kons180: "Konsentrinen 180°/s, isokineettinen ballistinen, 20 toistoa, painovoimakorjaus, alipäästösuodatus, kitkakompensointi.",
};

const pdfColors = {
  right: [0, 200, 80], // green
  left: [220, 30, 30], // red
};

function drawSymmetryBar(pdf, x, y, percentage, barWidth = 50, barHeight = 3) {
  const minVal = 75;
  const maxVal = 125;
  const val = parseFloat(percentage);

  const zones = [
    [75, 80, [246, 174, 164]],
    [80, 90, [255, 184, 92]],
    [90, 95, [255, 218, 102]],
    [95, 105, [154, 205, 93]],
    [105, 110, [255, 218, 102]],
    [110, 120, [255, 184, 92]],
    [120, 125, [246, 174, 164]],
  ];
  zones.forEach(([from, to, color]) => {
    pdf.setFillColor(...color);
    pdf.rect(
      x + ((from - minVal) / (maxVal - minVal)) * barWidth,
      y,
      ((to - from) / (maxVal - minVal)) * barWidth,
      barHeight,
      "F",
    );
  });
  const adjustedVal = Math.min(Math.max(val, minVal), maxVal);
  const posX = x + ((adjustedVal - minVal) / (maxVal - minVal)) * barWidth;
  pdf.setDrawColor(0);
  pdf.line(posX, y - 1, posX, y + barHeight + 1);
}

const getVal = (data, idx) => {
  if (!data || typeof data[idx] !== "number") return "–";
  return padRoundDecimalsToLength(Math.abs(data[idx]), 3);
};

function getSideHeaders(involvedSide) {
  let operated = null;

  if (involvedSide?.includes("vasen")) operated = "vasen";
  if (involvedSide?.includes("oikea")) operated = "oikea";

  const rightHeader = operated === "oikea" ? "Oikea (L)" : "Oikea";
  const leftHeader = operated === "vasen" ? "Vasen (L)" : "Vasen";

  return { operated, rightHeader, leftHeader };
}

const metricReference = (referenceSet, testKey, key) =>
  referenceSet?.metrics?.[testKey]?.[key] ?? null;

function referenceStatus(value, reference) {
  if (!numberUtils.isNumber(value) || !reference) return "none";
  const numericValue = Math.abs(value);
  const mean = Number(reference.mean);
  const sd = Number(reference.sd ?? 0);
  if (reference.direction === "lower") {
    if (numericValue <= mean) return "none";
    return numericValue >= mean + sd ? "fail" : "warning";
  }
  if (numericValue >= mean) return "none";
  return numericValue <= mean - sd ? "fail" : "warning";
}

const referenceText = (reference) => {
  if (!reference) return "–";
  if (reference.minimum != null) return `≥ ${reference.minimum}`;
  return `${reference.mean} ± ${reference.sd}`;
};

const hqWorkValue = (analysis, isEccentric) => {
  const ext = Math.abs(analysis?.[212]);
  const flex = Math.abs(analysis?.[213]);
  return isEccentric
    ? (flex ? (ext / flex) * 100 : NaN)
    : (ext ? (flex / ext) * 100 : NaN);
};

const hqPeakValue = (analysis, isEccentric) => {
  const quadriceps = Math.abs(analysis?.[isEccentric ? 111 : 110]);
  const hamstrings = Math.abs(analysis?.[isEccentric ? 110 : 111]);
  return quadriceps ? (hamstrings / quadriceps) * 100 : NaN;
};

export function reportRows(testKey, group, referenceSet, operated, allGroups = {}) {
  const isEccentric = testKey === "eks30";
  const isEndurance = testKey === "kons180";
  const right = group?.right;
  const left = group?.left;

  // Indices describe movement direction, not the measured leg. Therefore the
  // same index must always be used for right and left when calculating LSI.
  const {quadriceps: quadricepsIndices, hamstrings: hamstringsIndices} = reportMetricIndices(testKey);

  const definitionsFor = (indices, referenceSuffix) => isEndurance
    ? [
        ["Huippuvääntö (Nm)", indices.torque, `torque${referenceSuffix}`],
        ["Työ keskimäärin (J)", indices.averageWork, `averageWork${referenceSuffix}`],
        ["Kokonaistyö (J)", indices.totalWork, `work${referenceSuffix}`],
      ]
    : [
        ["Huippuvääntö (Nm)", indices.torque, `torque${referenceSuffix}`],
        ["Huippuvääntö (Nm / kg)", indices.bw, `bw${referenceSuffix}`],
        ["Työ keskimäärin (J)", indices.averageWork, `averageWork${referenceSuffix}`],
      ];

  const makeSection = (title, definitions) => {
    const rows = [{
      cells: [{
        content: title.toUpperCase(),
        colSpan: 7,
        styles: {
          fontStyle: "bold",
          fillColor: [250, 251, 252],
          textColor: reportColors.ink,
        },
      }],
      isSectionHeading: true,
    }];
    definitions.forEach(([label, index, referenceKey]) => {
      const rightValue = right?.[index];
      const leftValue = left?.[index];
      const lsi = right && left ? symmetryPercent(rightValue, leftValue, operated) : "–";
      const reference = metricReference(referenceSet, testKey, referenceKey);
      rows.push({
        cells: [label, getVal(right, index), "", getVal(left, index), lsi, referenceText(reference), ""],
        rightStatus: referenceStatus(rightValue, reference),
        leftStatus: referenceStatus(leftValue, reference),
        symmetry: parseFloat(lsi),
        hasReference: Boolean(reference),
      });
    });
    return rows;
  };
  const rows = [
    ...makeSection("Etureisi", definitionsFor(quadricepsIndices, "Ext")),
    ...makeSection("Takareisi", definitionsFor(hamstringsIndices, "Flex")),
  ];

  if (isEccentric) {
    const concentric240 = allGroups?.kons240;
    const rightMixed = mixedRatio(right?.[hamstringsIndices.torque], concentric240?.right?.[110]);
    const leftMixed = mixedRatio(left?.[hamstringsIndices.torque], concentric240?.left?.[110]);
    rows.push({
      cells: ["Mixed-ratio (%)", getVal({0: rightMixed}, 0), "", getVal({0: leftMixed}, 0), "–", "–", ""],
      rightStatus: "none",
      leftStatus: "none",
      symmetry: null,
      noBar: true,
    });
  } else if (right || left) {
    const rightHq = isEndurance ? hqWorkValue(right, isEccentric) : hqPeakValue(right, isEccentric);
    const leftHq = isEndurance ? hqWorkValue(left, isEccentric) : hqPeakValue(left, isEccentric);
    const hqRef = metricReference(referenceSet, testKey, "hq");
    rows.push({
      cells: ["HQ-ratio (%)", getVal({0: rightHq}, 0), "", getVal({0: leftHq}, 0), "–", referenceText(hqRef), ""],
      rightStatus: referenceStatus(rightHq, hqRef),
      leftStatus: referenceStatus(leftHq, hqRef),
      symmetry: null,
      hasReference: Boolean(hqRef),
      noBar: true,
      isHq: true,
    });
  }
  return rows;
}

function drawReferenceArrow(pdf, cell, status) {
  // Reference deviations are summarised in the status column to keep the
  // report visually calm. This function remains as a no-op for compatibility
  // with older report-table calls.
}

function drawRowStatus(pdf, cell, row) {
  const hasSymmetry = numberUtils.isNumber(row.symmetry);
  const hasStatusBasis = row.hasReference || hasSymmetry;
  const drawIcon = (icon, centerX) => {
    const size = 4.2;
    pdf.addImage(icon, "PNG", centerX - size / 2, cell.y + cell.height / 2 - size / 2, size, size);
  };

  if (row.isHq) {
    if (!row.hasReference) return;
    drawIcon(row.rightStatus === "fail" ? crossIcon : tickIcon, cell.x + cell.width / 2 - 3.2);
    drawIcon(row.leftStatus === "fail" ? crossIcon : tickIcon, cell.x + cell.width / 2 + 3.2);
    return;
  }
  if (!hasStatusBasis) return;
  const failed = row.rightStatus === "fail" || row.leftStatus === "fail" || (hasSymmetry && (row.symmetry < 90 || row.symmetry > 110));
  drawIcon(failed ? crossIcon : tickIcon, cell.x + cell.width / 2);
}

function renderReportTable(pdf, rows, startY, x = 10) {
  autoTable(pdf, {
    startY,
    margin: {left: x},
    head: [["Mittari", "Oikea", "", "Vasen", "Symmetria %", "Viitearvo\n(keskiarvo ± SD)", "Status"]],
    body: rows.map((row) => row.cells ?? row),
    theme: "plain",
    tableWidth: 162,
    styles: {fontSize: 7.2, cellPadding: 0.55, lineColor: [255, 255, 255], lineWidth: 0, valign: "middle"},
    headStyles: {fillColor: [238, 238, 238], textColor: reportColors.ink, fontSize: 7.2, fontStyle: "bold", halign: "center", minCellHeight: 7},
    columnStyles: {
      0: {cellWidth: 39, halign: "left"},
      1: {cellWidth: 18, halign: "center"},
      2: {cellWidth: 22, halign: "center"},
      3: {cellWidth: 18, halign: "center"},
      4: {cellWidth: 18, halign: "center"},
      5: {cellWidth: 29, halign: "center"},
      6: {cellWidth: 18, halign: "center"},
    },
    didParseCell: (data) => {
      const row = rows[data.row.index];
      if (data.section === "head" && data.column.index === 0) {
        data.cell.styles.halign = "left";
      }
      if (data.section === "body" && row?.isSectionHeading) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.textColor = reportColors.ink;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.cellPadding = {top: 1.5, right: 0.55, bottom: 0.35, left: 0.55};
      }
      if (data.section === "body" && row && !row.isSectionHeading && data.column.index === 4 && numberUtils.isNumber(row.symmetry)) {
        const value = Number(row.symmetry);
        data.cell.styles.textColor = value < 80 || value > 120
          ? reportColors.fail
          : value < 90 || value > 110 ? [222, 126, 0] : reportColors.pass;
      }
    },
    didDrawCell: (data) => {
      const row = rows[data.row.index];
      if (!row || !row.cells) return;
      if (data.column.index === 2 && !row.noBar && numberUtils.isNumber(row.symmetry)) {
        drawSymmetryBar(pdf, data.cell.x + 1, data.cell.y + data.cell.height / 2 - 1.1, row.symmetry, data.cell.width - 2, 2.2);
      }
      if (data.column.index === 6) drawRowStatus(pdf, data.cell, row);
      if (data.section === "body" && row?.isSectionHeading) {
        pdf.setDrawColor(...reportColors.border);
        pdf.setLineWidth(0.22);
        pdf.line(data.cell.x + 2, data.cell.y + data.cell.height, data.cell.x + data.cell.width - 2, data.cell.y + data.cell.height);
      }
    },
  });
  return pdf.lastAutoTable.finalY;
}

function drawReportLegend(pdf, y) {
  pdf.setFontSize(7);
  pdf.setTextColor(88, 98, 104);
  pdf.text("LSI = oireileva jalka / verrokkijalka × 100. Alle 100 % = oireileva jalka on heikompi; yli 100 % = vahvempi.", 10, y);
  pdf.text("Väripalkin musta viiva näyttää LSI-arvon yhteisellä asteikolla. Vihreä merkki = hyväksyttävä; punainen rasti = yli 10 % puoliero tai selvä viitearvopoikkeama.", 10, y + 4);
  pdf.setTextColor(0);
}

function renderReportCard(pdf, {title, key, test, referenceSet, operated, x, y}) {
  const width = 133;
  pdf.setFillColor(...reportColors.ink);
  pdf.roundedRect(x, y, width, 8, 2, 2, "F");
  pdf.setTextColor(255);
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text(title, x + 3, y + 5.4);
  pdf.setTextColor(0);

  const endY = renderReportTable(
    pdf,
    reportRows(key, test, referenceSet, operated),
    y + 9,
    x,
  );
  pdf.setDrawColor(...reportColors.border);
  pdf.roundedRect(x, y, width, endY - y + 2, 2, 2, "S");
  return endY + 2;
}

function svgToPng(svgElement) {
  return new Promise((resolve) => {
    // serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgElement);
    // Determine dimensions and scale for higher-res PNG
    const width =
      parseFloat(svgElement.getAttribute("width")) || svgElement.clientWidth;
    const height =
      parseFloat(svgElement.getAttribute("height")) || svgElement.clientHeight;
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    // Create image from SVG string
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width, height });
    };
    img.src = url;
  });
}

function addAnalysisTable(pdf, group, patientInfo, testKey, allGroups) {
  const referenceSet = referenceValues[patientInfo.referenceValues] ?? null;
  return renderReportTable(
    pdf,
    reportRows(testKey, group, referenceSet, getSideHeaders(patientInfo.involvedSide).operated, allGroups),
    145,
  );
}

// Draw color key for right & left legs
function drawColorKey(pdf) {
  pdf.setFontSize(11);

  // Right leg (blue)
  pdf.setFillColor(...pdfColors.right);
  pdf.rect(20, 40, 4, 4, "F");
  pdf.text("Oikea jalka", 26, 43.5);

  // Left leg (red)
  pdf.setFillColor(...pdfColors.left);
  pdf.rect(20, 46, 4, 4, "F");
  pdf.text("Vasen jalka", 26, 49.5);
}

export async function generatePDF() {
  const pdf = new jsPDF({orientation: "portrait", unit: "mm", format: "a4"});
  pdf.setFontSize(11);
  const files = parsedFileData();
  const sourcePatientInfo = files[0].rawObject.session;
  const profile = patientProfile();
  const patientInfo = {
    ...sourcePatientInfo,
    subjectId: sourcePatientInfo.subjectId ?? sourcePatientInfo["subject id"] ?? sourcePatientInfo["subject ID"] ?? sourcePatientInfo.id,
    involvedSide: profile.involvedSide || sourcePatientInfo.involvedSide,
    subjectWeight: profile.weight || sourcePatientInfo.subjectWeight,
    additionalComment: profile.additionalComment || sourcePatientInfo.additionalComment,
  };
  // group analysis data by test type and side
  const groups = {};
  for (const f of files) {
    const name = f.rawObject.measurement.name;
    const side = f.rawObject.configuration.side[1];
    const analysis = f.rawObject.analysis;

    if (!numberUtils.isNumber(analysis[110])) {
      continue;
    }

    for (const { key, match } of TESTS) {
      if (name.includes(match)) {
        groups[key] ??= {};
        groups[key][side] = analysis;
      }
    }
  }

  let y = 0;
  const referenceSet = referenceValues[patientInfo.referenceValues] ?? null;
  const comparison = resolveComparisonSides(patientInfo.involvedSide, files);
  const operated = comparison.involvedSide === "left"
    ? "vasen"
    : comparison.involvedSide === "right" ? "oikea" : null;

  const reportTests = TESTS.filter(({key}) => Boolean(groups[key]));
  addPatientInfo(pdf, patientInfo, files);
  y = 55;
  reportTests.forEach(({key, title}) => {
    const test = groups[key];
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...reportColors.ink);
    pdf.text(title, 10, y);
    pdf.setTextColor(0);
    const tableStartY = y + 2;
    const endY = renderReportTable(
      pdf,
      reportRows(key, test, referenceSet, operated, groups),
      tableStartY,
    );
    pdf.setDrawColor(...reportColors.border);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(10, tableStartY, 162, endY - tableStartY + 1.5, 2, 2, "S");
    y = endY + 10;
  });

  // Calculate mixed ratio for kons240 + eks30
  const kons240 = groups["kons240"];
  const eks30 = groups["eks30"];
  // The mixed ratio remains available when the selected page has room for it.
  // With all four standard protocols it is omitted from the one-pager so the
  // report remains genuinely one page and readable.
  const showMixedRatioOnSeparatePage = false;
  if (showMixedRatioOnSeparatePage && kons240 && eks30) {
    const leftData = {
      ext240: kons240.left?.[110],
      flex30: eks30.left?.[111],
    };
    const rightData = {
      ext240: kons240.right?.[110],
      flex30: eks30.right?.[111],
    };

    const hasLeft = leftData.ext240 != null && leftData.flex30 != null;
    const hasRight = rightData.ext240 != null && rightData.flex30 != null;

    const mixedLeft = hasLeft ? (leftData.flex30 / leftData.ext240) * 100 : "–";
    const mixedRight = hasRight
      ? (rightData.flex30 / rightData.ext240) * 100
      : "–";

    const mixedSymm =
      hasLeft && hasRight
        ? symmetryPercent(mixedRight, mixedLeft, operated)
        : "–";

    const mixedRows = [{
      cells: [
        "Mixed ratio (%)",
        hasRight ? padRoundDecimalsToLength(mixedRight, 3) : "–",
        "",
        hasLeft ? padRoundDecimalsToLength(mixedLeft, 3) : "–",
        mixedSymm,
        "–",
        "",
      ],
      rightStatus: "none",
      leftStatus: "none",
      symmetry: parseFloat(mixedSymm),
    }];
    pdf.setFillColor(...reportColors.ink);
    pdf.roundedRect(10, y + 4, 133, 8, 2, 2, "F");
    pdf.setTextColor(255);
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.text("Mixed ratio", 13, y + 9.4);
    pdf.setTextColor(0);
    const endY = renderReportTable(pdf, mixedRows, y + 13, 10);
    pdf.setDrawColor(...reportColors.border);
    pdf.roundedRect(10, y + 4, 133, endY - y - 2, 2, 2, "S");
    y = endY + 5;
  }

  // convert SVG charts to PNG and add to PDF
  for (const testDef of TESTS) {
    const group = groups[testDef.key];

    if (!group || (!group.left && !group.right)) continue;

    const container = document.querySelector(
      `#all-charts-export .test-charts[data-test-key="${testDef.key}"]`,
    );

    const pngs = [];
    if (container) {
      const svgs = container.querySelectorAll("svg");
      for (const svg of svgs) {
        const { dataUrl, width, height } = await svgToPng(svg);
        pngs.push({ dataUrl, width, height });
      }
    }

    pdf.addPage();
    addPatientInfo(pdf, patientInfo, files);

    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...reportColors.ink);
    pdf.text(testDef.title, 10, 55);
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(6.8);
    pdf.setTextColor(95, 105, 110);
    pdf.text(pdf.splitTextToSize(DETAIL_PROTOCOLS[testDef.key], 188), 10, 61);
    pdf.setTextColor(0);

    if (testDef.key === "kons180") {
      pngs.slice(0, 2).forEach(({dataUrl}, index) => {
        pdf.addImage(dataUrl, "PNG", 10 + index * 98, 70, 92, 51);
      });
      drawDetailedStatistics(pdf, testDef.key, group, files, 132, 10, 190);
      pdf.setFontSize(5.8);
      pdf.setTextColor(95, 105, 110);
      pdf.text("* Työväsymisindeksi = 100 × (ensimmäisen kolmanneksen keskimääräinen työ − viimeisen kolmanneksen keskimääräinen työ) / ensimmäisen kolmanneksen työ.", 10, 190);
      pdf.setTextColor(0);
    } else {
      pngs.slice(0, 2).forEach(({dataUrl}, index) => {
        pdf.addImage(dataUrl, "PNG", 10 + index * 98, 70, 92, 51);
      });
      drawDetailedStatistics(pdf, testDef.key, group, files, 132, 108, 92);
    }
    const tableY = testDef.key === "kons180" ? 205 : 190;
    renderReportTable(
      pdf,
      reportRows(testDef.key, group, referenceSet, operated, groups),
      tableY,
    );
  }
  const patientMeasurements = files[0].rawObject.measurement;
  const rawDate = String(patientMeasurements["date(dd/mm/yyyy)"] ?? "");
  const [dd, mm, yyyy] = rawDate.split(/[./-]/);
  const formattedDate = yyyy && mm && dd ? `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}` : "mittaus";
  const subjectId = String(patientInfo.subjectId ?? "").trim();
  const firstName = String(patientInfo.subjectNameFirst ?? "").trim().toLowerCase();
  const lastName = String(patientInfo.subjectName ?? "").trim().toLowerCase();
  const filePrefix = (subjectId || [firstName, lastName].filter(Boolean).join("-") || "contrex-reporting")
    .replace(/[\\/:*?"<>|]/g, "-");
  pdf.save(`${filePrefix}_${formattedDate}.pdf`);
}

const metricNumber = (value) => numberUtils.isNumber(value)
  ? padRoundDecimalsToLength(Math.abs(value), 3)
  : "–";

function rawEnduranceStats(files, side) {
  const file = files.find((candidate) =>
    String(candidate?.rawObject?.programType ?? "").includes("kons/kons 180/180") &&
    candidate?.rawObject?.configuration?.side?.[1] === side,
  );
  const ext = file?.rawObject?.repetitions?.work1 ?? [];
  const flex = file?.rawObject?.repetitions?.work2 ?? [];
  const values = Array.from({length: Math.min(ext.length, flex.length)}, (_, index) =>
    Math.abs(Number(ext[index]) || 0) + Math.abs(Number(flex[index]) || 0),
  );
  if (!values.length) return null;
  const sum = (items) => items.reduce((total, value) => total + value, 0);
  const first3 = sum(values.slice(0, 3));
  const last3 = sum(values.slice(-3));
  const thirdCount = Math.max(1, Math.floor(values.length / 3));
  const firstThird = sum(values.slice(0, thirdCount)) / thirdCount;
  const lastThird = sum(values.slice(-thirdCount)) / thirdCount;
  return {
    total: sum(values),
    first3,
    last3,
    fatigue: firstThird ? ((firstThird - lastThird) / firstThird) * 100 : NaN,
  };
}

function drawDetailedStatistics(pdf, testKey, group, files, startY, x = 108, width = 92) {
  const isEccentric = testKey === "eks30";
  const quadriceps = isEccentric
    ? {at200: 121, peakAngle: 115}
    : {at200: 120, peakAngle: 114};
  const hamstrings = isEccentric
    ? {at200: 120, peakAngle: 114}
    : {at200: 121, peakAngle: 115};
  const right = group?.right;
  const left = group?.left;
  const rows = [
    ["Mittari", "Oikea", "Vasen"],
    ["ETUREISI", "", ""],
    ["Vääntö 0,2 s kohdalla (Nm)", metricNumber(right?.[quadriceps.at200]), metricNumber(left?.[quadriceps.at200])],
    ["Kulma huippuväännössä (°)", metricNumber(right?.[quadriceps.peakAngle]), metricNumber(left?.[quadriceps.peakAngle])],
    ["TAKAREISI", "", ""],
    ["Vääntö 0,2 s kohdalla (Nm)", metricNumber(right?.[hamstrings.at200]), metricNumber(left?.[hamstrings.at200])],
    ["Kulma huippuväännössä (°)", metricNumber(right?.[hamstrings.peakAngle]), metricNumber(left?.[hamstrings.peakAngle])],
  ];

  if (testKey === "kons180") {
    const rightEndurance = rawEnduranceStats(files, "right");
    const leftEndurance = rawEnduranceStats(files, "left");
    rows.push(
      ["Kokonaistyö: ojennus + koukistus [J]", metricNumber(rightEndurance?.total), metricNumber(leftEndurance?.total)],
      ["Työväsymisindeksi* [%]", metricNumber(rightEndurance?.fatigue), metricNumber(leftEndurance?.fatigue)],
    );
  }

  autoTable(pdf, {
    startY,
    margin: {left: x},
    tableWidth: width,
    body: rows,
    theme: "plain",
    styles: {fontSize: 5.8, cellPadding: 0.6, lineColor: reportColors.border, lineWidth: 0.15, valign: "middle"},
    columnStyles: {0: {cellWidth: width * 0.63}, 1: {cellWidth: width * 0.185, halign: "center"}, 2: {cellWidth: width * 0.185, halign: "center"}},
    didParseCell: (data) => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = [238, 238, 238];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.halign = data.column.index === 0 ? "left" : "center";
      }
      if (data.row.index === 1 || data.row.index === 4) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = reportColors.ink;
      }
    },
  });
  return pdf.lastAutoTable.finalY;
}
