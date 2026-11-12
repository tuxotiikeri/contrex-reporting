import { For, Show, createMemo } from "solid-js";
import { AverageChart } from "./AverageChart.jsx";
import { EnduranceWorkCharts } from "./EnduranceWorkCharts.jsx";
import { parsedFileData } from "../signals";
import { colors } from "../App.jsx";
import {measurementProtocolKey} from "../utils/measurementMetadata.js";

// test types to include in the hidden charts
const TESTS = [
  "kons60", "kons240", "eks30", "eks60", "kons180",
];

// prepare chart data grouped by test type
// assign a base color depending on the leg side
export function HiddenCharts() {
  const filteredGroups = createMemo(() => {
    const files = parsedFileData();
    return TESTS.map((testKey) => ({
      key: testKey,
      files: files
        .filter((f) => measurementProtocolKey(f) === testKey)
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
              data-test-key={group.key}
            >
              <Show
                when={group.key === "kons180"}
                fallback={<AverageChart listOfParsedCTM={() => group.files} errorBands={true} showHQ={false} svgWidth={450} svgHeight={320} />}
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
