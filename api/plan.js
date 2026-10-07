// POST /api/plan (Vercel serverless function).
const { runPlan } = require("../lib/shuka");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const { plan, modelLabel } = await runPlan(req.body || {});
    res.json({ plan, model: modelLabel });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || "internal", message: err.message });
  }
};

// Model calls can take several seconds; give the function headroom.
module.exports.config = { maxDuration: 60 };
