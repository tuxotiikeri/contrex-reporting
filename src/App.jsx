import "./App.css";
import { Sidebar } from "./components/Sidebar.jsx";
import { FileManager } from "./components/FileManager.jsx";
import { activeProgram, parsedFileData } from "./signals.js";
import { createMemo } from "solid-js";
import { GlobalContext } from "./providers.js";
import { HiddenCharts } from "./components/HiddenCharts.jsx";

import {colors, isometricTrialColours} from "./data/seriesColors.js";
import {isometricProtocol} from "./utils/measurementMetadata.js";
export {colors} from "./data/seriesColors.js";

function App() {
  const activeFiles = createMemo(() => {
    const program = activeProgram();
    if (!program) {
      return [];
    }

    const indices = {
      left: 0,
      right: 0,
    };

    const matching = parsedFileData().filter(({rawObject}) => rawObject.programType === program);
    if (isometricProtocol(matching[0])) {
      const palette = isometricTrialColours(matching);
      return matching.map((file, index) => ({...file, baseColor: palette[index]}));
    }
    return matching
      .map((row) => {
        // Fallback color is blue
        const colorList = colors[row.legSide] ?? colors.fallback;
        return {
          ...row,
          baseColor: colorList[indices[row.legSide]++ % colorList.length],
        };
      });
  });

  return (
    <GlobalContext.Provider value={{ activeFiles }}>
      <div class="w-full h-full inset-0 absolute">
        <div class="grid grid-cols-[360px_minmax(0,1fr)] w-full h-full max-w-[1800px] mx-auto">
          <Sidebar />
          <FileManager />
        </div>
      </div>
      <HiddenCharts />
    </GlobalContext.Provider>
  );
}

export default App;
