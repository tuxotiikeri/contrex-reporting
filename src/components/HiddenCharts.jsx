import { For, Show, createMemo } from "solid-js";
import { AverageChart } from "./AverageChart.jsx";
import { EnduranceWorkCharts } from "./EnduranceWorkCharts.jsx";
import { parsedFileData } from "../signals";
import { colors } from "../App.jsx";

// test types to include in the hidden charts
const TESTS = [
  "kons/kons 60/60",
  "kons/kons 240/240",
  "eks/eks 30/30",
  "kons/kons 180/180",
];

const PDF_KEYS = {
  "kons/kons 60/60": "kons60",
  "kons/kons 240/240": "kons240",
  "eks/eks 30/30": "eks30",
  "kons/kons 180/180": "kons180",
};

// prepare chart data grouped by test type
// assign a base color depending on the leg side
export function HiddenCharts() {
  const filteredGroups = createMemo(() => {
    const files = parsedFileData();
    return TESTS.map((testKey) => ({
      key: testKey,
      files: files
        .filter((f) => f.measurementType.includes(testKey))
        .map((f) => {
          return {
            ...f,
            baseColor: f.legSide === "right" ? colors.right[0] : colors.left[0],
          };
        }),
    }));
  });

  // hidden container holding SVG charts for PDF export
  return (
    <div id="all-charts-export" style={{ display: "none" }}>
      <For each={filteredGroups()}>
        {(group) =>
          group.files.length > 0 && (
            <div
              class="test-charts"
              key={group.key}
              data-test-key={PDF_KEYS[group.key] || group.key}
            >
              <Show
                when={group.key === "kons/kons 180/180"}
                fallback={<AverageChart listOfParsedCTM={() => group.files} errorBands={true} showHQ={false} svgWidth={450} svgHeight={250} />}
              >
                <EnduranceWorkCharts listOfParsedCTM={() => group.files} />
              </Show>
            </div>
          )
        }
      </For>
    </div>
  );
}
