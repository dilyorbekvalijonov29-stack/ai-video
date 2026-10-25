const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Токенни тозалаш: бўш жой, қўштирнoқ ва "Bearer" сўзини олиб ташлайди
const TOKEN = (process.env.REPLICATE_API_TOKEN || "")
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/^Bearer\s+/i, "");

const MODEL = "wan-video/wan-2.2-5b-fast";
const API = "https://api.replicate.com/v1";

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Токеннинг ўзини кўрсатмайди, фақат ҳолатини айтади
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    tokenSet: Boolean(TOKEN),
    tokenLooksValid: TOKEN.startsWith("r8_") && TOKEN.length >= 30,
    port: PORT,
  });
});

app.post("/api/generate", async (req, res) => {
  if (!TOKEN) {
    return res.status(500).json({
      error: "Render Environment’да REPLICATE_API_TOKEN йўқ.",
    });
  }

  const prompt = String((req.body && req.body.prompt) || "").trim();
  if (prompt.length < 5 || prompt.length > 1000) {
    return res.status(400).json({
      error: "Видео ғоясини 5–1000 белги билан ёзинг.",
    });
  }

  try {
    const response = await fetch(`${API}/models/${MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: { prompt } }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Replicate API хатоси:", response.status, data);
      return res.status(response.status).json({
        error:
          data.detail || data.title || `Replicate API хатоси: ${response.status}`,
      });
    }

    res.json({ id: data.id, status: data.status });
  } catch (error) {
    console.error("Сервер хатоси:", error.message);
    res.status(500).json({
      error: "Сервер хатоси. Render Logs’ни текширинг.",
    });
  }
});

app.get("/api/status/:id", async (req, res) => {
  if (!TOKEN) {
    return res.status(500).json({
      error: "REPLICATE_API_TOKEN созланмаган.",
    });
  }

  try {
    const response = await fetch(
      `${API}/predictions/${encodeURIComponent(req.params.id)}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Status API хатоси:", response.status, data);
      return res.status(response.status).json({
        error:
          data.detail || data.title || `Видео ҳолати хатоси: ${response.status}`,
      });
    }

    let output = data.output;
    if (Array.isArray(output)) output = output[0];

    res.json({
      status: data.status,
      output: output || null,
      error: data.error || null,
    });
  } catch (error) {
    console.error("Status текшириш хатоси:", error.message);
    res.status(500).json({
      error: "Видео ҳолатини текширишда сервер хатоси.",
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Сервер ишга тушди:", PORT);
});
