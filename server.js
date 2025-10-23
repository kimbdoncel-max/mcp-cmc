import express from "express";
import fetch from "node-fetch";

const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN;
const CMC_API_KEY = process.env.CMC_API_KEY;

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const hdr = req.headers.authorization || "";
  const ok = hdr.startsWith("Bearer ") && hdr.slice(7) === ACCESS_TOKEN;
  if (!ok) return res.status(401).json({ error: "unauthorized" });
  next();
});

app.post("/mcp/tool", async (req, res) => {
  const { name, arguments: args = {} } = req.body || {};
  try {
    if (name === "cmc_get_listings") {
      const limit = Math.min(Math.max(parseInt(args.limit || 50), 1), 100);
      const convert = (args.convert || "USD").toUpperCase();
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=${limit}&convert=${convert}`;
      const r = await fetch(url, {
        headers: { "X-CMC_PRO_API_KEY": CMC_API_KEY, "Accept": "application/json" }
      });
      if (!r.ok) return res.status(502).json({ ok: false, error: "CMC_ERROR", detail: await r.text() });
      const data = await r.json();
      const items = (data?.data || []).map(c => ({
        id: c.id, name: c.name, symbol: c.symbol, cmc_rank: c.cmc_rank,
        market_cap: c.quote?.[convert]?.market_cap ?? null,
        price: c.quote?.[convert]?.price ?? null,
        pct_change_7d: c.quote?.[convert]?.percent_change_7d ?? null,
        pct_change_30d: c.quote?.[convert]?.percent_change_30d ?? null
      }));
      return res.json({ ok: true, content: { items, fetched_at: new Date().toISOString(), convert } });
    }
    return res.status(400).json({ ok: false, error: "UNKNOWN_TOOL", name });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", detail: String(e) });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok" }));
app.listen(PORT, () => console.log(`MCP server on :${PORT}`));
