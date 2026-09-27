import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { Navbar } from "./components/Navbar";
import { ActionBanner } from "./components/ActionBanner";
import { DashboardView } from "./views/DashboardView";
import { FeesView } from "./views/FeesView";
import { MembersView } from "./views/MembersView";
import { AttendanceView } from "./views/AttendanceView";
import { QRPosterModal } from "./components/QRPosterModal";
import { AuthView } from "./views/AuthView";
import { MemberScanView } from "./views/MemberScanView";
import API from "./api/client";

const MainApp = () => {
  const { token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alertsData, setAlertsData] = useState(null);

  // Check if current user is an athlete opening their WhatsApp scanner pass
  const isMemberScanRoute = 
    window.location.pathname.includes("/scan") ||
    window.location.search.includes("token=") ||
    window.location.search.includes("mid=");

  if (isMemberScanRoute) {
    return <MemberScanView />;
  }

  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await API.get("/fees/alerts");
      setAlertsData(res.data);
    } catch (err) {
      console.error("Failed to fetch fee alerts", err);
    }
  }, [token]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          color: "var(--text-muted)",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "3px solid var(--border-subtle)",
            borderTopColor: "var(--primary)",
          }}
          className="spin"
        />
        <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>
          Loading GymTrack Platform...
        </div>
      </div>
    );
  }

  if (!token) {
    return <AuthView />;
  }

  return (
    <div className="app-container">
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertsData={alertsData}
        onRefreshAlerts={fetchAlerts}
      />

      {/* Main Content Area */}
      <main className="main-content" key={activeTab}>
        {/* Urgent Action Banner */}
        {activeTab !== "fees" && (
          <ActionBanner
            alertsData={alertsData}
            onAction={() => setActiveTab("fees")}
          />
        )}

        {/* View Switcher */}
        {activeTab === "dashboard" && (
          <DashboardView
            onNavigate={(tab) => setActiveTab(tab)}
            onRefreshAlerts={fetchAlerts}
          />
        )}

        {activeTab === "fees" && (
          <FeesView onRefreshAlerts={fetchAlerts} />
        )}

        {activeTab === "members" && (
          <MembersView />
        )}

        {activeTab === "attendance" && (
          <AttendanceView />
        )}

        {activeTab === "qr-poster" && (
          <QRPosterModal />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
