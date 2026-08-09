import { Boxes, Search, Bell } from "lucide-react";

export default function Header() {
  return (
    <>
      <div className="brand">
        <div className="brand__logo">
          <Boxes size={19} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand__title">Retail Inventory</div>
          <div className="brand__sub">Stock &amp; Procurement</div>
        </div>
      </div>

      <header className="topbar">
        <div className="topbar__welcome">
          <span className="topbar__eyebrow">Welcome</span>
          <strong>Inventory Control · Demo</strong>
        </div>

        <div className="topbar__right">
          <div className="topbar__search">
            <Search size={15} />
            <input placeholder="Search SKUs…" aria-label="Search SKUs" />
          </div>
          <Bell size={18} color="var(--ink-500)" />
          <div className="avatar" title="Signed in user">IC</div>
        </div>
      </header>
    </>
  );
}
