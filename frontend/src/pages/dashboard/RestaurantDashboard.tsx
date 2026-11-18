import React from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Boxes,
  TrendingUp,
  ArrowLeftRight,
  ShieldCheck,
  Receipt,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

interface RestaurantDashboardProps {
  onNavigate: (path: string) => void;
}

export const RestaurantDashboard: React.FC<RestaurantDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const isRestaurant = user?.role === "RESTAURANT" || user?.role === "ADMIN";
  const isNGO = user?.role === "NGO";

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-emerald-800/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            System Operational • FSSAI Regulations (2019) Active
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Welcome back, {user?.full_name || "Partner"}
          </h1>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isRestaurant
              ? `Operational console for ${user?.restaurant?.name || "your restaurant"}. Real-time FEFO batch tracking, AI demand forecasting, and automated surplus food rescue.`
              : isNGO
              ? `Charity rescue portal for ${user?.ngo?.name || "your NGO"}. Claim verified edible surplus food and verify pickups with secure 6-digit OTP tokens.`
              : "FoodSync AI Platform Administration & Safety Oversight."}
          </p>
        </div>

        <div className="flex gap-3">
          {isRestaurant && (
            <button
              onClick={() => onNavigate("/billing")}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              Open POS Billing
            </button>
          )}
          {isNGO && (
            <button
              onClick={() => onNavigate("/donations")}
              className="px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <HeartHandshake className="h-4 w-4" />
              Browse Surplus Feed
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Today's Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹18,450.00</div>
          <p className="text-[11px] text-slate-500">42 orders rung up via POS</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">FEFO Batches</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">38 Active</div>
          <p className="text-[11px] text-emerald-600 font-semibold">Earliest expiry allocated first</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Tomorrow's Forecast</span>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">142 Guests</div>
          <p className="text-[11px] text-teal-700 font-semibold">3-Tier ML • Holdout MAE: 8.4</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Food Safety</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">100% Verified</div>
          <p className="text-[11px] text-blue-700 font-semibold">Human inspector sign-off</p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Batch Inventory & Expiry Alerts</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Track raw ingredients and prepared portions. Monitor FEFO queues, lot numbers, and safety stock thresholds.
            </p>
          </div>
          <button
            onClick={() => onNavigate("/inventory")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Manage Batches <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">3-Tier AI Demand Prediction</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Predict tomorrow's customer covers, menu-item demand, and raw ingredient prep requirements in kg.
            </p>
          </div>
          <button
            onClick={() => onNavigate("/predictions")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
          >
            View Forecast <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">B2B Exchange & NGO Rescue</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Exchange surplus raw stock with nearby restaurants or donate safe cooked meals to verified food banks.
            </p>
          </div>
          <button
            onClick={() => onNavigate("/b2b-exchange")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800"
          >
            Open Sharing Network <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
