import { language, setLanguage, t } from "../i18n/index.js";

export function LanguageSelector() {
  return (
    <label class="flex items-center justify-center gap-2 text-sm text-gray-700">
      {t("Kieli")}
      <select class="border border-gray-300 rounded px-3 py-2 bg-white"
        aria-label="Kieli / Language" value={language()}
        onChange={(event) => setLanguage(event.currentTarget.value)}>
        <option value="fi" lang="fi">Suomi</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  );
}
