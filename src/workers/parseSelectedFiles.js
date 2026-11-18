import { CTMUtils } from "../utils/utils";
import {readMeasurementFile} from "../utils/measurementText.js";

// Parse files for graph handling
onmessage = async (message) => {
  const {
    requestId,
    filesToParse,
    dataFiltering,
    gravityCorrection,
    disabledRepetitions,
    patientProfile,
  } = message.data;
  if (!filesToParse) {
    return;
  }
  let files = [];

  for (let i = 0; i < filesToParse.length; i++) {
    const { fileHandler } = filesToParse[i];
    if (fileHandler.kind === "file") {
      const file = await fileHandler.getFile();
      const text = await readMeasurementFile(file);
      const disabledList = disabledRepetitions[file.name] || {};
      const rawObject = CTMUtils.parseTextToObject(
        text,
        dataFiltering,
        disabledList,
        gravityCorrection,
        patientProfile,
      );

      if (rawObject == null) {
        continue;
      }

      files.push({
        ...filesToParse[i],
        name: file.name,
        index: files.length,
        rawObject,
      });
    }
  }

  postMessage({
    requestId,
    type: "parsedFiles",
    files,
  });
};
