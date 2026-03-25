// server/pdf-service/pdf.generator.js

const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// PDFKit's built-in Helvetica does NOT support the Unicode ₹ glyph — it renders
// as a box or a "1". Use the ASCII fallback "Rs." for reliable output.
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
  };
};

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
  } catch { return null; }
};

const drawLogo = (doc, logoSource, x, y, size) => {
  if (!logoSource) return 0;
  try {
    doc.image(logoSource, x, y, { fit: [size, size], align: 'left', valign: 'center' });
    return size + 10;
  } catch { return 0; }
};

// ─── SINGLE UNIFIED LAYOUT (one page, all templates share this) ───────────────
const renderInvoiceLayout = (doc, invoice, client, settings, watermark, logoSource, colors) => {
  const { navy, accent, white, bodyText, mutedText, borderColor, tableHeaderBg, totalRowBg } = colors;

  const PAGE_W  = 595;
  const PAGE_H  = 842;
  const MARGIN  = 36;
  const CONTENT = PAGE_W - MARGIN * 2;   // 523

  // ── 1. HEADER ────────────────────────────────────────────────────────────
  const HEADER_H = 90;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(navy);

  const logoSize   = 44;
  const logoOffset = drawLogo(doc, logoSource, MARGIN, (HEADER_H - logoSize) / 2, logoSize);
  const compX      = MARGIN + logoOffset;

  doc.fillColor(white).fontSize(18).font('Helvetica-Bold')
     .text(settings.companyName || 'Invoicefy', compX, 16, { width: 240, lineBreak: false });

  let hY = 38;
  doc.font('Helvetica').fontSize(8).fillColor('#CBD5E1');
  if (invoice.yourGST) { doc.text('GSTIN: ' + invoice.yourGST, compX, hY, { width: 240 }); hY += 12; }
  if (settings.companyAddress) { doc.text(settings.companyAddress, compX, hY, { width: 240 }); }

  const docLabel = getDocumentLabel(invoice);
  doc.fillColor(white).fontSize(26).font('Helvetica-Bold')
     .text(docLabel, MARGIN, 28, { width: CONTENT, align: 'right' });

  // ── 2. META (invoice no / dates) ─────────────────────────────────────────
  const META_Y      = HEADER_H + 8;
  const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
  const dueDate     = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmtDate     = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
     .text(invoice.invoiceNumber,           MARGIN, META_Y,      { width: CONTENT, align: 'right' })
     .text('Date: ' + fmtDate(invoiceDate), MARGIN, META_Y + 12, { width: CONTENT, align: 'right' });
  doc.fillColor(accent).font('Helvetica-Bold')
     .text('Due: '  + fmtDate(dueDate),     MARGIN, META_Y + 24, { width: CONTENT, align: 'right' });

  // Watermark badge
  if (watermark) {
    doc.save();
    doc.fontSize(8.5).font('Helvetica-Bold');
    const bW = doc.widthOfString(watermark.toUpperCase()) + 14;
    doc.rect(PAGE_W - MARGIN - bW, META_Y + 38, bW, 16)
       .fillColor(accent).fillOpacity(0.15).fill();
    doc.restore();
    doc.fillColor(accent).fontSize(8.5).font('Helvetica-Bold')
       .text(watermark.toUpperCase(), PAGE_W - MARGIN - bW, META_Y + 41, { width: bW, align: 'center' });
  }

  // Divider
  const DIVIDER_Y = META_Y + 58;
  doc.strokeColor(borderColor).lineWidth(0.8)
     .moveTo(MARGIN, DIVIDER_Y).lineTo(PAGE_W - MARGIN, DIVIDER_Y).stroke();

  // ── 3. FROM / BILL TO ─────────────────────────────────────────────────────
  const INFO_Y = DIVIDER_Y + 10;
  const COL_W  = CONTENT / 2 - 10;
  const COL2_X = MARGIN + COL_W + 20;

  doc.fillColor(mutedText).fontSize(7.5).font('Helvetica-Bold')
     .text('FROM', MARGIN, INFO_Y)
     .text('BILL TO', COL2_X, INFO_Y);

  doc.strokeColor(borderColor).lineWidth(0.4)
     .moveTo(COL2_X - 10, INFO_Y).lineTo(COL2_X - 10, INFO_Y + 62).stroke();

  // FROM
  doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
     .text(settings.companyName || 'Invoicefy', MARGIN, INFO_Y + 12, { width: COL_W });
  let fromY = INFO_Y + 26;
  if (invoice.yourGST) {
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica-Bold')
       .text('GST: ' + invoice.yourGST, MARGIN, fromY, { width: COL_W });
    fromY += 12;
  }
  if (settings.companyAddress) {
    doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
       .text(settings.companyAddress, MARGIN, fromY, { width: COL_W });
  }

  // BILL TO
  doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
     .text(client ? client.name : 'N/A', COL2_X, INFO_Y + 12, { width: COL_W });
  let toY = INFO_Y + 26;
  const clientGst = invoice.clientGST || (client && client.gstNumber);
  if (clientGst) {
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica-Bold')
       .text('GST: ' + clientGst, COL2_X, toY, { width: COL_W });
    toY += 12;
  }
  const addrParts = [client && client.address, client && client.email, client && client.phone].filter(Boolean);
  if (addrParts.length) {
    doc.fillColor(mutedText).fontSize(8.5).font('Helvetica')
       .text(addrParts.join('  |  '), COL2_X, toY, { width: COL_W });
  }

  // ── 4. ITEMS TABLE ────────────────────────────────────────────────────────
  const TABLE_Y = INFO_Y + 78;
  const ROW_H   = 22;   // compact fixed height — keeps content on one page

  const hasTax     = Number(invoice.tax) > 0;
  const taxableAmt = Number(invoice.subtotal) - (Number(invoice.subtotal) * Number(invoice.discount || 0) / 100);
  const taxPercent = hasTax && taxableAmt > 0
    ? Math.round((Number(invoice.tax) / taxableAmt) * 100) : 0;
  const halfTax    = taxPercent / 2;

  // Columns — plain straight rect, NO border-radius on table header
  let cols;
  if (hasTax) {
    cols = [
      { label: 'Description',           x: MARGIN,       w: 148, align: 'left'   },
      { label: 'SAC',                    x: MARGIN + 151, w: 40,  align: 'center' },
      { label: 'Taxable',               x: MARGIN + 194, w: 76,  align: 'right'  },
      { label: 'CGST\n' + halfTax + '%', x: MARGIN + 273, w: 62,  align: 'right'  },
      { label: 'SGST\n' + halfTax + '%', x: MARGIN + 338, w: 62,  align: 'right'  },
      { label: 'Total',                  x: MARGIN + 403, w: 80,  align: 'right'  },
    ];
  } else {
    cols = [
      { label: 'Description', x: MARGIN,       w: 200, align: 'left'   },
      { label: 'SAC',         x: MARGIN + 203, w: 46,  align: 'center' },
      { label: 'Qty',         x: MARGIN + 252, w: 44,  align: 'center' },
      { label: 'Unit Price',  x: MARGIN + 299, w: 96,  align: 'right'  },
      { label: 'Total',       x: MARGIN + 398, w: 85,  align: 'right'  },
    ];
  }

  // Table header — plain rect, NO rounded corners
  const TH = 28;
  doc.rect(MARGIN, TABLE_Y, CONTENT, TH).fill(tableHeaderBg);

  doc.fillColor(white).fontSize(9).font('Helvetica-Bold');
  cols.forEach(col => {
    const lines  = col.label.split('\n');
    const lineH  = 10;
    const totalH = lines.length * lineH;
    const startY = TABLE_Y + (TH - totalH) / 2;
    lines.forEach((line, i) => {
      doc.text(line, col.x, startY + i * lineH, { width: col.w, align: col.align, lineBreak: false });
    });
  });

  // Data rows — NO addPage, everything stays on one page
  let rowY = TABLE_Y + TH;
  (invoice.items || []).forEach((item, i) => {
    const qty       = Number(item.quantity)  || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineBase  = qty * unitPrice;
    const cgst      = hasTax ? lineBase * (halfTax / 100) : 0;
    const sgst      = cgst;
    const lineTotal = hasTax ? lineBase + cgst + sgst : lineBase;

    if (i % 2 === 0) doc.rect(MARGIN, rowY, CONTENT, ROW_H).fill('#F8FAFC');

    const textY = rowY + (ROW_H - 9) / 2;
    doc.fillColor(bodyText).fontSize(9).font('Helvetica');

    if (hasTax) {
      doc.text(item.description,      cols[0].x, textY, { width: cols[0].w, align: 'left',   lineBreak: false });
      doc.text(item.hsn || '-',       cols[1].x, textY, { width: cols[1].w, align: 'center', lineBreak: false });
      doc.text(formatCurr(lineBase),  cols[2].x, textY, { width: cols[2].w, align: 'right',  lineBreak: false });
      doc.text(formatCurr(cgst),      cols[3].x, textY, { width: cols[3].w, align: 'right',  lineBreak: false });
      doc.text(formatCurr(sgst),      cols[4].x, textY, { width: cols[4].w, align: 'right',  lineBreak: false });
      doc.text(formatCurr(lineTotal), cols[5].x, textY, { width: cols[5].w, align: 'right',  lineBreak: false });
    } else {
      doc.text(item.description + (item.hsn ? ' (' + item.hsn + ')' : ''),
                                      cols[0].x, textY, { width: cols[0].w, align: 'left',   lineBreak: false });
      doc.text(item.hsn || '-',       cols[1].x, textY, { width: cols[1].w, align: 'center', lineBreak: false });
      doc.text(String(qty),           cols[2].x, textY, { width: cols[2].w, align: 'center', lineBreak: false });
      doc.text(formatCurr(unitPrice), cols[3].x, textY, { width: cols[3].w, align: 'right',  lineBreak: false });
      doc.text(formatCurr(lineTotal), cols[4].x, textY, { width: cols[4].w, align: 'right',  lineBreak: false });
    }

    rowY += ROW_H;
    if (settings.showRowDividers) {
      doc.strokeColor(borderColor).lineWidth(0.3)
         .moveTo(MARGIN, rowY).lineTo(PAGE_W - MARGIN, rowY).stroke();
    }
  });

  // ── 5. TOTALS + BANK (side by side) ──────────────────────────────────────
  const BLOCK_Y = rowY + 16;

  // Grand Total box — wider (230px), NO border-radius, plain rect
  const TOT_W = 230;
  const TOT_X = MARGIN + CONTENT - TOT_W;
  let   totY  = BLOCK_Y;

  const discountAmt = Number(invoice.subtotal) * (Number(invoice.discount || 0) / 100);

  // Draw a regular row (label left, value right)
  const drawTotRow = (label, value, highlight) => {
    if (highlight) {
      // Plain rect, NO rounded corners
      doc.rect(TOT_X - 8, totY - 5, TOT_W + 8, 26).fill(totalRowBg);
      doc.fillColor(white).fontSize(11).font('Helvetica-Bold')
         .text(label, TOT_X,     totY, { width: 100,        align: 'left',  lineBreak: false })
         .text(value, TOT_X - 4, totY, { width: TOT_W - 4,  align: 'right', lineBreak: false });
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
    drawTotRow('CGST (' + halfTax + '%)',  formatCurr(Number(invoice.tax) / 2));
    drawTotRow('SGST (' + halfTax + '%)',  formatCurr(Number(invoice.tax) / 2));
  } else {
    drawTotRow('Subtotal', formatCurr(invoice.subtotal));
    if (Number(invoice.discount) > 0)
      drawTotRow('Discount (' + invoice.discount + '%)', '- ' + formatCurr(discountAmt));
    if (Number(invoice.tax) > 0)
      drawTotRow('Tax', '+' + formatCurr(invoice.tax));
  }

  // Thin separator line above grand total
  doc.strokeColor(borderColor).lineWidth(0.7)
     .moveTo(TOT_X - 8, totY - 5).lineTo(TOT_X + TOT_W, totY - 5).stroke();

  drawTotRow('GRAND TOTAL', formatCurr(invoice.total), true);

  // Amount in words — small gap below grand total box
  doc.fillColor(mutedText).fontSize(7.5).font('Helvetica-Oblique')
     .text('Rupees ' + numberToWords(invoice.total),
           TOT_X - 8, totY + 6, { width: TOT_W + 8, align: 'left' });

  // Bank details — presentable large font on left side
  const bd    = invoice.bankDetails;
  const hasBD = bd && (bd.accountName || bd.bankName || bd.accountNumber || bd.ifsc);
  if (hasBD) {
    const BD_X = MARGIN;
    const BD_W = TOT_X - MARGIN - 16;
    let   bdY  = BLOCK_Y;

    doc.fillColor(accent).fontSize(11).font('Helvetica-Bold')
       .text('PAYMENT DETAILS', BD_X, bdY);
    bdY += 18;

    const bdRows = [];
    if (bd.accountName || bd.bankName) bdRows.push(['Account Name', bd.accountName || bd.bankName]);
    if (bd.accountNumber)              bdRows.push(['Account No.',   bd.accountNumber]);
    if (bd.ifsc)                       bdRows.push(['IFSC Code',     bd.ifsc]);
    if (bd.upiId)                      bdRows.push(['UPI ID',        bd.upiId]);
    if (bd.panNumber)                  bdRows.push(['PAN',           bd.panNumber]);

    bdRows.forEach(([label, value]) => {
      // Large readable font — 10.5pt label, 10.5pt value bold
      doc.fillColor(mutedText).fontSize(10.5).font('Helvetica')
         .text(label + ':', BD_X, bdY, { width: 82, align: 'left', lineBreak: false });
      doc.fillColor(bodyText).fontSize(10.5).font('Helvetica-Bold')
         .text(String(value || ''), BD_X + 86, bdY, { width: BD_W - 86, lineBreak: false });
      bdY += 18;
    });
  }

  // ── 6. FOOTER (pinned to page bottom, same color as header) ──────────────
  //    Signature lives INSIDE the footer bar on the right side
  const FOOTER_H = 56;
  const FOOTER_Y = PAGE_H - FOOTER_H;

  // Footer background — same navy as header
  doc.rect(0, FOOTER_Y, PAGE_W, FOOTER_H).fill(navy);

  // Disclaimer text centred in footer
  doc.fillColor('#CBD5E1').fontSize(8).font('Helvetica')
     .text(
       invoice.disclaimer || 'Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.',
       MARGIN, FOOTER_Y + 10, { align: 'center', width: CONTENT }
     );

  // Signature block — right side of footer, vertically centred
  const SIG_W = 180;
  const SIG_X = PAGE_W - MARGIN - SIG_W;

  // Thin top separator for signature zone inside footer
  doc.strokeColor('#4B6488').lineWidth(0.6)
     .moveTo(SIG_X - 4, FOOTER_Y + 4).lineTo(SIG_X + SIG_W, FOOTER_Y + 4).stroke();

  doc.fillColor(white).fontSize(11).font('Helvetica-Bold')
     .text(settings.companyName || 'Invoicefy', SIG_X, FOOTER_Y + 8, { width: SIG_W, align: 'center' });
  doc.fillColor('#94A3B8').fontSize(8.5).font('Helvetica')
     .text('Authorized Signatory', SIG_X, FOOTER_Y + 24, { width: SIG_W, align: 'center' });
  doc.fillColor(accent).fontSize(8).font('Helvetica')
     .text('For ' + (settings.companyName || 'Invoicefy'), SIG_X, FOOTER_Y + 38, { width: SIG_W, align: 'center' });
};

// ─── Template wrappers (all share the same layout) ───────────────────────────
const renderClassic = (doc, invoice, client, settings, watermark, logoSource) =>
  renderInvoiceLayout(doc, invoice, client, settings, watermark, logoSource, {
    navy:         settings.headerColor,
    accent:       settings.accentColor,
    white:        '#FFFFFF',
    bodyText:     '#1E293B',
    mutedText:    '#64748B',
    borderColor:  '#E2E8F0',
    tableHeaderBg: settings.headerColor,
    totalRowBg:   settings.headerColor,
  });

const renderMinimal = (doc, invoice, client, settings, watermark, logoSource) =>
  renderInvoiceLayout(doc, invoice, client, settings, watermark, logoSource, {
    navy:         settings.headerColor,
    accent:       settings.accentColor,
    white:        '#FFFFFF',
    bodyText:     '#111827',
    mutedText:    '#6B7280',
    borderColor:  '#D1D5DB',
    tableHeaderBg: settings.headerColor,
    totalRowBg:   settings.headerColor,
  });

const renderBold = (doc, invoice, client, settings, watermark, logoSource) =>
  renderInvoiceLayout(doc, invoice, client, settings, watermark, logoSource, {
    navy:         settings.headerColor,
    accent:       settings.accentColor,
    white:        '#FFFFFF',
    bodyText:     '#334155',
    mutedText:    '#64748B',
    borderColor:  '#CBD5E1',
    tableHeaderBg: settings.headerColor,
    totalRowBg:   settings.headerColor,
  });

// ─── Entry point ──────────────────────────────────────────────────────────────
exports.generatePDF = async (invoice, client, res, template = 'classic', watermark = '', assetBaseUrl = '') => {
  // autoFirstPage: false so we control exactly one page
  const doc      = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true, bufferPages: true });
  const settings = getTemplateSettings(invoice, template);
  const logoSource = await getLogoSource(settings, assetBaseUrl);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=' + invoice.invoiceNumber + '.pdf');
  doc.pipe(res);

  if      (template === 'minimal') renderMinimal(doc, invoice, client, settings, watermark, logoSource);
  else if (template === 'bold')    renderBold   (doc, invoice, client, settings, watermark, logoSource);
  else                             renderClassic(doc, invoice, client, settings, watermark, logoSource);

  doc.flushPages();
  doc.end();
};