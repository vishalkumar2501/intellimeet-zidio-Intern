const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const getToken = () => localStorage.getItem("accessToken");

export const isAuthenticated = () => !!getToken();

export const clearAuth = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
};

export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearAuth();
  }
};
