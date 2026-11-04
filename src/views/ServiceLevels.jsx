/**
 * Service Levels: the trade-off between safety-stock investment and lost sales.
 * Move the target service level for each ABC class and see the safety stock it
 * needs, the margin expected to be lost to stock-outs, and the total cost; the
 * cost-minimising level per class is computed and can be applied in one click.
 * Maths and assumptions: src/data/planning.js. File: replenishment.json + dataset.
 */
import { useEffect, useMemo, useState } from "react";
import { Wallet, ShieldCheck, TrendingDown, Target, Info } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { LineViz, PALETTE } from "../components/Charts";
import { CAD } from "../data/inventory";
import { useMonthFiles } from "../data/useMonthFiles";
import { serviceLevelAnalysis, CURRENT_POLICY, LEVEL_GRID } from "../data/planning";
import { useDataStatus } from "../data/useDataStatus";
import { snapshotFile } from "../data/dataSource";

const pct = (v, dp = 1) => `${(v * 100).toFixed(dp)}%`;
const CLASS_NOTE = { A: "top 80% of revenue", B: "next 15%", C: "last 5%" };

/** The month's dataset (products' cost and price) without touching the shared arrays. */
function useDataset() {
  const { month } = useDataStatus();
  const [state, setState] = useState({ month: null, dataset: null });
  useEffect(() => {
    let off = false;
    snapshotFile(month, "dataset.json").then((d) => { if (!off) setState({ month, dataset: d }); });
    return () => { off = true; };
  }, [month]);
  return state.month === month ? state.dataset : null;
}

export default function ServiceLevels({ viewLabel }) {
  const { loading, files } = useMonthFiles(["replenishment.json"]);
  const dataset = useDataset();
  const [levels, setLevels] = useState(CURRENT_POLICY);
  const [focus, setFocus] = useState("A");

  const analysis = useMemo(
    () => (files["replenishment.json"] && dataset ? serviceLevelAnalysis(files["replenishment.json"], dataset, levels) : null),
    [files, dataset, levels]);

  if (loading || !dataset) return <><ViewHead viewLabel={viewLabel} title="Service Levels" /><p className="empty-note">Loading positions…</p></>;
  if (!analysis) return <><ViewHead viewLabel={viewLabel} title="Service Levels" /><p className="empty-note">Replenishment data isn't published for this month.</p></>;

  const { classes } = analysis;
  const optimalLevels = Object.fromEntries(Object.entries(classes).map(([c, v]) => [c, v.optimal.level]));
  const saving = analysis.current.totalCost - analysis.chosen.totalCost;
  const kpis = [
    { icon: Wallet, label: "Safety stock at chosen levels", val: CAD(analysis.chosen.ssValue), tone: "#1a6790" },
    { icon: TrendingDown, label: "Expected margin lost to stock-outs / yr", val: CAD(analysis.chosen.lostMargin), tone: "#d0563f" },
    { icon: Target, label: "Total yearly cost (holding + lost margin)", val: CAD(analysis.chosen.totalCost), tone: "#7a5cc4" },
    { icon: ShieldCheck, label: "Yearly cost vs current policy",
      val: Math.abs(saving) < 1 ? "Same" : `${saving > 0 ? "−" : "+"}${CAD(Math.abs(saving))}`,
      tone: Math.abs(saving) < 1 ? "#8aa0ac" : saving > 0 ? "#2e9e6b" : "#d0563f" },
  ];
  const f = classes[focus];
  const curveData = f.curve.map((p) => ({
    level: `${(p.level * 100).toFixed(1)}%`, holding: Math.round(p.holding), lost: Math.round(p.lostMargin), total: Math.round(p.totalCost),
  }));

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Service Levels"
        desc="How much safety stock to hold: every point of service costs inventory, every missed sale costs margin. Find the balance by class."
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
            <h4 className="chart-card__title">Target service level by class</h4>
            <p className="chart-card__sub">Cycle service level = chance a replenishment cycle ends without a stock-out. What-if only: nothing is saved.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setLevels(CURRENT_POLICY)}>Current policy</button>
            <button className="btn btn--sm" onClick={() => setLevels(optimalLevels)}>Apply cost-minimising levels</button>
          </div>
        </div>
        <div className="sl-grid">
          {["A", "B", "C"].filter((c) => classes[c]).map((c) => {
            const v = classes[c];
            return (
              <div key={c} className={`sl-class${focus === c ? " is-focus" : ""}`}>
                <div className="sl-class__head">
                  <button className="sl-class__title" onClick={() => setFocus(c)} aria-pressed={focus === c}>
                    Class {c} <span>{CLASS_NOTE[c]} · {v.chosen.positions} positions</span>
                  </button>
                  <b className="sl-class__level">{pct(levels[c])}</b>
                </div>
                <input
                  type="range" min={LEVEL_GRID[0]} max={LEVEL_GRID[LEVEL_GRID.length - 1]} step="0.005"
                  value={levels[c]} aria-label={`Target service level for class ${c}`}
                  onChange={(e) => setLevels((l) => ({ ...l, [c]: Number(e.target.value) }))}
                />
                <dl className="sl-class__stats">
                  <div><dt>Safety stock</dt><dd>{CAD(v.chosen.ssValue)}</dd></div>
                  <div><dt>Holding cost / yr</dt><dd>{CAD(v.chosen.holding)}</dd></div>
                  <div><dt>Lost margin / yr</dt><dd>{CAD(v.chosen.lostMargin)}</dd></div>
                  <div><dt>Modelled fill rate</dt><dd>{pct(v.chosen.fillRate, 2)}</dd></div>
                </dl>
                <p className="sl-class__note">
                  Current policy {pct(CURRENT_POLICY[c], 0)} · cost-minimising <b>{pct(v.optimal.level)}</b>{" "}
                  ({CAD(v.current.totalCost - v.optimal.totalCost)} a year cheaper)
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Class {focus}: yearly cost by service level</h4>
            <p className="chart-card__sub">Holding cost rises with service; lost margin falls. The lowest point of the total is the cost-minimising level ({pct(f.optimal.level)}).</p>
          </div>
        </div>
        <LineViz
          data={curveData}
          xKey="level"
          height={260}
          series={[
            { key: "holding", name: "Holding cost of safety stock", color: PALETTE.teal },
            { key: "lost", name: "Margin lost to stock-outs", color: PALETTE.red },
            { key: "total", name: "Total", color: PALETTE.violet },
          ]}
        />
      </div>

      <details className="method-box" open>
        <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> How it's calculated, and what it assumes</summary>
        <ul>
          <li><b>Safety stock</b> = z × σ<sub>LT</sub>, with σ<sub>LT</sub> = √(L·σd² + d̄²·σL²) from each position's last 91 days of demand and the supplier's actual lead times.</li>
          <li><b>Expected units short</b> per year = (annual demand ÷ order quantity) × σ<sub>LT</sub> × G(z), where G is the standard normal loss function.</li>
          <li><b>Cost</b> = safety stock × unit cost × 25% a year (the holding rate the order quantities use) + units short × unit gross margin. The minimum sits where 1 − Φ(z) = holding cost ÷ (cycles × margin).</li>
          <li><b>Why higher service pays here:</b> gross margin is about 58% of price, so a lost sale costs far more than holding one more unit for a year.</li>
          <li><b>Assumptions:</b> the recommended policy is actually followed; lead-time demand is roughly normal; a DC shortage is costed like a lost sale (an upper bound).</li>
          <li><b>Policy-compliance gap:</b> the modelled fill rate assumes this policy; the store stock-out rate on the Executive Summary reflects how the business is replenishing today.</li>
        </ul>
      </details>
    </>
  );
}
