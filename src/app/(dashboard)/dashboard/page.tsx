"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/client/lib/authStore";
import {
  Boxes,
  TrendingUp,
  ArrowLeftRight,
  HeartHandshake,
  ShieldCheck,
  Receipt,
  UtensilsCrossed,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const isRestaurant = user?.role === "RESTAURANT_MANAGER" || user?.role === "RESTAURANT_STAFF";
  const isNGO = user?.role === "NGO_COORDINATOR";

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            System Operational • FSSAI Regulations (2019) Active
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Welcome back, {user?.name || "Partner"}
          </h1>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isRestaurant
              ? `Operational console for ${user?.restaurant?.name || "your restaurant"}. Real-time FEFO batch depletion, AI demand forecast, and automated surplus rescue.`
              : isNGO
              ? `Charity rescue portal for ${user?.ngo?.name || "your organization"}. Claim verified edible surplus food and dispatch pickups with secure 6-digit OTP tokens.`
              : "FoodSync AI Platform Administration & Safety Oversight."}
          </p>
        </div>

        <div className="flex gap-2">
          {isRestaurant && (
            <Link
              href="/pos"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              Open POS Billing
            </Link>
          )}
          {isNGO && (
            <Link
              href="/donations"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <HeartHandshake className="h-4 w-4" />
              Browse Surplus Feed
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">FEFO Batches</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">Active</div>
          <p className="text-[11px] text-slate-500">Earliest expiry allocated first upon checkout</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tomorrow&apos;s Forecast</span>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">3-Tier ML</div>
          <p className="text-[11px] text-slate-500">Covers $\rightarrow$ Dishes $\rightarrow$ Raw ingredients (MAE tracked)</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">B2B Exchange</span>
            <ArrowLeftRight className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">Surplus Match</div>
          <p className="text-[11px] text-slate-500">Surplus-to-shortage atomic transfers</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Food Safety Gateway</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">Human Sign-Off</div>
          <p className="text-[11px] text-slate-500">Mandatory staff verification active</p>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Batch Inventory & Expiry Alerts</h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspect current raw ingredient lots and prepared meals. View FEFO depletion queue and shelf-life timers.
            </p>
          </div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Manage Inventory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Predictive AI Forecast</h3>
            <p className="text-xs text-slate-500 mt-1">
              View tomorrow&apos;s customer count, dish demand breakdown, and exact raw ingredient prep requirement in kg.
            </p>
          </div>
          <Link
            href="/ai-forecast"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
          >
            View Demand Predictions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">B2B Exchange & NGO Rescue</h3>
            <p className="text-xs text-slate-500 mt-1">
              Exchange surplus raw batches with nearby restaurants or donate safe cooked portions to verified food banks.
            </p>
          </div>
          <Link
            href="/b2b-exchange"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800"
          >
            Open Sharing Network <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
