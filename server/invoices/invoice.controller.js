const Invoice = require('./invoice.model');
const Client = require('../clients/client.model');
const { generatePDF } = require('../pdf-service/pdf.generator');

const generateInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const calculateTotals = (items, taxPercent, discountPercent) => {
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const unit = Number(item.unitPrice) || 0;
    return sum + (qty * unit);
  }, 0);

  const discountAmount = subtotal * (Number(discountPercent) || 0) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = taxable * (Number(taxPercent) || 0) / 100;
  const total = taxable + taxAmount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

exports.createInvoice = async (req, res) => {
  try {
    const { clientId, items, tax = 0, discount = 0 } = req.body;
    const businessId = req.user.businessId;

    if (!clientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'clientId and non-empty items are required' });
    }

    const client = await Client.findOne({ where: { id: clientId, businessId } });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found for this business' });
    }

    const totals = calculateTotals(items, tax, discount);

    const invoice = await Invoice.create({
      businessId,
      clientId,
      invoiceNumber: generateInvoiceNumber(),
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount,
      total: totals.total,
      status: 'Unpaid'
    });

    return res.status(201).json({ success: true, invoice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const invoice = await Invoice.findOne({ where: { id: req.params.id, businessId } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const client = await Client.findOne({ where: { id: invoice.clientId, businessId } });
    return res.status(200).json({ success: true, invoice, client });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { invoiceId, status } = req.body;

    if (!invoiceId || !['Paid', 'Unpaid', 'Overdue'].includes(status)) {
      return res.status(400).json({ success: false, message: 'invoiceId and valid status are required' });
    }

    const invoice = await Invoice.findOne({ where: { id: invoiceId, businessId } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.status = status;
    await invoice.save();

    return res.status(200).json({ success: true, invoice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const invoiceId = req.query.id;
    const invoice = await Invoice.findOne({ where: { id: invoiceId, businessId } });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const client = await Client.findOne({ where: { id: invoice.clientId, businessId } });
    return generatePDF(invoice, client, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
