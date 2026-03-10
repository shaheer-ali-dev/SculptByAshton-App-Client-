import axios from "axios";
import { Storage } from "./storage";

const api = axios.create({
  // ✅ NO /api here — routes like /api/auth/login already include /api
  baseURL: "http://sculptbyashton.com:5000/api",
});

api.interceptors.request.use(
  async (config) => {
    const token = await Storage.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // ✅ Let axios set Content-Type automatically for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("🔴 API Error:", {
      url: error?.config?.url,
      status: error?.response?.status,
      data: error?.response?.data,
      code: error?.code,
      message: error?.message,
    });
    return Promise.reject(error);
  }
);

export default api;