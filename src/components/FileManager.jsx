import { t } from "../i18n/index.js";
import {createSignal, createMemo, For, createEffect, on, Show} from "solid-js";
import {fileUtils} from "../utils/utils.js";
import {FileBrowser} from "./FileBrowser.jsx";
import {AverageChart} from "./AverageChart.jsx";
import {ThreeCharts} from "./ThreeCharts.jsx";
import {useGlobalContext} from "../providers.js";
import {MetricsSummary} from "./MetricsSummary.jsx";
import {PeakComparisonCharts} from "./PeakComparisonCharts.jsx";
import {IsometricView} from "./IsometricView.jsx";
import {isometricProtocol} from "../utils/measurementMetadata.js";
import {Button} from "./ui/Button.jsx";
import {
  parsedFileData,
  activeProgram,
  setActiveProgram,
  showErrorBands,
  setShowErrorBands,
  activeFileIndex,
} from "../signals.js";

export function FileManager() {
  const {activeFiles} = useGlobalContext();

  createEffect(
    on(parsedFileData, (files) => {
      const type = activeProgram();
      const programTypeIsValid = files.some(
        (file) => file.rawObject.programType === type,
      );
      if (programTypeIsValid) {
        return;
      }

      setActiveProgram(files[0]?.rawObject.programType);
    }),
  );

  const saveDataAsCSV = (data) => {
    const columns = ["Kammen voima", "Kammen nopeus", "Kammen kulma"].map(t);
    fileUtils.generateFileAndDownload(
      fileUtils.formatToCSV(data, columns),
      "data.csv",
      "csv",
    );
  };

  const printDataAsTextToConsole = (data) => {
    console.log(
      data.map((row) => row.map((val) => val.toFixed(3)).join("\t")).join("\n"),
    );
  };

  return (
    <div class="w-full h-full bg-gray-100 overflow-y-auto flex flex-col py-4 pr-4">
      <FileBrowser/>
      <div class="bg-white rounded-lg flex-1 overflow-auto">
        <div class="w-full h-full space-y-4 grid place-items-center items-start p-8">
          <Show when={isometricProtocol(activeFiles()[0])} fallback={<>
          <div class="w-full min-w-0">
            <AverageChart
              listOfParsedCTM={activeFiles}
              errorBands={showErrorBands()}
              comparisonFor={muscle => <PeakComparisonCharts listOfParsedCTM={activeFiles} muscle={muscle} />}
            />
          </div>
          <MetricsSummary listOfParsedCTM={activeFiles} programType={activeProgram()} />
          <Show when={activeFiles()[activeFileIndex()]}>
            {(activeFile) => (
              <>
                <ThreeCharts
                  parsedCTM={activeFile().rawObject}
                  fileIndex={activeFile().index}
                />
                <div class="flex gap-2 pb-6">
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => saveDataAsCSV(activeFile().rawObject.data)}
                  >
                    {t("Lataa CSV")}
                  </Button>
                  <Show when={location.href.includes("localhost")}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        printDataAsTextToConsole(activeFile().rawObject.data)
                      }
                    >
                      {t("Näytä konsolissa [DEBUG]")}
                    </Button>
                  </Show>
                </div>
              </>
            )}
          </Show>
          </>}><IsometricView listOfParsedCTM={activeFiles} /></Show>
        </div>
      </div>
    </div>
  );
}

