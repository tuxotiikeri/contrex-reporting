const GRAVITY_ROWS = 18;
const VALUES_PER_ROW = 20;
const GRAVITY_TABLE_SIZE = GRAVITY_ROWS * VALUES_PER_ROW;
const GRAVITY_UNIT_TO_NM = 0.1;

const normalizeDegrees = (degrees) => ((degrees % 360) + 360) % 360;

const getSide = (configuration) => {
  const side = Array.isArray(configuration?.side)
    ? configuration.side
    : [configuration?.side];
  const sideIndex = side.find((value) => value === 0 || value === 1);
  const sideName = side
    .find((value) => typeof value === "string")
    ?.toLowerCase();

  if (sideName === "left" || sideIndex === 1) {
    return "left";
  }
  if (sideName === "right" || sideIndex === 0) {
    return "right";
  }

  throw new Error("Gravity correction requires left/right side information");
};

// The gravity lookup is stored in the dynamometer's system orientation.
// In the exported knee CTM/CXP pairs, the measured torque orientation is
// opposite on the right side. This keeps the result in the same anatomical
// torque convention that CON-TREX reports for both legs.
const getTorqueCorrectionMultiplier = (side) =>
  side === "right" ? 1 : -1;

export const createGravityTableNm = (systemStrings) => {
  const table = [];

  for (let rowIndex = 0; rowIndex < GRAVITY_ROWS; rowIndex++) {
    const row = systemStrings?.[`gravity${rowIndex}`];
    if (!Array.isArray(row) || row.length !== VALUES_PER_ROW) {
      throw new Error(
        `Gravity row ${rowIndex} must contain ${VALUES_PER_ROW} values`,
      );
    }

    for (const value of row) {
      if (!Number.isFinite(value)) {
        throw new Error(`Gravity row ${rowIndex} contains an invalid value`);
      }
      table.push(value * GRAVITY_UNIT_TO_NM);
    }
  }

  if (table.length !== GRAVITY_TABLE_SIZE) {
    throw new Error(
      `Gravity table must contain ${GRAVITY_TABLE_SIZE} values`,
    );
  }

  return table;
};

export const anatomicalToAbsoluteDegrees = (
  angleDegrees,
  anatomicalZeroDegrees,
  side,
) => {
  if (!Number.isFinite(angleDegrees) || !Number.isFinite(anatomicalZeroDegrees)) {
    throw new Error("Gravity correction requires valid angle values");
  }

  return normalizeDegrees(
    side === "left"
      ? anatomicalZeroDegrees - angleDegrees
      : anatomicalZeroDegrees + angleDegrees,
  );
};

export const interpolateGravityNm = (gravityTableNm, absoluteDegrees) => {
  if (gravityTableNm?.length !== GRAVITY_TABLE_SIZE) {
    throw new Error(
      `Gravity table must contain ${GRAVITY_TABLE_SIZE} values`,
    );
  }

  const degrees = normalizeDegrees(absoluteDegrees);
  const lowerIndex = Math.floor(degrees);
  const upperIndex = (lowerIndex + 1) % GRAVITY_TABLE_SIZE;
  const fraction = degrees - lowerIndex;

  return (
    gravityTableNm[lowerIndex] * (1 - fraction) +
    gravityTableNm[upperIndex] * fraction
  );
};

export const applyGravityCorrection = ({
  data,
  configuration,
  setUp,
  systemStrings,
  compensation,
}) => {
  if (compensation?.gravityCorrection === 1) {
    return {
      data,
      details: {
        applied: false,
        alreadyApplied: true,
        source: "file",
      },
    };
  }

  const anatomicalZeroDegrees = setUp?.anatomicalZero;
  if (!Number.isFinite(anatomicalZeroDegrees)) {
    throw new Error("Anatomical zero is missing from the CTM file");
  }

  const side = getSide(configuration);
  const torqueCorrectionMultiplier = getTorqueCorrectionMultiplier(side);
  const gravityTableNm = createGravityTableNm(systemStrings);
  let minimumGravityNm = Infinity;
  let maximumGravityNm = -Infinity;

  const correctedData = data.map((row) => {
    const absoluteDegrees = anatomicalToAbsoluteDegrees(
      row[2],
      anatomicalZeroDegrees,
      side,
    );
    const gravityNm = interpolateGravityNm(gravityTableNm, absoluteDegrees);
    minimumGravityNm = Math.min(minimumGravityNm, gravityNm);
    maximumGravityNm = Math.max(maximumGravityNm, gravityNm);

    return [
      row[0] + torqueCorrectionMultiplier * gravityNm,
      ...row.slice(1),
    ];
  });

  return {
    data: correctedData,
    details: {
      applied: true,
      alreadyApplied: false,
      source: "ctmGravityTable",
      side,
      torqueCorrectionMultiplier,
      anatomicalZeroDegrees,
      minimumGravityNm,
      maximumGravityNm,
    },
  };
};
