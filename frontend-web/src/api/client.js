import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined") {
    // Route through Vite proxy or same-origin reverse proxy
    return "/api/v1";
  }
  return "http://127.0.0.1:8000/api/v1";
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auto-inject JWT Bearer token into all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("gymtrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens or unauthenticated errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("gymtrack_token");
      localStorage.removeItem("gymtrack_user");
      // Optional event or redirect
      window.dispatchEvent(new Event("gymtrack_unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default API;
