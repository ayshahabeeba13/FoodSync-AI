import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRegisterDTO } from "../types/auth";
import ApiService from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (dto: UserRegisterDTO) => Promise<void>;
  logout: () => void;
  switchPersona: (targetUserId: string) => Promise<void>;
  demoMode: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [demoMode, setDemoMode] = useState<boolean>(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Check backend health and demo mode flag
      const health = await ApiService.getHealth().catch(() => null);
      if (health) {
        setDemoMode(health.demo_mode === true);
      }

      const token = localStorage.getItem("foodsync_jwt");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = await ApiService.getMe();
      setUser(currentUser);
    } catch (err) {
      console.warn("Session expired or invalid, logging out:", err);
      localStorage.removeItem("foodsync_jwt");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await ApiService.login({ email, password });
    localStorage.setItem("foodsync_jwt", res.access_token);
    setUser(res.user);
  };

  const register = async (dto: UserRegisterDTO) => {
    const res = await ApiService.register(dto);
    localStorage.setItem("foodsync_jwt", res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem("foodsync_jwt");
    setUser(null);
    window.location.href = "/login";
  };

  const switchPersona = async (targetUserId: string) => {
    const res = await ApiService.switchDemoRole(targetUserId);
    localStorage.setItem("foodsync_jwt", res.access_token);
    setUser(res.user);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await ApiService.getMe();
      setUser(currentUser);
    } catch (err) {
      console.error("Failed refreshing user:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        switchPersona,
        demoMode,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
