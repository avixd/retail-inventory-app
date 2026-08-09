import { ChevronRight } from "lucide-react";

export default function ViewHead({ viewLabel, title, desc, right }) {
  return (
    <div className="view-head">
      <div>
        <div className="breadcrumb">
          <span>Retail Inventory</span>
          <ChevronRight className="sep" size={13} />
          <span className="current">{viewLabel}</span>
        </div>
        <h1 className="view-title">{title}</h1>
        {desc && <p className="view-desc">{desc}</p>}
      </div>
      {right}
    </div>
  );
}
