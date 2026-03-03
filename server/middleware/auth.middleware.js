const jwt = require('jsonwebtoken');
const User = require('../auth/user.model');
const Business = require('../businesses/business.model');

exports.requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing bearer token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'invoicefy-secret');

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists. Please log in again.' });
    }

    const business = await Business.findByPk(user.businessId);
    if (!business) {
      return res.status(401).json({ success: false, message: 'Business profile missing. Please re-register or contact support.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    };

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
