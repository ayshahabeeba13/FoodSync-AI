"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiClient } from "@/client/lib/api";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await ApiClient.post("/api/v1/auth/login", { email, password });
      localStorage.setItem("foodsync_token", res.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed signing in");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-600 items-center justify-center text-white font-bold text-2xl shadow-md">
            FS
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">FoodSync AI</h1>
          <p className="text-xs text-slate-500">Sign in to your restaurant or NGO rescue account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@bellaitalia.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Pre-fill Box */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Demo Personas
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickDemo("manager@bellaitalia.com", "Password@123")}
                className="p-2 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 rounded-lg text-left transition-colors border border-emerald-200/60"
              >
                <div className="font-bold text-[11px]">Bella Italia</div>
                <div className="text-[10px] text-emerald-600">Restaurant Manager</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo("staff@greengarden.com", "Password@123")}
                className="p-2 bg-amber-50/70 hover:bg-amber-100 text-amber-800 rounded-lg text-left transition-colors border border-amber-200/60"
              >
                <div className="font-bold text-[11px]">Green Garden</div>
                <div className="text-[10px] text-amber-600">Kitchen Staff</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo("coordinator@cityhope.org", "Password@123")}
                className="p-2 bg-blue-50/70 hover:bg-blue-100 text-blue-800 rounded-lg text-left transition-colors border border-blue-200/60"
              >
                <div className="font-bold text-[11px]">City Hope NGO</div>
                <div className="text-[10px] text-blue-600">NGO Coordinator</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo("admin@foodsync.ai", "Password@123")}
                className="p-2 bg-purple-50/70 hover:bg-purple-100 text-purple-800 rounded-lg text-left transition-colors border border-purple-200/60"
              >
                <div className="font-bold text-[11px]">Platform Admin</div>
                <div className="text-[10px] text-purple-600">SuperAdmin</div>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-500">
              Register now
            </Link>
          </div>
        </div>

        {/* FSSAI Regulatory Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>FSSAI Surplus Food Regulations (2019) Certified</span>
        </div>
      </div>
    </div>
  );
}
