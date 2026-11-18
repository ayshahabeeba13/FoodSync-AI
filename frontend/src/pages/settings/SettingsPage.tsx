import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ApiService } from "../../services/api";
import {
  Settings,
  ShieldCheck,
  Building2,
  HeartHandshake,
  MapPin,
  FileBadge,
  UserCheck,
  AlertTriangle,
  Lock,
  RefreshCw,
  Sparkles
} from "lucide-react";

export const SettingsPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { user, switchPersona } = useAuth();
  const [switching, setSwitching] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const demoPersonas = [
    {
      category: "Five Demo Restaurants (Bangalore Cluster)",
      items: [
        {
          name: "Bella Italia Trattoria",
          role: "RESTAURANT",
          identifier: "bella@foodsync.ai",
          fssai: "11223344556677",
          desc: "Scenario A: Mozzarella surplus (12 kg expiring in 48h)",
          color: "emerald"
        },
        {
          name: "The Daily Grind Bistro",
          role: "RESTAURANT",
          identifier: "dailygrind@foodsync.ai",
          fssai: "11223344556679",
          desc: "Scenario A: Cheese shortage (8.5 kg needed, 2.4 km away)",
          color: "blue"
        },
        {
          name: "Green Garden Cafe",
          role: "RESTAURANT",
          identifier: "greengarden@foodsync.ai",
          fssai: "11223344556680",
          desc: "Scenario B: 25 prepared Quinoa Bowls inspected for rescue",
          color: "teal"
        },
        {
          name: "Royal Biryani House",
          role: "RESTAURANT",
          identifier: "royalbiryani@foodsync.ai",
          fssai: "11223344556681",
          desc: "Scenario C: POS chicken biryani orders & atomic FEFO deduction",
          color: "amber"
        },
        {
          name: "Kyoto Ramen & Wok",
          role: "RESTAURANT",
          identifier: "kyoto@foodsync.ai",
          fssai: "11223344556678",
          desc: "Pan-Asian cuisine, Indiranagar",
          color: "indigo"
        }
      ]
    },
    {
      category: "Two Registered Food Rescue NGOs",
      items: [
        {
          name: "City Hope Food Rescue",
          role: "NGO",
          identifier: "cityhope@foodsync.ai",
          fssai: "DARPAN-KA-2024-001",
          desc: "Scenario B: Claims 25 Quinoa Bowls with 6-digit OTP pass",
          color: "rose"
        },
        {
          name: "Metropolitan Community Kitchen",
          role: "NGO",
          identifier: "metrokitchen@foodsync.ai",
          fssai: "DARPAN-KA-2024-002",
          desc: "East Bangalore community food distribution shelter",
          color: "purple"
        }
      ]
    },
    {
      category: "Platform Administration",
      items: [
        {
          name: "Super Administrator",
          role: "ADMIN",
          identifier: "admin@foodsync.ai",
          fssai: "STATUTORY-OFFICIAL",
          desc: "Full telemetry, regulatory audit logs, and GMV observatory",
          color: "slate"
        }
      ]
    }
  ];

  const handleRoleSwitch = async (persona: any) => {
    setSwitching(true);
    setErrorMsg(null);
    try {
      await switchPersona(persona.identifier);
      setFeedback(`Switched persona to ${persona.name} (${persona.role}).`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to switch role. Ensure DEMO_MODE=True.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-2xl text-slate-700">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Organization Profile & Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory regulatory credentials, facility coordinates, and judge demonstration switcher.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold rounded-2xl flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Organization Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {user?.role === "NGO" ? (
              <HeartHandshake className="h-5 w-5 text-rose-600" />
            ) : (
              <Building2 className="h-5 w-5 text-emerald-600" />
            )}
            <h2 className="text-base font-black text-slate-900">Current Active Session Profile</h2>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full">
            Role: {user?.role}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entity Name</div>
            <div className="text-base font-black text-slate-900">
              {user?.restaurant?.name || user?.restaurant_name || user?.ngo?.name || user?.ngo_name || user?.full_name || "FoodSync User"}
            </div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <FileBadge className="h-3 w-3 text-emerald-600" />
              Statutory FSSAI License Format
            </div>
            <div className="text-base font-black font-mono text-emerald-900">
              {user?.restaurant?.fssai_license_number || user?.fssai_license_number || "11223344556677"}
            </div>
            <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Verified 14-Digit Regulatory Format (FSSAI 2019)
            </div>
          </div>
        </div>
      </div>

      {/* Demo Persona Switcher (Judge & Evaluator Hub) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-black text-slate-900">Judge & Demonstration Role Switcher</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly toggle between real restaurant and NGO personas to inspect and test all cross-platform workflows.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full uppercase tracking-wider">
            DEMO_MODE=Active
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
          <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Production Safeguard Notice:</span> In live deployments, this switcher is automatically disabled at the API gateway layer to enforce zero-trust identity isolation.
          </p>
        </div>

        <div className="space-y-6">
          {demoPersonas.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((item, iIdx) => {
                  const isCurrent = user?.email === item.identifier || user?.full_name === item.name;
                  return (
                    <button
                      key={iIdx}
                      onClick={() => handleRoleSwitch(item)}
                      disabled={switching || isCurrent}
                      className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            item.role === "RESTAURANT" ? "bg-blue-50 text-blue-700" :
                            item.role === "NGO" ? "bg-rose-50 text-rose-700" :
                            "bg-slate-100 text-slate-800"
                          }`}>
                            {item.role}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-black text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.desc}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{item.identifier}</span>
                        <span className="text-emerald-700 font-bold">Switch →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};