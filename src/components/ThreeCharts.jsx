import { t } from "../i18n/index.js";
import { batch, createSignal, ErrorBoundary, mergeProps } from "solid-js";
import {
  ChartBorder,
  ChartHorizontalHoverPointLine,
  ChartHorizontalZeroLine,
  ChartMousePositionInPercentage,
  ChartPadding,
  ChartPath,
  ChartPercentageVerticalLine,
  ChartText,
  ChartVecticalLinePercentageToRelativeIndex,
  ChartXAxisFloor,
  ChartYAxisFloor,
} from "./GenericSVGChart.jsx";
import { asserts } from "../collections/collections.js";
import { $hoveredRepetition } from "../signals.js";
export function ThreeCharts(props) {
  return (
    <ErrorBoundary fallback={t("Kuvaajan piirtäminen epäonnistui")}>
      <Chart {...props} />
    </ErrorBoundary>
  );
}

function Chart(props) {
  const [mouseX, setMouseX] = createSignal(-1);
  const [mouseY, setMouseY] = createSignal(-1);

  const svgArea = { width: 800, height: 220, x: 0, y: 0 };

  const updateHoverCoords = (e) =>
    batch(() => {
      setMouseX(e.offsetX);
      setMouseY(e.offsetY);
    });

  const controls = mergeProps({ mouseX, mouseY }, props);

  const clearHoverCoors = () =>
    batch(() => {
      setMouseX(-1);
      setMouseY(-1);
    });

  return (
    <>
      <ChartPadding
        name="border"
        {...svgArea}
        paddingLeft={80}
        paddingRight={50}
        paddingBottom={40}
        paddingTop={22}
      >
        {(borderArea) => (
          <ChartPadding name="lines" {...borderArea} padding={15}>
            {(lineArea) => (
              <ChartMousePositionInPercentage
                {...controls}
                {...lineArea}
                y={borderArea.y}
                height={borderArea.height}
              >
                {(mouseArea) => (
                  <>
                    <LineChartWithLabels
                      {...props}
                      borderArea={borderArea}
                      lineArea={lineArea}
                      mouseArea={mouseArea}
                      title={t("Vääntö")}
                      yUnit="[Nm]"
                      points={props.parsedCTM.pointCollections.power.points}
                      maxValue={props.parsedCTM.pointCollections.power.maxValue}
                      minValue={props.parsedCTM.pointCollections.power.minValue}
                      splits={props.parsedCTM.splitCollections.power.splits}
                      startIndex={
                        props.parsedCTM.splitCollections.power.startIndex
                      }
                      endIndex={props.parsedCTM.splitCollections.power.endIndex}
                    />
                    <LineChartWithLabels
                      {...props}
                      borderArea={borderArea}
                      lineArea={lineArea}
                      mouseArea={mouseArea}
                      title={t("Nopeus")}
                      yUnit={t("[aste/s]")}
                      points={props.parsedCTM.pointCollections.speed.points}
                      maxValue={props.parsedCTM.pointCollections.speed.maxValue}
                      minValue={props.parsedCTM.pointCollections.speed.minValue}
                      splits={props.parsedCTM.splitCollections.speed.splits}
                      startIndex={
                        props.parsedCTM.splitCollections.speed.startIndex
                      }
                      endIndex={props.parsedCTM.splitCollections.speed.endIndex}
                    />
                    <LineChartWithLabels
                      {...props}
                      borderArea={borderArea}
                      lineArea={lineArea}
                      mouseArea={mouseArea}
                      title={t("Kulma")}
                      yUnit={t("[aste]")}
                      points={props.parsedCTM.pointCollections.angle.points}
                      maxValue={props.parsedCTM.pointCollections.angle.maxValue}
                      minValue={props.parsedCTM.pointCollections.angle.minValue}
                      splits={props.parsedCTM.splitCollections.angle.splits}
                      startIndex={
                        props.parsedCTM.splitCollections.angle.startIndex
                      }
                      endIndex={props.parsedCTM.splitCollections.angle.endIndex}
                    />
                    <CircleChart
                      {...props}
                      {...controls}
                      mouseArea={mouseArea}
                      points={props.parsedCTM.pointCollections.power.points}
                      splits={props.parsedCTM.splitCollections.power.splits}
                      maxValue={props.parsedCTM.pointCollections.power.maxValue}
                      minValue={props.parsedCTM.pointCollections.power.minValue}
                      startIndex={
                        props.parsedCTM.splitCollections.power.startIndex
                      }
                      endIndex={props.parsedCTM.splitCollections.power.endIndex}
                    />
                  </>
                )}
              </ChartMousePositionInPercentage>
            )}
          </ChartPadding>
        )}
      </ChartPadding>
    </>
  );

  function LineChartWithLabels(props) {
    return (
      <svg
        width={svgArea.width}
        height={svgArea.height}
        onMouseLeave={clearHoverCoors}
        onMouseMove={updateHoverCoords}
      >
        <ChartText position="top" {...props.borderArea} title={props.title} />
        <text
          x={props.borderArea.x + props.borderArea.width}
          y={props.borderArea.y}
          dominant-baseline="ideographic"
          text-anchor="end"
        >
          {props.yUnit}
        </text>
        <ChartBorder {...props.borderArea} />
        <ChartText
          position="bottom"
          {...props.borderArea}
          y={props.borderArea.y + 20}
          title={t("Aika [s]")}
        />
        <ChartHorizontalZeroLine
          {...props.lineArea}
          x={props.borderArea.x}
          width={props.borderArea.width}
          maxValue={props.maxValue}
          minValue={props.minValue}
        />
        <ChartXAxisFloor
          {...props.borderArea}
          startValue={props.startIndex / 256}
          endValue={props.endIndex / 256}
          x={props.lineArea.x}
          width={props.lineArea.width}
        />
        <ChartYAxisFloor
          {...props.borderArea}
          startValue={props.maxValue}
          endValue={props.minValue}
          y={props.lineArea.y}
          height={props.lineArea.height}
        />
        <g data-line>
          <ChartPath
            points={props.points}
            maxValue={props.maxValue}
            minValue={props.minValue}
            splits={props.splits}
            startIndex={props.startIndex}
            endIndex={props.endIndex}
            {...props.lineArea}
            {...controls}
          ></ChartPath>
        </g>
        <ChartPercentageVerticalLine
          {...props.mouseArea}
          y={props.borderArea.y}
          height={props.borderArea.height}
        />
        <ChartHorizontalHoverPointLine
          {...props}
          {...controls}
          {...props.mouseArea}
          {...props.lineArea}
          x={props.borderArea.x}
          width={props.borderArea.width}
          showLabelValue={true}
        />
      </svg>
    );
  }
}

function CircleChart(props) {
  asserts.assertTruthy(props.parsedCTM, "parsedCTM");

  const svgArea = { width: 500, height: 250, x: 0, y: 0 };

  const getStrokeColorIfHovered = (split, index) => {
    const repIndex = $hoveredRepetition.repetitionIndex;
    const fileIndex = $hoveredRepetition.fileIndex;

    if (repIndex == -1 || props.fileIndex != fileIndex) {
      return;
    }
    if (repIndex == index || repIndex + 1 == index) {
      return split.color;
    }
    return `color-mix(in hsl, ${split.color} 20%, transparent)`;
  };

  return (
    <ErrorBoundary fallback={t("Toistokuvaajan piirtäminen epäonnistui")}>
      <svg width={svgArea.width} height={svgArea.height}>
        <ChartPadding
          name="border"
          {...svgArea}
          paddingLeft={80}
          paddingRight={50}
          paddingBottom={22}
          paddingTop={22}
        >
          {(borderArea) => (
            <>
              <ChartBorder {...borderArea} />
              <text
                x={borderArea.x + borderArea.width}
                y={borderArea.y}
                dominant-baseline="ideographic"
                text-anchor="end"
              >
                [Nm]
              </text>
              <ChartText position="top" {...borderArea} title={t("Vääntötoistot")} />
              <ChartPadding name="lines" {...borderArea} padding={15}>
                {(lineArea) => (
                  <>
                    <ChartHorizontalZeroLine
                      {...lineArea}
                      x={borderArea.x}
                      width={borderArea.width}
                      maxValue={props.maxValue}
                      minValue={props.minValue}
                    />
                    <ChartYAxisFloor
                      {...borderArea}
                      startValue={props.maxValue}
                      endValue={props.minValue}
                      y={lineArea.y}
                      height={lineArea.height}
                    />
                    <For each={props.splits}>
                      {(split, i) => (
                        <Show when={!split.disabled}>
                          <ChartPath
                            points={props.points}
                            maxValue={props.maxValue}
                            minValue={props.minValue}
                            splits={[split]}
                            flipped={split.color === "blue"}
                            startIndex={split.startIndex}
                            endIndex={split.endIndex}
                            stroke={getStrokeColorIfHovered(split, i())}
                            {...lineArea}
                          ></ChartPath>
                          <ChartHorizontalHoverPointLine
                            points={props.points}
                            maxValue={props.maxValue}
                            minValue={props.minValue}
                            startIndex={props.startIndex}
                            endIndex={props.endIndex}
                            // Only show the hover line if cursor is inside the current repetition
                            minIndex={split.startIndex}
                            maxIndex={split.endIndex}
                            {...props.mouseArea}
                            {...lineArea}
                            x={borderArea.x}
                            width={borderArea.width}
                            showLabelValue={true}
                          />
                          <ChartVecticalLinePercentageToRelativeIndex
                            points={
                              props.parsedCTM.pointCollections.power.points
                            }
                            split={split}
                            flipped={split.color === "blue"}
                            startIndex={props.startIndex}
                            endIndex={props.endIndex}
                            {...props.mouseArea}
                            {...lineArea}
                            y={borderArea.y}
                            height={borderArea.height}
                          />
                        </Show>
                      )}
                    </For>
                  </>
                )}
              </ChartPadding>
            </>
          )}
        </ChartPadding>
      </svg>
    </ErrorBoundary>
  );
}
