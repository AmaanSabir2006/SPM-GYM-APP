import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Wallet,
  Receipt,
  Flame,
  CheckCircle2, 
  Users, 
  CalendarCheck, 
  UserPlus, 
  QrCode,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Dumbbell,
  Zap,
  Scale,
  Activity,
  FileText,
  Clock,
  Sparkles
} from "lucide-react";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MemberModal } from "../components/MemberModal";
import { ExpenseModal } from "../components/ExpenseModal";
import { ExpenseDrawer } from "../components/ExpenseDrawer";
import { ProfitGraph } from "../components/ProfitGraph";

export const DashboardView = ({ onNavigate, onRefreshAlerts }) => {
  const { user, gym } = useAuth();
  const [stats, setStats] = useState(null);
  const [attStats, setAttStats] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [membersMap, setMembersMap] = useState({});
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
      const map = {};
      if (Array.isArray(memRes.data)) {
        memRes.data.forEach((m) => {
          map[m.id] = m;
        });
      }
      setMembersMap(map);
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

  // Determine greeting by current time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const userName = user?.name?.split(" ")[0] || "Owner";

  return (
    <div className="dashboard-page">
      {/* 1. Hero Welcome Banner Matching User Mockup */}
      <section className="dashboard-hero-banner">
        <div className="hero-banner-bg" />
        <div className="hero-banner-overlay" />
        
        <div className="hero-banner-inner">
          {/* Left Greeting & Actions */}
          <div className="hero-left-content">
            <h1 className="hero-greeting">
              {greeting}, <span className="hero-username">{userName}</span> 👋
            </h1>
            <p className="hero-subtext">
              Here's what's happening at your gym today.
            </p>

            <div className="hero-action-buttons">
              <button 
                type="button" 
                className="hero-btn hero-btn-dark"
                onClick={loadDashboardData}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                Live Sync
              </button>

              <button 
                type="button" 
                className="hero-btn hero-btn-dark"
                onClick={() => setShowExpenseModal(true)}
              >
                <Receipt size={15} />
                Log Expense
              </button>

              <button 
                type="button" 
                className="hero-btn hero-btn-dark"
                onClick={handleGenerateDues}
                disabled={generatingDues}
              >
                <Zap size={15} />
                {generatingDues ? "Generating..." : "Generate Report"}
              </button>

              <button 
                type="button" 
                className="hero-btn hero-btn-blue"
                onClick={() => setShowMemberModal(true)}
              >
                <UserPlus size={16} />
                Enroll Athlete
              </button>
            </div>
          </div>

          {/* Right Motivational Quote Widget */}
          <div className="hero-quote-widget">
            <div className="quote-mark">“</div>
            <p className="quote-text">
              Discipline today builds a stronger tomorrow.
            </p>
            <div className="quote-progress-row">
              <div className="quote-progress-bar" />
              <Dumbbell size={18} className="quote-icon" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top 4 Stat Boxes with Reference Image Styling & Day/Night Mode */}
      <section className="stat-boxes-grid">
        {/* Card 1: Royal / Electric Blue Style (NET PROFIT) */}
        <div className="stat-box stat-box-blue">
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">NET PROFIT</span>
              <span className="stat-box-sub">({profitData?.current_month_label?.split(" ")[0] || "Month"})</span>
            </div>
            <div className="stat-box-icon-circle">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="stat-box-value" style={{ color: isProfitable ? undefined : "var(--color-danger)" }}>
            Rs. {netProfit.toLocaleString()}
          </div>
          <div className="stat-box-footer">
            <span className={isProfitable ? "kpi-trend-pill-blue" : "kpi-trend-pill-danger"}>
              {isProfitable ? "↗" : "↘"} {profitData?.profit_growth_percent > 0 ? `+${profitData?.profit_growth_percent}%` : `${profitData?.profit_growth_percent || 0}%`}
            </span>
            <span className="stat-box-action">• Margin: {profitData?.profit_margin_percent || 0}%</span>
          </div>
        </div>

        {/* Card 2: Emerald Green Style (RECOVERED CASH FLOW) */}
        <div 
          className="stat-box stat-box-green"
          onClick={() => onNavigate && onNavigate("fees")}
          style={{ cursor: "pointer" }}
          title="Click to view fee records"
        >
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">RECOVERED CASH FLOW</span>
              <span className="stat-box-sub">Collected Fees</span>
            </div>
            <div className="stat-box-icon-circle">
              <Wallet size={16} />
            </div>
          </div>
          <div className="stat-box-value">
            Rs. {profitData?.fees_collected?.toLocaleString() || stats?.total_collected?.toLocaleString() || "0"}
          </div>
          <div className="stat-box-footer">
            <span className="kpi-trend-pill-success">
              {collectionRate}% Collected
            </span>
            <span className="stat-box-action">• {stats?.paid_count || 0} paid</span>
          </div>
        </div>

        {/* Card 3: Coral / Warm Red Style (GYM OVERHEAD / EXPENSES) */}
        <div 
          className="stat-box stat-box-coral"
          style={{ cursor: "pointer" }}
          onClick={() => setShowExpenseDrawer(true)}
          title="Click to view all facility expenses"
        >
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">GYM OVERHEAD</span>
              <span className="stat-box-sub">Facility Expenses</span>
            </div>
            <div className="stat-box-icon-circle">
              <Receipt size={16} />
            </div>
          </div>
          <div className="stat-box-value">
            Rs. {profitData?.total_expenses?.toLocaleString() || "0"}
          </div>
          <div className="stat-box-footer">
            <span className="kpi-trend-pill-danger">
              Rs. {profitData?.total_expenses?.toLocaleString() || "0"} Spent
            </span>
            <span className="stat-box-action" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              • Review bills <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Golden Amber Style (OVERDUE ATHLETE DUES) */}
        <div 
          className="stat-box stat-box-amber"
          onClick={() => onNavigate && onNavigate("fees")}
          style={{ cursor: "pointer" }}
          title="Click to review overdue accounts"
        >
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">OVERDUE ATHLETE DUES</span>
              <span className="stat-box-sub">Pending Accounts</span>
            </div>
            <div className="stat-box-icon-circle">
              <Flame size={16} />
            </div>
          </div>
          <div className="stat-box-value">
            Rs. {stats?.total_pending?.toLocaleString() || "0"}
          </div>
          <div className="stat-box-footer">
            <span className="kpi-trend-pill-warning">
              {stats?.overdue_count || 0} Overdue
            </span>
            <span className="stat-box-action">• 1 tap WhatsApp ready</span>
          </div>
        </div>
      </section>

      {/* 3. Middle Grid: Financial Trajectory Chart & Gym Command Center */}
      <section className="dashboard-middle-grid">
        {/* Left: Profit Graph with Distribution Panel */}
        <div className="middle-left-card">
          <ProfitGraph 
            analyticsData={profitData} 
            onLogExpense={() => setShowExpenseModal(true)}
          />
        </div>

        {/* Right: Gym Facility Command Center */}
        <div className="middle-right-card command-center-card">
          <div className="command-header">
            <div className="command-header-title-group">
              <div className="command-header-icon-badge">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="command-title">Gym Facility Command Center</h3>
                <p className="command-subtitle">Quick operations & revenue recovery</p>
              </div>
            </div>
            <span className="command-badge-ready">QUICK ACTIONS</span>
          </div>

          <div className="command-actions-list">
            {/* Action 1: Log Operating Expense */}
            <div 
              className="command-row"
              onClick={() => setShowExpenseModal(true)}
            >
              <div className="command-row-left">
                <div className="command-icon-box">
                  <Receipt size={18} />
                </div>
                <div className="command-text-group">
                  <span className="command-row-title">Log Facility Operating Expense</span>
                  <span className="command-row-sub">
                    Record electricity, rent, repairs & salaries for Net Profit accuracy
                  </span>
                </div>
              </div>
              <div className="command-arrow-box">
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Action 2: Fee Recovery & WhatsApp Queue */}
            <div 
              className="command-row"
              onClick={() => onNavigate("fees")}
            >
              <div className="command-row-left">
                <div className="command-icon-box">
                  <TrendingUp size={18} />
                </div>
                <div className="command-text-group">
                  <span className="command-row-title">Fee Recovery & WhatsApp Queue</span>
                  <span className="command-row-sub">
                    {(stats?.overdue_count || 0) > 0
                      ? `${stats.overdue_count} overdue accounts ready for 1-tap reminders`
                      : "Review overdue fee balances & dispatch reminders"}
                  </span>
                </div>
              </div>
              <div className="command-arrow-box">
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Action 3: Print Entrance QR Poster */}
            <div 
              className="command-row"
              onClick={() => onNavigate("qr-poster")}
            >
              <div className="command-row-left">
                <div className="command-icon-box">
                  <QrCode size={18} />
                </div>
                <div className="command-text-group">
                  <span className="command-row-title">Print Entrance QR Poster</span>
                  <span className="command-row-sub">
                    Official contactless check-in poster for turnstiles & entrance
                  </span>
                </div>
              </div>
              <div className="command-arrow-box">
                <ArrowUpRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom Grid: Live Workout Scans Today & Recent Activity Table */}
      <section className="dashboard-bottom-grid">
        {/* Left: Live Today Check-ins */}
        <div className="bottom-card">
          <div className="bottom-card-header">
            <div className="bottom-card-title-group">
              <div className="bottom-card-icon-badge theme-badge">
                <Activity size={17} />
              </div>
              <h3 className="bottom-card-title">
                Live Workout Scans Today
                <span className="bottom-count-pill">{todayAttendance.length}</span>
              </h3>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate("attendance")}
            >
              View Attendance
            </button>
          </div>

          {todayAttendance.length === 0 ? (
            <div className="bottom-empty-state">
              <div className="empty-state-icon-wrapper">
                <Dumbbell size={26} className="empty-state-icon" />
              </div>
              <div className="empty-state-title">No Check-ins Yet Today</div>
              <p className="empty-state-sub">
                Entrance turnstile check-ins and athlete scans will appear here live.
              </p>
            </div>
          ) : (
            <div className="live-scans-feed">
              {todayAttendance.slice(0, 5).map((att) => {
                const member = membersMap[att.member_id];
                const memberName = member?.full_name || `Athlete #${att.member_id.substring(0, 8)}`;
                return (
                  <div key={att.id} className="feed-item">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="feed-avatar-dot">
                        <Zap size={14} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{memberName}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>Entrance Verified</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: 600, fontSize: "12.5px" }}>
                        {new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="badge badge-active">{att.check_in_method}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Activity Table */}
        <div className="bottom-card">
          <div className="bottom-card-header">
            <div className="bottom-card-title-group">
              <div className="bottom-card-icon-badge theme-badge">
                <Users size={17} />
              </div>
              <h3 className="bottom-card-title">
                Recent Activity
              </h3>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate("members")}
            >
              View All
            </button>
          </div>

          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Member</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance && todayAttendance.length > 0 ? (
                  todayAttendance.slice(0, 6).map((att) => {
                    const member = membersMap[att.member_id];
                    const memberName = member?.full_name || `Athlete #${att.member_id.substring(0, 6)}`;
                    return (
                      <tr key={att.id}>
                        <td className="activity-time">
                          {new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span className="member-name-tag">{memberName}</span>
                        </td>
                        <td>
                          <span className="activity-action-badge action-green">
                            <span className="action-bullet green" /> Entrance Scan
                          </span>
                        </td>
                        <td className="activity-detail-text">{att.check_in_method || "Turnstile Verified"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)" }}>
                      <Activity size={28} color="var(--border-medium)" style={{ margin: "0 auto 8px", display: "block" }} />
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-main)" }}>No Recent Activity Today</div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        Entrance check-ins and member scans will appear here live.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modals & Drawers */}
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

export default DashboardView;

