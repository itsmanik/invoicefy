const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });
const sequelize = require('./server/config/database');
const User = require('./server/auth/user.model');
const Business = require('./server/businesses/business.model');
const Client = require('./server/clients/client.model');
const Invoice = require('./server/invoices/invoice.model');

Business.hasMany(User, { foreignKey: 'businessId', onDelete: 'CASCADE' });
User.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Client, { foreignKey: 'businessId', onDelete: 'CASCADE' });
Client.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Invoice, { foreignKey: 'businessId', onDelete: 'CASCADE' });
Invoice.belongsTo(Business, { foreignKey: 'businessId' });

Client.hasMany(Invoice, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Invoice.belongsTo(Client, { foreignKey: 'clientId' });

sequelize.sync({  }).then(() => {
  console.log('Database synced successfully with alter: true');
  process.exit(0);
}).catch(console.error);
