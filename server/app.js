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

// CORS — allow the React dev server to call the API
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://invoicefy-steel.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

Business.hasMany(User, { foreignKey: 'businessId', onDelete: 'CASCADE' });
User.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Client, { foreignKey: 'businessId', onDelete: 'CASCADE' });
Client.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Invoice, { foreignKey: 'businessId', onDelete: 'CASCADE' });
Invoice.belongsTo(Business, { foreignKey: 'businessId' });

Client.hasMany(Invoice, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Invoice.belongsTo(Client, { foreignKey: 'clientId' });

app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'Invoicefy API up' }));

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  return next();
});

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => sequelize.sync())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection/sync failed:', err);
    process.exit(1);
  });
