const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.use(express.static(path.join(__dirname, "public")));

const diseases = JSON.parse(fs.readFileSync(path.join(__dirname, "data/diseases.json"), "utf8"));
const medicines = JSON.parse(fs.readFileSync(path.join(__dirname, "data/medicines.json"), "utf8"));

let appointments = [];
let appointmentId = 1;

const normalize = (v = "") => String(v).toLowerCase().trim();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "MediMitra API", time: new Date().toISOString() });
});

app.get("/api/stats", (req, res) => {
  res.json({
    diseases: diseases.length,
    medicines: medicines.length,
    appointments: appointments.length
  });
});

app.get("/api/diseases", (req, res) => {
  const q = normalize(req.query.q);
  const category = normalize(req.query.category);
  let result = diseases;

  if (q) {
    result = result.filter(d =>
      normalize(d.name).includes(q) ||
      normalize(d.category).includes(q) ||
      d.symptoms.some(s => normalize(s).includes(q))
    );
  }
  if (category && category !== "all") {
    result = result.filter(d => normalize(d.category) === category);
  }
  res.json(result);
});

app.get("/api/diseases/:id", (req, res) => {
  const item = diseases.find(d => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Disease not found" });
  res.json(item);
});

app.get("/api/medicines", (req, res) => {
  const q = normalize(req.query.q);
  const category = normalize(req.query.category);
  let result = medicines;

  if (q) {
    result = result.filter(m =>
      normalize(m.name).includes(q) ||
      normalize(m.activeIngredient).includes(q) ||
      normalize(m.category).includes(q) ||
      normalize(m.commonUses).includes(q)
    );
  }
  if (category && category !== "all") {
    result = result.filter(m => normalize(m.category) === category);
  }
  res.json(result);
});

app.get("/api/medicines/:id", (req, res) => {
  const item = medicines.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Medicine not found" });
  res.json(item);
});

app.get("/api/search", (req, res) => {
  const q = normalize(req.query.q);
  if (!q) return res.json({ diseases: [], medicines: [] });

  const diseaseResults = diseases.filter(d =>
    normalize(d.name).includes(q) ||
    d.symptoms.some(s => normalize(s).includes(q)) ||
    normalize(d.overview).includes(q)
  ).slice(0, 10);

  const medicineResults = medicines.filter(m =>
    normalize(m.name).includes(q) ||
    normalize(m.activeIngredient).includes(q) ||
    normalize(m.commonUses).includes(q)
  ).slice(0, 10);

  res.json({ diseases: diseaseResults, medicines: medicineResults });
});

function findBestMatch(message) {
  const q = normalize(message);
  const all = [
    ...diseases.map(x => ({ type: "disease", item: x })),
    ...medicines.map(x => ({ type: "medicine", item: x }))
  ];

  // Exact / phrase match first
  let found = all.find(x => q.includes(normalize(x.item.name)));
  if (found) return found;

  // Token scoring
  const tokens = q.split(/[^a-z0-9]+/).filter(t => t.length > 2);
  let best = null;
  let bestScore = 0;
  for (const candidate of all) {
    const text = normalize(
      candidate.item.name + " " +
      (candidate.item.category || "") + " " +
      (candidate.item.commonUses || "") + " " +
      (candidate.item.overview || "") + " " +
      (candidate.item.symptoms || []).join(" ")
    );
    let score = 0;
    for (const token of tokens) if (text.includes(token)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore > 0 ? best : null;
}

app.post("/api/chat", (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Message is required" });

  const q = normalize(message);
  const urgentWords = [
    "chest pain", "can't breathe", "cannot breathe", "severe bleeding",
    "unconscious", "fainted", "stroke", "suicide", "overdose"
  ];
  const urgent = urgentWords.some(w => q.includes(w));

  if (urgent) {
    return res.json({
      type: "safety",
      title: "Please seek urgent medical help",
      answer: "Some symptoms can be emergencies. Please contact local emergency medical services or go to the nearest emergency department. MediMitra cannot assess an emergency remotely.",
      matched: null
    });
  }

  const match = findBestMatch(message);
  if (!match) {
    return res.json({
      type: "general",
      title: "I can help you search",
      answer: "Try asking about a disease or medicine by name, or describe a symptom. For example: “What is diabetes?” or “Tell me about paracetamol.”",
      matched: null
    });
  }

  if (match.type === "disease") {
    const d = match.item;
    return res.json({
      type: "disease",
      title: d.name,
      answer: `${d.name}: ${d.overview} Common symptoms include ${d.symptoms.join(", ")}. This is general information, not a diagnosis.`,
      matched: d
    });
  }

  const m = match.item;
  return res.json({
    type: "medicine",
    title: m.name,
    answer: `${m.name} contains/represents ${m.activeIngredient}. Common use: ${m.commonUses}. Do not start, stop, or change a medicine based only on this chat.`,
    matched: m
  });
});

app.get("/api/appointments", (req, res) => {
  res.json(appointments);
});

app.post("/api/appointments", (req, res) => {
  const { name, phone, date, time, reason } = req.body;
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ error: "Name, phone, date and time are required." });
  }

  const appt = {
    id: appointmentId++,
    name: String(name).trim(),
    phone: String(phone).trim(),
    date,
    time,
    reason: String(reason || "General consultation").trim(),
    createdAt: new Date().toISOString()
  };

  appointments.push(appt);
  res.status(201).json(appt);
});

app.delete("/api/appointments/:id", (req, res) => {
  const id = Number(req.params.id);
  const before = appointments.length;
  appointments = appointments.filter(a => a.id !== id);
  if (appointments.length === before) return res.status(404).json({ error: "Appointment not found" });
  res.json({ ok: true });
});

// React SPA fallback after API routes.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`MediMitra running at http://localhost:${PORT}`);
});

