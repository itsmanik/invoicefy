const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customTemplateUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'businesses',
  timestamps: true
});

module.exports = Business;
