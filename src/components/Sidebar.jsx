/**
 * Primary navigation. NAV_ITEMS defines the nine views grouped into four
 * sections (Overview, Inventory, Procurement, Master Data); the Sidebar
 * renders them and reports the selected id back to App via onSelect.
 */
import {
  LayoutDashboard,
  TriangleAlert,
  Warehouse,
  ArrowLeftRight,
  ScrollText,
  ShoppingCart,
  PackageCheck,
  Truck,
  Contact,
  Gauge,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "overview", label: "Inventory Overview", icon: LayoutDashboard, group: "Overview" },
  { id: "reorder", label: "Reorder / Low-Stock", icon: TriangleAlert, group: "Overview" },

  { id: "offshelf", label: "Off-Shelf · Warehouse", icon: Warehouse, group: "Inventory" },
  { id: "movements", label: "Stock Movements", icon: ScrollText, group: "Inventory" },

  { id: "orders", label: "Orders · Procure-to-Pay", icon: ShoppingCart, group: "Procurement" },
  { id: "grn", label: "Goods Receipt", icon: PackageCheck, group: "Procurement" },
  { id: "transfers", label: "Transfer Orders", icon: ArrowLeftRight, group: "Procurement" },

  { id: "master", label: "Suppliers & Products", icon: Contact, group: "Master Data" },
  { id: "supplier-perf", label: "Supplier Performance", icon: Gauge, group: "Master Data" },
];

export default function Sidebar({ active, onSelect }) {
  let lastGroup = null;

  return (
    <nav className="sidebar" aria-label="Primary">
      {NAV_ITEMS.map(({ id, label, icon: Icon, group }) => {
        const isActive = active === id;
        const showLabel = group !== lastGroup;
        lastGroup = group;
        return (
          <div key={id} style={{ display: "contents" }}>
            {showLabel && <span className="sidebar__label">{group}</span>}
            <button
              className={`nav-item${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(id)}
            >
              <Icon className="nav-item__icon" size={18} strokeWidth={2.1} />
              <span className="nav-item__text">{label}</span>
              {isActive && <span className="nav-item__dot" />}
            </button>
          </div>
        );
      })}

      <div className="sidebar__spacer" />
      <div className="sidebar__foot">
        <Truck size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Inventory Portal · v0.1 (demo)
      </div>
    </nav>
  );
}
