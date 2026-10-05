import { t } from "../i18n/index.js";
import { batch, createMemo, createSignal, ErrorBoundary } from "solid-js";
import {
  ChartErrorBands,
  ChartHoverPoint,
  ChartMousePositionInPercentage,
  ChartPadding,
  ChartPath,
  ChartText,
  ChartXAxisFloor,
  ChartYAxisFloor,
} from "./GenericSVGChart.jsx";
import { arrayUtils } from "../utils/utils.js";
import { asserts } from "../collections/collections.js";
import { patientProfile } from "../signals.js";
import { parsedFileData } from "../signals.js";
import { resolveComparisonSides } from "../utils/comparisonSides.js";
import { muscleCurveDirections, reportMetricIndices } from "../utils/reportMetricDefinitions.js";
import { ChartLegend } from "./ChartLegend.jsx";
import { createTorqueDisplay } from "../utils/torqueDisplay.js";

export function AverageChart(props) {
  return (
    <ErrorBoundary fallback={t("Kuvaajan piirtäminen epäonnistui")}>
      <Chart {...props} />
    </ErrorBoundary>
  );
}

function Chart(props) {
  const [mouseX, setMouseX] = createSignal(-1);
  const [mouseY, setMouseY] = createSignal(-1);

  const updateHoverCoords = (e) =>
    batch(() => {
      setMouseX(e.offsetX);
      setMouseY(e.offsetY);
    });

  const clearHoverCoors = () =>
    batch(() => {
      setMouseX(-1);
      setMouseY(-1);
    });
  const svgWidth = props.svgWidth ?? 800;
  const svgHeight = props.svgHeight ?? 360;

  const controls = { mouseX, mouseY };
  const svgArea = { width: svgWidth, height: svgHeight, x: 0, y: 0 };
  const muscleDirections = createMemo(() =>
    muscleCurveDirections(props.listOfParsedCTM()?.[0]?.rawObject),
  );
  return (
    <Show when={props.listOfParsedCTM()?.length}>
      <div class="flex flex-col gap-10">
        <AverageErrorChartForTorque title={t("Etureisi - keskiarvo")} type={muscleDirections().quadriceps} {...props} />
        <AverageErrorChartForTorque title={t("Takareisi - keskiarvo")} type={muscleDirections().hamstrings} {...props} />
        <Show when={props.showHQ !== false}>
          <AngleSpecificHQRatio type="Flex" {...props} />
        </Show>
      </div>
    </Show>
  );

  function AverageErrorChartForTorque(props) {
    asserts.assertTypeFunction(props.listOfParsedCTM, "listOfParsedCTM");
    asserts.assertTruthy(
      props.type === "Ext" || props.type === "Flex",
      "Unkown type",
    );

    const errorAverageKey = createMemo(() => `averagePower${props.type}Error`);
    const averageKey = createMemo(() => `averagePower${props.type}`);

    const displayFiles = createMemo(() => props.listOfParsedCTM().map(file => {
      const display = createTorqueDisplay(file.rawObject, props.type);
      return {...file, display, rawObject: {...file.rawObject,
        pointCollections: {...file.rawObject.pointCollections,
          [averageKey()]: {points: display.points},
          [errorAverageKey()]: {points: display.error}},
        splitCollections: {...file.rawObject.splitCollections,
          [averageKey()]: display.split}}};
    }));

    const combinedValues = createMemo(() => {
      const files = displayFiles();
      const peakQuadriceps = Math.max(
        ...files.map(({rawObject}) => Math.abs(Number(rawObject.analysis?.[reportMetricIndices(rawObject).quadriceps.torque])) || 0),
      );
      return {
        minValue: 0,
        maxValue: Math.max(100, Math.ceil((peakQuadriceps * 1.2) / 100) * 100),
        xStartValue: 0,
        xEndValue: 90,
      };
    });

    const colors = createMemo(() =>
      displayFiles().map((file) => file.baseColor),
    );

    const lsiData = createMemo(() => {
      const filesBySide = Object.fromEntries(
        displayFiles().map((file) => [file.legSide, file]),
      );
      const left = filesBySide.left;
      const right = filesBySide.right;
      if (!left || !right) return null;

      const leftPoints = left.rawObject.pointCollections[averageKey()].points;
      const rightPoints = right.rawObject.pointCollections[averageKey()].points;
      const length = Math.min(leftPoints.length, rightPoints.length);
      if (!length) return null;

      const comparison = resolveComparisonSides(patientProfile().involvedSide, parsedFileData());
      const involvedSide = comparison.involvedSide;
      if (!involvedSide) {
        return null;
      }
      const lsiAt = (index) => {
        const involved = involvedSide === "left" ? leftPoints[index] : rightPoints[index];
        const nonInvolved = involvedSide === "left" ? rightPoints[index] : leftPoints[index];
        return left.display.active[index] && right.display.active[index] && nonInvolved > 0 && involved > 0
          ? (involved / nonInvolved) * 100 : NaN;
      };
      const points = Array.from({ length }, (_, index) =>
        Math.abs(leftPoints[index] - rightPoints[index]),
      );
      const clusters = [];
      let clusterStart = null;
      for (let index = 0; index < length; index++) {
        const lsi = lsiAt(index);
        const exceedsThreshold = Number.isFinite(lsi) && Math.abs(lsi - 100) > 10;
        if (exceedsThreshold && clusterStart === null) clusterStart = index;
        if (!exceedsThreshold && clusterStart !== null) {
          clusters.push({ startIndex: clusterStart, endIndex: index - 1 });
          clusterStart = null;
        }
      }
      if (clusterStart !== null) clusters.push({ startIndex: clusterStart, endIndex: length - 1 });
      return {
        points,
        startIndex: 0,
        endIndex: length - 1,
        clusters,
        label: (difference, index) => {
          const lsi = lsiAt(index);
          return Number.isFinite(lsi) ? `${Math.round(lsi)} % (${Math.round(difference)} Nm)` : "–";
        },
      };
    });

    return (
      <svg
        width={svgArea.width}
        height={svgArea.height}
        style={{"font-family": "Helvetica, Arial, sans-serif"}}
        onMouseLeave={clearHoverCoors}
        onMouseMove={updateHoverCoords}
      >
        <ChartPadding
          name="border"
          {...svgArea}
          paddingLeft={70}
          paddingRight={25}
          paddingBottom={40}
          paddingTop={54}
        >
          {(borderArea) => (
            <>
              <ChartText position="top" {...borderArea} y={22} title={props.title} fontSize="16" fontWeight="700" />
              <ChartLegend x={svgArea.width - 290} y={borderArea.y - 18} includeLSI />
              <ChartPadding name="lines" {...borderArea} padding={15}>
                {(lineArea) => (
                  <>
                    <text
                      x={lineArea.x - 15}
                      y={borderArea.y}
                      dominant-baseline="ideographic"
                      text-anchor="start"
                      font-size="10"
                    >
                      {t("Vääntö [Nm]")}
                    </text>
                    <ChartText
                      position="bottom"
                      {...borderArea}
                      y={borderArea.y + 20}
                      title={t("Kulma [aste]")}
                    />
                    <ChartXAxisFloor
                      {...borderArea}
                      startValue={combinedValues().xStartValue}
                      endValue={combinedValues().xEndValue}
                      x={lineArea.x}
                      width={lineArea.width}
                      tickStep={10}
                    />
                    <ChartYAxisFloor
                      {...borderArea}
                      startValue={combinedValues().maxValue}
                      endValue={combinedValues().minValue}
                      y={lineArea.y}
                      height={lineArea.height}
                      tickStep={100}
                    />
                    <line x1={lineArea.x} x2={lineArea.x} y1={lineArea.y} y2={lineArea.y + lineArea.height} stroke="black" />
                    <line x1={lineArea.x} x2={lineArea.x + lineArea.width} y1={lineArea.y + lineArea.height} y2={lineArea.y + lineArea.height} stroke="black" />
                    <Show when={props.errorBands}>
                      <g data-error-bands>
                        <For each={displayFiles()}>
                          {(parsedData, fileIndex) => (
                            <ChartErrorBands
                              points={
                                parsedData.rawObject.pointCollections[
                                  errorAverageKey()
                                ].points
                              }
                              splits={
                                parsedData.rawObject.splitCollections[
                                  averageKey()
                                ].splits
                              }
                              startIndex={
                                parsedData.rawObject.splitCollections[
                                  averageKey()
                                ].startIndex
                              }
                              endIndex={
                                parsedData.rawObject.splitCollections[
                                  averageKey()
                                ].endIndex
                              }
                              fill={`color-mix(in oklab, ${parsedData.baseColor} 15%, transparent)`}
                              stroke={`color-mix(in oklab, ${parsedData.baseColor} 30%, transparent)`}
                              {...lineArea}
                              {...combinedValues()}
                            ></ChartErrorBands>
                          )}
                        </For>
                      </g>
                    </Show>
                    <g data-lines>
                      <For each={displayFiles()}>
                        {(parsedData) => (
                          <ChartPath
                            points={
                              parsedData.rawObject.pointCollections[
                                averageKey()
                              ].points
                            }
                            splits={
                              parsedData.rawObject.splitCollections[
                                averageKey()
                              ].splits
                            }
                            startIndex={
                              parsedData.rawObject.splitCollections[
                                averageKey()
                              ].startIndex
                            }
                            endIndex={
                              parsedData.rawObject.splitCollections[
                                averageKey()
                              ].endIndex
                            }
                            stroke={parsedData.baseColor}
                            {...lineArea}
                            {...combinedValues()}
                            {...controls}
                          ></ChartPath>
                        )}
                      </For>
                      <Show when={lsiData()}>
                        {(lsi) => (
                          <For each={lsi().clusters}>
                            {(cluster) => {
                              const total = lsi().endIndex + 1;
                              const start = cluster.startIndex / total;
                              const end = (cluster.endIndex + 1) / total;
                              return <rect x={lineArea.x + start * lineArea.width} y={lineArea.y + lineArea.height + 4} width={Math.max(2, (end - start) * lineArea.width)} height="8" fill="black" />;
                            }}
                          </For>
                        )}
                      </Show>
                    </g>
                    <ChartMousePositionInPercentage
                      {...controls}
                      {...borderArea}
                      width={lineArea.width}
                      x={lineArea.x}
                    >
                      {(mouseArea) => (
                        <>
                          <For each={displayFiles()}>
                            {(parsedData, fileIndex) => (
                              <ChartHoverPoint
                                points={
                                  parsedData.rawObject.pointCollections[
                                    averageKey()
                                  ].points
                                }
                                startIndex={
                                  parsedData.rawObject.splitCollections[
                                    averageKey()
                                  ].startIndex
                                }
                                endIndex={
                                  parsedData.rawObject.splitCollections[
                                    averageKey()
                                  ].endIndex
                                }
                                {...combinedValues()}
                                {...mouseArea}
                                {...lineArea}
                                color={parsedData.baseColor}
                                unit="Nm"
                                labelOffsetY={(fileIndex() % 3 - 1) * 12}
                              />
                            )}
                          </For>
                          <Show when={lsiData()}>
                            {(lsi) => (
                              <ChartHoverPoint
                                points={lsi().points}
                                startIndex={lsi().startIndex}
                                endIndex={lsi().endIndex}
                                color="black"
                                label={lsi().label}
                                {...combinedValues()}
                                {...mouseArea}
                                {...lineArea}
                                fixedY={lineArea.y + lineArea.height}
                                labelOffsetY={-13}
                              />
                            )}
                          </Show>
                        </>
                      )}
                    </ChartMousePositionInPercentage>
                  </>
                )}
              </ChartPadding>
            </>
          )}
        </ChartPadding>
      </svg>
    );
  }

  function AngleSpecificHQRatio(props) {
    asserts.assertTypeFunction(props.listOfParsedCTM, "listOfParsedCTM");
    asserts.assertTruthy(
      props.type === "Ext" || props.type === "Flex",
      "Unkown type",
    );

    const combinedValues = createMemo(() => {
      const files = props.listOfParsedCTM();
      const startAngles = [];
      const endAngles = [];
      for (const { rawObject } of files) {
        startAngles.push(
          rawObject.pointCollections.angleSpecificHQRatio.maxAngle,
        );
        endAngles.push(
          rawObject.pointCollections.angleSpecificHQRatio.minAngle,
        );
      }

      const xStartValue = arrayUtils.findByMaxDelta(startAngles, 0) || -1;
      const xEndValue = arrayUtils.findByMaxDelta(endAngles, 0) || 1;

      return {
        minValue: 0,
        maxValue: 2,
        xStartValue: 0,
        xEndValue: 90,
      };
    });

    const colors = createMemo(() =>
      props.listOfParsedCTM().map((file) => file.baseColor),
    );

    const visibleHQSplits = (parsedData) => {
      const points = parsedData.rawObject.pointCollections.angleSpecificHQRatio.points;
      const sourceSplits = parsedData.rawObject.splitCollections.angleSpecificHQRatio.splits;
      const visible = [];
      for (const split of sourceSplits) {
        let start = null;
        for (let index = split.startIndex; index <= split.endIndex; index++) {
          const value = points[index];
          const valid = Number.isFinite(value) && value >= 0 && value <= 2;
          if (valid && start === null) start = index;
          if ((!valid || index === split.endIndex) && start !== null) {
            visible.push({ ...split, startIndex: start, endIndex: valid ? index : index - 1 });
            start = null;
          }
        }
      }
      return visible.filter((split) => split.endIndex >= split.startIndex);
    };

    return (
      <Show when={combinedValues().maxValue}>
        <svg
          width={svgArea.width}
          height={svgArea.height}
          style={{"font-family": "Helvetica, Arial, sans-serif"}}
          onMouseLeave={clearHoverCoors}
          onMouseMove={updateHoverCoords}
        >
          <ChartPadding
            name="border"
            {...svgArea}
            paddingLeft={70}
            paddingRight={25}
            paddingBottom={40}
            paddingTop={42}
          >
            {(borderArea) => (
              <>
                <ChartText
                  position="top"
                  {...borderArea}
                  title={t("Kulmakohtainen HQ-suhde")} fontSize="16" fontWeight="700"
                />
                <ChartLegend x={svgArea.width - 188} y={borderArea.y - 18} />
                <ChartPadding name="lines" {...borderArea} padding={15}>
                  {(lineArea) => (
                    <>
                      <ChartText
                        position="bottom"
                        {...borderArea}
                        y={borderArea.y + 20}
                        title={t("Kulma [aste]")}
                      />
                      <ChartXAxisFloor
                        {...borderArea}
                        startValue={Math.abs(combinedValues().xStartValue)}
                        endValue={Math.abs(combinedValues().xEndValue)}
                        x={lineArea.x}
                        width={lineArea.width}
                        tickStep={10}
                      />
                      <ChartYAxisFloor
                        {...borderArea}
                        startValue={combinedValues().maxValue}
                        endValue={combinedValues().minValue}
                        y={lineArea.y}
                        height={lineArea.height}
                        tickStep={0.5}
                      />
                      <line x1={lineArea.x} x2={lineArea.x} y1={lineArea.y} y2={lineArea.y + lineArea.height} stroke="black" />
                      <line x1={lineArea.x} x2={lineArea.x + lineArea.width} y1={lineArea.y + lineArea.height} y2={lineArea.y + lineArea.height} stroke="black" />
                      {/* <Show when={props.errorBands}> */}
                      {/*   <g data-error-bands> */}
                      {/*     <For each={props.listOfParsedCTM()}>{parsedData => ( */}
                      {/*       <ChartErrorBands */}
                      {/*         points={parsedData.rawObject.pointCollections.angleSpecificHQRatioError.points} */}
                      {/*         splits={parsedData.rawObject.splitCollections.angleSpecificHQRatio.splits} */}
                      {/*         startIndex={parsedData.rawObject.splitCollections.angleSpecificHQRatio.startIndex} */}
                      {/*         endIndex={parsedData.rawObject.splitCollections.angleSpecificHQRatio.endIndex} */}
                      {/*         fill={`color-mix(in oklab, ${parsedData.baseColor} 15%, transparent)`} */}
                      {/*         stroke={`color-mix(in oklab, ${parsedData.baseColor} 30%, transparent)`} */}
                      {/*         {...lineArea} */}
                      {/*         {...combinedValues()} */}
                      {/*       ></ChartErrorBands> */}
                      {/*     )}</For> */}
                      {/*   </g> */}
                      {/* </Show> */}
                      <g data-lines>
                        <For each={props.listOfParsedCTM()}>
                          {(parsedData) => (
                            <>
                              <ChartPath
                                points={
                                  parsedData.rawObject.pointCollections
                                    .angleSpecificHQRatio.points
                                }
                                splits={visibleHQSplits(parsedData)}
                                startIndex={
                                  parsedData.rawObject.splitCollections
                                    .angleSpecificHQRatio.startIndex
                                }
                                endIndex={
                                  parsedData.rawObject.splitCollections
                                    .angleSpecificHQRatio.endIndex
                                }
                                stroke={parsedData.baseColor}
                                {...combinedValues()}
                                {...lineArea}
                                {...controls}
                              ></ChartPath>
                            </>
                          )}
                        </For>
                      </g>
                      <ChartMousePositionInPercentage
                        {...controls}
                        {...borderArea}
                        width={lineArea.width}
                        x={lineArea.x}
                      >
                        {(mouseArea) => (
                          <>
                            <For each={props.listOfParsedCTM()}>
                              {(parsedData) => (
                                <ChartHoverPoint
                                  points={
                                    parsedData.rawObject.pointCollections
                                      .angleSpecificHQRatio.points
                                  }
                                  startIndex={
                                    parsedData.rawObject.splitCollections
                                      .angleSpecificHQRatio.startIndex
                                  }
                                  endIndex={
                                    parsedData.rawObject.splitCollections
                                      .angleSpecificHQRatio.endIndex
                                  }
                                  {...combinedValues()}
                                  {...mouseArea}
                                  {...lineArea}
                                  color={parsedData.baseColor}
                                  maxHoverValue={2}
                                  label={(value) => value.toFixed(2)}
                                />
                              )}
                            </For>
                          </>
                        )}
                      </ChartMousePositionInPercentage>
                    </>
                  )}
                </ChartPadding>
              </>
            )}
          </ChartPadding>
        </svg>
      </Show>
    );
  }
}
