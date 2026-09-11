import { For } from "solid-js";
import { activeProgram, parsedFileData, setActiveProgram } from "../signals.js";
import { Button } from "./ui/index.js";
import {programLabel} from "../i18n/index.js";

export function ActiveProgramTypeButtons() {
  return (
    <For
      each={[
        ...new Set(
          parsedFileData().map(({ rawObject }) => rawObject.programType),
        ),
      ].sort()}
    >
      {(programType) => (
        <Button
          variant={activeProgram() === programType ? "primaryAlt" : "secondary"}
          size="sm"
          onClick={() => setActiveProgram(programType)}
        >
          {programLabel(programType)}
        </Button>
      )}
    </For>
  );
}
