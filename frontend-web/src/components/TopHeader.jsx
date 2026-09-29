import React, { useState, useRef, useEffect } from "react";
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  ChevronDown, 
  LogOut, 
  CheckCircle2,
  Receipt,
  Menu
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const TopHeader = ({ alertsData, onRefreshAlerts, onNavigate, searchQuery, setSearchQuery, onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("gymtrack_theme") || "light");
  const dropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gymtrack_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowBellDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalAlerts = alertsData?.total_alerts || 0;
  const displayName = user?.name || "Ali";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="top-header">
      {/* Mobile Hamburger Menu Button */}
      <button
        type="button"
        className="header-icon-btn mobile-menu-btn"
        onClick={onMenuToggle}
        title="Toggle Menu"
      >
        <Menu size={20} />
      </button>

      {/* Search Input Bar */}
      <div className="header-search-wrapper header-search-desktop">
        <Search size={18} className="header-search-icon" />
        <input
          type="text"
          className="header-search-input"
          placeholder="Search members, plans, or anything..."
          value={searchQuery || ""}
          onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onNavigate) {
              onNavigate("members");
            }
          }}
        />
      </div>

      {/* Right Controls */}
      <div className="header-actions">
        {/* Notification Bell */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setShowBellDropdown(!showBellDropdown)}
            title="Urgent Alerts"
          >
            <Bell size={19} />
            {totalAlerts > 0 && <span className="header-bell-dot" />}
          </button>

          {showBellDropdown && (
            <div className="header-alerts-dropdown">
              <div className="dropdown-header">
                <div style={{ fontWeight: 800, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Receipt size={16} color="var(--primary)" />
                  Urgent Fee Alerts ({totalAlerts})
                </div>
                <button
                  type="button"
                  onClick={onRefreshAlerts}
                  className="dropdown-refresh-btn"
                >
                  Sync
                </button>
              </div>

              {alertsData?.alerts?.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)", fontSize: "13px" }}>
                  <CheckCircle2 size={30} color="#10B981" style={{ margin: "0 auto 8px" }} />
                  All member dues are fully cleared!
                </div>
              ) : (
                <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {alertsData?.alerts?.slice(0, 5).map((alert) => (
                    <div key={alert.fee_record_id} className="dropdown-alert-item">
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "13px" }}>
                        <span>{alert.member_name}</span>
                        <span style={{ color: alert.status === "overdue" ? "var(--color-danger)" : "var(--color-warning)" }}>
                          Rs. {alert.amount_due.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                        <span>{alert.status === "overdue" ? `${alert.days_overdue} days overdue` : "Due today"}</span>
                        <a
                          href={alert.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                  {alertsData?.alerts?.length > 5 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ width: "100%", marginTop: "6px" }}
                      onClick={() => {
                        onNavigate && onNavigate("fees");
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

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} color="#F59E0B" />}
        </button>

        {/* User Profile Pill */}
        <div style={{ position: "relative" }} ref={userDropdownRef}>
          <div 
            className="header-user-pill"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="user-avatar-circle">
              {userInitial}
            </div>
            <div className="user-text-info">
              <span className="user-text-name">{displayName}</span>
              <span className="user-text-role">{user?.role || "Owner"}</span>
            </div>
            <ChevronDown size={15} className="user-chevron" />
          </div>

          {showUserDropdown && (
            <div className="header-user-dropdown">
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ fontWeight: 800, fontSize: "13.5px", color: "var(--text-main)" }}>{displayName}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user?.email || "Gym Owner"}</div>
              </div>
              <button
                type="button"
                className="user-logout-btn"
                onClick={logout}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
