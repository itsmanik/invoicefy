const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Database
const sequelize = require('./config/database');

// Import models
require('./clients/client.model');
require('./invoices/invoice.model');

// Sync tables
sequelize.sync({ alter: true })
  .then(() => console.log('✅ MySQL tables synced'))
  .catch(err => console.error('❌ DB sync error:', err));

// Routes
const clientRoutes  = require('./clients/client.routes');
const invoiceRoutes = require('./invoices/invoice.routes');

app.use('/client',  clientRoutes);
app.use('/invoice', invoiceRoutes);

// Start server
app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});