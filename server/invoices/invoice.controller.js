// server/invoices/invoice.controller.js

const Invoice = require('./invoice.model');
const Client  = require('../clients/client.model');

const VALID_TEMPLATES = ['classic', 'minimal', 'bold'];

const generateInvoiceNumber = () =>
  `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// ─────────────────────────────────────────────
// CREATE INVOICE
// ─────────────────────────────────────────────
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientId,
      items,
      gstPercent = 0,
      template = 'classic',
      watermark = '',
      invoiceDate,
      yourGST,
      clientGST,
      bankDetails,
      disclaimer
    } = req.body;

    const businessId = req.user.businessId;

    if (!clientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'clientId and non-empty items are required'
      });
    }

    const client = await Client.findOne({ where: { id: clientId, businessId } });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found for this business'
      });
    }

    // ✅ Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      const qty  = Number(item.quantity)  || 0;
      const unit = Number(item.unitPrice) || 0;
      return sum + qty * unit;
    }, 0);

    // ✅ GST calculation
    const gstTotal = subtotal * (Number(gstPercent) || 0) / 100;
    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;
    const total = subtotal + gstTotal;

    // ✅ Add HSN support in items
    const updatedItems = items.map(item => ({
      ...item,
      hsn: item.hsn || ''
    }));

    const invoice = await Invoice.create({
      businessId,
      clientId,
      invoiceNumber: generateInvoiceNumber(),
      invoiceDate: invoiceDate || new Date(),

      yourGST,
      clientGST,

      items: updatedItems,

      subtotal: Number(subtotal.toFixed(2)),
      gstPercent,
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      gstTotal: Number(gstTotal.toFixed(2)),
      total: Number(total.toFixed(2)),

      bankDetails: bankDetails || null,
      disclaimer:
        disclaimer ||
        "Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.",

      template: VALID_TEMPLATES.includes(template) ? template : 'classic',
      watermark: watermark?.trim() || '',

      status: 'Unpaid'
    });

    return res.status(201).json({
      success: true,
      invoice
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
