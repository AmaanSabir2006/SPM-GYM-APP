import React, { useState, useEffect } from "react";
import { 
  X, 
  MessageCircle, 
  Check, 
  Copy, 
  ExternalLink, 
  QrCode,
  RefreshCw,
  Info,
  Smartphone,
  Globe,
  Laptop
} from "lucide-react";
import API from "../api/client";
import { useToast } from "../context/ToastContext";
import axios from "axios";

export const MemberWelcomeModal = ({ memberId, onClose }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [detectedLanIp, setDetectedLanIp] = useState("");

  // Default to local Wi-Fi IP if on localhost, otherwise window.location.origin
  const [customHost, setCustomHost] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return window.location.origin;
      }
    }
    return "http://192.168.100.4:5173";
  });

  useEffect(() => {
    const fetchLanIp = async () => {
      try {
        const res = await axios.get("/api/health");
        if (res.data?.lan_ip) {
          setDetectedLanIp(res.data.lan_ip);
          if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            const port = window.location.port ? `:${window.location.port}` : ":5173";
            setCustomHost(`http://${res.data.lan_ip}${port}`);
          }
        }
      } catch (e) {
        // Fallback to existing host
      }
    };
    fetchLanIp();
  }, []);

  useEffect(() => {
    if (!memberId) return;

    const fetchWelcomeCard = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/members/${memberId}/welcome-card?frontend_url=${encodeURIComponent(customHost)}`);
        setRawData(res.data);
      } catch (err) {
        console.error("Failed to load welcome card", err);
        showToast("Could not generate athlete welcome card.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeCard();
  }, [memberId, customHost]);

  // Derived scan URL and formatted WhatsApp text
  const cleanBase = (customHost || "http://192.168.100.5:5173").replace(/\/$/, "");
  const scanUrl = rawData ? `${cleanBase}/scan?mid=${rawData.member_id}` : "";

  // Day suffix helper
  const getDaySuffix = (d) => {
    if (d >= 11 && d <= 13) return "th";
    switch (d % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  const dueDayStr = rawData ? `${rawData.billing_cycle_day}${getDaySuffix(rawData.billing_cycle_day)} of every month` : "";

  const whatsappMessage = rawData ? (
    `🏋️ *Welcome to ${rawData.gym_name}!*

Salam *${rawData.member_name}*,
Your gym membership is confirmed and active! Here are your membership details:

🏢 *Gym:* ${rawData.gym_name}
💰 *Monthly Fee:* PKR ${Number(rawData.monthly_fee).toLocaleString()}
📅 *Fee Renewal Date:* ${dueDayStr}

📲 *Your Personal Gym Entrance Pass & Scanner:*
Whenever you arrive at the gym, tap your pass link below to open your camera, scan the entrance QR code, and enter:
👉 ${scanUrl}

⚠️ *NOTE:* If the link above is not clickable on your phone, simply *reply 'OK' to this message* or save our contact. WhatsApp will instantly activate the link!

⚡ _Tip: Add this link to your phone's home screen for fast 1-tap gym entry!_`
  ) : "";

  const cleanPhone = rawData?.phone ? rawData.phone.replace(/[^0-9]/g, "") : "";
  const standardPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
  const whatsappUrl = `https://wa.me/${standardPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopyLink = () => {
    if (!scanUrl) return;
    navigator.clipboard.writeText(scanUrl);
    setCopiedLink(true);
    showToast("Entrance Scanner link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    if (!whatsappMessage) return;
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedMessage(true);
    showToast("Full WhatsApp message copied!", "success");
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: "620px", width: "95%", display: "flex", flexDirection: "column", maxHeight: "92vh", overflow: "hidden" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 4px 14px rgba(37, 211, 102, 0.35)",
              }}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "19px", margin: 0, fontWeight: 800 }}>
                  Send WhatsApp Welcome Pass
                </h3>
                <span className="athletic-badge badge-pro" style={{ fontSize: "10px" }}>
                  <span>PASS READY</span>
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                Includes fee terms, renewal date & 1-tap entrance scanner link
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto", maxHeight: "calc(92vh - 140px)", display: "flex", flexDirection: "column", gap: "14px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <RefreshCw size={28} className="spin" color="var(--primary)" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontWeight: 700, fontSize: "15px" }}>Generating Athlete Digital Pass...</div>
              <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Signing 365-day secure entrance token</div>
            </div>
          ) : rawData ? (
            <>
              {/* Member & Plan Summary Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px",
                  background: "var(--bg-surface)",
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Athlete Name
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--text-main)" }}>
                    {rawData.member_name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    WhatsApp Phone
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-whatsapp)" }}>
                    {rawData.phone}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Monthly Fee
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--primary)" }}>
                    Rs. {Number(rawData.monthly_fee).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Fee Renewal
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--text-main)" }}>
                    {rawData.billing_cycle_day}th of month
                  </div>
                </div>
              </div>

              {/* Crucial WhatsApp Link Clickability Callout */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                  fontSize: "12.5px",
                  lineHeight: 1.45,
                }}
              >
                <Info size={18} color="#D97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ color: "#D97706", fontSize: "13px" }}>
                    Why WhatsApp links might look like plain text on the phone:
                  </strong>
                  <div style={{ color: "var(--text-muted)", marginTop: "3px" }}>
                    WhatsApp disables links from numbers not saved in contacts.
                    As soon as the athlete <strong>replies "OK"</strong> to this message or saves your number, WhatsApp instantly makes the link bright blue and clickable!
                  </div>
                </div>
              </div>

              {/* Website Host / Network IP Setting */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Scanner Link Host / Domain
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Must be reachable by athlete's smartphone
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {detectedLanIp && (
                    <button
                      type="button"
                      onClick={() => setCustomHost(`http://${detectedLanIp}:${window.location.port || 5173}`)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "1px solid var(--border-medium)",
                        background: customHost.includes(detectedLanIp) ? "var(--primary)" : "var(--bg-card)",
                        color: customHost.includes(detectedLanIp) ? "white" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Smartphone size={12} />
                      Local Wi-Fi IP ({detectedLanIp}:{window.location.port || 5173})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCustomHost(window.location.origin)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "1px solid var(--border-medium)",
                      background: customHost === window.location.origin && !customHost.includes("192.168.100.5") ? "var(--primary)" : "var(--bg-card)",
                      color: customHost === window.location.origin && !customHost.includes("192.168.100.5") ? "white" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Laptop size={12} />
                    Current Origin ({window.location.host})
                  </button>
                </div>

                <input
                  type="text"
                  className="form-input"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="e.g. http://192.168.100.5:5173 or https://yourgym.com"
                  style={{ fontSize: "12px", padding: "7px 10px" }}
                />
              </div>

              {/* WhatsApp Message Preview Bubble */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    WhatsApp Message Preview
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedMessage ? "#16A34A" : "var(--primary)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {copiedMessage ? <Check size={14} /> : <Copy size={14} />}
                    {copiedMessage ? "Copied Full Text!" : "Copy Text"}
                  </button>
                </div>

                <div
                  style={{
                    background: "linear-gradient(135deg, #DCF8C6 0%, #E7FED8 100%)",
                    border: "1px solid #B2E59C",
                    borderRadius: "14px",
                    padding: "16px",
                    color: "#111827",
                    fontSize: "13.5px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "absolute", top: "10px", right: "12px", opacity: 0.25 }}>
                    <MessageCircle size={32} color="#128C7E" />
                  </div>
                  {whatsappMessage}
                </div>
              </div>

              {/* Direct Scanner Web Link Card */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "200px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(230, 57, 70, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--primary)",
                    }}
                  >
                    <QrCode size={18} />
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Athlete Entrance Scanner URL
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontFamily: "monospace",
                        color: "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "320px",
                      }}
                      title={scanUrl}
                    >
                      {scanUrl}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyLink}
                    title="Copy direct scanner link"
                  >
                    {copiedLink ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                    {copiedLink ? "Copied" : "Copy Link"}
                  </button>

                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Test member entrance view"
                  >
                    <ExternalLink size={14} />
                    Test Pass
                  </a>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div 
          className="modal-footer" 
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            flexShrink: 0,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done & Dismiss
          </button>

          <button
            type="button"
            className="btn btn-whatsapp"
            style={{
              padding: "10px 22px",
              fontSize: "14.5px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={handleOpenWhatsApp}
            disabled={loading || !rawData}
          >
            <MessageCircle size={18} />
            Open WhatsApp & Send Pass
          </button>
        </div>
      </div>
    </div>
  );
};
