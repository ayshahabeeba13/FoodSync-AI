"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp, Boxes, HeartHandshake } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("foodsync_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Top Banner */}
      <nav className="h-20 border-b border-slate-800 px-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-xl text-slate-950 shadow-lg shadow-emerald-500/20">
            FS
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight">FoodSync AI</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              FSSAI Standard
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg transition-all shadow-md shadow-emerald-500/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-8 py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Zero Waste • FEFO Precision • Verified Community Food Sharing
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Next-Gen Restaurant Inventory with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Automated Food Rescue
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          AI-driven 3-tier demand forecasting, recipe auto-deduction via POS, B2B restaurant ingredient
          balancing, and FSSAI-compliant surplus donation to verified local charities.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25"
          >
            <span>Launch Platform</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3.5 rounded-xl border border-slate-700 transition-colors"
          >
            Register Restaurant or NGO
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-4 gap-6 pt-12 text-left">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
            <Boxes className="h-6 w-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">FEFO Batch Inventory</h3>
            <p className="text-xs text-slate-400">
              Track raw ingredients & cooked portions with lot numbers, cold-chain checks, and automated billing deduction.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
            <TrendingUp className="h-6 w-6 text-teal-400" />
            <h3 className="font-bold text-white text-base">3-Tier ML Forecasting</h3>
            <p className="text-xs text-slate-400">
              True machine learning models for customer footfall, dish demand, and raw ingredient prep requirements with MAE validation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <h3 className="font-bold text-white text-base">FSSAI Safety Gateway</h3>
            <p className="text-xs text-slate-400">
              Mandatory authenticated staff inspections before any food can be shared or donated. AI cannot override human sign-off.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
            <HeartHandshake className="h-6 w-6 text-blue-400" />
            <h3 className="font-bold text-white text-base">B2B & NGO Redistribution</h3>
            <p className="text-xs text-slate-400">
              Surplus-to-shortage restaurant matching alongside verified NGO rescue with attempt-limited OTP handover tokens.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 FoodSync AI • Compliant with Food Safety and Standards (Recovery & Distribution of Surplus Food) Regulations, 2019
      </footer>
    </div>
  );
}
