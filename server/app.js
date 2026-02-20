require('dotenv').config();
const express = require('express');
const path = require('path');

const sequelize = require('./config/database');

const User = require('./auth/user.model');
const Business = require('./businesses/business.model');
const Client = require('./clients/client.model');
const Invoice = require('./invoices/invoice.model');

const authRoutes = require('./auth/auth.routes');
const businessRoutes = require('./businesses/business.routes');
const clientRoutes = require('./clients/client.routes');
const invoiceRoutes = require('./invoices/invoice.routes');
const analyticsRoutes = require('./analytics/analytics.routes');

const app = express();

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

Business.hasMany(User, { foreignKey: 'businessId', onDelete: 'CASCADE' });
User.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Client, { foreignKey: 'businessId', onDelete: 'CASCADE' });
Client.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Invoice, { foreignKey: 'businessId', onDelete: 'CASCADE' });
Invoice.belongsTo(Business, { foreignKey: 'businessId' });

Client.hasMany(Invoice, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Invoice.belongsTo(Client, { foreignKey: 'clientId' });

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'Invoicefy API up' }));

app.use('/auth', authRoutes);
app.use('/business', businessRoutes);
app.use('/client', clientRoutes);
app.use('/invoice', invoiceRoutes);
app.use('/analytics', analyticsRoutes);

app.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  return next();
});

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => sequelize.sync({ alter: true }))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection/sync failed:', err.message);
    process.exit(1);
  });
