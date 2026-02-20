const Business = require('./business.model');

exports.getBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findByPk(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    return res.status(200).json({ success: true, business });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
