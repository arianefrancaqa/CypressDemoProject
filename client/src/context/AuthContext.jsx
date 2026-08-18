import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { getToken, setToken, clearToken } from "../api/client";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((profile) => setUser(profile))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const { token, user: loggedInUser } = await authApi.login(credentials);
    setToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(fields) {
    return authApi.register(fields);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };
