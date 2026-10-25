
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const API = "https://api.replicate.com/v1";
const MODEL = "wan-video/wan-2.2-5b-fast";

function getToken() {
  return (process.env.REPLICATE_API_TOKEN || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "");
}

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    tokenSet: Boolean(getToken()),
    port: PORT
  });
});

// Vaqtinchalik xavfsiz tekshiruv.
// Tokenning o'zi hech qachon javobda chiqarilmaydi.
app.get("/api/debug-auth", async (req, res) => {
  const raw = process.env.REPLICATE_API_TOKEN || "";
  const token = getToken();

  const result = {
    tokenSet: Boolean(token),
    length: raw.length,
    trimmedLength: raw.trim().length,
    startsWith_r8: token.startsWith("r8_"),
    hasWhitespace: /\s/.test(raw),
    hasQuotes: /["']/.test(raw)
  };

  if (!token) {
    result.replicateStatus = "NO_TOKEN";
    return res.json(result);
  }

  try {
    const response = await fetch(`${API}/account`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    result.replicateStatus = response.status;
    res.json(result);
  } catch (error) {
    console.error("Auth tekshirish xatosi:", error.message);
    res.status(500).json({
      error: "Tekshiruv vaqtida server xatosi."
    });
  }
});

app.post("/api/generate", async (req, res) => {
  const token = getToken();

  if (!token) {
    return res.status(500).json({
      error: "Render'da REPLICATE_API_TOKEN sozlanmagan."
    });
  }

  const prompt = String(req.body.prompt || "").trim();

  if (prompt.length < 5 || prompt.length > 1000) {
    return res.status(400).json({
      error: "Video g'oyasi 5 dan 1000 belgigacha bo'lishi kerak."
    });
  }

  try {
    const response = await fetch(
      `${API}/models/${MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: { prompt }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Replicate xatosi:", response.status, data);
      return res.status(502).json({
        error: data.detail || data.title ||
          `Replicate API xatosi: ${response.status}`
      });
    }

    res.json({
      id: data.id,
      status: data.status
    });
  } catch (error) {
    console.error("Generate xatosi:", error.message);
    res.status(500).json({
      error: "Server xatosi. Render Logs'ni tekshiring."
    });
  }
});

app.get("/api/status/:id", async (req, res) => {
  const token = getToken();

  if (!token) {
    return res.status(500).json({
      error: "API token sozlanmagan."
    });
  }

  try {
    const response = await fetch(
      `${API}/predictions/${encodeURIComponent(req.params.id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Status xatosi:", response.status, data);
      return res.status(502).json({
        error: data.detail || data.title ||
          `Video holati xatosi: ${response.status}`
      });
    }

    let output = data.output;
    if (Array.isArray(output)) output = output[0];

    res.json({
      status: data.status,
      output: output || null,
      error: data.error || null
    });
  } catch (error) {
    console.error("Status tekshirish xatosi:", error.message);
    res.status(500).json({
      error: "Video holatini tekshirishda xato."
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server ishga tushdi:", PORT);
});
