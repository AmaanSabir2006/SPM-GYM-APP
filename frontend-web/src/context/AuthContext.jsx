import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("gymtrack_token") || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("gymtrack_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);

  // Apply dynamic gym branding to root CSS variables
  const applyBrandingTheme = (brandColor) => {
    if (!brandColor) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", brandColor);
    root.style.setProperty("--primary-hover", brandColor);
    root.style.setProperty("--primary-glow", `${brandColor}40`);
    root.style.setProperty("--primary-light", `${brandColor}18`);
  };

  const fetchGymProfile = async () => {
    try {
      const res = await API.get("/gyms/me");
      setGym(res.data);
      if (res.data.primary_color) {
        applyBrandingTheme(res.data.primary_color);
      }
    } catch (err) {
      console.error("Failed to load gym tenant details", err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await fetchGymProfile();
      }
      setLoading(false);
    };

    initAuth();

    // Listen for 401 unauth events
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setGym(null);
      applyBrandingTheme("#E11D48");
    };

    window.addEventListener("gymtrack_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("gymtrack_unauthorized", handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { access_token, gym_id, role, user_name } = res.data;

    localStorage.setItem("gymtrack_token", access_token);
    const userData = { gym_id, role, name: user_name, email };
    localStorage.setItem("gymtrack_user", JSON.stringify(userData));

    setToken(access_token);
    setUser(userData);

    // Fetch gym branding
    const gymRes = await API.get("/gyms/me");
    setGym(gymRes.data);
    if (gymRes.data.primary_color) {
      applyBrandingTheme(gymRes.data.primary_color);
    }

    return res.data;
  };

  const registerGym = async (formData) => {
    const res = await API.post("/auth/register-gym", formData);
    const { access_token, gym_id, role, user_name } = res.data;

    localStorage.setItem("gymtrack_token", access_token);
    const userData = { gym_id, role, name: user_name, email: formData.owner_email };
    localStorage.setItem("gymtrack_user", JSON.stringify(userData));

    setToken(access_token);
    setUser(userData);

    if (formData.primary_color) {
      applyBrandingTheme(formData.primary_color);
    }

    // Refresh gym
    await fetchGymProfile();
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("gymtrack_token");
    localStorage.removeItem("gymtrack_user");
    setToken(null);
    setUser(null);
    setGym(null);
    applyBrandingTheme("#E11D48");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        gym,
        loading,
        login,
        registerGym,
        logout,
        refreshGym: fetchGymProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
