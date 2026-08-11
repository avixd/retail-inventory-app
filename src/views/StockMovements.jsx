/**
 * Stock Movements — recent inbound / outbound / adjustment ledger.
 * Source: MOVEMENTS.
 */
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Scale, SlidersHorizontal } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { MOVEMENTS, skuName } from "../data/inventory";

const TYPE_TONE = {
  Receipt: "#2e9e6b",
  Sale: "#1a6790",
  "Transfer Out": "#7a5cc4",
  "Transfer In": "#7a5cc4",
  Adjustment: "#f4a63b",
};

const FILTERS = ["All", "Receipt", "Sale", "Transfer", "Adjustment"];

function matches(filter, type) {
  if (filter === "All") return true;
  if (filter === "Transfer") return type.startsWith("Transfer");
  return type === filter;
}

export default function StockMovements({ viewLabel }) {
  const [filter, setFilter] = useState("All");
  const rows = MOVEMENTS.filter((m) => matches(filter, m.type));

  const inbound = MOVEMENTS.filter((m) => m.qty > 0).reduce((s, m) => s + m.qty, 0);
  const outbound = MOVEMENTS.filter((m) => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0);
  const net = inbound - outbound;
  const adjustments = MOVEMENTS.filter((m) => m.type === "Adjustment").length;

  const kpis = [
    { icon: ArrowDownToLine, label: "Inbound units", val: `+${inbound.toLocaleString()}`, tone: "#2e9e6b" },
    { icon: ArrowUpFromLine, label: "Outbound units", val: `-${outbound.toLocaleString()}`, tone: "#d0563f" },
    { icon: Scale, label: "Net change", val: `${net >= 0 ? "+" : ""}${net.toLocaleString()}`, tone: "#1a6790" },
    { icon: SlidersHorizontal, label: "Adjustments", val: adjustments, tone: "#f4a63b" },
  ];

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Stock Movements"
        desc="Audit trail of every inbound and outbound movement — receipts, sales, transfers and adjustments."
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

      <div className="chip-choices" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`chip-choice${filter === f ? " is-on" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Movement ledger</h4>
          <span className="pill">{rows.length} entries</span>
        </div>
        <div className="scroll-tile" style={{ maxHeight: 460 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th><th>Type</th><th>SKU</th><th>Product</th>
                <th className="num-cell">Qty</th><th>From</th><th>To</th><th>Reference</th><th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="ts">{m.ts}</td>
                  <td>
                    <span className="pill" style={{ background: `color-mix(in srgb, ${TYPE_TONE[m.type]} 16%, #fff)`, color: TYPE_TONE[m.type] }}>
                      {m.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{m.sku}</td>
                  <td>{skuName(m.sku)}</td>
                  <td className="num-cell">
                    <span className={m.qty >= 0 ? "qty-pos" : "qty-neg"}>
                      {m.qty > 0 ? `+${m.qty}` : m.qty}
                    </span>
                  </td>
                  <td>{m.from}</td>
                  <td>{m.to}</td>
                  <td>{m.ref}</td>
                  <td className="empty-note" style={{ fontSize: 12.5 }}>{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
