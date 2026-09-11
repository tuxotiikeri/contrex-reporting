# Display languages

`LanguageSelector` in the Files dialog changes the shared Solid signal. Finnish
is the default; the last selection is saved locally in the browser. Storage being
blocked does not prevent language switching during the current visit.

Add Finnish display text and its English translation to `catalog.js`, then call
`t("Finnish display text")` at the render site. Keep the call reactive: do not
translate module-level constants or cache the returned string at startup.

Only labels are translated. Protocol keys, side identifiers, reference-set keys,
participant input, source files and numeric measurements remain unchanged.
Dropdowns must return their original values, not the translated labels.

PDF export captures the language and chart SVGs at the start so an in-progress
report cannot mix languages. Use `reportText(pdf, value)` for report text and
`localizedAutoTable` for report tables. Built-in PDF fonts require supported
mathematical glyphs; `pdfSafeText` handles these separately from UI translation.

Run `npm test` for translation, storage, reference-data and PDF regression tests.
