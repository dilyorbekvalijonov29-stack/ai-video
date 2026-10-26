
const express = require("express");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 10000;
const TOKEN = (process.env.REPLICATE_API_TOKEN || "").trim();

app.get("/", (req, res) => {
  res.send("AI Video Maker server is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    tokenSet: Boolean(TOKEN),
    tokenLooksValid: TOKEN.length >= 30,
    tokenLength: TOKEN.length,
    port: PORT
  });
});

app.post("/api/video", async (req, res) => {
  try {
    if (!TOKEN) {
      return res.status(500).json({
        error: "REPLICATE_API_TOKEN is missing in Render Environment"
      });
    }

    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Please provide a video prompt"
      });
    }

    const version = process.env.REPLICATE_MODEL_VERSION;

    if (!version) {
      return res.status(500).json({
        error: "REPLICATE_MODEL_VERSION is missing in Render Environment"
      });
    }

    const response = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          version,
          input: { prompt }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Replicate API error:", response.status, data);

      return res.status(response.status).json({
        error: data.detail || data.title || "Replicate API request failed",
        status: response.status
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Video request failed:", error.message);

    return res.status(500).json({
      error: "Video request failed",
      details: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Video Maker server running on port ${PORT}`);
});
