import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  CalendarCheck, 
  UserPlus, 
  FileText, 
  QrCode,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Dumbbell,
  Flame,
  Zap,
  Trophy,
  ShieldCheck,
  Activity,
  PlusCircle,
  Receipt,
  Scale,
  Building2,
  ArrowRight,
  ArrowDownRight
} from "lucide-react";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MemberModal } from "../components/MemberModal";
import { ExpenseModal } from "../components/ExpenseModal";
import { ExpenseDrawer } from "../components/ExpenseDrawer";
import { ProfitGraph } from "../components/ProfitGraph";

export const DashboardView = ({ onNavigate, onRefreshAlerts }) => {
  const { gym } = useAuth();
  const [stats, setStats] = useState(null);
  const [attStats, setAttStats] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [membersCount, setMembersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseDrawer, setShowExpenseDrawer] = useState(false);
  const [generatingDues, setGeneratingDues] = useState(false);

  const { showToast } = useToast();

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [feeRes, attStatsRes, todayAttRes, memRes, profitRes] = await Promise.all([
        API.get("/fees/overview"),
        API.get("/attendance/stats"),
        API.get("/attendance/today"),
        API.get("/members?status=active"),
        API.get("/expenses/profit-analytics"),
      ]);
      setStats(feeRes.data);
      setAttStats(attStatsRes.data);
      setTodayAttendance(todayAttRes.data);
      setMembersCount(memRes.data.length);
      setProfitData(profitRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleGenerateDues = async () => {
    setGeneratingDues(true);
    try {
      const res = await API.post("/fees/generate-monthly-dues");
      showToast(res.data.message || "Monthly dues generated!", "success");
      loadDashboardData();
      onRefreshAlerts && onRefreshAlerts();
    } catch (err) {
      showToast("Failed to generate monthly dues", "error");
    } finally {
      setGeneratingDues(false);
    }
  };

  const collectionRate = stats && stats.total_expected > 0 
    ? Math.round((stats.total_collected / stats.total_expected) * 100) 
    : 0;

  const netProfit = profitData?.net_profit || 0;
  const isProfitable = netProfit >= 0;

  return (
    <div>
      {/* Athletic Gym Command Hero Banner */}
      <div className="gym-hero-banner">
        <div className="gym-hero-bg" />
        <div className="gym-hero-overlay" />
        <div className="gym-hero-content">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="athletic-badge badge-pro">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", marginRight: 6 }} />
                <span>LIVE GYM OPERATIONS</span>
              </span>
              <span className="athletic-badge badge-elite">
                <Building2 size={12} style={{ marginRight: 5, verticalAlign: "middle" }} />
                <span>{gym?.name || "IRON ARENA"}</span>
              </span>
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px", letterSpacing: "-0.02em" }}>
              Commercial Strength & Performance Hub
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "600px", fontWeight: 500 }}>
              Automated fee recovery ledger, operational expense tracking, and real-time net profit analytics.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={loadDashboardData} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Live Sync
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowExpenseModal(true)}
              title="Add gym overhead: rent, electricity, maintenance, trainer salary"
            >
              <PlusCircle size={15} color="var(--color-danger)" />
              Log Expense
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleGenerateDues} 
              disabled={generatingDues}
            >
              <Zap size={15} color="var(--primary)" />
              {generatingDues ? "Generating..." : "Generate Month Dues"}
            </button>
            <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
              <Dumbbell size={16} />
              Enroll Athlete
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Featuring Net Profit */}
      <div className="stats-grid">
        {/* Net Profit Card - PRIMARY METRIC */}
        <div className="stat-card" style={{ border: `2px solid ${isProfitable ? "var(--color-success-border)" : "var(--color-danger-border)"}`, background: isProfitable ? "var(--color-success-bg)" : "var(--color-danger-bg)" }}>
          <div className="stat-header">
            <span className="stat-label" style={{ color: isProfitable ? "var(--color-success)" : "var(--color-danger)" }}>
              Net Profit ({profitData?.current_month_label?.split(" ")[0] || "Month"})
            </span>
            <div className="stat-icon" style={{ background: isProfitable ? "rgba(5, 150, 105, 0.2)" : "rgba(220, 38, 38, 0.2)", color: isProfitable ? "var(--color-success)" : "var(--color-danger)" }}>
              {isProfitable ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
          </div>
          <div className="stat-athletic-val" style={{ color: isProfitable ? "var(--color-success)" : "var(--color-danger)" }}>
            Rs. {netProfit.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span style={{ fontWeight: 800, color: isProfitable ? "var(--color-success)" : "var(--color-danger)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
              {profitData?.is_profit_increase ? <ArrowUpRight size={14} style={{ display: "inline", verticalAlign: "text-bottom" }} /> : <ArrowDownRight size={14} style={{ display: "inline", verticalAlign: "text-bottom" }} />} {profitData?.profit_growth_percent > 0 ? `+${profitData?.profit_growth_percent}%` : `${profitData?.profit_growth_percent}%`}
            </span>
            <span>• Margin: {profitData?.profit_margin_percent || 0}%</span>
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Recovered Cash Flow</span>
            <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--color-success)" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-athletic-val" style={{ color: "var(--color-success)" }}>
            Rs. {profitData?.fees_collected?.toLocaleString() || stats?.total_collected?.toLocaleString() || "0"}
          </div>
          <div className="stat-footer">
            <span style={{ color: "var(--color-success)", fontWeight: 800 }}>
              {collectionRate}% Collected
            </span>
            <span>• {stats?.paid_count || 0} paid</span>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setShowExpenseDrawer(true)} title="Click to view all expenses">
          <div className="stat-header">
            <span className="stat-label">Gym Overhead / Expenses</span>
            <div className="stat-icon" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
              <Receipt size={20} />
            </div>
          </div>
          <div className="stat-athletic-val" style={{ color: "var(--color-danger)" }}>
            Rs. {profitData?.total_expenses?.toLocaleString() || "0"}
          </div>
          <div className="stat-footer">
            <span style={{ color: "var(--primary)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
              View & Manage Expenses <ArrowRight size={13} />
            </span>
          </div>
        </div>

        {/* Pending Overdue Dues */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Overdue Athlete Dues</span>
            <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--color-warning)" }}>
              <Flame size={20} />
            </div>
          </div>
          <div className="stat-athletic-val" style={{ color: "var(--color-warning)" }}>
            Rs. {stats?.total_pending?.toLocaleString() || "0"}
          </div>
          <div className="stat-footer">
            <span style={{ color: "var(--color-danger)", fontWeight: 800 }}>
              {stats?.overdue_count || 0} Overdue
            </span>
            <span>• 1-tap WhatsApp ready</span>
          </div>
        </div>
      </div>

      {/* Interactive 6-Month Profit Trajectory Graph */}
      <div style={{ marginBottom: "28px" }}>
        <ProfitGraph analyticsData={profitData} />
      </div>

      {/* Two Column Layout: Quick Actions & Live Attendance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="dashboard-bottom-grid">
        {/* Left Column: Quick Facility Actions */}
        <div className="glass-card accent-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Dumbbell size={18} color="var(--primary)" />
              Gym Facility Command Center
            </h3>
            <span className="athletic-badge badge-gym">
              <span>READY</span>
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div 
              className="action-row"
              onClick={() => setShowExpenseModal(true)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-danger-bg)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Scale size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Log Gym Operating Expense</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Add facility rent, electricity bills, salaries to keep Net Profit accurate
                  </div>
                </div>
              </div>
              <ArrowUpRight size={18} color="var(--text-dim)" />
            </div>

            <div 
              className="action-row"
              onClick={() => onNavigate("fees")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-whatsapp-bg)", color: "var(--color-whatsapp)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Fee Recovery & WhatsApp Queue</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    {stats?.overdue_count || 0} overdue accounts need automated reminder links
                  </div>
                </div>
              </div>
              <ArrowUpRight size={18} color="var(--text-dim)" />
            </div>

            <div 
              className="action-row"
              onClick={() => onNavigate("qr-poster")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59, 130, 246, 0.12)", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QrCode size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Print Entrance QR Poster</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Official contactless poster for entrance turnstile check-ins
                  </div>
                </div>
              </div>
              <ArrowUpRight size={18} color="var(--text-dim)" />
            </div>
          </div>
        </div>

        {/* Right Column: Live Today Check-ins with Sporty Feed */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} color="#059669" />
              Live Workout Scans Today ({todayAttendance.length})
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("attendance")}>
              Full Roster
            </button>
          </div>

          {todayAttendance.length === 0 ? (
            <div style={{ textAlign: "center", padding: "44px 0", color: "var(--text-muted)", fontSize: "13.5px" }}>
              <Dumbbell size={36} color="var(--border-medium)" style={{ margin: "0 auto 10px" }} />
              No athlete entrance check-ins logged yet today.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
              {todayAttendance.slice(0, 5).map((att) => (
                <div
                  key={att.id}
                  className="feed-item"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap size={15} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Athlete #{att.member_id.substring(0, 8)}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Entrance Verified</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
                    <span style={{ fontWeight: 600 }}>{new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="badge badge-active" style={{ fontSize: "10px" }}>{att.check_in_method}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMemberModal && (
        <MemberModal
          onClose={() => setShowMemberModal(false)}
          onSuccess={() => {
            loadDashboardData();
            onRefreshAlerts && onRefreshAlerts();
          }}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => {
            loadDashboardData();
          }}
        />
      )}

      {showExpenseDrawer && (
        <ExpenseDrawer
          onClose={() => setShowExpenseDrawer(false)}
          onRefresh={loadDashboardData}
          onOpenAddModal={() => {
            setShowExpenseDrawer(false);
            setShowExpenseModal(true);
          }}
        />
      )}
    </div>
  );
};
