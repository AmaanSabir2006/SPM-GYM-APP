import React, { useState } from "react";
import { 
  Palette, 
  Sun, 
  Moon, 
  Check, 
  Dumbbell, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw,
  Building2,
  Mail,
  QrCode
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const PRESET_COLORS = [
  { name: "Royal Executive", hex: "#2563EB", desc: "Modern, professional & balanced (Recommended)" },
  { name: "Electric Blue", hex: "#3B82F6", desc: "Clean, high-energy & tech" },
  { name: "Deep Indigo", hex: "#4F46E5", desc: "Sleek tech & premium" },
  { name: "Vibrant Purple", hex: "#7C3AED", desc: "Elite athletic club" },
  { name: "Emerald Growth", hex: "#059669", desc: "Health, vitality & fresh" },
  { name: "Crimson Athletic", hex: "#E11D48", desc: "High energy & power" },
  { name: "Amber Bronze", hex: "#D97706", desc: "Warm strength & focus" },
  { name: "Teal Sport", hex: "#0D9488", desc: "Crisp & contemporary athletic" },
];

export const SettingsView = () => {
  const { gym, user, updateBrandColor } = useAuth();
  const { showToast } = useToast();

  const currentStored = localStorage.getItem("gymtrack_brand_color") || gym?.primary_color || "#2563EB";
  const [selectedColor, setSelectedColor] = useState(currentStored);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("gymtrack_theme") || "light");

  const handleSelectColor = (hex) => {
    setSelectedColor(hex);
    updateBrandColor(hex);
    showToast(`Brand theme color updated to ${hex}`, "success");
  };

  const handleCustomHexChange = (e) => {
    const val = e.target.value;
    setSelectedColor(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      updateBrandColor(val);
      showToast(`Custom color applied: ${val}`, "success");
    }
  };

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("gymtrack_theme", mode);
    showToast(`Switched to ${mode === "dark" ? "Dark" : "Light"} mode`, "info");
  };

  const handleResetDefault = () => {
    const defaultColor = "#2563EB";
    setSelectedColor(defaultColor);
    updateBrandColor(defaultColor);
    showToast("Reset brand theme color to default Royal Blue.", "info");
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-tag">
          <Palette size={14} color="var(--primary)" />
          <span>PORTAL CONFIGURATION</span>
        </div>
        <h2 className="settings-title">Facility & Application Settings</h2>
        <p className="settings-subtitle">
          Customize your gym management portal colors, branding themes, and operational appearance.
        </p>
      </div>

      <div className="settings-grid">
        {/* Left Column: Theme & Color Customizer */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="settings-card-title">Brand & Accent Theme Color</h3>
              <p className="settings-card-desc">
                Select your gym's official business color. This theme color is applied to buttons, active navigation, badges, and glows.
              </p>
            </div>
          </div>

          {/* Color Preset Swatches */}
          <div className="color-presets-grid">
            {PRESET_COLORS.map((color) => {
              const isSelected = selectedColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <div
                  key={color.hex}
                  className={`color-preset-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectColor(color.hex)}
                >
                  <div 
                    className="color-circle" 
                    style={{ background: color.hex }}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </div>
                  <div className="color-info">
                    <span className="color-name">{color.name}</span>
                    <span className="color-hex">{color.hex}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Hex Picker Input */}
          <div className="custom-color-row">
            <div className="custom-color-picker-box">
              <label htmlFor="colorPickerInput" className="custom-color-label">
                Custom Color Picker
              </label>
              <div className="custom-color-input-wrapper">
                <input
                  id="colorPickerInput"
                  type="color"
                  className="color-wheel-picker"
                  value={selectedColor.startsWith("#") && selectedColor.length === 7 ? selectedColor : "#2563EB"}
                  onChange={(e) => handleSelectColor(e.target.value)}
                  title="Pick custom color"
                />
                <input
                  type="text"
                  className="form-input custom-hex-text"
                  placeholder="#E11D48"
                  value={selectedColor}
                  onChange={handleCustomHexChange}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetDefault}
              title="Reset to default color"
            >
              <RotateCcw size={14} />
              Reset Default
            </button>
          </div>

          {/* Live Preview Box */}
          <div className="theme-preview-box">
            <span className="theme-preview-label">Live Theme Preview</span>
            <div className="theme-preview-items">
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                style={{ background: selectedColor, boxShadow: `0 4px 14px ${selectedColor}40` }}
              >
                <Sparkles size={14} />
                Primary Action Button
              </button>

              <span 
                className="badge-active"
                style={{ background: `${selectedColor}18`, color: selectedColor, borderColor: `${selectedColor}33` }}
              >
                Active Status Badge
              </span>

              <div 
                className="preview-tab-pill"
                style={{ background: selectedColor, color: "#FFFFFF" }}
              >
                <Dumbbell size={14} />
                <span>Active Nav Tab</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Display Appearance & Facility Info */}
        <div className="settings-column-right">
          {/* Theme Display Card */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                {themeMode === "dark" ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <h3 className="settings-card-title">Display Mode</h3>
                <p className="settings-card-desc">
                  Toggle between executive light mode and sleek dark room atmosphere.
                </p>
              </div>
            </div>

            <div className="theme-mode-options">
              <div 
                className={`theme-mode-btn ${themeMode === "light" ? "active" : ""}`}
                onClick={() => handleThemeChange("light")}
              >
                <Sun size={22} className="theme-mode-icon" />
                <div className="theme-mode-text">
                  <strong>Light Theme</strong>
                  <span>Crisp corporate daylight</span>
                </div>
                {themeMode === "light" && <Check size={16} color="var(--primary)" />}
              </div>

              <div 
                className={`theme-mode-btn ${themeMode === "dark" ? "active" : ""}`}
                onClick={() => handleThemeChange("dark")}
              >
                <Moon size={22} className="theme-mode-icon" />
                <div className="theme-mode-text">
                  <strong>Dark Theme</strong>
                  <span>High contrast slate night</span>
                </div>
                {themeMode === "dark" && <Check size={16} color="var(--primary)" />}
              </div>
            </div>
          </div>

          {/* Facility Details Summary */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="settings-card-title">Facility Profile</h3>
                <p className="settings-card-desc">Registered tenant credentials and digital access token.</p>
              </div>
            </div>

            <div className="facility-info-list">
              <div className="facility-info-row">
                <span className="facility-info-label">Gym Business Name</span>
                <strong className="facility-info-val">{gym?.name || "Iron Gym"}</strong>
              </div>
              <div className="facility-info-row">
                <span className="facility-info-label">Owner Account</span>
                <span className="facility-info-val">{user?.email || "owner@gymtrack.local"}</span>
              </div>
              <div className="facility-info-row">
                <span className="facility-info-label">Current Brand Color</span>
                <span className="facility-info-color-tag">
                  <span className="color-swatch-sm" style={{ background: selectedColor }} />
                  {selectedColor.toUpperCase()}
                </span>
              </div>
              <div className="facility-info-row">
                <span className="facility-info-label">QR Turnstile Pass</span>
                <span className="badge badge-active">
                  <ShieldCheck size={13} /> Active & Secured
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
