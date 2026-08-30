import { asserts } from "../collections/collections";
import { arrayUtils, numberUtils, stringUtils } from "./utils";
import { applyGravityCorrection } from "./gravityCorrection.js";
import {
  createMarkerBasedRepetitionSplits,
  createMovementBasedRepetitionSplits,
} from "./repetitionUtils.js";

// README.MD will contain more specific information what split and point collections mean

const ctmTextToRawObject = (text) => {
  const sections = text.split(/\[(.*)\]/g);
  const rawObject = {};

  for (let i = 1; i < sections.length; i += 2) {
    const header = sections[i];
    const data = sections[i + 1];
    rawObject[header] = data
      .replaceAll("\r", "")
      .trim()
      .split("\n")
      .map((row) => row.trim().split("\t"));
  }

  return rawObject;
};

const cleanMemo = (memoText) => {
  return memoText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
};

// Generic parser to turn number like strings to numbers and destructure arrays with one value
// Known issue is that an empty array will just stay as empty array and will not be turned into null
const createParsedSectionFromRawObjectSection = (rawObjectSection) => {
  let formattedObject = {};

  for (const [key, ...values] of rawObjectSection) {
    if (values.length === 1) {
      formattedObject[stringUtils.toCebabCase(key)] = numberUtils.parseIfNumber(
        values[0],
      );
    } else {
      formattedObject[stringUtils.toCebabCase(key)] = values.map(
        numberUtils.parseIfNumber,
      );
    }
  }
  return formattedObject;
};

// Create a generic split collection for points that don't need any special math
const createSplitCollection = (
  markersByIndex,
  points,
  moveMarkerToLastZeroValue,
  disabledList,
) => {
  const collection = createMarkerBasedRepetitionSplits(
    markersByIndex,
    disabledList,
  );

  if (!moveMarkerToLastZeroValue) {
    return collection;
  }

  collection.splits.forEach((split) => {
    while (
      split.startIndex < split.endIndex &&
      points[split.startIndex + 1] === 0
    ) {
      split.startIndex++;
    }

    while (
      split.endIndex > split.startIndex &&
      points[split.endIndex - 1] === 0
    ) {
      split.endIndex--;
    }
  });

  return collection;
};

const createAverageSplitCollection = (splits, color, disabledList) => {
  const collection = {
    startIndex: 0,
    endIndex: null,
    splits: [],
  };

  splits.forEach((split, i) => {
    if (split.color !== color || disabledList[i]) {
      return;
    }

    const delta = split.endIndex - split.startIndex;
    collection.endIndex ??= delta;
    if (collection.endIndex > delta) {
      collection.endIndex = delta;
    }
  });

  if (collection.endIndex) {
    collection.splits.push({
      color,
      startIndex: 0,
      endIndex: collection.endIndex,
    });
  }

  collection.endIndex ??= 0;

  return collection;
};

const createFilteredTorquePointCollection = (goodAngleSplits, torquePoints) => {
  const points = Array(torquePoints.length).fill(0);

  const filter = createLowpass11HzRoundToZero(256);
  goodAngleSplits.forEach((split) => {
    let highestValueIndex;
    let max;
    for (let i = split.startIndex; i <= split.endIndex; i++) {
      let absValue = Math.abs(torquePoints[i]);
      max ??= absValue;
      highestValueIndex ??= i;
      if (absValue > max) {
        max = absValue;
        highestValueIndex = i;
      }
    }

    asserts.assertFalsy(
      highestValueIndex < split.startIndex ||
        highestValueIndex > split.endIndex,
      "highestValueIndex is out of bounds",
    );
    filter.reset(0);
    for (let i = split.startIndex; i <= highestValueIndex; i++) {
      points[i] = numberUtils.truncDecimals(filter.process(torquePoints[i]), 3);
    }

    filter.reset(0);
    for (let i = split.endIndex; i >= highestValueIndex; i--) {
      points[i] = numberUtils.truncDecimals(filter.process(torquePoints[i]), 3);
    }
  });

  return {
    points,
    maxValue: arrayUtils.maxValue(points, 0),
    minValue: arrayUtils.minValue(points, 0),
  };
};

// Because split and point collections are so dependent on each other it's just easier to create them inside one function call
// This function returns all split and point collections the application uses
const createCollections = (
  markersByIndex,
  data,
  speeds,
  dataFiltering,
  disabledList,
  isEccentric,
) => {
  // ========================= POINTS =============================
  const anglePointCollection = createPointCollection(
    markersByIndex,
    data.map((row) => row[2]),
  );
  const torquePoints = data.map((row) => row[0]);
  const speedPoints = data.map((row) => row[1]);
  // Move markers identify each repetition. Inside every marker interval, only
  // the continuous movement portion is used for torque, power and work so the
  // stationary force produced during a direction change is not reported.
  const movementSplitCollection = createMovementBasedRepetitionSplits(
    markersByIndex,
    speedPoints,
    speeds,
    disabledList,
  );
  let torquePointCollection;
  if (dataFiltering) {
    // torquePointCollection = createPointCollection(lowpass11Hz(markersByIndex, fillZerosToPower(markersByIndex, torquePoints, anglePointCollection.points)));
    torquePointCollection = createFilteredTorquePointCollection(
      movementSplitCollection.splits,
      torquePoints,
    );
  } else {
    torquePointCollection = createPointCollection(markersByIndex, torquePoints);
  }
  const torqueSplitCollection = createSplitCollection(
    markersByIndex,
    torquePointCollection.points,
    dataFiltering,
    disabledList,
  );
  const dynamicAngleSplitCollection = dataFiltering
    ? torqueSplitCollection
    : movementSplitCollection;

  const unifiedAngleSplitsCollection =
    createSmallestAngleSampleSizePointCollection(
      dynamicAngleSplitCollection.splits,
      anglePointCollection.points,
    );
  const [averagePowerFlexCollection, errorFlex] = createAveragePointCollection(
    "blue",
    torquePoints,
    unifiedAngleSplitsCollection.splits,
    dataFiltering,
    0.8,
  );
  const [averagePowerExtCollection, errorExt] = createAveragePointCollection(
    "red",
    torquePoints,
    unifiedAngleSplitsCollection.splits,
    dataFiltering,
    0.8,
  );
  const [angleSpecificHQRatioPointCollection, errorHQRatio] =
    createAngleSpecificHQRatioPointCollection(
      torquePoints,
      anglePointCollection.points,
      unifiedAngleSplitsCollection.splits,
      dataFiltering,
      isEccentric,
    );

  const angleSpecificHQRatioSplitCollection =
    createAngleSpecificHQRatioSplitCollection(
      angleSpecificHQRatioPointCollection,
    );

  const pointCollections = {
    power: torquePointCollection,
    speed: createPointCollection(
      markersByIndex,
      speedPoints,
    ),
    angle: anglePointCollection,
    averagePowerFlex: averagePowerFlexCollection,
    averagePowerExt: averagePowerExtCollection,
    angleSpecificHQRatio: angleSpecificHQRatioPointCollection,
    angleSpecificHQRatioError: errorHQRatio,
    averagePowerFlexError: errorFlex,
    averagePowerExtError: errorExt,
  };

  // ========================= SPLITS =============================

  return {
    points: pointCollections,
    splits: {
      power: torqueSplitCollection,
      speed: createSplitCollection(
        markersByIndex,
        pointCollections.speed.points,
        false,
        disabledList,
      ),
      angle: createSplitCollection(
        markersByIndex,
        pointCollections.angle.points,
        false,
        disabledList,
      ),
      averagePowerFlex: createAverageSplitCollection(
        unifiedAngleSplitsCollection.splits,
        "blue",
        disabledList,
      ),
      averagePowerExt: createAverageSplitCollection(
        unifiedAngleSplitsCollection.splits,
        "red",
        disabledList,
      ),
      angleSpecificHQRatio: angleSpecificHQRatioSplitCollection,
      movement: movementSplitCollection,
    },
  };
};

function createAngleSpecificHQRatioSplitCollection(
  angleSpecificPointCollection,
) {
  const splitCollection = {
    splits: [],
    startIndex: angleSpecificPointCollection.startIndex,
    endIndex: angleSpecificPointCollection.endIndex,
  };

  if (splitCollection.endIndex) {
    splitCollection.splits.push({
      startIndex: 0,
      endIndex: splitCollection.endIndex,
    });
  }

  return splitCollection;
}

function createAngleSpecificHQRatioPointCollection(
  torquePoints,
  anglePoints,
  splits,
  dataFiltering,
  isEccentric = false,
) {
  const averages = [],
    lowest = [],
    highest = [];
  const pointsCollection = {
    maxValue: 0,
    minValue: 0,
    minAngle: 0,
    maxAngle: 0,
    endIndex: 0,
    startIndex: 0,
    points: averages,
  };
  const errorBandCollection = {
    maxValue: 0,
    minValue: 0,
    points: [lowest, highest],
  };

  const returnValue = [pointsCollection, errorBandCollection];

  let minAngle, maxAngle;
  for (const split of splits) {
    if (split.disabled) {
      continue;
    }

    minAngle = numberUtils.min(split.minAngle, minAngle);
    maxAngle = numberUtils.max(split.maxAngle, maxAngle);

    // Flex and ext sample size is same, but the angles are not matching so early return
    if (split.maxAngle < minAngle || split.minAngle > maxAngle) {
      return returnValue;
    }
  }

  if (minAngle == null) {
    return returnValue;
  }

  asserts.assertTypeNumber(minAngle, "minAngle");
  asserts.assertTypeNumber(minAngle, "minAngle");
  pointsCollection.minAngle = minAngle;
  pointsCollection.maxAngle = maxAngle;

  let sampleSize;
  for (const split of splits) {
    if (split.disabled) {
      continue;
    }

    const isExt = split.color === "red";

    const startIndex = isExt
      ? arrayUtils.findIndex(
          anglePoints,
          (angle) => angle >= minAngle,
          split.startIndex,
        )
      : arrayUtils.findIndex(
          anglePoints,
          (angle) => angle <= maxAngle,
          split.startIndex,
        );
    const endIndex = isExt
      ? arrayUtils.findLastIndex(
          anglePoints,
          (angle) => angle <= maxAngle,
          split.endIndex,
        )
      : arrayUtils.findLastIndex(
          anglePoints,
          (angle) => angle >= minAngle,
          split.endIndex,
        );
    const currentSampleSize = endIndex - startIndex;

    asserts.assertTruthy(startIndex >= split.startIndex);
    asserts.assertTruthy(endIndex <= split.endIndex);

    // Flex and ext are not same size so early exit
    if (
      sampleSize &&
      numberUtils.absDelta(currentSampleSize, sampleSize) > 100
    ) {
      return returnValue;
    }

    sampleSize = numberUtils.min(currentSampleSize, sampleSize);
  }

  asserts.assertTypeNumber(sampleSize, "sampleSize");
  pointsCollection.endIndex = Math.max(sampleSize - 1, 0);

  const averagesExt = [],
    lowestExt = [],
    highestExt = [];
  const averagesFlex = [],
    lowestFlex = [],
    highestFlex = [];
  let repetitions = 0;
  splits.forEach((split) => {
    if (split.disabled) {
      return;
    }

    const isExt = split.color === "red";
    const currentAverages = isExt ? averagesExt : averagesFlex;
    const currentLowest = isExt ? lowestExt : lowestFlex;
    const currentHighest = isExt ? highestExt : highestFlex;

    const indexOffset = isExt
      ? arrayUtils.findLastIndex(
          anglePoints,
          (angle) => angle <= maxAngle,
          split.endIndex,
        )
      : arrayUtils.findIndex(
          anglePoints,
          (angle) => angle >= minAngle,
          split.startIndex,
        );
    const extFactor = numberUtils.trueToOneAndFalseToNegativeOne(!isExt);
    repetitions++;

    const middleValue =
      torquePoints[indexOffset + Math.floor(sampleSize / 2) * extFactor];
    const t = numberUtils.trueToOneAndFalseToNegativeOne(middleValue > 0);
    for (let i = 0; i <= sampleSize; i++) {
      const value = Math.max(torquePoints[indexOffset + i * extFactor] * t, 0);

      currentAverages[i] ??= 0;
      currentAverages[i] += value;
      currentLowest[i] = numberUtils.min(currentLowest[i], value);
      currentHighest[i] = numberUtils.max(currentHighest[i], value);
    }
  });

  asserts.assertTruthy(repetitions > 0, "Repetitions cant be zero");
  asserts.assertTruthy(
    averagesExt.length === averagesFlex.length,
    "Average lengths mis match",
  );
  asserts.assert1DArrayOfNumbersOrEmptyArray(averagesExt);
  asserts.assert1DArrayOfNumbersOrEmptyArray(averagesFlex);

  if (dataFiltering) {
    const averageFilter = createLowpass11Hz(256);
    for (let i = 0; i < averagesExt.length; i++) {
      if (averagesExt[i] === 0) {
        averages[i] = 0;
      } else {
        const average = numberUtils.truncDecimals(
          averageFilter.process(
            (isEccentric ? averagesExt[i] : averagesFlex[i]) /
              repetitions /
              ((isEccentric ? averagesFlex[i] : averagesExt[i]) / repetitions),
          ),
          3,
        );
        averages[i] = average;
      }
    }
  } else {
    for (let i = 0; i < averagesExt.length; i++) {
      if (averagesExt[i] === 0) {
        averages[i] = 0;
      } else {
        const average = numberUtils.truncDecimals(
          (isEccentric ? averagesExt[i] : averagesFlex[i]) /
            repetitions /
            ((isEccentric ? averagesFlex[i] : averagesExt[i]) / repetitions),
          3,
        );
        averages[i] = average;
      }
    }
  }

  pointsCollection.maxValue = arrayUtils.maxValue(averages) || 0;
  pointsCollection.minValue = arrayUtils.minValue(averages) || 0;

  return returnValue;
}

const createLowpass11HzRoundToZero = (sampleRate) => {
  asserts.assertFalsy(!sampleRate || sampleRate <= 0, "sampleRate must be > 0");

  const fc = 11.0;
  const omega = 2 * Math.PI * fc;
  const alpha = omega / (sampleRate + omega);

  let y = 0.0;
  return {
    process(x) {
      y = y + alpha * (x - y);
      return y;
    },

    reset(value = 0.0) {
      y = value;
    },
  };
};

const createLowpass11Hz = (sampleRate) => {
  asserts.assertFalsy(!sampleRate || sampleRate <= 0, "sampleRate must be > 0");

  const fc = 11.0;
  const omega = 2 * Math.PI * fc;
  const alpha = omega / (sampleRate + omega);

  let y = 0.0;
  return {
    process(x) {
      if (y === 0) {
        y = x;
      } else {
        y = y + alpha * (x - y);
      }

      return y;
    },

    reset(value = 0.0) {
      y = value;
    },
  };
};

const createRepetitionsSection = (points, splits, sampleRate) => {
  const samplerate = sampleRate;
  const dt = 1 / samplerate; 
  const resultsByColor = { red: [], blue: [] };

  splits.forEach(({ startIndex, endIndex, color, disabled }) => {
    if (disabled) {
      return;
    }
    // Initialize metrics for this segment
    let torqueExtreme = 0;
    let speedExtreme = 0;
    let work = 0;
    let powerSum = 0;
    let speedSum = 0;
    let powerPeak = -Infinity;
    let torquePeakAngle = 0;
    let speedPeakAngle = 0;
    let torquePeakIndex = startIndex;
    let speedPeakIndex = startIndex;
    let count = 0;

    // Iterate over data points to calculate torque, speed, power, and work
    // Track peaks, averages, and extremes
    for (let i = startIndex; i < endIndex; i++) {
      const torque = points.power.points[i];
      const speed = points.speed.points[i];
      const angle = points.angle.points[i];
      const omega = numberUtils.toRad(speed);
      const power = torque * omega;

      powerSum += power;
      speedSum += speed;
      count++;
      if (power > powerPeak) powerPeak = power;

      // Calculate work using trapezoidal rule
      if (i < endIndex - 1) {
        const tau0 = torque;
        const tau1 = points.power.points[i + 1];
        const theta0 = numberUtils.toRad(angle);
        const theta1 = numberUtils.toRad(points.angle.points[i + 1]);
        work += 0.5 * (tau0 + tau1) * (theta1 - theta0);
      }

      if (Math.abs(0 + torque) > Math.abs(torqueExtreme)) {
        torqueExtreme = torque;
        torquePeakAngle = angle;
        torquePeakIndex = i;
      }
      if (Math.abs(0 + speed) > Math.abs(speedExtreme)) {
        speedExtreme = speed;
        speedPeakAngle = angle;
        speedPeakIndex = i;
      }
    }

    const timeToPeak = (torquePeakIndex - startIndex) * dt;
    const torqueAt200msIndex = Math.min(
      startIndex + Math.round(0.2 * samplerate),
      endIndex,
    );
    const speedToPeak = (speedPeakIndex - startIndex) * dt;
    const startTime = startIndex * dt;

    resultsByColor[color].push({
      color,
      torqueExtreme,
      speedExtreme,
      work,
      powerPeak,
      powerAv: powerSum / count,
      speedAv: speedSum / count,
      torquePeakAngle,
      timeToPeak,
      torqueAt200ms: points.power.points[torqueAt200msIndex],
      speedToPeak,
      startTime,
      speedPeakAngle,
    });
  });
  return {
    torquePeak1: resultsByColor.red.map((r) => r.torqueExtreme),
    torquePeak2: resultsByColor.blue.map((r) => r.torqueExtreme),
    speedPeak1: resultsByColor.red.map((r) => r.speedExtreme),
    speedPeak2: resultsByColor.blue.map((r) => r.speedExtreme),
    work1: resultsByColor.red.map((r) => r.work),
    work2: resultsByColor.blue.map((r) => r.work),
    powerAvg1: resultsByColor.red.map((r) => r.powerAv),
    powerAvg2: resultsByColor.blue.map((r) => r.powerAv),
    speedAv1: resultsByColor.red.map((r) => r.speedAv),
    speedAv2: resultsByColor.blue.map((r) => r.speedAv),
    powerPeak1: resultsByColor.red.map((r) => r.powerPeak),
    powerPeak2: resultsByColor.blue.map((r) => r.powerPeak),
    torquePeakPos1: resultsByColor.red.map((r) => r.torquePeakAngle),
    torquePeakPos2: resultsByColor.blue.map((r) => r.torquePeakAngle),
    timeToPeak1: resultsByColor.red.map((r) => r.timeToPeak),
    timeToPeak2: resultsByColor.blue.map((r) => r.timeToPeak),
    torqueAt200ms1: resultsByColor.red.map((r) => r.torqueAt200ms),
    torqueAt200ms2: resultsByColor.blue.map((r) => r.torqueAt200ms),
    speedToPeak1: resultsByColor.red.map((r) => r.speedToPeak),
    speedToPeak2: resultsByColor.blue.map((r) => r.speedToPeak),
    startTime1: resultsByColor.red.map((r) => r.startTime),
    startTime2: resultsByColor.blue.map((r) => r.startTime),
    speedPeakPos1: resultsByColor.red.map((r) => r.speedPeakAngle),
    speedPeakPos2: resultsByColor.blue.map((r) => r.speedPeakAngle),
  };
};
// Computes summary metrics from repetitions
const createAnalysis = (repetitions, weight) => {
  return {
    110: arrayUtils.maxValue(repetitions.torquePeak1),
    111: arrayUtils.minValue(repetitions.torquePeak2),
    112: arrayUtils.average(repetitions.torquePeak1),
    113: arrayUtils.average(repetitions.torquePeak2),
    114: arrayUtils.average(repetitions.torquePeakPos1),
    115: arrayUtils.average(repetitions.torquePeakPos2),
    116: arrayUtils.average(repetitions.timeToPeak1),
    117: arrayUtils.average(repetitions.timeToPeak2),
    120: arrayUtils.average(repetitions.torqueAt200ms1),
    121: arrayUtils.average(repetitions.torqueAt200ms2),
    122: arrayUtils.average(repetitions.work1),
    123: arrayUtils.average(repetitions.work2),
    124: arrayUtils.average(repetitions.powerAvg1),
    125: arrayUtils.average(repetitions.powerAvg2),
    130: arrayUtils.linearSlope(repetitions.startTime1, repetitions.work1),
    131: arrayUtils.linearSlope(repetitions.startTime2, repetitions.work2),
    132: "TODO Expected Deviation Ext	%",
    133: "TODO Expected Deviation Flex	%",
    136: arrayUtils.maxValue(repetitions.speedPeak1),
    137: arrayUtils.maxValue(repetitions.speedPeak2),
    138: arrayUtils.average(repetitions.speedPeak1),
    139: arrayUtils.average(repetitions.speedPeak2),
    140: arrayUtils.average(repetitions.speedPeakPos1),
    141: arrayUtils.average(repetitions.speedPeakPos2),
    142: arrayUtils.average(repetitions.speedToPeak1),
    143: arrayUtils.average(repetitions.speedToPeak2),
    144: arrayUtils.average(repetitions.speedAv1),
    145: arrayUtils.average(repetitions.speedAv2),
    146: arrayUtils.maxValue(repetitions.powerPeak1),
    147: arrayUtils.maxValue(repetitions.powerPeak2),
    148: arrayUtils.average(repetitions.powerPeak1),
    149: arrayUtils.average(repetitions.powerPeak2),
    150: arrayUtils.average(repetitions.powerPeak1) / weight,
    151: arrayUtils.average(repetitions.powerPeak2) / weight,
    200: Math.abs(
      (arrayUtils.average(repetitions.torquePeak2) /
        arrayUtils.average(repetitions.torquePeak1)) *
        100,
    ),
    201:
      (arrayUtils.average(repetitions.work2) /
        arrayUtils.average(repetitions.work1)) *
      100,
    202:
      (arrayUtils.average(repetitions.powerAvg2) /
        arrayUtils.average(repetitions.powerAvg1)) *
      100,
    203: arrayUtils.maxValue(repetitions.torquePeak1) / weight,
    204: arrayUtils.maxValue(repetitions.torquePeak2) / weight,
    205: arrayUtils.average(repetitions.work1) / weight,
    206: arrayUtils.average(repetitions.work2) / weight,
    207: arrayUtils.average(repetitions.powerAvg1) / weight,
    208: arrayUtils.average(repetitions.powerAvg2) / weight,
    212: arrayUtils.sum(repetitions.work1),
    213: arrayUtils.sum(repetitions.work2),
    225: arrayUtils.sum(repetitions.work1) + arrayUtils.sum(repetitions.work2),
    226:
      (arrayUtils.average(repetitions.powerPeak2) /
        arrayUtils.average(repetitions.powerPeak1)) *
      100,
    250: arrayUtils.stdDev(repetitions.torquePeak1),
    251: arrayUtils.stdDev(repetitions.torquePeak2),
    254: arrayUtils.stdDev(repetitions.work1),
    255: arrayUtils.stdDev(repetitions.work2),
    256: arrayUtils.stdDev(repetitions.powerAvg1),
    257: arrayUtils.stdDev(repetitions.powerAvg2),
    258: arrayUtils.stdDev(repetitions.powerPeak1),
    259: arrayUtils.stdDev(repetitions.powerPeak2),
    260: arrayUtils.coeffVar(repetitions.torquePeak1),
    261: arrayUtils.coeffVar(repetitions.torquePeak2),
    264: arrayUtils.coeffVar(repetitions.work1),
    265: arrayUtils.coeffVar(repetitions.work2),
    266: arrayUtils.coeffVar(repetitions.powerAvg1),
    267: arrayUtils.coeffVar(repetitions.powerAvg2),
    268: arrayUtils.coeffVar(repetitions.powerPeak1),
    269: arrayUtils.coeffVar(repetitions.powerPeak2),
  };
};

// Create generic point collection object
const createPointCollection = (markersByIndex, points) => {
  const pointCollection = { points };

  const start = markersByIndex.move1[0];
  const end = markersByIndex.move1.at(-1);

  for (let i = start; i < end; i++) {
    const point = points[i];
    pointCollection.maxValue ??= point;
    pointCollection.minValue ??= point;

    if (pointCollection.maxValue < point) {
      pointCollection.maxValue = point;
    } else if (pointCollection.minValue > point) {
      pointCollection.minValue = point;
    }
  }

  return pointCollection;
};


const createAveragePointCollection = (
  color,
  torquePoints,
  splits,
  dataFiltering,
  errorPercentage,
) => {
  const averages = [],
    highest = [],
    lowest = [];
  const averageCollection = { points: averages };
  const errorBandCollection = { points: [lowest, highest] };
  let count = 0;

  splits.forEach((split) => {
    if (split.disabled || split.color !== color) {
      return;
    }

    count++;
    const reverse = split.color === "red";
    const length = split.endIndex - split.startIndex;
    const valueFromMiddleOfSplit =
      torquePoints[split.startIndex + Math.floor(length / 2)];
    const t = numberUtils.trueToOneAndFalseToNegativeOne(
      valueFromMiddleOfSplit > 0,
    );
    for (let i = 0; i <= length; i++) {
      const val = Math.max(
        torquePoints[reverse ? split.endIndex - i : split.startIndex + i] * t,
        0,
      );
      averages[i] ??= 0;

      averages[i] += val;
      highest[i] = numberUtils.max(highest[i], val);
      lowest[i] = numberUtils.min(lowest[i], val);
    }
  });

  if (dataFiltering) {
    const averageFilter = createLowpass11Hz(256);
    const lowestFilter = createLowpass11Hz(256);
    const highestFilter = createLowpass11Hz(256);
    for (let i = 0; i < averages.length; i++) {
      const average = numberUtils.truncDecimals(
        averageFilter.process(averages[i] / count),
        3,
      );
      averages[i] = average;
      highest[i] = lowestFilter.process(
        average + (highest[i] - average) * errorPercentage,
      );
      lowest[i] = highestFilter.process(
        average + (lowest[i] - average) * errorPercentage,
      );
    }
  } else {
    for (let i = 0; i < averages.length; i++) {
      const average = numberUtils.truncDecimals(averages[i] / count, 3);
      averages[i] = average;
      highest[i] = average + (highest[i] - average) * errorPercentage;
      lowest[i] = average + (lowest[i] - average) * errorPercentage;
    }
  }

  averageCollection.maxValue = arrayUtils.maxValue(averages) || 0;
  averageCollection.minValue = arrayUtils.minValue(averages) || 0;
  errorBandCollection.maxValue = arrayUtils.maxValue(highest) || 0;
  errorBandCollection.minValue = arrayUtils.minValue(lowest) || 0;

  return [averageCollection, errorBandCollection];
};

// If a sample contains for example three flex repetitions the repetitions should be mostly the same size
// They will usually differ a couple indecies of each other and because of this will also have a differing sample size
// This function will go through all specified repetitions and give you the smallest found sample size
// These values are then used to ensure that average calculating are using the same angle degree values and sample sizes
const createSmallestAngleSampleSizePointCollection = (splits, anglePoints) => {
  const splitCollection = {
    splits: [],
  };

  let minExtAngle, maxExtAngle, minFlexAngle, maxFlexAngle;
  splits.forEach((split) => {
    if (split.disabled) {
      return;
    }

    // minAngle is the highest low value found
    // maxAngle is the lowest high value found
    if (split.color === "red") {
      minExtAngle = numberUtils.max(
        minExtAngle,
        Math.min(anglePoints[split.startIndex], anglePoints[split.endIndex]),
      );
      maxExtAngle = numberUtils.min(
        maxExtAngle,
        Math.max(anglePoints[split.startIndex], anglePoints[split.endIndex]),
      );
    } else {
      minFlexAngle = numberUtils.max(
        minFlexAngle,
        Math.min(anglePoints[split.startIndex], anglePoints[split.endIndex]),
      );
      maxFlexAngle = numberUtils.min(
        maxFlexAngle,
        Math.max(anglePoints[split.startIndex], anglePoints[split.endIndex]),
      );
    }
  });

  if (minExtAngle == null) {
    return splitCollection;
  }

  asserts.assertTypeNumber(minExtAngle);
  asserts.assertTypeNumber(maxExtAngle);
  asserts.assertTypeNumber(minFlexAngle);
  asserts.assertTypeNumber(maxFlexAngle);

  let minExtSampleSize, minFlexSampleSize;
  splits.forEach((split) => {
    if (split.disabled) {
      return;
    }

    if (split.color === "red") {
      const extStartIndex = arrayUtils.findIndex(
        anglePoints,
        (angle) => angle >= minExtAngle,
        split.startIndex,
      );
      const extEndIndex = arrayUtils.findLastIndex(
        anglePoints,
        (angle) => angle <= maxExtAngle,
        split.endIndex,
      );
      asserts.assertTruthy(
        extStartIndex <= extEndIndex,
        "Ext index is out of bounds",
      );
      minExtSampleSize = numberUtils.min(
        minExtSampleSize,
        extEndIndex - extStartIndex,
      );
    } else {
      const flexStartIndex = arrayUtils.findIndex(
        anglePoints,
        (angle) => angle <= maxFlexAngle,
        split.startIndex,
      );
      const flexEndIndex = arrayUtils.findLastIndex(
        anglePoints,
        (angle) => angle >= minFlexAngle,
        split.endIndex,
      );
      asserts.assertTruthy(
        flexStartIndex <= flexEndIndex,
        "Flex index is out of bounds",
      );
      minFlexSampleSize = numberUtils.min(
        minFlexSampleSize,
        flexEndIndex - flexStartIndex,
      );
    }
  });

  asserts.assertTypeNumber(minExtSampleSize);
  asserts.assertTypeNumber(minFlexSampleSize);

  splits.forEach((split) => {
    if (split.disabled) {
      splitCollection.splits.push(split);
      return;
    }

    const isExt = split.color === "red";
    if (isExt) {
      var startIndex = arrayUtils.findIndex(
        anglePoints,
        (angle) => angle >= minExtAngle,
        split.startIndex,
      );
      var endIndex = arrayUtils.findLastIndex(
        anglePoints,
        (angle) => angle <= maxExtAngle,
        split.endIndex,
      );
    } else {
      var startIndex = arrayUtils.findIndex(
        anglePoints,
        (angle) => angle <= maxFlexAngle,
        split.startIndex,
      );
      var endIndex = arrayUtils.findLastIndex(
        anglePoints,
        (angle) => angle >= minFlexAngle,
        split.endIndex,
      );
    }

    const sampleSize = endIndex - startIndex;
    const minSampleSize = isExt ? minExtSampleSize : minFlexSampleSize;
    const sampleSizeDelta = sampleSize - minSampleSize;
    asserts.assertFalsy(sampleSizeDelta < 0, "Sample size is out of bounds");

    splitCollection.startIndex = numberUtils.min(
      startIndex,
      splitCollection.startIndex,
    );
    splitCollection.endIndex = numberUtils.max(
      endIndex,
      splitCollection.endIndex,
    );

    splitCollection.splits.push({
      startIndex: startIndex + Math.ceil(sampleSizeDelta / 2),
      endIndex: endIndex + Math.floor(sampleSizeDelta / 2),
      minAngle: isExt ? minExtAngle : minFlexAngle,
      maxAngle: isExt ? maxExtAngle : maxFlexAngle,
      color: split.color,
      disabled: split.disabled ?? false,
    });
  });

  return splitCollection;
};


// Mostly just use the same program type that CMT files contain, but we will try to shorten the name if possible
// kons/kons 60/60 becomes -> kons 60
// So if the type or speed repeat we will just remove the duplicated value
const createProgramType = (configuration) => {
  let programType = "";
  if (configuration.program[1].startsWith("isokin. ballistinen")) {
    const [typeA, typeB] = configuration.program[1].substring(20).split("/");
    if (typeA === typeB) {
      programType += `${typeA} `;
    } else {
      programType += `${typeA}/${typeB} `;
    }
  } else {
    programType += `${configuration.program[1]} `;
  }

  const [speedA, speedB] = configuration.speed;
  if (speedA === speedB) {
    programType += `${speedA}`;
  } else {
    programType += `${speedA}/${speedB}`;
  }

  return programType;
};

// This is the main parse function that will create the full CTM parsed object
const formatRawCTMObject = (
  rawObject,
  dataFiltering,
  disabledList,
  gravityCorrection,
  patientProfile,
) => {
  const object = {};

  object.data = rawObject.data.map((arr) => arr.map(parseFloat));
  object.markersByIndex = createParsedSectionFromRawObjectSection(
    rawObject["markers by index"],
  );
  object.configuration = createParsedSectionFromRawObjectSection(
    rawObject.Configuration,
  );
  object.setUp = createParsedSectionFromRawObjectSection(rawObject.SetUp);
  object.systemStrings = createParsedSectionFromRawObjectSection(
    rawObject["system strings"],
  );
  object.compensation = rawObject.compensation
    ? createParsedSectionFromRawObjectSection(rawObject.compensation)
    : {};

  if (gravityCorrection) {
    const correction = applyGravityCorrection({
      data: object.data,
      configuration: object.configuration,
      setUp: object.setUp,
      systemStrings: object.systemStrings,
      compensation: object.compensation,
    });
    object.data = correction.data;
    object.gravityCorrection = correction.details;
  } else {
    object.gravityCorrection = {
      applied: false,
      alreadyApplied: object.compensation.gravityCorrection === 1,
      source: "disabled",
    };
  }

  const collections = createCollections(
    object.markersByIndex,
    object.data,
    object.configuration.speed,
    dataFiltering,
    disabledList,
    object.configuration.program?.[1]?.includes("eks/eks"),
  );
  object.pointCollections = collections.points;
  object.splitCollections = collections.splits;
  object.memo = cleanMemo(rawObject.memo.join("\n"));
  object.session = createParsedSectionFromRawObjectSection(rawObject.session);
  if (patientProfile?.weight !== "" && Number(patientProfile.weight) > 0) {
    object.session.subjectWeight = Number(patientProfile.weight);
  }
  if (patientProfile?.sex) {
    object.session.subjectSex = [
      patientProfile.sex === "Mies" ? 1 : 2,
      patientProfile.sex,
    ];
  }
  if (patientProfile?.involvedSide) {
    object.session.involvedSide = patientProfile.involvedSide;
  }
  if (patientProfile?.referenceValues) {
    object.session.referenceValues = patientProfile.referenceValues;
  }
  if (patientProfile?.additionalComment) {
    object.session.additionalComment = patientProfile.additionalComment;
  }
  object.measurement = createParsedSectionFromRawObjectSection(
    rawObject.Measurement,
  );
  object.filter = createParsedSectionFromRawObjectSection(rawObject.filter);
  object.repetitions = createRepetitionsSection(
    object.pointCollections,
    object.splitCollections.power.splits,
    object.measurement.samplingrate[0],
  );
  object.analysis = createAnalysis(
    object.repetitions,
    object.session.subjectWeight,
  );

  object.programType = createProgramType(object.configuration);

  return object;
};

export const parseTextToObject = (
  text,
  dataFiltering,
  disabledList,
  gravityCorrection = true,
  patientProfile = {},
) => {
  try {
    const object = ctmTextToRawObject(text);
    const formatted = formatRawCTMObject(
      object,
      dataFiltering,
      disabledList,
      gravityCorrection,
      patientProfile,
    );
    return formatted;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const getLegSide = (CTMdata) => {
  asserts.assertTruthy(CTMdata, "CTM data is missing");
  let side = CTMdata.Configuration.side.at(-1);
  if (side === "left" || side === "right") {
    return side;
  }

  asserts.unreachable("No side data found");
};

export const isLeftLeg = (CTMdata) => {
  return getLegSide(CTMdata) === "left";
};

export const isRightLeg = (CTMdata) => {
  return getLegSide(CTMdata) === "right";
};
