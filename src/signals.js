import { batch, createSignal, untrack } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { signals } from "./collections/collections";

export const [parsedFileData, setParsedFileData] = createSignal([]);
export const [files, setFiles] = createSignal([]);
export const [selectedFiles, setSelectedFiles] = createSignal([]);
export const [$selectedSessionsCounts, storeSelectedSessionsCounts] =
  createStore({});
export const [sessions, setSessions] = createSignal([]);
export const [recentFolders, setRecentFolders] = createSignal([]);
export const [foldersThatHaveAccess, setFoldersThatHaveAccess] = createSignal(
  [],
);
export const [disabledRepetitions, setDisabledRepetitions] = createSignal({});
export const [filterByLastName, setFilterByLastName] = createSignal("");
export const [filterByFirstName, setFilterByFirstName] = createSignal("");
export const [filterBySubjectId, setFilterBySubjectId] = createSignal("");
export const [firstNameInput, setFirstNameInput] = createSignal("");
export const [lastNameInput, setLastNameInput] = createSignal("");
export const [subjectIdInput, setSubjectIdInput] = createSignal("");
export const [safeMode, setSafeMode] = createSignal(true);
export const [dataFiltering, setDataFiltering] =
  signals.localStorageBoolean(true);
export const [gravityCorrection, setGravityCorrection] =
  signals.localStorageBoolean("gravity-correction", true);
export const [sessionFilters, storeSessionFilters] = createStore({});
export const [activeProgram, setActiveProgram] = createSignal(null);
export const [showErrorBands, setShowErrorBands] = createSignal(true);
export const [patientProfile, setPatientProfile] = createSignal({
  sessionKey: null,
  sex: "",
  involvedSide: "",
  weight: "",
  additionalComment: "",
  referenceValues: "Ei käytössä",
});
export const [$hoveredRepetition, storeHoveredRepetition] = createStore({
  fileIndex: -1,
  repetitionIndex: -1,
});
export const [activeFileIndex, setActiveFileIndex] = createSignal(0);

export const openSessionsMemory = {};

export const toggleSelectedFile = (sessionId, selectedFile) => {
  const alreadySelected = selectedFiles().some(
    (file) => file.fileHandler === selectedFile.fileHandler,
  );
  batch(() => {
    if (alreadySelected) {
      setSelectedFiles((files) =>
        files.filter(
          (selection) => selection.fileHandler !== selectedFile.fileHandler,
        ),
      );

      storeSelectedSessionsCounts(
        produce((store) => {
          const newFiles = store[sessionId].filter(
            (file) => file !== selectedFile.fileHandler,
          );
          if (newFiles.length === 0) {
            delete store[sessionId];
          } else {
            store[sessionId] = newFiles;
          }
        }),
      );

      setDisabledRepetitions((reps) => {
        if (selectedFile.fileHandler.name in reps) {
          delete reps[selectedFile.fileHandler.name];
          return { ...reps };
        }

        return reps;
      });

      if (selectedFile.index >= untrack(activeFileIndex)) {
        setActiveFileIndex((v) => Math.max(v - 1, 0));
      }
    } else {
      setSelectedFiles((prev) => [...prev, selectedFile]);
      storeSelectedSessionsCounts(
        produce((store) => {
          store[sessionId] ??= [];
          store[sessionId].push(selectedFile.fileHandler);
        }),
      );
    }
  });
};
