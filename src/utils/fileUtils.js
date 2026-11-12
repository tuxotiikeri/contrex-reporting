import { asserts } from "../collections/collections";
import { CTMUtils } from "./utils";
import {decodeMeasurementBuffer} from "./measurementText.js";

export const generateFileAndDownload = (data, filename, type) => {
  asserts.assertTypeString(data);
  asserts.assertTypeString(filename);
  asserts.assertTypeString(type);

  const file = new Blob([data], { type: type }),
    a = document.createElement("a"),
    url = URL.createObjectURL(file);

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
};

export const formatToCSV = (table, columns) => {
  asserts.assert2DArray(table);

  const csv = table
    .map((row) => {
      return row
        .map((value) => {
          if (typeof value === "number") {
            return value.toString().replace(".", ",");
          }
          return value;
        })
        .join(";");
    })
    .join("\n");

  if (columns) {
    asserts.assertTypeArray(columns);
    return columns.join(";") + "\n" + csv;
  }

  return csv;
};

export const fetchCTMFileWithName = async (fileName) => {
  const response = await fetch("./" + fileName);
  const buffer = await response.arrayBuffer();
  return decodeMeasurementBuffer(buffer);
};

export const askForFileAccess = async (
  directoryHandler,
  mode = "readwrite",
) => {
  const opts = { mode };
  const access = await directoryHandler.requestPermission(opts);
  return access === "granted";
};

export const checkFileAccess = async (directoryHandler, mode = "readwrite") => {
  const opts = { mode };
  const access = await directoryHandler.queryPermission(opts);
  return access === "granted";
};

export const checkOrGrantFileAccess = async (
  directoryHandler,
  mode = "readwrite",
) => {
  const access = await checkFileAccess(directoryHandler, mode);
  if (access) {
    return true;
  }

  return await askForFileAccess(directoryHandler, mode);
};
