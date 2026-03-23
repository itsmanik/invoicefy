// server/pdf-service/pdf.generator.js

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const formatCurr = (num) => `Rs. ${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    logoUrl: /^\/uploads\/[A-Za-z0-9._-]+$/.test(saved.logoUrl || '') ? saved.logoUrl : '',
    headerColor: /^#[0-9A-Fa-f]{6}$/.test(saved.headerColor || '') ? saved.headerColor : defaults.headerColor,
    accentColor: /^#[0-9A-Fa-f]{6}$/.test(saved.accentColor || '') ? saved.accentColor : defaults.accentColor,
    compactMode: Boolean(saved.compactMode),
    showRowDividers: saved.showRowDividers !== false,
  };
};

const drawWatermark = (doc, text) => {
  // Diagonal watermark removed: watermark is now rendered individually by templates as a badge
};

const getDocumentLabel = (invoice) => invoice.documentType === 'quotation' ? 'QUOTATION' : 'INVOICE';

const resolveLogoPath = (logoUrl = '') => {
  if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(logoUrl)) return null;

  const filePath = path.join(__dirname, '..', logoUrl.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) return null;
  if (!/\.(png|jpe?g)$/i.test(filePath)) return null;

  return filePath;
};

const getLogoSource = async (settings, assetBaseUrl = '') => {
  const filePath = resolveLogoPath(settings.logoUrl);
  if (filePath) return filePath;

  if (!assetBaseUrl || !/^\/uploads\/[A-Za-z0-9._-]+$/.test(settings.logoUrl || '')) return null;

  try {
    const response = await fetch(new URL(settings.logoUrl, assetBaseUrl).toString());
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!/^image\/(png|jpe?g)$/i.test(contentType)) return null;

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return null;
  }
};

const drawLogo = (doc, logoSource, x, y, options = {}) => {
  if (!logoSource) return 0;

  const fit = options.fit || [56, 56];

  try {
    doc.image(logoSource, x, y, { fit, align: 'left', valign: 'center' });
    return fit[0] + (options.gap || 12);
  } catch (error) {
    return 0;
  }
};

const drawCompanyBlock = (doc, settings, logoSource, x, y, color = '#111827') => {
  const logoOffset = drawLogo(doc, logoSource, x, y - 4);
  const textX = x + logoOffset;

  doc.fillColor(color).fontSize(20).font('Helvetica-Bold').text(settings.companyName || 'Invoicefy', textX, y);
  let nextY = y + 24;
  doc.font('Helvetica').fontSize(10).fillColor(color);
  if (settings.companyAddress) {
    doc.text(settings.companyAddress, textX, nextY, { width: 220 });
    nextY += 28;
  }
  if (settings.companyEmail) {
    doc.text(settings.companyEmail, textX, nextY, { width: 220 });
  }
};

const renderClassic = (doc, invoice, client, settings, watermark, logoSource) => {
  const primaryColor = settings.headerColor;
  const accentColor = settings.accentColor;
  const secondaryColor = '#4B5563';
  const lightGray = '#F8FAFC';
  const borderColor = '#E5E7EB';
  const white = '#FFFFFF';
  const bodyText = '#334155';
  const rowHeight = settings.compactMode ? 20 : 25;

  // Header background
  doc.rect(0, 0, 595, 110).fill(primaryColor);
  
  // Left side: Company Block
  const logoOffset = drawLogo(doc, logoSource, 50, 26);
  const companyX = 50 + logoOffset;
  doc.fillColor(white).fontSize(24).font('Helvetica-Bold').text(settings.companyName || 'Invoicefy', companyX, 30);
  let nextY = 60;
  doc.font('Helvetica').fontSize(10);
  if (settings.companyAddress) {
    doc.text(settings.companyAddress, companyX, nextY, { width: 220 });
    nextY += 15;
  }
  if (settings.companyEmail) {
    doc.text(settings.companyEmail, companyX, nextY, { width: 220 });
  }

  // Right side: Document Label & Details
  const documentLabel = getDocumentLabel(invoice);
  doc.fontSize(28).font('Helvetica-Bold').text(documentLabel, 50, 30, { align: 'right' });
  doc.fontSize(10).font('Helvetica')
     .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 68, { align: 'right' })
     .text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 50, 83, { align: 'right' });
     
  doc.font('Helvetica-Bold')
     .text(`Status: ${(invoice.status || 'UNPAID').toUpperCase()}`, 50, 98, { align: 'right' });

  // Billing Section
  const billingTop = 135;
  doc.fillColor(accentColor).fontSize(10).font('Helvetica-Bold').text('BILL TO', 50, billingTop);
  
  if (watermark) {
    doc.fontSize(9).font('Helvetica-Bold');
    const badgeW = doc.widthOfString(watermark.toUpperCase()) + 12;
    doc.save();
    doc.roundedRect(545 - badgeW, billingTop - 2, badgeW, 16, 3).fillColor(accentColor).fillOpacity(0.12).fill();
    doc.restore();
    doc.fillColor(accentColor).text(watermark.toUpperCase(), 545 - badgeW, billingTop + 3, { width: badgeW, align: 'center' });
  }

  doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(client?.name || 'N/A', 50, billingTop + 15);
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica')
     .text(client?.address || '', 50, billingTop + 30)
     .text(client?.email || '', 50, billingTop + 42)
     .text(client?.phone || '', 50, billingTop + 54);
     
  let billNextY = billingTop + 66;
  if (invoice.clientGST || client?.gstNumber) {
    doc.text(`Client GST: ${invoice.clientGST || client?.gstNumber}`, 50, billNextY);
    billNextY += 12;
  }
  if (invoice.yourGST) {
    doc.text(`Your GST: ${invoice.yourGST}`, 50, billNextY);
  }

  // Table
  const tableTop = 230;
  doc.rect(50, tableTop, 495, 25).fill(primaryColor);
  doc.fillColor(white).fontSize(10).font('Helvetica-Bold')
     .text('Description', 60, tableTop + 8)
     .text('Quantity', 280, tableTop + 8, { width: 60, align: 'center' })
     .text('Unit Price', 350, tableTop + 8, { width: 70, align: 'right' })
     .text('Line Total', 430, tableTop + 8, { width: 105, align: 'right' });

  // Table Rows
  let position = tableTop + 35;
  doc.fillColor('#111827').font('Helvetica');
  invoice.items.forEach((item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (position > 700) { doc.addPage(); position = 50; }
    
    doc.fontSize(10)
       .text(`${item.description}${item.hsn ? ` (HSN: ${item.hsn})` : ''}`, 60, position)
       .text(item.quantity.toString(), 280, position, { width: 60, align: 'center' })
       .text(formatCurr(item.unitPrice), 350, position, { width: 70, align: 'right' })
       .text(formatCurr(lineTotal), 430, position, { width: 105, align: 'right' });
       
    position += rowHeight;
    if (settings.showRowDividers) {
      doc.strokeColor(borderColor).lineWidth(1).moveTo(50, position - 5).lineTo(545, position - 5).stroke();
    }
  });

  // Totals Section
  const totTop = position + 10;
  doc.rect(340, totTop, 205, 95).fill(lightGray);
  
  let curPos = totTop + 10;
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica')
     .text('Subtotal:', 350, curPos)
     .text(formatCurr(invoice.subtotal), 440, curPos, { width: 95, align: 'right' });
  
  curPos += 18;
  if (Number(invoice.discount) > 0) {
    const disc = (Number(invoice.subtotal) * Number(invoice.discount)) / 100;
    doc.text(`Discount (${invoice.discount}%):`, 350, curPos)
       .text(`-${formatCurr(disc)}`, 440, curPos, { width: 95, align: 'right' });
    curPos += 18;
  }
  if (Number(invoice.tax) > 0) {
    doc.text(`Tax:`, 350, curPos)
       .text(`+${formatCurr(invoice.tax)}`, 440, curPos, { width: 95, align: 'right' });
    curPos += 18;
  }
  
  doc.strokeColor(borderColor).lineWidth(1).moveTo(350, curPos - 2).lineTo(535, curPos - 2).stroke();
  curPos += 8;
  
  doc.fillColor(accentColor).fontSize(12).font('Helvetica-Bold')
     .text('TOTAL', 350, curPos)
     .text(formatCurr(invoice.total), 440, curPos, { width: 95, align: 'right' });

  // Footer/Disclaimer
  doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
     .text(invoice.disclaimer || 'Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.', 50, 750, { align: 'center', width: 495 })
     .text(invoice.bankDetails ? `Bank: ${invoice.bankDetails.bankName || invoice.bankDetails.accountName || '-'} | A/C: ${invoice.bankDetails.accountNumber || '-'} | IFSC: ${invoice.bankDetails.ifsc || '-'} | UPI: ${invoice.bankDetails.upiId || '-'}` : '', 50, 770, { align: 'center', width: 495 });
};

const renderMinimal = (doc, invoice, client, settings, watermark, logoSource) => {
  const black = settings.headerColor;
  const gray = settings.accentColor;
  const light = '#F9FAFB';
  const line = '#D1D5DB';
  const rowHeight = settings.compactMode ? 16 : 20;

  drawCompanyBlock(doc, settings, logoSource, 50, 50, black);
  const documentLabel = getDocumentLabel(invoice);
  doc.fillColor(gray).fontSize(11).font('Helvetica').text(documentLabel, 50, 52, { align: 'right' });
  doc.strokeColor(black).lineWidth(2).moveTo(50, 110).lineTo(545, 110).stroke();

  doc.fillColor(gray).fontSize(9);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 50, 68, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 50, 80, { align: 'right' });
  doc.font('Helvetica-Bold').text(`Status: ${(invoice.status || 'UNPAID').toUpperCase()}`, 50, 92, { align: 'right' });

  doc.fillColor(gray).fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, 130);
  doc.font('Helvetica').fillColor(black).fontSize(11).text(client?.name || 'N/A', 50, 145);
  doc.fillColor(gray).fontSize(9)
     .text(client?.address || '', 50, 160)
     .text(client?.email || '', 50, 172)
     .text(client?.phone || '', 50, 184);

  let pY = 130;
  if (invoice.clientGST || client?.gstNumber) {
    doc.fillColor(gray).text(`Client GST: ${invoice.clientGST || client?.gstNumber}`, 50, pY, { align: 'right' });
    pY += 12;
  }
  if (invoice.yourGST) {
    doc.fillColor(gray).text(`Your GST: ${invoice.yourGST}`, 50, pY, { align: 'right' });
    pY += 12;
  }
  if (watermark) {
    doc.font('Helvetica-Bold').fillColor('#334155').text(watermark.toUpperCase(), 50, pY + 4, { align: 'right' });
  }

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

const renderBold = (doc, invoice, client, settings, watermark, logoSource) => {
  const navy = settings.headerColor;
  const accent = settings.accentColor;
  const white = '#FFFFFF';
  const offWhite = '#F8FAFC';
  const bodyText = '#334155';
  const borderC = '#CBD5E1';
  const rowHeight = settings.compactMode ? 18 : 22;

  doc.rect(0, 0, 595, 110).fill(navy);
  const logoOffset = drawLogo(doc, logoSource, 50, 24);
  const companyX = 50 + logoOffset;
  doc.fillColor(white).fontSize(26).font('Helvetica-Bold').text(settings.companyName || 'Invoicefy', companyX, 30);
  if (settings.companyEmail) doc.fontSize(10).font('Helvetica').fillColor('#CBD5E1').text(settings.companyEmail, companyX, 60);
  const documentLabel = getDocumentLabel(invoice);
  doc.fillColor(accent).fontSize(36).font('Helvetica-Bold').text(documentLabel, 50, 25, { align: 'right' });
  
  // Right align Invoice No and Date under the label
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica');
  doc.text(`No: ${invoice.invoiceNumber}`, 50, 68, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 50, 80, { align: 'right' });
  doc.font('Helvetica-Bold').text(`Status: ${(invoice.status || 'UNPAID').toUpperCase()}`, 50, 92, { align: 'right' });

  doc.fillColor(accent).fontSize(9).font('Helvetica-Bold').text('BILLED TO', 50, 130);
  
  if (watermark) {
    doc.fontSize(9).font('Helvetica-Bold');
    const badgeW = doc.widthOfString(watermark.toUpperCase()) + 12;
    doc.save();
    doc.roundedRect(545 - badgeW, 130 - 2, badgeW, 16, 3).fillColor(accent).fillOpacity(0.12).fill();
    doc.restore();
    doc.fillColor(accent).text(watermark.toUpperCase(), 545 - badgeW, 130 + 3, { width: badgeW, align: 'center' });
  }

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
  // Subtotal block background (light gray) with rounded corners
  doc.roundedRect(350, totTop - 8, 195, 90 + 26, 8).fill(offWhite).strokeColor(borderC).lineWidth(0.5).roundedRect(350, totTop - 8, 195, 90 + 26, 8).stroke();
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
  
  // Total row background (navy) with rounded bottom corners
  doc.save();
  doc.roundedRect(350, tp, 195, 26, 8).clip();
  doc.rect(350, tp - 10, 195, 36).fill(navy);
  doc.restore();
  
  doc.fillColor(white).fontSize(12).font('Helvetica-Bold')
     .text('TOTAL', 360, tp + 7)
     .text(formatCurr(invoice.total), 450, tp + 7, { width: 85, align: 'right' });

  doc.rect(0, 745, 595, 97).fill(navy);
  doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
     .text(invoice.disclaimer || 'Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.', 50, 755, { align: 'center', width: 495 })
     .text(invoice.bankDetails ? `Bank: ${invoice.bankDetails.bankName || invoice.bankDetails.accountName || '-'} | A/C: ${invoice.bankDetails.accountNumber || '-'} | IFSC: ${invoice.bankDetails.ifsc || '-'} | UPI: ${invoice.bankDetails.upiId || '-'}` : '', 50, 775, { align: 'center', width: 495 });
};

exports.generatePDF = async (invoice, client, res, template = 'classic', watermark = '', assetBaseUrl = '') => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const settings = getTemplateSettings(invoice, template);
  const logoSource = await getLogoSource(settings, assetBaseUrl);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
  doc.pipe(res);

  if (template === 'minimal') {
    renderMinimal(doc, invoice, client, settings, watermark, logoSource);
  } else if (template === 'bold') {
    renderBold(doc, invoice, client, settings, watermark, logoSource);
  } else {
    renderClassic(doc, invoice, client, settings, watermark, logoSource);
  }

  doc.flushPages();
  drawWatermark(doc, watermark);
  doc.end();
};
