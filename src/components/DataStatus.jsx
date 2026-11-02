/** Header badge showing where the numbers on screen come from, and how fresh they are. */
import { Radio, Archive, FlaskConical } from "lucide-react";
import { useDataStatus } from "../data/useDataStatus";

const LABELS = {
  live: { text: "Live", cls: "pill pill--success", Icon: Radio,
          tip: "Served by the API from the database (refreshed nightly)." },
  snapshot: { text: "Snapshot", cls: "pill pill--muted", Icon: Archive,
              tip: "Last night's published snapshot. Live data loads when the API wakes up." },
  demo: { text: "Demo data", cls: "pill pill--muted", Icon: FlaskConical,
          tip: "Built-in sample data (no snapshot or API configured)." },
};

export default function DataStatus() {
  const { source, asOf } = useDataStatus();
  const { text, cls, Icon, tip } = LABELS[source] ?? LABELS.demo;
  return (
    <span className={cls} title={tip} aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Icon size={13} />
      {text}
      {asOf && <span style={{ opacity: 0.75 }}>· as of {asOf}</span>}
    </span>
  );
}
