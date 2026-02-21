const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user.model');
const Business = require('../businesses/business.model');

const makeToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    businessId: user.businessId,
    role: user.role
  },
  process.env.JWT_SECRET || 'invoicefy-secret',
  { expiresIn: '7d' }
);

exports.register = async (req, res) => {
  try {
    const {
      ownerName,
      email,
      password,
      businessName,
      gstNumber,
      address
    } = req.body;

    if (!ownerName || !email || !password || !businessName || !gstNumber || !address) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const existingBusiness = await Business.findOne({ where: { gstNumber } });
    if (existingBusiness) {
      return res.status(409).json({ success: false, message: 'GST Number is already registered' });
    }

    const logoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const business = await Business.create({
      name: businessName,
      gstNumber,
      address,
      logoUrl
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      businessId: business.id,
      name: ownerName,
      email,
      passwordHash,
      role: 'Business Owner'
    });

    const token = makeToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessId: user.businessId,
        role: user.role
      },
      business
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const business = await Business.findByPk(user.businessId);
    const token = makeToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessId: user.businessId,
        role: user.role
      },
      business
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
