// Older CON-TREX exports use Windows-1252; Blob.text() assumes UTF-8 and
// irreversibly replaces ä/ö/å with U+FFFD before the name reaches the report.
export function decodeMeasurementBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", {fatal: true}).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function readMeasurementFile(file) {
  return decodeMeasurementBuffer(await file.arrayBuffer());
}
