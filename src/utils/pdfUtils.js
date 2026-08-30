import { parsedFileData } from "../signals";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { symmetryPercent, padRoundDecimalsToLength } from "./numberUtils";
import tickIcon from "../assets/icons/tick.png";
import crossIcon from "../assets/icons/delete.png";
import { numberUtils } from "./utils";
import {referenceValues} from "../data/referenceValues.js";

function addPatientInfo(pdf, patientInfo, files) {
  pdf.setFontSize(11);
  pdf.setFont("Helvetica", "normal");
  pdf.line(10, 5, 200, 5, "S");
  pdf.text(
    `Nimi: ${patientInfo.subjectNameFirst} ${patientInfo.subjectName}`,
    10,
    10,
  );
  pdf.text(`Syntymäpäivä: ${patientInfo.subjectBirth}`, 10, 15);
  pdf.text(`Paino: ${patientInfo.subjectWeight}`, 10, 20);
  pdf.text(`Pituus: ${patientInfo.subjectHeight}`, 10, 25);
  pdf.text(`Sukupuoli: ${patientInfo.subjectSex[1]}`, 70, 10);
  pdf.text(`Leikattu jalka: ${patientInfo.involvedSide}`, 70, 15);
  pdf.text(
    `Testin päivämäärä: ${files[0].rawObject.measurement["date(dd/mm/yyyy)"]}`,
    140,
    10,
  );
  pdf.text(`Loukkaantumispäivä: ${patientInfo.injuryDate}`, 140, 15);
  pdf.line(10, 27, 200, 27, "S");
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

const pdfColors = {
  right: [0, 200, 80], // green
  left: [220, 30, 30], // red
};

function drawSymmetryBar(pdf, x, y, percentage, barWidth = 50, barHeight = 3) {
  const minVal = 50;
  const maxVal = 150;
  const val = parseFloat(percentage);

  const zones = [
    [50, 80, [245, 150, 140]],
    [80, 85, [245, 185, 90]],
    [85, 90, [245, 215, 100]],
    [90, 110, [170, 215, 90]],
    [110, 115, [245, 215, 100]],
    [115, 120, [245, 185, 90]],
    [120, 150, [245, 150, 140]],
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
  if (reference.minimum != null) return `> ${reference.minimum}*`;
  return `${reference.mean} ± ${reference.sd}*`;
};

const hqWorkValue = (analysis, isEccentric) => {
  const ext = Math.abs(analysis?.[212]);
  const flex = Math.abs(analysis?.[213]);
  return isEccentric
    ? (flex ? (ext / flex) * 100 : NaN)
    : (ext ? (flex / ext) * 100 : NaN);
};

function reportRows(testKey, group, referenceSet, operated) {
  const isEccentric = testKey === "eks30";
  const isEndurance = testKey === "kons180";
  const right = group?.right;
  const left = group?.left;
  const metricDefs = isEndurance
    ? [
        ["Huippuvääntö", isEccentric ? 111 : 110, isEccentric ? 110 : 111, "torqueExt"],
        ["Kokonaistyö", isEccentric ? 213 : 212, isEccentric ? 212 : 213, "workExt"],
        ["Työväsyminen", isEccentric ? 131 : 130, isEccentric ? 130 : 131, "fatigueExt"],
      ]
    : [
        ["Huippuvääntö", isEccentric ? 111 : 110, isEccentric ? 110 : 111, "torqueExt"],
        ["Kokonaistyö", isEccentric ? 213 : 212, isEccentric ? 212 : 213, "workExt"],
        ["Huippuvääntö / BW", isEccentric ? 204 : 203, isEccentric ? 203 : 204, "bwExt"],
      ];
  const makeSection = (title, defs, referenceKey) => {
    const rows = [{content: title, colSpan: 7, styles: {fontStyle: "bold", fillColor: [255,255,255]}}];
    defs.forEach(([label, rightIdx, leftIdx, refKey]) => {
      const rightValue = right?.[rightIdx];
      const leftValue = left?.[leftIdx];
      const lsi = right && left ? symmetryPercent(rightValue, leftValue, operated) : "–";
      const reference = metricReference(referenceSet, testKey, refKey.replace("Ext", referenceKey));
      rows.push({
        cells: [label, getVal(right, rightIdx), "", getVal(left, leftIdx), lsi, referenceText(reference), ""],
        rightStatus: referenceStatus(rightValue, reference),
        leftStatus: referenceStatus(leftValue, reference),
        symmetry: parseFloat(lsi),
      });
    });
    return rows;
  };
  const extDefs = metricDefs.map(([label, rightIdx, leftIdx, refKey]) => [label, rightIdx, leftIdx, refKey]);
  const rows = [
    ...makeSection(isEccentric ? "Takareisi" : "Etureisi", extDefs, "Ext"),
    ...makeSection(isEccentric ? "Etureisi" : "Takareisi", metricDefs.map(([label, rightIdx, leftIdx, refKey]) => [label, leftIdx, rightIdx, refKey.replace("Ext", "Flex")]), "Flex"),
  ];
  if (right || left) {
    const rightHq = hqWorkValue(right, isEccentric);
    const leftHq = hqWorkValue(left, isEccentric);
    const hqRef = metricReference(referenceSet, testKey, "hq");
    rows.push({
      cells: ["Kokonaistyön H/Q-ratio", getVal({0: rightHq}, 0), "", getVal({0: leftHq}, 0), "–", referenceText(hqRef), ""],
      rightStatus: referenceStatus(rightHq, hqRef),
      leftStatus: referenceStatus(leftHq, hqRef),
      symmetry: null,
      noBar: true,
    });
  }
  return rows;
}

function drawReferenceArrow(pdf, cell, status) {
  if (status === "none") return;
  pdf.setFillColor(...(status === "fail" ? [220, 30, 30] : [235, 140, 20]));
  const x = cell.x + cell.width - 3;
  const y = cell.y + cell.height / 2;
  pdf.triangle(x, y - 2, x + 2, y - 2, x + 1, y + 2, "F");
}

function drawRowStatus(pdf, cell, row) {
  const failed = row.rightStatus === "fail" || row.leftStatus === "fail" || (numberUtils.isNumber(row.symmetry) && (row.symmetry < 80 || row.symmetry > 120));
  pdf.setFontSize(10);
  pdf.setTextColor(...(failed ? [220, 30, 30] : [0, 140, 50]));
  pdf.text(failed ? "×" : "✓", cell.x + cell.width / 2, cell.y + cell.height - 1, {align: "center"});
  pdf.setTextColor(0);
}

function renderReportTable(pdf, rows, startY) {
  autoTable(pdf, {
    startY,
    head: [["Mittari", "Oikea", "", "Vasen", "LSI %", "Viitearvo*", "Status"]],
    body: rows.map((row) => row.cells ?? row),
    theme: "plain",
    tableWidth: 190,
    styles: {fontSize: 8.5, cellPadding: 1, lineColor: [220,220,220]},
    headStyles: {fillColor: [235,235,235], textColor: 0, fontSize: 8.5, fontStyle: "bold"},
    columnStyles: {2: {cellWidth: 50}, 6: {cellWidth: 14}},
    didDrawCell: (data) => {
      const row = rows[data.row.index];
      if (!row || !row.cells) return;
      if (data.column.index === 2 && !row.noBar && numberUtils.isNumber(row.symmetry)) {
        drawSymmetryBar(pdf, data.cell.x, data.cell.y + data.cell.height / 2 - 1.5, row.symmetry, data.cell.width, 3);
      }
      if (data.column.index === 1) drawReferenceArrow(pdf, data.cell, row.rightStatus);
      if (data.column.index === 3) drawReferenceArrow(pdf, data.cell, row.leftStatus);
      if (data.column.index === 6) drawRowStatus(pdf, data.cell, row);
    },
  });
  return pdf.lastAutoTable.finalY;
}

function drawReportLegend(pdf, y) {
  pdf.setFontSize(8);
  pdf.setTextColor(70, 70, 70);
  pdf.text("LSI: involved / non-involved × 100; 100 % = täydellinen symmetria", 14, y);
  pdf.text("oranssi ↓ = alle viitekeskiarvon (<1 SD)   punainen ↓ = vähintään 1 SD alle", 14, y + 4);
  pdf.text("✓ = hyväksytty   × = ei täytä hyväksymiskriteerejä", 14, y + 8);
  pdf.setTextColor(0);
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

function addAnalysisTable(pdf, group, patientInfo, testKey) {
  const referenceSet = referenceValues[patientInfo.referenceValues] ?? null;
  return renderReportTable(
    pdf,
    reportRows(testKey, group, referenceSet, getSideHeaders(patientInfo.involvedSide).operated),
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
  const pdf = new jsPDF();
  pdf.setFontSize(11);
  const files = parsedFileData();
  const patientInfo = files[0].rawObject.session;
  // determine operated side and headers
  const { operated, rightHeader, leftHeader } = getSideHeaders(
    patientInfo.involvedSide,
  );

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

  addPatientInfo(pdf, patientInfo, files);

  let y = 32;
  const referenceSet = referenceValues[patientInfo.referenceValues] ?? null;

  // generate tables and symmetry bars for each test. Page 1
  for (const { key, title } of []) {
    const test = groups[key];
    if (!test) continue;

    const leftData = test.left;
    const rightData = test.right;
    if (!leftData && !rightData) continue;
    const isEks30 = key === "eks30";
    const extIdx = isEks30 ? 111 : 110;
    const flexIdx = isEks30 ? 110 : 111;

    // calculate symmetry values
    const torqExtSymm =
      leftData && rightData
        ? symmetryPercent(rightData[extIdx], leftData[extIdx], operated)
        : "–";
    const workExtSymm =
      leftData && rightData
        ? symmetryPercent(
            rightData[isEks30 ? 213 : 212],
            leftData[isEks30 ? 213 : 212],
            operated,
          )
        : "–";
    const extWork =
      leftData && rightData
        ? symmetryPercent(
            rightData[isEks30 ? 204 : 203],
            leftData[isEks30 ? 204 : 203],
            operated,
          )
        : "–";

    const torqFlexSymm =
      leftData && rightData
        ? symmetryPercent(rightData[flexIdx], leftData[flexIdx], operated)
        : "–";
    const workFlexSymm =
      leftData && rightData
        ? symmetryPercent(
            rightData[isEks30 ? 212 : 213],
            leftData[isEks30 ? 212 : 213],
            operated,
          )
        : "–";
    const flexWork =
      leftData && rightData
        ? symmetryPercent(
            rightData[isEks30 ? 203 : 204],
            leftData[isEks30 ? 203 : 204],
            operated,
          )
        : "–";
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, 14, y);

    // prepare table rows
    const rows = [
      ["Etureisi", "", "", ""],
      [
        "Huippuvääntö (Nm)",
        getVal(rightData, extIdx),
        getVal(leftData, extIdx),
        torqExtSymm,
      ],
      [
        "Kokonaistyö (J)",
        getVal(rightData, isEks30 ? 213 : 212),
        getVal(leftData, isEks30 ? 213 : 212),
        workExtSymm,
      ],
      [
        "Huippuvääntö / BW",
        getVal(rightData, isEks30 ? 204 : 203),
        getVal(leftData, isEks30 ? 204 : 203),
        extWork,
      ],
      ["Takareisi", "", "", ""],
      [
        "Huippuvääntö (Nm)",
        getVal(rightData, flexIdx),
        getVal(leftData, flexIdx),
        torqFlexSymm,
      ],
      [
        "Kokonaistyö (J)",
        getVal(rightData, isEks30 ? 212 : 213),
        getVal(leftData, isEks30 ? 212 : 213),
        workFlexSymm,
      ],
      [
        "Huippuvääntö / BW",
        getVal(rightData, isEks30 ? 203 : 204),
        getVal(leftData, isEks30 ? 203 : 204),
        flexWork,
      ],
      [
        "HQ-ratio (%)",
        rightData ? symmetryPercent(rightData[212], rightData[213]) : "–",
        leftData ? symmetryPercent(leftData[212], leftData[213]) : "–",
        "",
      ],
    ];

    // render table
    autoTable(pdf, {
      startY: y + 2,
      head: [["", rightHeader, leftHeader, "LSI %"]],
      body: rows,
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 0.6, minCellHeight: 4.5 },
      headStyles: { fillColor: [230, 230, 230], textColor: 0, fontSize: 8.5 },
      tableWidth: 110,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const val = parseFloat(data.cell.text[0]);
          if (!isNaN(val)) {
            data.cell.styles.textColor = val < 90 ? [200, 0, 0] : [0, 150, 0];
          }
        }
      },
    });

    if (leftData && rightData) {
      const barY = y + 12.2;
      drawSymmetryBar(pdf, 130, barY, torqExtSymm);
      drawSymmetryBar(pdf, 130, barY + 4.8, workExtSymm);
      drawSymmetryBar(pdf, 130, barY + 9.6, extWork);
      drawSymmetryBar(pdf, 130, barY + 18.8, torqFlexSymm);
      drawSymmetryBar(pdf, 130, barY + 23.6, workFlexSymm);
      drawSymmetryBar(pdf, 130, barY + 28.5, flexWork);
    }

    y = pdf.lastAutoTable.finalY + 5;
  }

  for (const { key, title } of TESTS) {
    const test = groups[key];
    if (!test) continue;
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, 14, y);
    y = renderReportTable(
      pdf,
      reportRows(key, test, referenceSet, operated),
      y + 2,
    ) + 5;
  }

  // Calculate mixed ratio for kons240 + eks30
  const kons240 = groups["kons240"];
  const eks30 = groups["eks30"];
  if (kons240 && eks30) {
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

    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Mixed Ratio", 14, y);

    // render mixed ratio table
    const mixedRows = [
      [
        "Mixed Ratio (%)      ",
        hasRight ? padRoundDecimalsToLength(mixedRight, 3) : "–",
        hasLeft ? padRoundDecimalsToLength(mixedLeft, 3) : "–",
        mixedSymm,
      ],
    ];

    autoTable(pdf, {
      startY: y + 5,
      head: [["", rightHeader, leftHeader, "LSI %"]],
      body: mixedRows,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 1 },
      headStyles: { fillColor: [230, 230, 230], textColor: 0 },
      tableWidth: 110,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const val = parseFloat(data.cell.text[0]);
          if (!isNaN(val)) {
            data.cell.styles.textColor = val < 90 ? [200, 0, 0] : [0, 150, 0];
          }
        }
      },
    });
    const barY = pdf.lastAutoTable.finalY - 5;
    if (!isNaN(parseFloat(mixedSymm))) {
      drawSymmetryBar(pdf, 130, barY, mixedSymm);
    }
    y = pdf.lastAutoTable.finalY + 7;
  }

  drawReportLegend(pdf, Math.min(y, 260));

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

    drawColorKey(pdf);

    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(testDef.title, 85, 35);
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(11);
    // add PNG images
    let x = -11;
    for (const { dataUrl, width, height } of pngs) {
      const pdfWidth = width * 0.2646; // convert px to mm
      const pdfHeight = height * 0.2646; // convert px to mm
      pdf.addImage(dataUrl, "PNG", x, 60, pdfWidth, pdfHeight);
      x += 100;
    }

    // render analysis tables for the other pages
    addAnalysisTable(pdf, group, patientInfo, testDef.key);
  }
  const patientMeasurements = files[0].rawObject.measurement;
  const [dd, mm, yyyy] = patientMeasurements["date(dd/mm/yyyy)"].split(".");
  const formattedDate = `${yyyy}-${mm}-${dd}`;
  // convert to lowercase if the value exists, otherwise empty string
  const firstName = String(patientInfo.subjectNameFirst).toLowerCase();
  const lastName = String(patientInfo.subjectName).toLowerCase();
  const namePart = [firstName, lastName].filter(s => s).join("-");
  pdf.save(`${namePart}_${formattedDate}.pdf`);
}
