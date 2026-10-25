
app.get("/api/health", (req, res) => {
  const raw = process.env.REPLICATE_API_TOKEN || "";
  res.json({
    ok: true,
    tokenSet: Boolean(TOKEN),
    tokenLooksValid: TOKEN.startsWith("r8_") && TOKEN.length >= 30,
    rawLength: raw.length,
    cleanLength: TOKEN.length,
    first3: TOKEN.slice(0, 3),
    port: PORT,
  });
});
