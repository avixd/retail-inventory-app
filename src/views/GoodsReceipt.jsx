import { useState } from "react";
import { PackageCheck, CheckCircle2, X, Warehouse } from "lucide-react";
import ViewHead from "../components/ViewHead";
import {
  PURCHASE_ORDERS, WAREHOUSES, GRNS,
  supplierName, skuName, statusPill,
} from "../data/inventory";

const OPEN_POS = PURCHASE_ORDERS.filter((p) => ["Open", "Partially Received"].includes(p.status));

export default function GoodsReceipt({ viewLabel }) {
  const [poId, setPoId] = useState(OPEN_POS[0]?.po ?? "");
  const [warehouse, setWarehouse] = useState("WH-01");
  const po = OPEN_POS.find((p) => p.po === poId);

  const [received, setReceived] = useState(() =>
    Object.fromEntries((po?.lines ?? []).map((l, i) => [i, l.qty]))
  );
  const [recent, setRecent] = useState(GRNS);
  const [toast, setToast] = useState(null);

  const onPoChange = (id) => {
    setPoId(id);
    const next = OPEN_POS.find((p) => p.po === id);
    setReceived(Object.fromEntries((next?.lines ?? []).map((l, i) => [i, l.qty])));
  };

  const totalReceived = Object.values(received).reduce((s, v) => s + (Number(v) || 0), 0);

  const post = () => {
    const grnNo = `GRN-${702 + recent.length - GRNS.length}`;
    const entry = {
      grn: grnNo,
      po: po.po,
      supplierId: po.supplierId,
      received: "2026-07-25",
      warehouse,
      lines: po.lines.length,
      units: totalReceived,
      status: "Complete",
    };
    setRecent((prev) => [entry, ...prev]);
    setToast(`${grnNo} posted — ${totalReceived} units received into ${warehouse} (demo).`);
  };

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Goods Receipt (GRN)"
        desc="Receive stock against an open purchase order and post it into a warehouse."
      />

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel__head">
          <span className="panel__title">Receive against a purchase order</span>
          <span className="pill pill--accent">Demo form</span>
        </div>
        <div className="panel__body">
          <div className="grid-2">
            <div className="field">
              <label>Open purchase order</label>
              <select value={poId} onChange={(e) => onPoChange(e.target.value)}>
                {OPEN_POS.map((p) => (
                  <option key={p.po} value={p.po}>{p.po} — {supplierName(p.supplierId)} ({p.status})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Receive into warehouse</label>
              <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                {WAREHOUSES.filter((w) => w.type === "Distribution Center").map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {po && (
            <>
              <div className="form-section-label">Expected lines</div>
              <table className="table" style={{ marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th>SKU</th><th>Product</th>
                    <th className="num-cell">Expected</th>
                    <th className="num-cell">Receiving now</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{l.sku}</td>
                      <td>{skuName(l.sku)}</td>
                      <td className="num-cell">{l.qty}</td>
                      <td className="num-cell">
                        <input
                          className="cell-input"
                          type="number"
                          min="0"
                          max={l.qty}
                          value={received[i] ?? 0}
                          onChange={(e) => setReceived((prev) => ({ ...prev, [i]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="form-actions">
                <button className="btn" onClick={post}><PackageCheck size={15} /> Post goods receipt</button>
                <span className="muted-note">
                  Receiving <strong>{totalReceived}</strong> units into {warehouse} — demo only.
                </span>
              </div>
            </>
          )}

          {toast && (
            <div className="toast" style={{ marginTop: 16 }}>
              <CheckCircle2 size={16} /> {toast}
              <button onClick={() => setToast(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit" }} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Recent goods receipts</h4>
            <p className="chart-card__sub">Posted receipts against purchase orders</p>
          </div>
          <span className="pill">{recent.length} GRNs</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>GRN #</th><th>PO ref</th><th>Supplier</th><th>Received</th>
              <th><Warehouse size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />Warehouse</th>
              <th className="num-cell">Lines</th><th className="num-cell">Units</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((g) => (
              <tr key={g.grn}>
                <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{g.grn}</td>
                <td>{g.po}</td>
                <td>{supplierName(g.supplierId)}</td>
                <td>{g.received}</td>
                <td>{g.warehouse}</td>
                <td className="num-cell">{g.lines}</td>
                <td className="num-cell" style={{ fontWeight: 700 }}>{g.units}</td>
                <td><span className={`pill ${statusPill(g.status)}`}>{g.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
