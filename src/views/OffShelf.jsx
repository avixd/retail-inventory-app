/**
 * Off-Shelf · Warehouse — reserve (off-shelf) stock and the capital tied up
 * in it, plus a warehouse floor map (bins grouped by aisle, coloured by fill
 * tier). Selectors: warehouseFloor(), siteBinCapacity(), offShelfByWarehouse().
 */
import { useState } from "react";
import { Warehouse, Boxes, MapPin, Layers, Clock3 } from "lucide-react";
import ViewHead from "../components/ViewHead";
import {
  BINS, WAREHOUSES, DCS, productBySku, warehouseName, skuName, binsFor, CAD, warehouseFloor,
} from "../data/inventory";

const TIER_LEGEND = [
  { key: "empty", label: "Empty", color: "#f7d7d2" },
  { key: "low", label: "Low (<33%)", color: "#f6c39a" },
  { key: "half", label: "Half (33–65%)", color: "#f7dd8f" },
  { key: "high", label: "High (66–99%)", color: "#bfe0a0" },
  { key: "full", label: "Full", color: "#7cc79b" },
];

function WarehouseFloor({ whId }) {
  const w = WAREHOUSES.find((x) => x.id === whId);
  const floor = warehouseFloor(whId);
  return (
    <div className="wh-floor">
      <div className="wh-floor__head">
        <div>
          <div className="wh-floor__title">{w.name}</div>
          <div className="wh-floor__sub">
            Capacity {floor.capacity} units/bin · {floor.occupied} occupied · {floor.empty} empty · {floor.total} locations
          </div>
        </div>
      </div>
      <div className="wh-legend">
        {TIER_LEGEND.map((t) => (
          <span key={t.key}><i style={{ background: t.color }} /> {t.label}</span>
        ))}
      </div>
      {floor.aisles.map((a) => (
        <div className="wh-aisle" key={a.aisle}>
          <div className="wh-aisle__label">Aisle {a.aisle}</div>
          <div className="wh-aisle__bins">
            {a.bins.map((b) => (
              <div
                key={b.code}
                className={`wh-bin is-${b.tier}`}
                title={`${b.code} · ${b.sku ? `${b.sku} ${skuName(b.sku)}` : "Empty"} · ${b.qty}/${floor.capacity} units (${b.fillPct}%)`}
              >
                <div className="wh-bin__code">{b.code}</div>
                <div>
                  <div className="wh-bin__qty">{b.qty === 0 ? "—" : b.qty}</div>
                  <div className="wh-bin__unit">{b.qty === 0 ? "empty" : "units"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OffShelf({ viewLabel }) {
  const [wh, setWh] = useState("ALL");
  const [selected, setSelected] = useState(BINS[0].sku);

  const rows = BINS.filter((b) => wh === "ALL" || b.warehouse === wh);

  const totalUnits = BINS.reduce((s, b) => s + b.qty, 0);
  const binsOccupied = BINS.filter((b) => b.qty > 0).length;
  const whValue = BINS.reduce((s, b) => s + b.qty * (productBySku(b.sku)?.unitCost ?? 0), 0);

  const kpis = [
    { icon: Warehouse, label: "Warehouses", val: WAREHOUSES.length },
    { icon: Boxes, label: "Off-shelf units", val: totalUnits.toLocaleString() },
    { icon: Layers, label: "Bins occupied", val: binsOccupied },
    { icon: MapPin, label: "Warehouse value", val: CAD(whValue) },
  ];

  const detail = binsFor(selected);
  const detailProduct = productBySku(selected);
  const detailTotal = detail.reduce((s, b) => s + b.qty, 0);

  const selectedW = WAREHOUSES.find((x) => x.id === wh);
  const isStore = selectedW?.type === "Retail Store";
  const floorWhs = wh === "ALL" ? DCS.map((d) => d.id) : isStore ? [] : [wh];

  return (
    <>
      <ViewHead
        viewLabel={viewLabel}
        title="Off the Shelf · Warehouse Detail"
        desc="Where each item is physically stored — warehouse, bin location and quantity on hand."
      />

      <div className="kpi-row">
        {kpis.map(({ icon: Icon, label, val }) => (
          <div className="kpi" key={label}>
            <div className="kpi__top"><div className="kpi__icon"><Icon size={18} /></div></div>
            <div className="kpi__val">{val}</div>
            <div className="kpi__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Warehouse filter */}
      <div className="chip-choices" style={{ marginBottom: 16 }}>
        <button
          className={`chip-choice${wh === "ALL" ? " is-on" : ""}`}
          onClick={() => setWh("ALL")}
        >
          All warehouses
        </button>
        {WAREHOUSES.map((w) => (
          <button
            key={w.id}
            className={`chip-choice${wh === w.id ? " is-on" : ""}`}
            onClick={() => setWh(w.id)}
          >
            {w.id} · {w.city}
          </button>
        ))}
      </div>

      {/* Warehouse floor-plan map */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Warehouse layout</h4>
            <p className="chart-card__sub">Storage locations by aisle · shaded by fill level</p>
          </div>
          <span className="pill">
            {wh === "ALL" ? `${DCS.length} warehouses` : isStore ? "storefront" : wh}
          </span>
        </div>
        {floorWhs.length ? (
          floorWhs.map((id) => <WarehouseFloor key={id} whId={id} />)
        ) : (
          <p className="empty-note">
            Stores hold on-shelf stock — there's no warehouse reserve to map. Pick a distribution warehouse or “All warehouses”.
          </p>
        )}
      </div>

      {/* Bin table */}
      <div className="chart-card">
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">Storage locations</h4>
            <p className="chart-card__sub">Click a row to see all locations holding that SKU</p>
          </div>
          <span className="pill">{rows.length} placements</span>
        </div>
        <div className="scroll-tile">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Warehouse</th><th>Bin location</th>
                <th className="num-cell">Qty</th><th>UoM</th><th>Last movement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => {
                const p = productBySku(b.sku);
                return (
                  <tr
                    key={`${b.sku}-${b.warehouse}-${i}`}
                    className={`row-link${selected === b.sku ? " is-selected" : ""}`}
                    onClick={() => setSelected(b.sku)}
                  >
                    <td style={{ fontWeight: 700, color: "var(--ink-900)" }}>{b.sku}</td>
                    <td>{p.name}</td>
                    <td>{warehouseName(b.warehouse)}</td>
                    <td><span className="bin-chip"><MapPin size={12} /> {b.bin}</span></td>
                    <td className="num-cell" style={{ fontWeight: 700 }}>{b.qty}</td>
                    <td>{p.uom}</td>
                    <td className="ts"><Clock3 size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />{b.lastMove}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected SKU location breakdown */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="chart-card__head">
          <div>
            <h4 className="chart-card__title">{selected} — {detailProduct?.name}</h4>
            <p className="chart-card__sub">Stored across {detail.length} location(s) · {detailTotal} units total</p>
          </div>
          <span className="pill pill--success">{detailTotal} units</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Warehouse</th><th>Region</th><th>Bin location</th>
              <th className="num-cell">Qty</th><th className="num-cell">Share</th><th>Last movement</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((b, i) => {
              const w = WAREHOUSES.find((x) => x.id === b.warehouse);
              const share = detailTotal ? Math.round((b.qty / detailTotal) * 100) : 0;
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--ink-900)" }}>{warehouseName(b.warehouse)}</td>
                  <td>{w?.region}</td>
                  <td><span className="bin-chip"><MapPin size={12} /> {b.bin}</span></td>
                  <td className="num-cell" style={{ fontWeight: 700 }}>{b.qty}</td>
                  <td className="num-cell">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div className="pbar" style={{ width: 70 }}><div className="pbar__fill" style={{ width: `${share}%` }} /></div>
                      <span className="num">{share}%</span>
                    </div>
                  </td>
                  <td className="ts">{b.lastMove}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
