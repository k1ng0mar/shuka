const express = require("express");
const path = require("path");
const { buildPlantingPrompt } = require("./prompts");
const groq = require("./providers/groq");
const huggingface = require("./providers/huggingface");

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---- model registry: a provider is listed only when its key is set ----
function availableModels() {
  const models = [];
  if (process.env.GROQ_API_KEY) {
    models.push({
      id: "groq",
      label: groq.label,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      provider: "groq",
    });
  }
  if (process.env.HF_TOKEN) {
    models.push({
      id: "huggingface",
      label: huggingface.label,
      model: process.env.HF_MODEL || "google/gemma-2-9b-it",
      provider: "huggingface",
    });
  }
  return models;
}

const PROVIDERS = { groq, huggingface };

app.get("/api/models", (req, res) => {
  res.json({ models: availableModels() });
});

app.post("/api/plan", async (req, res) => {
  const input = req.body || {};
  if (input.crops && !Array.isArray(input.crops)) {
    return res.status(400).json({ error: "bad_request", message: "crops must be an array" });
  }

  const models = availableModels();
  if (!models.length) {
    return res.status(503).json({
      error: "no_model_provider",
      message: "No model provider configured. Set GROQ_API_KEY (free at console.groq.com) and restart.",
    });
  }

  const wanted = models.find((m) => m.id === input.modelId) || models[0];
  const provider = PROVIDERS[wanted.id];

  try {
    const { system, user } = buildPlantingPrompt(input);
    const { text, model } = await provider.complete(
      { system, user },
      { model: wanted.model }
    );
    let plan;
    try {
      plan = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({
        error: "bad_model_output",
        message: "The model returned something that was not valid JSON. Try again.",
      });
    }
    if (!plan.calendar || !Array.isArray(plan.calendar)) {
      return res.status(502).json({
        error: "bad_model_output",
        message: "The model returned an incomplete plan. Try again.",
      });
    }
    res.json({ plan, model: wanted.label });
  } catch (err) {
    if (err.code === "NO_KEY") {
      return res.status(503).json({ error: "no_model_provider", message: err.message });
    }
    console.error("plan failed:", err.message);
    res.status(502).json({ error: "provider_error", message: "The model call failed. Try again in a moment." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shuka listening on http://localhost:${PORT}`));
