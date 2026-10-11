
import { useState } from "react";
import "./index.css";

const MARKETS = {
  US: { name: "United States", currency: "USD", flag: "🇺🇸", example: "AAPL" },
  AU: { name: "Australia", currency: "AUD", flag: "🇦🇺", example: "BHP" },
  UK: { name: "United Kingdom", currency: "GBP", flag: "🇬🇧", example: "VOD" },
  JP: { name: "Japan", currency: "JPY", flag: "🇯🇵", example: "7203" },
  CA: { name: "Canada", currency: "CAD", flag: "🇨🇦", example: "SHOP" },
};

const money = (value, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export default function App() {
  const [market, setMarket] = useState("US");
  const [symbol, setSymbol] = useState("AAPL");
  const [quantity, setQuantity] = useState("1");
  const [brokerFee, setBrokerFee] = useState("0");
  const [fxMarkup, setFxMarkup] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [stock, setStock] = useState(null);
  const [fx, setFx] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = MARKETS[market];
  const qty = Number(quantity);
  const feePct = Number(brokerFee);
  const markupPct = Number(fxMarkup);
  const other = Number(otherCharges);

  const valid =
    Number.isFinite(qty) && qty > 0 &&
    Number.isFinite(feePct) && feePct >= 0 &&
    Number.isFinite(markupPct) && markupPct >= 0 &&
    Number.isFinite(other) && other >= 0;

  const stockValue = stock ? stock.price * qty : 0;
  const baseINR = stockValue * (fx?.rate || 0);
  const fxCost = baseINR * markupPct / 100;
  const brokerage = baseINR * feePct / 100;
  const total = baseINR + fxCost + brokerage + other;

  async function calculate() {
    setLoading(true);
    setError("");
    setStock(null);
    setFx(null);

    try {
      if (!valid || !symbol.trim()) {
        throw new Error("Enter a ticker, a positive share quantity and valid non-negative charges.");
      }

      const response = await fetch(
        `/api/stock?market=${market}&symbol=${encodeURIComponent(symbol.trim())}`
      );
      const stockData = await response.json();

      if (!response.ok) throw new Error(stockData.error || "Stock lookup failed.");

      const fxResponse = await fetch(`/api/fx/${stockData.currency}`);
      const fxData = await fxResponse.json();

      if (!fxResponse.ok) {
        throw new Error(fxData.error || "Exchange-rate lookup failed.");
      }

      setStock(stockData);
      setFx(fxData);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function changeMarket(value) {
    setMarket(value);
    setSymbol(MARKETS[value].example);
    setStock(null);
    setFx(null);
    setError("");
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/">🌍 Global Invest</a>
        <span className="tag">INR COST CALCULATOR</span>
      </header>

      <section className="intro">
        <p className="eyebrow">INVESTMENT PLANNER</p>
        <h1>Global stocks.<br />One INR estimate.</h1>
        <p className="muted">
          Estimate how much you need in rupees before buying
          international shares.
        </p>
      </section>

      <section className="layout">
        <div className="panel">
          <h2>Calculate purchase cost</h2>

          <label htmlFor="market">Stock market</label>
          <select
            id="market"
            value={market}
            onChange={e => changeMarket(e.target.value)}
          >
            {Object.entries(MARKETS).map(([code, item]) => (
              <option key={code} value={code}>
                {item.flag} {item.name} ({item.currency})
              </option>
            ))}
          </select>

          <label htmlFor="symbol">Stock ticker</label>
          <input
            id="symbol"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder={selected.example}
          />
          <p className="hint">
            Example: {selected.example}. Enter the symbol supported
            by the selected exchange.
          </p>

          <label htmlFor="quantity">Number of shares</label>
          <input
            id="quantity"
            type="number"
            min="0.000001"
            step="any"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />

          <h3>Estimated charges</h3>
          <div className="two-cols">
            <div>
              <label htmlFor="broker">Brokerage (%)</label>
              <input id="broker" type="number" min="0" step="any"
                value={brokerFee}
                onChange={e => setBrokerFee(e.target.value)} />
            </div>
            <div>
              <label htmlFor="markup">FX markup (%)</label>
              <input id="markup" type="number" min="0" step="any"
                value={fxMarkup}
                onChange={e => setFxMarkup(e.target.value)} />
            </div>
          </div>

          <label htmlFor="other">Other charges (INR)</label>
          <input id="other" type="number" min="0" step="any"
            value={otherCharges}
            onChange={e => setOtherCharges(e.target.value)} />

          <button onClick={calculate} disabled={loading}>
            {loading ? "Fetching prices..." : "Calculate in INR →"}
          </button>

          {error && <p className="error" role="alert">{error}</p>}
        </div>

        <div className="panel result">
          <p className="eyebrow">YOUR ESTIMATE</p>
          <h2>Purchase summary</h2>

          {!stock || !fx ? (
            <div className="empty">
              <span className="globe">◎</span>
              <h3>Your result will appear here</h3>
              <p className="muted">
                Select a market, enter a ticker and calculate.
              </p>
            </div>
          ) : (
            <>
              <div className="total-card">
                <p>Estimated amount required</p>
                <h2>{money(total, "INR")}</h2>
                <span>
                  {qty} × {stock.symbol} · {selected.name}
                </span>
              </div>

              <div className="line">
                <span>Latest available stock price</span>
                <strong>{money(stock.price, stock.currency)}</strong>
              </div>
              <div className="line">
                <span>Stock value ({qty} shares)</span>
                <strong>{money(stockValue, stock.currency)}</strong>
              </div>
              <div className="line">
                <span>Reference exchange rate</span>
                <strong>
                  1 {stock.currency} = {fx.rate.toFixed(4)} INR
                </strong>
              </div>
              <div className="line">
                <span>Stock value in INR</span>
                <strong>{money(baseINR, "INR")}</strong>
              </div>
              <div className="line">
                <span>Estimated brokerage</span>
                <strong>{money(brokerage, "INR")}</strong>
              </div>
              <div className="line">
                <span>Estimated FX markup</span>
                <strong>{money(fxCost, "INR")}</strong>
              </div>
              <div className="line">
                <span>Other charges</span>
                <strong>{money(other, "INR")}</strong>
              </div>
              <div className="line final-line">
                <span>Total estimate</span>
                <strong>{money(total, "INR")}</strong>
              </div>

              <p className="hint">
                FX reference date: {fx.date}. This is an estimate,
                not a broker quote or guaranteed execution price.
              </p>
            </>
          )}
        </div>
      </section>

      <footer>
        Prices and FX rates may be delayed. Actual costs depend on
        broker rates, taxes, exchange charges, remittance fees and
        applicable regulations.
      </footer>
    </main>
  );
}
