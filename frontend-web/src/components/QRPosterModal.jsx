import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Dumbbell, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";

export const QRPosterModal = () => {
  const { gym } = useAuth();
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchToken = async () => {
    setLoading(true);
    try {
      const res = await API.get("/gyms/qr-token");
      setTokenData(res.data);
    } catch (err) {
      console.error("Failed to load QR token", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qr-poster-page" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Controls Bar (hidden during print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          background: "var(--bg-card)",
          padding: "16px 22px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "18px" }}>Gym Entrance QR Poster</h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Print this poster and mount it at your front door, turnstile, or reception desk.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchToken} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handlePrint} disabled={!tokenData}>
            <Printer size={16} />
            Print Entrance Poster
          </button>
        </div>
      </div>

      {/* Printable Poster Area */}
      <div
        className="poster-card"
        style={{
          background: "#FFFFFF",
          border: "2px solid #E2E8F0",
          borderRadius: "var(--radius-xl)",
          padding: "48px 36px",
          textAlign: "center",
          boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent (hidden during print) */}
        <div
          className="no-print"
          style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "350px",
            height: "250px",
            background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            opacity: 0.1,
            pointerEvents: "none",
          }}
        />

        {/* Gym Header Branding */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, var(--primary) 0%, #BE123C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 4px 16px var(--primary-glow)",
            }}
          >
            {gym?.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} style={{ width: "100%", height: "100%", borderRadius: "16px", objectFit: "cover" }} />
            ) : (
              <Dumbbell size={30} />
            )}
          </div>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A" }}>
              {gym?.name || "Fitness Club"}
            </h1>
            <div style={{ fontSize: "14px", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Official Check-In Station
            </div>
          </div>
        </div>

        {/* Catchphrase */}
        <div style={{ maxWidth: "420px", margin: "0 auto 32px", fontSize: "15px", color: "#475569" }}>
          Scan this entrance QR code with your smartphone camera or digital member pass to record your workout check-in.
        </div>

        {/* High-Resolution QR Canvas Box */}
        <div
          style={{
            display: "inline-block",
            padding: "24px",
            background: "#FFFFFF",
            borderRadius: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
            border: "5px solid var(--primary)",
            marginBottom: "28px",
          }}
        >
          {tokenData ? (
            <QRCodeSVG
              value={tokenData.qr_secret_token}
              size={240}
              level="H"
              includeMargin={false}
              fgColor="#0F172A"
            />
          ) : (
            <div style={{ width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
              Loading Token...
            </div>
          )}
        </div>

        {/* Security / Verification Badge */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", fontSize: "13px", color: "#64748B" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} color="#059669" />
            <span style={{ fontWeight: 600 }}>Attendance Verified</span>
          </div>
          <span>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600 }}>Instant Check-In Log</span>
          </div>
        </div>

        <div style={{ marginTop: "24px", fontSize: "11.5px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
          Facility Code: {tokenData?.qr_secret_token || "..."}
        </div>
      </div>
    </div>
  );
};
