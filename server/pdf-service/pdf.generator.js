// server/pdf-service/pdf.generator.js

const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurr = (num) =>
  'Rs.' + Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
                 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
                 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const toWords = (n) => {
    if (n === 0)        return '';
    if (n < 20)         return ones[n] + ' ';
    if (n < 100)        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000)       return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 100000)     return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 10000000)   return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000);
  };
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Only';
  return toWords(n).trim().replace(/\s+/g, ' ') + ' Only';
};

const getDocumentLabel = (invoice) =>
  invoice.documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE';

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
    companyAddress:  saved.companyAddress || '',
    logoUrl:         /^\/uploads\/[A-Za-z0-9._-]+$/.test(saved.logoUrl || '') ? saved.logoUrl : '',
    headerColor:     /^#[0-9A-Fa-f]{6}$/.test(saved.headerColor || '') ? saved.headerColor : defaults.headerColor,
    accentColor:     /^#[0-9A-Fa-f]{6}$/.test(saved.accentColor || '') ? saved.accentColor : defaults.accentColor,
    compactMode:     Boolean(saved.compactMode),
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

// ─── SINGLE UNIFIED LAYOUT (forced to exactly ONE page) ──────────────────────
const renderInvoiceLayout = (doc, invoice, client, settings, watermark, logoSource, colors, backgroundSource) => {
  const { navy, accent, white, bodyText, mutedText, borderColor, tableHeaderBg, totalRowBg } = colors;

  const PAGE_W  = 595;
  const PAGE_H  = 842;
  const MARGIN  = 36;
  const CONTENT = PAGE_W - MARGIN * 2;

  // ── 0. BACKGROUND ────────────────────────────────────────────────────────
  if (backgroundSource) {
    try {
      doc.image(backgroundSource, 0, 0, { width: PAGE_W, height: PAGE_H });
    } catch (e) { console.error('BG Error:', e); }
  }

  // ── 1. HEADER ────────────────────────────────────────────────────────────
  const HEADER_H = 90;
  if (!backgroundSource) {
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(navy);
  } else {
    // White overlay for header text legibility - matching bg-white/90
    doc.save()
       .rect(0, 0, PAGE_W, HEADER_H)
       .fillColor('#FFFFFF').fillOpacity(0.9).fill();
    doc.restore();
  }

  const logoSize   = 44;
  const logoOffset = drawLogo(doc, logoSource, MARGIN, (HEADER_H - logoSize) / 2, logoSize);
  const compX      = MARGIN + logoOffset;

  doc.fillColor(backgroundSource ? navy : white).fontSize(26).font('Helvetica-Bold')
     .text(settings.companyName || 'Invoicefy', compX, 20, { width: 240, lineBreak: false });

  doc.font('Helvetica').fontSize(8).fillColor(backgroundSource ? bodyText : '#CBD5E1');
  if (settings.companyAddress) {
    doc.text(settings.companyAddress, compX, 54, { width: 240, lineBreak: false });
  }

  const docLabel = getDocumentLabel(invoice);
  doc.fillColor(backgroundSource ? navy : white).fontSize(26).font('Helvetica-Bold')
     .text(docLabel, MARGIN, 28, { width: CONTENT, align: 'right', lineBreak: false });

  // ── 2. META ───────────────────────────────────────────────────────────────
  const META_Y      = HEADER_H + 8;
  const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
  const dueDate     = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmtDate     = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (backgroundSource) {
    doc.save()
       .rect(PAGE_W - MARGIN - 120, META_Y - 4, 120, 56)
       .fillColor('#FFFFFF').fillOpacity(0.7).fill();
    doc.restore();
  }

  doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
     .text(invoice.invoiceNumber,           MARGIN, META_Y,      { width: CONTENT, align: 'right', lineBreak: false })
     .text('Date: ' + fmtDate(invoiceDate), MARGIN, META_Y + 12, { width: CONTENT, align: 'right', lineBreak: false });
  doc.fillColor(accent).font('Helvetica-Bold')
     .text('Due: ' + fmtDate(dueDate),      MARGIN, META_Y + 24, { width: CONTENT, align: 'right', lineBreak: false });

  if (watermark) {
    doc.save();
    doc.fontSize(8.5).font('Helvetica-Bold');
    const bW = doc.widthOfString(watermark.toUpperCase()) + 14;
    doc.rect(PAGE_W - MARGIN - bW, META_Y + 38, bW, 16)
       .fillColor(accent).fillOpacity(0.15).fill();
    doc.restore();
    doc.fillColor(accent).fontSize(8.5).font('Helvetica-Bold')
       .text(watermark.toUpperCase(), PAGE_W - MARGIN - bW, META_Y + 41, { width: bW, align: 'center', lineBreak: false });
  }

  const DIVIDER_Y = META_Y + 58;
  if (!backgroundSource) {
    doc.strokeColor(borderColor).lineWidth(0.8)
       .moveTo(MARGIN, DIVIDER_Y).lineTo(PAGE_W - MARGIN, DIVIDER_Y).stroke();
  }

  // ── 3. FROM / BILL TO ─────────────────────────────────────────────────────
  const INFO_Y = DIVIDER_Y + 10;
  const COL_W  = CONTENT / 2 - 10;
  const COL2_X = MARGIN + COL_W + 20;

  if (backgroundSource) {
    doc.save()
       .rect(MARGIN - 6, INFO_Y - 6, CONTENT + 12, 74)
       .fillColor('#FFFFFF').fillOpacity(0.9).fill();
    doc.restore();
  }

  doc.fillColor(mutedText).fontSize(7.5).font('Helvetica-Bold')
     .text('FROM',    MARGIN,  INFO_Y, { lineBreak: false })
     .text('BILL TO', COL2_X, INFO_Y, { lineBreak: false });

  doc.strokeColor(borderColor).lineWidth(0.4)
     .moveTo(COL2_X - 10, INFO_Y).lineTo(COL2_X - 10, INFO_Y + 62).stroke();

  doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
     .text(settings.companyName || 'Invoicefy', MARGIN, INFO_Y + 12, { width: COL_W, lineBreak: false });
  let fromY = INFO_Y + 26;
  if (invoice.yourGST) {
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica-Bold')
       .text('GST: ' + invoice.yourGST, MARGIN, fromY, { width: COL_W, lineBreak: false });
    fromY += 12;
  }
  if (settings.companyAddress) {
    doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
       .text(settings.companyAddress, MARGIN, fromY, { width: COL_W, lineBreak: false });
  }

  doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
     .text(client ? client.name : 'N/A', COL2_X, INFO_Y + 12, { width: COL_W, lineBreak: false });
  let toY = INFO_Y + 26;
  const clientGst = invoice.clientGST || (client && client.gstNumber);
  if (clientGst) {
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica-Bold')
       .text('GST: ' + clientGst, COL2_X, toY, { width: COL_W, lineBreak: false });
    toY += 12;
  }
  const addrParts = [client && client.address, client && client.email, client && client.phone].filter(Boolean);
  if (addrParts.length) {
    doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
       .text(addrParts.join('  |  '), COL2_X, toY, { width: COL_W, lineBreak: false });
  }

  // ── 4. ITEMS TABLE ────────────────────────────────────────────────────────
  const TABLE_Y = INFO_Y + 78;
  const ROW_H   = 36;

  const hasTax     = Number(invoice.tax) > 0;
  const taxableAmt = Number(invoice.subtotal) - (Number(invoice.subtotal) * Number(invoice.discount || 0) / 100);
  const taxPercent = hasTax && taxableAmt > 0
    ? Math.round((Number(invoice.tax) / taxableAmt) * 100) : 0;
  const halfTax    = taxPercent / 2;

  let cols;
  
  // Defined exact column widths and border placement
  if (hasTax) {
    cols = [
      { label: 'Description',            x: MARGIN,       w: 150, align: 'center', rightBorder: MARGIN + 150 },
      { label: 'SAC',                    x: MARGIN + 150, w: 44,  align: 'center', rightBorder: MARGIN + 194 },
      { label: 'Taxable',                x: MARGIN + 194, w: 78,  align: 'center', rightBorder: MARGIN + 272 },
      { label: 'CGST\n' + halfTax + '%', x: MARGIN + 272, w: 64,  align: 'center', rightBorder: MARGIN + 336 },
      { label: 'SGST\n' + halfTax + '%', x: MARGIN + 336, w: 64,  align: 'center', rightBorder: MARGIN + 400 },
      { label: 'Total',                  x: MARGIN + 400, w: 123, align: 'center', rightBorder: null }, // no right border for last col
    ];
  } else {
    cols = [
      { label: 'Description', x: MARGIN,       w: 202, align: 'center', rightBorder: MARGIN + 202 },
      { label: 'SAC',         x: MARGIN + 202, w: 48,  align: 'center', rightBorder: MARGIN + 250 },
      { label: 'Qty',         x: MARGIN + 250, w: 48,  align: 'center', rightBorder: MARGIN + 298 },
      { label: 'Unit Price',  x: MARGIN + 298, w: 100, align: 'center', rightBorder: MARGIN + 398 },
      { label: 'Total',       x: MARGIN + 398, w: 125, align: 'center', rightBorder: null },
    ];
  }

  const TH = 40;
  if (backgroundSource) {
    const itemsCount  = Math.max(invoice.items?.length || 1, 1);
    const tableHeight = TH + (itemsCount * ROW_H);
    // Draw background for entire table area
    doc.save()
       .rect(MARGIN, TABLE_Y, CONTENT, tableHeight)
       .fillColor('#FFFFFF').fillOpacity(0.85).fill();
    doc.restore();
  }

  if (!backgroundSource) {
    doc.rect(MARGIN, TABLE_Y, CONTENT, TH).fill(tableHeaderBg);
    doc.fillColor(white);
  } else {
    doc.fillColor(navy); // Use header color for text if on glass
  }
  doc.fontSize(9).font('Helvetica-Bold');
  cols.forEach(col => {
    const lines  = col.label.split('\n');
    const lineH  = 10;
    const totalH = lines.length * lineH;
    const startY = TABLE_Y + (TH - totalH) / 2;
    lines.forEach((line, i) => {
      doc.text(line, col.x, startY + i * lineH, { width: col.w, align: col.align, lineBreak: false });
    });
  });

  let rowY = TABLE_Y + TH;
  const items = invoice.items || [];

  if (items.length === 0) {
    doc.fillColor(mutedText).fontSize(9).font('Helvetica-Oblique')
       .text('No items added yet...', MARGIN, rowY + 8, { width: CONTENT, align: 'center', lineBreak: false });
    rowY += ROW_H;
  } else {
    items.forEach((item, i) => {
      const qty       = Number(item.quantity)  || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const lineBase  = qty * unitPrice;
      const cgst      = hasTax ? lineBase * (halfTax / 100) : 0;
      const sgst      = cgst;
      const lineTotal = hasTax ? lineBase + cgst + sgst : lineBase;

      if (i % 2 === 0 && !backgroundSource) doc.rect(MARGIN, rowY, CONTENT, ROW_H).fill('#F8FAFC');
      else if (i % 2 === 0 && backgroundSource) {
        doc.save().rect(MARGIN, rowY, CONTENT, ROW_H).fillColor('#FFFFFF').fillOpacity(0.3).fill().restore();
      }

      // PDFKit places text from the top of the cap-height; add 3px extra to visually center
      const textY = rowY + (ROW_H - 9) / 2 - 2;
      doc.fillColor(bodyText).fontSize(9).font('Helvetica');

      if (hasTax) {
        doc.text(item.description,      cols[0].x, textY, { width: cols[0].w, align: 'center', lineBreak: false });
        doc.text(item.hsn || '-',       cols[1].x, textY, { width: cols[1].w, align: 'center', lineBreak: false });
        doc.text(formatCurr(lineBase),  cols[2].x, textY, { width: cols[2].w, align: 'center', lineBreak: false });
        doc.text(formatCurr(cgst),      cols[3].x, textY, { width: cols[3].w, align: 'center', lineBreak: false });
        doc.text(formatCurr(sgst),      cols[4].x, textY, { width: cols[4].w, align: 'center', lineBreak: false });
        doc.text(formatCurr(lineTotal), cols[5].x, textY, { width: cols[5].w, align: 'center', lineBreak: false });
      } else {
        doc.text(item.description + (item.hsn ? ' (' + item.hsn + ')' : ''),
                                        cols[0].x, textY, { width: cols[0].w, align: 'center', lineBreak: false });
        doc.text(item.hsn || '-',       cols[1].x, textY, { width: cols[1].w, align: 'center', lineBreak: false });
        doc.text(String(qty),           cols[2].x, textY, { width: cols[2].w, align: 'center', lineBreak: false });
        doc.text(formatCurr(unitPrice), cols[3].x, textY, { width: cols[3].w, align: 'center', lineBreak: false });
        doc.text(formatCurr(lineTotal), cols[4].x, textY, { width: cols[4].w, align: 'center', lineBreak: false });
      }

      rowY += ROW_H;
      
      // Horizontal row dividers
      if (settings.showRowDividers) {
        doc.strokeColor(borderColor).lineWidth(0.3)
           .moveTo(MARGIN, rowY).lineTo(PAGE_W - MARGIN, rowY).stroke();
      }
    });
  }

  // Solid border box around the entire items table (header + rows)
  doc.rect(MARGIN, TABLE_Y, CONTENT, rowY - TABLE_Y)
     .strokeColor(borderColor).lineWidth(1).stroke();

  // Thin vertical dividing lines for columns
  doc.strokeColor(borderColor).lineWidth(0.3);
  cols.forEach(col => {
    if (col.rightBorder) {
      doc.moveTo(col.rightBorder, TABLE_Y)
         .lineTo(col.rightBorder, rowY)
         .stroke();
    }
  });

  // ── 5. TOTALS + BANK ─────────────────────────────────────────────────────
  const BLOCK_Y = rowY + 28;   // increased gap between table and totals/bank
  const TOT_W   = 230;
  const TOT_X   = MARGIN + CONTENT - TOT_W;
  let   totY    = BLOCK_Y;

  const discountAmt = Number(invoice.subtotal) * (Number(invoice.discount || 0) / 100);

  const drawTotRow = (label, value, highlight) => {
    if (highlight) {
      if (!backgroundSource) {
        doc.rect(TOT_X - 8, totY - 5, TOT_W + 8, 26).fill(totalRowBg);
        doc.fillColor(white);
      } else {
        doc.save().rect(TOT_X - 8, totY - 5, TOT_W + 8, 26).fillColor('#FFFFFF').fillOpacity(0.5).fill().restore();
        doc.fillColor(navy);
      }
      doc.fontSize(11).font('Helvetica-Bold')
         .text(label, TOT_X,     totY, { width: 100,       align: 'left',  lineBreak: false })
         .text(value, TOT_X - 4, totY, { width: TOT_W - 4, align: 'right', lineBreak: false });
    } else {
      doc.fillColor(mutedText).fontSize(9).font('Helvetica')
         .text(label, TOT_X, totY, { width: 120,       align: 'left',  lineBreak: false });
      doc.fillColor(bodyText).fontSize(9).font('Helvetica')
         .text(value, TOT_X, totY, { width: TOT_W - 4, align: 'right', lineBreak: false });
    }
    totY += 19;
  };

  if (hasTax) {
    drawTotRow('Taxable Amount', formatCurr(taxableAmt));
    if (Number(invoice.discount) > 0)
      drawTotRow('Discount (' + invoice.discount + '%)', '- ' + formatCurr(discountAmt));
    drawTotRow('CGST (' + halfTax + '%)', formatCurr(Number(invoice.tax) / 2));
    drawTotRow('SGST (' + halfTax + '%)', formatCurr(Number(invoice.tax) / 2));
  } else {
    drawTotRow('Subtotal', formatCurr(invoice.subtotal));
    if (Number(invoice.discount) > 0)
      drawTotRow('Discount (' + invoice.discount + '%)', '- ' + formatCurr(discountAmt));
    if (Number(invoice.tax) > 0)
      drawTotRow('Tax', '+' + formatCurr(invoice.tax));
  }

  doc.strokeColor(borderColor).lineWidth(0.7)
     .moveTo(TOT_X - 8, totY - 5).lineTo(TOT_X + TOT_W, totY - 5).stroke();

  drawTotRow('GRAND TOTAL', formatCurr(invoice.total), true);

  // Solid border box around the totals block (from top to bottom of grand total row)
  doc.rect(TOT_X - 8, BLOCK_Y - 8, TOT_W + 8, totY - BLOCK_Y + 8)
     .strokeColor(borderColor).lineWidth(1).stroke();

  // Bank details (left side)
  const bd    = invoice.bankDetails;
  const hasBD = bd && (bd.accountName || bd.bankName || bd.accountNumber || bd.ifsc);
  if (hasBD) {
    const BD_X = MARGIN;
    const BD_W = TOT_X - MARGIN - 16;
    let   bdY  = BLOCK_Y;

    if (backgroundSource) {
      doc.save()
         .rect(BD_X - 4, bdY - 4, BD_W + 8, 120) // assumed height
         .fillColor('#FFFFFF').fillOpacity(0.7).fill();
      doc.restore();
    }

    doc.fillColor(accent).fontSize(11).font('Helvetica-Bold')
       .text('PAYMENT DETAILS', BD_X, bdY, { lineBreak: false });
    bdY += 18;

    const bdRows = [];
    if (bd.accountName || bd.bankName) bdRows.push(['Account Name', bd.accountName || bd.bankName]);
    if (bd.accountNumber)              bdRows.push(['Account No.',   bd.accountNumber]);
    if (bd.ifsc)                       bdRows.push(['IFSC Code',     bd.ifsc]);
    if (bd.upiId)                      bdRows.push(['UPI ID',        bd.upiId]);
    if (bd.panNumber)                  bdRows.push(['PAN',           bd.panNumber]);

    bdRows.forEach(([label, value]) => {
      doc.fillColor(mutedText).fontSize(10.5).font('Helvetica')
         .text(label + ':', BD_X, bdY, { width: 82, align: 'left', lineBreak: false });
      doc.fillColor(bodyText).fontSize(10.5).font('Helvetica-Bold')
         .text(String(value || ''), BD_X + 86, bdY, { width: BD_W - 86, lineBreak: false });
      bdY += 18;
    });
  }

  // ── 6. SIGNATURE BLOCK — right side of body, with generous space below totals
  // Sits in the blank body area, well below the "Rupees..." line
  const SIG_W      = 180;
  const SIG_X      = PAGE_W - MARGIN - SIG_W;
  // Place signature near the bottom of the body area (above footer)
  const FOOTER_TOP  = PAGE_H - 36;           // footer starts here
  const SIG_BODY_Y  = FOOTER_TOP - 70;       // 70px above footer = comfortable gap

  // Top border line for signature zone
  if (backgroundSource) {
    doc.save()
       .rect(SIG_X - 4, SIG_BODY_Y - 4, SIG_W + 8, 64)
       .fillColor('#FFFFFF').fillOpacity(0.8).fill();
    doc.restore();
  }

  doc.strokeColor(borderColor).lineWidth(0.8)
     .moveTo(SIG_X, SIG_BODY_Y).lineTo(SIG_X + SIG_W, SIG_BODY_Y).stroke();

  doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
     .text(settings.companyName || 'Invoicefy', SIG_X, SIG_BODY_Y + 10,
           { width: SIG_W, align: 'center', lineBreak: false });
  doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
     .text('Authorized Signatory', SIG_X, SIG_BODY_Y + 26,
           { width: SIG_W, align: 'center', lineBreak: false });
  doc.fillColor(accent).fontSize(8).font('Helvetica')
     .text('For ' + (settings.companyName || 'Invoicefy'), SIG_X, SIG_BODY_Y + 40,
           { width: SIG_W, align: 'center', lineBreak: false });

  // ── 7. FOOTER — plain dark bar with disclaimer only ───────────────────────
  const FOOTER_H = 36;
  const FOOTER_Y = PAGE_H - FOOTER_H;

  if (!backgroundSource) {
    doc.rect(0, FOOTER_Y, PAGE_W, FOOTER_H).fill(navy);
    doc.fillColor('#CBD5E1');
  } else {
    doc.fillColor(navy);
  }

  doc.fontSize(8).font('Helvetica')
     .text(
       invoice.disclaimer || 'Payment expected within 45 days from invoice date.',
       MARGIN, FOOTER_Y + 12,
       { align: 'center', width: CONTENT, lineBreak: false }
     );
};

// ─── Template wrappers ────────────────────────────────────────────────────────
const renderClassic = (doc, invoice, client, settings, watermark, logoSource, backgroundSource) =>
  renderInvoiceLayout(doc, invoice, client, settings, watermark, logoSource, {
    navy:          settings.headerColor,
    accent:        settings.accentColor,
    white:         '#FFFFFF',
    bodyText:      '#1E293B',
    mutedText:     '#64748B',
    borderColor:   '#E2E8F0',
    tableHeaderBg: settings.headerColor,
    totalRowBg:    settings.headerColor,
  }, backgroundSource);

const renderMinimal = (doc, invoice, client, settings, watermark, logoSource, backgroundSource) =>
  renderInvoiceLayout(doc, invoice, client, settings, watermark, logoSource, {
    navy:          settings.headerColor,
    accent:        settings.accentColor,
    white:         '#FFFFFF',
    bodyText:      '#111827',
    mutedText:     '#6B7280',
    borderColor:   '#D1D5DB',
    tableHeaderBg: settings.headerColor,
    totalRowBg:    settings.headerColor,
  }, backgroundSource);

const renderBold = (doc, invoice, client, settings, watermark, logoSource, backgroundSource) =>
  renderInvoiceLayout(doc, invoice, client, settings, watermark, logoSource, {
    navy:          settings.headerColor,
    accent:        settings.accentColor,
    white:         '#FFFFFF',
    bodyText:      '#334155',
    mutedText:     '#64748B',
    borderColor:   '#CBD5E1',
    tableHeaderBg: settings.headerColor,
    totalRowBg:    settings.headerColor,
  }, backgroundSource);

// ─── Entry point ──────────────────────────────────────────────────────────────
exports.generatePDF = async (invoice, client, res, template = 'classic', watermark = '', assetBaseUrl = '') => {
  // KEY FIX: autoFirstPage: false prevents PDFKit from ever auto-adding pages.
  // We manually add EXACTLY one page. All text uses lineBreak: false and
  // explicit absolute Y coordinates, so nothing can trigger a page overflow.
  const doc = new PDFDocument({
    size:          'A4',
    margin:        0,
    autoFirstPage: false,  // We add the page ourselves below
    bufferPages:   true,   // Required to use switchToPage / bufferedPageRange
    layout:        'portrait',
  });

  const settings         = getTemplateSettings(invoice, template);
  const logoSource       = await getAssetSource(settings.logoUrl, assetBaseUrl);
  const backgroundSource = (template === 'custom' && settings.customTemplateUrl)
    ? await getAssetSource(settings.customTemplateUrl, assetBaseUrl)
    : null;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=' + invoice.invoiceNumber + '.pdf');
  doc.pipe(res);

  // Add exactly ONE page
  doc.addPage({ size: 'A4', margin: 0 });

  // Render the invoice layout
  if      (template === 'minimal') renderMinimal(doc, invoice, client, settings, watermark, logoSource, backgroundSource);
  else if (template === 'bold')    renderBold   (doc, invoice, client, settings, watermark, logoSource, backgroundSource);
  else                             renderClassic(doc, invoice, client, settings, watermark, logoSource, backgroundSource);

  // Safety: if any content somehow triggered extra pages, keep only page 0
  const range = doc.bufferedPageRange();
  if (range.count > 1) {
    doc.switchToPage(0);
  }

  doc.flushPages();
  doc.end();
};