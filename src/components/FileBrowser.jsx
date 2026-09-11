import { t } from "../i18n/index.js";
import FilterFilesFromActiveFolders from "../workers/filterFilesFromActiveFolders.js?worker";
import parseSelectedFiles from "../workers/parseSelectedFiles.js?worker";
import {Checkbox} from "./ui/Checkbox.jsx";
import {FiChevronDown, FiChevronRight, FiEyeOff} from "solid-icons/fi";
import {IoDocumentTextSharp, IoFolderOutline} from "solid-icons/io";
import {
  batch,
  createEffect,
  createMemo,
  createRenderEffect,
  createResource,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {createStore, reconcile, unwrap} from "solid-js/store";
import {fileUtils, indexedDBUtils} from "../utils/utils";
import {
  $selectedSessionsCounts,
  dataFiltering,
  gravityCorrection,
  patientProfile,
  disabledRepetitions,
  files,
  filterByFirstName,
  filterByLastName,
  filterBySubjectId,
  firstNameInput,
  subjectIdInput,
  foldersThatHaveAccess,
  lastNameInput,
  recentFolders,
  safeMode,
  selectedFiles,
  sessionFilters,
  sessions,
  setFiles,
  setFilterByFirstName,
  setFilterByLastName,
  setFilterBySubjectId,
  setFirstNameInput,
  setSubjectIdInput,
  setFoldersThatHaveAccess,
  setLastNameInput,
  setParsedFileData,
  setRecentFolders,
  setSafeMode,
  setSelectedFiles,
  setSessions,
  storeSelectedSessionsCounts,
  storeSessionFilters,
  openSessionsMemory,
  toggleSelectedFile,
  setDisabledRepetitions,
} from "../signals";
import {useGlobalContext} from "../providers";
import {Button} from "./ui/Button.jsx";
import {Dropdown} from "./ui/Dropdown.jsx";
import {LanguageSelector} from "./LanguageSelector.jsx";
import {programLabel} from "../i18n/index.js";

export function FileBrowser() {
  const {activeFiles} = useGlobalContext();

  const translateLegSide = (value) => {
    // English -> Finnish (for display)
    if (value === "left") return "vasen";
    if (value === "right") return "oikea";
    // Finnish -> English (for filtering)
    if (value === "vasen") return "left";
    if (value === "oikea") return "right";

    return null;
  };

  const groupFilesBySession = (files) => {
    const sessionMap = {};
    for (const file of files) {
      if (!sessionMap[file.sessionId]) {
        sessionMap[file.sessionId] = [];
      }
      sessionMap[file.sessionId].push(file);
    }
    return Object.entries(sessionMap).map(([sessionId, sessionFiles]) => ({
      sessionId,
      files: sessionFiles,
    }));
  };

  const sortByDate = (a, b, date) => {
    const aDate = a.files[0].date.split(".").reverse().join("");
    const bDate = b.files[0].date.split(".").reverse().join("");
    if (date === "Vanhat") {
      return aDate.localeCompare(bDate);
    } else {
      return bDate.localeCompare(aDate);
    }
  };

  const sortByTime = (a, b, time) => {
    if (time === "Vanhat") {
      return a.localeCompare(b);
    } else {
      return b.localeCompare(a);
    }
  };

  // Apply filters & sorting to loaded files
  const filteredSessions = createMemo(() => {
    const {date, time, foot, speed, program} = sessionFilters;
    const firstName = filterByFirstName();
    const lastName = filterByLastName();
    const subjectId = filterBySubjectId();

    const returnArray = [];

    // Filter sessions with specified first/last names, if applicable
    sessions().forEach((session) => {
      if (
        firstName &&
        !session.files[0]?.subjectFirstName
          ?.toLowerCase()
          .includes(firstName.toLowerCase())
      ) {
        return;
      }
      if (subjectId && !session.files[0]?.subjectId?.toLowerCase().includes(subjectId)) {
        return;
      }
      if (
        lastName &&
        !session.files[0]?.subjectLastName
          ?.toLowerCase()
          .includes(lastName.toLowerCase())
      ) {
        return;
      }

      // Filter files by criteria
      if (speed || program || foot) {
        var ses = {
          ...session,
          files: session.files.filter((file) => {
            if (speed && file.speed !== speed) {
              return false;
            }
            if (program && file.program !== program) {
              return false;
            }
            if (foot && file.legSide !== foot) {
              return false;
            }

            return true;
          }),
        };
      } else {
        var ses = session;
      }

      if (!ses.files.length) {
        return;
      }

      returnArray.push(ses);
    });

    returnArray.sort((a, b) => {
      return (
        sortByDate(a, b, date) ||
        sortByTime(a.files[0].time || "", b.files[0].time || "", time)
      );
    });

    return returnArray;
  });

  createRenderEffect(
    on(
      recentFolders,
      async (folders) => {
        const newFoldersThatHaveAccess = [];

        for (const folderHandler of folders) {
          const access = await fileUtils.checkFileAccess(
            folderHandler,
            "readwrite",
          );
          if (access) {
            newFoldersThatHaveAccess.push(folderHandler);
          }
        }

        setFoldersThatHaveAccess(newFoldersThatHaveAccess);
      },
      {defer: true},
    ),
  );

  createRenderEffect(async () => {
    const files = await indexedDBUtils.getValue(
      "file-handlers",
      "recent-files",
    );
    setRecentFolders(files || []);
  });

  // Web Workers

  let fetchFilesFromFolderWorker;
  const sendToWorker = () => {
    if (window.Worker) {
      fetchFilesFromFolderWorker =
        fetchFilesFromFolderWorker instanceof Worker
          ? fetchFilesFromFolderWorker
          : new FilterFilesFromActiveFolders();
      fetchFilesFromFolderWorker.postMessage({
        activeFolders: foldersThatHaveAccess(),
      });

      fetchFilesFromFolderWorker.onmessage = async (message) => {
        if (message.data === "success") {
          const files = await indexedDBUtils.getValue(
            "file-handlers",
            "filtered-files",
          );
          const sessions = groupFilesBySession(files);
          setFiles(files);
          setSessions(sessions);
        }
      };
    }
  };

  let parseSelectedFilesWorker;
  createEffect(() => {
    if (window.Worker) {
      parseSelectedFilesWorker =
        parseSelectedFilesWorker instanceof Worker
          ? parseSelectedFilesWorker
          : new parseSelectedFiles();

      parseSelectedFilesWorker.postMessage({
        filesToParse: selectedFiles(),
        dataFiltering: dataFiltering(),
        gravityCorrection: gravityCorrection(),
        disabledRepetitions: disabledRepetitions(),
        patientProfile: patientProfile(),
      });

      parseSelectedFilesWorker.onmessage = async (message) => {
        if (message.data.type === "parsedFiles") {
          setParsedFileData(message.data.files);
        }
      };
    }
  });

  createRenderEffect(on(foldersThatHaveAccess, sendToWorker, {defer: true}));

  const handleOpenDirectory = async () => {
    const directoryHandler = await window.showDirectoryPicker({
      id: "innovation-project",
      mode: "readwrite",
    });
    const folders =
      (await indexedDBUtils.getValue("file-handlers", "recent-files")) || [];

    for (const folder of folders) {
      if (await folder.isSameEntry(directoryHandler)) {
        return;
      }
    }

    folders.push(directoryHandler);
    await indexedDBUtils.setValue("file-handlers", "recent-files", folders);

    setRecentFolders(folders);
  };

  // Display Filebrowser modal if no files selected
  createEffect(() => {
    if (!selectedFiles().length) {
      document.querySelector("#file-popup").showModal();
    }
  });

  // Apply filtering by first/last name input
  const handleSubmit = (e) => {
    e.preventDefault();
    batch(() => {
      setFilterByFirstName(firstNameInput().trim().toLowerCase());
      setFilterByLastName(lastNameInput().trim().toLowerCase());
      setFilterBySubjectId(subjectIdInput().trim().toLowerCase());
    });
  };

  const clearSelectedFiles = () => {
    batch(() => {
      setSelectedFiles([]);
      setDisabledRepetitions([]);
      storeSelectedSessionsCounts(reconcile({}));
    });
  };

  return (
    <>
      <dialog id="file-popup" class="space-y-4">
        <LanguageSelector />
        <Button
          variant="dangerAlt"
          size="xs"
          id="file-popup-close"
          class="mt-2 mr-2"
          onClick={() => document.querySelector("#file-popup").close()}
        >
          ✖︎
        </Button>

        <div class="flex justify-center">
          <Button variant="primary" size="xl" onClick={handleOpenDirectory}>
            {t("Valitse kansio")}
          </Button>
        </div>

        <ListOfRecentFolders/>
        <FileSearchForm/>
        <SafeSearchCheckbox/>
        <SessionsAsATable/>
      </dialog>
    </>
  );

  function activeFilesCountInsideSession(sessionId, files) {
    const count = $selectedSessionsCounts[sessionId]?.length;
    let sum = 0;
    if (count > 0) {
      $selectedSessionsCounts[sessionId].forEach((file) => {
        for (const f of files) {
          if (f.fileHandler === file) {
            sum++;
            break;
          }
        }
      });
    }
    return sum;
  }

  function SessionsAsATable() {
    // Render only sessions visible in the viewport + scrollMargin value
    const [visibility, storeVisibility] = createStore([]);

    const callback = (entries) => {
      for (const entry of entries) {
        storeVisibility(entry.target.dataset.index, entry.isIntersecting);
      }
    };

    const options = {
      scrollMargin: "800px",
    };
    const intersectionObserver = new IntersectionObserver(callback, options);

    onCleanup(() => {
      intersectionObserver.disconnect();
    });

    const collectedValues = createMemo(() => {
      const speedValues = new Set();
      const programValues = new Set();

      files().forEach((file) => {
        speedValues.add(file.speed);
        programValues.add(file.program);
      });

      return {speed: [...speedValues], program: [...programValues]};
    });

    return (
      <div class="session-table overflow-y-auto mt-2">
        <div class="session-header">
          <Dropdown label={t("Istunto / Tiedosto")} disabled/>
          <Dropdown
            label={t("Päivämäärä")}
            options={["Uudet", "Vanhat"]}
            onSelect={(value) => storeSessionFilters("date", value)}
            selected={sessionFilters.date}
          />
          <Dropdown
            label={t("Aika")}
            options={["Uudet", "Vanhat"]}
            onSelect={(v) => storeSessionFilters("time", v)}
            selected={sessionFilters.time}
          />
          <Dropdown label={t("Etunimi")} disabled/>
          <Dropdown label={t("Sukunimi")} disabled/>
          <Dropdown label={t("ID")} disabled/>
          <Dropdown
            label={t("Jalka")}
            options={["vasen", "oikea"]}
            onSelect={(value) =>
              storeSessionFilters("foot", translateLegSide(value))
            }
            selected={translateLegSide(sessionFilters.foot)}
          />
          <Dropdown
            label={t("Nopeus")}
            options={collectedValues().speed}
            onSelect={(value) => storeSessionFilters("speed", value)}
            selected={sessionFilters.speed}
          />
          <Dropdown
            label={t("Ohjelma")}
            options={collectedValues().program}
            onSelect={(value) => storeSessionFilters("program", value)}
            selected={sessionFilters.program}
          />
          <Dropdown label={t("Tiedostot")} disabled/>
        </div>
        <div class="session-body">
          <For each={filteredSessions()}>
            {(ses, i) => {
              const [opened, setOpened] = createSignal(
                openSessionsMemory[ses.sessionId],
              );
              const toggleOpen = () => {
                setOpened((s) => {
                  openSessionsMemory[ses.sessionId] = !s;
                  return !s;
                });
              };

              // Apply render optimization only when filebrowser is mounted
              let ref;
              onMount(() => {
                intersectionObserver.observe(ref);
              });

              onCleanup(() => {
                intersectionObserver.unobserve(ref);
              });

              return (
                <>
                  <div
                    attr:data-index={i()}
                    ref={ref}
                    class="session-row"
                    classList={{opened: opened()}}
                    onClick={toggleOpen}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleOpen();
                      }
                    }}
                  >
                    <Show when={visibility[i()]}>
                      <p class="identifier">
                        <input
                          type="checkbox"
                          onKeyDown={(e) => e.stopPropagation()}
                          checked={
                            activeFilesCountInsideSession(
                              ses.sessionId,
                              ses.files,
                            ) > 0
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            batch(() => {
                              const count = activeFilesCountInsideSession(
                                ses.sessionId,
                                ses.files,
                              );
                              if (count > 0) {
                                const files = unwrap(
                                  $selectedSessionsCounts[ses.sessionId],
                                );
                                ses.files.forEach((file) => {
                                  if (files.includes(file.fileHandler)) {
                                    toggleSelectedFile(ses.sessionId, file);
                                  }
                                });
                              } else {
                                ses.files.forEach((file) => {
                                  toggleSelectedFile(ses.sessionId, file);
                                });
                              }
                            });
                          }}
                          indeterminate={
                            activeFilesCountInsideSession(
                              ses.sessionId,
                              ses.files,
                            ) > 0 &&
                            activeFilesCountInsideSession(
                              ses.sessionId,
                              ses.files,
                            ) < ses.files.length
                          }
                        />
                        <Show
                          when={opened()}
                          fallback={
                            <FiChevronRight class="w-4 h-4 text-gray-500"/>
                          }
                        >
                          <FiChevronDown class="w-4 h-4 text-gray-500"/>
                        </Show>
                        <IoFolderOutline class="text-xl text-orange-400"/>
                        {ses.sessionId}
                      </p>
                      <p>{ses.files[0]?.date}</p>
                      <p>{ses.files[0]?.time}</p>
                      <Show
                        when={!safeMode()}
                        fallback={
                          <>
                            <p>{ses.files[0]?.subjectFirstName?.[0]}...</p>
                            <p>{ses.files[0]?.subjectLastName?.[0]}...</p>
                          </>
                        }
                      >
                        <p>{ses.files[0]?.subjectFirstName}</p>
                        <p>{ses.files[0]?.subjectLastName}</p>
                      </Show>
                      <p>{ses.files[0]?.subjectId}</p>
                      <p>-</p>
                      <p>-</p>
                      <p>-</p>
                      <p>{ses.files.length}</p>
                    </Show>
                  </div>
                  <Show when={opened()}>
                    <For
                      each={ses.files.toSorted((a, b) =>
                        sortByTime(a.time, b.time, sessionFilters.time),
                      )}
                    >
                      {(file) => (
                        <label class="file-row">
                          <p class="identifier">
                            <input
                              type="checkbox"
                              checked={selectedFiles().some(
                                (f) => f.fileHandler === file.fileHandler,
                              )}
                              onChange={() =>
                                toggleSelectedFile(ses.sessionId, file)
                              }
                            />
                            <IoDocumentTextSharp class="w-5 h-5 text-blue-400"/>
                            {file.name}
                          </p>
                          <p>{file.time}</p>
                          <p>-</p>
                          <p>-</p>
                          <p>{file.subjectId}</p>
                          <p>{t(translateLegSide(file.legSide))}</p>
                          <p>{file.speed}</p>
                          <p>{programLabel(file.program)}</p>
                          <p>-</p>
                        </label>
                      )}
                    </For>
                  </Show>
                </>
              );
            }}
          </For>
        </div>
      </div>
    );
  }

  function ListOfRecentFolders() {
    return (
      <ul class="space-y-2">
        <For each={recentFolders()}>
          {(directoryHandler, i) => (
            <RecentFolderItem directoryHandler={directoryHandler} i={i}/>
          )}
        </For>
      </ul>
    );
  }

  function RecentFolderItem(props) {
    const askForFolderAccess = async () => {
      const access = await fileUtils.checkOrGrantFileAccess(
        props.directoryHandler,
        "readwrite",
      );
      if (!access) return;
      setFoldersThatHaveAccess((folders) => [
        ...folders,
        props.directoryHandler,
      ]);
      mutate(false);
    };

    const removeRecentFolderByIndex = async () => {
      const files = await indexedDBUtils.mutateValue(
        "file-handlers",
        "recent-files",
        (result) => {
          const recentFiles = result || [];
          recentFiles.splice(props.i(), 1);
          return recentFiles;
        },
      );

      setRecentFolders(files);
    };

    const [doesNotHaveAccess, {mutate}] = createResource(
      () => props.directoryHandler,
      async (dir) => {
        return !(await fileUtils.checkFileAccess(dir));
      },
    );

    return (
      <li class="flex justify-between items-center bg-gray-50 p-2 rounded-lg shadow-sm">
        <span class="font-medium">{props.directoryHandler.name}</span>
        <div class="space-x-2">
          <Show when={doesNotHaveAccess()}>
            <Button variant="secondary" size="sm" onClick={askForFolderAccess}>
              {t("Lataa")}
            </Button>
          </Show>
          <Button
            variant="danger"
            size="sm"
            onClick={removeRecentFolderByIndex}
          >
            {t("Poista")}
          </Button>
        </div>
      </li>
    );
  }

  function FileSearchForm() {
    return (
      <form
        onSubmit={handleSubmit}
        class="flex justify-center items-center gap-3 mt-3"
      >
        <input
          type="text"
          placeholder={t("Etunimi")}
          value={firstNameInput()}
          onInput={(e) => setFirstNameInput(e.currentTarget.value)}
          class="p-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder={t("Subject ID")}
          value={subjectIdInput()}
          onInput={(e) => setSubjectIdInput(e.currentTarget.value)}
          class="p-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder={t("Sukunimi")}
          value={lastNameInput()}
          onInput={(e) => setLastNameInput(e.currentTarget.value)}
          class="p-2 border rounded-lg"
        />
        <Button variant="info" size="lg" type="submit">
          {t("Hae")}
        </Button>
      </form>
    );
  }

  function SafeSearchCheckbox() {
    return (
      <div class="flex items-center space-x-2 mt-3">
        <Checkbox
          id="safe-mode"
          label={t("Piilota nimet")}
          checked={safeMode()}
          onChange={() => setSafeMode((m) => !m)}
        />
        <FiEyeOff/>
        <Button
          variant={
            sessionFilters.foot ||
            sessionFilters.speed ||
            sessionFilters.program
              ? "danger"
              : "secondary"
          }
          size="xs"
          onClick={() => {
            storeSessionFilters({
              foot: "",
              speed: "",
              program: "",
            });
          }}
        >
          {t("Tyhjennä suodatus")}
        </Button>
        <Button
          variant={activeFiles().length ? "danger" : "secondary"}
          size="xs"
          onClick={clearSelectedFiles}
        >
          {t("Sulje valitut tiedostot")}
        </Button>
      </div>
    );
  }
}
