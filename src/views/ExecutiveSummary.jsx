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
import { loadMonth, summarise, kpiTrend, delta } from "../data/summary";

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
