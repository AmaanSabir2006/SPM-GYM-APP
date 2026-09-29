import React, { useState, useMemo } from "react";

export const ProfitGraph = ({ analyticsData }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Safe fallback extractions
  const trend = useMemo(() => analyticsData?.monthly_trend || [], [analyticsData]);

  // Compute 6-Month Aggregate Metrics
  const totals = useMemo(() => {
    let rev = 0;
    let exp = 0;
    let profit = 0;
    trend.forEach((d) => {
      rev += d.revenue || 0;
      exp += d.expenses || 0;
      profit += d.net_profit || 0;
    });
    const avgMargin = rev > 0 ? Math.round((profit / rev) * 100) : 0;
    return { rev, exp, profit, avgMargin };
  }, [trend]);

  // Compute dynamic scale max for SVG charting based on the highest value across Income, Expenses, and Profit
  const rawMax = useMemo(() => {
    if (!trend.length) return 5000;
    const allValues = trend.flatMap((d) => [
      d.revenue || 0,
      d.expenses || 0,
      Math.max(0, d.net_profit || 0)
    ]);
    return Math.max(...allValues, 0);
  }, [trend]);

  const maxValue = useMemo(() => {
    if (rawMax <= 0) return 5000;
    if (rawMax <= 1500) return 2000;
    if (rawMax <= 3500) return 5000;
    if (rawMax <= 7500) return 10000;
    if (rawMax <= 18000) return 25000;
    if (rawMax <= 38000) return 50000;
    if (rawMax <= 75000) return 100000;
    if (rawMax <= 160000) return 200000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    return Math.ceil((rawMax * 1.2) / magnitude) * magnitude;
  }, [rawMax]);

  // Chart dimensions & coordinates
  const chartHeight = 240;
  const chartWidth = 640;
  const paddingX = 46;
  const paddingY = 28;
  const effectiveWidth = chartWidth - paddingX * 2;
  const effectiveHeight = chartHeight - paddingY * 2;
  const bottomY = chartHeight - paddingY;

  const getX = (index) => paddingX + (index / Math.max(1, trend.length - 1)) * effectiveWidth;
  const getY = (val) => bottomY - (Math.max(0, val) / maxValue) * effectiveHeight;

  // Points for 3 distinct lines: Income (Green), Expenses (Red), Net Profit (Blue)
  const incomeCoords = useMemo(() => {
    return trend.map((d, i) => ({
      x: getX(i),
      y: getY(d.revenue || 0),
      val: d.revenue || 0
    }));
  }, [trend, maxValue, bottomY, effectiveWidth]);

  const expenseCoords = useMemo(() => {
    return trend.map((d, i) => ({
      x: getX(i),
      y: getY(d.expenses || 0),
      val: d.expenses || 0
    }));
  }, [trend, maxValue, bottomY, effectiveWidth]);

  const profitCoords = useMemo(() => {
    return trend.map((d, i) => ({
      x: getX(i),
      y: getY(d.net_profit || 0),
      val: d.net_profit || 0
    }));
  }, [trend, maxValue, bottomY, effectiveWidth]);

  // Reusable Catmull-Rom to Cubic Bezier curve path generator
  const generateSmoothPath = (coords) => {
    if (!coords || coords.length === 0) return "";
    if (coords.length === 1) return `M ${coords[0].x},${coords[0].y}`;

    let path = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i === 0 ? coords[i] : coords[i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i + 2 < coords.length ? coords[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const incomePath = useMemo(() => generateSmoothPath(incomeCoords), [incomeCoords]);
  const expensePath = useMemo(() => generateSmoothPath(expenseCoords), [expenseCoords]);
  const profitPath = useMemo(() => generateSmoothPath(profitCoords), [profitCoords]);

  // Ambient gradient area under the Net Profit curve
  const profitAreaPath = useMemo(() => {
    if (!profitPath || profitCoords.length === 0) return "";
    const lastX = profitCoords[profitCoords.length - 1].x.toFixed(1);
    const firstX = profitCoords[0].x.toFixed(1);
    return `${profitPath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [profitPath, profitCoords, bottomY]);

  // Selected or active hovered month details
  const activeTooltipData = hoveredIndex !== null && trend[hoveredIndex] ? trend[hoveredIndex] : null;

  // Safe render guard AFTER all hooks are evaluated
  if (!analyticsData || trend.length === 0) {
    return (
      <div className="profit-trajectory-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
          <p style={{ fontWeight: 600, marginBottom: "4px" }}>Loading Financial Trajectory...</p>
          <p style={{ fontSize: "11px", opacity: 0.7 }}>Preparing net profit analytics & cash dynamics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profit-trajectory-card">
      {/* 1. Header: Clean Title & 3-Color Line Legend */}
      <div className="profit-card-header">
        <div className="profit-header-left">
          <h3 className="profit-title">Net Profit & Cash Flow Trajectory</h3>
          <p className="profit-subtitle">
            6-Month financial trajectory • Income, Expenses & Net Profit
          </p>
        </div>

        {/* 3-Color Line Legend */}
        <div className="profit-chart-legend">
          <div className="profit-legend-item">
            <span className="profit-legend-line" style={{ background: "#10B981" }} />
            <span>Income</span>
          </div>
          <div className="profit-legend-item">
            <span className="profit-legend-line" style={{ background: "#EF4444" }} />
            <span>Expenses</span>
          </div>
          <div className="profit-legend-item">
            <span className="profit-legend-line" style={{ background: "#3B82F6" }} />
            <span>Net Profit</span>
          </div>
        </div>
      </div>

      {/* 2. Unified 3-Segment Quick KPI Bar */}
      <div className="profit-kpi-bar">
        <div className="profit-kpi-item">
          <div className="profit-kpi-meta">
            <span className="profit-kpi-dot green" />
            <span>Total Fee Income</span>
          </div>
          <div className="profit-kpi-val green">
            Rs. {totals.rev.toLocaleString()}
          </div>
        </div>

        <div className="profit-kpi-separator" />

        <div className="profit-kpi-item">
          <div className="profit-kpi-meta">
            <span className="profit-kpi-dot red" />
            <span>Facility Overhead</span>
          </div>
          <div className="profit-kpi-val red">
            Rs. {totals.exp.toLocaleString()}
          </div>
        </div>

        <div className="profit-kpi-separator" />

        <div className="profit-kpi-item">
          <div className="profit-kpi-meta">
            <span className="profit-kpi-dot blue" />
            <span>Net Retained Margin</span>
          </div>
          <div className="profit-kpi-val blue">
            {totals.avgMargin}% ({totals.profit >= 0 ? `+Rs. ${totals.profit.toLocaleString()}` : `-Rs. ${Math.abs(totals.profit).toLocaleString()}`})
          </div>
        </div>
      </div>

      {/* 3. The Unified Multi-Line Vector Chart */}
      <div className="profit-chart-wrapper">
        <div style={{ width: "100%", overflowX: "auto" }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="profit-chart-svg"
          >
            <defs>
              {/* Spline Ambient Glow Filter for Blue Net Profit */}
              <filter id="profitGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3B82F6" floodOpacity="0.4" />
              </filter>

              {/* Spline Ambient Glow Filter for Green Income */}
              <filter id="incomeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10B981" floodOpacity="0.35" />
              </filter>

              {/* Spline Ambient Glow Filter for Red Expenses */}
              <filter id="expenseGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#EF4444" floodOpacity="0.35" />
              </filter>

              {/* Area Gradient under Net Profit Curve */}
              <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Baseline & Dynamic Value Scales */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = bottomY - pct * effectiveHeight;
              const val = Math.round(pct * maxValue);
              const valLabel = val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `${val}`;
              return (
                <g key={idx}>
                  <line
                    x1={paddingX - 10}
                    y1={y}
                    x2={chartWidth - paddingX + 10}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeDasharray="4 4"
                    strokeOpacity="0.7"
                  />
                  <text
                    x={paddingX - 14}
                    y={y + 3.5}
                    fill="var(--text-muted)"
                    fontSize="9.5"
                    textAnchor="end"
                    fontWeight="600"
                    fontFamily="var(--font-body)"
                  >
                    {valLabel}
                  </text>
                </g>
              );
            })}

            {/* Hover Column Background Highlight & Crosshair Guide */}
            {trend.map((d, i) => {
              const cx = getX(i);
              const isHovered = hoveredIndex === i;

              return (
                <g key={`track-${i}`}>
                  {/* Invisible hit area for comfortable hover interaction */}
                  <rect
                    x={cx - 30}
                    y={paddingY}
                    width={60}
                    height={effectiveHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: "pointer" }}
                  />

                  {/* Vertical Crosshair Guideline on Hover */}
                  {isHovered && (
                    <>
                      <rect
                        x={cx - 20}
                        y={paddingY}
                        width={40}
                        height={effectiveHeight}
                        rx="6"
                        fill="var(--primary)"
                        opacity="0.06"
                        pointerEvents="none"
                      />
                      <line
                        x1={cx}
                        y1={paddingY}
                        x2={cx}
                        y2={bottomY}
                        stroke="var(--primary)"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                        pointerEvents="none"
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Area Gradient under Profit Curve */}
            {profitAreaPath && (
              <path
                d={profitAreaPath}
                fill="url(#profitAreaGradient)"
                pointerEvents="none"
              />
            )}

            {/* Line 1: Fee Income (Emerald Green) */}
            {incomePath && (
              <path
                d={incomePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#incomeGlow)"
                pointerEvents="none"
              />
            )}

            {/* Line 2: Overhead Expenses (Coral Red) */}
            {expensePath && (
              <path
                d={expensePath}
                fill="none"
                stroke="#EF4444"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#expenseGlow)"
                pointerEvents="none"
              />
            )}

            {/* Line 3: Net Profit (Electric Royal Blue) */}
            {profitPath && (
              <path
                d={profitPath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#profitGlow)"
                pointerEvents="none"
              />
            )}

            {/* Data Point Circles on all 3 lines */}
            {trend.map((d, i) => {
              const inc = incomeCoords[i];
              const exp = expenseCoords[i];
              const pro = profitCoords[i];
              const isHovered = hoveredIndex === i;

              return (
                <g 
                  key={`points-${i}`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Income Point (Green) */}
                  {isHovered && (
                    <circle cx={inc.x} cy={inc.y} r="10" fill="#10B981" opacity="0.25" pointerEvents="none" />
                  )}
                  <circle
                    cx={inc.x}
                    cy={inc.y}
                    r={isHovered ? "5.5" : "3.5"}
                    fill="#FFFFFF"
                    stroke="#10B981"
                    strokeWidth={isHovered ? "3" : "2"}
                    style={{ transition: "all 0.15s ease" }}
                  />

                  {/* Expense Point (Red) */}
                  {isHovered && (
                    <circle cx={exp.x} cy={exp.y} r="10" fill="#EF4444" opacity="0.25" pointerEvents="none" />
                  )}
                  <circle
                    cx={exp.x}
                    cy={exp.y}
                    r={isHovered ? "5.5" : "3.5"}
                    fill="#FFFFFF"
                    stroke="#EF4444"
                    strokeWidth={isHovered ? "3" : "2"}
                    style={{ transition: "all 0.15s ease" }}
                  />

                  {/* Net Profit Point (Blue) */}
                  {isHovered && (
                    <circle cx={pro.x} cy={pro.y} r="11" fill="#3B82F6" opacity="0.3" pointerEvents="none" />
                  )}
                  <circle
                    cx={pro.x}
                    cy={pro.y}
                    r={isHovered ? "6" : "4"}
                    fill="#FFFFFF"
                    stroke="#3B82F6"
                    strokeWidth={isHovered ? "3" : "2.5"}
                    style={{ transition: "all 0.15s ease" }}
                  />
                </g>
              );
            })}

            {/* X-Axis Month Labels */}
            {trend.map((d, i) => {
              const cx = getX(i);
              const isHovered = hoveredIndex === i;

              return (
                <text
                  key={`label-${i}`}
                  x={cx}
                  y={bottomY + 18}
                  fill={isHovered ? "var(--text-main)" : "var(--text-muted)"}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight={isHovered ? "800" : "600"}
                  fontFamily="var(--font-athletic)"
                  letterSpacing="0.03em"
                >
                  {d.month_label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Floating Tooltip displaying all 3 values for the hovered month */}
        {activeTooltipData && (
          <div className="profit-tooltip-card">
            <div className="profit-tooltip-header">
              <span>{activeTooltipData.month_label} Breakdown</span>
              <span style={{ 
                fontSize: "10.5px", 
                padding: "2px 7px", 
                borderRadius: "5px",
                background: (activeTooltipData.net_profit || 0) >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: (activeTooltipData.net_profit || 0) >= 0 ? "#10B981" : "#EF4444",
                fontWeight: 800
              }}>
                {(activeTooltipData.net_profit || 0) >= 0 ? "Profitable" : "Deficit"}
              </span>
            </div>

            {/* 1. Income (Green) */}
            <div className="profit-tooltip-row">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }} />
                Income (Fees):
              </span>
              <strong style={{ color: "#10B981" }}>
                Rs. {(activeTooltipData.revenue || 0).toLocaleString()}
              </strong>
            </div>

            {/* 2. Expenses (Red) */}
            <div className="profit-tooltip-row">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444" }} />
                Expenses:
              </span>
              <strong style={{ color: "#EF4444" }}>
                Rs. {(activeTooltipData.expenses || 0).toLocaleString()}
              </strong>
            </div>

            {/* 3. Net Retained Profit (Blue) */}
            <div className="profit-tooltip-divider">
              <div className="profit-tooltip-row">
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "var(--text-main)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B82F6" }} />
                  Net Profit:
                </span>
                <strong style={{ 
                  color: (activeTooltipData.net_profit || 0) >= 0 ? "#3B82F6" : "#EF4444",
                  fontSize: "13.5px"
                }}>
                  Rs. {(activeTooltipData.net_profit || 0).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
