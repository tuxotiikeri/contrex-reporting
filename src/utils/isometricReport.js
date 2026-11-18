import {localizedAutoTable as autoTable, reportText} from "../i18n/pdf.js";

// Each static trial has its own column. No averaging or repetition SD is used.
export async function appendIsometricPages(pdf, groups, options) {
  let firstPageAvailable = options.firstPageAvailable;
  const format = value => Number.isFinite(value) ? value.toFixed(1) : "–";
  for (const group of groups) {
    const images = [];
    for (const svg of group.charts.slice(0, 2)) images.push(await options.svgToPng(svg));
    const muscles = ["extension", "flexion"].map(direction => group.series.filter(item => item.result.protocol.direction === direction));
    const pages = Math.max(1, ...muscles.map(items => Math.ceil(items.length / 6)));
    for (let part = 0; part < pages; part++) {
      if (!firstPageAvailable) pdf.addPage();
      firstPageAvailable = false;
      options.addHeader(group);
      images.forEach(({dataUrl, width, height}, i) => pdf.addImage(dataUrl, "PNG", 10 + i * 95, 53, 95, 95 * height / width, undefined, "FAST"));
      let y = 112;
      for (const [index, direction] of ["extension", "flexion"].entries()) {
        const items = muscles[index].slice(part * 6, (part + 1) * 6);
        if (!items.length) continue;
        pdf.setFont("Helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(42, 57, 64);
        pdf.text(reportText(pdf, direction === "extension" ? "Etureisi" : "Takareisi"), 10, y);
        const metrics = [
          ["Huippuvääntö (Nm)", r => r.peak], ["Huippuvääntö (Nm / kg)", r => r.peakPerKg],
          ...[50, 100, 200].map(ms => [`T${ms} (Nm)`, r => r.torqueAt[ms]]),
          ...[50, 100, 200].map(ms => [`RTD 0-${ms} ms (Nm/s)`, r => r.rtd[ms]]),
        ];
        autoTable(pdf, {
          startY: y + 2, margin: {left: 10, right: 10},
          head: [["Mittari", ...items.map(item => item.label)]],
          body: metrics.map(([name, value], row) => [name, ...items.map(item => row === 1 && Number.isFinite(value(item.result)) ? value(item.result).toFixed(2) : format(value(item.result)))]),
          theme: "grid", styles: {font: "helvetica", fontSize: 7, cellPadding: 1.1, textColor: [42, 57, 64], lineColor: [230, 233, 235], lineWidth: 0.15, halign: "center"},
          headStyles: {fillColor: [238, 239, 240], textColor: [42, 57, 64], fontStyle: "bold"},
          columnStyles: {0: {cellWidth: 45, halign: "left"}},
        });
        y = pdf.lastAutoTable.finalY + 9;
      }
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(6.3); pdf.setTextColor(95, 105, 110);
      const rates = [...new Set(group.series.map(item => item.result.sampleRate))].join(" / ");
      const lines = [
        `${reportText(pdf, "Näytteenottotaajuus")}: ${rates} Hz. ${reportText(pdf, "RTD: väännön muutos alkukohdasta / aika (Nm/s).")}`,
        reportText(pdf, "Alkukohdan kynnys: lepotaso + max(0,5 Nm, 3 × SD), ylitys vähintään 20 ms."),
        reportText(pdf, "256 Hz: etenkin 50 ms:n RTD on herkkä alkukohdalle. Tarkista nousu ennen tulkintaa."),
        reportText(pdf, "Musta palkki: LSI poikkeaa yli 10 %. Ei automaattista paritusta usealle yritykselle."),
        ...group.series.map(item => `${item.label}: ${reportText(pdf, "Alkukohta")} ${item.result.onsetIndex == null ? "–" : ((item.result.onsetIndex - item.result.start) / item.result.sampleRate).toFixed(3)} s (${reportText(pdf, item.result.onsetSource === "manual" ? "Käsin valittu" : "Automaattinen")}); ${reportText(pdf, "Painovoimakorjaus")}: ${reportText(pdf, item.file.rawObject.gravityCorrection?.applied || item.file.rawObject.gravityCorrection?.alreadyApplied ? "Kyllä" : "Ei")}.${item.result.issues.length ? " " + item.result.issues.map(issue => reportText(pdf, issue)).join(" ") : ""}`),
      ];
      // Notes may continue on another page for very large trial selections.
      for (const line of lines) {
        const wrapped = pdf.splitTextToSize(line, 190);
        if (y + wrapped.length * 3 > 282) {pdf.addPage(); y = 20;}
        pdf.text(wrapped, 10, y); y += wrapped.length * 3 + 0.4;
      }
      pdf.setFontSize(6.5);
      pdf.text("Maffiuletti et al. (2016). DOI: 10.1007/s00421-016-3346-6", 10, 291);
    }
  }
}
