const express = require("express");
const path = require("path");
const { availableModels, runPlan } = require("./lib/shuka");

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---- model registry: a provider is listed only when its key is set ----
app.get("/api/models", (req, res) => {
  res.json({ models: availableModels() });
});

app.post("/api/plan", async (req, res) => {
  try {
    const { plan, modelLabel } = await runPlan(req.body || {});
    res.json({ plan, model: modelLabel });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || "internal", message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Shuka listening on http://localhost:${PORT}`));
}
module.exports = app;
