
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

// Exchange and currency for each supported market
const MARKETS = {
  US: { exchange: "NASDAQ", currency: "USD" },
  AU: { exchange: "ASX", currency: "AUD" },
  UK: { exchange: "LSE", currency: "GBP" },
  JP: { exchange: "TSE", currency: "JPY" },
  CA: { exchange: "TSX", currency: "CAD" },
};

app.get("/api/stock", async (req, res) => {
  try {
    const symbol = String(req.query.symbol || "").trim();
    const market = MARKETS[req.query.market];

    if (!/^[A-Za-z0-9.^_-]{1,20}$/.test(symbol) || !market) {
      return res.status(400).json({
        error: "Enter a valid ticker and select a market.",
      });
    }

    if (!API_KEY) {
      return res.status(500).json({
        error: "Add your Twelve Data API key to .env.",
      });
    }

    const url = new URL("https://api.twelvedata.com/price");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("exchange", market.exchange);
    url.searchParams.set("apikey", API_KEY);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status === "error" || !data.price) {
      return res.status(502).json({
        error: data.message || "Could not fetch this stock. Check its ticker, exchange and API access.",
      });
    }

    const price = Number(data.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(502).json({ error: "Invalid stock price received." });
    }

    res.json({
      symbol: symbol.toUpperCase(),
      market: req.query.market,
      currency: market.currency,
      exchange: market.exchange,
      price,
      source: "Twelve Data",
    });
  } catch (error) {
    res.status(502).json({ error: "Stock service unavailable. Try again." });
  }
});

app.get("/api/fx/:currency", async (req, res) => {
  try {
    const currency = String(req.params.currency).toUpperCase();

    if (!["USD", "AUD", "GBP", "JPY", "CAD"].includes(currency)) {
      return res.status(400).json({ error: "Unsupported currency." });
    }

    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${currency.toLowerCase()}/inr`
    );
    const data = await response.json();

    if (!response.ok || !Number.isFinite(data.rate)) {
      return res.status(502).json({
        error: "Could not retrieve the exchange rate.",
      });
    }

    res.json({
      base: currency,
      quote: "INR",
      rate: data.rate,
      date: data.date,
      source: "Frankfurter",
    });
  } catch (error) {
    res.status(502).json({ error: "Exchange-rate service unavailable." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
