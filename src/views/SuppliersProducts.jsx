/**
 * Suppliers & Products — master data: the SKU catalogue (cost, price, margin)
 * and the supplier list, with drill-down from a supplier to the SKUs it
 * supplies.
 */
import { useState } from "react";
import { Contact, Package, Mail, Clock3, Star } from "lucide-react";
import ViewHead from "../components/ViewHead";
import {
  SUPPLIERS, PRODUCTS, PURCHASE_ORDERS,
  supplierName, onHand, CAD,
} from "../data/inventory";

const TABS = [
  { id: "suppliers", label: "Suppliers", icon: Contact },
  { id: "products", label: "Products / SKUs", icon: Package },
];

const openPOsFor = (id) =>
  PURCHASE_ORDERS.filter((p) => p.supplierId === id && ["Open", "Partially Received"].includes(p.status)).length;

const RATING_PILL = { A: "pill--success", B: "pill", C: "pill--accent" };

function productStatus(p) {
  const oh = onHand(p.sku);
  if (oh === 0) return { label: "Out of stock", cls: "pill--danger" };
  if (oh < p.reorderPoint) return { label: "Below reorder", cls: "pill--accent" };
  return { label: "Healthy", cls: "pill--success" };
}

/* ---------------- Suppliers ---------------- */
function SuppliersTab() {
  const [selected, setSelected] = useState(SUPPLIERS[0].id);
  const s = SUPPLIERS.find((x) => x.id === selected);

  return (
    <>
      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Supplier master</h4>
          <span className="pill">{SUPPLIERS.length} suppliers</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Supplier</th><th>Contact</th><th>Terms</th>
              <th className="num-cell">Lead (days)</th><th>Rating</th><th className="num-cell">Open POs</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLIERS.map((x) => (
              <tr
                key={x.id}
                className={`row-link${selected === x.id ? " is-selected" : ""}`}
                onClick={() => setSelected(x.id)}
              >
                <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{x.id}</td>
                <td>{x.name}</td>
                <td>{x.contact}</td>
                <td>{x.terms}</td>
                <td className="num-cell">{x.leadDays}</td>
                <td><span className={`pill ${RATING_PILL[x.rating]}`}>{x.rating}</span></td>
                <td className="num-cell">{openPOsFor(x.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {s && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">{s.name}</h4>
              <p className="chart-card__sub">{s.id} · {openPOsFor(s.id)} open purchase order(s)</p>
            </div>
            <span className={`pill ${RATING_PILL[s.rating]}`}>Rating {s.rating}</span>
          </div>
          <div className="report-detail">
            <div>
              <div className="detail-field">
                <div className="detail-field__k"><Mail size={11} style={{ verticalAlign: "-1px" }} /> Contact</div>
                <div className="detail-field__v">{s.contact} · {s.email}</div>
              </div>
              <div className="detail-field">
                <div className="detail-field__k">Payment terms</div>
                <div className="detail-field__v">{s.terms}</div>
              </div>
            </div>
            <div>
              <div className="detail-field">
                <div className="detail-field__k"><Clock3 size={11} style={{ verticalAlign: "-1px" }} /> Lead time</div>
                <div className="detail-field__v">{s.leadDays} days</div>
              </div>
              <div className="detail-field">
                <div className="detail-field__k"><Star size={11} style={{ verticalAlign: "-1px" }} /> Supplied SKUs</div>
                <div className="detail-field__v">
                  {PRODUCTS.filter((p) => p.supplierId === s.id).map((p) => p.sku).join(", ") || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Products ---------------- */
function ProductsTab() {
  const [selected, setSelected] = useState(PRODUCTS[0].sku);
  const p = PRODUCTS.find((x) => x.sku === selected);
  const margin = (x) => Math.round(((x.unitPrice - x.unitCost) / x.unitPrice) * 100);

  return (
    <>
      <div className="chart-card">
        <div className="chart-card__head">
          <h4 className="chart-card__title">Product / SKU catalog</h4>
          <span className="pill">{PRODUCTS.length} SKUs</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Category</th>
                <th className="num-cell">Cost</th><th className="num-cell">Price</th><th className="num-cell">Margin</th>
                <th className="num-cell">Reorder pt</th><th className="num-cell">On hand</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((x) => {
                const st = productStatus(x);
                return (
                  <tr
                    key={x.sku}
                    className={`row-link${selected === x.sku ? " is-selected" : ""}`}
                    onClick={() => setSelected(x.sku)}
                  >
                    <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{x.sku}</td>
                    <td>{x.name}</td>
                    <td>{x.category}</td>
                    <td className="num-cell">{CAD(x.unitCost)}</td>
                    <td className="num-cell">{CAD(x.unitPrice)}</td>
                    <td className="num-cell">{margin(x)}%</td>
                    <td className="num-cell">{x.reorderPoint}</td>
                    <td className="num-cell" style={{ fontWeight: 700 }}>{onHand(x.sku)}</td>
                    <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {p && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">{p.sku} — {p.name}</h4>
              <p className="chart-card__sub">{p.category} · supplied by {supplierName(p.supplierId)}</p>
            </div>
            <span className={`pill ${productStatus(p).cls}`}>{productStatus(p).label}</span>
          </div>
          <div className="report-detail">
            <div>
              <div className="detail-field">
                <div className="detail-field__k">Unit economics</div>
                <div className="detail-field__v">Cost {CAD(p.unitCost)} · Price {CAD(p.unitPrice)} · {margin(p)}% margin</div>
              </div>
              <div className="detail-field">
                <div className="detail-field__k">Unit of measure</div>
                <div className="detail-field__v">{p.uom}</div>
              </div>
            </div>
            <div>
              <div className="detail-field">
                <div className="detail-field__k">Reorder point / safety stock</div>
                <div className="detail-field__v">{p.reorderPoint} / {p.safetyStock}</div>
              </div>
              <div className="detail-field">
                <div className="detail-field__k">On hand</div>
                <div className="detail-field__v" style={{ fontSize: 20, color: "var(--teal-700)" }}>{onHand(p.sku)} {p.uom}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Shell ---------------- */
export default function SuppliersProducts({ viewLabel }) {
  const [tab, setTab] = useState("suppliers");

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Suppliers & Products"
        desc="Master data behind every order and stock position — vendors and the SKU catalog."
      />

      <div className="segtab">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`segtab__btn${tab === id ? " is-on" : ""}`} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "suppliers" ? <SuppliersTab /> : <ProductsTab />}
    </>
  );
}
