import { useState } from "react";
import {
  FilePlus2, ClipboardList, ReceiptText, Plus, Trash2, Send,
  CheckCircle2, X, Building2, CalendarClock, Timer,
} from "lucide-react";
import ViewHead from "../components/ViewHead";
import { ChartCard, BarViz, PALETTE } from "../components/Charts";
import {
  PRODUCTS, SUPPLIERS, PURCHASE_ORDERS, INVOICES,
  supplierName, skuName, poTotal, poUnits, statusPill, CAD,
  poStatusSummary, avgPoCycleTime, suppliersByTerms, outstandingByTerms,
} from "../data/inventory";

const TABS = [
  { id: "place", label: "Place PO", icon: FilePlus2 },
  { id: "list", label: "Purchase Orders", icon: ClipboardList },
  { id: "invoices", label: "Supplier Invoices", icon: ReceiptText },
];

const PO_STAGES = ["Draft", "Submitted for Approval", "Open", "Partially Received", "Received", "Closed"];
function poStageIndex(status) {
  if (status === "On Hold") return PO_STAGES.indexOf("Submitted for Approval");
  const i = PO_STAGES.indexOf(status);
  return i < 0 ? 1 : i;
}

/* ---------------- Place PO · KPI dashboard ---------------- */
function PoKpiDashboard() {
  const buckets = poStatusSummary();
  const totalValue = buckets.reduce((s, b) => s + b.value, 0);
  const totalCount = buckets.reduce((s, b) => s + b.count, 0);
  const cycle = avgPoCycleTime();
  const byTerms = suppliersByTerms();
  const outstanding = outstandingByTerms();
  const totalOutstanding = outstanding.reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <div className="dash-toolbar" style={{ marginTop: 0, paddingTop: 0, border: "none" }}>
        <div>
          <div className="dash-toolbar__title">Purchase orders · YTD by status</div>
          <div className="dash-toolbar__sub">Order value and count across the procure-to-pay cycle</div>
        </div>
        <span className="pill">{CAD(totalValue)} · {totalCount} POs total</span>
      </div>

      <div className="stage-row" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {buckets.map((b) => (
          <div className="stage-card" key={b.label} style={{ "--tone": b.tone }}>
            <div className="stage-card__count" style={{ fontSize: 21 }}>{CAD(b.value)}</div>
            <div className="stage-card__name">{b.label}</div>
            <div className="stage-card__sub">{b.count} PO{b.count === 1 ? "" : "s"}</div>
          </div>
        ))}
      </div>

      <div className="p2p-grid">
        <div className="kpi-status" style={{ "--tone": "#1a6790" }}>
          <div className="kpi-status__icon"><Timer size={20} /></div>
          <div>
            <div className="kpi-status__val">{cycle.avgDays} days</div>
            <div className="kpi-status__label">Avg PO cycle time · create → close ({cycle.count} closed POs)</div>
          </div>
        </div>
        <ChartCard title="Suppliers by payment terms" subtitle="Vendor count per net term">
          <BarViz data={byTerms} xKey="terms" height={170} series={[{ key: "count", name: "Suppliers", color: PALETTE.teal }]} />
        </ChartCard>
        <ChartCard title="Outstanding payable by terms" subtitle={`${CAD(totalOutstanding)} unpaid to suppliers`}>
          <BarViz data={outstanding} xKey="terms" height={170} series={[{ key: "amount", name: "Outstanding", color: PALETTE.accent }]} />
        </ChartCard>
      </div>
    </>
  );
}

/* ---------------- Place PO form ---------------- */
function PlacePO() {
  const [supplier, setSupplier] = useState(SUPPLIERS[0].id);
  const [expected, setExpected] = useState("2026-08-15");
  const [lines, setLines] = useState([
    { sku: "SKU-1005", qty: 100 },
    { sku: "SKU-1006", qty: 200 },
  ]);
  const [confirm, setConfirm] = useState(null);

  const setLine = (i, patch) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { sku: PRODUCTS[0].sku, qty: 1 }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => {
    const p = PRODUCTS.find((x) => x.sku === l.sku);
    return s + (Number(l.qty) || 0) * (p?.unitCost ?? 0);
  }, 0);
  const units = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    setConfirm({ po: "PO-5012", supplier: supplierName(supplier), units, total, expected });
  };

  return (
    <>
      <PoKpiDashboard />
      <div className="panel">
      <div className="panel__head">
        <span className="panel__title">New purchase order</span>
        <span className="pill pill--accent">Demo form</span>
      </div>
      <div className="panel__body">
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="field">
              <label>Supplier</label>
              <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                {SUPPLIERS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.terms}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Expected delivery</label>
              <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
          </div>

          <div className="form-section-label">Line items</div>
          <table className="table" style={{ marginBottom: 10 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th className="num-cell">Unit cost</th>
                <th className="num-cell">Qty</th>
                <th className="num-cell">Line total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const p = PRODUCTS.find((x) => x.sku === l.sku);
                const lineTotal = (Number(l.qty) || 0) * (p?.unitCost ?? 0);
                return (
                  <tr key={i}>
                    <td>
                      <select
                        value={l.sku}
                        onChange={(e) => setLine(i, { sku: e.target.value })}
                        style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", fontSize: 13, fontFamily: "inherit" }}
                      >
                        {PRODUCTS.map((p2) => (
                          <option key={p2.sku} value={p2.sku}>{p2.sku} — {p2.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="num-cell">{CAD(p?.unitCost ?? 0)}</td>
                    <td className="num-cell">
                      <input
                        className="cell-input"
                        type="number"
                        min="1"
                        value={l.qty}
                        onChange={(e) => setLine(i, { qty: e.target.value })}
                      />
                    </td>
                    <td className="num-cell" style={{ fontWeight: 700 }}>{CAD(lineTotal)}</td>
                    <td>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeLine(i)} aria-label="Remove line">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button type="button" className="btn btn--ghost btn--sm" onClick={addLine}>
            <Plus size={14} /> Add line
          </button>

          <div className="form-actions">
            <button className="btn" type="submit"><Send size={15} /> Submit PO</button>
            <span className="muted-note">
              {units} units · <strong>{CAD(total)}</strong> total — demo only, nothing is sent.
            </span>
          </div>
        </form>
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setConfirm(null)}><X size={18} /></button>
            <div className="modal__icon"><CheckCircle2 size={28} /></div>
            <div className="modal__title">Purchase order created</div>
            <div className="modal__body">Your PO has been drafted and sent to the supplier (demo).</div>
            <div className="modal__meta">
              <div><b>PO number</b><span>{confirm.po}</span></div>
              <div><b>Supplier</b><span>{confirm.supplier}</span></div>
              <div><b>Units</b><span>{confirm.units}</span></div>
              <div><b>Total</b><span>{CAD(confirm.total)}</span></div>
              <div><b>Expected</b><span>{confirm.expected}</span></div>
            </div>
            <div className="modal__actions">
              <button className="btn" onClick={() => setConfirm(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

/* ---------------- PO list + detail ---------------- */
function POList() {
  const [selected, setSelected] = useState(PURCHASE_ORDERS[0].po);
  const po = PURCHASE_ORDERS.find((p) => p.po === selected);

  return (
    <>
      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Purchase orders</h4>
          <span className="pill">{PURCHASE_ORDERS.length} orders</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>PO #</th><th>Supplier</th><th>Ordered</th><th>Expected</th>
                <th className="num-cell">Units</th><th className="num-cell">Value</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PURCHASE_ORDERS.map((p) => (
                <tr
                  key={p.po}
                  className={`row-link${selected === p.po ? " is-selected" : ""}`}
                  onClick={() => setSelected(p.po)}
                >
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{p.po}</td>
                  <td>{supplierName(p.supplierId)}</td>
                  <td>{p.orderDate}</td>
                  <td>{p.expected}</td>
                  <td className="num-cell">{poUnits(p)}</td>
                  <td className="num-cell">{CAD(poTotal(p))}</td>
                  <td><span className={`pill ${statusPill(p.status)}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {po && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">{po.po} · {supplierName(po.supplierId)}</h4>
              <p className="chart-card__sub">Ordered {po.orderDate} · expected {po.expected}</p>
            </div>
            <span className={`pill ${statusPill(po.status)}`}>{po.status}</span>
          </div>

          <div className="stepper">
            {PO_STAGES.map((s, i) => {
              const cur = poStageIndex(po.status);
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
              <tr>
                <th>SKU</th><th>Product</th>
                <th className="num-cell">Qty</th>
                <th className="num-cell">Unit cost</th>
                <th className="num-cell">Line total</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{l.sku}</td>
                  <td>{skuName(l.sku)}</td>
                  <td className="num-cell">{l.qty}</td>
                  <td className="num-cell">{CAD(l.unitCost)}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{CAD(l.qty * l.unitCost)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: 700, color: "var(--ink-900)" }}>Order total</td>
                <td className="num-cell" style={{ fontWeight: 800, color: "var(--teal-700)" }}>{CAD(poTotal(po))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- Invoices ---------------- */
function InvoiceList() {
  const [selected, setSelected] = useState(INVOICES[0].inv);
  const inv = INVOICES.find((x) => x.inv === selected);
  const totalOpen = INVOICES.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <div className="chart-card">
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Supplier invoices</h4>
            <p className="chart-card__sub">Billing received against historical purchase orders</p>
          </div>
          <span className="pill pill--accent">{CAD(totalOpen)} outstanding</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th><th>PO ref</th><th>Supplier</th><th>Invoiced</th>
                <th>Due</th><th className="num-cell">Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((x) => (
                <tr
                  key={x.inv}
                  className={`row-link${selected === x.inv ? " is-selected" : ""}`}
                  onClick={() => setSelected(x.inv)}
                >
                  <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{x.inv}</td>
                  <td>{x.po}</td>
                  <td>{supplierName(x.supplierId)}</td>
                  <td>{x.invoiceDate}</td>
                  <td>{x.dueDate}</td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{CAD(x.amount)}</td>
                  <td><span className={`pill ${statusPill(x.status)}`}>{x.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {inv && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">{inv.inv}</h4>
              <p className="chart-card__sub">Against {inv.po} · {supplierName(inv.supplierId)}</p>
            </div>
            <span className={`pill ${statusPill(inv.status)}`}>{inv.status}</span>
          </div>
          <div className="report-detail">
            <div>
              <div className="detail-field">
                <div className="detail-field__k"><Building2 size={11} style={{ verticalAlign: "-1px" }} /> Supplier</div>
                <div className="detail-field__v">{supplierName(inv.supplierId)}</div>
              </div>
              <div className="detail-field">
                <div className="detail-field__k">Purchase order</div>
                <div className="detail-field__v">{inv.po}</div>
              </div>
            </div>
            <div>
              <div className="detail-field">
                <div className="detail-field__k"><CalendarClock size={11} style={{ verticalAlign: "-1px" }} /> Invoice / due date</div>
                <div className="detail-field__v">{inv.invoiceDate} → {inv.dueDate}</div>
              </div>
              <div className="detail-field">
                <div className="detail-field__k">Amount due</div>
                <div className="detail-field__v" style={{ fontSize: 20, color: "var(--teal-700)" }}>{CAD(inv.amount)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Shell ---------------- */
export default function Orders({ viewLabel }) {
  const [tab, setTab] = useState("place");

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Orders · Procure-to-Pay"
        desc="Raise purchase orders, track open orders, and reconcile supplier invoices."
      />

      <div className="segtab">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`segtab__btn${tab === id ? " is-on" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "place" && <PlacePO />}
      {tab === "list" && <POList />}
      {tab === "invoices" && <InvoiceList />}
    </>
  );
}
