import { parsedFileData, patientProfile } from "../signals";
import { jsPDF } from "jspdf";
import {localizedAutoTable as autoTable, reportText, setReportLanguage} from "../i18n/pdf.js";
import { symmetryPercent, padRoundDecimalsToLength } from "./numberUtils";
import tickIcon from "../assets/icons/tick.png";
import crossIcon from "../assets/icons/delete.png";
import { numberUtils } from "./utils";
import {referenceValues} from "../data/referenceValues.js";
import {reportMetricIndices} from "./reportMetricDefinitions.js";
import {reportRows, reportLegLabels} from "./reportRows.js";
export {reportRows} from "./reportRows.js";
import {resolveComparisonSides} from "./comparisonSides.js";
import {SYMMETRY_SCALE, symmetryMarkerPosition, symmetryScaleSegments, symmetryStatusColor} from "./symmetryScale.js";
const reportColors = {
  ink: [42, 57, 64],
  accent: [255, 80, 0],
  pale: [246, 247, 248],
  border: [221, 225, 227],
  pass: [20, 135, 67],
  fail: [205, 45, 48],
};

function drawLabelValue(pdf, label, value, x, y) {
  pdf.setFont("Helvetica", "bold");
  pdf.text(label, x, y);
  const valueX = x + pdf.getTextWidth(label) + 1.2;
  pdf.setFont("Helvetica", "normal");
  pdf.text(String(value), valueX, y);
}

function addPatientInfo(pdf, patientInfo, files, detailTest = null) {
  const involved = String(patientInfo.involvedSide ?? "").includes("vasen") ? "Vasen" : String(patientInfo.involvedSide ?? "").includes("oikea") ? "Oikea" : "–";
  const subjectName = [patientInfo.subjectNameFirst, patientInfo.subjectName].filter(Boolean).join(" ");
  const subjectId = patientInfo.subjectId ?? patientInfo["subject-id"] ?? patientInfo["subject id"] ?? patientInfo.subjectID;
  const date = files[0]?.rawObject?.measurement?.["date(dd/mm/yyyy)"] ?? "–";
  const comment = String(patientInfo.additionalComment || "–");

  pdf.setFillColor(...reportColors.accent);
  pdf.roundedRect(10, 8, 190, 3, 1.5, 1.5, "F");
  pdf.setTextColor(...reportColors.ink);
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(13);
  const brand = detailTest
    ? reportText(pdf, detailTest.title).split(" ")[0]
    : "Metropolia";
  pdf.setTextColor(...reportColors.accent);
  pdf.text(brand, 10, 19);
  const brandEnd = 10 + pdf.getTextWidth(`${brand} `);
  pdf.setTextColor(...reportColors.ink);
  if (detailTest) {
    const title = reportText(pdf, detailTest.title);
    pdf.text(title.slice(brand.length).trim(), brandEnd, 19);
    pdf.setFontSize(6.8);
    pdf.setTextColor(95, 105, 110);
    DETAIL_PROTOCOLS[detailTest.key].forEach((line, index) => {
      const translated = reportText(pdf, line);
      const colon = translated.indexOf(":");
      drawLabelValue(pdf, translated.slice(0, colon + 1), translated.slice(colon + 1).trim(), 10, 28 + index * 5);
    });
  } else {
    pdf.text(reportText(pdf, "Metropolia liikelaboratorio").replace(/^Metropolia\s*/, ""), brandEnd, 19);
    pdf.setFontSize(8.5);
    pdf.text(reportText(pdf, "Voimaraportti: polven ojennus ja koukistus"), 10, 25);
    pdf.text(reportText(pdf, "Isokineettinen CON-TREX MultiJoint"), 10, 29.5);
  }
  pdf.setFillColor(...reportColors.pale);
  pdf.setDrawColor(...reportColors.border);
  pdf.roundedRect(126, 14, 74, 29, 2, 2, "FD");
  pdf.setTextColor(...reportColors.ink);
  pdf.setFontSize(6.6);
  drawLabelValue(pdf, `${reportText(pdf, "Testi pvm")}:`, date, 130, 19.5);
  drawLabelValue(pdf, `${reportText(pdf, subjectName ? "Nimi" : "ID")}:`, subjectName || subjectId || "–", 130, 25.5);
  drawLabelValue(pdf, `${reportText(pdf, "Kehonpaino")}:`, `${patientInfo.subjectWeight ?? "–"} kg`, 130, 31.5);
  drawLabelValue(pdf, `${reportText(pdf, "Oireinen jalka")}:`, reportText(pdf, involved), 130, 37.5);
  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(6.8);
  pdf.setTextColor(95, 105, 110);
  if (!detailTest) pdf.text(reportText(pdf, "Myllypurontie 1, 00920 | liikelaboratorio@metropolia.fi"), 10, 34);
  if (comment && comment !== "–") pdf.text(`${reportText(pdf, "Lisäkommentti")}: ${comment}`, 10, 41);
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
  kons60: ["Mittaus: konsentrinen 60°/s, 3 toistoa, ballistinen tila.", "Suodatus: painovoimakorjaus, alipäästösuodatus, kitkakompensointi"],
  kons240: ["Mittaus: konsentrinen 240°/s, 3 toistoa, ballistinen tila.", "Suodatus: painovoimakorjaus, alipäästösuodatus, kitkakompensointi"],
  eks30: ["Mittaus: eksentrinen 30°/s, 2 toistoa, ballistinen tila.", "Suodatus: painovoimakorjaus, alipäästösuodatus, kitkakompensointi"],
  kons180: ["Mittaus: konsentrinen 180°/s, 20 toistoa, ballistinen tila.", "Suodatus: painovoimakorjaus, alipäästösuodatus, kitkakompensointi"],
};

const pdfColors = {
  right: [0, 200, 80], // green
  left: [220, 30, 30], // red
};

function drawSymmetryBar(pdf, x, y, percentage, barWidth = 50, barHeight = 3) {
  const {min: minVal, max: maxVal} = SYMMETRY_SCALE;
  symmetryScaleSegments().forEach(([from, to, color]) => {
    pdf.setFillColor(...color);
    pdf.rect(
      x + ((from - minVal) / (maxVal - minVal)) * barWidth,
      y,
      ((to - from) / (maxVal - minVal)) * barWidth,
      barHeight,
      "F",
    );
  });
  const posX = x + symmetryMarkerPosition(percentage) * barWidth;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.35);
  pdf.line(posX, y - 0.3, posX, y + barHeight + 0.3);
}

function drawReferenceArrow(pdf, cell, status) {
  // Reference deviations are summarised in the status column to keep the
  // report visually calm. This function remains as a no-op for compatibility
  // with older report-table calls.
}

function drawRowStatus(pdf, cell, row) {
  if (row.noStatus) return;
  const hasSymmetry = numberUtils.isNumber(row.symmetry);
  const hasStatusBasis = row.hasReference || hasSymmetry;
  const drawIcon = (status, centerX) => {
    // Keep every status mark inside the same visual box. The raster icons
    // used for pass/fail have a little transparent padding; the warning tick
    // is drawn as vector geometry with matching visible proportions.
    const size = 4.2;
    const middleY = cell.y + cell.height / 2;
    if (status === "warning") {
      pdf.setDrawColor(222, 126, 0);
      pdf.setLineWidth(0.58);
      pdf.line(centerX - 1.35, middleY - 0.05, centerX - 0.40, middleY + 0.95);
      pdf.line(centerX - 0.40, middleY + 0.95, centerX + 1.50, middleY - 1.05);
      return;
    }
    const icon = status === "fail" ? crossIcon : tickIcon;
    pdf.addImage(icon, "PNG", centerX - size / 2, cell.y + cell.height / 2 - size / 2, size, size);
  };

  const statusFor = (referenceStatus, symmetryStatus = null) => {
    if (referenceStatus === "fail" || symmetryStatus === "red") return "fail";
    if (referenceStatus === "warning" || symmetryStatus === "orange") return "warning";
    return "pass";
  };

  if (row.isHq) {
    if (!row.hasReference) return;
    drawIcon(statusFor(row.referenceStatus), cell.x + cell.width / 2 - 3.2);
    drawIcon(statusFor(row.involvedStatus), cell.x + cell.width / 2 + 3.2);
    return;
  }
  if (!hasStatusBasis) return;
  const symmetryStatus = hasSymmetry ? symmetryStatusColor(row.symmetry) : null;
  const status = statusFor(
    row.referenceStatus === "fail" || row.involvedStatus === "fail" ? "fail" : row.referenceStatus === "warning" || row.involvedStatus === "warning" ? "warning" : "none",
    symmetryStatus,
  );
  drawIcon(status, cell.x + cell.width / 2);
}

function maskRoundedTableCorners(pdf, x, y, width, height, radius = 2) {
  const curve = radius * 0.5523;
  pdf.setFillColor(255, 255, 255);
  // Paint only the four areas outside the rounded outline; this removes the
  // square grey header-fill pixels that AutoTable would otherwise leave there.
  pdf.moveTo(x, y); pdf.lineTo(x + radius, y);
  pdf.curveTo(x + radius - curve, y, x, y + radius - curve, x, y + radius); pdf.fill();
  pdf.moveTo(x + width - radius, y); pdf.lineTo(x + width, y); pdf.lineTo(x + width, y + radius);
  pdf.curveTo(x + width, y + radius - curve, x + width - radius + curve, y, x + width - radius, y); pdf.fill();
  pdf.moveTo(x, y + height - radius); pdf.lineTo(x, y + height);
  pdf.lineTo(x + radius, y + height); pdf.curveTo(x + radius - curve, y + height, x, y + height - radius + curve, x, y + height - radius); pdf.fill();
  pdf.moveTo(x + width - radius, y + height); pdf.lineTo(x + width, y + height);
  pdf.lineTo(x + width, y + height - radius); pdf.curveTo(x + width, y + height - radius + curve, x + width - radius + curve, y + height, x + width - radius, y + height); pdf.fill();
}

function renderReportTable(pdf, rows, startY, x = 10, framed = false, involvedSide = null) {
  const legs = reportLegLabels(involvedSide);
  autoTable(pdf, {
    startY,
    margin: {left: x},
    head: [["Mittari", legs.reference, "", legs.involved, "Symmetria %", "Viitearvo\n(keskiarvo ± SD)", "Status"]],
    body: rows.map((row) => row.cells ?? row),
    theme: "plain",
    tableWidth: 162,
    styles: {fontSize: 7.2, cellPadding: 0.55, lineColor: [255, 255, 255], lineWidth: 0, valign: "middle"},
    headStyles: {fillColor: [238, 238, 238], textColor: reportColors.ink, fontSize: 7.2, fontStyle: "bold", halign: "center", minCellHeight: 7},
    columnStyles: {
      0: {cellWidth: 36, halign: "left"},
      1: {cellWidth: 24, halign: "center"},
      2: {cellWidth: 22, halign: "center"},
      3: {cellWidth: 24, halign: "center"},
      4: {cellWidth: 15, halign: "center"},
      5: {cellWidth: 25, halign: "center"},
      6: {cellWidth: 16, halign: "center"},
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
        const color = symmetryStatusColor(value);
        data.cell.styles.textColor = color === "red" ? reportColors.fail : color === "orange" ? [222, 126, 0] : reportColors.pass;
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
  const endY = pdf.lastAutoTable.finalY;
  maskRoundedTableCorners(pdf, x, startY, 162, endY - startY, 2);
  if (framed) {
    pdf.setDrawColor(...reportColors.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, startY, 162, endY - startY + 1.5, 2, 2, "S");
  }
  return endY;
}

function drawReportLegend(pdf, y) {
  pdf.setFontSize(7);
  pdf.setTextColor(88, 98, 104);
  pdf.text(reportText(pdf, "LSI = oireileva jalka / verrokkijalka × 100. Alle 100 % = oireileva jalka on heikompi; yli 100 % = vahvempi."), 10, y);
  pdf.text(reportText(pdf, "Väripalkin musta viiva näyttää LSI-arvon yhteisellä asteikolla. Vihreä merkki = hyväksyttävä; punainen rasti = yli 10 % puoliero tai selvä viitearvopoikkeama."), 10, y + 4);
  pdf.setTextColor(0);
}

function renderReportCard(pdf, {title, key, test, referenceSet, operated, x, y}) {
  const width = 133;
  pdf.setFillColor(...reportColors.ink);
  pdf.roundedRect(x, y, width, 8, 2, 2, "F");
  pdf.setTextColor(255);
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text(reportText(pdf, title), x + 3, y + 5.4);
  pdf.setTextColor(0);

  const endY = renderReportTable(
    pdf,
    reportRows(key, test, referenceSet, operated),
    y + 9,
    x,
    false,
    operated,
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
  const involved = String(patientInfo.involvedSide ?? "").toLowerCase();
  const operated = involved.includes("vasen") || involved.includes("left") ? "vasen" : involved.includes("oikea") || involved.includes("right") ? "oikea" : null;
  return renderReportTable(
    pdf,
    reportRows(testKey, group, referenceSet, operated, allGroups),
    145,
    10,
    false,
    operated,
  );
}

// Draw color key for right & left legs
function drawColorKey(pdf) {
  pdf.setFontSize(11);

  // Right leg (blue)
  pdf.setFillColor(...pdfColors.right);
  pdf.rect(20, 40, 4, 4, "F");
  pdf.text(reportText(pdf, "Oikea jalka"), 26, 43.5);

  // Left leg (red)
  pdf.setFillColor(...pdfColors.left);
  pdf.rect(20, 46, 4, 4, "F");
  pdf.text(reportText(pdf, "Vasen jalka"), 26, 49.5);
}

export async function generatePDF() {
  const pdf = new jsPDF({orientation: "portrait", unit: "mm", format: "a4"});
  setReportLanguage(pdf);
  // Capture both language and chart text before the first asynchronous image
  // conversion so changing the UI language cannot produce a mixed-language PDF.
  const chartSnapshots = Object.fromEntries(TESTS.map(({key}) => [key,
    [...document.querySelectorAll(`#all-charts-export .test-charts[data-test-key="${key}"] svg`)]
      .map((svg) => svg.cloneNode(true)),
  ]));
  pdf.setFontSize(11);
  const files = parsedFileData();
  const sourcePatientInfo = files[0].rawObject.session;
  const sourceMeasurement = files[0].rawObject.measurement ?? {};
  const profile = patientProfile();
  const firstValue = (...values) => values.find((value) => value != null && String(value).trim() !== "");
  const patientInfo = {
    ...sourcePatientInfo,
    subjectNameFirst: firstValue(sourcePatientInfo.subjectNameFirst, sourcePatientInfo["subject-name-first"], sourcePatientInfo["subject name first"]),
    subjectName: firstValue(sourcePatientInfo.subjectName, sourcePatientInfo["subject-name"], sourcePatientInfo["subject name"]),
    subjectId: firstValue(sourcePatientInfo.subjectId, sourcePatientInfo["subject-id"], sourcePatientInfo["subject id"], sourcePatientInfo["subject ID"], sourcePatientInfo.id, sourceMeasurement.subjectId, sourceMeasurement["subject-id"], sourceMeasurement["subject id"], sourceMeasurement.id),
    involvedSide: profile.involvedSide || sourcePatientInfo.involvedSide,
    subjectWeight: profile.weight || sourcePatientInfo.subjectWeight,
    additionalComment: profile.additionalComment || sourcePatientInfo.additionalComment,
    referenceValues: profile.referenceValues || sourcePatientInfo.referenceValues,
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
    pdf.text(reportText(pdf, title), 10, y);
    pdf.setTextColor(0);
    const tableStartY = y + 2;
    const endY = renderReportTable(
      pdf,
      reportRows(key, test, referenceSet, operated, groups),
      tableStartY,
      10,
      false,
      operated,
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
      flex30: eks30.left?.[reportMetricIndices("eks30").hamstrings.torque],
    };
    const rightData = {
      ext240: kons240.right?.[110],
      flex30: eks30.right?.[reportMetricIndices("eks30").hamstrings.torque],
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
    pdf.text(reportText(pdf, "Mixed ratio"), 13, y + 9.4);
    pdf.setTextColor(0);
    const endY = renderReportTable(pdf, mixedRows, y + 13, 10, false, operated);
    pdf.setDrawColor(...reportColors.border);
    pdf.roundedRect(10, y + 4, 133, endY - y - 2, 2, 2, "S");
    y = endY + 5;
  }

  // convert SVG charts to PNG and add to PDF
  for (const testDef of TESTS) {
    const group = groups[testDef.key];

    if (!group || (!group.left && !group.right)) continue;

    const pngs = [];
    {
      for (const svg of chartSnapshots[testDef.key]) {
        const { dataUrl, width, height } = await svgToPng(svg);
        pngs.push({ dataUrl, width, height });
      }
    }

    pdf.addPage();
    addPatientInfo(pdf, patientInfo, files, testDef);

    pngs.slice(0, 2).forEach(({dataUrl, width, height}, index) => {
      // Both complete chart images fit inside the header's 10–200 mm span.
      // Adjacent image frames reduce the gap without overlapping axis labels.
      pdf.addImage(dataUrl, "PNG", 10 + index * 95, 56, 95, 95 * height / width);
    });

    // One unified clinical table per detail page. The former small statistics
    // table is intentionally merged under the relevant muscle heading here.
    const tableY = 136;
    renderReportTable(
      pdf,
      reportRows(testDef.key, group, referenceSet, operated, groups, {includeDetails: true}),
      tableY,
      10,
      true,
      operated,
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
