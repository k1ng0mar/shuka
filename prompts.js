// Builds the system + user prompts for the planting agent.
// The model must reply with STRICT JSON, no markdown, no commentary.

const SCHEMA = `{
  "summary": "2-3 sentence overview of the plan",
  "calendar": [
    { "month": "January",
      "tasks": [ { "crop": "Tomato", "action": "sow|transplant|harvest|care", "detail": "one-line instruction" } ] }
  ],
  "companions": [ { "crop": "Tomato", "good_with": ["Basil"], "avoid": ["Maize"], "why": "one line" } ],
  "care": { "watering": "...", "soil": "...", "pests": "..." },
  "tips": ["short practical tip", "..."]
}`;

function buildPlantingPrompt(input) {
  const crops = (input.crops && input.crops.length ? input.crops : ["surprise me"]).join(", ");
  const system = [
    "You are Shuka, an expert advisor for West African smallholder and urban growers.",
    "You know West African growing seasons: the rainy season runs roughly May to October",
    "and the dry season November to April (adapt if the user's location differs).",
    "You give practical, low-cost advice suitable for someone without expensive equipment.",
    "Reply with STRICT JSON only, no markdown fences, no commentary, exactly this shape:",
    SCHEMA,
    "Rules: 12 calendar months, January to December, in order. Every month gets at least",
    "one task and at most three. Keep each detail to one line. Prefer crops that suit the user's space and",
    "sunlight. If crops say 'surprise me', pick a sensible mix of vegetables and staples",
    "for the region.",
  ].join("\n");

  const user = [
    `Location: ${input.location || "Kaduna, Nigeria"}`,
    `Growing space: ${input.space || "backyard"}`,
    input.plotSize ? `Plot size: ${input.plotSize}` : null,
    `Sunlight: ${input.sunlight || "full sun"}`,
    `Soil: ${input.soil || "unknown"}`,
    `Crops: ${crops}`,
  ].filter(Boolean).join("\n");

  return { system, user };
}

module.exports = { buildPlantingPrompt };
