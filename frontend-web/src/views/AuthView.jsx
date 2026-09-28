import React, { useState, useEffect } from "react";
import { 
  Dumbbell, 
  ShieldCheck, 
  Receipt, 
  QrCode, 
  ArrowRight, 
  Sun, 
  Moon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  Phone,
  User,
  Globe,
  Check,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const AuthView = () => {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const { login, registerGym } = useAuth();
  const { showToast } = useToast();

  const [theme, setTheme] = useState(() => localStorage.getItem("gymtrack_theme") || "dark");

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state - default is Crimson Red (#E11D48) as requested
  const [regGymName, setRegGymName] = useState("");
  const [regGymSlug, setRegGymSlug] = useState("");
  const [regPrimaryColor, setRegPrimaryColor] = useState(() => {
    const saved = localStorage.getItem("gymtrack_preview_color");
    if (saved && saved !== "#2563EB") return saved;
    return "#E11D48";
  });
  const [regOwnerName, setRegOwnerName] = useState("");
  const [regOwnerEmail, setRegOwnerEmail] = useState("");
  const [regOwnerPassword, setRegOwnerPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regOwnerPhone, setRegOwnerPhone] = useState("");

  const [loading, setLoading] = useState(false);

  // Live brand color synchronization: seamlessly applied whether in login or onboarding
  // When user goes to onboarding and selects a new color, it stays selected when returning to login!
  useEffect(() => {
    if (regPrimaryColor) {
      document.documentElement.style.setProperty("--primary", regPrimaryColor);
      document.documentElement.style.setProperty("--primary-hover", regPrimaryColor);
      document.documentElement.style.setProperty("--primary-glow", `${regPrimaryColor}40`);
      document.documentElement.style.setProperty("--primary-light", `${regPrimaryColor}18`);
      localStorage.setItem("gymtrack_preview_color", regPrimaryColor);
    }
  }, [regPrimaryColor]);

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

  // Red is the primary default choice
  const colorPresets = [
    { name: "Crimson Red", hex: "#E11D48" },
    { name: "Royal Blue", hex: "#2563EB" },
    { name: "Emerald Green", hex: "#10B981" },
    { name: "Cyber Cyan", hex: "#06B6D4" },
    { name: "Sunset Orange", hex: "#F97316" },
    { name: "Royal Purple", hex: "#8B5CF6" },
  ];

  return (
    <div className="auth-page-wrapper">
      {/* Top Header Navigation Bar */}
      <header className="auth-top-nav">
        <div className="auth-nav-brand">
          <div className="auth-brand-logo-icon">
            <Dumbbell size={22} />
          </div>
          <div className="auth-brand-name-group">
            <span className="auth-brand-title">GymTrack</span>
            <span className="auth-brand-badge">Enterprise Cloud</span>
          </div>
        </div>

        <div className="auth-nav-controls">
          <div className="auth-status-pill">
            <span className="auth-status-dot"></span>
            <span>Cloud Network Operational</span>
          </div>

          <button
            type="button"
            className="auth-theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          >
            {theme === "light" ? (
              <>
                <Moon size={15} />
                <span>Night Mode</span>
              </>
            ) : (
              <>
                <Sun size={15} color="#F59E0B" />
                <span>Day Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Auth & Onboarding Container */}
      <main className="auth-card-container">
        {/* Left Side: Brand Showcase with /gym_hero.jpg Depth */}
        <section className="auth-showcase-panel">
          <div className="auth-showcase-bg"></div>
          <div className="auth-showcase-overlay"></div>

          <div className="auth-showcase-content">
            <div>
              <div className="auth-showcase-badge">
                <Sparkles size={13} />
                <span>The Operating System for Elite Gyms</span>
              </div>

              <h1 className="auth-showcase-title">
                Automate Fee Recovery &amp; <span className="highlight">Entrance Check-ins.</span>
              </h1>
              <p className="auth-showcase-desc">
                Engineered specifically for gym owners to eliminate paper registers, reduce overdue dues with 1-tap WhatsApp notifications, and modernize entrances with contactless QR self-scanning.
              </p>

              {/* Feature Highlights with Harmonized Theme Micro-Cards */}
              <div className="auth-feature-list">
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="auth-feature-title">1-Tap WhatsApp Dues Recovery</div>
                    <div className="auth-feature-sub">
                      Instantly notify overdue members directly on WhatsApp without expensive third-party SMS APIs.
                    </div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <div className="auth-feature-title">Contactless QR Entrance Scanner</div>
                    <div className="auth-feature-sub">
                      Members scan a printed entrance poster for immediate attendance verification. Anti-double scan built-in.
                    </div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="auth-feature-title">100% Private Isolated Tenant</div>
                    <div className="auth-feature-sub">
                      Your members, financial trajectories, and revenue data are strictly isolated with custom white-label branding.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Metrics Bar */}
            <div className="auth-trust-bar">
              <div className="auth-trust-stat">
                <span className="auth-trust-val">99.4%</span>
                <span className="auth-trust-label">Fee Recovery Rate</span>
              </div>
              <div className="auth-trust-stat">
                <span className="auth-trust-val">&lt; 180ms</span>
                <span className="auth-trust-label">Entrance QR Scan</span>
              </div>
              <div className="auth-trust-stat">
                <span className="auth-trust-val">Zero</span>
                <span className="auth-trust-label">SMS Billing Costs</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Auth Form Panel */}
        <section className="auth-form-card">
          <div className="auth-form-inner">
            {/* Segmented Mode Switcher */}
            <div className="auth-mode-switch">
            <button
              type="button"
              className={`auth-mode-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => setMode("login")}
            >
              <User size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-mode-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => setMode("register")}
            >
              <Building2 size={15} />
              <span>Onboard Gym</span>
            </button>
          </div>

          {mode === "login" ? (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleLoginSubmit} className="auth-form-body">
              <div className="auth-form-header">
                <h2 className="auth-form-title">Welcome Back</h2>
                <p className="auth-form-subtitle">
                  Enter your registered owner credentials to access your facility command center.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: "18px" }}>
                <label className="form-label" style={{ display: "block", marginBottom: "7px", fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)" }}>
                  Registered Email Address
                </label>
                <div className="auth-input-wrapper">
                  <div className="auth-input-icon">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    className="auth-field-input"
                    placeholder="owner@olympia.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)" }}>
                    Account Password
                  </label>
                </div>
                <div className="auth-input-wrapper">
                  <div className="auth-input-icon">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    className="auth-field-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    title={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}></span>
                    <span>Authenticating Facility...</span>
                  </>
                ) : (
                  <>
                    <span>Access Gym Dashboard</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="auth-footer-shield">
                <ShieldCheck size={14} color="var(--primary)" />
                <span>Protected by 256-Bit Tenant Cloud Encryption</span>
              </div>
            </form>
          ) : (
            /* ================= ONBOARD GYM FORM ================= */
            <form onSubmit={handleRegisterSubmit} className="auth-form-body">
              <div className="auth-form-header">
                <h2 className="auth-form-title">Onboard New Facility</h2>
                <p className="auth-form-subtitle">
                  Configure your facility identity, white-label color, and owner credentials.
                </p>
              </div>

              <div className="auth-form-scroll-box">
                {/* 1. Gym Facility Name */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    Gym Facility Name
                  </label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Building2 size={16} />
                    </div>
                    <input
                      type="text"
                      className="auth-field-input"
                      placeholder="e.g. Iron Clad Fitness"
                      value={regGymName}
                      onChange={handleGymNameChange}
                      required
                    />
                  </div>
                </div>

                {/* 2. Gym URL Slug */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                      Entrance URL Slug
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>
                      gymtrack.app/scan/{regGymSlug || "your-gym"}
                    </span>
                  </div>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Globe size={16} />
                    </div>
                    <input
                      type="text"
                      className="auth-field-input"
                      placeholder="iron-clad-fitness"
                      value={regGymSlug}
                      onChange={(e) => setRegGymSlug(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 3. Primary Brand Accent Color */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    White-Label Theme Accent Color
                  </label>
                  <div className="auth-color-presets-row">
                    {colorPresets.map((c) => {
                      const isSelected = regPrimaryColor.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          className={`auth-color-swatch ${isSelected ? "selected" : ""}`}
                          onClick={() => setRegPrimaryColor(c.hex)}
                          style={{ background: c.hex }}
                          title={c.name}
                        >
                          {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                      <input
                        type="color"
                        value={regPrimaryColor.startsWith("#") ? regPrimaryColor : "#E11D48"}
                        onChange={(e) => setRegPrimaryColor(e.target.value)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-medium)",
                          cursor: "pointer",
                          background: "transparent",
                          padding: "2px",
                        }}
                        title="Pick custom color"
                      />
                      <span style={{ fontSize: "11.5px", fontFamily: "monospace", color: "var(--text-muted)", fontWeight: 700 }}>
                        {regPrimaryColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Owner Full Name */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    Facility Owner Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      className="auth-field-input"
                      placeholder="Hamza Tariq"
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 5. Owner Email */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    Owner Email (Login Username)
                  </label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      className="auth-field-input"
                      placeholder="owner@ironclad.com"
                      value={regOwnerEmail}
                      onChange={(e) => setRegOwnerEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 6. Owner Password */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    Account Password
                  </label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      className="auth-field-input"
                      placeholder="••••••••"
                      value={regOwnerPassword}
                      onChange={(e) => setRegOwnerPassword(e.target.value)}
                      required
                      style={{ paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      title={showRegPassword ? "Hide password" : "Show password"}
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* 7. Owner Phone / WhatsApp */}
                <div className="form-group" style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                      Owner Phone (WhatsApp Active)
                    </label>
                    <span style={{ fontSize: "10.5px", color: "var(--color-warning)", fontWeight: 700 }}>
                      Unique Number Required
                    </span>
                  </div>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      className="auth-field-input"
                      placeholder="03001234567"
                      value={regOwnerPhone}
                      onChange={(e) => setRegOwnerPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Used for critical WhatsApp recovery and facility verification alerts.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}></span>
                    <span>Provisioning Gym Instance...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Gym Platform</span>
                    <Sparkles size={17} />
                  </>
                )}
              </button>

              <div className="auth-footer-shield">
                <CheckCircle2 size={14} color="var(--color-success)" />
                <span>Instant Provisioning • White-label Setup Included</span>
              </div>
            </form>
          )}
          </div>
        </section>
      </main>
    </div>
  );
};
