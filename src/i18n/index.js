import { createSignal } from "solid-js";
import { translate, translateProgram } from "./catalog.js";

export const LANGUAGE_STORAGE_KEY = "contrex-reporting-language";
export function readLanguage(storage) {
  try { return storage?.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "fi"; }
  catch { return "fi"; }
}
let initialLanguage = "fi";
try { initialLanguage = readLanguage(globalThis.localStorage); } catch { /* Storage may be disabled. */ }
const [language, updateLanguage] = createSignal(initialLanguage);
export { language };
export function setLanguage(value) {
  const next = value === "en" ? "en" : "fi";
  updateLanguage(next);
  try { globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Keep the in-memory selection. */ }
  if (typeof document !== "undefined") document.documentElement.lang = next;
}
export const t = (text) => translate(text, language());
export const programLabel = (value) => translateProgram(value, language());
export const sideLabel = (side) => t(({left: "Vasen", right: "Oikea"})[side] ?? side);
