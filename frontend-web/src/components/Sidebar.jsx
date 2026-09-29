import React, { useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Dumbbell,
  TrendingUp,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ activeTab, setActiveTab, alertsData, isOpen, onClose }) => {
  const { gym } = useAuth();
  const totalAlerts = alertsData?.total_alerts || 0;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "members", label: "Members", icon: Users },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "fees", label: "Payments", icon: CreditCard, badge: totalAlerts },
    { id: "qr-poster", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? "sidebar-mobile-open" : ""}`}>
        {/* Mobile close button — only visible inside mobile drawer */}
        <button
          className="sidebar-mobile-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => handleNavClick("dashboard")}>
          <div className="sidebar-brand-icon">
            {gym?.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} />
            ) : (
              <Dumbbell size={22} color="var(--primary)" />
            )}
          </div>
          <div className="sidebar-brand-divider" />
          <div className="sidebar-brand-text">
            <span className="brand-line-1">{gym?.name?.split(" ")[0]?.toUpperCase() || "GYM"}</span>
            <span className="brand-line-2">{gym?.name?.split(" ").slice(1).join(" ")?.toUpperCase() || "PORTAL"}</span>
            <span className="brand-line-accent">DASHBOARD</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
              >
                <Icon size={19} className="sidebar-item-icon" />
                <span className="sidebar-item-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="sidebar-item-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Motivational Card */}
        <div className="sidebar-bottom-card">
          <div className="sidebar-card-bg" />
          <div className="sidebar-card-overlay" />
          <div className="sidebar-card-content">
            <h4>Stronger Members Build a Healthier Community</h4>
            <div className="sidebar-card-bar" />
            <div className="sidebar-card-footer">
              <TrendingUp size={16} />
              <span>Active Performance</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`mobile-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
            >
              <span className="mobile-tab-icon-wrapper">
                <Icon size={20} />
                {item.badge > 0 && (
                  <span className="mobile-tab-badge">{item.badge}</span>
                )}
              </span>
              <span className="mobile-tab-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
