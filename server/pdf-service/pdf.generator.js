// server/pdf-service/pdf.generator.js
const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const formatCurr = (num) =>
  'Rs. ' + Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getDocumentLabel = (invoice) =>
  invoice.documentType === 'quotation' ? 'QUOTATION' : 'INVOICE';

const DEFAULT_TEMPLATE_SETTINGS = {
  classic: { headerColor: '#2563EB', accentColor: '#1d4ed8' },
  minimal: { headerColor: '#111827', accentColor: '#6B7280' },
  bold:    { headerColor: '#1E293B', accentColor: '#F59E0B' },
};

const getTemplateSettings = (invoice, template) => {
  const saved    = invoice.templateSettings && typeof invoice.templateSettings === 'object'
                   ? invoice.templateSettings : {};
  const defaults = DEFAULT_TEMPLATE_SETTINGS[template] || DEFAULT_TEMPLATE_SETTINGS.classic;
  return {
    companyName:     saved.companyName    || 'Invoicefy',
    companyEmail:    saved.companyEmail   || '',
    companyPhone:    saved.companyPhone   || '',
    companyAddress:  saved.companyAddress || '',
    logoUrl:         /^\/uploads\/[A-Za-z0-9._-]+$/.test(saved.logoUrl || '') ? saved.logoUrl : '',
    headerColor:     /^#[0-9A-Fa-f]{6}$/.test(saved.headerColor || '') ? saved.headerColor : defaults.headerColor,
    accentColor:     /^#[0-9A-Fa-f]{6}$/.test(saved.accentColor || '') ? saved.accentColor : defaults.accentColor,
    compactMode:     Boolean(saved.compactMode),
    contactsAtBottom:Boolean(saved.contactsAtBottom),
    swapHeaderLayout:Boolean(saved.swapHeaderLayout),
    showRowDividers: saved.showRowDividers !== false,
    customTemplateUrl: saved.customTemplateUrl || '',
  };
};

const resolveAssetPath = (assetUrl = '') => {
  if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(assetUrl)) return null;
  const filePath = path.join(__dirname, '..', assetUrl.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) return null;
  return filePath;
};

const getAssetSource = async (assetUrl, assetBaseUrl = '') => {
  const filePath = resolveAssetPath(assetUrl);
  if (filePath) return filePath;
  if (!assetBaseUrl || !/^\/uploads\/[A-Za-z0-9._-]+$/.test(assetUrl || '')) return null;
  try {
    const response = await fetch(new URL(assetUrl, assetBaseUrl).toString());
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch { return null; }
};

const drawLogo = (doc, logoSource, x, y, size) => {
  if (!logoSource) return 0;
  try {
    doc.image(logoSource, x, y, { fit: [size, size], align: 'left', valign: 'center' });
    return size + 10;
  } catch { return 0; }
};

const renderInvoiceLayout = (doc, invoice, client, settings, watermark, logoSource, colors, backgroundSource) => {
  const { navy, white, bodyText, mutedText, borderColor, tableHeaderBg } = colors;

  const PAGE_W  = 595;
  const PAGE_H  = 842;
  const MARGIN  = 36;
  const CONTENT = PAGE_W - MARGIN * 2;

  if (backgroundSource) {
    try { doc.image(backgroundSource, 0, 0, { width: PAGE_W, height: PAGE_H }); } catch (e) { }
  }

  // 1. HEADER
  const HEADER_H = 90;
  if (!backgroundSource) {
    if (colors.isBold && colors.accent) {
      const grad = doc.linearGradient(0, 0, PAGE_W, 0);
      grad.stop(0, navy).stop(1, colors.accent);
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(grad);
    } else {
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(navy);
    }
  }

  const logoSize   = 50;
  const headerTextColor = backgroundSource ? navy : white;
  const headerAddrColor = backgroundSource ? '#334155' : '#CBD5E1';

  if (settings.swapHeaderLayout) {
    const logoOffset = drawLogo(doc, logoSource, PAGE_W - MARGIN - logoSize, (HEADER_H - logoSize) / 2, logoSize);
    const textWidth = 240;
    const compX = PAGE_W - MARGIN - (logoSource ? logoSize + 10 : 0) - textWidth;
    
    doc.fillColor(headerTextColor).fontSize(26).font('Helvetica-Bold')
       .text(settings.companyName || 'Invoicefy', compX, 20, { width: textWidth, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(headerAddrColor);
    if (settings.companyAddress) doc.text(settings.companyAddress, compX, 54, { width: textWidth, align: 'right', lineBreak: false });

    // Document Label on left
    doc.fillColor(headerTextColor).fontSize(26).font('Helvetica-Bold')
       .text(getDocumentLabel(invoice), MARGIN, 28, { width: CONTENT, align: 'left', lineBreak: false });
  } else {
    // Default Layout
    const logoOffset = drawLogo(doc, logoSource, MARGIN, (HEADER_H - logoSize) / 2, logoSize);
    const compX      = MARGIN + logoOffset;

    doc.fillColor(headerTextColor).fontSize(26).font('Helvetica-Bold')
       .text(settings.companyName || 'Invoicefy', compX, 20, { width: 240, align: 'left', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(headerAddrColor);
    if (settings.companyAddress) doc.text(settings.companyAddress, compX, 54, { width: 240, align: 'left', lineBreak: false });

    // Document Label on right
    doc.fillColor(headerTextColor).fontSize(26).font('Helvetica-Bold')
       .text(getDocumentLabel(invoice), MARGIN, 28, { width: CONTENT, align: 'right', lineBreak: false });
  }

  // 2. META
  const META_Y      = HEADER_H + 8;
  const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
  const dueDate     = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmtDate     = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
     .text(invoice.invoiceNumber, MARGIN, META_Y, { width: CONTENT, align: settings.swapHeaderLayout ? 'left' : 'right', lineBreak: false })
     .text('Date: ' + fmtDate(invoiceDate), MARGIN, META_Y + 12, { width: CONTENT, align: settings.swapHeaderLayout ? 'left' : 'right', lineBreak: false });
  const dueDateColor = colors.isMinimal ? '#334155' : (settings.accentColor || navy);
  doc.fillColor(dueDateColor).font('Helvetica-Bold')
     .text('Due: ' + fmtDate(dueDate), MARGIN, META_Y + 24, { width: CONTENT, align: settings.swapHeaderLayout ? 'left' : 'right', lineBreak: false });

  const DIVIDER_Y = META_Y + 40;
  doc.strokeColor(borderColor).lineWidth(0.8).moveTo(MARGIN, DIVIDER_Y).lineTo(PAGE_W - MARGIN, DIVIDER_Y).stroke();

  // 3. BILL TO / FROM (Wrapped in closure for re-ordering)
  const drawContacts = (startY) => {
    const INFO_Y = startY;
    const COL_W  = CONTENT / 2 - 10;
    const COL2_X = MARGIN + COL_W + 20;

    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold')
       .text('BILL TO:', MARGIN,  INFO_Y, { lineBreak: false })
       .text('FROM:', COL2_X, INFO_Y, { lineBreak: false });

    doc.fillColor('#000').fontSize(10);
    
    // Left: Customer details
    doc.font('Helvetica-Bold').text('Name: ', MARGIN, INFO_Y + 16, { continued: true, width: COL_W }).font('Helvetica').text(client && client.name ? client.name : '— Client Name —');
    let yL = doc.y;
    if (client && client.address) { doc.font('Helvetica-Bold').text('Address: ', MARGIN, yL + 2, { continued: true, width: COL_W }).font('Helvetica').text(client.address); yL = doc.y; }
    if (client && client.email) { doc.font('Helvetica-Bold').text('Email: ', MARGIN, yL + 2, { continued: true, width: COL_W }).font('Helvetica').text(client.email); yL = doc.y; }
    if (client && client.phone) { doc.font('Helvetica-Bold').text('Ph No: ', MARGIN, yL + 2, { continued: true, width: COL_W }).font('Helvetica').text(client.phone); yL = doc.y; }
    const clientGst = invoice.clientGST || (client && client.gstNumber);
    if (clientGst) { doc.font('Helvetica-Bold').text('GSTIN: ', MARGIN, yL + 2, { continued: true, width: COL_W }).font('Helvetica').text(clientGst); yL = doc.y; }

    // Right: Seller details
    doc.font('Helvetica-Bold').text('Name: ', COL2_X, INFO_Y + 16, { continued: true, width: COL_W }).font('Helvetica').text(settings.companyName || 'Invoicefy');
    let yR = doc.y;
    if (settings.companyAddress) { doc.font('Helvetica-Bold').text('Address: ', COL2_X, yR + 2, { continued: true, width: COL_W }).font('Helvetica').text(settings.companyAddress); yR = doc.y; }
    if (settings.companyEmail) { doc.font('Helvetica-Bold').text('Email: ', COL2_X, yR + 2, { continued: true, width: COL_W }).font('Helvetica').text(settings.companyEmail); yR = doc.y; }
    if (settings.companyPhone) { doc.font('Helvetica-Bold').text('Ph No: ', COL2_X, yR + 2, { continued: true, width: COL_W }).font('Helvetica').text(settings.companyPhone); yR = doc.y; }
    if (invoice.yourGST) { doc.font('Helvetica-Bold').text('GSTIN: ', COL2_X, yR + 2, { continued: true, width: COL_W }).font('Helvetica').text(invoice.yourGST); yR = doc.y; }

    return Math.max(yL, yR);
  };

  let currentY = DIVIDER_Y + 10;
  if (!settings.contactsAtBottom) {
    currentY = drawContacts(currentY) + 20;
  } else {
    currentY += 10;
  }

  // 4. ITEMS TABLE
  const TABLE_Y = currentY;

  const ROW_H   = 32;

  const hasTax     = Number(invoice.tax) > 0;
  const taxableAmt = Number(invoice.subtotal) - (Number(invoice.subtotal) * Number(invoice.discount || 0) / 100);
  const taxPercent = hasTax && taxableAmt > 0 ? Math.round((Number(invoice.tax) / taxableAmt) * 100) : 0;
  const halfTax    = taxPercent / 2;

  let cols = hasTax ? [
    { label: 'Description',            x: MARGIN,       w: 150, align: 'center', rightBorder: MARGIN + 150 },
    { label: 'SAC',                    x: MARGIN + 150, w: 44,  align: 'center', rightBorder: MARGIN + 194 },
    { label: 'Taxable',                x: MARGIN + 194, w: 78,  align: 'center', rightBorder: MARGIN + 272 },
    { label: 'CGST\n' + halfTax + '%', x: MARGIN + 272, w: 64,  align: 'center', rightBorder: MARGIN + 336 },
    { label: 'SGST\n' + halfTax + '%', x: MARGIN + 336, w: 64,  align: 'center', rightBorder: MARGIN + 400 },
    { label: 'Total',                  x: MARGIN + 400, w: 123, align: 'center', rightBorder: null },
  ] : [
    { label: 'Description', x: MARGIN,       w: 202, align: 'center', rightBorder: MARGIN + 202 },
    { label: 'SAC',         x: MARGIN + 202, w: 48,  align: 'center', rightBorder: MARGIN + 250 },
    { label: 'Qty',         x: MARGIN + 250, w: 48,  align: 'center', rightBorder: MARGIN + 298 },
    { label: 'Unit Price',  x: MARGIN + 298, w: 100, align: 'center', rightBorder: MARGIN + 398 },
    { label: 'Total',       x: MARGIN + 398, w: 125, align: 'center', rightBorder: null },
  ];

  const TH = 36;
  const items = invoice.items || [];
  
  // Enforces the minimum stretched box height (250px)
  const itemsHeight = items.length === 0 ? ROW_H : items.length * ROW_H;
  const ACTUAL_BODY_H = Math.max(250, itemsHeight + 20); 
  const TABLE_BOTTOM = TABLE_Y + TH + ACTUAL_BODY_H;

  // Header Background
  doc.rect(MARGIN, TABLE_Y, CONTENT, TH).fill(tableHeaderBg);
  
  doc.fillColor(white).fontSize(9).font('Helvetica-Bold');
  cols.forEach(col => {
    const lines = col.label.split('\n');
    const startY = TABLE_Y + (TH - (lines.length * 10)) / 2;
    lines.forEach((line, i) => doc.text(line, col.x, startY + i * 10, { width: col.w, align: col.align }));
  });

  // Table Structure Lines
  // Draw the outer rectangular border
  doc.rect(MARGIN, TABLE_Y, CONTENT, TH + ACTUAL_BODY_H).strokeColor(borderColor).lineWidth(0.8).stroke();
  
  // Draw the vertical column dividers
  doc.strokeColor('#D1D5DB').lineWidth(0.5);
  cols.forEach(col => {
    if (col.rightBorder) doc.moveTo(col.rightBorder, TABLE_Y).lineTo(col.rightBorder, TABLE_BOTTOM).stroke();
  });

  let rowY = TABLE_Y + TH;
  items.forEach((item, i) => {
    const qty       = Number(item.quantity)  || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineBase  = qty * unitPrice;
    const cgst      = hasTax ? lineBase * (halfTax / 100) : 0;
    const sgst      = cgst;
    const lineTotal = hasTax ? lineBase + cgst + sgst : lineBase;

    const textY = rowY + 10;
    doc.fillColor(bodyText).fontSize(9).font('Helvetica');

    if (hasTax) {
      doc.text((i+1) + ". " + item.description, cols[0].x + 5, textY, { width: cols[0].w - 10, align: 'left' });
      doc.text(item.hsn || '-',       cols[1].x, textY, { width: cols[1].w, align: 'center' });
      doc.text(formatCurr(lineBase),  cols[2].x, textY, { width: cols[2].w, align: 'center' });
      doc.text(formatCurr(cgst),      cols[3].x, textY, { width: cols[3].w, align: 'center' });
      doc.text(formatCurr(sgst),      cols[4].x, textY, { width: cols[4].w, align: 'center' });
      doc.text(formatCurr(lineTotal), cols[5].x, textY, { width: cols[5].w, align: 'center' });
    } else {
      doc.text((i+1) + ". " + item.description, cols[0].x + 5, textY, { width: cols[0].w - 10, align: 'left' });
      doc.text(item.hsn || '-',       cols[1].x, textY, { width: cols[1].w, align: 'center' });
      doc.text(String(qty),           cols[2].x, textY, { width: cols[2].w, align: 'center' });
      doc.text(formatCurr(unitPrice), cols[3].x, textY, { width: cols[3].w, align: 'center' });
      doc.text(formatCurr(lineTotal), cols[4].x, textY, { width: cols[4].w, align: 'center' });
    }
    rowY += ROW_H;
  });

  // 5. PAYMENT & TOTALS
  const BLOCK_Y = TABLE_BOTTOM + 25;
  
  // Left: Payment Information
  const bd = invoice.bankDetails || {};
  const hasBD = bd.accountName || bd.bankName || bd.accountNumber || bd.ifsc || bd.panNumber;
  let finalBdY = BLOCK_Y;
  if (hasBD) {
    let bdY = BLOCK_Y;
    doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text('PAYMENT INFORMATION:', MARGIN, bdY);
    bdY += 18;

    const drawBdRow = (lbl, val) => {
      doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text(lbl + ': ', MARGIN, bdY, { continued: true })
         .font('Helvetica').text(val || '');
      bdY += 16;
    };

    if (bd.accountName || bd.bankName) drawBdRow('Name', bd.accountName || bd.bankName);
    if (bd.accountNumber)              drawBdRow('Account', bd.accountNumber);
    if (bd.panNumber)                  drawBdRow('PAN', bd.panNumber);
    if (bd.ifsc)                       drawBdRow('IFS code', bd.ifsc);
    if (bd.upiId)                      drawBdRow('UPI ID', bd.upiId);
    finalBdY = bdY;
  }

  // Right: Totals Side
  const TOT_W = 230;
  const TOT_X = PAGE_W - MARGIN - TOT_W;
  
  let subtotalBoxY = BLOCK_Y;
  let totY = subtotalBoxY + 12;

  const drawSubTotRow = (label, value) => {
    doc.fillColor('#000').fontSize(10).font('Helvetica')
       .text(label, TOT_X + 12, totY, { width: 100, align: 'left', lineBreak: false })
       .text(value, TOT_X, totY, { width: TOT_W - 12, align: 'right', lineBreak: false });
    totY += 18;
  };

  if (hasTax) {
    drawSubTotRow('Taxable Amount:', formatCurr(taxableAmt));
    if (Number(invoice.discount) > 0) drawSubTotRow(`Discount:`, '- ' + formatCurr(Number(invoice.subtotal) * (Number(invoice.discount) / 100)));
    drawSubTotRow(`CGST (${halfTax}%):`, formatCurr(Number(invoice.tax) / 2));
    drawSubTotRow(`SGST (${halfTax}%):`, formatCurr(Number(invoice.tax) / 2));
  } else {
    drawSubTotRow('Sub Total:', formatCurr(invoice.subtotal));
    if (Number(invoice.discount) > 0) drawSubTotRow(`Discount:`, '- ' + formatCurr(Number(invoice.subtotal) * (Number(invoice.discount) / 100)));
    if (Number(invoice.tax) > 0) drawSubTotRow('Tax:', '+' + formatCurr(invoice.tax));
  }

  totY += 4; 
  // Subtotal Box Border
  doc.rect(TOT_X, subtotalBoxY, TOT_W, totY - subtotalBoxY).strokeColor('#000').lineWidth(1).stroke();

  // Grand Total Solid Box
  const grandTotY = totY + 12;
  doc.rect(TOT_X, grandTotY, TOT_W, 30).fill(navy);
  doc.fillColor(white).fontSize(12).font('Helvetica-Bold')
     .text('TOTAL:', TOT_X + 12, grandTotY + 10, { width: 80, align: 'left', lineBreak: false })
     .text(formatCurr(invoice.total) + '/-', TOT_X, grandTotY + 10, { width: TOT_W - 12, align: 'right', lineBreak: false });

  // Optional: Draw contacts at bottom
  if (settings.contactsAtBottom) {
    let nextY = Math.max(hasBD ? finalBdY : BLOCK_Y, grandTotY + 40) + 15;
    doc.strokeColor(borderColor).lineWidth(0.8).moveTo(MARGIN, nextY).lineTo(PAGE_W - MARGIN, nextY).stroke();
    drawContacts(nextY + 15);
  }

  // 6. FOOTER
  const FOOTER_H = 36;
  const FOOTER_Y = PAGE_H - FOOTER_H;

  if (!backgroundSource) {
    if (colors.isBold && colors.accent) {
      const grad = doc.linearGradient(0, 0, PAGE_W, 0);
      grad.stop(0, navy).stop(1, colors.accent);
      doc.rect(0, FOOTER_Y, PAGE_W, FOOTER_H).fill(grad);
    } else {
      doc.rect(0, FOOTER_Y, PAGE_W, FOOTER_H).fill(navy);
    }
  }
  doc.fillColor(backgroundSource ? '#1E293B' : '#CBD5E1').fontSize(8).font('Helvetica')
     .text(invoice.disclaimer || 'Payment expected within 45 days from invoice date.', MARGIN, FOOTER_Y + 12, { align: 'center', width: CONTENT });

  // 7. BACKGROUND WATERMARK
  if (watermark) {
    doc.save()
       .rotate(-45, { origin: [PAGE_W / 2, PAGE_H / 2] })
       .fontSize(100)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .fillOpacity(0.04)
       .text(watermark.toUpperCase(), 0, PAGE_H / 2 - 50, { width: PAGE_W, align: 'center', lineBreak: false })
       .restore();
  }
};

const renderClassic = (doc, i, c, s, w, ls, bs) => renderInvoiceLayout(doc, i, c, s, w, ls, { navy: s.headerColor, white: '#FFF', bodyText: '#1E293B', mutedText: '#64748B', borderColor: '#E2E8F0', tableHeaderBg: s.headerColor }, bs);
const renderMinimal = (doc, i, c, s, w, ls, bs) => renderInvoiceLayout(doc, i, c, s, w, ls, { navy: s.headerColor, accent: s.accentColor, isBold: true, isMinimal: true, white: '#FFF', bodyText: '#111827', mutedText: '#6B7280', borderColor: '#D1D5DB', tableHeaderBg: s.headerColor }, bs);
const renderBold    = (doc, i, c, s, w, ls, bs) => renderInvoiceLayout(doc, i, c, s, w, ls, { navy: s.headerColor, accent: s.accentColor, isBold: true, white: '#FFF', bodyText: '#334155', mutedText: '#64748B', borderColor: '#CBD5E1', tableHeaderBg: s.headerColor }, bs);

exports.generatePDF = async (invoice, client, res, template = 'classic', watermark = '', assetBaseUrl = '') => {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, bufferPages: true, layout: 'portrait' });
  const settings         = getTemplateSettings(invoice, template);
  const logoSource       = await getAssetSource(settings.logoUrl, assetBaseUrl);
  const backgroundSource = (template === 'custom' && settings.customTemplateUrl) ? await getAssetSource(settings.customTemplateUrl, assetBaseUrl) : null;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=' + invoice.invoiceNumber + '.pdf');
  doc.pipe(res);
  doc.addPage({ size: 'A4', margin: 0 });

  if      (template === 'minimal') renderMinimal(doc, invoice, client, settings, watermark, logoSource, backgroundSource);
  else if (template === 'bold')    renderBold   (doc, invoice, client, settings, watermark, logoSource, backgroundSource);
  else                             renderClassic(doc, invoice, client, settings, watermark, logoSource, backgroundSource);

  if (doc.bufferedPageRange().count > 1) doc.switchToPage(0);
  doc.flushPages();
  doc.end();
};