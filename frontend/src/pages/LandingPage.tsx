import React from "react";
import { ArrowRight, ShieldCheck, TrendingUp, Boxes, HeartHandshake, ArrowLeftRight, CheckCircle2 } from "lucide-react";

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Top Banner */}
      <header className="h-20 border-b border-slate-800/80 px-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-xl text-slate-950 shadow-lg shadow-emerald-500/20">
            FS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">FoodSync AI</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                FSSAI Certified
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Smart Restaurant Inventory & Verified Food Rescue</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("/login")}
            className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate("/register")}
            className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            Register Partner
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-8 py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-xs font-semibold shadow-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Predict Smarter • Manage Better • Share Responsibly
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          AI-Powered Restaurant Inventory with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
            Automated Food Sharing
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Accurate next-day customer footfall forecasting, automatic POS ingredient depletion via recipe
          bill-of-materials, B2B restaurant inventory balancing, and FSSAI-compliant surplus rescue.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button
            onClick={() => onNavigate("/dashboard")}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25 text-sm"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigate("/register")}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-7 py-3.5 rounded-xl border border-slate-700 transition-colors text-sm"
          >
            Onboard Restaurant or NGO
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-4 gap-6 pt-16 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition-colors">
            <Boxes className="h-6 w-6 text-emerald-400" />
            <h3 className="font-bold text-white text-base">FEFO Batch Inventory</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track raw ingredient batches and prepared portions with lot numbers, cold-chain checks, and atomic POS sales deduction.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-teal-500/40 transition-colors">
            <TrendingUp className="h-6 w-6 text-teal-400" />
            <h3 className="font-bold text-white text-base">3-Tier ML Demand Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Genuine machine learning forecasting for customer footfall, dish demand, and exact raw ingredient prep requirement (MAE tracked).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-amber-500/40 transition-colors">
            <ArrowLeftRight className="h-6 w-6 text-amber-400" />
            <h3 className="font-bold text-white text-base">B2B Restaurant Sharing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Surplus-to-shortage matching engine with Haversine distance, transfer tracking, and atomic dual-inventory updates upon handover.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-blue-500/40 transition-colors">
            <HeartHandshake className="h-6 w-6 text-blue-400" />
            <h3 className="font-bold text-white text-base">NGO Rescue & Safety Gateway</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mandatory authenticated staff food-safety inspection with attempt-limited salted 6-digit collection OTP tokens.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        © 2026 FoodSync AI • Compliant with Food Safety and Standards (Recovery & Distribution of Surplus Food) Regulations, 2019
      </footer>
    </div>
  );
};
