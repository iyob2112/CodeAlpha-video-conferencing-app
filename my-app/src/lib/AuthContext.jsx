import { createContext, useContext, useEffect, useState } from "react";
import { getToken, removeToken } from "@/lib/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const checkAuth = () => {
    const token = getToken();
    setIsAuthenticated(!!token);
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setIsAuthenticated(true);
  };

  // Call this whenever a request comes back 401 (expired/invalid token),
  // not just from an explicit "log out" button click. This guarantees the
  // user is bounced to /login via ProtectedRoute instead of being left on
  // a degraded page that silently failed its /api/auth/me call.
  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoadingAuth,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);