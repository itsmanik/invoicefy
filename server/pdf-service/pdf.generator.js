// server/pdf-service/pdf.generator.js

const PDFDocument = require('pdfkit');

const formatCurr = (num) => `Rs. ${Number(num).toFixed(2)}`;

const DEFAULT_TEMPLATE_SETTINGS = {
  classic: { headerColor: '#2563EB', accentColor: '#1d4ed8' },
  minimal: { headerColor: '#111827', accentColor: '#6B7280' },
  bold: { headerColor: '#1E293B', accentColor: '#F59E0B' },
};

const getTemplateSettings = (invoice, template) => {
  const saved = invoice.templateSettings && typeof invoice.templateSettings === 'object' ? invoice.templateSettings : {};
  const defaults = DEFAULT_TEMPLATE_SETTINGS[template] || DEFAULT_TEMPLATE_SETTINGS.classic;

  return {
    companyName: saved.companyName || 'Invoicefy',
    companyEmail: saved.companyEmail || '',
    companyAddress: saved.companyAddress || '',
    headerColor: /^#[0-9A-Fa-f]{6}$/.test(saved.headerColor || '') ? saved.headerColor : defaults.headerColor,
    accentColor: /^#[0-9A-Fa-f]{6}$/.test(saved.accentColor || '') ? saved.accentColor : defaults.accentColor,
    compactMode: Boolean(saved.compactMode),
    showRowDividers: saved.showRowDividers !== false,
  };
};

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

const getDocumentLabel = (invoice) => invoice.documentType === 'quotation' ? 'QUOTATION' : 'INVOICE';

const drawCompanyBlock = (doc, settings, x, y, color = '#111827') => {
  doc.fillColor(color).fontSize(20).font('Helvetica-Bold').text(settings.companyName || 'Invoicefy', x, y);
  let nextY = y + 24;
  doc.font('Helvetica').fontSize(10).fillColor(color);
  if (settings.companyAddress) {
    doc.text(settings.companyAddress, x, nextY, { width: 220 });
    nextY += 28;
  }
  if (settings.companyEmail) {
    doc.text(settings.companyEmail, x, nextY, { width: 220 });
  }
};

const renderClassic = (doc, invoice, client, settings) => {
  const primaryColor = settings.headerColor;
  const accentColor = settings.accentColor;
  const secondaryColor = '#4B5563';
  const lightGray = '#F3F4F6';
  const borderColor = '#E5E7EB';
  const rowHeight = settings.compactMode ? 24 : 30;

  const documentLabel = getDocumentLabel(invoice);
  doc.fillColor(primaryColor).fontSize(28).text(documentLabel, 50, 50, { align: 'right' });
  doc.fillColor(secondaryColor).fontSize(10)
     .text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' })
     .text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, { align: 'right' })
     .text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });

  drawCompanyBlock(doc, settings, 50, 50);

  const billingTop = 150;
  doc.fillColor(accentColor).fontSize(12).font('Helvetica-Bold').text('BILL TO:', 50, billingTop);
  doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(client?.name || 'N/A', 50, billingTop + 20);
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica')
     .text(client?.address || 'N/A')
     .text(client?.email || 'N/A')
     .text(client?.phone || 'N/A')
     .text(`Client GST: ${invoice.clientGST || client?.gstNumber || 'N/A'}`)
     .text(`Your GST: ${invoice.yourGST || 'N/A'}`);

  const tableTop = 260;
  doc.rect(50, tableTop, 495, 25).fill(primaryColor);
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
     .text('Description', 60, tableTop + 8)
     .text('Quantity', 280, tableTop + 8, { width: 60, align: 'right' })
     .text('Unit Price', 350, tableTop + 8, { width: 70, align: 'right' })
     .text('Line Total', 430, tableTop + 8, { width: 105, align: 'right' });

  let position = tableTop + 30;
  doc.fillColor('#111827').font('Helvetica');
  invoice.items.forEach((item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    doc.fontSize(10)
       .text(`${item.description}${item.hsn ? ` (HSN: ${item.hsn})` : ''}`, 60, position)
       .text(item.quantity.toString(), 280, position, { width: 60, align: 'right' })
       .text(formatCurr(item.unitPrice), 350, position, { width: 70, align: 'right' })
       .text(formatCurr(lineTotal), 430, position, { width: 105, align: 'right' });
    position += rowHeight - 10;
    if (settings.showRowDividers) {
      doc.strokeColor(borderColor).lineWidth(1).moveTo(50, position).lineTo(545, position).stroke();
    }
    position += 10;
  });

  const subtotalPos = position + 20;
  doc.rect(320, subtotalPos - 10, 225, 100).fill(lightGray);
  doc.fillColor('#111827').fontSize(10).font('Helvetica')
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
    const taxPct = taxBase > 0 ? (Number(invoice.tax) / taxBase * 100).toFixed(1) : '0.0';
    doc.text(`Tax (${taxPct}%):`, 340, curPos)
       .text(`+${formatCurr(invoice.tax)}`, 430, curPos, { width: 105, align: 'right' });
    curPos += 20;
  }
  doc.strokeColor(borderColor).lineWidth(1).moveTo(340, curPos - 5).lineTo(535, curPos - 5).stroke();
  doc.fillColor(accentColor).fontSize(14).font('Helvetica-Bold')
     .text('TOTAL:', 340, curPos + 5)
     .text(formatCurr(invoice.total), 430, curPos + 5, { width: 105, align: 'right' });

  doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
     .text(invoice.disclaimer || 'Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.', 50, 736, { align: 'center', width: 495 })
     .text(invoice.bankDetails ? `Bank: ${invoice.bankDetails.bankName || invoice.bankDetails.accountName || '-'} | A/C: ${invoice.bankDetails.accountNumber || '-'} | IFSC: ${invoice.bankDetails.ifsc || '-'} | UPI: ${invoice.bankDetails.upiId || '-'}` : '', 50, 760, { align: 'center', width: 495 });
};

const renderMinimal = (doc, invoice, client, settings) => {
  const black = settings.headerColor;
  const gray = settings.accentColor;
  const light = '#F9FAFB';
  const line = '#D1D5DB';
  const rowHeight = settings.compactMode ? 16 : 20;

  drawCompanyBlock(doc, settings, 50, 50, black);
  const documentLabel = getDocumentLabel(invoice);
  doc.fillColor(gray).fontSize(11).font('Helvetica').text(documentLabel, 50, 52, { align: 'right' });
  doc.strokeColor(black).lineWidth(2).moveTo(50, 85).lineTo(545, 85).stroke();

  doc.fillColor(gray).fontSize(9)
     .text(`Invoice No: ${invoice.invoiceNumber}`, 50, 95)
     .text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 200, 95)
     .text(`Status: ${invoice.status.toUpperCase()}`, 400, 95);

  doc.fillColor(gray).fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, 130);
  doc.font('Helvetica').fillColor(black).fontSize(11).text(client?.name || 'N/A', 50, 145);
  doc.fillColor(gray).fontSize(9)
     .text(client?.address || '', 50, 160)
     .text(client?.email || '', 50, 172)
     .text(client?.phone || '', 50, 184);

  const tableTop = 215;
  doc.rect(50, tableTop, 495, 22).fill(light);
  doc.strokeColor(line).lineWidth(0.5).rect(50, tableTop, 495, 22).stroke();
  doc.fillColor(gray).fontSize(9).font('Helvetica-Bold')
     .text('DESCRIPTION', 60, tableTop + 7)
     .text('QTY', 295, tableTop + 7, { width: 45, align: 'right' })
     .text('RATE', 350, tableTop + 7, { width: 80, align: 'right' })
     .text('AMOUNT', 440, tableTop + 7, { width: 95, align: 'right' });

  let position = tableTop + 25;
  doc.font('Helvetica');
  invoice.items.forEach((item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    doc.fillColor(black).fontSize(10)
       .text(`${item.description}${item.hsn ? ` (HSN: ${item.hsn})` : ''}`, 60, position)
       .text(item.quantity.toString(), 295, position, { width: 45, align: 'right' })
       .text(formatCurr(item.unitPrice), 350, position, { width: 80, align: 'right' })
       .text(formatCurr(lineTotal), 440, position, { width: 95, align: 'right' });
    position += rowHeight;
    if (settings.showRowDividers) {
      doc.strokeColor(line).lineWidth(0.5).moveTo(50, position - 3).lineTo(545, position - 3).stroke();
    }
  });

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
    doc.text('Tax:', 370, tp)
       .text(`+${formatCurr(invoice.tax)}`, 440, tp, { width: 95, align: 'right' });
    tp += 18;
  }
  doc.strokeColor(black).lineWidth(1.5).moveTo(370, tp).lineTo(535, tp).stroke();
  doc.fillColor(black).fontSize(13).font('Helvetica-Bold')
     .text('TOTAL', 370, tp + 6)
     .text(formatCurr(invoice.total), 440, tp + 6, { width: 95, align: 'right' });

  doc.fontSize(9).font('Helvetica').fillColor(gray)
     .text(invoice.disclaimer || 'Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.', 50, 740, { align: 'center', width: 495 })
     .text(invoice.bankDetails ? `Bank: ${invoice.bankDetails.bankName || invoice.bankDetails.accountName || '-'} | A/C: ${invoice.bankDetails.accountNumber || '-'} | IFSC: ${invoice.bankDetails.ifsc || '-'} | UPI: ${invoice.bankDetails.upiId || '-'}` : '', 50, 760, { align: 'center', width: 495 });
};

const renderBold = (doc, invoice, client, settings) => {
  const navy = settings.headerColor;
  const accent = settings.accentColor;
  const white = '#FFFFFF';
  const offWhite = '#F8FAFC';
  const bodyText = '#334155';
  const borderC = '#CBD5E1';
  const rowHeight = settings.compactMode ? 18 : 22;

  doc.rect(0, 0, 595, 110).fill(navy);
  doc.fillColor(white).fontSize(26).font('Helvetica-Bold').text(settings.companyName || 'Invoicefy', 50, 30);
  if (settings.companyEmail) doc.fontSize(10).font('Helvetica').fillColor('#CBD5E1').text(settings.companyEmail, 50, 60);
  const documentLabel = getDocumentLabel(invoice);
  doc.fillColor(accent).fontSize(36).font('Helvetica-Bold').text(documentLabel, 50, 25, { align: 'right' });
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
     .text(`No: ${invoice.invoiceNumber}`, 50, 70)
     .text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 200, 70)
     .text(`Status: ${invoice.status.toUpperCase()}`, 400, 70);

  doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text('BILLED TO', 50, 130);
  doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text(client?.name || 'N/A', 50, 145);
  doc.fillColor(bodyText).fontSize(9).font('Helvetica')
     .text(client?.address || '', 50, 162)
     .text(client?.email || '', 50, 174)
     .text(client?.phone || '', 50, 186)
     .text(`Client GST: ${invoice.clientGST || client?.gstNumber || 'N/A'}`, 50, 198)
     .text(`Your GST: ${invoice.yourGST || 'N/A'}`, 50, 210);

  const tableTop = 220;
  doc.rect(50, tableTop, 495, 26).fill(navy);
  doc.fillColor(white).fontSize(9).font('Helvetica-Bold')
     .text('ITEM DESCRIPTION', 60, tableTop + 9)
     .text('QTY', 295, tableTop + 9, { width: 45, align: 'right' })
     .text('PRICE', 350, tableTop + 9, { width: 80, align: 'right' })
     .text('TOTAL', 440, tableTop + 9, { width: 95, align: 'right' });

  let position = tableTop + 28;
  invoice.items.forEach((item, i) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    if (!settings.compactMode && i % 2 === 0) doc.rect(50, position - 2, 495, 22).fill(offWhite);
    doc.fillColor(bodyText).fontSize(10).font('Helvetica')
       .text(`${item.description}${item.hsn ? ` (HSN: ${item.hsn})` : ''}`, 60, position)
       .text(item.quantity.toString(), 295, position, { width: 45, align: 'right' })
       .text(formatCurr(item.unitPrice), 350, position, { width: 80, align: 'right' })
       .text(formatCurr(lineTotal), 440, position, { width: 95, align: 'right' });
    position += rowHeight;
    if (settings.showRowDividers) {
      doc.strokeColor(borderC).lineWidth(0.5).moveTo(50, position + 1).lineTo(545, position + 1).stroke();
    }
  });

  const totTop = position + 15;
  doc.rect(350, totTop - 8, 195, 90).fill(offWhite).strokeColor(borderC).lineWidth(0.5).rect(350, totTop - 8, 195, 90).stroke();
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
    doc.text('Tax:', 360, tp)
       .text(`+${formatCurr(invoice.tax)}`, 450, tp, { width: 85, align: 'right' });
    tp += 18;
  }
  doc.rect(350, tp, 195, 26).fill(navy);
  doc.fillColor(white).fontSize(12).font('Helvetica-Bold')
     .text('TOTAL', 360, tp + 7)
     .text(formatCurr(invoice.total), 450, tp + 7, { width: 85, align: 'right' });

  doc.rect(0, 770, 595, 72).fill(navy);
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
     .text(invoice.disclaimer || 'Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.', 50, 780, { align: 'center', width: 495 })
     .text(invoice.bankDetails ? `Bank: ${invoice.bankDetails.bankName || invoice.bankDetails.accountName || '-'} | A/C: ${invoice.bankDetails.accountNumber || '-'} | IFSC: ${invoice.bankDetails.ifsc || '-'} | UPI: ${invoice.bankDetails.upiId || '-'}` : '', 50, 796, { align: 'center', width: 495 });
};

exports.generatePDF = (invoice, client, res, template = 'classic', watermark = '') => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const settings = getTemplateSettings(invoice, template);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
  doc.pipe(res);

  if (template === 'minimal') {
    renderMinimal(doc, invoice, client, settings);
  } else if (template === 'bold') {
    renderBold(doc, invoice, client, settings);
  } else {
    renderClassic(doc, invoice, client, settings);
  }

  doc.flushPages();
  drawWatermark(doc, watermark);
  doc.end();
};
