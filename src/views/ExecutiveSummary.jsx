/**
 * Executive Summary: the landing view. Six findings for the selected month-end,
 * each with a money or rate figure, the change vs the prior month-end, a
 * one-line takeaway and a link to the view that explains it. Below, a 12-month
 * trend of network GMROI and store stock-out rate.
 *
 * Figures come from summary.js (pure functions over each month's snapshot files),
 * not from the shared arrays, so the month-over-month comparison is like for like.
 */
import { useEffect, useState } from "react";
import {
  Wallet, TriangleAlert, PackageX, TrendingUp, Handshake, ReceiptText, ArrowRight, Info,
} from "lucide-react";
import ViewHead from "../components/ViewHead";
import { LineViz, PALETTE } from "../components/Charts";
import { CAD } from "../data/inventory";
import { useDataStatus } from "../data/useDataStatus";
import { snapshotFile } from "../data/dataSource";
import { loadMonth, summarise, kpiTrend, kpiScorecard, delta } from "../data/summary";

const pct = (n, dp = 0) => (n == null ? "–" : `${(n * 100).toFixed(dp)}%`);
const longDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

/** Change badge. `better` says which direction is good; "neutral" shows no colour. */
function Delta({ value, format, better = "neutral" }) {
  if (value == null) return <span className="finding__delta finding__delta--none">no prior month</span>;
  if (Math.abs(value) < 1e-9) return <span className="finding__delta">no change</span>;
  const up = value > 0;
  const good = better === "neutral" ? null : (better === "up") === up;
  const cls = good == null ? "" : good ? " finding__delta--good" : " finding__delta--bad";
  return <span className={`finding__delta${cls}`}>{up ? "▲" : "▼"} {format(Math.abs(value))} vs prior month</span>;
}

function Finding({ icon: Icon, tone, title, value, deltaEl, text, link, onNavigate }) {
  return (
    <article className="finding" style={{ "--tone": tone }}>
      <div className="finding__head">
        <span className="finding__icon"><Icon size={18} /></span>
        <h3 className="finding__title">{title}</h3>
      </div>
      <div className="finding__value">{value}</div>
      {deltaEl}
      <p className="finding__text">{text}</p>
      {link && (
        <button className="finding__link" onClick={() => onNavigate?.(link.view)}>
          {link.label} <ArrowRight size={14} />
        </button>
      )}
    </article>
  );
}

const STATUS_LABEL = { on: "On target", watch: "Watch", off: "Off target" };
const fmtKpi = (m, v) => (v == null ? "–" : m.unit === "%" ? `${(v * 100).toFixed(1)}%`
  : m.unit === "days" ? `${Math.round(v)} days` : `${v.toFixed(m.id === "markup" ? 2 : 1)}×`);

/** North star (GMROI) with its exact decomposition, then drivers and the guardrail, each vs target. */
function Scorecard({ sc }) {
  const by = Object.fromEntries(sc.metrics.map((m) => [m.id, m]));
  const ns = by.gmroi;
  const others = sc.metrics.filter((m) => m.tier !== "north_star");
  return (
    <section className="scorecard" aria-label="Strategic KPI scorecard">
      <div className={`scorecard__north status--${ns.status ?? "none"}`}>
        <div className="scorecard__eyebrow">North star · return on inventory</div>
        <div className="scorecard__value">{fmtKpi(ns, ns.value)} <span>GMROI</span></div>
        <div className="scorecard__identity">
          = {fmtKpi(by.markup, by.markup.value)} markup on cost × {fmtKpi(by.turns, by.turns.value)} turns
        </div>
        <div className="scorecard__target">
          Target {fmtKpi(ns, ns.target)} · <span className={`status-pill status-pill--${ns.status}`}>{STATUS_LABEL[ns.status] ?? "No target"}</span>
        </div>
      </div>
      <div className="scorecard__drivers">
        {others.map((m) => (
          <div key={m.id} className={`scorecard__kpi status--${m.status ?? "none"}`}>
            <div className="scorecard__tier">{m.tier === "guardrail" ? "Guardrail" : "Driver"}</div>
            <div className="scorecard__name">{m.name}</div>
            <div className="scorecard__kpival">{fmtKpi(m, m.value)}</div>
            <div className="scorecard__kpitarget">
              target {fmtKpi(m, m.target)} · <span className={`status-pill status-pill--${m.status}`}>{STATUS_LABEL[m.status] ?? "–"}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="scorecard__note">
        Targets are this business's own best rolling 3-month average over the last 12 month-ends: performance it has
        already sustained. Within 10% of target is "watch". GMROI = markup on cost × turns exactly, so it rises by earning
        more per unit or holding less stock for the same sales; the stock-out rate guards against buying GMROI with empty shelves.
      </p>
    </section>
  );
}

const CHECK_LABEL = {
  negative_on_hand: "No site holds negative stock",
  negative_bin_stock: "No DC bin holds negative stock",
  missing_sales_rows: "A sales row for every store, SKU and day",
  receipts_exceed_ordered: "No PO line received beyond what was ordered",
  inventory_fact_reconciles: "Inventory fact reconciles to the stock ledger",
  sales_loaded_through_as_of: "Sales loaded through the as-of date",
  price_above_cost: "Every product sells above cost",
  open_po_without_plan: "Every open PO is progressing",
  bin_over_capacity: "No DC bin over capacity",
  price_history_current: "Price history matches the current price list",
  price_history_coverage: "Every product has a dated cost and price from day one",
};

/** Results of the data-quality gates for the load behind this month's numbers. */
function DataTrust({ checks }) {
  const passed = checks.filter((c) => c.passed).length;
  const warns = checks.filter((c) => !c.passed && c.severity === "warn");
  return (
    <details className="method-box data-trust">
      <summary>
        Data quality: <b>{passed} of {checks.length} checks passed</b>
        {warns.length > 0 && <> · {warns.length} warning{warns.length > 1 ? "s" : ""}</>} for the load behind this month
      </summary>
      <table className="table">
        <thead><tr><th>Check</th><th>Severity</th><th className="num-cell">Exceptions</th><th>Result</th></tr></thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.checkName}>
              <td>{CHECK_LABEL[c.checkName] ?? c.checkName}</td>
              <td>{c.severity === "error" ? "Blocks the load" : "Warning"}</td>
              <td className="num-cell">{c.observed == null ? "–" : Number(c.observed).toLocaleString("en-CA")}</td>
              <td><span className={`status-pill status-pill--${c.passed ? "on" : c.severity === "warn" ? "watch" : "off"}`}>{c.passed ? "Passed" : "Flagged"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted-note" style={{ margin: "8px 0 0" }}>A failed blocking check rolls the whole load back, so these numbers only exist because every blocking check passed.</p>
    </details>
  );
}

function buildFindings(cur, prev) {
  const { investment: inv, risk, kpis, suppliers: sup, payables: pay } = cur;
  const p = prev ?? {};
  return [
    {
      icon: Wallet, tone: "#1a6790", title: "Inventory investment (at cost)",
      value: CAD(inv.value),
      deltaEl: <Delta value={delta(inv.value, p.investment?.value)} format={CAD} />,
      text: `${pct(inv.reserveShare)} of it (${CAD(inv.reserve)}) sits in warehouse reserve rather than on store shelves${inv.reserveShare > 0.7 ? ", which is capital that isn't selling yet." : "."}`,
      link: { label: "See where it sits", view: "offshelf" },
    },
    {
      icon: TriangleAlert, tone: "#d0563f", title: "Sales at risk over the next lead time",
      value: CAD(risk.value),
      deltaEl: <Delta value={delta(risk.value, p.risk?.value)} format={CAD} better="down" />,
      text: `${risk.out} store/DC positions are out of stock and ${risk.belowRop} are below their reorder point. This is the demand their current stock can't cover before a replenishment arrives, at retail price.`,
      link: { label: "Open the reorder queue", view: "reorder" },
    },
    {
      icon: PackageX, tone: "#f4a63b", title: "Store stock-out rate (month)",
      value: pct(kpis.stockoutRate, 1),
      deltaEl: <Delta value={delta(kpis.stockoutRate, p.kpis?.stockoutRate)} format={(v) => `${(v * 100).toFixed(1)} pts`} better="down" />,
      text: "Share of store-SKU-days with no stock on the shelf. Every point here is lost sales and a customer who may not come back.",
      link: { label: "Inventory overview", view: "overview" },
    },
    {
      icon: TrendingUp, tone: "#2e9e6b", title: "GMROI (month, network)",
      value: kpis.gmroi == null ? "–" : `${kpis.gmroi.toFixed(1)}×`,
      deltaEl: <Delta value={delta(kpis.gmroi, p.kpis?.gmroi)} format={(v) => `${v.toFixed(1)}×`} better="up" />,
      text: `Gross margin earned per dollar of inventory at cost, counting the DC stock behind every store, annualised. Stock turns ${kpis.turns == null ? "–" : kpis.turns.toFixed(1)}× a year: about ${kpis.daysOfSupply == null ? "–" : Math.round(kpis.daysOfSupply)} days of supply.`,
      link: { label: "Inventory overview", view: "overview" },
    },
    {
      icon: Handshake, tone: "#7a5cc4", title: "Supplier concentration",
      value: `${pct(sup.top3Share)} of spend`,
      deltaEl: <Delta value={delta(sup.top3Share, p.suppliers?.top3Share)} format={(v) => `${(v * 100).toFixed(1)} pts`} better="down" />,
      text: `with the top three suppliers (${sup.top3Names.join(", ")}), year to date. ${sup.watchlistCount === 0
        ? "No supplier is on the Watchlist, so concentration, not performance, is the risk to manage."
        : `${sup.watchlistCount} Watchlist supplier${sup.watchlistCount === 1 ? " still takes" : "s still take"} ${pct(sup.watchlistShare)} (${CAD(sup.watchlistSpend)}).`}`,
      link: { label: "Supplier performance", view: "supplier-perf" },
    },
    {
      icon: ReceiptText, tone: "#57b0d6", title: "Overdue supplier payables",
      value: CAD(pay.overdue),
      deltaEl: <Delta value={delta(pay.overdue, p.payables?.overdue)} format={CAD} better="down" />,
      text: `of ${CAD(pay.outstanding)} in open supplier invoices. Overdue balances cost early-payment discounts and supplier goodwill.`,
      link: { label: "Procure-to-pay", view: "orders" },
    },
  ];
}

export default function ExecutiveSummary({ viewLabel, onNavigate }) {
  const { month, months } = useDataStatus();
  const prevMonth = months[months.indexOf(month) + 1] ?? null;
  const [state, setState] = useState({ month: null });

  useEffect(() => {
    if (!month) return undefined;
    let cancelled = false;
    Promise.all([loadMonth(month, snapshotFile), prevMonth ? loadMonth(prevMonth, snapshotFile) : null]).then(([cur, prev]) => {
      if (cancelled) return;
      setState({
        month,
        cur: cur.dataset ? summarise(cur, month) : null,
        prev: prev?.dataset ? summarise(prev, prevMonth) : null,
        trend: kpiTrend(cur.networkKpis),
        scorecard: kpiScorecard(cur.networkKpis, month),
        quality: Array.isArray(cur.dataQuality) ? cur.dataQuality : null,
      });
    });
    return () => { cancelled = true; };
  }, [month, prevMonth]);

  const ready = state.month === month && state.cur;

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Executive Summary"
        desc={month
          ? prevMonth
            ? `Where the business stands at ${longDate(month)}, what moved since ${longDate(prevMonth)}, and where to act.`
            : `Where the business stands at ${longDate(month)}, the earliest month-end published, so there is no prior month to compare with.`
          : "Headline findings appear once the published data has loaded."}
      />

      {!month && <p className="empty-note">This summary needs the published month-end data, which isn't available in offline demo mode.</p>}
      {month && !ready && <p className="empty-note">Loading the month-end figures…</p>}

      {ready && (
        <>
          {state.scorecard && <Scorecard sc={state.scorecard} />}

          <h2 className="section-title">What changed, and where to act</h2>
          <section className="findings" aria-label="Headline findings">
            {buildFindings(state.cur, state.prev).map((f) => (
              <Finding key={f.title} {...f} onNavigate={onNavigate} />
            ))}
          </section>

          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div className="chart-card__head">
              <div>
                <h4 className="chart-card__title">Return vs availability, trailing 12 months</h4>
                <p className="chart-card__sub">Network GMROI (×) and store stock-out rate (%), by month</p>
              </div>
            </div>
            <LineViz
              data={state.trend}
              xKey="month"
              height={240}
              series={[
                { key: "gmroi", name: "GMROI (×)", color: PALETTE.teal },
                { key: "stockoutPct", name: "Stock-out rate (%)", color: PALETTE.accent },
              ]}
            />
          </div>

          {state.quality && <DataTrust checks={state.quality} />}

          <details className="method-box">
            <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> How these figures are calculated</summary>
            <ul>
              <li><b>Inventory investment:</b> units on hand at stores and DCs × unit cost. Reserve = units in DC bins.</li>
              <li><b>Sales at risk:</b> for each store/DC position out of stock or below its statistical reorder point, max(0, average daily demand × mean supplier lead time − units on hand) × retail price.</li>
              <li><b>Stock-out rate:</b> share of store-SKU-days in the month that ended with zero stock on hand.</li>
              <li><b>GMROI:</b> gross margin from all stores ÷ average daily inventory at cost across stores <i>and</i> DCs, annualised. Store-level GMROI would ignore the DC stock behind every sale and overstate the return. <b>Turns:</b> cost of goods sold ÷ the same inventory, annualised; <b>days of supply</b> = inventory ÷ average daily cost of goods sold.</li>
              <li><b>Supplier concentration:</b> share of year-to-date purchase spend; Watchlist = suppliers whose weighted scorecard is below 58.</li>
              <li><b>Comparisons</b> use the previous month-end's published snapshot, computed with the same code. All data is synthetic.</li>
            </ul>
          </details>
        </>
      )}
    </>
  );
}
