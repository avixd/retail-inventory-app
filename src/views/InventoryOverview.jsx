/**
 * Inventory Overview — "where do we stand?"
 * Headline KPIs and inventory value split by category and location, plus a
 * six-month on-hand trend. Location scope filters on-shelf (stores) and
 * off-shelf (DCs) independently.
 * Selectors: totals(), scopedRows(), unitsByCategory(); data: STOCK_TREND.
 */
import { useState } from "react";
import { Package, Store, Warehouse, DollarSign, TriangleAlert, Filter, RotateCcw } from "lucide-react";
import ViewHead from "../components/ViewHead";
import { ChartCard, DonutViz, BarViz, AreaViz, PALETTE } from "../components/Charts";
import {
  PRODUCTS, STOCK_TREND, STORES, DCS,
  scopedRows, onShelfByStore, offShelfByWarehouse,
  productBySku, onHand, lowStock, CAD,
} from "../data/inventory";

const uniq = (a) => [...new Set(a)];

function parseLoc(v) {
  if (v === "type:store") return { kind: "type", type: "store" };
  if (v === "type:dc") return { kind: "type", type: "dc" };
  if (v.startsWith("loc:")) {
    const id = v.slice(4);
    return { kind: "loc", id, type: id.startsWith("ST-") ? "store" : "dc" };
  }
  return { kind: "all" };
}

function skuStatus(sku) {
  const p = productBySku(sku);
  const oh = onHand(sku); // health is based on total on-hand, not the location-scoped view
  if (oh === 0) return { label: "Out of stock", cls: "pill--danger" };
  if (oh < p.reorderPoint) return { label: "Below reorder", cls: "pill--accent" };
  if (oh <= p.reorderPoint + p.safetyStock * 0.25) return { label: "Low", cls: "pill--accent" };
  return { label: "Healthy", cls: "pill--success" };
}

export default function InventoryOverview({ viewLabel }) {
  const [dept, setDept] = useState("All");
  const [cls, setCls] = useState("All");
  const [sub, setSub] = useState("All");
  const [style, setStyle] = useState("All");
  const [locSel, setLocSel] = useState("all");
  const [selected, setSelected] = useState(null);

  /* cascading hierarchy option lists */
  const inDept = (p) => dept === "All" || p.department === dept;
  const inCls = (p) => cls === "All" || p.class === cls;
  const inSub = (p) => sub === "All" || p.subclass === sub;
  const departments = uniq(PRODUCTS.map((p) => p.department));
  const classes = uniq(PRODUCTS.filter(inDept).map((p) => p.class));
  const subclasses = uniq(PRODUCTS.filter((p) => inDept(p) && inCls(p)).map((p) => p.subclass));
  const styles = uniq(PRODUCTS.filter((p) => inDept(p) && inCls(p) && inSub(p)).map((p) => p.style));

  const onDept = (v) => { setDept(v); setCls("All"); setSub("All"); setStyle("All"); };
  const onCls = (v) => { setCls(v); setSub("All"); setStyle("All"); };
  const onSub = (v) => { setSub(v); setStyle("All"); };
  const reset = () => { setDept("All"); setCls("All"); setSub("All"); setStyle("All"); setLocSel("all"); };

  const visible = PRODUCTS.filter(
    (p) => inDept(p) && inCls(p) && inSub(p) && (style === "All" || p.style === style)
  );
  const visibleSkus = visible.map((p) => p.sku);
  const loc = parseLoc(locSel);

  /* scoped roll-up — the single source for KPIs, shelf split, category chart, table */
  const rows = scopedRows(visibleSkus, loc);
  const onShelfUnits = rows.reduce((s, r) => s + r.onShelf, 0);
  const offShelfUnits = rows.reduce((s, r) => s + r.offShelf, 0);
  const units = onShelfUnits + offShelfUnits;
  const onShelfPct = units ? Math.round((onShelfUnits / units) * 100) : 0;
  const offShelfPct = units ? 100 - onShelfPct : 0;

  const val = rows.reduce(
    (a, r) => {
      const p = productBySku(r.sku);
      a.onCost += r.onShelf * p.unitCost;
      a.onRetail += r.onShelf * p.unitPrice;
      a.offCost += r.offShelf * p.unitCost;
      a.offRetail += r.offShelf * p.unitPrice;
      return a;
    },
    { onCost: 0, onRetail: 0, offCost: 0, offRetail: 0 }
  );
  const totalCost = val.onCost + val.offCost;

  const storeData = onShelfByStore(visibleSkus, loc);
  const whData = offShelfByWarehouse(visibleSkus, loc);

  /* units by category (scoped) */
  const catMap = {};
  rows.forEach((r) => {
    const c = productBySku(r.sku).category;
    catMap[c] = (catMap[c] || 0) + r.onShelf + r.offShelf;
  });
  const catData = Object.entries(catMap)
    .map(([name, u]) => ({ name, units: u }))
    .filter((d) => d.units > 0);

  const lows = lowStock().filter((l) => visibleSkus.includes(l.sku));

  const splitData = [
    { name: "On shelf", value: onShelfUnits, color: PALETTE.teal },
    { name: "Off shelf (warehouse)", value: offShelfUnits, color: PALETTE.sky },
  ];

  const kpis = [
    { icon: Package, label: "On-hand units", val: units.toLocaleString(), sub: `${visible.length} SKUs in view` },
    { icon: Store, label: "On shelf (sellable)", val: `${onShelfPct}%`, sub: `${onShelfUnits.toLocaleString()} units` },
    { icon: Warehouse, label: "Off shelf (warehouse)", val: offShelfUnits.toLocaleString(), sub: `${whData.length} warehouse${whData.length === 1 ? "" : "s"}` },
    { icon: DollarSign, label: "Inventory value (cost)", val: CAD(totalCost), sub: `${CAD(val.onRetail + val.offRetail)} retail` },
  ];

  const hierField = (label, value, onChange, options) => (
    <div className="filter-bar__field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option>All</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Current Inventory Overview"
        desc="Overall stock position across shelf availability and warehouse reserve."
        right={
          <span className="pill pill--accent" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <TriangleAlert size={13} /> {lows.length} SKUs need attention
          </span>
        }
      />

      {/* ---------- Filter bar ---------- */}
      <div className="filter-bar">
        <div className="filter-bar__lead"><Filter size={14} /> Filter by product hierarchy &amp; location</div>
        {hierField("Department", dept, onDept, departments)}
        {hierField("Class", cls, onCls, classes)}
        {hierField("Subclass", sub, onSub, subclasses)}
        {hierField("Style", style, setStyle, styles)}
        <div className="filter-bar__field">
          <label>Location</label>
          <select value={locSel} onChange={(e) => setLocSel(e.target.value)}>
            <option value="all">All locations</option>
            <option value="type:store">All storefronts</option>
            <option value="type:dc">All distribution warehouses</option>
            <optgroup label="Storefronts">
              {STORES.map((s) => <option key={s.id} value={`loc:${s.id}`}>{s.city.split(",")[0]} ({s.id})</option>)}
            </optgroup>
            <optgroup label="Distribution warehouses">
              {DCS.map((d) => <option key={d.id} value={`loc:${d.id}`}>{d.city.split(",")[0]} ({d.id})</option>)}
            </optgroup>
          </select>
        </div>
        <div className="filter-bar__meta">
          <span className="pill">{visible.length} of {PRODUCTS.length} SKUs</span>
          <button className="btn btn--ghost btn--sm" onClick={reset}><RotateCcw size={13} /> Reset</button>
        </div>
      </div>

      {/* ---------- KPIs ---------- */}
      <div className="kpi-row">
        {kpis.map(({ icon: Icon, label, val: v, sub }) => (
          <div className="kpi" key={label}>
            <div className="kpi__top"><div className="kpi__icon"><Icon size={18} /></div></div>
            <div className="kpi__val">{v}</div>
            <div className="kpi__label">{label}{sub ? ` · ${sub}` : ""}</div>
          </div>
        ))}
      </div>

      {/* ---------- Shelf split: donut + value breakdown ---------- */}
      <ChartCard title="Shelf split" subtitle="Sellable vs warehouse reserve · units & value">
        <div className="shelf-split">
          <DonutViz data={splitData} height={200} />
          <table className="table">
            <thead>
              <tr>
                <th>Bucket</th>
                <th className="num-cell">Units</th>
                <th className="num-cell">Share</th>
                <th className="num-cell">Value (cost)</th>
                <th className="num-cell">Value (retail)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="pill" style={{ background: "color-mix(in srgb, var(--teal-600) 16%, #fff)", color: "var(--teal-700)" }}>On shelf</span></td>
                <td className="num-cell" style={{ fontWeight: 700 }}>{onShelfUnits.toLocaleString()}</td>
                <td className="num-cell">{onShelfPct}%</td>
                <td className="num-cell">{CAD(val.onCost)}</td>
                <td className="num-cell">{CAD(val.onRetail)}</td>
              </tr>
              <tr>
                <td><span className="pill" style={{ background: "color-mix(in srgb, #57b0d6 20%, #fff)", color: "#2b7ba0" }}>Off shelf</span></td>
                <td className="num-cell" style={{ fontWeight: 700 }}>{offShelfUnits.toLocaleString()}</td>
                <td className="num-cell">{offShelfPct}%</td>
                <td className="num-cell">{CAD(val.offCost)}</td>
                <td className="num-cell">{CAD(val.offRetail)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>Total</td>
                <td className="num-cell" style={{ fontWeight: 800 }}>{units.toLocaleString()}</td>
                <td className="num-cell">100%</td>
                <td className="num-cell" style={{ fontWeight: 800, color: "var(--teal-700)" }}>{CAD(totalCost)}</td>
                <td className="num-cell" style={{ fontWeight: 800, color: "var(--teal-700)" }}>{CAD(val.onRetail + val.offRetail)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ---------- Location distribution charts ---------- */}
      <div className="chart-grid" style={{ marginTop: 16 }}>
        <ChartCard title="On-shelf inventory by store" subtitle="Sellable units on display at each storefront">
          {storeData.length ? (
            <BarViz
              data={storeData}
              xKey="name"
              layout="vertical"
              height={Math.max(180, storeData.length * 42)}
              series={[{ key: "units", name: "On-shelf units", color: PALETTE.green }]}
            />
          ) : (
            <p className="empty-note" style={{ padding: "28px 4px" }}>
              No storefront stock in the current location scope — a distribution warehouse is selected.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Off-shelf inventory by warehouse" subtitle="Warehouse reserve units by distribution center">
          {whData.length ? (
            <BarViz
              data={whData}
              xKey="name"
              layout="vertical"
              height={Math.max(180, whData.length * 42)}
              series={[{ key: "units", name: "Off-shelf units", color: PALETTE.violet }]}
            />
          ) : (
            <p className="empty-note" style={{ padding: "28px 4px" }}>
              No warehouse reserve in the current location scope — a storefront is selected.
            </p>
          )}
        </ChartCard>
      </div>

      {/* ---------- Category + trend ---------- */}
      <div className="chart-grid" style={{ marginTop: 16 }}>
        <ChartCard title="Units by category" subtitle="On-hand across the current filter">
          {catData.length ? (
            <BarViz data={catData} xKey="name" series={[{ key: "units", name: "Units", color: PALETTE.teal }]} />
          ) : (
            <p className="empty-note" style={{ padding: "28px 4px" }}>No units in the current scope.</p>
          )}
        </ChartCard>
        <ChartCard title="On-hand trend" subtitle="Last 6 months · all SKUs · unfiltered">
          <AreaViz
            data={STOCK_TREND}
            xKey="month"
            series={[
              { key: "onShelf", name: "On shelf", color: PALETTE.teal },
              { key: "offShelf", name: "Off shelf", color: PALETTE.sky },
            ]}
          />
        </ChartCard>
      </div>

      {/* ---------- Stock position table ---------- */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Stock position by SKU</h4>
            <p className="chart-card__sub">On-shelf / off-shelf reflect the active location filter</p>
          </div>
          <span className="pill">{rows.length} SKUs</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Category</th>
                <th className="num-cell">On shelf</th>
                <th className="num-cell">Off shelf</th>
                <th className="num-cell">On hand</th>
                <th className="num-cell">Value (cost)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = productBySku(r.sku);
                const oh = r.onShelf + r.offShelf;
                const st = skuStatus(r.sku);
                return (
                  <tr
                    key={r.sku}
                    className={`row-link${selected === r.sku ? " is-selected" : ""}`}
                    onClick={() => setSelected(selected === r.sku ? null : r.sku)}
                  >
                    <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{r.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td className="num-cell">{r.onShelf}</td>
                    <td className="num-cell">{r.offShelf}</td>
                    <td className="num-cell" style={{ fontWeight: 700 }}>{oh}</td>
                    <td className="num-cell">{CAD(oh * p.unitCost)}</td>
                    <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Low-stock chips ---------- */}
      {lows.length > 0 && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="chart-card__head">
            <div>
              <h4 className="chart-card__title">Needs replenishment</h4>
              <p className="chart-card__sub">SKUs at or below reorder point (total on-hand)</p>
            </div>
          </div>
          <div className="chip-row">
            {lows.map((l) => (
              <span className="chip" key={l.sku}>
                <TriangleAlert size={13} /> {l.name} · {l.onHand} on hand
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
