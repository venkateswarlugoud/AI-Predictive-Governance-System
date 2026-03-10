import API from "./axios";

// Use sessionStorage so login does NOT persist after browser/tab close.
// Also support reading/clearing old localStorage tokens for backward compatibility.
const TOKEN_KEY = "token";
const USER_KEY = "user";

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const [, payloadBase64] = token.split(".");
    if (!payloadBase64) return false;
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false;
    const expiresAtMs = payload.exp * 1000;
    return Date.now() >= expiresAtMs;
  } catch (e) {
    // If we can't parse the token, treat it as invalid/expired
    return true;
  }
};

const storage = {
  getToken: () =>
    sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY),
  getUser: () =>
    sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY),
  setSession: (token, user) => {
    // Write ONLY to sessionStorage for new logins
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    // Clean up any old localStorage entries
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  clearAll: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const register = async (userData) => {
  const response = await API.post("/auth/register", userData);
  return response.data;
};

export const login = async (email, password) => {
  const response = await API.post("/auth/login", { email, password });
  if (response.data.token) {
    storage.setSession(response.data.token, response.data.user);
  }
  return response.data;
};

export const logout = () => {
  storage.clearAll();
};

export const getCurrentUser = () => {
  try {
    const token = storage.getToken();
    if (!token || isTokenExpired(token)) {
      logout();
      return null;
    }

    const userStr = storage.getUser();
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    logout();
    return null;
  }
};

export const getToken = () => {
  const token = storage.getToken();
  if (!token || isTokenExpired(token)) {
    logout();
    return null;
  }
  return token;
};

export const isAuthenticated = () => {
  const token = storage.getToken();
  return !!token && !isTokenExpired(token);
};

export const forgotPassword = async (email) => {
  const response = await API.post("/auth/forgot-password", { email });
  return response.data;
};