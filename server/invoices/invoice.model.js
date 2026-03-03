// server/invoices/invoice.model.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  businessId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  // ✅ NEW: Invoice Date
  invoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ✅ NEW: GST Numbers
  yourGST: {
    type: DataTypes.STRING,
    allowNull: true
  },

  clientGST: {
    type: DataTypes.STRING,
    allowNull: true
  },

  items: {
    type: DataTypes.JSON,
    allowNull: false
  },

  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  // ORIGINAL tax field (keep this)
  tax: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },

  discount: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },

  total: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  status: {
    type: DataTypes.ENUM('Paid', 'Unpaid', 'Overdue'),
    defaultValue: 'Unpaid'
  },

  // ✅ NEW: Bank Details (JSON format)
  bankDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },

  // ✅ NEW: 45 Day Disclaimer
  disclaimer: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue:
      "Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days."
  },

  // ORIGINAL template & watermark
  template: {
    type: DataTypes.STRING,
    defaultValue: 'classic',
    allowNull: false
  },

  watermark: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  }

}, {
  tableName: 'invoices',
  timestamps: true
});

module.exports = Invoice;