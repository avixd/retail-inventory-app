/**
 * Working Capital: inventory as cash. How much stock is held at cost, how much
 * of it suppliers are financing through payment terms, how many days the
 * business finances itself (DIO - DPO), where stock sits above the policy's
 * natural maximum, and how old the warehouse stock is.
 * Maths: src/data/planning.js workingCapital().
 */
import { Banknote, Handshake, Building2, CalendarClock, Info } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { LineViz, PALETTE } from "../components/Charts";
import { CAD } from "../data/inventory";
import { useMonthFiles, itemsOf } from "../data/useMonthFiles";
import { workingCapital } from "../data/planning";

const FILES = ["dataset.json", "replenishment.json", "procurement-summary.json", "kpis-network.json"];

export default function WorkingCapital({ viewLabel }) {
  const { loading, month, files } = useMonthFiles(FILES);
  if (loading) return <><ViewHead viewLabel={viewLabel} title="Working Capital" /><p className="empty-note">Loading…</p></>;
  if (!files["dataset.json"] || !month) return <><ViewHead viewLabel={viewLabel} title="Working Capital" /><p className="empty-note">Data isn't published for this month.</p></>;

  const wc = workingCapital({
    dataset: files["dataset.json"], replenishment: files["replenishment.json"],
    procurement: files["procurement-summary.json"], networkKpis: files["kpis-network.json"],
  }, month);
  const net = itemsOf(files["kpis-network.json"]).find((k) => k.month === `${month.slice(0, 7)}-01`);
  const dailyCogs = net?.avgInventoryCost && net?.daysOfSupply ? net.avgInventoryCost / net.daysOfSupply : null;
  const supplierShare = wc.inventory ? wc.payables / wc.inventory : 0;
  const agedShare = wc.inventory ? wc.aging.slice(2).reduce((s, b) => s + b.value, 0) / wc.inventory : 0;

  const kpis = [
    { icon: Banknote, label: "Inventory at cost", val: CAD(wc.inventory), tone: "#1a6790" },
    { icon: Handshake, label: `Funded by suppliers (${Math.round(supplierShare * 100)}%, open invoices)`, val: CAD(wc.payables), tone: "#2e9e6b" },
    { icon: Building2, label: "Funded by the business", val: CAD(Math.max(wc.ownFunded, 0)), tone: "#7a5cc4" },
    { icon: CalendarClock, label: "Days the business finances (DIO − DPO)", val: wc.gapDays == null ? "–" : `${wc.gapDays.toFixed(1)} days`, tone: "#f4a63b" },
  ];

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Working Capital"
        desc="Inventory as cash: who is funding it, for how long, and where it can be released."
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

      <div className="chart-card promo-callout" style={{ marginBottom: 16 }}>
        <div>
          <h4 className="chart-card__title">The cash cycle in one line</h4>
          <p className="chart-card__sub">
            Stock lasts <b>{wc.dio?.toFixed(0)} days</b> (days inventory outstanding); suppliers are paid on{" "}
            <b>{wc.dpo?.toFixed(0)}-day</b> terms on average, weighted by spend (days payable outstanding). Sales are card
            and cash, so there are no receivables: the business finances about <b>{wc.gapDays?.toFixed(1)} days</b> of stock itself.
            {dailyCogs && <> Each day of inventory removed releases roughly <b>{CAD(dailyCogs)}</b> of cash.</>}
          </p>
        </div>
      </div>

      <div className="chart-grid" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">Days of inventory vs supplier terms, 12 months</h4>
              <p className="chart-card__sub">The gap between the lines is the cash cycle the business funds.</p>
            </div>
          </div>
          <LineViz
            data={wc.trend}
            xKey="month"
            height={240}
            series={[
              { key: "dio", name: "Days inventory outstanding", color: PALETTE.teal },
              { key: "dpo", name: "Days payable (terms, current)", color: PALETTE.green },
            ]}
          />
        </div>
        <div className="chart-card">
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">Warehouse stock by age</h4>
              <p className="chart-card__sub">Days since each DC bin last moved, at cost.</p>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Age</th><th className="num-cell">Units</th><th className="num-cell">Value</th></tr></thead>
            <tbody>
              {wc.aging.map((b) => (
                <tr key={b.label}><td>{b.label}</td><td className="num-cell">{b.units.toLocaleString("en-CA")}</td><td className="num-cell">{CAD(b.value)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted-note" style={{ margin: "10px 22px 18px" }}>
            {agedShare < 0.01
              ? "Under 1% of inventory value is older than 60 days: stock is moving, so the cash lever is how much is held, not ageing."
              : `${(agedShare * 100).toFixed(1)}% of inventory value is older than 60 days: candidates for markdown or return to vendor.`}
          </p>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Excess stock: above the policy's natural maximum</h4>
            <p className="chart-card__sub">On hand beyond reorder point + order quantity. {CAD(wc.excessValue)} across {wc.excessRows.length} positions.</p>
          </div>
        </div>
        {wc.excessRows.length ? (
          <div className="scroll-tile" tabIndex={0} role="region" aria-label="Excess stock positions">
            <table className="table">
              <thead><tr><th>SKU</th><th>Product</th><th>Site</th><th>ABC</th><th className="num-cell">Excess units</th><th className="num-cell">Value at cost</th></tr></thead>
              <tbody>
                {wc.excessRows.slice(0, 15).map((r) => (
                  <tr key={`${r.sku}-${r.location}`}>
                    <td style={{ fontWeight: 700 }}>{r.sku}</td><td>{r.name}</td><td>{r.location}</td><td>{r.abc}</td>
                    <td className="num-cell">{r.units}</td><td className="num-cell" style={{ fontWeight: 700 }}>{CAD(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty-note">No position holds more than its policy maximum this month.</p>}
      </div>

      <details className="method-box">
        <summary><Info size={14} style={{ verticalAlign: "-2px" }} /> Definitions</summary>
        <ul>
          <li><b>Days inventory outstanding (DIO):</b> average inventory at cost ÷ average daily cost of goods sold, across stores and DCs (= network days of supply).</li>
          <li><b>Days payable outstanding (DPO):</b> supplier payment terms weighted by year-to-date spend. Contractual, not observed payment behaviour; overdue invoices (Executive Summary) mean actual DPO is somewhat longer.</li>
          <li><b>Funded by suppliers:</b> open supplier invoices, i.e. stock received but not yet paid for. <b>Funded by the business</b> = inventory at cost − open invoices.</li>
          <li><b>Excess:</b> on hand above reorder point + economic order quantity, the most a position should hold right after a delivery.</li>
          <li><b>Age:</b> days since the DC bin last moved (put-away or pick), at the month-end. Store shelves turn within days and are excluded.</li>
        </ul>
      </details>
    </>
  );
}
