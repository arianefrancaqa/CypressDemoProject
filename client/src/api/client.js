import axios from "axios";

const TOKEN_KEY = "budget_tracker_token";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function apiErrorMessage(error) {
  return error.response?.data?.error || "Something went wrong. Please try again.";
}

function apiErrorDetails(error) {
  return error.response?.data?.details || [];
}

export { client, getToken, setToken, clearToken, apiErrorMessage, apiErrorDetails };
