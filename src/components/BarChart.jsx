import { createMemo, ErrorBoundary, mergeProps } from "solid-js";
import { asserts } from "../collections/collections.js";
import { arrayUtils, numberUtils } from "../utils/utils.js";
import {
  ChartPadding,
  ChartText,
  ChartYAxisFloor,
} from "./GenericSVGChart.jsx";
export function BarChart(props) {
  return (
    <ErrorBoundary fallback="Barchart rendering failed">
      <Chart {...props} />
    </ErrorBoundary>
  );
}

function Chart(props) {
  asserts.assertTypeString(props.title, "title");

  const svgArea = { width: 275, height: 320, x: 0, y: 0 };

  return (
    <Show when={props.listOfParsedCTM()?.length}>
      <AverageErrorChartForTorque {...props} />
    </Show>
  );

  function AverageErrorChartForTorque(props) {
    return (
      <svg width={svgArea.width} height={svgArea.height}>
        <ChartPadding
          {...svgArea}
          paddingLeft={45}
          paddingRight={20}
          paddingTop={40}
          paddingBottom={20}
        >
          {(chartArea) => (
            <>
              {/* <ChartBorder {...chartArea} /> */}
              <text y={chartArea.y} dy="-1.2em">
                <tspan
                  dominant-baseline="ideographic"
                  text-anchor="middle"
                  x={svgArea.x + svgArea.width / 2}
                >
                  {props.title}
                </tspan>
                <tspan
                  dominant-baseline="ideographic"
                  text-anchor="middle"
                  x={svgArea.x + svgArea.width / 2}
                  dy="1.2em"
                >
                  {props.unit}
                </tspan>
              </text>
              <ChartPadding {...chartArea} paddingTop={20}>
                {(barArea) => (
                  <BarGroups {...barArea} {...props} unit=""></BarGroups>
                )}
              </ChartPadding>
            </>
          )}
        </ChartPadding>
      </svg>
    );
  }

  function BarGroups(props) {
    asserts.assertIsIntegerLike(props.analysisExtKey, "analysisExtKey");
    asserts.assertIsIntegerLike(props.analysisFlexKey, "analysisFlexKey");

    const groups = createMemo(() => {
      const ext = [];
      const flex = [];
      for (const { rawObject } of props.listOfParsedCTM()) {
        const { analysis } = rawObject;
        if (props.metric === "hq") {
          const isEccentric = rawObject.programType?.includes("eks/eks");
          const quadriceps = Math.abs(analysis[isEccentric ? 113 : 112]);
          const hamstrings = Math.abs(analysis[isEccentric ? 112 : 113]);
          const hq = quadriceps ? hamstrings / quadriceps : NaN;
          if (numberUtils.isNumber(hq)) ext.push(hq);
          continue;
        }
        const extValue = Math.abs(analysis[props.analysisExtKey]);
        const flexValue = Math.abs(analysis[props.analysisFlexKey]);

        if (
          !numberUtils.isNumber(extValue) ||
          !numberUtils.isNumber(flexValue)
        ) {
          continue;
        }

        if (extValue + flexValue === 0) {
          continue;
        }

        ext.push(extValue);
        flex.push(flexValue);
      }

      if (!ext.length) {
        return [];
      }

      return props.metric === "hq" ? [ext] : [ext, flex];
    });

    const maxValue = createMemo(
      () =>
        props.maxValue ??
        arrayUtils.maxValue(
          groups().map((values) => arrayUtils.maxValue(values)),
        ),
    );
    const colors = createMemo(() =>
      props.listOfParsedCTM()?.map((ctmData) => ctmData.baseColor),
    );
    const groupNames =
      props.metric === "hq" ? ["HQ-suhde"] : ["Ojennus", "Koukistus"];

    return (
      <>
              <ChartYAxisFloor
          {...props}
          decimals={props.decimals ?? 0}
          startValue={maxValue()}
          endValue={0}
          tickStep={props.tickStep}
        />
        <ChartPadding {...props} paddingInline={20}>
          {(barArea) => (
            <BarLineGroups
              {...barArea}
              gap={10}
              values={groups()}
              maxValue={maxValue()}
              colors={colors()}
              groupNames={groupNames}
            />
          )}
        </ChartPadding>
      </>
    );
  }
}
function BarLineGroups(props) {
  asserts.assertTypeNumber(props.x, "x");
  asserts.assertTypeNumber(props.y, "y");
  asserts.assertTypeNumber(props.width, "width");
  asserts.assertTypeNumber(props.height, "height");
  asserts.assert2DArrayOfNumbersOrEmptyArray(props.values, "values");
  asserts.assertTypeNumber(props.maxValue, "maxValue");

  props = mergeProps({ gap: 0 }, props);

  const barWidth = createMemo(
    () =>
      (props.width - (props.values.length - 1) * props.gap) /
      props.values.length,
  );

  return (
    <For each={props.values}>
      {(group, i) => (
        <ChartPadding
          {...props}
          x={props.x + barWidth() * i() + props.gap * i()}
          width={barWidth()}
        >
          {(barLineArea) => (
            <>
              <BarChartLine
                {...props}
                {...barLineArea}
                gap={0}
                values={group}
              />
              <line x1={props.x} x2={props.x} y1={props.y} y2={props.y + props.height} stroke="black" />
              <line x1={props.x} x2={props.x + props.width} y1={props.y + props.height} y2={props.y + props.height} stroke="black" />
              <ChartText
                position="bottom"
                {...barLineArea}
                title={props.groupNames?.[i()]}
              />
            </>
          )}
        </ChartPadding>
      )}
    </For>
  );
}

function BarChartLine(props) {
  asserts.assertTypeNumber(props.x, "x");
  asserts.assertTypeNumber(props.y, "y");
  asserts.assertTypeNumber(props.width, "width");
  asserts.assertTypeNumber(props.height, "height");
  asserts.assert1DArrayOfNumbersOrEmptyArray(props.values, "values");
  asserts.assertTypeNumber(props.maxValue, "maxValue");

  props = mergeProps({ gap: 0 }, props);

  const barWidth = createMemo(
    () =>
      (props.width - (props.values.length - 1) * props.gap) /
      props.values.length,
  );

  return (
    <For each={props.values}>
      {(value, i) => (
        <ChartPadding
          x={props.x + barWidth() * i() + props.gap * i()}
          width={barWidth()}
          height={(value / props.maxValue) * props.height}
          y={props.y + props.height - (value / props.maxValue) * props.height}
        >
          {(barArea) => (
            <>
              <ChartText
                position="top"
                {...barArea}
                title={props.significantFigures ? Number(value).toPrecision(props.significantFigures) : numberUtils.roundDecimals(value, props.decimals ?? 0)}
              />
              <rect {...barArea} fill={props.colors?.[i()] ?? "grey"}></rect>
            </>
          )}
        </ChartPadding>
      )}
    </For>
  );
}
