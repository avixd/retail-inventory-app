/**
 * Demand Forecast: how good are the forecasts, and what do they say?
 * Back-tested accuracy of the chosen models vs the seasonal-naive baseline,
 * a per-SKU chart of 26 weeks of actual network demand and the 8-week forecast
 * with its 80% interval, the model mix, and the hardest SKUs to forecast.
 * Files: forecast-accuracy.json, forecast-network.json (per month-end).
 */
import { useMemo, useState } from "react";
import { Target, Gauge, TrendingDown, Layers, Info } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { ForecastViz } from "../components/Charts";
import { PRODUCTS } from "../data/inventory";
import { useMonthFiles, itemsOf } from "../data/useMonthFiles";

const MODEL_LABEL = {
  ses: "Simple exponential smoothing",
  holt_winters: "Holt-Winters (trend + 52-week season)",
  seasonal_naive: "Seasonal naive (same week last year)",
  croston_sba: "Croston-SBA (intermittent demand)",
};
const pct = (v) => (v == null ? "–" : `${(v * 100).toFixed(1)}%`);
const shortWeek = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { day: "numeric", month: "short", timeZone: "UTC" });

export default function DemandForecast({ viewLabel }) {
  const { loading, files } = useMonthFiles(["forecast-accuracy.json", "forecast-network.json"]);
  const acc = files["forecast-accuracy.json"];
  const network = itemsOf(files["forecast-network.json"]);
  const bySku = acc?.bySku ?? [];
  const defaultSku = useMemo(
    () => [...bySku].sort((a, b) => b.units52w - a.units52w)[0]?.sku ?? "", [bySku]);
  const [picked, setPicked] = useState("");
  const sku = picked || defaultSku;
  const name = (s) => PRODUCTS.find((p) => p.sku === s)?.name ?? s;

  const series = useMemo(() => network.filter((r) => r.sku === sku).map((r) => ({
    week: shortWeek(r.weekStart),
    actual: r.actual ?? undefined,
    forecast: r.forecast ?? undefined,
    band: r.forecast != null ? [r.lower80, r.upper80] : undefined,
  })), [network, sku]);

  if (loading) return <><ViewHead viewLabel={viewLabel} title="Demand Forecast" /><p className="empty-note">Loading forecasts…</p></>;
  if (!acc) return <><ViewHead viewLabel={viewLabel} title="Demand Forecast" /><p className="empty-note">Forecast data isn't published for this month.</p></>;

  const skuAcc = bySku.find((r) => r.sku === sku);
  const gain = acc.baselineWape && acc.chosenWape != null ? 1 - acc.chosenWape / acc.baselineWape : null;
  const hardest = [...bySku].sort((a, b) => (b.chosenWape ?? 0) - (a.chosenWape ?? 0)).slice(0, 8);
  const kpis = [
    { icon: Target, label: "Forecast error (WAPE), chosen models", val: pct(acc.chosenWape), tone: "#1a6790" },
    { icon: Gauge, label: "Baseline error: same week last year", val: pct(acc.baselineWape), tone: "#8aa0ac" },
    { icon: TrendingDown, label: "Error removed vs baseline", val: gain == null ? "–" : `${(gain * 100).toFixed(0)}%`, tone: "#2e9e6b" },
    { icon: Layers, label: "Store series forecast", val: acc.series, tone: "#7a5cc4" },
  ];

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Demand Forecast"
        desc="Weekly demand forecasts for every SKU at every store, chosen by back-test and judged against a simple baseline."
      />

      <div className="kpi-status-row">
        {kpis.map(({ icon: Icon, label, val, tone }) => (
          <div className="kpi-status" key={label} style={{ "--tone": tone }}>
            <div className="kpi-status__icon"><Icon size={20} /></div>
            <div>
              <div className="kpi-status__val">{val}</div>
              <div className="kpi-status__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">{name(sku)} · network demand and 8-week forecast</h4>
            <p className="chart-card__sub">
              Units per week across all stores (sold + lost to stock-outs). Back-test error for this SKU:
              {" "}<b>{pct(skuAcc?.chosenWape)}</b> vs baseline {pct(skuAcc?.baselineWape)}.
            </p>
          </div>
          <label className="as-of">
            <span className="as-of__label">SKU</span>
            <select value={sku} onChange={(e) => setPicked(e.target.value)} aria-label="Choose a SKU">
              {[...bySku].sort((a, b) => b.units52w - a.units52w).map((r) => (
                <option key={r.sku} value={r.sku}>{r.sku} · {name(r.sku)}</option>
              ))}
            </select>
          </label>
        </div>
        <ForecastViz data={series} />
      </div>

      <div className="chart-grid" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-card__head"><h4 className="chart-card__title">Which model wins, and how often</h4></div>
          <table className="table">
            <thead><tr><th>Model</th><th className="num-cell">Series chosen</th><th className="num-cell">Error (WAPE)</th></tr></thead>
            <tbody>
              {[...acc.byModel].sort((a, b) => b.seriesChosen - a.seriesChosen).map((m) => (
                <tr key={m.model}>
                  <td>{MODEL_LABEL[m.model] ?? m.model}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{m.seriesChosen}</td>
                  <td className="num-cell">{pct(m.wape)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chart-card">
          <div className="chart-card__head"><h4 className="chart-card__title">Hardest SKUs to forecast</h4></div>
          <table className="table">
            <thead><tr><th>SKU</th><th>Product</th><th className="num-cell">Chosen</th><th className="num-cell">Baseline</th></tr></thead>
            <tbody>
              {hardest.map((r) => (
                <tr key={r.sku} className="row-link" onClick={() => setPicked(r.sku)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 700 }}>{r.sku}</td>
                  <td>{name(r.sku)}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{pct(r.chosenWape)}</td>
                  <td className="num-cell">{pct(r.baselineWape)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="method-box">
        <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> How the forecasts are made and judged</summary>
        <ul>
          <li><b>Demand, not sales:</b> each store series is units sold <i>plus units lost to stock-outs</i>, so an empty shelf isn't mistaken for low demand.</li>
          <li><b>Model choice:</b> four candidates per series, each scored on a rolling-origin back-test (4 past origins × 8 weeks ahead); the lowest error wins.</li>
          <li><b>Error (WAPE):</b> sum of |forecast − actual| ÷ sum of actual, weighted across series by 52-week demand. Lower is better.</li>
          <li><b>Baseline:</b> "same week last year". A forecast that can't beat it isn't adding value; the table shows where that happens.</li>
          <li><b>Network view:</b> store forecasts are summed; the 80% band combines store uncertainty assuming independent errors.</li>
          <li><b>Not yet modelled:</b> promotions and price changes. Promotion weeks will be under-forecast (see the business review).</li>
        </ul>
      </details>
    </>
  );
}
