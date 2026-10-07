import {symmetryPercent, padRoundDecimalsToLength} from "./numberUtils.js";
import * as numberUtils from "./numberUtils.js";
import {referenceNumberText} from "./referenceFormatting.js";
import {mixedRatio, reportMetricIndices, movementChannelMetricIndices, isEccentricProtocol, hqRatioFromChannels} from "./reportMetricDefinitions.js";
const reportColors = {ink: [42, 57, 64]};

const getVal = (data, idx) => {
  if (!data || typeof data[idx] !== "number") return "–";
  return padRoundDecimalsToLength(Math.abs(data[idx]), 3);
};

const metricReference = (referenceSet, testKey, key) =>
  referenceSet?.metrics?.[testKey]?.[key] ?? null;

function referenceStatus(value, reference) {
  if (!numberUtils.isNumber(value) || !reference) return "none";
  const numericValue = Math.abs(value);
  if (reference.minimum != null && reference.maximum != null) {
    return numericValue >= Number(reference.minimum) && numericValue <= Number(reference.maximum) ? "none" : "fail";
  }
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
  if (reference.minimum != null && reference.maximum != null) return `${reference.minimum}-${reference.maximum}`;
  if (reference.minimum != null) return `≥ ${reference.minimum}`;
  return `${referenceNumberText(reference.mean, reference)} ± ${referenceNumberText(reference.sd, reference)}`;
};

const hqValue = (analysis, testKey, metric) => {
  const channels = movementChannelMetricIndices(metric);
  return hqRatioFromChannels(analysis?.[channels.Ext], analysis?.[channels.Flex], testKey) * 100;
};

const normalizeSide = (side) => {
  const value = String(side ?? "").toLowerCase();
  if (value === "right" || value.includes("oikea")) return "right";
  if (value === "left" || value.includes("vasen")) return "left";
  return null;
};

/**
 * PDF tables always read from the comparator side to the involved side.
 * If no side has been resolved, retain a stable right-to-left fallback; the
 * normal PDF workflow resolves a comparison side from the 60°/s test first.
 */
export function reportLegOrder(involvedSide) {
  const involved = normalizeSide(involvedSide) ?? "left";
  return {
    involvedSide: involved,
    referenceSide: involved === "right" ? "left" : "right",
  };
}

export function reportLegLabels(involvedSide) {
  const order = reportLegOrder(involvedSide);
  const label = side => side === "left" ? "Vasen" : "Oikea";
  return {reference: label(order.referenceSide), involved: label(order.involvedSide)};
}

function orderedValues(rightValue, leftValue, rightStatus, leftStatus, order) {
  const involvedIsRight = order.involvedSide === "right";
  return involvedIsRight
    ? {referenceValue: leftValue, involvedValue: rightValue, referenceStatus: leftStatus, involvedStatus: rightStatus}
    : {referenceValue: rightValue, involvedValue: leftValue, referenceStatus: rightStatus, involvedStatus: leftStatus};
}

export function reportRows(testKey, group, referenceSet, operated, allGroups = {}, options = {}) {
  const isEccentric = isEccentricProtocol(testKey);
  const isEndurance = testKey === "kons180";
  const includeDetails = options.includeDetails === true;
  const right = group?.right;
  const left = group?.left;
  const order = reportLegOrder(operated);

  // The mapping is muscle-specific (including the eccentric protocol), not
  // side-specific. Therefore the same index must always be used for right and
  // left when calculating LSI.
  const {quadriceps: quadricepsIndices, hamstrings: hamstringsIndices} = reportMetricIndices(testKey);

  const definitionsFor = (indices, referenceSuffix) => {
    const definitions = [
      ["Huippuvääntö (Nm)", indices.torque, `torque${referenceSuffix}`],
      ["Huippuvääntö (Nm / kg)", indices.bw, `bw${referenceSuffix}`],
      ["Työ keskimäärin (J)", indices.averageWork, `averageWork${referenceSuffix}`],
    ];
    if (isEndurance) definitions.push(["Kokonaistyö (J)", indices.totalWork, `work${referenceSuffix}`]);
    if (includeDetails) {
      definitions.push(
        ["Vääntö 0,2 s kohdalla (Nm)", indices.at200, `at200${referenceSuffix}`],
        ["Kulma huippuväännössä (°)", indices.peakAngle, `peakAngle${referenceSuffix}`, {noStatus: true, noSymmetry: true}],
      );
      if (isEndurance) definitions.push(["Työväsymisindeksi (J/s)", indices.workFatigue, `fatigue${referenceSuffix}`]);
      else definitions.push(["Huippuväännön vaihtelu (%)", indices.peakTorqueCV, `peakTorqueCV${referenceSuffix}`, {noStatus: true, noSymmetry: true}]);
    }
    return definitions;
  };

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
    definitions.forEach(([label, index, referenceKey, rowOptions = {}]) => {
      const rightValue = right?.[index];
      const leftValue = left?.[index];
      const values = orderedValues(rightValue, leftValue, null, null, order);
      const lsi = !rowOptions.noSymmetry && right && left
        ? symmetryPercent(rightValue, leftValue, order.involvedSide === "right" ? "oikea" : "vasen")
        : "–";
      const reference = metricReference(referenceSet, testKey, referenceKey);
      const rightStatus = rowOptions.noStatus ? "none" : referenceStatus(rightValue, reference);
      const leftStatus = rowOptions.noStatus ? "none" : referenceStatus(leftValue, reference);
      const statuses = orderedValues(rightValue, leftValue, rightStatus, leftStatus, order);
      rows.push({
        cells: [label, getVal({0: values.referenceValue}, 0), "", getVal({0: values.involvedValue}, 0), lsi, referenceText(reference), ""],
        referenceStatus: statuses.referenceStatus,
        involvedStatus: statuses.involvedStatus,
        symmetry: parseFloat(lsi),
        hasReference: Boolean(reference),
        noStatus: rowOptions.noStatus,
        noBar: rowOptions.noSymmetry,
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
    const mixedReference = metricReference(referenceSet, testKey, "mixedRatio");
    const values = orderedValues(
      rightMixed,
      leftMixed,
      referenceStatus(rightMixed, mixedReference),
      referenceStatus(leftMixed, mixedReference),
      order,
    );
    rows.push({
      cells: ["Mixed-ratio (%)", getVal({0: values.referenceValue}, 0), "", getVal({0: values.involvedValue}, 0), "–", referenceText(mixedReference), ""],
      referenceStatus: values.referenceStatus,
      involvedStatus: values.involvedStatus,
      symmetry: null,
      noBar: true,
      hasReference: Boolean(mixedReference),
    });
  } else if (right || left) {
    if (isEndurance && includeDetails) {
      const rightTotal = Math.abs(Number(right?.[quadricepsIndices.totalWork]) || 0) + Math.abs(Number(right?.[hamstringsIndices.totalWork]) || 0);
      const leftTotal = Math.abs(Number(left?.[quadricepsIndices.totalWork]) || 0) + Math.abs(Number(left?.[hamstringsIndices.totalWork]) || 0);
      const values = orderedValues(rightTotal, leftTotal, "none", "none", order);
      const lsi = right && left
        ? symmetryPercent(rightTotal, leftTotal, order.involvedSide === "right" ? "oikea" : "vasen")
        : "–";
      rows.push({
        cells: ["Kokonaistyö: ojennus + koukistus (J)", getVal({0: values.referenceValue}, 0), "", getVal({0: values.involvedValue}, 0), lsi, "–", ""],
        referenceStatus: "none",
        involvedStatus: "none",
        symmetry: parseFloat(lsi),
        hasReference: false,
      });
    }
    const peakHqRef = metricReference(referenceSet, testKey, "hqPeak");
    if (isEndurance && includeDetails && peakHqRef) {
      const rightPeakHq = hqValue(right, testKey, "torque");
      const leftPeakHq = hqValue(left, testKey, "torque");
      const values = orderedValues(rightPeakHq, leftPeakHq,
        referenceStatus(rightPeakHq, peakHqRef), referenceStatus(leftPeakHq, peakHqRef), order);
      rows.push({cells: ["Huippuväännön HQ-suhde (%)", getVal({0: values.referenceValue}, 0), "", getVal({0: values.involvedValue}, 0), "–", referenceText(peakHqRef), ""],
        referenceStatus: values.referenceStatus, involvedStatus: values.involvedStatus,
        symmetry: null, hasReference: true, noBar: true, isHq: true});
    }
    const rightHq = hqValue(right, testKey, isEndurance ? "averageWork" : "meanPeak");
    const leftHq = hqValue(left, testKey, isEndurance ? "averageWork" : "meanPeak");
    const hqRef = metricReference(referenceSet, testKey, "hq");
    const values = orderedValues(rightHq, leftHq, referenceStatus(rightHq, hqRef), referenceStatus(leftHq, hqRef), order);
    rows.push({
      cells: ["HQ-ratio (%)", getVal({0: values.referenceValue}, 0), "", getVal({0: values.involvedValue}, 0), "–", referenceText(hqRef), ""],
      referenceStatus: values.referenceStatus,
      involvedStatus: values.involvedStatus,
      symmetry: null,
      hasReference: Boolean(hqRef),
      noBar: true,
      isHq: true,
    });
  }
  return rows;
}
