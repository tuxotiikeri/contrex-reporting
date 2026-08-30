export const createMarkerBasedRepetitionSplits = (
  markersByIndex,
  disabledList = [],
) => {
  const move1 = markersByIndex?.move1;
  const move2 = markersByIndex?.move2;

  if (!Array.isArray(move1) || !Array.isArray(move2)) {
    throw new Error("CTM file is missing move 1 or move 2 markers");
  }
  if (move1.length !== move2.length + 1) {
    throw new Error("CTM move markers do not form complete repetitions");
  }

  const splits = [];
  for (let repetitionIndex = 0; repetitionIndex < move2.length; repetitionIndex++) {
    splits.push({
      startIndex: move1[repetitionIndex],
      endIndex: move2[repetitionIndex],
      color: "red",
      disabled: disabledList[splits.length] ?? false,
    });
    splits.push({
      startIndex: move2[repetitionIndex],
      endIndex: move1[repetitionIndex + 1],
      color: "blue",
      disabled: disabledList[splits.length] ?? false,
    });
  }

  return {
    startIndex: move1[0],
    endIndex: move1.at(-1),
    splits,
  };
};

const findLongestMovement = (speedPoints, startIndex, endIndex, threshold) => {
  let peakSpeed = 0;
  for (let index = startIndex; index <= endIndex; index++) {
    if (Math.abs(speedPoints[index]) > Math.abs(peakSpeed)) {
      peakSpeed = speedPoints[index];
    }
  }

  const direction = Math.sign(peakSpeed);
  let longestStart = null;
  let longestEnd = null;
  let currentStart = null;

  for (let index = startIndex; index <= endIndex + 1; index++) {
    const isMoving =
      index <= endIndex && speedPoints[index] * direction >= threshold;

    if (isMoving && currentStart === null) {
      currentStart = index;
    }

    if (!isMoving && currentStart !== null) {
      const currentEnd = index - 1;
      if (
        longestStart === null ||
        currentEnd - currentStart > longestEnd - longestStart
      ) {
        longestStart = currentStart;
        longestEnd = currentEnd;
      }
      currentStart = null;
    }
  }

  return longestStart === null
    ? { startIndex, endIndex }
    : { startIndex: longestStart, endIndex: longestEnd };
};

export const createMovementBasedRepetitionSplits = (
  markersByIndex,
  speedPoints,
  configuredSpeeds,
  disabledList = [],
) => {
  if (!Array.isArray(speedPoints) || !Array.isArray(configuredSpeeds)) {
    throw new Error("Speed data is missing from the CTM file");
  }

  const markerSplits = createMarkerBasedRepetitionSplits(
    markersByIndex,
    disabledList,
  );

  const splits = markerSplits.splits.map((split) => {
    const configuredSpeed = Math.abs(
      configuredSpeeds[split.color === "red" ? 0 : 1] ?? 0,
    );

    // A repetition starts and ends while the lever is still accelerating or
    // braking. Twenty percent of the configured isokinetic speed reproduces
    // the CON-TREX movement window without including the stationary reversal.
    if (configuredSpeed === 0) {
      return { ...split };
    }

    const movement = findLongestMovement(
      speedPoints,
      split.startIndex,
      split.endIndex,
      Math.max(5, configuredSpeed * 0.2),
    );

    return { ...split, ...movement };
  });

  return {
    startIndex: splits[0]?.startIndex ?? markerSplits.startIndex,
    endIndex: splits.at(-1)?.endIndex ?? markerSplits.endIndex,
    splits,
  };
};
