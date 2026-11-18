import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  HeartHandshake,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
  Thermometer,
  Layers,
  Phone,
  Navigation
} from "lucide-react";

export const NGODashboard: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeClaim, setActiveClaim] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchNGOData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [statsData, availableData] = await Promise.all([
        ApiService.getDonationStats(),
        ApiService.getAvailableDonations(25.0)
      ]);
      setStats(statsData);
      setAvailableListings(availableData);
    } catch (err: any) {
      console.error("Error loading NGO dashboard:", err);
      setErrorMessage("Could not load NGO portal data. Please ensure you are logged in as an NGO.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNGOData();
  }, [user]);

  const handleClaimMeal = async (listingId: string) => {
    setErrorMessage(null);
    try {
      const res = await ApiService.claimDonation(listingId);
      setActiveClaim(res);
      setFeedback(`Donation Claimed! Your 6-Digit Collection OTP is: ${res.plain_otp}`);
      fetchNGOData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to claim donation listing.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500">Connecting to Food Rescue Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NGO Header */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-6 rounded-3xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold mb-2">
              <HeartHandshake className="h-3.5 w-3.5" />
              NGO Community Food Rescue Portal
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {user?.ngo?.name || user?.ngo_name || "Community Food Rescue Partner"}
            </h1>
            <p className="text-xs text-rose-200/80 mt-1 max-w-xl">
              Real-time dispatch board for inspecting and claiming safe, surplus prepared meals from certified commercial kitchens.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
              <div className="text-[10px] font-bold text-rose-200 uppercase tracking-widest">Darpan NGO Reg</div>
              <div className="text-xs font-black font-mono">{user?.ngo_id ? `KA-${user.ngo_id.slice(0, 8).toUpperCase()}` : "KA-2024-DARPAN"}</div>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Impact Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Meals Rescued</div>
          <div className="text-2xl font-black text-rose-600">{(stats?.total_meals_rescued || 0).toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Wholesome nutritious portions</div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Food Diverted</div>
          <div className="text-2xl font-black text-slate-900">{stats?.total_kg_diverted || 0} kg</div>
          <div className="text-[11px] text-slate-500 mt-1">Diverted from city landfills</div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">GHG Avoided</div>
          <div className="text-2xl font-black text-emerald-600">{stats?.co2_emissions_avoided_kg || 0} kg</div>
          <div className="text-[11px] text-slate-500 mt-1">Calculated at 2.5 kg CO₂e / kg</div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Beneficiaries Fed</div>
          <div className="text-2xl font-black text-blue-600">{stats?.estimated_people_fed || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Shelters & community kitchens</div>
        </div>
      </div>

      {/* Active Claim Card with 6-Digit OTP */}
      {activeClaim && (
        <div className="p-6 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-black text-amber-950">Active Collection Dispatch Pass</h3>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">
              Status: CLAIMED (Awaiting Pickup)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <div className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">Item & Portions</div>
              <div className="text-base font-extrabold text-slate-900">{activeClaim.dish_name || "Prepared Meal Batch"}</div>
              <div className="text-xs font-bold text-amber-900">{activeClaim.quantity} {activeClaim.unit}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">Pickup Location</div>
              <div className="text-xs font-bold text-slate-900">{activeClaim.restaurant_name}</div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                {activeClaim.restaurant_address || "Commercial Kitchen"}
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-amber-200 text-center shadow-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Present 6-Digit OTP at Handover
              </div>
              <div className="text-2xl font-black font-mono tracking-widest text-amber-600">
                {activeClaim.plain_otp}
              </div>
              <div className="text-[10px] text-amber-800 font-semibold mt-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Valid for 30 mins (3 attempts max)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Verified Meals Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">Verified Safe Surplus Meals Feed</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly filtered to meals certified compliant with FSSAI (2019) regulations by restaurant inspection staff.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-black rounded-full border border-emerald-100">
            {availableListings.length} Listings In Bangalore Radius
          </span>
        </div>

        {availableListings.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <HeartHandshake className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No surplus meals pending collection</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All prepared meals are currently distributed, or awaiting mandatory food-safety gate inspection by restaurant staff.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableListings.map((l: any) => (
              <div
                key={l.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> FSSAI Certified
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires: {new Date(l.available_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900">{l.item_name}</h3>
                  <div className="text-xs font-bold text-emerald-700 mt-1">
                    {l.quantity} {l.unit}
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-slate-800">{l.restaurant_name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {l.restaurant_address || "Commercial Kitchen"}
                    </div>
                    {l.distance_km !== undefined && (
                      <div className="text-[11px] font-bold text-blue-600 mt-1">
                        📍 ~{l.distance_km} km away
                      </div>
                    )}
                  </div>

                  {l.safety_record && (
                    <div className="mt-3 p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[10px] text-emerald-900 space-y-0.5">
                      <div className="font-bold flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-emerald-600" />
                        Temp: {l.safety_record.recorded_temperature_celsius}°C (Cold-chain verified)
                      </div>
                      <div className="text-slate-500">
                        Inspected by: {l.safety_record.inspector_name}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleClaimMeal(l.id)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Claim Surplus Meal for Rescue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};