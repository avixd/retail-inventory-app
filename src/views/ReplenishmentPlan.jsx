/**
 * Replenishment Plan: what to order, where, and why.
 * Every SKU x site position with its statistical policy (service level by ABC
 * class, safety stock, reorder point, EOQ), current position and the order the
 * policy implies, plus a worked example that recomputes the maths in the browser.
 * File: replenishment.json (all positions, sorted by urgency).
 */
import { useMemo, useState } from "react";
import { PackageX, TriangleAlert, Gauge, DollarSign, Info } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { CAD } from "../data/inventory";
import { useMonthFiles, itemsOf } from "../data/useMonthFiles";

const STATUS = {
  OUT: { label: "Out of stock", cls: "pill--danger" },
  BELOW_ROP: { label: "Below reorder point", cls: "pill--accent" },
  LOW: { label: "Low", cls: "pill--accent" },
  OK: { label: "OK", cls: "pill--success" },
};

/** Inverse standard normal (Abramowitz & Stegun 26.2.23, error < 4.5e-4). */
function zFor(p) {
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t ** 3);
  return p < 0.5 ? -z : z;
}

const n1 = (v) => (v == null ? "–" : Number(v).toLocaleString("en-CA", { maximumFractionDigits: 1 }));

export default function ReplenishmentPlan({ viewLabel }) {
  const { loading, files } = useMonthFiles(["replenishment.json"]);
  const rows = itemsOf(files["replenishment.json"]);
  const [site, setSite] = useState("all");
  const [status, setStatus] = useState("action");

  const sites = useMemo(() => [...new Set(rows.map((r) => r.location))].sort(), [rows]);
  const shown = rows.filter((r) => (site === "all" || r.location === site)
    && (status === "all" || (status === "action" ? r.status !== "OK" : r.status === status)));

  if (loading) return <><ViewHead viewLabel={viewLabel} title="Replenishment Plan" /><p className="empty-note">Loading the plan…</p></>;
  if (!rows.length) return <><ViewHead viewLabel={viewLabel} title="Replenishment Plan" /><p className="empty-note">Replenishment data isn't published for this month.</p></>;

  const count = (s) => rows.filter((r) => r.status === s).length;
  const orderValue = rows.reduce((s, r) => s + (r.recommendedValue || 0), 0);
  const kpis = [
    { icon: PackageX, label: "Positions out of stock", val: count("OUT"), tone: "#d0563f" },
    { icon: TriangleAlert, label: "Below reorder point", val: count("BELOW_ROP"), tone: "#f4a63b" },
    { icon: Gauge, label: "Low (inside safety buffer)", val: count("LOW"), tone: "#57b0d6" },
    { icon: DollarSign, label: "Orders the policy calls for", val: CAD(orderValue), tone: "#2e9e6b" },
  ];

  // Worked example: the most urgent position with demand, recomputed here.
  const ex = rows.find((r) => r.status !== "OK" && r.avgDailyDemand > 0) ?? rows[0];
  const z = zFor(ex.serviceLevel);
  const ss = z * Math.sqrt(ex.leadTimeMean * ex.sdDailyDemand ** 2 + ex.avgDailyDemand ** 2 * ex.leadTimeSd ** 2);
  const rop = ex.avgDailyDemand * ex.leadTimeMean + ss;

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Replenishment Plan"
        desc="Statistical reorder policy for every SKU at every site: how much buffer to hold, when to reorder, and how much."
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
            <h4 className="chart-card__title">Worked example · {ex.sku} {ex.name} at {ex.location}</h4>
            <p className="chart-card__sub">The most urgent position, recomputed in your browser from the published inputs.</p>
          </div>
          <span className={`pill ${STATUS[ex.status]?.cls ?? ""}`}>{STATUS[ex.status]?.label ?? ex.status}</span>
        </div>
        <div className="formula-grid">
          <div><span>Service level (class {ex.abc})</span><b>{(ex.serviceLevel * 100).toFixed(0)}% → z = {z.toFixed(2)}</b></div>
          <div><span>Daily demand d̄ ± σd</span><b>{n1(ex.avgDailyDemand)} ± {n1(ex.sdDailyDemand)} units</b></div>
          <div><span>Lead time L ± σL</span><b>{n1(ex.leadTimeMean)} ± {n1(ex.leadTimeSd)} days</b></div>
          <div><span>Safety stock = z·√(L·σd² + d̄²·σL²)</span><b>{n1(ss)} → {ex.safetyStock} units</b></div>
          <div><span>Reorder point = d̄·L + safety stock</span><b>{n1(rop)} → {ex.reorderPoint} units</b></div>
          <div><span>Economic order quantity = √(2·D·S ÷ H)</span><b>{ex.eoq} units</b></div>
          <div><span>Position = on hand + on order + in transit</span><b>{ex.inventoryPosition} units ({ex.onHand} on hand)</b></div>
          <div><span>Order now = max(EOQ, ROP + 7 days − position), to pack size</span><b>{ex.recommendedQty} units · {CAD(ex.recommendedValue)}</b></div>
        </div>
        {ex.recommendedQty === 0 && ex.status !== "OK" && (
          <p className="muted-note" style={{ margin: "0 22px 18px" }}>
            No new order: stock already on order or in transit lifts the position above the reorder point.
          </p>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Positions</h4>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select value={site} onChange={(e) => setSite(e.target.value)} aria-label="Filter by site">
              <option value="all">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="action">Needs attention</option>
              <option value="all">All positions</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="pill pill--muted">{shown.length} of {rows.length}</span>
          </div>
        </div>
        <div className="scroll-tile" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Site</th><th>ABC</th>
                <th className="num-cell">Daily demand</th><th className="num-cell">Lead (d)</th>
                <th className="num-cell">Safety</th><th className="num-cell">Reorder pt</th><th className="num-cell">EOQ</th>
                <th className="num-cell">On hand</th><th className="num-cell">Position</th>
                <th className="num-cell">Order</th><th className="num-cell">Value</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 150).map((r) => (
                <tr key={`${r.sku}-${r.location}`}>
                  <td style={{ fontWeight: 700 }}>{r.sku}</td>
                  <td>{r.name}</td>
                  <td>{r.location}</td>
                  <td>{r.abc}</td>
                  <td className="num-cell">{n1(r.avgDailyDemand)}</td>
                  <td className="num-cell">{n1(r.leadTimeMean)}</td>
                  <td className="num-cell">{r.safetyStock}</td>
                  <td className="num-cell">{r.reorderPoint}</td>
                  <td className="num-cell">{r.eoq}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{r.onHand}</td>
                  <td className="num-cell">{r.inventoryPosition}</td>
                  <td className="num-cell" style={{ fontWeight: 700, color: "var(--teal-700)" }}>{r.recommendedQty || "–"}</td>
                  <td className="num-cell">{r.recommendedValue ? CAD(r.recommendedValue) : "–"}</td>
                  <td><span className={`pill ${STATUS[r.status]?.cls ?? ""}`}>{STATUS[r.status]?.label ?? r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length > 150 && <p className="muted-note" style={{ margin: "10px 22px 18px" }}>Showing the 150 most urgent; filter by site to see the rest.</p>}
      </div>

      <details className="method-box" style={{ marginTop: 16 }}>
        <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> How the policy is set</summary>
        <ul>
          <li><b>Service level by value:</b> A items 98%, B 95%, C 90% (ABC = share of 12-month revenue). Higher service costs more buffer stock; the class decides where that money is worth spending.</li>
          <li><b>Demand</b> d̄, σd from the last 91 days of true demand (sold + lost); <b>lead time</b> L, σL from the last year of actual receipts, falling back to the supplier's quote when there are fewer than 5.</li>
          <li><b>Safety stock</b> covers both demand and lead-time variability; <b>reorder point</b> = expected demand over the lead time + safety stock.</li>
          <li><b>EOQ</b> balances ordering cost against holding cost; orders are at least EOQ and rounded up to pack size.</li>
          <li><b>Status:</b> out of stock (nothing on hand), below reorder point, low (within 25% of safety stock above it), or OK.</li>
        </ul>
      </details>
    </>
  );
}
