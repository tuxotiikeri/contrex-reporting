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
import { asserts } from "../collections/collections.js";
import { patientProfile } from "../signals.js";
import { parsedFileData } from "../signals.js";
import { resolveComparisonSides } from "../utils/comparisonSides.js";
import { muscleCurveDirections, reportMetricIndices } from "../utils/reportMetricDefinitions.js";
import { ChartLegend } from "./ChartLegend.jsx";
import { createTorqueDisplay, createHQDisplay, createLsiDisplay } from "../utils/torqueDisplay.js";

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
      props.type === "Ext" || props.type === "Flex" || props.type === "HQ",
      "Unkown type",
    );

    const errorAverageKey = createMemo(() => `averagePower${props.type}Error`);
    const averageKey = createMemo(() => `averagePower${props.type}`);

    const displayFiles = createMemo(() => props.listOfParsedCTM().map(file => {
      const display = props.type === "HQ" ? createHQDisplay(file.rawObject) : createTorqueDisplay(file.rawObject, props.type);
      return {...file, display, rawObject: {...file.rawObject,
        pointCollections: {...file.rawObject.pointCollections,
          [averageKey()]: {points: display.points},
          [errorAverageKey()]: {points: display.error ?? [display.points, display.points]}},
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
        maxValue: props.type === "HQ" ? 2 : Math.max(100, Math.ceil((peakQuadriceps * 1.2) / 100) * 100),
        xStartValue: 0,
        xEndValue: 90,
      };
    });

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
      const involved = involvedSide === "left" ? left.display : right.display;
      const reference = involvedSide === "left" ? right.display : left.display;
      const result = createLsiDisplay(involved, reference);
      return {...result, label: (difference, index) => {
        const lsi = result.percentages[index];
        if (!Number.isFinite(lsi)) return "–";
        return props.type === "HQ" ? `${Math.round(lsi)} %`
          : `${Math.round(lsi)} % (${Math.round(difference)} Nm)`;
      }};
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
          paddingBottom={60}
          paddingTop={78}
        >
          {(borderArea) => (
            <>
              <ChartText position="top" {...borderArea} y={27} title={props.title} fontSize="18" fontWeight="700" />
              <ChartLegend x={90} y={53} includeLSI />
              <ChartPadding name="lines" {...borderArea} padding={15}>
                {(lineArea) => (
                  <>
                    <text
                      x={lineArea.x - 15}
                      y={borderArea.y}
                      dominant-baseline="ideographic"
                      text-anchor="start"
                      font-size="13"
                    >
                      {props.type === "HQ" ? t("HQ-suhde") : t("Vääntö [Nm]")}
                    </text>
                    <ChartText
                      position="bottom"
                      {...borderArea}
                      y={borderArea.y + 20}
                      title={t("Kulma [aste]")} fontSize="13"
                    />
                    <ChartXAxisFloor
                      {...borderArea}
                      startValue={combinedValues().xStartValue}
                      endValue={combinedValues().xEndValue}
                      x={lineArea.x}
                      width={lineArea.width}
                      tickStep={10}
                      font-size={12}
                    />
                    <ChartYAxisFloor
                      {...borderArea}
                      startValue={combinedValues().maxValue}
                      endValue={combinedValues().minValue}
                      y={lineArea.y}
                      height={lineArea.height}
                      tickStep={props.type === "HQ" ? 0.5 : 100}
                      font-size={12}
                    />
                    <line x1={lineArea.x} x2={lineArea.x} y1={lineArea.y} y2={lineArea.y + lineArea.height} stroke="black" />
                    <line x1={lineArea.x} x2={lineArea.x + lineArea.width} y1={lineArea.y + lineArea.height} y2={lineArea.y + lineArea.height} stroke="black" />
                    <Show when={props.errorBands && props.type !== "HQ"}>
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
                              const total = lsi().endIndex;
                              const start = cluster.startIndex / total;
                              const end = cluster.endIndex / total;
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
                                unit={props.type === "HQ" ? "" : "Nm"}
                                minHoverValue={props.type === "HQ" ? Number.EPSILON : undefined}
                                label={props.type === "HQ" ? value => value.toFixed(2) : undefined}
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
    return <AverageErrorChartForTorque {...props} type="HQ" title={t("Kulmakohtainen HQ-suhde")} />;
  }
}
