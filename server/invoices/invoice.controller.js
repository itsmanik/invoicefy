// server/invoices/invoice.controller.js

const Invoice = require('./invoice.model');
const Client  = require('../clients/client.model');
const { generatePDF } = require('../pdf-service/pdf.generator');

const VALID_TEMPLATES = ['classic', 'minimal', 'bold', 'custom'];
const VALID_DOCUMENT_TYPES = ['invoice', 'quotation'];

const getNextDocumentNumber = async (businessId, documentType) => {
  const prefix = documentType === 'quotation' ? 'QUO' : 'INV';
  const where = { documentType };

  if (businessId) {
    where.businessId = businessId;
  }

  const invoices = await Invoice.findAll({
    where,
    attributes: ['invoiceNumber'],
  });

  const maxSerial = invoices.reduce((max, invoice) => {
    const match = String(invoice.invoiceNumber || '').match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) return max;

    const serial = Number(match[1]);
    return Number.isFinite(serial) ? Math.max(max, serial) : max;
  }, 0);

  return `${prefix}-${String(maxSerial + 1).padStart(4, '0')}`;
};

// const sanitizeTemplateSettings = (template, settings = {}) => {
//   const value = settings && typeof settings === 'object' ? settings : {};
//   const defaults = {
//     classic: { headerColor: '#2563EB', accentColor: '#1d4ed8' },
//     minimal: { headerColor: '#111827', accentColor: '#6B7280' },
//     bold: { headerColor: '#1E293B', accentColor: '#F59E0B' }
//   };

//   const fallback = defaults[template] || defaults.classic;

//   return {
//     companyName: String(value.companyName || 'Invoicefy').trim().slice(0, 80),
//     companyEmail: String(value.companyEmail || '').trim().slice(0, 120),
//     companyAddress: String(value.companyAddress || '').trim().slice(0, 240),
//     headerColor: /^#[0-9A-Fa-f]{6}$/.test(value.headerColor || '') ? value.headerColor : fallback.headerColor,
//     accentColor: /^#[0-9A-Fa-f]{6}$/.test(value.accentColor || '') ? value.accentColor : fallback.accentColor,
//     compactMode: Boolean(value.compactMode),
//     showRowDividers: value.showRowDividers !== false,
//   };
// };


const sanitizeTemplateSettings = (template, settings = {}) => {
  const value = settings && typeof settings === 'object' ? settings : {};
  const defaults = {
    classic: { headerColor: '#2563EB', accentColor: '#1d4ed8' },
    minimal: { headerColor: '#111827', accentColor: '#6B7280' },
    bold: { headerColor: '#1E293B', accentColor: '#F59E0B' }
  };

  const fallback = defaults[template] || defaults.classic;

  return {
    companyName: String(value.companyName || 'Invoicefy').trim().slice(0, 80),
    companyEmail: String(value.companyEmail || '').trim().slice(0, 120),
    companyPhone: String(value.companyPhone || '').trim().slice(0, 50),
    companyAddress: String(value.companyAddress || '').trim().slice(0, 240),
    logoUrl: /^\/uploads\/[A-Za-z0-9._-]+$/.test(value.logoUrl || '') ? value.logoUrl : '',
    customTemplateUrl: /^\/uploads\/[A-Za-z0-9._-]+$/.test(value.customTemplateUrl || '') ? value.customTemplateUrl : '',
    headerColor: /^#[0-9A-Fa-f]{6}$/.test(value.headerColor || '') ? value.headerColor : fallback.headerColor,
    accentColor: /^#[0-9A-Fa-f]{6}$/.test(value.accentColor || '') ? value.accentColor : fallback.accentColor,
    compactMode: Boolean(value.compactMode),
    contactsAtBottom: Boolean(value.contactsAtBottom),
    swapHeaderLayout: Boolean(value.swapHeaderLayout),
    showRowDividers: value.showRowDividers !== false,
  };
};

// ✅ Updated: GST auto calculation added inside existing logic
const calculateTotals = (items, taxPercent, discountPercent) => {
  const subtotal = items.reduce((sum, item) => {
    const qty  = Number(item.quantity)  || 0;
    const unit = Number(item.unitPrice) || 0;
    return sum + qty * unit;
  }, 0);

  const discountAmount = subtotal * (Number(discountPercent) || 0) / 100;
  const taxable        = subtotal - discountAmount;

  // GST auto calculation
  const taxAmount      = taxable * (Number(taxPercent) || 0) / 100;
  const total          = taxable + taxAmount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax:      Number(taxAmount.toFixed(2)),
    total:    Number(total.toFixed(2))
  };
};

// ── CREATE ─────────────────────────────────────────────────────────────
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientId,
      items,
      tax = 0,
      discount = 0,
      template = 'classic',
      watermark = '',
      documentType = 'invoice',

      // ✅ NEW FIELDS
      invoiceDate,
      yourGST,
      clientGST,
      bankDetails,
      disclaimer,
      templateSettings
    } = req.body;

    const businessId = req.user.businessId;

    if (!clientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'clientId and non-empty items are required'
      });
    }

    const safeTemplate = VALID_TEMPLATES.includes(template) ? template : 'classic';
    const safeDocumentType = VALID_DOCUMENT_TYPES.includes(documentType) ? documentType : 'invoice';
    const safeTemplateSettings = sanitizeTemplateSettings(safeTemplate, templateSettings);

    const client = await Client.findOne({ where: { id: clientId, businessId } });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found for this business'
      });
    }

    // ✅ Add HSN code safely inside items
    const updatedItems = items.map(item => ({
      ...item,
      hsn: item.hsn || ''
    }));

    const totals = calculateTotals(updatedItems, tax, discount);
    const invoicePayload = {
      businessId,
      clientId,

      // ✅ Added Fields (No structure change)
      invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
      yourGST: (yourGST || '').trim(),
      clientGST: (clientGST || client.gstNumber || '').trim(),
      bankDetails: bankDetails && Object.values(bankDetails).some((val) => String(val || '').trim()) ? bankDetails : null,
      disclaimer:
        disclaimer ||
        "Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.",

      items: updatedItems,

      subtotal: totals.subtotal,
      tax: totals.tax,
      discount,
      total: totals.total,

      status: (watermark && watermark.trim().toUpperCase() === 'PAID') ? 'Paid' : 'Unpaid',
      documentType: safeDocumentType,
      template: safeTemplate,
      watermark: watermark.trim(),
      templateSettings: safeTemplateSettings
    };

    const numberingScopes = [businessId, null];

    for (const scopeBusinessId of numberingScopes) {
      try {
        const invoice = await Invoice.create({
          ...invoicePayload,
          invoiceNumber: await getNextDocumentNumber(scopeBusinessId, safeDocumentType),
        });

        return res.status(201).json({ success: true, invoice });
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') {
          throw err;
        }

      }
    }

    return res.status(409).json({
      success: false,
      message: 'Unable to allocate a unique invoice number right now. Please try again.'
    });

  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Invoice number already exists for this business. Please try again.'
      });
    }

    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE ONE ─────────────────────────────────────────────────────────────
exports.updateInvoice = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const invoiceId = req.params.id;

    const invoice = await Invoice.findOne({ where: { id: invoiceId, businessId } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const {
      clientId, items, tax = 0, discount = 0, disclaimer,
      invoiceDate, yourGST, clientGST, bankDetails,
      documentType, template, watermark = '', templateSettings
    } = req.body;

    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const client = await Client.findOne({ where: { id: clientId, businessId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const safeDocumentType = ['invoice', 'quotation'].includes(documentType) ? documentType : 'invoice';
    const safeTemplate = ['classic', 'minimal', 'bold', 'custom'].includes(template) ? template : 'classic';

    const updatedItems = items.map((item) => ({
      description: item.description,
      hsn: item.hsn || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    }));

    const totals = calculateTotals(updatedItems, tax, discount);

    await invoice.update({
      clientId,
      invoiceDate: invoiceDate || invoice.invoiceDate,
      yourGST: (yourGST || '').trim(),
      clientGST: (clientGST || client.gstNumber || '').trim(),
      bankDetails: bankDetails && Object.values(bankDetails).some((val) => String(val || '').trim()) ? bankDetails : null,
      disclaimer: disclaimer || invoice.disclaimer,
      items: updatedItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount,
      total: totals.total,
      status: (watermark && watermark.trim().toUpperCase() === 'PAID') ? 'Paid' : invoice.status,
      documentType: safeDocumentType,
      template: safeTemplate,
      watermark: watermark.trim(),
      templateSettings: templateSettings || {}
    });

    return res.status(200).json({ success: true, invoice });
  } catch (err) {
    console.error("UPDATE INVOICE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE ─────────────────────────────────────────────────────────────
exports.getInvoice = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, businessId }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const client = await Client.findOne({
      where: { id: invoice.clientId, businessId }
    });

    return res.status(200).json({ success: true, invoice, client });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE STATUS ──────────────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { invoiceId, status } = req.body;

    if (!invoiceId || !['Paid', 'Unpaid', 'Overdue'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'invoiceId and valid status are required'
      });
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

// ── DOWNLOAD PDF ───────────────────────────────────────────────────────
exports.downloadInvoice = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const invoiceId  = req.query.id;

    const invoice = await Invoice.findOne({ where: { id: invoiceId, businessId } });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const client = await Client.findOne({
      where: { id: invoice.clientId, businessId }
    });
    
    const Business = require('../businesses/business.model');
    const business = await Business.findByPk(businessId);

    const forwardedProto = req.get('x-forwarded-proto');
    const assetBaseUrl = `${forwardedProto || req.protocol}://${req.get('host')}`;

    // Pass business profile template URL and Logo as fallback if invoice lack it
    if (!invoice.templateSettings) invoice.templateSettings = {};
    invoice.templateSettings = {
      ...invoice.templateSettings,
      companyName: invoice.templateSettings.companyName || business.name,
      companyEmail: invoice.templateSettings.companyEmail || business.email,
      companyAddress: invoice.templateSettings.companyAddress || business.address,
      companyPhone: invoice.templateSettings.companyPhone || business.phone,
      customTemplateUrl: invoice.templateSettings.customTemplateUrl || business.customTemplateUrl,
      logoUrl: invoice.templateSettings.logoUrl || business.logoUrl
    };

    return await generatePDF(
      invoice,
      client,
      res,
      invoice.template || 'classic',
      invoice.watermark || '',
      assetBaseUrl
    );

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};