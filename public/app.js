const CROPS = [
  "Tomato", "Hot pepper", "Okra", "Maize", "Beans",
  "Ugu (fluted pumpkin)", "Bitter leaf", "Amaranth", "Onion", "Watermelon",
  "Surprise me"
];

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const $ = (id) => document.getElementById(id);

function chip(label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = label;
  b.setAttribute("aria-pressed", "false");
  b.addEventListener("click", () =>
    b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"));
  return b;
}

function selectedCrops() {
  return [...document.querySelectorAll(".chip[aria-pressed='true']")]
    .map((c) => c.textContent);
}

function pillClass(action) {
  const a = String(action || "").toLowerCase();
  if (a.includes("sow")) return "sow";
  if (a.includes("transplant")) return "transplant";
  if (a.includes("harvest")) return "harvest";
  return "care";
}

async function init() {
  const box = $("crop-chips");
  CROPS.forEach((c) => box.appendChild(chip(c)));

  try {
    const r = await fetch("/api/models");
    const { models } = await r.json();
    if (!models.length) {
      showStatus("error", "No AI model is configured on the server. " +
        "Set GROQ_API_KEY (free at console.groq.com) and restart.");
      return;
    }
    $("model-name").textContent = models[0].label;
  } catch (e) {
    // Leave the default text; the plan request will surface any real problem.
  }
}

function showStatus(kind, msg) {
  const s = $("status");
  s.className = kind;
  s.textContent = msg;
  s.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideStatus() { $("status").className = "hidden"; }

function render(plan, modelLabel) {
  $("model-badge").textContent = modelLabel || "";
  $("foot-model").textContent = modelLabel || "open-weight AI";
  $("summary").textContent = plan.summary || "";

  const cal = $("calendar");
  cal.innerHTML = "";
  (plan.calendar || []).forEach((m) => {
    const div = document.createElement("div");
    div.className = "month";
    const tasks = (m.tasks || []).map((t) => `
      <div class="task">
        <span class="pill ${pillClass(t.action)}">${esc(t.action)}</span>
        <span class="crop">${esc(t.crop)}</span>
        <span class="detail">${esc(t.detail)}</span>
      </div>`).join("");
    div.innerHTML = `<h3>${esc(m.month)}</h3>${tasks || "<p>No tasks.</p>"}`;
    cal.appendChild(div);
  });

  $("companions").innerHTML = (plan.companions || []).map((c) =>
    `<li><strong>${esc(c.crop)}</strong>. Good with ${esc((c.good_with || []).join(", ")) || "none"}; ` +
    `avoid ${esc((c.avoid || []).join(", ")) || "nothing"}. <span style="color:#6b7263">${esc(c.why || "")}</span></li>`
  ).join("");

  const care = plan.care || {};
  $("care").innerHTML = ["watering", "soil", "pests"].map((k) =>
    care[k] ? `<dt>${esc(k[0].toUpperCase() + k.slice(1))}</dt><dd>${esc(care[k])}</dd>` : ""
  ).join("");

  $("tips").innerHTML = (plan.tips || []).map((t) => `<li>${esc(t)}</li>`).join("");

  $("form-card").classList.add("hidden");
  hideStatus();
  $("results").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("plan-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    location: fd.get("location"),
    space: fd.get("space"),
    plotSize: fd.get("plotSize"),
    sunlight: fd.get("sunlight"),
    soil: fd.get("soil"),
    crops: selectedCrops(),
  };
  const btn = $("go-btn");
  btn.disabled = true;
  showStatus("loading", "🌱 Shuka is planning your year... (the model is thinking)");
  try {
    const r = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Something went wrong.");
    render(data.plan, data.model);
  } catch (err) {
    showStatus("error", err.message);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("again-btn").addEventListener("click", () => {
  $("results").classList.add("hidden");
  $("form-card").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

init();
