"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/client/lib/authStore";
import { Navbar } from "@/client/components/Navbar";
import { Sidebar } from "@/client/components/Sidebar";
import { ApiClient } from "@/client/lib/api";
import { Sparkles, Users, AlertTriangle } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, logout, loginSuccess } = useAuth();
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [demoModeActive, setDemoModeActive] = useState<boolean>(false);
  const [switching, setSwitching] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    checkHealthAndDemo();
  }, []);

  const checkHealthAndDemo = async () => {
    try {
      const res = await ApiClient.get("/api/v1/health");
      setDemoModeActive(res.demoMode === true);
      // Fetch available demo users if in demo mode
      if (res.demoMode) {
        // Will be populated when demo seed data exists
      }
    } catch (err) {
      // Ignore health check failure in offline tests
    }
  };

  const handleDemoSwitch = async (targetUserId: string) => {
    setSwitching(true);
    try {
      const res = await ApiClient.post("/api/v1/auth/switch-role", { targetUserId });
      loginSuccess(res.token, res.user);
    } catch (err: any) {
      alert(err.message || "Could not switch demo persona");
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-600">Loading FoodSync AI Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} onLogout={logout} />

      {/* Controlled Demonstration Mode Banner (Safeguard 6) */}
      {demoModeActive && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-extrabold uppercase tracking-wide text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
              Demonstration Mode Active
            </span>
            <span className="hidden sm:inline text-amber-800 text-[11px]">
              One-click persona switching is restricted to presentation/evaluation environments.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-amber-700" />
            <span className="text-[11px] font-semibold text-amber-800">Switch View:</span>
            <button
              onClick={() => router.push("/login")}
              className="text-[10px] font-bold bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 px-2 py-0.5 rounded transition-all"
            >
              Demo Logins
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
