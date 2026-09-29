import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Dumbbell,
  TrendingUp,
  Sparkles,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ activeTab, setActiveTab, alertsData, isMobileOpen, onMobileClose }) => {
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

  const sidebarContent = (
    <>
      {/* Brand Header Matching Reference Layout */}
      <div className="sidebar-brand" onClick={() => setActiveTab("dashboard")}>
        <div className="sidebar-brand-icon">
          {gym?.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} />
          ) : (
            <Dumbbell size={22} color="var(--primary)" />
          )}
        </div>
        <div className="sidebar-brand-divider" />
        <div className="sidebar-brand-text">
          <span className="brand-line-1">{gym?.name?.split(" ")[0]?.toUpperCase() || "IRON"}</span>
          <span className="brand-line-2">{gym?.name?.split(" ").slice(1).join(" ")?.toUpperCase() || "MANAGEMENT"}</span>
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
              onClick={() => setActiveTab(item.id)}
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

      {/* Bottom Motivational Community Card */}
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <aside className="app-sidebar app-sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay (shown only on mobile when open) */}
      {isMobileOpen && (
        <div className="mobile-sidebar-overlay" onClick={onMobileClose}>
          <aside 
            className="app-sidebar mobile-sidebar-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button for mobile */}
            <button className="mobile-sidebar-close" onClick={onMobileClose}>
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (always visible on mobile) */}
      <nav className="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="mobile-nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
