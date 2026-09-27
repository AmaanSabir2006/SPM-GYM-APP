import React, { useState, useRef, useEffect } from "react";
import { 
  Dumbbell, 
  LayoutDashboard, 
  Users, 
  Receipt, 
  QrCode, 
  CalendarCheck, 
  Bell, 
  LogOut, 
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Navbar = ({ activeTab, setActiveTab, alertsData, onRefreshAlerts }) => {
  const { user, gym, logout } = useAuth();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("gymtrack_theme") || "light");
  const dropdownRef = useRef(null);

  // Apply theme to html root on mount and change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gymtrack_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalAlerts = alertsData?.total_alerts || 0;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => setActiveTab("dashboard")}>
          <div className="brand-icon-box">
            {gym?.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} />
            ) : (
              <Dumbbell size={24} />
            )}
          </div>
          <div className="brand-meta">
            <h1>{gym?.name || "GymTrack"}</h1>
            <div className="brand-sub">Gym Management Portal</div>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "fees" ? "active" : ""}`}
            onClick={() => setActiveTab("fees")}
          >
            <Receipt size={16} />
            Fee Recovery
            {totalAlerts > 0 && (
              <span style={{
                background: "var(--color-danger)",
                color: "white",
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "10px",
                marginLeft: "2px"
              }}>
                {totalAlerts}
              </span>
            )}
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            <Users size={16} />
            Members
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            <CalendarCheck size={16} />
            Attendance
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "qr-poster" ? "active" : ""}`}
            onClick={() => setActiveTab("qr-poster")}
          >
            <QrCode size={16} />
            Entrance QR
          </button>
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">

          {/* Theme Toggle Button */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} color="#F59E0B" />}
          </button>

          {/* Bell Icon with Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              className="icon-btn"
              onClick={() => setShowBellDropdown(!showBellDropdown)}
              title="Urgent Fee Alerts"
            >
              <Bell size={18} />
              {totalAlerts > 0 && <span className="badge-count">{totalAlerts}</span>}
            </button>

            {showBellDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "46px",
                  right: 0,
                  width: "360px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                  zIndex: 200,
                  padding: "16px",
                  animation: "scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>
                    Urgent Fee Alerts ({totalAlerts})
                  </div>
                  <button
                    onClick={onRefreshAlerts}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {alertsData?.alerts?.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                    <CheckCircle2 size={32} color="#059669" style={{ margin: "0 auto 8px" }} />
                    All gym dues are fully cleared!
                  </div>
                ) : (
                  <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {alertsData?.alerts?.slice(0, 5).map((alert) => (
                      <div
                        key={alert.fee_record_id}
                        style={{
                          background: "var(--bg-surface)",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "12.5px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: "3px" }}>
                          <span>{alert.member_name}</span>
                          <span style={{ color: alert.status === "overdue" ? "var(--color-danger)" : "var(--color-warning)" }}>
                            Rs. {alert.amount_due.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "11.5px" }}>
                          <span>
                            {alert.status === "overdue" ? `${alert.days_overdue} days overdue` : "Due today"}
                          </span>
                          <a
                            href={alert.whatsapp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp btn-sm"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                          >
                            Send WhatsApp
                          </a>
                        </div>
                      </div>
                    ))}
                    {alertsData?.alerts?.length > 5 && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ width: "100%", marginTop: "4px" }}
                        onClick={() => {
                          setActiveTab("fees");
                          setShowBellDropdown(false);
                        }}
                      >
                        View all {totalAlerts} alerts
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="user-profile-badge">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="user-name-role">
              <span className="user-name">{user?.name || "Gym Admin"}</span>
              <span className="user-role">{user?.role || "Owner"}</span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                padding: "2px 4px",
                marginLeft: "4px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
