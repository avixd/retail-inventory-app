import { useState } from "react";
import {
  Truck, PackageCheck, Hourglass, Boxes, ArrowRight, Plus,
  Trash2, Send, CheckCircle2, X,
} from "lucide-react";
import ViewHead from "../components/ViewHead";
import {
  TRANSFER_ORDERS, WAREHOUSES, PRODUCTS,
  warehouseName, skuName, statusPill,
} from "../data/inventory";

const TR_STAGES = ["Draft", "Picked", "In Transit", "Received"];
const trStageIndex = (s) => Math.max(0, TR_STAGES.indexOf(s));
const toUnits = (t) => t.lines.reduce((s, l) => s + l.qty, 0);

function NewTransferForm({ onSubmit }) {
  const [fromWh, setFromWh] = useState("WH-01");
  const [toWh, setToWh] = useState("ST-11");
  const [lines, setLines] = useState([{ sku: "SKU-1001", qty: 20 }]);

  const setLine = (i, patch) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { sku: PRODUCTS[0].sku, qty: 1 }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));
  const units = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel__head">
        <span className="panel__title">New transfer order</span>
        <span className="pill pill--accent">Demo form</span>
      </div>
      <div className="panel__body">
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(units); }}>
          <div className="grid-2">
            <div className="field">
              <label>From warehouse</label>
              <select value={fromWh} onChange={(e) => setFromWh(e.target.value)}>
                {WAREHOUSES.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>To warehouse / store</label>
              <select value={toWh} onChange={(e) => setToWh(e.target.value)}>
                {WAREHOUSES.filter((w) => w.id !== fromWh).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-label">Items to transfer</div>
          <table className="table" style={{ marginBottom: 10 }}>
            <thead>
              <tr><th>Product</th><th className="num-cell">Qty</th><th></th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select
                      value={l.sku}
                      onChange={(e) => setLine(i, { sku: e.target.value })}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", fontSize: 13, fontFamily: "inherit" }}
                    >
                      {PRODUCTS.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.name}</option>)}
                    </select>
                  </td>
                  <td className="num-cell">
                    <input className="cell-input" type="number" min="1" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                  </td>
                  <td>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeLine(i)} aria-label="Remove line">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn--ghost btn--sm" onClick={addLine}><Plus size={14} /> Add item</button>

          <div className="form-actions">
            <button className="btn" type="submit"><Send size={15} /> Create transfer</button>
            <span className="muted-note">
              <span className="route">{fromWh} <ArrowRight size={14} /> {toWh}</span> · {units} units — demo only.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TransferOrders({ viewLabel }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(TRANSFER_ORDERS[0].to);
  const [toast, setToast] = useState(null);

  const tr = TRANSFER_ORDERS.find((t) => t.to === selected);

  const inTransit = TRANSFER_ORDERS.filter((t) => t.status === "In Transit").length;
  const pending = TRANSFER_ORDERS.filter((t) => t.status === "Draft" || t.status === "Picked").length;
  const received = TRANSFER_ORDERS.filter((t) => t.status === "Received").length;
  const unitsInTransit = TRANSFER_ORDERS.filter((t) => t.status === "In Transit").reduce((s, t) => s + toUnits(t), 0);

  const kpis = [
    { icon: Truck, label: "In transit", val: inTransit, tone: "#1a6790" },
    { icon: Hourglass, label: "Draft / picked", val: pending, tone: "#f4a63b" },
    { icon: PackageCheck, label: "Received", val: received, tone: "#2e9e6b" },
    { icon: Boxes, label: "Units in transit", val: unitsInTransit, tone: "#7a5cc4" },
  ];

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Transfer Orders"
        desc="Move off-shelf stock between warehouses and stores — track each transfer end to end."
        right={
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            <Plus size={15} /> New transfer
          </button>
        }
      />

      {showForm && (
        <NewTransferForm
          onSubmit={(units) => {
            setShowForm(false);
            setToast(`Transfer TO-321 created for ${units} units (demo).`);
          }}
        />
      )}

      {toast && (
        <div className="toast" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} /> {toast}
          <button onClick={() => setToast(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit" }} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

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

      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Transfer orders</h4>
          <span className="pill">{TRANSFER_ORDERS.length} transfers</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>TO #</th><th>Route</th><th>Status</th><th>Ship date</th>
                <th>ETA</th><th className="num-cell">Units</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFER_ORDERS.map((t) => (
                <tr
                  key={t.to}
                  className={`row-link${selected === t.to ? " is-selected" : ""}`}
                  onClick={() => setSelected(t.to)}
                >
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{t.to}</td>
                  <td>
                    <span className="route">{t.fromWh} <ArrowRight size={13} /> {t.toWh}</span>
                  </td>
                  <td><span className={`pill ${statusPill(t.status)}`}>{t.status}</span></td>
                  <td>{t.shipDate}</td>
                  <td>{t.eta}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{toUnits(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {tr && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">{tr.to}</h4>
              <p className="chart-card__sub">
                {warehouseName(tr.fromWh)} → {warehouseName(tr.toWh)}
              </p>
            </div>
            <span className={`pill ${statusPill(tr.status)}`}>{tr.status}</span>
          </div>

          <div className="stepper">
            {TR_STAGES.map((s, i) => {
              const cur = trStageIndex(tr.status);
              const cls = i < cur ? "is-done" : i === cur ? "is-current" : "";
              return (
                <div className={`step ${cls}`} key={s}>
                  <div className="step__dot">{i < cur ? "✓" : i + 1}</div>
                  <div className="step__name">{s}</div>
                </div>
              );
            })}
          </div>

          <table className="table">
            <thead>
              <tr><th>SKU</th><th>Product</th><th className="num-cell">Qty</th></tr>
            </thead>
            <tbody>
              {tr.lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{l.sku}</td>
                  <td>{skuName(l.sku)}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{l.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
