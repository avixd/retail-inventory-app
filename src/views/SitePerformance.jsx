/**
 * Site Performance: how each store and DC turns its inventory, and how often
 * stores run out, for the selected month and the trailing 12 months.
 * Files: kpis.json (per site, per month), kpis-network.json (whole network).
 */
import { Info } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { WAREHOUSES } from "../data/inventory";
import { useMonthFiles, itemsOf } from "../data/useMonthFiles";

const monthKey = (asOf) => `${asOf.slice(0, 7)}-01`;
const mon = (m) => new Date(`${m}T00:00:00Z`).toLocaleString("en-CA", { month: "short", timeZone: "UTC" });
const fmt = (v, dp = 1) => (v == null ? "–" : v.toFixed(dp));

/** Stock-out heat: white at 0%, deepening red towards 6%+. */
const heat = (rate) => {
  if (rate == null) return "transparent";
  const t = Math.min(rate / 0.06, 1);
  return `rgba(208, 86, 63, ${0.08 + t * 0.62})`;
};

export default function SitePerformance({ viewLabel }) {
  const { loading, month, files } = useMonthFiles(["kpis.json", "kpis-network.json"]);
  const rows = itemsOf(files["kpis.json"]);
  const network = itemsOf(files["kpis-network.json"]);
  if (loading) return <><ViewHead viewLabel={viewLabel} title="Site Performance" /><p className="empty-note">Loading KPIs…</p></>;
  if (!rows.length || !month) return <><ViewHead viewLabel={viewLabel} title="Site Performance" /><p className="empty-note">KPIs aren't published for this month.</p></>;

  const key = monthKey(month);
  const months = [...new Set(rows.map((r) => r.month))].sort();
  const name = (code) => WAREHOUSES.find((w) => w.id === code)?.name ?? code;
  const current = rows.filter((r) => r.month === key)
    .sort((a, b) => (a.locationType === b.locationType ? a.location.localeCompare(b.location) : a.locationType === "DC" ? -1 : 1));
  const net = network.find((r) => r.month === key);
  const stores = [...new Set(rows.filter((r) => r.locationType === "STORE").map((r) => r.location))].sort();

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Site Performance"
        desc="Inventory productivity and availability by store and distribution centre, against the whole network."
      />

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Month to {month}</h4>
            <p className="chart-card__sub">Turns and GMROI annualised. DCs don't sell, so they have no GMROI; their "turns" are stock shipped to stores.</p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr><th>Site</th><th>Type</th><th className="num-cell">Turns</th><th className="num-cell">Days of supply</th>
              <th className="num-cell">GMROI</th><th className="num-cell">Stock-out rate</th></tr>
          </thead>
          <tbody>
            {current.map((r) => (
              <tr key={r.location}>
                <td style={{ fontWeight: 700 }}>{r.location} · {name(r.location)}</td>
                <td>{r.locationType === "DC" ? "Distribution centre" : "Store"}</td>
                <td className="num-cell">{fmt(r.turns)}×</td>
                <td className="num-cell">{fmt(r.daysOfSupply, 0)}</td>
                <td className="num-cell">{r.gmroi == null ? "–" : `${fmt(r.gmroi)}×`}</td>
                <td className="num-cell">{r.locationType === "STORE" ? `${(r.stockoutRate * 100).toFixed(1)}%` : "–"}</td>
              </tr>
            ))}
            {net && (
              <tr className="table__total">
                <td style={{ fontWeight: 800 }}>Network</td>
                <td>Stores + DCs</td>
                <td className="num-cell" style={{ fontWeight: 800 }}>{fmt(net.turns)}×</td>
                <td className="num-cell" style={{ fontWeight: 800 }}>{fmt(net.daysOfSupply, 0)}</td>
                <td className="num-cell" style={{ fontWeight: 800 }}>{fmt(net.gmroi)}×</td>
                <td className="num-cell" style={{ fontWeight: 800 }}>{(net.stockoutRate * 100).toFixed(1)}%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Store stock-out rate, trailing 12 months</h4>
            <p className="chart-card__sub">Share of SKU-days ending with an empty shelf. Darker = more lost sales.</p>
          </div>
        </div>
        <div className="scroll-tile" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="table heat-table">
            <thead><tr><th>Store</th>{months.map((m) => <th key={m} className="num-cell">{mon(m)}</th>)}</tr></thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s}>
                  <td style={{ fontWeight: 700 }}>{s} · {name(s)}</td>
                  {months.map((m) => {
                    const r = rows.find((x) => x.location === s && x.month === m);
                    return (
                      <td key={m} className={`num-cell${m === key ? " heat-table__now" : ""}`} style={{ background: heat(r?.stockoutRate) }}>
                        {r ? `${(r.stockoutRate * 100).toFixed(1)}` : "–"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="method-box">
        <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> Definitions</summary>
        <ul>
          <li><b>Turns:</b> cost of goods out ÷ average daily inventory at cost, annualised. <b>Days of supply:</b> average inventory ÷ average daily cost of goods out.</li>
          <li><b>GMROI:</b> gross margin ÷ average inventory at cost, annualised. Store GMROI looks high because stores hold little stock; the network row divides store margin by store <i>and</i> DC inventory, which is the figure to manage the business on.</li>
          <li><b>Stock-out rate:</b> share of store-SKU-days ending with zero on hand.</li>
        </ul>
      </details>
    </>
  );
}
