import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? "http://localhost:8081/api" : "https://e-waste-backend-ruby.vercel.app/api");

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getFileUrl = (filename) => {
  if (!filename) return "";
  if (
    filename.startsWith("http://") || 
    filename.startsWith("https://") || 
    filename.startsWith("data:") || 
    filename.startsWith("blob:")
  ) {
    return filename;
  }
  return `${API_BASE_URL}/files/${filename}`;
};

// Attach JWT automatically
api.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem("token");

    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }

    return config;

  },
  (error) => Promise.reject(error)
);

export default api;
