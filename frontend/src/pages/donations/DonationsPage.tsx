import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  AlertTriangle,
  MapPin,
  Sparkles,
  Layers,
  Thermometer,
  PackageCheck
} from "lucide-react";

export const DonationsPage: React.FC = () => {
  const { user } = useAuth();
  const isNGO = user?.role === "NGO";
  const isRestaurant = user?.role === "RESTAURANT" || user?.role === "ADMIN";

  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeClaim, setActiveClaim] = useState<any>(null);
  const [otpInput, setOtpInput] = useState<string>("");
  const [donationIdToVerify, setDonationIdToVerify] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Safety Certification Modal state
  const [showSafetyModal, setShowSafetyModal] = useState<boolean>(false);
  const [safetyListingId, setSafetyListingId] = useState<string>("");
  const [safetyForm, setSafetyForm] = useState({
    inspector_name: user?.full_name || "Authorized Staff",
    recorded_temperature_celsius: "4.0",
    packaging_intact: true,
    sensory_passed: true,
    allergens_declared: true,
    fssai_compliant: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsData = await ApiService.getDonationStats();
      setStats(statsData);

      if (isNGO) {
        const avail = await ApiService.getAvailableDonations(20.0);
        setAvailableListings(avail);
      }
    } catch (err: any) {
      console.error("Failed to load donation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleClaim = async (listingId: string) => {
    setErrorMessage(null);
    try {
      const res = await ApiService.claimDonation(listingId);
      setActiveClaim(res);
      setFeedback(`Donation Claimed! Your 6-Digit Collection OTP is: ${res.plain_otp}`);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to claim donation.");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await ApiService.verifyDonationOTP(donationIdToVerify, otpInput);
      setFeedback("OTP Verified Successfully! Handover confirmed & stock updated.");
      setOtpInput("");
      setDonationIdToVerify("");
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid OTP code.");
    }
  };

  const handleCertifySafety = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.certifyFoodSafety({
        listing_id: safetyListingId,
        inspector_name: safetyForm.inspector_name,
        recorded_temperature_celsius: parseFloat(safetyForm.recorded_temperature_celsius),
        packaging_intact: safetyForm.packaging_intact,
        sensory_passed: safetyForm.sensory_passed,
        allergens_declared: safetyForm.allergens_declared,
        fssai_compliant: safetyForm.fssai_compliant
      });
      setShowSafetyModal(false);
      setFeedback("Food Safety certified! The meal portions are now live for NGO rescue.");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Certification failed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <HeartHandshake className="h-3.5 w-3.5" /> FSSAI 2019-Compliant Verified Food Rescue
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">NGO Food Rescue & Donation Gateway</h1>
          <p className="text-xs text-slate-500 mt-1">
            Zero-hunger redistribution with mandatory human staff food-safety inspection and cryptographic OTP collection.
          </p>
        </div>
        <div>
          {isRestaurant && (
            <button
              onClick={() => setShowSafetyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition"
            >
              <ShieldCheck className="h-4 w-4" /> Certify Food Safety
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ESG Impact Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Meals Rescued</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats?.total_meals_rescued || 0}</p>
          <span className="text-[11px] text-emerald-700 font-bold">Portions served</span>
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Food Diverted</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats?.total_food_weight_kg || 0} kg</p>
          <span className="text-[11px] text-emerald-700 font-bold">Prevented from waste</span>
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">CO2 Avoided</span>
          <p className="text-3xl font-black text-emerald-700 mt-1">{stats?.co2_emissions_avoided_kg || 0} kg</p>
          <span className="text-[11px] text-slate-500 font-medium">GHG reduction</span>
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Completed Pickups</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats?.completed_distributions || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">OTP verified</span>
        </div>
      </div>

      {/* Active Claim OTP Banner (For NGO Volunteer) */}
      {activeClaim && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-400" />
              <h3 className="font-black text-base">Active Food Pickup Pass</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              Expires in 30 Mins
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800 p-4 rounded-2xl">
            <div>
              <p className="font-bold text-sm text-white">{activeClaim.dish_name}</p>
              <p className="text-xs text-slate-400">Pickup from: {activeClaim.restaurant_name} ({activeClaim.restaurant_address})</p>
            </div>
            <div className="text-center bg-slate-900 px-6 py-3 rounded-2xl border border-emerald-500/30">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Collection OTP</span>
              <span className="text-2xl font-mono font-black text-emerald-400 tracking-widest">{activeClaim.plain_otp}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Show this 6-digit OTP code to the restaurant kitchen staff upon arrival to verify handover.
          </p>
        </div>
      )}

      {/* NGO Discovery Feed or Restaurant Verification Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Verified Safe Meal Portions Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Verified Safe Food Surplus Feed
          </h3>

          {availableListings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              <PackageCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold">No active verified surplus meals right now.</p>
              <p className="text-[11px] mt-1">Meals will appear here as soon as restaurant staff certifies them.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {listing.distance_km} km away
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        FSSAI PASSED
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base">{listing.item_name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{listing.restaurant_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{listing.restaurant_address}</p>

                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Available Meals:</span>
                        <span className="font-black text-emerald-700">{listing.quantity} portions</span>
                      </div>
                      {listing.safety_record && (
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Certified Temp:</span>
                          <span className="font-bold text-slate-700">{listing.safety_record.recorded_temperature_celsius}°C</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isNGO ? (
                      <button
                        onClick={() => handleClaim(listing.id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-2"
                      >
                        <HeartHandshake className="h-4 w-4" /> Claim for Community Rescue
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 block text-center font-medium">
                        Log in as NGO to claim
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Restaurant Staff Collection Verification Desk */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900">Restaurant OTP Handover Desk</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              When an NGO volunteer arrives to collect meals, enter their 6-digit OTP code below to verify and complete the handover.
            </p>

            <form onSubmit={handleVerifyOTP} className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400">Donation Claim ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Donation ID or claim code"
                  value={donationIdToVerify}
                  onChange={(e) => setDonationIdToVerify(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400">6-Digit Volunteer OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 582914"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full mt-1 p-2.5 text-center text-lg tracking-widest font-mono font-black rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Verify OTP & Confirm Handover
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal: Mandatory Food Safety Checklist */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Mandatory Staff Food Safety Inspection
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Compliant with FSSAI Surplus Food Regulations (2019). Must be attested by a qualified staff inspector before public listing.
            </p>

            <form onSubmit={handleCertifySafety} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400">Listing ID to Certify</label>
                <input
                  type="text"
                  required
                  placeholder="listing_..."
                  value={safetyListingId}
                  onChange={(e) => setSafetyListingId(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Inspector Name</label>
                  <input
                    type="text"
                    required
                    value={safetyForm.inspector_name}
                    onChange={(e) => setSafetyForm({ ...safetyForm, inspector_name: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Holding Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={safetyForm.recorded_temperature_celsius}
                    onChange={(e) =>
                      setSafetyForm({ ...safetyForm, recorded_temperature_celsius: e.target.value })
                    }
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Chilled: ≤5°C | Hot: ≥60°C</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={safetyForm.packaging_intact}
                    onChange={(e) => setSafetyForm({ ...safetyForm, packaging_intact: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  Packaging intact and hermetically sealed
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={safetyForm.sensory_passed}
                    onChange={(e) => setSafetyForm({ ...safetyForm, sensory_passed: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  Sensory check passed (fresh aroma, color, texture)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={safetyForm.allergens_declared}
                    onChange={(e) => setSafetyForm({ ...safetyForm, allergens_declared: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  Allergen flags declared on container
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={safetyForm.fssai_compliant}
                    onChange={(e) => setSafetyForm({ ...safetyForm, fssai_compliant: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  Complies with FSSAI Surplus Food Regulations 2019
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSafetyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  Attest & Unlock Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
