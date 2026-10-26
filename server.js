
app.get("/api/health", (req, res) => {
  const raw = process.env.REPLICATE_API_TOKEN || "";
  const clean = raw.trim();

  res.json({
    ok: true,
    tokenSet: Boolean(clean),
    tokenLooksValid:
      clean.startsWith("r8_") &&
      clean.length >= 30,
    rawLength: raw.length,
    cleanLength: clean.length,
    hasLeadingOrTrailingSpaces: raw !== clean,
    port: PORT
  });
});
