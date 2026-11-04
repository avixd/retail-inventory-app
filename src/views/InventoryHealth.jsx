/**
 * Inventory Health: ABC-XYZ segmentation turned into stocking policy.
 * ABC = value (share of 12-month revenue), XYZ = predictability (variation in
 * weekly demand). Each cell of the 3x3 matrix shows SKUs, revenue and inventory
 * held, with the policy that suits it; a second panel compares where the capital
 * sits with where the revenue comes from.
 * Files: abc-xyz.json; inventory value from the month's dataset.
 */
import { Info } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { CAD, PRODUCTS, STOCK } from "../data/inventory";
import { useMonthFiles, itemsOf } from "../data/useMonthFiles";

const POLICY = {
  AX: "Continuous replenishment, 98% service. Steady and valuable: keep buffers lean and never run out.",
  AY: "Forecast-driven, reviewed weekly, 98% service. Valuable but variable: watch promotions and seasonality.",
  AZ: "Strategic buffer or order to demand. Valuable and erratic: find the cause of the volatility first.",
  BX: "Standard reorder point, 95% service.",
  BY: "Periodic review, 95% service.",
  BZ: "Periodic review with tighter range control.",
  CX: "Order in larger, less frequent lots (EOQ), 90% service.",
  CY: "Periodic review, 90% service; minimise handling.",
  CZ: "Candidates to delist or supply on demand.",
};
const pct = (v, dp = 0) => `${(v * 100).toFixed(dp)}%`;

export default function InventoryHealth({ viewLabel }) {
  const { loading, files } = useMonthFiles(["abc-xyz.json"]);
  const rows = itemsOf(files["abc-xyz.json"]);
  if (loading) return <><ViewHead viewLabel={viewLabel} title="Inventory Health" /><p className="empty-note">Loading segments…</p></>;
  if (!rows.length) return <><ViewHead viewLabel={viewLabel} title="Inventory Health" /><p className="empty-note">Segmentation isn't published for this month.</p></>;

  const cost = new Map(PRODUCTS.map((p) => [p.sku, p.unitCost]));
  const invValue = new Map(STOCK.map((s) => [s.sku, (s.onShelf + s.offShelf) * (cost.get(s.sku) ?? 0)]));
  const totalInv = [...invValue.values()].reduce((a, b) => a + b, 0);
  const cell = (a, x) => {
    const members = rows.filter((r) => r.abc === a && r.xyz === x);
    return {
      skus: members.length,
      revenue: members.reduce((s, r) => s + r.revenueShare, 0),
      inv: members.reduce((s, r) => s + (invValue.get(r.sku) ?? 0), 0),
    };
  };
  const byClass = ["A", "B", "C"].map((a) => {
    const members = rows.filter((r) => r.abc === a);
    const inv = members.reduce((s, r) => s + (invValue.get(r.sku) ?? 0), 0);
    return { cls: a, skus: members.length, revenue: members.reduce((s, r) => s + r.revenueShare, 0), inv, invShare: totalInv ? inv / totalInv : 0 };
  });
  const xCount = rows.filter((r) => r.xyz === "X").length;

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Inventory Health"
        desc="Which products earn the revenue, which are predictable, and whether the stock is held where it pays."
      />

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">ABC-XYZ matrix</h4>
            <p className="chart-card__sub">Rows: value (A = top 80% of revenue, B = next 15%, C = last 5%). Columns: predictability of weekly demand.</p>
          </div>
        </div>
        <div className="abc-matrix" role="region" aria-label="ABC-XYZ matrix: value by predictability">
          <div className="abc-matrix__corner" />
          {["X · steady", "Y · variable", "Z · erratic"].map((h) => <div key={h} className="abc-matrix__colhead">{h}</div>)}
          {["A", "B", "C"].map((a) => (
            <div key={a} style={{ display: "contents" }}>
              <div className="abc-matrix__rowhead">{a}</div>
              {["X", "Y", "Z"].map((x) => {
                const c = cell(a, x);
                return (
                  <div key={x} className={`abc-cell abc-cell--${a}${c.skus ? "" : " abc-cell--empty"}`}>
                    <div className="abc-cell__seg">{a}{x}</div>
                    <div className="abc-cell__stats">
                      <b>{c.skus} SKU{c.skus === 1 ? "" : "s"}</b>
                      {c.skus > 0 && <span>{pct(c.revenue)} of revenue · {CAD(c.inv)} held</span>}
                    </div>
                    <p className="abc-cell__policy">{POLICY[`${a}${x}`]}</p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head"><h4 className="chart-card__title">Is the capital where the revenue is?</h4></div>
        <table className="table">
          <thead>
            <tr><th>Class</th><th className="num-cell">SKUs</th><th className="num-cell">Share of revenue</th>
              <th className="num-cell">Inventory held</th><th className="num-cell">Share of inventory</th><th>Reading</th></tr>
          </thead>
          <tbody>
            {byClass.map((c) => {
              const ratio = c.revenue ? c.invShare / c.revenue : 0;
              const reading = ratio > 1.5 ? "Over-invested relative to the revenue it earns"
                : ratio < 0.67 ? "Lean relative to its revenue: check availability" : "In proportion";
              return (
                <tr key={c.cls}>
                  <td style={{ fontWeight: 700 }}>{c.cls}</td>
                  <td className="num-cell">{c.skus}</td>
                  <td className="num-cell">{pct(c.revenue, 1)}</td>
                  <td className="num-cell">{CAD(c.inv)}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{pct(c.invShare, 1)}</td>
                  <td>{reading}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="method-box">
        <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> How the segments are set, and a caveat</summary>
        <ul>
          <li><b>ABC</b> ranks SKUs by trailing 12-month revenue: A until 80% of cumulative revenue, B to 95%, C the rest.</li>
          <li><b>XYZ</b> uses the coefficient of variation of weekly demand over 26 weeks: X ≤ 0.5, Y ≤ 1.0, Z above.</li>
          <li><b>Inventory held</b> is units on hand at stores and DCs at the month-end, valued at cost.</li>
          <li><b>Mix this month:</b> {xCount} of {rows.length} SKUs are X (steady). Y and Z items are where buffers, review frequency and range decisions matter most.</li>
        </ul>
      </details>
    </>
  );
}
