const Client = require('./client.model');

exports.createClient = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { name, email, phone, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'name and email are required' });
    }

    const client = await Client.create({
      businessId,
      name,
      email,
      phone,
      address
    });

    return res.status(201).json({ success: true, client });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const clients = await Client.findAll({
      where: { businessId },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ success: true, clients });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
