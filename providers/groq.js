// Groq provider: OpenAI-compatible chat completions for open-weight models.
// Needs GROQ_API_KEY. Model override via GROQ_MODEL.

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function complete({ system, user }, { model, maxTokens = 10000 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw Object.assign(new Error("GROQ_API_KEY is not set"), { code: "NO_KEY" });
  const chosen = model || process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: chosen,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      // Reasoning models can burn the token budget "thinking" and get cut off
      // mid-JSON, which Groq rejects (json_validate_failed). Keep it lean.
      reasoning_effort: "low",
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Groq error ${res.status}: ${body.slice(0, 200)}`), {
      code: "PROVIDER_ERROR",
      status: res.status,
    });
  }
  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content : "";
  return { text: stripFences(text), model: chosen, provider: "groq" };
}

function stripFences(t) {
  return String(t || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

module.exports = { complete, id: "groq", label: "GPT-OSS 120B (Groq)" };
