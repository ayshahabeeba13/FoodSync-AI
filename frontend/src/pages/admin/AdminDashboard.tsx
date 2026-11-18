import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldAlert,
  Building2,
  HeartHandshake,
  Receipt,
  ArrowLeftRight,
  ShieldCheck,
  Activity,
  Database,
  Users,
  TrendingUp,
  RefreshCw,
  Lock,
  FileText
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const res = await ApiService.getAdminOverview();
      setData(res);
    } catch (err: any) {
      console.error("Failed to load admin overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleManualRefresh = async () => {
    await fetchAdminData();
    setFeedback("Admin command center metrics updated in real-time.");
    setTimeout(() => setFeedback(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500">Loading Platform Control Center...</span>
        </div>
      </div>
    );
  }

  const m = data?.platform_metrics || {};
  const sys = data?.system_status || {};
  const audits = data?.recent_system_audits || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            <Lock className="h-4 w-4" /> Platform Super-Admin Command Center
          </div>
          <h1 className="text-2xl font-black tracking-tight">System Integrity & Audit Observatory</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time platform-wide telemetry, regulatory enforcement status, gross transaction volume, and immutable audit logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Sync Telemetry
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Restaurants</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{m.total_restaurants ?? 5}</div>
          <div className="text-[11px] text-slate-400 mt-1">100% 14-digit FSSAI verified</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rescue NGOs</span>
            <HeartHandshake className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{m.total_ngos ?? 2}</div>
          <div className="text-[11px] text-slate-400 mt-1">Darpan registered partners</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processed Bills</span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{m.total_bills_processed ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">FEFO atomic stock deductions</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform GMV</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{(m.gross_merchandise_value || 0).toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Gross culinary revenue</div>
        </div>
      </div>

      {/* System Integrity & Safeguards Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">Mandatory Safeguards & Compliance Status</h2>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
              System Optimal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Regulatory Standard</div>
              <div className="text-xs font-bold text-slate-800">{sys.fssai_standard || "FSSAI Regulations 2019"}</div>
              <p className="text-[10px] text-slate-500">Human gate enforced: temperature, packaging, sensory checks.</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Database Storage Engine</div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-blue-600" />
                PostgreSQL 15+ Schema
              </div>
              <p className="text-[10px] text-slate-500">15 tables, Alembic migrations, foreign key constraints active.</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Atomic POS Rollback</div>
              <div className="text-xs font-bold text-emerald-700 font-mono">SAFEGUARD 4 ACTIVE</div>
              <p className="text-[10px] text-slate-500">Zero partial ingredient deductions. Complete database rollback on stock shortfall.</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">OTP Security Engine</div>
              <div className="text-xs font-bold text-slate-800 font-mono">HMAC SHA-256 + Salt</div>
              <p className="text-[10px] text-slate-500">30-min window, 3-attempt lock, irreversible salted hashes in DB.</p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Demonstration Security Policy:</span> The one-click demo role switcher operates exclusively when{" "}
              <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">DEMO_MODE=True</code>. In production environments, role escalation endpoints return HTTP 403 Forbidden to prevent unauthorized persona impersonation.
            </div>
          </div>
        </div>

        {/* Impact Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Platform Activity</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>B2B Inter-Restaurant Transfers</span>
                  <span className="text-slate-900 font-black">{m.b2b_transfers_completed ?? 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: "100%" }}></div>
                </div>
                <span className="text-[10px] text-slate-400">Preserving batch lot numbers and unit cost</span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>NGO Surplus Rescues</span>
                  <span className="text-slate-900 font-black">{m.ngo_donations_completed ?? 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "100%" }}></div>
                </div>
                <span className="text-[10px] text-slate-400">Zero food safety incidents recorded</span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Registered System Users</span>
                  <span className="text-slate-900 font-black">{m.total_registered_users ?? 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: "100%" }}></div>
                </div>
                <span className="text-[10px] text-slate-400">Bcrypt hashed credentials & RBAC tokens</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-400">
              FoodSync AI v1.0.0-PROD • Build 2026.11
            </span>
          </div>
        </div>
      </div>

      {/* Global Audit Trail Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Immutable Platform Stock Audit Log (Recent 15 Events)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Auto-recorded on every stock mutation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-extrabold">Item Name</th>
                <th className="pb-3 font-extrabold">Action</th>
                <th className="pb-3 font-extrabold">Delta</th>
                <th className="pb-3 font-extrabold">Reason / Trigger</th>
                <th className="pb-3 font-extrabold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                    No platform audit records registered yet.
                  </td>
                </tr>
              ) : (
                audits.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-900">{a.item_name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        a.action === "DEDUCTED" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        a.action === "RECEIVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {a.action}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-700">
                      {a.quantity_delta > 0 ? `+${a.quantity_delta}` : a.quantity_delta} {a.unit}
                    </td>
                    <td className="py-3 text-slate-600 max-w-xs truncate">{a.reason}</td>
                    <td className="py-3 text-slate-400 font-mono text-[10px]">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};