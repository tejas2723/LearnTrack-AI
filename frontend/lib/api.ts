import axios from "axios";

// Create Axios client pointing to FastAPI server
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  withCredentials: true, // Send HTTP-only cookies with every request
  timeout: 30000, // 30s timeout for slow Atlas queries (ML predictions, seeding)
});

// Global interceptor: only redirect to /auth/login on true 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Only redirect if not already on an auth page
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
