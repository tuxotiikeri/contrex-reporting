import { indexedDBUtils } from "../utils/utils";

onmessage = async (message) => {
  const { activeFolders } = message.data;
  if (!activeFolders) {
    return;
  }

  const filteredFiles = [];

  // Load files in batches to improve performance for large file trees
  const batchPromises = [];
  const batchResolvers = [];
  const batchSize = 500;

  let currentBatch = 0;
  let filesStartedReading = 0;
  let filesFinishedReading = 0;

  const { promise: allFilesPromise, resolve: allFilesResolve } =
    Promise.withResolvers();
  for (const folderHandler of activeFolders) {
    for await (const fileHandler of getFilesRecursively(folderHandler)) {
      if (
        fileHandler.name.endsWith(".CTM") ||
        fileHandler.name.endsWith(".cxp")
      ) {
        filesStartedReading++;
        if (filesStartedReading % batchSize === 0) {
          const { promise, resolve } = Promise.withResolvers();
          batchPromises[Math.round(filesStartedReading / batchSize)] = promise;
          batchResolvers[Math.round(filesStartedReading / batchSize)] = resolve;
        }
        fileHandler.getFile().then(async (file) => {
          const batchIndex = Math.floor(currentBatch++ / batchSize);
          if (batchIndex > 0) {
            await batchPromises[batchIndex];
          }
          file.text().then((text) => {
            if (++filesFinishedReading === filesStartedReading) {
              allFilesResolve();
            }
            if (filesFinishedReading % batchSize === 0) {
              batchResolvers[Math.round(filesFinishedReading / batchSize)]();
            }
            filteredFiles.push(parseCTMForFiltering(text, fileHandler));
          });
        });
      }
    }
  }
  // Wait for all batches to complete before sorting
  await allFilesPromise;
  filteredFiles.sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );

  await indexedDBUtils.setValue(
    "file-handlers",
    "filtered-files",
    filteredFiles,
  );

  postMessage("success");
};

async function* getFilesRecursively(entry) {
  if (entry.kind === "file") {
    yield entry;
  } else if (entry.kind === "directory") {
    for await (const handle of entry.values()) {
      yield* getFilesRecursively(handle);
    }
  }
}

function parseCTMForFiltering(text, fileHandler) {
  if (!parseCTMForFiltering.sessionMap) parseCTMForFiltering.sessionMap = {};
  if (!parseCTMForFiltering.sessionCounter)
    parseCTMForFiltering.sessionCounter = 0;

  const sections = text.split(/\[(.*)\]/g);
  const parsedFile = {};

  for (let i = 1; i < sections.length; i += 2) {
    const header = sections[i];
    const data = sections[i + 1];

    if (header === "Configuration") {
      parsedFile.legSide = extractDataFromString(data, "side");
      parsedFile.speed = extractDataFromString(data, "speed");
      parsedFile.program = extractDataFromString(data, "program");
    }

    if (header === "Measurement" || header === "session") {
      const rows = data
        .replaceAll("\r", "")
        .trim()
        .split("\n")
        .map((row) => row.trim().split("\t"));
      parsedFile[header] = Object.fromEntries(
        rows.filter((row) => row.length > 1),
      );
    }
  }

  const { Measurement: measurement = {}, session = {} } = parsedFile;
  const date = measurement["date (dd/mm/yyyy)"] || "00.00.0000";
  const subjectFirstName = session["subject name first"] || "-";
  const subjectLastName = session["subject name"] || "-";
  const subjectId = findSessionValue(session, ["subject id", "subjectid", "id"]) || findSessionValue(measurement, ["subject id", "subjectid", "id"]) || "-";
  const sessionKey = date + subjectId + subjectFirstName + subjectLastName;

  if (!parseCTMForFiltering.sessionMap[sessionKey]) {
    parseCTMForFiltering.sessionCounter += 1;
    parseCTMForFiltering.sessionMap[sessionKey] =
      parseCTMForFiltering.sessionCounter;
  }

  const sessionNumber = parseCTMForFiltering.sessionMap[sessionKey];
  const sessionId = `Istunto ${sessionNumber}`;

  return {
    fileHandler,
    name: fileHandler.name.replace(/\.CTM$/i, ""),
    measurementType: measurement.name,
    date,
    time: measurement["time (hh/mm/ss)"].split(/\.|:/g, 2).join(":"),
    subjectFirstName,
    subjectLastName,
    subjectId,
    sessionId,
    legSide: parsedFile.legSide,
    program: parsedFile.program,
    speed: parsedFile.speed,
  };
}

function findSessionValue(session, acceptedKeys) {
  const normalizedKeys = new Set(acceptedKeys.map((key) => key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase()));
  for (const [key, value] of Object.entries(session)) {
    const normalizedKey = key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
    if (normalizedKeys.has(normalizedKey) && String(value).trim()) return String(value).trim();
  }
  return "";
}

const extractDataFromString = (data, key) => {
  const keyIndex = data.indexOf(key);
  const newLineIndex = data.indexOf("\n", keyIndex);
  const line = data.substring(keyIndex, newLineIndex);
  const parts = line.split("\t");

  switch (key) {
    case "side":
      return parts.at(-1).trim();
    case "speed":
      let values = parts.slice(1).map((v) => v.trim());
      return values.join("/");
    case "program":
      let lastval = parts[2].split(" ").map((s) => s.trim());
      return lastval[2];
  }
};
