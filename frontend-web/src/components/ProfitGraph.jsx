import React, { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Layers, PieChart } from "lucide-react";

export const ProfitGraph = ({ analyticsData }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!analyticsData || !analyticsData.monthly_trend) return null;

  const trend = analyticsData.monthly_trend;
  const isIncrease = analyticsData.is_profit_increase;
  const growthPercent = analyticsData.profit_growth_percent;

  // Compute scale max for SVG charting
  const allValues = trend.flatMap((d) => [d.revenue, d.expenses, Math.abs(d.net_profit)]);
  const maxValue = Math.max(...allValues, 10000) * 1.15;

  // Chart dimensions
  const chartHeight = 220;
  const chartWidth = 560;
  const paddingX = 45;
  const paddingY = 30;
  const effectiveWidth = chartWidth - paddingX * 2;
  const effectiveHeight = chartHeight - paddingY * 2;

  const getX = (index) => paddingX + (index / (trend.length - 1 || 1)) * effectiveWidth;
  const getY = (val) => chartHeight - paddingY - (Math.max(0, val) / maxValue) * effectiveHeight;

  // Generate SVG path for Net Profit line
  const profitPoints = trend.map((d, i) => `${getX(i)},${getY(d.net_profit)}`).join(" ");

  // Generate Area Fill under Profit Line
  const areaPath = trend.length > 0 
    ? `M ${getX(0)},${chartHeight - paddingY} ` +
      trend.map((d, i) => `L ${getX(i)},${getY(d.net_profit)}`).join(" ") +
      ` L ${getX(trend.length - 1)},${chartHeight - paddingY} Z`
    : "";

  return (
    <div className="glass-card" style={{ padding: "26px" }}>
      {/* Header with Growth Badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="athletic-badge badge-pro">
              <span>FINANCIAL PERFORMANCE</span>
            </span>
            <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontWeight: 700 }}>
              6-MONTH REVENUE VS. EXPENSES VS. NET PROFIT
            </span>
          </div>
          <h3 style={{ fontSize: "22px", fontWeight: 800 }}>Net Profit & Cash Flow Trajectory</h3>
        </div>

        {/* Dynamic Profit Increase / Decrease Banner */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "30px",
            background: isIncrease ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            border: `1px solid ${isIncrease ? "var(--color-success-border)" : "var(--color-danger-border)"}`,
            color: isIncrease ? "var(--color-success)" : "var(--color-danger)",
            fontWeight: 800,
            fontSize: "13px",
            fontFamily: "var(--font-athletic)",
            letterSpacing: "0.03em",
          }}
        >
          {isIncrease ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          <span>
            {isIncrease ? "PROFIT INCREASE" : "PROFIT DECREASE"} : {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`} VS LAST MONTH
          </span>
        </div>
      </div>

      {/* Main Grid: Chart + Category Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "center" }}>
        {/* SVG Chart Container */}
        <div style={{ position: "relative" }}>
          {/* Legend */}
          <div style={{ display: "flex", gap: "18px", marginBottom: "12px", fontSize: "12px", fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#059669" }} />
              <span style={{ color: "var(--text-main)" }}>Fee Revenue</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#EF4444" }} />
              <span style={{ color: "var(--text-main)" }}>Expenses</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 4, borderRadius: 2, background: "var(--primary)" }} />
              <span style={{ color: "var(--primary)" }}>Net Profit Line</span>
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: "100%", height: "auto", overflow: "visible" }}
            >
              <defs>
                <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="expBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F87171" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = chartHeight - paddingY - pct * effectiveHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX - 10}
                      y1={y}
                      x2={chartWidth - paddingX + 10}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 16}
                      y={y + 4}
                      fill="var(--text-dim)"
                      fontSize="9"
                      textAnchor="end"
                      fontWeight="600"
                    >
                      {Math.round((pct * maxValue) / 1000)}k
                    </text>
                  </g>
                );
              })}

              {/* Bar Columns for Revenue & Expenses */}
              {trend.map((d, i) => {
                const cx = getX(i);
                const barWidth = 14;
                const revHeight = (Math.max(0, d.revenue) / maxValue) * effectiveHeight;
                const expHeight = (Math.max(0, d.expenses) / maxValue) * effectiveHeight;
                const isHovered = hoveredIndex === i;

                return (
                  <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                    {/* Revenue Bar */}
                    <rect
                      x={cx - barWidth - 2}
                      y={chartHeight - paddingY - revHeight}
                      width={barWidth}
                      height={revHeight}
                      rx="3"
                      fill="url(#revBarGrad)"
                      opacity={isHovered ? 1 : 0.85}
                    />
                    {/* Expense Bar */}
                    <rect
                      x={cx + 2}
                      y={chartHeight - paddingY - expHeight}
                      width={barWidth}
                      height={expHeight}
                      rx="3"
                      fill="url(#expBarGrad)"
                      opacity={isHovered ? 1 : 0.85}
                    />
                    {/* Month Label */}
                    <text
                      x={cx}
                      y={chartHeight - paddingY + 18}
                      fill={isHovered ? "var(--text-main)" : "var(--text-muted)"}
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight={isHovered ? "800" : "600"}
                      fontFamily="var(--font-athletic)"
                    >
                      {d.month_label}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill under Net Profit Line */}
              {areaPath && <path d={areaPath} fill="url(#profitAreaGrad)" />}

              {/* Connected Net Profit Line */}
              <polyline
                points={profitPoints}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points for Net Profit */}
              {trend.map((d, i) => {
                const cx = getX(i);
                const cy = getY(d.net_profit);
                const isHovered = hoveredIndex === i;

                return (
                  <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} style={{ cursor: "pointer" }}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? "7" : "5"}
                      fill="white"
                      stroke="var(--primary)"
                      strokeWidth={isHovered ? "3.5" : "2.5"}
                      style={{ transition: "all 0.15s" }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Floating Tooltip */}
          {hoveredIndex !== null && trend[hoveredIndex] && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                boxShadow: "var(--shadow-lg)",
                fontSize: "12px",
                zIndex: 20,
                minWidth: "190px",
                animation: "scale-up 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "13px", marginBottom: "6px", color: "var(--text-main)" }}>
                {trend[hoveredIndex].month_label} Performance
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ color: "var(--text-muted)" }}>Collected Fees:</span>
                <span style={{ fontWeight: 700, color: "var(--color-success)" }}>
                  Rs. {trend[hoveredIndex].revenue.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Expenses:</span>
                <span style={{ fontWeight: 700, color: "var(--color-danger)" }}>
                  Rs. {trend[hoveredIndex].expenses.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "5px", marginTop: "4px" }}>
                <span style={{ fontWeight: 800, color: "var(--text-main)" }}>Net Profit:</span>
                <span style={{ fontWeight: 900, color: trend[hoveredIndex].net_profit >= 0 ? "var(--primary)" : "var(--color-danger)" }}>
                  Rs. {trend[hoveredIndex].net_profit.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Category Breakdown Meters */}
        <div style={{ background: "var(--bg-surface)", padding: "18px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-athletic)" }}>
              Current Month Expense Distribution
            </h4>
          </div>

          {analyticsData.category_breakdown.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "12.5px", padding: "16px 0", textAlign: "center" }}>
              No expenses recorded this month yet. Click "Log Expense" to track rent, bills, or repairs.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {analyticsData.category_breakdown.map((cat, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--text-main)" }}>
                      {cat.category}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>
                      Rs. {cat.amount.toLocaleString()} ({cat.percentage}%)
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: "100%",
                        background: idx === 0 ? "var(--color-danger)" : idx === 1 ? "var(--color-warning)" : "var(--primary)",
                        borderRadius: "3px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "16px", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Total Monthly Overhead:</span>
            <span style={{ fontWeight: 800, color: "var(--color-danger)" }}>
              Rs. {analyticsData.total_expenses.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
