import test from 'node:test';
import assert from 'node:assert/strict';
import {jsPDF} from 'jspdf';
import {english, translate, translateProgram, translateTableRows} from '../src/i18n/catalog.js';
import {LANGUAGE_STORAGE_KEY, language, readLanguage, setLanguage, t, programLabel} from '../src/i18n/index.js';
import {setReportLanguage, reportText, localizedAutoTable, pdfSafeText} from '../src/i18n/pdf.js';
import {referenceValues} from '../src/data/referenceValues.js';

test('Finnish remains the default; unknown text and measurements are preserved', () => {
  assert.equal(translate('Huippuvääntö (Nm)'), 'Huippuvääntö (Nm)');
  assert.equal(translate('Huippuvääntö (Nm)', 'en'), 'Peak torque (Nm)');
  for (const value of [239, 0, null, undefined, 'XXX016', 'constructor', 'Åke Testinen']) {
    assert.equal(translate(value, 'en'), value);
  }
  assert.deepEqual(translate(['Etureisi', 'Takareisi'], 'en'), ['Quadriceps', 'Hamstrings']);
});

test('saved language is read safely, including unavailable or blocked storage', () => {
  assert.equal(readLanguage(), 'fi');
  assert.equal(readLanguage({getItem: () => 'de'}), 'fi');
  assert.equal(readLanguage({getItem: () => {throw new Error('blocked');}}), 'fi');
  assert.equal(readLanguage({getItem: key => key === LANGUAGE_STORAGE_KEY ? 'en' : null}), 'en');
});

test('language switch persists, updates display labels and falls back safely', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const writes = [];
  try {
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {setItem: (...args) => writes.push(args)}});
    setLanguage('en');
    assert.equal(language(), 'en');
    assert.equal(t('Oikea'), 'Right');
    assert.equal(programLabel('eks/eks 30/30'), 'ecc/ecc 30/30');
    assert.deepEqual(writes.at(-1), [LANGUAGE_STORAGE_KEY, 'en']);
    setLanguage('fi');
    assert.equal(t('Oikea'), 'Oikea');
    assert.equal(programLabel('eks/eks 30/30'), 'eks/eks 30/30');
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() {throw new Error('blocked');}});
    setLanguage('en');
    assert.equal(t('Tiedostot'), 'Files');
    setLanguage('unsupported');
    assert.equal(language(), 'fi');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
    setLanguage('fi');
  }
});

test('protocol labels and reference labels do not change stored keys or values', () => {
  const protocol = 'oj/kouk 500 Nm isokin. ballistinen kons/kons 60/60';
  assert.equal(translateProgram(protocol, 'en'), 'ext/flex 500 Nm isokinetic ballistic con/con 60/60');
  assert.equal(translateProgram(protocol, 'fi'), protocol);
  const before = structuredClone(referenceValues);
  for (const [key, ref] of Object.entries(referenceValues)) {
    assert.ok(Object.hasOwn(english, key), `Missing reference option translation: ${key}`);
    assert.ok(Object.hasOwn(english, ref.label), `Missing reference label translation: ${ref.label}`);
    assert.notEqual(translate(ref.label, 'en'), ref.label);
  }
  assert.deepEqual(referenceValues, before);
});

test('table localization preserves precision, styles, missing values and input data', () => {
  const rows = [[{content: 'ETUREISI', colSpan: 3, styles: {fontStyle: 'bold'}}], ['Huippuvääntö (Nm / kg)', 3.175, '–']];
  const before = structuredClone(rows);
  const result = translateTableRows(rows, 'en');
  assert.equal(result[0][0].content, 'QUADRICEPS');
  assert.equal(result[0][0].colSpan, 3);
  assert.deepEqual(result[0][0].styles, before[0][0].styles);
  assert.deepEqual(result[1], ['Peak torque (Nm / kg)', 3.175, '–']);
  assert.deepEqual(rows, before);
});

test('each PDF captures one language for text and table headings throughout export', () => {
  try {
    setLanguage('en');
    const englishPdf = new jsPDF();
    setReportLanguage(englishPdf);
    setLanguage('fi');
    assert.equal(reportText(englishPdf, 'Maksimivoima'), 'Maximal strength');
    localizedAutoTable(englishPdf, {
      head: [['Mittari', 'Oikea', 'Vasen']],
      body: [[{content: 'ETUREISI', colSpan: 3}], ['Huippuvääntö (Nm)', 239, 238]],
    });
    assert.deepEqual(englishPdf.lastAutoTable.head[0].cells[0].text, ['Measure']);
    assert.deepEqual(englishPdf.lastAutoTable.body[0].cells[0].text, ['QUADRICEPS']);
    assert.deepEqual(englishPdf.lastAutoTable.body[1].cells[1].text, ['239']);
    const finnishPdf = new jsPDF();
    setReportLanguage(finnishPdf);
    setLanguage('en');
    assert.equal(reportText(finnishPdf, 'Maksimivoima'), 'Maksimivoima');
  } finally {setLanguage('fi');}
});

test('PDF math signs use glyphs supported by the report font without altering accents', () => {
  assert.deepEqual(pdfSafeText(['≥ 60', '≤ 100', '100 − 90', 'Etureisi', 'Vääntö (Nm)']),
    ['>= 60', '<= 100', '100 - 90', 'Etureisi', 'Vääntö (Nm)']);
});
