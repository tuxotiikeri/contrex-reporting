import { t } from "../i18n/index.js";
import {FiPrinter, FiHardDrive} from "solid-icons/fi";
import {batch, createEffect, createMemo, For, Show} from "solid-js";
import {generatePDF} from "../utils/pdfUtils";
import {ActiveProgramTypeButtons} from "./ActiveProgramTypeButtons.jsx";
import {
  activeProgram,
  selectedFiles,
  setSelectedFiles,
  storeHoveredRepetition,
  storeSelectedSessionsCounts,
  dataFiltering,
  setDataFiltering,
  gravityCorrection,
  setGravityCorrection,
  showErrorBands,
  setShowErrorBands,
  activeFileIndex,
  setActiveFileIndex,
  toggleSelectedFile,
  setDisabledRepetitions,
  patientProfile,
  setPatientProfile,
} from "../signals.js";
import {useGlobalContext} from "../providers.js";
import {Button} from "./ui/Button.jsx";
import {ListOfFileHandlerRepetitions} from "./ListOfFileHandlerRepetitions.jsx";
import {reconcile} from "solid-js/store";
import {IconButton} from "./ui/IconButton.jsx";
import {Checkbox} from "./ui/Checkbox.jsx";
import {referenceValueOptions, referenceValues} from "../data/referenceValues.js";

export function Sidebar() {
  const {activeFiles} = useGlobalContext();

  const toggleDataFiltering = () => setDataFiltering((s) => !s);
  const toggleGravityCorrection = () => setGravityCorrection((s) => !s);

  const clearSelectedFiles = () => {
    batch(() => {
      setSelectedFiles([]);
      setDisabledRepetitions([]);
      storeSelectedSessionsCounts(reconcile({}));
    });
  };

  createEffect(() => {
    const file = activeFiles()[0];
    if (!file) return;

    const session = file.rawObject.session;
    const sessionKey = `${session.subjectName ?? ""}-${session.subjectNameFirst ?? ""}-${session["date(dd/mm/yyyy)"] ?? ""}`;
    if (patientProfile().sessionKey === sessionKey) return;

    setPatientProfile({
      sessionKey,
      sex: Array.isArray(session.subjectSex)
        ? session.subjectSex.at(-1)
        : session.subjectSex ?? "",
      involvedSide: String(session.involvedSide ?? "").includes("vasen")
        ? "vasen"
        : String(session.involvedSide ?? "").includes("oikea")
          ? "oikea"
          : "",
      weight: session.subjectWeight ?? "",
      additionalComment: "",
      referenceValues: "Ei käytössä",
    });
  });

  const updatePatientProfile = (key, value) =>
    setPatientProfile((profile) => ({ ...profile, [key]: value }));

  const availableReferenceValueOptions = createMemo(() => {
    const { sex } = patientProfile();
    return referenceValueOptions.filter((option) => {
      const label = option.toLowerCase();
      if (sex === "Mies" && (label.includes("naiset") || label.includes("tytöt"))) return false;
      if (sex === "Nainen" && (label.includes("miehet") || label.includes("pojat"))) return false;
      return true;
    });
  });

  createEffect(() => {
    const selected = patientProfile().referenceValues;
    if (selected !== "Ei käytössä" && !availableReferenceValueOptions().includes(selected)) {
      updatePatientProfile("referenceValues", "Ei käytössä");
    }
  });

  return (
    <nav
      class="flex flex-col bg-gray-100
        p-4 rounded-none relative z-10
        h-full top-0 overflow-y-auto
        w-[360px] shrink-0"
    >
      <div class="flex flex-col gap-4 bg-white rounded-lg p-4 shadow-sm">
        {/* Files ja Print */}
        <div class="flex flex-col items-center gap-4 border border-gray-200 rounded-lg p-4">
          <div class="flex gap-4">
            <IconButton
              onClick={() => document.querySelector("#file-popup")?.showModal()}
              icon={FiHardDrive}
              label={t("Tiedostot")}
            />
            <Show when={activeFiles().length}>
              <IconButton
                onClick={generatePDF}
                icon={FiPrinter}
                label={t("Tulosta")}
              />
            </Show>
          </div>

          <Show when={!activeFiles().length}>
            <p class="text-sm text-gray-500 text-center mt-2">
              {t("Valitse tiedostot painamalla yllä olevaa painiketta.")}
            </p>
          </Show>
        </div>

        {/* Data Filter + Clear all laatikko */}
        <Show when={activeFiles().length}>
          <div class="flex flex-col gap-3 border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col gap-2">
                <Checkbox
                  id="dataFiltering"
                  label={t("Suodatus")}
                  checked={dataFiltering()}
                  onChange={toggleDataFiltering}
                />
                <Checkbox
                  id="gravityCorrection"
                  label={t("Painovoimakorjaus")}
                  checked={gravityCorrection()}
                  onChange={toggleGravityCorrection}
                />
                <Checkbox
                  label={t("Hajontakuvio")}
                  checked={showErrorBands()}
                  onChange={() => setShowErrorBands((s) => !s)}
                />
              </div>
              <Button
                variant="dangerAlt"
                size="xs"
                onClick={clearSelectedFiles}
                class="self-center"
              >
                {t("Sulje tiedostot")}
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-3 border border-gray-200 rounded-lg p-4">
            <p class="text-center font-medium text-gray-700">{t("Mitattavan tiedot")}</p>
            <label class="flex flex-col gap-1 text-sm text-gray-700">
              {t("Sukupuoli")}
              <select
                class="border border-gray-300 rounded px-2 py-1 bg-white"
                value={patientProfile().sex}
                onChange={(event) => updatePatientProfile("sex", event.currentTarget.value)}
              >
                <option value="">{t("Ei tiedossa")}</option>
                <option value="Mies">{t("Mies")}</option>
                <option value="Nainen">{t("Nainen")}</option>
                <option value="Muu">{t("Muu")}</option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm text-gray-700">
              {t("Oireileva jalka")}
              <select
                class="border border-gray-300 rounded px-2 py-1 bg-white"
                value={patientProfile().involvedSide}
                onChange={(event) => updatePatientProfile("involvedSide", event.currentTarget.value)}
              >
                <option value="">{t("Ei määritetty")}</option>
                <option value="vasen">{t("Vasen")}</option>
                <option value="oikea">{t("Oikea")}</option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm text-gray-700">
              {t("Paino [kg]")}
              <input
                class="border border-gray-300 rounded px-2 py-1"
                type="number"
                min="1"
                value={patientProfile().weight}
                onInput={(event) => updatePatientProfile("weight", event.currentTarget.value)}
              />
            </label>
            <label class="flex flex-col gap-1 text-sm text-gray-700">
              {t("Lisäkommentti")}
              <textarea
                class="border border-gray-300 rounded px-2 py-1 min-h-16"
                value={patientProfile().additionalComment}
                onInput={(event) => updatePatientProfile("additionalComment", event.currentTarget.value)}
                placeholder={t("Esim. 6 kk leikkauksesta")}
              />
            </label>
            <label class="flex flex-col gap-1 text-sm text-gray-700">
              {t("Viitearvot")}
              <select
                class="border border-gray-300 rounded px-2 py-1 bg-white"
                value={patientProfile().referenceValues}
                onChange={(event) => updatePatientProfile("referenceValues", event.currentTarget.value)}
              >
                <option value="Ei käytössä">{t("Ei käytössä")}</option>
                <For each={availableReferenceValueOptions()}>
                  {(option) => <option value={option}>{t(option)}</option>}
                </For>
              </select>
            </label>
            <Show when={patientProfile().referenceValues !== "Ei käytössä"}>
              <p class="rounded bg-slate-50 p-2 text-xs text-slate-600">
                {t(referenceValues[patientProfile().referenceValues]?.source)}
              </p>
            </Show>
          </div>
        </Show>

        {/* Program types */}
        <Show when={activeFiles().length}>
          <div class="flex flex-wrap justify-center gap-2 border border-gray-200 rounded-lg p-3">
            <ActiveProgramTypeButtons/>
          </div>
          {/* Active files and repetitions */}
          <ActiveFilesAndRepetitions/>
        </Show>
      </div>
    </nav>
  );
}

function ActiveFilesAndRepetitions() {
  const {activeFiles} = useGlobalContext();

  createEffect(() => {
    activeProgram();
    setActiveFileIndex(0);
  });

  const activeFile = createMemo(
    () => activeFiles()[activeFileIndex()] ?? activeFiles()[0],
  );

  const sideLabels = {
    left: "Vasen",
    right: "Oikea",
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Left / Right box */}
      <div class="border border-gray-200 rounded-lg p-4">
        <div class="grid grid-cols-2 gap-2">
          <For each={["left", "right"]}>
            {(side) => (
              <div class="flex-1 flex flex-col bg-gray-50 border border-gray-100 rounded-lg p-2">
                <p class="text-center font-semibold text-gray-700 mb-2">
                  {t(sideLabels[side] ?? side)}
                </p>
                <div class="flex flex-col gap-2">
                  <For
                    each={activeFiles().filter(
                      (f) => f.legSide?.toLowerCase() === side,
                    )}
                  >
                    {(fileHandler) => {
                      const originalIndex = () =>
                        activeFiles().findIndex((f) => f === fileHandler);
                      const isActive = () => activeFile() === fileHandler;

                      return (
                        <div class="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={isActive() ? "primaryAlt" : "default"}
                            onClick={() => setActiveFileIndex(originalIndex())}
                            class="flex items-center justify-between gap-2 w-full"
                          >
                            {t(sideLabels[fileHandler.legSide?.toLowerCase()] ??
                              fileHandler.legSide)}
                            <span
                              class="w-2 h-2 rounded-full"
                              style={{
                                "background-color": fileHandler.baseColor,
                              }}
                            />
                          </Button>

                          <Button
                            size="xs"
                            variant="dangerAlt"
                            label="︎×"
                            onClick={() =>
                              toggleSelectedFile(
                                fileHandler.sessionId,
                                selectedFiles()[fileHandler.index],
                              )
                            }
                          />
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Repetitions box */}
      <div class="border border-gray-200 rounded-lg p-4">
        <p class="text-center font-medium">
          {activeFile().name} {activeFile().time}
        </p>
        <p class="text-center text-gray-700 mt-1 mb-3">{t("Toistot")}</p>

        <div class="overflow-y-auto max-h-[200px]">
          <ul
            class="flex flex-col items-center gap-1"
            onMouseLeave={clearRepetitionHover}
          >
            <ListOfFileHandlerRepetitions fileHandler={activeFile()}/>
          </ul>
        </div>
      </div>
    </div>
  );
}

function clearRepetitionHover() {
  storeHoveredRepetition({fileIndex: -1, repetitionIndex: -1});
}
