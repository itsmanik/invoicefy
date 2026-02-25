// server/pdf-service/pdf.generator.js

const PDFDocument = require('pdfkit');

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatCurr = (num) => `Rs. ${Number(num).toFixed(2)}`;

// ─── Watermark (drawn on every page) ─────────────────────────────────────────
const drawWatermark = (doc, text) => {
  if (!text || !text.trim()) return;
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.save();
    doc.opacity(0.07)
       .rotate(-45, { origin: [297, 420] })
       .fontSize(72)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(text.toUpperCase(), 0, 340, { align: 'center', width: 595 });
    doc.restore();
  }
};

// ─── TEMPLATE: classic (original blue theme) ─────────────────────────────────
const renderClassic = (doc, invoice, client) => {
  const primaryColor  = '#2563EB';
  const secondaryColor = '#4B5563';
  const lightGray     = '#F3F4F6';
  const borderColor   = '#E5E7EB';

  // Header
  doc.fillColor(primaryColor).fontSize(28).text('INVOICE', 50, 50, { align: 'right' });
  doc.fillColor(secondaryColor).fontSize(10)
     .text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' })
     .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' })
     .text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });

  doc.fillColor('#111827').fontSize(20).text('Invoicefy', 50, 50);
  doc.moveDown(3);

  // Billing
  const billingTop = 150;
  doc.fillColor(primaryColor).fontSize(12).text('BILL TO:', 50, billingTop);
  doc.fillColor('#111827').fontSize(12).text(client?.name || 'N/A', 50, billingTop + 20);
  doc.fillColor(secondaryColor).fontSize(10)
     .text(client?.address || 'N/A')
     .text(client?.email   || 'N/A')
     .text(client?.phone   || 'N/A');

  // Table header
  const tableTop = 260;
  doc.rect(50, tableTop, 495, 25).fill(primaryColor);
  doc.fillColor('#FFFFFF').fontSize(10)
     .text('Description', 60, tableTop + 8)
     .text('Quantity',    280, tableTop + 8, { width: 60,  align: 'right' })
     .text('Unit Price',  350, tableTop + 8, { width: 70,  align: 'right' })
     .text('Line Total',  430, tableTop + 8, { width: 105, align: 'right' });

  // Rows
  let position = tableTop + 30;
  doc.fillColor('#111827');
  invoice.items.forEach((item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    doc.fontSize(10)
       .text(item.description,         60,  position)
       .text(item.quantity.toString(), 280,  position, { width: 60,  align: 'right' })
       .text(formatCurr(item.unitPrice), 350, position, { width: 70,  align: 'right' })
       .text(formatCurr(lineTotal),     430,  position, { width: 105, align: 'right' });
    position += 20;
    doc.strokeColor(borderColor).lineWidth(1)
       .moveTo(50, position).lineTo(545, position).stroke();
    position += 10;
  });

  // Totals
  const subtotalPos = position + 20;
  doc.rect(320, subtotalPos - 10, 225, 100).fill(lightGray);
  doc.fillColor('#111827').fontSize(10)
     .text('Subtotal:', 340, subtotalPos)
     .text(formatCurr(invoice.subtotal), 430, subtotalPos, { width: 105, align: 'right' });

  let curPos = subtotalPos + 20;
  if (Number(invoice.discount) > 0) {
    const disc = (Number(invoice.subtotal) * Number(invoice.discount)) / 100;
    doc.text(`Discount (${invoice.discount}%):`, 340, curPos)
       .text(`-${formatCurr(disc)}`, 430, curPos, { width: 105, align: 'right' });
    curPos += 20;
  }
  if (Number(invoice.tax) > 0) {
    const taxBase = Number(invoice.subtotal) - (Number(invoice.subtotal) * Number(invoice.discount) / 100);
    const taxPct  = (Number(invoice.tax) / taxBase * 100).toFixed(1);
    doc.text(`Tax (${taxPct}%):`, 340, curPos)
       .text(`+${formatCurr(invoice.tax)}`, 430, curPos, { width: 105, align: 'right' });
    curPos += 20;
  }
  doc.strokeColor(borderColor).lineWidth(1)
     .moveTo(340, curPos - 5).lineTo(535, curPos - 5).stroke();
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold')
     .text('TOTAL:', 340, curPos + 5)
     .text(formatCurr(invoice.total), 430, curPos + 5, { width: 105, align: 'right' });

  // Footer
  doc.fontSize(10).fillColor(secondaryColor)
     .text('Thank you for your business!', 50, 750, { align: 'center', width: 495 });
};

// ─── TEMPLATE: minimal (clean black & white) ─────────────────────────────────
const renderMinimal = (doc, invoice, client) => {
  const black = '#111827';
  const gray  = '#6B7280';
  const light = '#F9FAFB';
  const line  = '#D1D5DB';

  // Header – left company name, right invoice label
  doc.fillColor(black).fontSize(22).font('Helvetica-Bold').text('Invoicefy', 50, 50);
  doc.fillColor(gray).fontSize(11).font('Helvetica')
     .text('INVOICE', 50, 52, { align: 'right' });

  // Horizontal rule under header
  doc.strokeColor(black).lineWidth(2)
     .moveTo(50, 85).lineTo(545, 85).stroke();

  // Meta row
  doc.fillColor(gray).fontSize(9)
     .text(`Invoice No: ${invoice.invoiceNumber}`, 50, 95)
     .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 200, 95)
     .text(`Status: ${invoice.status.toUpperCase()}`, 400, 95);

  // Bill To
  doc.fillColor(gray).fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, 130);
  doc.font('Helvetica').fillColor(black).fontSize(11).text(client?.name || 'N/A', 50, 145);
  doc.fillColor(gray).fontSize(9)
     .text(client?.address || '', 50, 160)
     .text(client?.email   || '', 50, 172)
     .text(client?.phone   || '', 50, 184);

  // Table header
  const tableTop = 215;
  doc.rect(50, tableTop, 495, 22).fill(light);
  doc.strokeColor(line).lineWidth(0.5)
     .rect(50, tableTop, 495, 22).stroke();
  doc.fillColor(gray).fontSize(9).font('Helvetica-Bold')
     .text('DESCRIPTION', 60, tableTop + 7)
     .text('QTY',  295, tableTop + 7, { width: 45,  align: 'right' })
     .text('RATE', 350, tableTop + 7, { width: 80,  align: 'right' })
     .text('AMOUNT', 440, tableTop + 7, { width: 95, align: 'right' });

  // Rows
  let position = tableTop + 25;
  doc.font('Helvetica');
  invoice.items.forEach((item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    doc.fillColor(black).fontSize(10)
       .text(item.description,           60,  position)
       .text(item.quantity.toString(),   295,  position, { width: 45,  align: 'right' })
       .text(formatCurr(item.unitPrice), 350,  position, { width: 80,  align: 'right' })
       .text(formatCurr(lineTotal),      440,  position, { width: 95,  align: 'right' });
    position += 20;
    doc.strokeColor(line).lineWidth(0.5)
       .moveTo(50, position - 3).lineTo(545, position - 3).stroke();
  });

  // Totals
  const totTop = position + 15;
  doc.fillColor(gray).fontSize(10)
     .text('Subtotal:', 370, totTop)
     .text(formatCurr(invoice.subtotal), 440, totTop, { width: 95, align: 'right' });
  let tp = totTop + 18;
  if (Number(invoice.discount) > 0) {
    const disc = (Number(invoice.subtotal) * Number(invoice.discount)) / 100;
    doc.text(`Discount (${invoice.discount}%):`, 370, tp)
       .text(`-${formatCurr(disc)}`, 440, tp, { width: 95, align: 'right' });
    tp += 18;
  }
  if (Number(invoice.tax) > 0) {
    doc.text(`Tax:`, 370, tp)
       .text(`+${formatCurr(invoice.tax)}`, 440, tp, { width: 95, align: 'right' });
    tp += 18;
  }
  doc.strokeColor(black).lineWidth(1.5)
     .moveTo(370, tp).lineTo(535, tp).stroke();
  doc.fillColor(black).fontSize(13).font('Helvetica-Bold')
     .text('TOTAL', 370, tp + 6)
     .text(formatCurr(invoice.total), 440, tp + 6, { width: 95, align: 'right' });

  // Footer
  doc.fontSize(9).font('Helvetica').fillColor(gray)
     .text('Thank you for your business.', 50, 755, { align: 'center', width: 495 });
};

// ─── TEMPLATE: bold (dark navy header band) ──────────────────────────────────
const renderBold = (doc, invoice, client) => {
  const navy    = '#1E293B';
  const accent  = '#F59E0B';   // amber accent
  const white   = '#FFFFFF';
  const offWhite = '#F8FAFC';
  const bodyText = '#334155';
  const borderC  = '#CBD5E1';

  // Full-width navy banner
  doc.rect(0, 0, 595, 110).fill(navy);

  // Company name & label in banner
  doc.fillColor(white).fontSize(26).font('Helvetica-Bold').text('Invoicefy', 50, 30);
  doc.fillColor(accent).fontSize(36).font('Helvetica-Bold')
     .text('INVOICE', 50, 25, { align: 'right' });

  // Invoice meta in banner
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
     .text(`No: ${invoice.invoiceNumber}`, 50, 70)
     .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 200, 70)
     .text(`Status: ${invoice.status.toUpperCase()}`, 400, 70);

  // Bill to section
  doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text('BILLED TO', 50, 130);
  doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text(client?.name || 'N/A', 50, 145);
  doc.fillColor(bodyText).fontSize(9).font('Helvetica')
     .text(client?.address || '', 50, 162)
     .text(client?.email   || '', 50, 174)
     .text(client?.phone   || '', 50, 186);

  // Accent bar above table
  const tableTop = 220;
  doc.rect(50, tableTop, 495, 26).fill(navy);
  doc.fillColor(white).fontSize(9).font('Helvetica-Bold')
     .text('ITEM DESCRIPTION', 60, tableTop + 9)
     .text('QTY',    295, tableTop + 9, { width: 45,  align: 'right' })
     .text('PRICE',  350, tableTop + 9, { width: 80,  align: 'right' })
     .text('TOTAL',  440, tableTop + 9, { width: 95,  align: 'right' });

  // Rows with alternating background
  let position = tableTop + 28;
  invoice.items.forEach((item, i) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    if (i % 2 === 0) doc.rect(50, position - 2, 495, 22).fill(offWhite);
    doc.fillColor(bodyText).fontSize(10).font('Helvetica')
       .text(item.description,            60,  position)
       .text(item.quantity.toString(),    295,  position, { width: 45,  align: 'right' })
       .text(formatCurr(item.unitPrice),  350,  position, { width: 80,  align: 'right' })
       .text(formatCurr(lineTotal),       440,  position, { width: 95,  align: 'right' });
    position += 22;
  });

  // Totals box
  const totTop = position + 15;
  doc.rect(350, totTop - 8, 195, 90).fill(offWhite)
     .strokeColor(borderC).lineWidth(0.5).rect(350, totTop - 8, 195, 90).stroke();

  doc.fillColor(bodyText).fontSize(10).font('Helvetica')
     .text('Subtotal:', 360, totTop)
     .text(formatCurr(invoice.subtotal), 450, totTop, { width: 85, align: 'right' });
  let tp = totTop + 18;
  if (Number(invoice.discount) > 0) {
    const disc = (Number(invoice.subtotal) * Number(invoice.discount)) / 100;
    doc.text(`Discount (${invoice.discount}%):`, 360, tp)
       .text(`-${formatCurr(disc)}`, 450, tp, { width: 85, align: 'right' });
    tp += 18;
  }
  if (Number(invoice.tax) > 0) {
    doc.text(`Tax:`, 360, tp)
       .text(`+${formatCurr(invoice.tax)}`, 450, tp, { width: 85, align: 'right' });
    tp += 18;
  }
  // Total highlighted row
  doc.rect(350, tp, 195, 26).fill(navy);
  doc.fillColor(white).fontSize(12).font('Helvetica-Bold')
     .text('TOTAL', 360, tp + 7)
     .text(formatCurr(invoice.total), 450, tp + 7, { width: 85, align: 'right' });

  // Footer bar
  doc.rect(0, 770, 595, 72).fill(navy);
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
     .text('Thank you for your business! | Invoicefy', 50, 784, { align: 'center', width: 495 });
};

// ─── Main export ──────────────────────────────────────────────────────────────
exports.generatePDF = (invoice, client, res, template = 'classic', watermark = '') => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
  doc.pipe(res);

  // Render chosen template
  if (template === 'minimal') {
    renderMinimal(doc, invoice, client);
  } else if (template === 'bold') {
    renderBold(doc, invoice, client);
  } else {
    renderClassic(doc, invoice, client); // default
  }

  // Apply watermark across all pages (after content is rendered)
  doc.flushPages();
  drawWatermark(doc, watermark);

  doc.end();
};