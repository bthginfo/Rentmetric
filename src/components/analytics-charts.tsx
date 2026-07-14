"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const euro = (value: number) =>
  `${Math.round(value).toLocaleString("de-DE")} €`;

type PropertyPoint = {
  name: string;
  rent: number;
  targetRent: number;
  rentPerSqm: number;
  occupied: number;
  units: number;
};

export function AnalyticsCharts({
  periodLabel,
  monthly,
  properties,
  utility,
  arrearsAging,
  maintenanceMonthly,
  costRatio,
}: {
  periodLabel: string;
  monthly: Array<{ month: string; due: number; paid: number }>;
  properties: PropertyPoint[];
  utility: Array<{ name: string; value: number }>;
  arrearsAging: Array<{ name: string; value: number; count: number }>;
  maintenanceMonthly: Array<{ month: string; count: number; cost: number }>;
  costRatio: Array<{ name: string; costs: number; ratio: number }>;
}) {
  const openTotal = arrearsAging.reduce((sum, item) => sum + item.value, 0);
  const maintenanceTotal = maintenanceMonthly.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <div className="analytics-chart-grid">
      <Chart
        title="Soll und Zahlungseingang"
        meta={periodLabel}
        summary={`Im gewählten Zeitraum wurden ${euro(monthly.reduce((sum, item) => sum + item.paid, 0))} von ${euro(monthly.reduce((sum, item) => sum + item.due, 0))} verbucht.`}
        wide
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="paid" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1, #2477ff)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1, #2477ff)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={euro} />
            <Tooltip formatter={(value) => euro(Number(value))} />
            <Legend />
            <Area
              type="monotone"
              dataKey="due"
              name="Soll"
              stroke="var(--chart-2, #8aa0bd)"
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="paid"
              name="Eingang"
              stroke="var(--chart-1, #2477ff)"
              fill="url(#paid)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Chart>

      <Chart
        title="Ziel- und Vertragsmiete"
        meta="Monatlich"
        summary={
          properties.length
            ? "Die aktuellen Vertragsmieten werden je Objekt den gepflegten Zielmieten gegenübergestellt."
            : "Noch keine Objekte mit Mietwerten vorhanden."
        }
      >
        {properties.length ? (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={properties}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={euro} />
              <Tooltip formatter={(value) => euro(Number(value))} />
              <Legend />
              <Bar
                dataKey="rent"
                name="Vertragsmiete"
                fill="var(--chart-1, #315d9d)"
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="targetRent"
                name="Zielmiete"
                fill="var(--chart-2, #6f8fb8)"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty>Keine Mietwerte erfasst.</Empty>
        )}
      </Chart>

      <Chart
        title="Offene Beträge nach Alter"
        meta={euro(openTotal)}
        summary={
          openTotal
            ? `${arrearsAging.reduce((sum, item) => sum + item.count, 0)} offene Sollstellungen sind nach Fälligkeit gruppiert.`
            : "Derzeit sind keine offenen Sollstellungen vorhanden."
        }
      >
        {openTotal ? (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={arrearsAging} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis type="number" tickFormatter={euro} />
              <YAxis dataKey="name" type="category" width={104} />
              <Tooltip formatter={(value) => euro(Number(value))} />
              <Bar
                dataKey="value"
                name="Offener Betrag"
                fill="var(--chart-4, #d28c37)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty>Keine offenen Zahlungen.</Empty>
        )}
      </Chart>

      <Chart
        title="Wartungsvolumen und Kosten"
        meta={periodLabel}
        summary={
          maintenanceTotal
            ? `${maintenanceTotal} Vorgänge wurden im dargestellten Zeitraum angelegt; Kosten zeigen Ist- oder ersatzweise Schätzwerte.`
            : "Im dargestellten Zeitraum wurden keine Wartungsfälle angelegt."
        }
        wide
      >
        {maintenanceTotal ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={maintenanceMonthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="month" />
              <YAxis yAxisId="count" allowDecimals={false} />
              <YAxis yAxisId="cost" orientation="right" tickFormatter={euro} />
              <Tooltip
                formatter={(value, name) =>
                  name === "Kosten"
                    ? euro(Number(value))
                    : Number(value).toLocaleString("de-DE")
                }
              />
              <Legend />
              <Bar
                yAxisId="count"
                dataKey="count"
                name="Vorgänge"
                fill="var(--chart-1, #315d9d)"
                radius={[5, 5, 0, 0]}
              />
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                name="Kosten"
                stroke="var(--chart-4, #d28c37)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Empty>Keine Wartungsdaten im Zeitraum.</Empty>
        )}
      </Chart>

      <Chart
        title="Miete je Objekt"
        meta="€/m²"
        summary={
          properties.length
            ? "Die Quadratmetermiete basiert auf aktiven Verträgen und gepflegten Wohnflächen."
            : "Noch keine auswertbaren Vertrags- und Flächendaten."
        }
      >
        {properties.length ? (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={properties} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={90} />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(2)} €/m²`}
              />
              <Bar
                dataKey="rentPerSqm"
                name="Miete je m²"
                fill="var(--chart-1, #2477ff)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty>Keine Mietdaten erfasst.</Empty>
        )}
      </Chart>

      <Chart
        title="Kostenquote je Objekt"
        meta="Kosten / Jahreskaltmiete"
        summary="Die Quote setzt erfasste Betriebs- und Wartungskosten ins Verhältnis zur aktuellen annualisierten Vertragsmiete."
      >
        {costRatio.some((item) => item.costs > 0) ? (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={costRatio} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis type="number" unit=" %" />
              <YAxis dataKey="name" type="category" width={90} />
              <Tooltip
                formatter={(value, name, item) =>
                  name === "Kostenquote"
                    ? `${Number(value).toFixed(1)} %`
                    : euro(Number(item.payload.costs))
                }
              />
              <Bar
                dataKey="ratio"
                name="Kostenquote"
                fill="var(--chart-5, #7b6ca8)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty>Noch keine objektbezogenen Kosten erfasst.</Empty>
        )}
      </Chart>

      <Chart
        title="Betriebskosten"
        meta="Top-Kostenarten"
        summary={
          utility.length
            ? `${utility.length} Kostenarten mit insgesamt ${euro(utility.reduce((sum, item) => sum + item.value, 0))}.`
            : "Noch keine Betriebskosten erfasst."
        }
      >
        {utility.length ? (
          <UtilityBreakdown items={utility} />
        ) : (
          <Empty>Noch keine Betriebskosten erfasst.</Empty>
        )}
      </Chart>
    </div>
  );
}

function Chart({
  title,
  meta,
  summary,
  wide,
  children,
}: {
  title: string;
  meta: string;
  summary: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`detail-panel chart-card ${wide ? "wide" : ""}`}>
      <div className="panel-title">
        <h2>{title}</h2>
        <span>{meta}</span>
      </div>
      <p className="chart-summary">{summary}</p>
      <div
        className="chart-visual"
        role="img"
        aria-label={`${title}. ${summary}`}
      >
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="chart-empty">{children}</p>;
}

function UtilityBreakdown({
  items,
}: {
  items: Array<{ name: string; value: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    "var(--chart-1, #2477ff)",
    "var(--chart-3, #00a98f)",
    "var(--chart-5, #7b6ca8)",
    "var(--chart-4, #d28c37)",
    "var(--urgent, #d95a6f)",
    "var(--chart-2, #2699c7)",
    "var(--mint, #6b9f2a)",
    "var(--muted, #64748b)",
  ];

  return (
    <ul
      aria-label={`Betriebskosten nach Kostenart, insgesamt ${euro(total)}`}
      style={{
        display: "grid",
        gap: 14,
        listStyle: "none",
        margin: "18px 0 0",
        padding: 0,
        width: "100%",
      }}
    >
      {items.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <li key={item.name} style={{ display: "grid", gap: 7, minWidth: 0 }}>
            <div
              style={{
                alignItems: "baseline",
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <strong
                style={{ fontSize: "0.8rem", lineHeight: 1.4, minWidth: 0 }}
              >
                {item.name}
              </strong>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {euro(item.value)} · {percentage.toFixed(1).replace(".", ",")} %
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                background: "var(--surface-soft, #f5f8fc)",
                border: "1px solid var(--line, #e3e9f2)",
                borderRadius: 6,
                height: 10,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <span
                style={{
                  background: colors[index % colors.length],
                  borderRadius: 5,
                  display: "block",
                  height: "100%",
                  minWidth: percentage > 0 ? 3 : 0,
                  width: `${percentage}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
