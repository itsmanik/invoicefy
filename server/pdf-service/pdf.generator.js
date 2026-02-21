const PDFDocument = require('pdfkit');

exports.generatePDF = (invoice, client, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);

  doc.pipe(res);

  // Colors
  const primaryColor = '#2563EB'; // Tailwind Blue 600
  const secondaryColor = '#4B5563'; // Tailwind Gray 600
  const lightGray = '#F3F4F6';
  const borderColor = '#E5E7EB';

  // Helper for Currency
  const formatCurr = (num) => `Rs. ${Number(num).toFixed(2)}`;

  // --- HEADER ---
  doc.fillColor(primaryColor)
    .fontSize(28)
    .text('INVOICE', 50, 50, { align: 'right' });

  doc.fillColor(secondaryColor)
    .fontSize(10)
    .text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' })
    .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' })
    .text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });

  // Add Company Name (Invoicefy)
  doc.fillColor('#111827')
    .fontSize(20)
    .text('Invoicefy', 50, 50);

  doc.moveDown(3);

  // --- BILLING INFO ---
  const billingTop = 150;

  doc.fillColor(primaryColor)
    .fontSize(12)
    .text('BILL TO:', 50, billingTop);

  doc.fillColor('#111827')
    .fontSize(12)
    .text(client?.name || 'N/A', 50, billingTop + 20)
    .fillColor(secondaryColor)
    .fontSize(10)
    .text(client?.address || 'N/A')
    .text(client?.email || 'N/A')
    .text(client?.phone || 'N/A');

  // --- TABLE HEADER ---
  const invoiceTableTop = 260;

  // Table Header Background
  doc.rect(50, invoiceTableTop, 495, 25).fill(primaryColor);

  doc.fillColor('#FFFFFF')
    .fontSize(10)
    .text('Description', 60, invoiceTableTop + 8)
    .text('Quantity', 280, invoiceTableTop + 8, { width: 60, align: 'right' })
    .text('Unit Price', 350, invoiceTableTop + 8, { width: 70, align: 'right' })
    .text('Line Total', 430, invoiceTableTop + 8, { width: 105, align: 'right' });

  // --- TABLE ROWS ---
  let position = invoiceTableTop + 30;
  doc.fillColor('#111827');

  invoice.items.forEach((item, index) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

    // Check if we need a new page
    if (position > 700) {
      doc.addPage();
      position = 50;
    }

    doc.fontSize(10)
      .text(item.description, 60, position)
      .text(item.quantity.toString(), 280, position, { width: 60, align: 'right' })
      .text(formatCurr(item.unitPrice), 350, position, { width: 70, align: 'right' })
      .text(formatCurr(lineTotal), 430, position, { width: 105, align: 'right' });

    position += 20;

    // Draw line
    doc.strokeColor(borderColor)
      .lineWidth(1)
      .moveTo(50, position)
      .lineTo(545, position)
      .stroke();

    position += 10;
  });

  // --- SUMMARY SECTION ---
  const subtotalPosition = position + 20;

  // Draw background box for totals
  doc.rect(320, subtotalPosition - 10, 225, 100).fill(lightGray);

  doc.fillColor('#111827').fontSize(10);
  doc.text('Subtotal:', 340, subtotalPosition)
    .text(formatCurr(invoice.subtotal), 430, subtotalPosition, { width: 105, align: 'right' });

  let curPos = subtotalPosition + 20;

  if (Number(invoice.discount) > 0) {
    const discAmount = (Number(invoice.subtotal) * Number(invoice.discount)) / 100;
    doc.text(`Discount (${invoice.discount}%):`, 340, curPos)
      .text(`-${formatCurr(discAmount)}`, 430, curPos, { width: 105, align: 'right' });
    curPos += 20;
  }

  if (Number(invoice.tax) > 0) {
    doc.text(`Tax (${(Number(invoice.tax) / (Number(invoice.subtotal) - (Number(invoice.subtotal) * Number(invoice.discount) / 100)) * 100).toFixed(1)}%):`, 340, curPos)
      .text(`+${formatCurr(invoice.tax)}`, 430, curPos, { width: 105, align: 'right' });
    curPos += 20;
  }

  // Draw Line above Total
  doc.strokeColor(borderColor)
    .lineWidth(1)
    .moveTo(340, curPos - 5)
    .lineTo(535, curPos - 5)
    .stroke();

  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold');
  doc.text('TOTAL:', 340, curPos + 5)
    .text(formatCurr(invoice.total), 430, curPos + 5, { width: 105, align: 'right' });

  // --- FOOTER ---
  doc.fontSize(10)
    .fillColor(secondaryColor)
    .text('Thank you for your business!', 50, 750, { align: 'center', width: 495 });

  doc.end();
};
