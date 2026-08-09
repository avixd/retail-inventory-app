import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ComposedChart,
  ScatterChart, Scatter, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export const PALETTE = {
  teal: "#1a6790",
  tealLight: "#2181ad",
  sky: "#57b0d6",
  accent: "#f4a63b",
  green: "#2e9e6b",
  red: "#d0563f",
  violet: "#7a5cc4",
  slate: "#8aa0ac",
  ink: "#33454f",
  grid: "#e7edf1",
};

const axisProps = {
  tick: { fill: "#8aa0ac", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "#e7edf1" },
};

const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid #dce3e8",
    boxShadow: "0 6px 20px rgba(15,27,34,.12)",
    fontSize: 12,
    padding: "8px 12px",
  },
  labelStyle: { color: "#0f1b22", fontWeight: 700, marginBottom: 2 },
  cursor: { fill: "rgba(26,103,144,.06)" },
};

/* ---------- Chart card wrapper ---------- */
export function ChartCard({ title, subtitle, right, children, span }) {
  return (
    <div className="chart-card" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div className="chart-card__head">
        <div>
          <h4 className="chart-card__title">{title}</h4>
          {subtitle && <p className="chart-card__sub">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

/* ---------- Area (trend) ---------- */
export function AreaViz({ data, xKey, series, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient id={`g-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.2}
            fill={`url(#g-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Bar ---------- */
export function BarViz({ data, xKey, series, height = 220, layout = "horizontal" }) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 8, left: vertical ? 8 : -14, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={92} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} width={44} />
          </>
        )}
        <Tooltip {...tooltipStyle} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={vertical ? [0, 5, 5, 0] : [5, 5, 0, 0]} maxBarSize={38} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Line (multi-series) ---------- */
export function LineViz({ data, xKey, series, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.4}
            dot={{ r: 2.5, strokeWidth: 0, fill: s.color }}
            activeDot={{ r: 4.5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------- Donut ---------- */
export function DonutViz({ data, height = 220 }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={86}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span className="donut-center__val">{total}</span>
        <span className="donut-center__label">Total</span>
      </div>
    </div>
  );
}

/* ---------- Pareto (bars + cumulative % line) ---------- */
export function ParetoViz({ data, xKey, barKey, lineKey, barName, lineName, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} interval={0} angle={-32} textAnchor="end" height={70} />
        <YAxis yAxisId="left" {...axisProps} width={54} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        <Bar yAxisId="left" dataKey={barKey} name={barName} fill={PALETTE.teal} radius={[5, 5, 0, 0]} maxBarSize={34} />
        <Line yAxisId="right" type="monotone" dataKey={lineKey} name={lineName} stroke={PALETTE.accent} strokeWidth={2.4} dot={{ r: 3, fill: PALETTE.accent, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- Scatter quadrant (points: {x, y, name, color, xLabel}) ---------- */
export function ScatterViz({ points, xName = "Spend", yName = "Score", yDomain = [40, 100], refX, refY, xTickFmt, height = 300 }) {
  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "#fff", border: "1px solid #dce3e8", borderRadius: 10, boxShadow: "0 6px 20px rgba(15,27,34,.12)", fontSize: 12, padding: "8px 12px" }}>
        <div style={{ fontWeight: 700, color: "#0f1b22", marginBottom: 2 }}>{d.name}</div>
        <div>{yName}: <b>{d.y}</b></div>
        <div>{xName}: <b>{d.xLabel ?? d.x}</b></div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 16, left: 6, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
        <XAxis type="number" dataKey="x" name={xName} {...axisProps} tickFormatter={xTickFmt} />
        <YAxis type="number" dataKey="y" name={yName} domain={yDomain} {...axisProps} width={40} />
        <Tooltip content={<Tip />} cursor={{ strokeDasharray: "3 3" }} />
        {refX != null && <ReferenceLine x={refX} stroke="#c4d0d8" strokeDasharray="4 4" />}
        {refY != null && <ReferenceLine y={refY} stroke="#c4d0d8" strokeDasharray="4 4" />}
        <Scatter data={points} fill={PALETTE.teal}>
          {points.map((d, i) => <Cell key={i} fill={d.color || PALETTE.teal} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
