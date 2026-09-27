import React, { useState, useEffect } from "react";
import { 
  Dumbbell, 
  Sparkles, 
  ShieldCheck, 
  Receipt, 
  QrCode, 
  ArrowRight, 
  Building2, 
  Lock, 
  Mail, 
  User, 
  Phone,
  Palette,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const AuthView = () => {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const { login, registerGym } = useAuth();
  const { showToast } = useToast();

  // Dark/Light Theme state for Auth View
  const [theme, setTheme] = useState(() => localStorage.getItem("gymtrack_theme") || "light");

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("gymtrack_theme", nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regGymName, setRegGymName] = useState("");
  const [regGymSlug, setRegGymSlug] = useState("");
  const [regPrimaryColor, setRegPrimaryColor] = useState("#E11D48");
  const [regOwnerName, setRegOwnerName] = useState("");
  const [regOwnerEmail, setRegOwnerEmail] = useState("");
  const [regOwnerPassword, setRegOwnerPassword] = useState("");
  const [regOwnerPhone, setRegOwnerPhone] = useState("");

  const [loading, setLoading] = useState(false);

  // Live preview brand color for cursor ambient glow and buttons during onboarding
  useEffect(() => {
    if (mode === "register" && regPrimaryColor) {
      document.documentElement.style.setProperty("--primary", regPrimaryColor);
      document.documentElement.style.setProperty("--primary-glow", `${regPrimaryColor}45`);
      document.documentElement.style.setProperty("--primary-light", `${regPrimaryColor}18`);
    } else {
      document.documentElement.style.setProperty("--primary", "#E11D48");
      document.documentElement.style.setProperty("--primary-glow", "rgba(225, 29, 72, 0.25)");
      document.documentElement.style.setProperty("--primary-light", "rgba(225, 29, 72, 0.08)");
    }
  }, [mode, regPrimaryColor]);

  // Auto-generate slug from gym name
  const handleGymNameChange = (e) => {
    const val = e.target.value;
    setRegGymName(val);
    if (!regGymSlug || regGymSlug === slugify(regGymName)) {
      setRegGymSlug(slugify(val));
    }
  };

  const slugify = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      showToast("Welcome back! Login verified.", "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Invalid email or password", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = (regOwnerPhone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast("Please enter a valid mobile or WhatsApp phone number (minimum 10 digits).", "error");
      return;
    }

    setLoading(true);
    try {
      await registerGym({
        gym_name: regGymName.trim(),
        gym_slug: regGymSlug.trim(),
        primary_color: regPrimaryColor,
        owner_name: regOwnerName.trim(),
        owner_email: regOwnerEmail.trim(),
        owner_password: regOwnerPassword,
        owner_phone: regOwnerPhone.trim(),
      });
      showToast(`Welcome! ${regGymName} is now live with dynamic white-label branding.`, "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Onboarding failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const colorPresets = [
    { name: "Crimson Red", hex: "#E11D48" },
    { name: "Cyber Cyan", hex: "#06B6D4" },
    { name: "Emerald Green", hex: "#10B981" },
    { name: "Vibrant Orange", hex: "#F97316" },
    { name: "Royal Purple", hex: "#8B5CF6" },
  ];

  return (
    <div className="auth-wrapper">
      {/* Floating Theme Toggle */}
      <button
        type="button"
        className="auth-theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
      >
        {theme === "light" ? (
          <>
            <Moon size={15} />
            <span>Dark Mode</span>
          </>
        ) : (
          <>
            <Sun size={15} color="#F59E0B" />
            <span>Light Mode</span>
          </>
        )}
      </button>

      <div className="auth-container">
        {/* Left Side: Brand Showcase */}
        <div className="auth-brand-panel">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, var(--primary) 0%, #BE123C 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: "0 4px 16px var(--primary-glow)",
                }}
              >
                <Dumbbell size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-main)" }}>GymTrack</h1>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                  Smart Gym Management Platform
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.25, marginBottom: "16px", color: "var(--text-main)" }}>
              Automate Fee Recovery & Entrance Check-ins.
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6, marginBottom: "32px" }}>
              Built specifically for gym owners to eliminate paper registers, reduce overdue fees with 1-tap WhatsApp reminders, and modernize entrances with contactless QR self-scanning.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--color-whatsapp-bg)", color: "var(--color-whatsapp)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Receipt size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>1-Tap Personalized WhatsApp Alerts</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Instantly remind overdue members in Pakistan without expensive SMS APIs.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div className="auth-badge-blue">
                  <QrCode size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>Contactless QR Entrance Scanner</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Instant entrance check-in via printed QR code. Prevents double-scanning.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ShieldCheck size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>100% Private & Isolated Gym Data</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Your member records, fees, and revenue data are strictly private to your gym.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "40px", fontSize: "12px", color: "var(--text-dim)" }}>
            © 2026 GymTrack Technologies. All rights reserved.
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="auth-form-panel">
          {/* Mode Tabs */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                flex: 1,
                padding: "9px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: mode === "login" ? "var(--primary)" : "transparent",
                color: mode === "login" ? "white" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              style={{
                flex: 1,
                padding: "9px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: mode === "register" ? "var(--primary)" : "transparent",
                color: mode === "register" ? "white" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Onboard New Gym
            </button>
          </div>

          {mode === "login" ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "20px", marginBottom: "4px", color: "var(--text-main)" }}>Welcome Back</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Enter your gym account credentials to access your dashboard.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="owner@olympia.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", marginTop: "12px" }}
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Access Dashboard"}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "20px", marginBottom: "4px", color: "var(--text-main)" }}>Register Your Gym Facility</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Create your gym profile and owner account to get started.
                </p>
              </div>

              <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "6px" }}>
                <div className="form-group">
                  <label className="form-label">Gym Facility Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Iron Clad Fitness"
                    value={regGymName}
                    onChange={handleGymNameChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gym URL Slug</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="iron-clad-fit"
                    value={regGymSlug}
                    onChange={(e) => setRegGymSlug(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Brand Accent Color</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {colorPresets.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setRegPrimaryColor(c.hex)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: c.hex,
                          border: regPrimaryColor === c.hex ? "3px solid var(--text-main)" : "1px solid var(--border-medium)",
                          cursor: "pointer",
                          boxShadow: regPrimaryColor === c.hex ? `0 0 8px ${c.hex}` : "none",
                        }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={regPrimaryColor}
                      onChange={(e) => setRegPrimaryColor(e.target.value)}
                      style={{
                        width: "34px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-medium)",
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Owner Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Hamza Tariq"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Owner Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="owner@ironclad.com"
                    value={regOwnerEmail}
                    onChange={(e) => setRegOwnerEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={regOwnerPassword}
                    onChange={(e) => setRegOwnerPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Owner Phone (WhatsApp)</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Required &amp; Unique</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="03001234567"
                    value={regOwnerPhone}
                    onChange={(e) => setRegOwnerPhone(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Must be a unique mobile/WhatsApp number not registered to another gym.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", marginTop: "16px" }}
                disabled={loading}
              >
                {loading ? "Setting Up Gym..." : "Launch Gym Platform"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
