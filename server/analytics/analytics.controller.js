const { Op } = require('sequelize');
const Invoice = require('../invoices/invoice.model');

exports.getDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const invoices = await Invoice.findAll({ where: { businessId } });

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) => inv.status === 'Paid').length;
    const unpaidInvoices = invoices.filter((inv) => inv.status === 'Unpaid').length;
    const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue').length;

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'Paid')
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    const outstandingAmount = invoices
      .filter((inv) => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    const last30DaysCount = await Invoice.count({
      where: {
        businessId,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return res.status(200).json({
      success: true,
      analytics: {
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        outstandingAmount: Number(outstandingAmount.toFixed(2)),
        invoicesCreatedLast30Days: last30DaysCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
