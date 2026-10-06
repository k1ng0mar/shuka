// Hugging Face Inference provider: serves open-weight models including Gemma.
// Needs HF_TOKEN. Model override via HF_MODEL. Optional: only registered
// when HF_TOKEN is set, so the app runs fine on Groq alone.

async function complete({ system, user }, { model, maxTokens = 6000 } = {}) {
  const token = process.env.HF_TOKEN;
  if (!token) throw Object.assign(new Error("HF_TOKEN is not set"), { code: "NO_KEY" });
  const chosen = model || process.env.HF_MODEL || "google/gemma-2-9b-it";

  const prompt = `${system}\n\nUser request:\n${user}\n\nReply with STRICT JSON only.`;
  const res = await fetch(`https://api-inference.huggingface.co/models/${chosen}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: Math.min(maxTokens, 4000), temperature: 0.7, return_full_text: false },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Hugging Face error ${res.status}: ${body.slice(0, 200)}`), {
      code: "PROVIDER_ERROR",
      status: res.status,
    });
  }
  const data = await res.json();
  const raw = Array.isArray(data) ? data[0].generated_text : data.generated_text || "";
  return { text: stripFences(raw), model: chosen, provider: "huggingface" };
}

function stripFences(t) {
  return String(t || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

module.exports = { complete, id: "huggingface", label: "Gemma 2 9B (Hugging Face)" };
