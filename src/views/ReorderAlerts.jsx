import { useState } from "react";
import { TriangleAlert, PackageX, ShoppingCart, DollarSign, CheckCircle2, X } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { ChartCard, BarViz, PALETTE } from "../components/Charts";
import { lowStock, supplierName, CAD } from "../data/inventory";

const LEVEL_PILL = {
  "Out of stock": "pill--danger",
  "Below reorder": "pill--accent",
  Low: "pill--accent",
};

export default function ReorderAlerts({ viewLabel }) {
  const lows = lowStock();
  const [toast, setToast] = useState(null);

  const outOfStock = lows.filter((l) => l.level === "Out of stock").length;
  const belowReorder = lows.filter((l) => l.level === "Below reorder").length;
  const suggestedValue = lows.reduce((s, l) => s + l.suggested * l.unitCost, 0);

  const kpis = [
    { icon: TriangleAlert, label: "Needs replenishment", val: lows.length, tone: "#f4a63b" },
    { icon: PackageX, label: "Out of stock", val: outOfStock, tone: "#d0563f" },
    { icon: ShoppingCart, label: "Below reorder point", val: belowReorder, tone: "#1a6790" },
    { icon: DollarSign, label: "Suggested PO value", val: CAD(suggestedValue), tone: "#2e9e6b" },
  ];

  const chartData = lows.map((l) => ({
    name: l.sku.replace("SKU-", ""),
    onHand: l.onHand,
    reorder: l.reorderPoint,
  }));

  const createPO = (l) => {
    setToast(`Draft PO created for ${l.suggested} × ${l.name} from ${supplierName(l.supplierId)} (demo).`);
  };

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Reorder / Low-Stock Alerts"
        desc="SKUs at or below their reorder point, with a suggested order quantity to reach safety stock."
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
            <h4 className="chart-card__title">On-hand vs reorder point</h4>
            <p className="chart-card__sub">Flagged SKUs — bars below the reorder line need action</p>
          </div>
        </div>
        <BarViz
          data={chartData}
          xKey="name"
          height={240}
          series={[
            { key: "onHand", name: "On hand", color: PALETTE.teal },
            { key: "reorder", name: "Reorder point", color: PALETTE.accent },
          ]}
        />
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Replenishment queue</h4>
          <span className="pill pill--accent">{lows.length} SKUs</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th><th>Product</th><th>Category</th>
              <th className="num-cell">On hand</th>
              <th className="num-cell">Reorder pt</th>
              <th className="num-cell">Safety</th>
              <th className="num-cell">Suggested</th>
              <th>Supplier</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {lows.map((l) => (
              <tr key={l.sku}>
                <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{l.sku}</td>
                <td>{l.name}</td>
                <td>{l.category}</td>
                <td className="num-cell" style={{ fontWeight: 700 }}>{l.onHand}</td>
                <td className="num-cell">{l.reorderPoint}</td>
                <td className="num-cell">{l.safetyStock}</td>
                <td className="num-cell" style={{ fontWeight: 700, color: "var(--teal-700)" }}>{l.suggested}</td>
                <td>{supplierName(l.supplierId)}</td>
                <td><span className={`pill ${LEVEL_PILL[l.level] ?? ""}`}>{l.level}</span></td>
                <td>
                  <button className="btn btn--sm" onClick={() => createPO(l)}>
                    <ShoppingCart size={13} /> Create PO
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {toast && (
          <div className="toast" style={{ margin: "16px 22px 20px" }}>
            <CheckCircle2 size={16} /> {toast}
            <button
              onClick={() => setToast(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit" }}
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
