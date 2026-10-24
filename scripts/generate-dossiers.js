import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const propertiesPath = path.join(__dirname, '../src/data/properties.json');
const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));

const outputDir = path.join(__dirname, '../public/dossiers');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper to convert image to base64
function getImageBase64(imagePath) {
  const fullPath = path.join(__dirname, '../public', imagePath);
  if (fs.existsSync(fullPath)) {
    const bitmap = fs.readFileSync(fullPath);
    return `data:image/jpeg;base64,${bitmap.toString('base64')}`;
  }
  return null;
}

function generateDossier(prop) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // --- PAGE 1: COVER & PROPERTY PROFILE ---

  // Top Navy Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line
  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DOMINA', margin, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('REAL ESTATE LOCATION INTELLIGENCE | DOSSIER DI FATTIBILITÀ PRELIMINARE', margin + 30, 15);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`CODICE ASSET: ${prop.code}  |  PADOVA`, pageWidth - margin, 15, { align: 'right' });

  // Mandatory Warning Banner (Demonstrative)
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(239, 68, 68); // red-500
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 35, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text('DOCUMENTO DIMOSTRATIVO – NON COSTITUISCE UNA VERIFICA URBANISTICA UFFICIALE.', pageWidth / 2, 42, { align: 'center' });

  // Property Title & Subtitle
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(prop.name, margin, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${prop.address} - ${prop.district}, ${prop.city} (PD)`, margin, y);

  // Property Photo
  y += 6;
  const photoBase64 = getImageBase64(prop.image);
  const photoHeight = 65;
  if (photoBase64) {
    try {
      doc.addImage(photoBase64, 'JPEG', margin, y, contentWidth, photoHeight);
    } catch {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, photoHeight, 'F');
      doc.setTextColor(100, 116, 139);
      doc.text('[Fotografia dell\'immobile censito]', pageWidth / 2, y + photoHeight / 2, { align: 'center' });
    }
  }

  // Key Metrics Grid under photo
  y += photoHeight + 6;
  const colWidth = contentWidth / 4;
  const metrics = [
    { label: 'SUPERFICIE COPERTA', val: prop.coveredAreaSqm ? `${prop.coveredAreaSqm.toLocaleString()} m²` : 'Dato non disponibile' },
    { label: 'SUPERFICIE LOTTO', val: prop.lotAreaSqm ? `${prop.lotAreaSqm.toLocaleString()} m²` : 'Dato non disponibile' },
    { label: 'AREE ESTERNE / PARK', val: prop.externalAreaSqm ? `${prop.externalAreaSqm.toLocaleString()} m²` : 'Dato non disponibile' },
    { label: 'TIPOLOGIA ASSET', val: prop.categoryLabel.toUpperCase() },
  ];

  metrics.forEach((m, idx) => {
    const bx = margin + idx * colWidth;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, colWidth - 2, 16, 1, 1, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, bx + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, bx + 3, y + 12);
  });

  // Section: Descrizione dell'Opportunità
  y += 22;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DESCRIZIONE DELL\'IMMOBILE E OPPORTUNITÀ', margin + 6, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const descLines = doc.splitTextToSize(prop.description, contentWidth);
  doc.text(descLines, margin, y);

  y += descLines.length * 4.2 + 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  const oppLines = doc.splitTextToSize(`Nota di valorizzazione: ${prop.opportunityNotes}`, contentWidth);
  doc.text(oppLines, margin, y);

  // Section: Inquadramento Territoriale & Accessibilità
  y += oppLines.length * 4.2 + 6;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. INQUADRAMENTO TERRITORIALE E LOCALIZZAZIONE', margin + 6, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const geoText = `Coordinate: ${prop.coordinates[0].toFixed(5)}° N, ${prop.coordinates[1].toFixed(5)}° E  |  Quartiere: ${prop.district}`;
  doc.setFont('helvetica', 'bold');
  doc.text(geoText, margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  const contextLines = doc.splitTextToSize(prop.surroundingContext, contentWidth);
  doc.text(contextLines, margin, y);

  y += contextLines.length * 4.2 + 2;
  const accessLines = doc.splitTextToSize(`Accessibilità: ${prop.accessibilityNotes}`, contentWidth);
  doc.text(accessLines, margin, y);

  // Page 1 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Domina Location Intelligence  •  Dossier Urbanistico Dimostrativo', margin, pageHeight - 8);
  doc.text('Pagina 1 di 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // --- PAGE 2: URBAN PLANNING & TECHNICAL FEASIBILITY ---
  doc.addPage();

  // Top Navy Header Bar (compact)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 18, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('DOMINA | ANALISI URBANISTICA E NORMATIVA', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`${prop.code} – ${prop.name}`, pageWidth - margin, 12, { align: 'right' });

  // Status banner
  y = 26;
  const isPrelim = prop.urbanPlanning.verifiedStatus === 'Verifica preliminare effettuata';
  doc.setFillColor(isPrelim ? 240 : 254, isPrelim ? 253 : 249, isPrelim ? 244 : 242);
  doc.setDrawColor(isPrelim ? 34 : 245, isPrelim ? 197 : 158, isPrelim ? 94 : 11);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isPrelim ? 22 : 180, isPrelim ? 101 : 83, isPrelim ? 52 : 9);
  doc.text(`STATO ACQUISIZIONE DATI: ${prop.urbanPlanning.verifiedStatus.toUpperCase()}`, margin + 4, y + 6);

  // Section 3: Destinazione Urbanistica
  y += 14;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DESTINAZIONE URBANISTICA E STRUMENTI VIGENTI (PAT / PI)', margin + 6, y + 5.5);

  y += 11;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 34, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 34, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Classificazione P.A.T.:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(prop.urbanPlanning.patClassification, margin + 45, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Zonizzazione P.I.:', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(prop.urbanPlanning.piZoning, margin + 45, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Destinazioni ammesse:', margin + 4, y + 20);
  doc.setFont('helvetica', 'normal');
  const usesText = prop.urbanPlanning.allowedUses.join(' • ');
  const usesLines = doc.splitTextToSize(usesText, contentWidth - 48);
  doc.text(usesLines, margin + 45, y + 20);

  // Section 4: Vincoli e Prescrizioni
  y += 41;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. VINCOLI, FASCE DI RISPETTO E PRESCRIZIONI AMBIENTALI', margin + 6, y + 5.5);

  y += 10;
  const constraints = [
    { label: 'Vincoli di tutela / Paesaggistici (D.Lgs 42/2004):', text: prop.urbanPlanning.heritageConstraints },
    { label: 'Fasce di rispetto e limitazioni d\'uso:', text: prop.urbanPlanning.bufferZones },
    { label: 'Note ambientali e bonifiche:', text: prop.urbanPlanning.environmentalNotes },
  ];

  constraints.forEach(c => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`• ${c.label}`, margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const clines = doc.splitTextToSize(c.text, contentWidth - 6);
    doc.text(clines, margin + 4, y);
    y += clines.length * 4.2 + 2;
  });

  // Section 5: Valutazione Preliminare e Criticità
  y += 4;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. VALUTAZIONE PRELIMINARE E CRITICITÀ DA APPROFONDIRE', margin + 6, y + 5.5);

  y += 10;
  const colHalf = (contentWidth - 6) / 2;

  // Box Punti di Forza
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, colHalf, 45, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);
  doc.text('PUNTI DI FORZA DELL\'ASSET', margin + 4, y + 6);

  let py = y + 12;
  prop.urbanPlanning.strengths.forEach(s => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    const slines = doc.splitTextToSize(`✓ ${s}`, colHalf - 8);
    doc.text(slines, margin + 4, py);
    py += slines.length * 3.8 + 2;
  });

  // Box Criticità
  const colRightX = margin + colHalf + 6;
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(colRightX, y, colHalf, 45, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(153, 27, 27);
  doc.text('CRITICITÀ DA VERIFICARE IN SEDE TECNICA', colRightX + 4, y + 6);

  let cy = y + 12;
  prop.urbanPlanning.criticalIssues.forEach(c => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    const clines = doc.splitTextToSize(`! ${c}`, colHalf - 8);
    doc.text(clines, colRightX + 4, cy);
    cy += clines.length * 3.8 + 2;
  });

  // Section 6: Fonti e Note Legali
  y += 52;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('FONTI DOCUMENTALI E DATA DI ELABORAZIONE', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fonti: ${prop.urbanPlanning.sources}`, margin + 4, y + 10);
  doc.text(`Data di elaborazione: ${prop.urbanPlanning.elaborationDate}  |  Algoritmo di Location Intelligence Domina v1.0 MVP`, margin + 4, y + 14);
  doc.setFont('helvetica', 'italic');
  doc.text('Avviso: Questo dossier ha finalità illustrative per la valutazione di investimento e non sostituisce il Certificato di Destinazione Urbanistica (CDU) rilasciato dal Comune di Padova.', margin + 4, y + 18);

  // Page 2 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Domina Location Intelligence  •  Dossier Urbanistico Dimostrativo', margin, pageHeight - 8);
  doc.text('Pagina 2 di 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Save PDF
  const pdfBytes = doc.output();
  const filePath = path.join(outputDir, prop.pdfFileName);
  fs.writeFileSync(filePath, Buffer.from(pdfBytes, 'binary'));
  console.log(`Generated: ${prop.pdfFileName} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
}

properties.forEach(p => generateDossier(p));
console.log('All 5 dossiers generated successfully!');
