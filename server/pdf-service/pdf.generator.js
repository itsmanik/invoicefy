const PDFDocument = require('pdfkit');

exports.generatePDF = (invoice, client, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text('Invoicefy Invoice', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
  doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
  doc.text(`Status: ${invoice.status}`);

  doc.moveDown();
  doc.text(`Bill To: ${client?.name || 'N/A'}`);
  doc.text(`Email: ${client?.email || 'N/A'}`);
  doc.text(`Phone: ${client?.phone || 'N/A'}`);
  doc.text(`Address: ${client?.address || 'N/A'}`);

  doc.moveDown().fontSize(13).text('Items', { underline: true });
  doc.moveDown(0.5);

  invoice.items.forEach((item, index) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    doc.fontSize(11).text(
      `${index + 1}. ${item.description} | Qty: ${item.quantity} | Unit: ₹${item.unitPrice} | Line: ₹${lineTotal.toFixed(2)}`
    );
  });

  doc.moveDown();
  doc.text(`Subtotal: ₹${Number(invoice.subtotal).toFixed(2)}`);
  doc.text(`Tax: ₹${Number(invoice.tax).toFixed(2)}`);
  doc.text(`Discount: ${Number(invoice.discount).toFixed(2)}%`);
  doc.fontSize(13).text(`Total: ₹${Number(invoice.total).toFixed(2)}`);

  doc.end();
};
