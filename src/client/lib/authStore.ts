"use client";

import { useState, useEffect } from "react";
import { ApiClient } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "RESTAURANT_MANAGER" | "RESTAURANT_STAFF" | "NGO_COORDINATOR" | "PLATFORM_ADMIN";
  restaurantId?: string;
  ngoId?: string;
  restaurant?: {
    id: string;
    name: string;
    cuisine: string;
    fssaiLicenseNumber: string;
  };
  ngo?: {
    id: string;
    name: string;
    verificationStatus: string;
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("foodsync_token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await ApiClient.get<{ user: AuthUser }>("/api/v1/auth/me");
      setUser(res.user);
    } catch (err) {
      localStorage.removeItem("foodsync_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("foodsync_token");
    setUser(null);
    window.location.href = "/login";
  };

  const loginSuccess = (token: string, userData: AuthUser) => {
    localStorage.setItem("foodsync_token", token);
    setUser(userData);
  };

  return {
    user,
    loading,
    logout,
    loginSuccess,
    refetchUser: checkAuth,
  };
}
