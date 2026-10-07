// Shared core: model registry + plan generation.
// Used by server.js (local dev / Render-style hosts) and by api/*.js (Vercel).
const { buildPlantingPrompt } = require("../prompts");
const groq = require("../providers/groq");
const huggingface = require("../providers/huggingface");

const PROVIDERS = { groq, huggingface };

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

function fail(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}

async function runPlan(input) {
  const models = availableModels();
  if (!models.length) {
    throw fail(
      "no_model_provider", 503,
      "No model provider configured. Set GROQ_API_KEY (free at console.groq.com) and restart."
    );
  }
  if (input.crops && !Array.isArray(input.crops)) {
    throw fail("bad_request", 400, "crops must be an array");
  }

  const wanted = models.find((m) => m.id === input.modelId) || models[0];
  const provider = PROVIDERS[wanted.id];

  try {
    const { system, user } = buildPlantingPrompt(input);
    const { text } = await provider.complete({ system, user }, { model: wanted.model });
    let plan;
    try {
      plan = JSON.parse(text);
    } catch (e) {
      throw fail("bad_model_output", 502, "The model returned something that was not valid JSON. Try again.");
    }
    if (!plan.calendar || !Array.isArray(plan.calendar)) {
      throw fail("bad_model_output", 502, "The model returned an incomplete plan. Try again.");
    }
    return { plan, modelLabel: wanted.label };
  } catch (err) {
    if (err.code === "NO_KEY") throw fail("no_model_provider", 503, err.message);
    if (err.status) throw err;
    console.error("plan failed:", err.message);
    throw fail("provider_error", 502, "The model call failed. Try again in a moment.");
  }
}

module.exports = { availableModels, runPlan };
