const Invoice = require('./invoice.model');
const Client  = require('../clients/client.model');

// Helper: auto invoice number
const generateInvoiceNumber = () => 'INV-' + Date.now();

// Helper: calculate totals
const calculateTotals = (items, taxPercent, discountPercent) => {
  const subtotal   = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discounted = subtotal - (subtotal * discountPercent / 100);
  const total      = discounted + (discounted * taxPercent / 100);
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    total:    parseFloat(total.toFixed(2))
  };
};

// POST /invoice/create
exports.createInvoice = async (req, res) => {
  try {
    const { clientId, items, tax = 0, discount = 0 } = req.body;
    const businessId = req.user.businessId;

    const { subtotal, total } = calculateTotals(items, tax, discount);
    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      businessId, clientId, invoiceNumber,
      items, tax, discount, subtotal, total
    });

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /invoice/:id
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Manually fetch client info
    const client = await Client.findByPk(invoice.clientId);
    res.status(200).json({ success: true, invoice, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /invoice/status
exports.updateStatus = async (req, res) => {
  try {
    const { invoiceId, status } = req.body;
    await Invoice.update({ status }, { where: { id: invoiceId } });
    const updated = await Invoice.findByPk(invoiceId);
    res.status(200).json({ success: true, invoice: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /invoice/download?id=...
exports.downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.query.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const client = await Client.findByPk(invoice.clientId);
    const { generatePDF } = require('../pdf-service/pdf.generator');
    generatePDF(invoice, client, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};