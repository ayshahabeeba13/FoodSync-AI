import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  HeartHandshake,
  Leaf,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await ApiService.getDashboardAnalytics();
        setData(res);
      } catch (err: any) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const financials = data?.financials || {};
  const esg = data?.esg_impact || {};
  const categories = data?.inventory_categories || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <BarChart3 className="h-3.5 w-3.5" /> Performance & Sustainability Intelligence
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business & ESG Impact Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of revenue, inventory asset valuation, and food waste diversion metrics.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Gross Sales Revenue</span>
          <p className="text-3xl font-black text-slate-900 mt-1">₹{financials.total_revenue || 0}</p>
          <span className="text-[11px] text-emerald-700 font-bold">{financials.total_bills_count || 0} Bills Cleared</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Inventory Asset Valuation</span>
          <p className="text-3xl font-black text-slate-900 mt-1">₹{financials.total_inventory_valuation || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">{financials.active_batch_count || 0} Active Batches</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Total Food Rescued</span>
          <p className="text-3xl font-black text-emerald-700 mt-1">{esg.food_saved_kg || 0} kg</p>
          <span className="text-[11px] text-emerald-700 font-bold">{esg.meals_donated_count || 0} Meals Served</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">CO2 Emissions Avoided</span>
          <p className="text-3xl font-black text-emerald-700 mt-1">{esg.co2_emissions_avoided_kg || 0} kg</p>
          <span className="text-[11px] text-slate-500 font-medium">₹{esg.landfill_diversion_cost_saved || 0} Disposal Saved</span>
        </div>
      </div>

      {/* Category Breakdown & ESG Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Valuation Breakdown */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900">Inventory Asset Valuation by Category</h3>
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No inventory valuation records found.</p>
            ) : (
              categories.map((c: any, idx: number) => {
                const maxVal = Math.max(...categories.map((x: any) => x.valuation), 1);
                const pct = Math.min(100, Math.round((c.valuation / maxVal) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{c.category}</span>
                      <span className="font-mono font-bold text-slate-900">₹{c.valuation}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ESG Sustainability Impact Scorecard */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-black tracking-tight">ESG Environmental Impact Scorecard</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every kilogram of surplus food saved and redirected prevents approx 2.5 kg of greenhouse gas (CO2 equivalent) emissions from anaerobic decomposition in municipal landfills.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Landfill Diversion</span>
              <p className="text-2xl font-black text-white mt-1">{esg.food_saved_kg || 0} kg</p>
              <span className="text-[11px] text-emerald-400 font-bold">100% Traceable</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Social Value</span>
              <p className="text-2xl font-black text-white mt-1">{esg.meals_donated_count || 0}</p>
              <span className="text-[11px] text-emerald-400 font-bold">Nutritious meals provided</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
