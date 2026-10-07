// GET /api/models (Vercel serverless function).
const { availableModels } = require("../lib/shuka");

module.exports = (req, res) => {
  res.json({ models: availableModels() });
};
