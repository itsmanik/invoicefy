const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Items are stored as JSON inside the invoice table (simpler for now)
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
    unique: true
  },
  items: {
    type: DataTypes.JSON,  // stores the items array as JSON in MySQL
    allowNull: false
  },
  tax: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.FLOAT
  },
  total: {
    type: DataTypes.FLOAT
  },
  status: {
    type: DataTypes.ENUM('Unpaid', 'Paid', 'Overdue'),
    defaultValue: 'Unpaid'
  }
}, {
  tableName: 'invoices',
  timestamps: true
});

module.exports = Invoice;