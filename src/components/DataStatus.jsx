/**
 * Header control showing where the numbers on screen come from, and which
 * month-end they describe. When month-end history is published, the date is a
 * selector: choosing an earlier month-end reloads every view as of that date.
 */
import { Radio, Archive, FlaskConical, History } from "lucide-react";
import { useDataStatus } from "../data/useDataStatus";
import { selectMonth } from "../data/dataSource";

const LABELS = {
  live: { text: "Live", cls: "pill pill--success", Icon: Radio,
          tip: "Served by the API from the database. Data is frozen at the cut-off date." },
  snapshot: { text: "Snapshot", cls: "pill pill--muted", Icon: Archive,
              tip: "Published snapshot at the data cut-off. Live data loads when the API wakes up." },
  historical: { text: "History", cls: "pill pill--accent", Icon: History,
                tip: "A past month-end. Every view shows the business as it stood on that date." },
  demo: { text: "Demo data", cls: "pill pill--muted", Icon: FlaskConical,
          tip: "Built-in sample data (no snapshot or API configured)." },
};

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function DataStatus() {
  const { source, asOf, months, month, loading } = useDataStatus();
  const { text, cls, Icon, tip } = LABELS[source] ?? LABELS.demo;
  return (
    <div className="data-status">
      <span className={cls} title={tip} aria-live="polite">
        <Icon size={13} />
        {text}
      </span>
      {months.length > 1 ? (
        <label className="as-of">
          <span className="as-of__label">As of</span>
          <select
            value={month ?? ""}
            onChange={(e) => selectMonth(e.target.value)}
            disabled={loading}
            aria-label="Show the business as of month-end"
          >
            {months.map((m, i) => (
              <option key={m} value={m}>{shortDate(m)}{i === 0 ? " (latest)" : ""}</option>
            ))}
          </select>
        </label>
      ) : (
        asOf && <span className="as-of__label">as of {asOf}</span>
      )}
    </div>
  );
}
