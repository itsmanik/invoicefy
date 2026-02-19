const Client = require('./client.model');

// POST /client/create
exports.createClient = async (req, res) => {
  try {
    const { businessId, name, email, phone, address } = req.body;

    const client = await Client.create({ businessId, name, email, phone, address });
    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /client/all
exports.getAllClients = async (req, res) => {
  try {
    const { businessId } = req.query;
    const clients = await Client.findAll({ where: { businessId } });
    res.status(200).json({ success: true, clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};