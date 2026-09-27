import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Dumbbell, 
  Zap, 
  RefreshCw, 
  Calendar,
  RotateCcw,
  Upload
} from "lucide-react";
import axios from "axios";
import confetti from "canvas-confetti";

// Audio synthesized check-in chime using Web Audio API
const playAccessChime = (type = "success") => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === "success") {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } else {
      // Beep warning
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // AudioContext might be muted by browser autoplay policy until interaction
  }
};

export const MemberScanView = () => {
  const [token, setToken] = useState("");
  const [passInfo, setPassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = "member-camera-viewport";

  // Resilient API requester that tries Vite proxy first (/api/v1), then falls back to direct port :8000
  const fetchWithFallback = async (method, path, data = null, headers = {}) => {
    const candidates = [];
    if (import.meta.env.VITE_API_URL) {
      candidates.push(import.meta.env.VITE_API_URL.replace(/\/$/, ""));
    }
    if (typeof window !== "undefined") {
      candidates.push("/api/v1");
      if (window.location.hostname) {
        candidates.push(`${window.location.protocol}//${window.location.hostname}:8000/api/v1`);
      }
    } else {
      candidates.push("http://127.0.0.1:8000/api/v1");
    }

    let lastError = null;
    for (const base of candidates) {
      try {
        const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
        const config = {
          headers,
          timeout: 8000,
        };
        if (method === "get") {
          return await axios.get(url, config);
        } else if (method === "post") {
          return await axios.post(url, data, config);
        }
      } catch (err) {
        lastError = err;
        // If server actually responded with HTTP error code (e.g. 404, 400, 429), don't try fallback
        if (err.response) {
          throw err;
        }
      }
    }
    throw lastError;
  };

  // 1. Extract mid / token and load athlete pass
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const memberId = params.get("mid");

    const loadPass = async () => {
      setLoading(true);
      setError(null);

      try {
        if (memberId) {
          // Direct public pass info by member id (from short WhatsApp link)
          const res = await fetchWithFallback("get", `/attendance/public-pass-info/${memberId}`);
          setPassInfo(res.data);
          if (res.data.pass_token) {
            setToken(res.data.pass_token);
            localStorage.setItem("member_pass_token", res.data.pass_token);
          }
          localStorage.setItem("member_pass_mid", memberId);
          setLoading(false);
          return;
        }

        const effectiveToken = urlToken || localStorage.getItem("member_pass_token");
        if (effectiveToken) {
          setToken(effectiveToken);
          localStorage.setItem("member_pass_token", effectiveToken);
          const res = await fetchWithFallback("get", "/attendance/member-pass-info", null, {
            Authorization: `Bearer ${effectiveToken}`,
          });
          setPassInfo(res.data);
          setLoading(false);
          return;
        }

        const storedMid = localStorage.getItem("member_pass_mid");
        if (storedMid) {
          const res = await fetchWithFallback("get", `/attendance/public-pass-info/${storedMid}`);
          setPassInfo(res.data);
          if (res.data.pass_token) {
            setToken(res.data.pass_token);
            localStorage.setItem("member_pass_token", res.data.pass_token);
          }
          setLoading(false);
          return;
        }

        setError("Missing entrance pass credentials. Please open the WhatsApp pass link sent by your gym.");
        setLoading(false);
      } catch (err) {
        console.error("Pass fetch failed", err);
        let detail = "Unable to connect to gym server. Please check your connection to the gym Wi-Fi network and try again.";
        if (err.response?.data?.detail) {
          detail = err.response.data.detail;
        } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
          detail = "Server connection timed out. Please check your connection to the gym Wi-Fi network.";
        }
        setError(detail);
        setLoading(false);
      }
    };

    loadPass();
  }, []);

  const fetchPassInfo = async (authToken) => {
    try {
      const res = await fetchWithFallback(
        "get",
        "/attendance/member-pass-info",
        null,
        { Authorization: `Bearer ${authToken}` }
      );
      setPassInfo(res.data);
    } catch (err) {
      console.error("Pass refresh failed", err);
    }
  };


  // 3. Initialize Camera Scanning with html5-qrcode
  const startScanner = async () => {
    setCameraError(null);
    setScanResult(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // ignore if already stopped
        }
      }

      const qrCodeScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrCodeScanner;

      // Enumerate cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError("No camera detected on this device. You can snap a QR photo below or use Quick Test.");
        return;
      }

      setAvailableCameras(devices);
      // Prefer back camera ("environment")
      const backCam = devices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear"));
      const targetCamId = selectedCameraId || (backCam ? backCam.id : devices[0].id);

      await qrCodeScanner.start(
        targetCamId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Successfully scanned QR code!
          console.log("Scanned QR code:", decodedText);
          await handleQrCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Frame parse error (normal while searching for QR)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Camera startup error:", err);
      const isHttpIp = typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      if (isHttpIp) {
        setCameraError(
          "Mobile & desktop browsers block live streaming cameras over plain HTTP for security. Please tap 'Snap / Upload QR Photo' below to take a photo of the entrance QR, or use Quick Test."
        );
      } else {
        setCameraError(
          "Camera permission was denied or not supported. Please allow camera access in browser settings, or tap 'Snap / Upload QR Photo' below."
        );
      }
      setScanning(false);
    }
  };

  // 3b. Photo Capture & File Upload QR Scanner (works 100% on HTTP and all devices!)
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (submitting) return;
    setSubmitting(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      let qrScanner = html5QrCodeRef.current;
      if (!qrScanner) {
        qrScanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = qrScanner;
      }

      const decodedText = await qrScanner.scanFile(file, true);
      console.log("Scanned QR from photo:", decodedText);
      await handleQrCodeScanned(decodedText);
    } catch (err) {
      console.error("File scan failed", err);
      setCameraError(
        "Could not detect a QR code in the photo. Please make sure the gym QR code is clearly visible and well-lit, then try again."
      );
    } finally {
      setSubmitting(false);
      e.target.value = "";
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // 4. Handle QR Verification and Check-in
  const handleQrCodeScanned = async (rawCode) => {
    // Prevent duplicate triggers
    if (submitting) return;
    setSubmitting(true);

    // Stop camera to freeze frame
    await stopScanner();

    // Clean scanned code (could be full URL or direct token)
    let gymToken = rawCode.trim();
    if (gymToken.includes("token=")) {
      const match = gymToken.match(/token=([a-zA-Z0-9_-]+)/);
      if (match) gymToken = match[1];
    }

    try {
      const res = await fetchWithFallback(
        "post",
        "/attendance/check-in",
        {
          gym_qr_token: gymToken,
        },
        { Authorization: `Bearer ${token}` }
      );

      // Access granted!
      playAccessChime("success");
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#E63946", "#10B981", "#3B82F6", "#F59E0B"],
      });

      setScanResult({
        success: true,
        message: res.data.message || "Access Granted! Welcome to the gym.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      // Refresh pass info in background
      fetchPassInfo(token);
    } catch (err) {
      console.error("Check-in error:", err);
      playAccessChime("error");
      const detail = err.response?.data?.detail || "Check-in failed. Please verify the gym QR poster.";
      setScanResult({
        success: false,
        message: detail,
        isCooldown: err.response?.status === 429,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick test check-in with gym token (for laptop or without camera)
  const handleQuickTestEntrance = () => {
    if (passInfo?.gym_qr_token) {
      handleQrCodeScanned(passInfo.gym_qr_token);
    }
  };

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

  if (loading) {
    return (
      <div className="member-scan-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0B0F19", color: "white", padding: "20px" }}>
        <RefreshCw size={36} className="spin" color="#E63946" style={{ marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-athletic)", letterSpacing: "0.05em" }}>
          VERIFYING ATHLETE PASS...
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "14px" }}>Securing entrance permissions</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="member-scan-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0B0F19", color: "white", padding: "24px", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", marginBottom: "16px" }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", fontFamily: "var(--font-athletic)" }}>
          PASS VERIFICATION FAILED
        </h2>
        <p style={{ color: "#94A3B8", maxWidth: "340px", fontSize: "14px", lineHeight: 1.5, marginBottom: "24px" }}>
          {error}
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
          style={{ background: "#1E293B", color: "white", borderColor: "#334155" }}
        >
          <RotateCcw size={16} />
          Retry Pass Loading
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #090D16 0%, #0F172A 100%)",
        color: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 16px 32px",
        boxSizing: "border-box",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Top Gym Branding */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #E63946 0%, #991B1B 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 900,
              boxShadow: "0 4px 12px rgba(230, 57, 70, 0.4)",
            }}
          >
            <Dumbbell size={20} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-athletic)", letterSpacing: "0.06em", color: "white", textTransform: "uppercase" }}>
              {passInfo?.gym_name || "IRON GYM & FITNESS"}
            </div>
            <div style={{ fontSize: "11px", color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={12} />
              OFFICIAL ENTRANCE ACCESS GATE
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            background: passInfo?.status === "active" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
            color: passInfo?.status === "active" ? "#34D399" : "#F87171",
            padding: "4px 8px",
            borderRadius: "6px",
            textTransform: "uppercase",
            border: `1px solid ${passInfo?.status === "active" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
          }}
        >
          {passInfo?.status || "ACTIVE"}
        </span>
      </div>

      {/* Athlete Membership Pass Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "18px",
          padding: "16px 18px",
          marginBottom: "18px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: "-15px", right: "-15px", width: "90px", height: "90px", background: "radial-gradient(circle, rgba(230, 57, 70, 0.25) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ATHLETE PASS
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "white", marginTop: "2px" }}>
              {passInfo?.member_name}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              MONTHLY FEE
            </div>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#E63946" }}>
              Rs. {Number(passInfo?.monthly_fee || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            paddingTop: "10px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "12.5px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#CBD5E1" }}>
            <Calendar size={14} color="#94A3B8" />
            <span>Due Date: <strong>{passInfo?.billing_cycle_day}{getDaySuffix(passInfo?.billing_cycle_day)}/mo</strong></span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#CBD5E1", justifyContent: "flex-end" }}>
            <Zap size={14} color="#F59E0B" />
            <span>Total Check-ins: <strong>{passInfo?.total_check_ins || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Scanner Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "22px",
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 15px 35px -5px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "white", margin: 0, fontFamily: "var(--font-athletic)", letterSpacing: "0.04em" }}>
            POINT CAMERA AT GYM ENTRANCE POSTER
          </h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
            Scan the entrance QR code to check in and unlock access.
          </p>
        </div>

        {/* Camera Viewport */}
        <div
          style={{
            width: "100%",
            maxWidth: "320px",
            height: "320px",
            position: "relative",
            borderRadius: "18px",
            overflow: "hidden",
            background: "#000",
            border: scanning ? "2px solid #E63946" : "2px dashed rgba(255, 255, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* html5-qrcode mounts inside this div */}
          <div
            id={scannerContainerId}
            style={{
              width: "100%",
              height: "100%",
            }}
          />

          {!scanning && !scanResult && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                textAlign: "center",
                background: "radial-gradient(circle, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  background: "rgba(230, 57, 70, 0.15)",
                  border: "1px solid rgba(230, 57, 70, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#E63946",
                  marginBottom: "14px",
                  boxShadow: "0 0 25px rgba(230, 57, 70, 0.25)",
                }}
              >
                <Camera size={32} />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={startScanner}
                style={{
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: 800,
                  boxShadow: "0 6px 20px rgba(230, 57, 70, 0.45)",
                }}
              >
                <Camera size={18} />
                Open Live Scanner
              </button>

              <label
                style={{
                  marginTop: "12px",
                  padding: "10px 18px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#F8FAFC",
                  borderRadius: "10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <Upload size={16} color="#E63946" />
                <span>Snap / Upload QR Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileScan}
                  style={{ display: "none" }}
                />
              </label>

              <span style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
                ⚡ Works on all mobile devices & browsers
              </span>
            </div>
          )}

          {/* Scanning Laser Line when Camera Active */}
          {scanning && (
            <div
              style={{
                position: "absolute",
                left: "15%",
                right: "15%",
                height: "2px",
                background: "linear-gradient(90deg, transparent 0%, #E63946 50%, transparent 100%)",
                boxShadow: "0 0 12px #E63946, 0 0 24px #E63946",
                animation: "scanner-laser 2s ease-in-out infinite",
                zIndex: 10,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Scan Result Overlay */}
          {scanResult && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: scanResult.success
                  ? "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(6, 95, 70, 0.98) 100%)"
                  : scanResult.isCooldown
                  ? "linear-gradient(135deg, rgba(120, 53, 15, 0.95) 0%, rgba(146, 64, 14, 0.98) 100%)"
                  : "linear-gradient(135deg, rgba(127, 29, 29, 0.95) 0%, rgba(153, 27, 27, 0.98) 100%)",
                zIndex: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                textAlign: "center",
                backdropFilter: "blur(5px)",
              }}
            >
              {scanResult.success ? (
                <>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "rgba(16, 185, 129, 0.2)",
                      border: "2px solid #34D399",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#34D399",
                      marginBottom: "12px",
                      boxShadow: "0 0 20px rgba(52, 211, 153, 0.4)",
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 900, fontFamily: "var(--font-athletic)", letterSpacing: "0.06em", color: "white" }}>
                    ACCESS GRANTED!
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#A7F3D0", marginTop: "4px" }}>
                    {scanResult.message}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", marginTop: "8px" }}>
                    Verified at {scanResult.time} • Turnstile Unlocked
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "2px solid #F87171",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F87171",
                      marginBottom: "12px",
                    }}
                  >
                    <AlertCircle size={36} />
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 900, fontFamily: "var(--font-athletic)", color: "white" }}>
                    {scanResult.isCooldown ? "ALREADY CHECKED IN" : "ACCESS DENIED"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#FEE2E2", marginTop: "4px", lineHeight: 1.4 }}>
                    {scanResult.message}
                  </div>
                </>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setScanResult(null);
                  startScanner();
                }}
                style={{
                  marginTop: "16px",
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "white",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <RotateCcw size={14} />
                Scan Again
              </button>
            </div>
          )}
        </div>

        {/* Camera error message */}
        {cameraError && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px 16px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "12px",
              fontSize: "12.5px",
              color: "#FCA5A5",
              textAlign: "center",
              lineHeight: 1.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div>{cameraError}</div>
            <label
              className="btn btn-primary btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 800,
                boxShadow: "0 4px 14px rgba(230, 57, 70, 0.4)",
              }}
            >
              <Camera size={15} />
              <span>Snap QR Photo (Works on All Browsers)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileScan}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {/* Controls when camera active */}
        {scanning && (
          <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={stopScanner}
              style={{ background: "#1E293B", color: "white", borderColor: "#334155" }}
            >
              Stop Camera
            </button>
          </div>
        )}

        {/* Desktop / Manual Check-In Test Helper */}
        <div
          style={{
            marginTop: "20px",
            width: "100%",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11.5px", color: "#64748B", marginBottom: "8px" }}>
            Testing from desktop browser or camera unavailable?
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleQuickTestEntrance}
            disabled={submitting}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "#E2E8F0",
              borderColor: "rgba(255, 255, 255, 0.12)",
              fontSize: "12px",
              padding: "6px 14px",
            }}
          >
            <Zap size={13} color="#F59E0B" />
            Quick Test Entrance Check-In
          </button>
        </div>
      </div>

      {/* Footer Support Text */}
      <div style={{ marginTop: "24px", textAlign: "center", color: "#64748B", fontSize: "12px" }}>
        GymTrack Athlete Pass • Secure Tenant Access Protocol
      </div>

      {/* Laser Scan Animation Keyframes */}
      <style>{`
        @keyframes scanner-laser {
          0% { top: 15%; opacity: 0.8; }
          50% { top: 85%; opacity: 1; }
          100% { top: 15%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
