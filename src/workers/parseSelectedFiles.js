import { CTMUtils } from "../utils/utils";

// Parse files for graph handling
onmessage = async (message) => {
  const {
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
      const text = await file.text();
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
    type: "parsedFiles",
    files,
  });
};
