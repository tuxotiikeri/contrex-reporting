import "./App.css";
import { Sidebar } from "./components/Sidebar.jsx";
import { FileManager } from "./components/FileManager.jsx";
import { activeProgram, parsedFileData } from "./signals.js";
import { createMemo } from "solid-js";
import { GlobalContext } from "./providers.js";
import { HiddenCharts } from "./components/HiddenCharts.jsx";

export const colors = {
  right: [
    "oklch(0.792 0.209 151.711)",
    "oklch(84.1% 0.238 128.85)",
    "oklch(90.5% 0.182 98.111)",
  ],
  left: [
    "oklch(70.4% 0.191 22.216)",
    "oklch(71.8% 0.202 349.761)",
    "oklch(71.4% 0.203 305.504)",
  ],
  fallback: [
    "oklch(62.3% 0.214 259.815)",
    "oklch(68.5% 0.169 237.323)",
    "oklch(71.5% 0.143 215.221)",
  ],
};

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

    return parsedFileData()
      .filter(({ rawObject }) => rawObject.programType === program)
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
