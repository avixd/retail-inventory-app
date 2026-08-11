/**
 * Supplier Performance — weighted supplier scorecards, cohort segmentation
 * (Strategic / Preferred / Approved / Watchlist), spend Pareto, and
 * payment-terms / working-capital analysis.
 * Selectors: supplierMetrics(), spendContribution(), cohortSummary().
 */
import { useState } from "react";
import {
  Building2, DollarSign, Package, TrendingUp, Timer, CalendarClock, ArrowRight,
} from "lucide-react";
import ViewHead from "../components/ViewHead";
import { ChartCard, ParetoViz, ScatterViz } from "../components/Charts";
import {
  spendContribution, cohortSummary, supplierMetrics, SUPPLIER_WEIGHTS, CAD,
} from "../data/inventory";

const shortName = (name) => name.split(" ")[0];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/* ---------------- Scorecard detail ---------------- */
function Scorecard({ s }) {
  const dailySpend = s.spendYtd / 365;
  const workingCapital = Math.round(dailySpend * Math.max(0, s.termsGapDays));
  return (
    <div className="chart-card" style={{ marginTop: 16 }}>
      <div className="chart-card__head">
        <div>
          <h4 className="chart-card__title">{s.name} · scorecard</h4>
          <p className="chart-card__sub">{s.id} · weighted performance score {s.score}/100</p>
        </div>
        <span className="pill" style={{ background: `color-mix(in srgb, ${s.cohort.tone} 16%, #fff)`, color: s.cohort.tone }}>
          {s.cohort.label} · {s.cohort.action}
        </span>
      </div>

      <div className="report-detail">
        <div>
          <div className="detail-field__k" style={{ marginBottom: 8 }}>Score components</div>
          {SUPPLIER_WEIGHTS.map((w) => (
            <div key={w.key} style={{ display: "flex", alignItems: "center", gap: 10, margin: "7px 0" }}>
              <span style={{ width: 150, fontSize: 12.5, color: "var(--ink-700)" }}>{w.label}</span>
              <div className="pbar" style={{ flex: 1 }}>
                <div className="pbar__fill" style={{ width: `${Math.round(s.parts[w.key])}%` }} />
              </div>
              <span className="num" style={{ width: 34, textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>
                {Math.round(s.parts[w.key])}
              </span>
              <span className="muted-note" style={{ width: 34, textAlign: "right" }}>{Math.round(w.weight * 100)}%</span>
            </div>
          ))}
        </div>
        <div>
          <div className="detail-field">
            <div className="detail-field__k"><CalendarClock size={11} style={{ verticalAlign: "-1px" }} /> Payment terms</div>
            <div className="detail-field__v">
              {s.terms} → {s.preferredTerms}{" "}
              {s.termsGapDays > 0
                ? <span className="pill pill--accent">cashflow +{s.termsGapDays}d</span>
                : <span className="pill pill--success">optimal</span>}
            </div>
          </div>
          {s.termsGapDays > 0 && (
            <div className="detail-field">
              <div className="detail-field__k">Working-capital opportunity</div>
              <div className="detail-field__v" style={{ color: "var(--teal-700)" }}>
                ~{CAD(workingCapital)} freed if extended to {s.preferredTerms}
              </div>
            </div>
          )}
          <div className="detail-field">
            <div className="detail-field__k"><Timer size={11} style={{ verticalAlign: "-1px" }} /> Lead time (contracted / actual)</div>
            <div className="detail-field__v">
              {s.leadDays} / {s.actualLeadDays} days{" "}
              <span className={s.leadVariance > 0 ? "qty-neg" : "qty-pos"}>
                ({s.leadVariance > 0 ? "+" : ""}{s.leadVariance}d)
              </span>
            </div>
          </div>
          <div className="detail-field">
            <div className="detail-field__k">Relationship</div>
            <div className="detail-field__v">{s.years} years (since {s.since}) · {CAD(s.creditsReceived)} credits received</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Scoring methodology ---------------- */
const CRITERIA_DETAIL = {
  onTime: { measures: "Share of PO lines received by the promised date.", formula: "on-time delivery %" },
  quality: { measures: "Units accepted vs. rejected/returned for defects.", formula: "100 − defect% × 8  (0–100)" },
  fill: { measures: "Ordered quantity actually delivered (no short-ships).", formula: "fill rate %" },
  lead: { measures: "Actual place→receive time vs. the contracted lead.", formula: "100 − max(0, actual − contracted) × 6  (floor 40)" },
  terms: { measures: "Current net terms vs. the cashflow-optimal target.", formula: "current ÷ preferred days × 100  (cap 100)" },
  relationship: { measures: "Tenure and vendor credits earned over the relationship.", formula: "min(yrs, 10) × 8 + min(credits ÷ 500, 20)" },
};

const COHORT_RULES = [
  { label: "Strategic", range: "≥ 82", action: "Grow", tone: "#2e9e6b" },
  { label: "Preferred", range: "70–81", action: "Maintain", tone: "#1a6790" },
  { label: "Approved", range: "58–69", action: "Monitor", tone: "#f4a63b" },
  { label: "Watchlist", range: "< 58", action: "Review / exit", tone: "#d0563f" },
];

const METHOD_NOTES = [
  { title: "Pros", tone: "#2e9e6b", items: [
    "Transparent & reproducible — every vendor scored on identical criteria.",
    "Balances delivery, quality, cost-of-capital (terms) and loyalty in one number.",
    "Turns a continuous score into clear grow / maintain / monitor / exit actions.",
    "Weights are easy to re-tune as sourcing priorities shift.",
  ] },
  { title: "Cons", tone: "#d0563f", items: [
    "A single composite can mask a critical weakness in one dimension.",
    "Weight choices are judgment calls — different buyers would weight differently.",
    "Linear penalties miss non-linear impact (one 10-day slip ≠ two 5-day slips).",
    "Fixed cutoffs: a 57 vs 58 score flips cohort despite a trivial gap.",
  ] },
  { title: "Assumptions", tone: "#1a6790", items: [
    "Input metrics (on-time, defect, fill, actual lead) are accurate and current.",
    "Longer payment terms are always better for the buyer (ignores early-pay discounts).",
    "Tenure + credits are a fair proxy for partnership strength.",
    "Annual spend represents steady-state purchasing volume.",
  ] },
  { title: "Limitations", tone: "#f4a63b", items: [
    "Demo uses illustrative figures, not live ERP / AP data.",
    "No risk lens — financial health, single-source dependency, geo / ESG / compliance.",
    "Snapshot only — no trend or trajectory (improving vs. declining).",
    "Not spend-weighted — a small and a strategic vendor share the same 0–100 scale.",
  ] },
];

function MethodologyCard() {
  return (
    <div className="chart-card" style={{ marginBottom: 16 }}>
      <div className="chart-card__head">
        <div>
          <h4 className="chart-card__title">Scoring methodology</h4>
          <p className="chart-card__sub">How each KPI is measured, weighted into a 0–100 score, and grouped into cohorts</p>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Criterion</th><th>What it measures</th><th>How it's scored (0–100)</th>
            <th className="num-cell">Weight</th>
          </tr>
        </thead>
        <tbody>
          {SUPPLIER_WEIGHTS.map((w) => (
            <tr key={w.key}>
              <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{w.label}</td>
              <td>{CRITERIA_DETAIL[w.key].measures}</td>
              <td style={{ fontFamily: "var(--font-num)", fontSize: 12.5, color: "var(--ink-700)" }}>{CRITERIA_DETAIL[w.key].formula}</td>
              <td className="num-cell" style={{ fontWeight: 700 }}>{Math.round(w.weight * 100)}%</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, color: "var(--ink-900)" }}>
              Composite score = Σ (component × weight), rounded
            </td>
            <td className="num-cell" style={{ fontWeight: 800, color: "var(--teal-700)" }}>100%</td>
          </tr>
        </tbody>
      </table>

      <div className="detail-field__k" style={{ margin: "18px 0 8px" }}>Cohort thresholds — grouping the score into an action</div>
      <div className="chip-row">
        {COHORT_RULES.map((c) => (
          <span className="chip" key={c.label} style={{ borderColor: c.tone }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: c.tone, display: "inline-block" }} />
            <b>{c.label}</b> {c.range} · {c.action}
          </span>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        {METHOD_NOTES.map((n) => (
          <div className="method-box" key={n.title} style={{ "--tone": n.tone }}>
            <h5>{n.title}</h5>
            <ul>{n.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SupplierPerformance({ viewLabel }) {
  const { ranked, totalSpend, totalInv, top10Share } = spendContribution();
  const cohorts = cohortSummary();
  const metrics = supplierMetrics();
  const [selected, setSelected] = useState(metrics[0].id);
  const sel = metrics.find((m) => m.id === selected);

  const pareto = ranked.slice(0, 10).map((r) => ({
    label: shortName(r.name),
    spend: r.spendYtd,
    cumPct: Math.round(r.cumPct),
  }));

  const refX = median(metrics.map((m) => m.spendYtd));
  const points = metrics.map((m) => ({
    x: m.spendYtd, y: m.score, name: m.name, color: m.cohort.tone, xLabel: CAD(m.spendYtd),
  }));

  const kpis = [
    { icon: Building2, label: "Active suppliers", val: metrics.length },
    { icon: DollarSign, label: "Procurement spend (YTD)", val: CAD(totalSpend) },
    { icon: TrendingUp, label: "Top-10 share of spend", val: `${Math.round(top10Share)}%` },
    { icon: Package, label: "Inventory value sourced", val: CAD(totalInv) },
  ];

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Supplier Performance Review"
        desc="Evaluate suppliers on spend contribution, a weighted performance score, and grow-vs-exit cohorts."
      />

      {/* ---------- Section 1: contribution ---------- */}
      <div className="kpi-row">
        {kpis.map(({ icon: Icon, label, val }) => (
          <div className="kpi" key={label}>
            <div className="kpi__top"><div className="kpi__icon"><Icon size={18} /></div></div>
            <div className="kpi__val">{val}</div>
            <div className="kpi__label">{label}</div>
          </div>
        ))}
      </div>

      <ChartCard title="Top suppliers — spend contribution (Pareto)" subtitle={`Top 10 suppliers = ${Math.round(top10Share)}% of ${CAD(totalSpend)} total spend`}>
        <ParetoViz data={pareto} xKey="label" barKey="spend" lineKey="cumPct" barName="Annual spend" lineName="Cumulative %" />
      </ChartCard>

      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="chart-card__head">
          <h4 className="chart-card__title">Contribution detail</h4>
          <span className="pill">{ranked.length} suppliers</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Supplier</th><th>Cohort</th>
                <th className="num-cell">Spend</th>
                <th className="num-cell">% of total</th>
                <th className="num-cell">Cumulative</th>
                <th className="num-cell">Inv. sourced</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{r.rank}</td>
                  <td>{r.name}</td>
                  <td><span className="pill" style={{ background: `color-mix(in srgb, ${r.cohort.tone} 16%, #fff)`, color: r.cohort.tone }}>{r.cohort.label}</span></td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{CAD(r.spendYtd)}</td>
                  <td className="num-cell">{r.pct.toFixed(1)}%</td>
                  <td className="num-cell">{r.cumPct.toFixed(1)}%</td>
                  <td className="num-cell">{CAD(r.invSourcedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Section 2: cohorts ---------- */}
      <div className="dash-toolbar">
        <div>
          <div className="dash-toolbar__title">Supplier cohorts</div>
          <div className="dash-toolbar__sub">Weighted score groups suppliers into grow / maintain / monitor / exit</div>
        </div>
      </div>
      <div className="kpi-status-row">
        {cohorts.map((c) => (
          <div className="kpi-status" key={c.label} style={{ "--tone": c.tone }}>
            <div className="kpi-status__icon" style={{ fontWeight: 800, fontSize: 16 }}>{c.count}</div>
            <div>
              <div className="kpi-status__val" style={{ fontSize: 15 }}>{c.label}</div>
              <div className="kpi-status__label">{c.action} · {CAD(c.spend)}</div>
            </div>
          </div>
        ))}
      </div>

      <MethodologyCard />

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Segmentation · spend × performance</h4>
            <p className="chart-card__sub">High spend + low score (bottom-right) = review first</p>
          </div>
        </div>
        <ScatterViz points={points} xName="Annual spend" yName="Score" refX={refX} refY={70} xTickFmt={(v) => `$${Math.round(v / 1000)}k`} />
        <div className="wh-legend" style={{ marginTop: 10 }}>
          {cohorts.map((c) => (
            <span key={c.label}><i style={{ background: c.tone }} /> {c.label}</span>
          ))}
        </div>
      </div>

      {/* ---------- Section 3: evaluation ---------- */}
      <div className="chart-card">
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Performance evaluation</h4>
            <p className="chart-card__sub">Click a supplier for its full scorecard</p>
          </div>
          <span className="pill">{metrics.length} suppliers</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier</th><th>Cohort</th>
                <th className="num-cell">Score</th>
                <th>Terms (cur → pref)</th>
                <th className="num-cell">Lead (c/a)</th>
                <th className="num-cell">Rel.</th>
                <th className="num-cell">Credits</th>
                <th className="num-cell">On-time</th>
                <th className="num-cell">Defect</th>
                <th className="num-cell">Fill</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr
                  key={m.id}
                  className={`row-link${selected === m.id ? " is-selected" : ""}`}
                  onClick={() => setSelected(m.id)}
                >
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{m.name}</td>
                  <td><span className="pill" style={{ background: `color-mix(in srgb, ${m.cohort.tone} 16%, #fff)`, color: m.cohort.tone }}>{m.cohort.label}</span></td>
                  <td className="num-cell" style={{ fontWeight: 800 }}>{m.score}</td>
                  <td>
                    <span className="route">{m.terms} <ArrowRight size={12} /> {m.preferredTerms}</span>
                    {m.termsGapDays > 0 && <span className="pill pill--accent" style={{ marginLeft: 6 }}>+{m.termsGapDays}d</span>}
                  </td>
                  <td className="num-cell">
                    {m.leadDays}/{m.actualLeadDays}
                    <span className={m.leadVariance > 0 ? "qty-neg" : "qty-pos"}> ({m.leadVariance > 0 ? "+" : ""}{m.leadVariance})</span>
                  </td>
                  <td className="num-cell">{m.years}y</td>
                  <td className="num-cell">{CAD(m.creditsReceived)}</td>
                  <td className="num-cell">{m.onTimeRate}%</td>
                  <td className="num-cell">{m.defectRate}%</td>
                  <td className="num-cell">{m.fillRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && <Scorecard s={sel} />}
    </>
  );
}
