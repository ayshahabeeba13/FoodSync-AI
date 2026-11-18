import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Store, HeartHandshake, User, Mail, Lock, Phone, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { UserRole } from "../../types/auth";

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole>("RESTAURANT");

  // User credentials
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Restaurant details
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("Italian & Wood-Fired Pizza");
  const [fssaiLicense, setFssaiLicense] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");

  // NGO details
  const [ngoName, setNgoName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [ngoAddress, setNgoAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === "RESTAURANT") {
        if (!fssaiLicense || fssaiLicense.trim().length !== 14) {
          throw new Error("FSSAI License must be a valid 14-digit statutory registration number.");
        }
      } else if (role === "NGO") {
        if (!regNumber) {
          throw new Error("Official Society or Trust Registration Number is mandatory.");
        }
      }

      await register({
        email,
        password,
        full_name: fullName,
        role,
        phone,
        restaurant_name: restaurantName,
        cuisine_type: cuisineType,
        fssai_license_number: fssaiLicense,
        restaurant_address: restaurantAddress,
        ngo_name: ngoName,
        registration_number: regNumber,
        ngo_address: ngoAddress,
      });

      onNavigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed registering organization account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-600 items-center justify-center text-white font-extrabold text-2xl shadow-md">
            FS
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Register with FoodSync AI</h1>
          <p className="text-xs text-slate-500 font-medium">Join the commercial inventory & verified food rescue network</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setRole("RESTAURANT")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                role === "RESTAURANT"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Store className="h-4 w-4 text-emerald-600" />
              Restaurant Partner
            </button>

            <button
              type="button"
              onClick={() => setRole("NGO")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                role === "NGO"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <HeartHandshake className="h-4 w-4 text-blue-600" />
              Verified Charity / NGO
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase">Contact Name</label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Marco Rossi"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase">Phone Number</label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@restaurant.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Organization Fields */}
            {role === "RESTAURANT" ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-emerald-700" />
                  Restaurant Identity & Statutory FSSAI License
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Restaurant Name</label>
                    <input
                      type="text"
                      required
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="Bella Italia Trattoria"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">14-Digit FSSAI License #</label>
                    <input
                      type="text"
                      maxLength={14}
                      required
                      value={fssaiLicense}
                      onChange={(e) => setFssaiLicense(e.target.value)}
                      placeholder="11223344556677"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Cuisine Type</label>
                    <input
                      type="text"
                      value={cuisineType}
                      onChange={(e) => setCuisineType(e.target.value)}
                      placeholder="Italian & Continental"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Restaurant Address</label>
                    <input
                      type="text"
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                      placeholder="100 Feet Road, Indiranagar, Bangalore"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <HeartHandshake className="h-3.5 w-3.5 text-blue-700" />
                  NGO Legal Registration & Service Radius
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">NGO Organization Name</label>
                    <input
                      type="text"
                      required
                      value={ngoName}
                      onChange={(e) => setNgoName(e.target.value)}
                      placeholder="City Hope Food Rescue"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Trust / Society Reg #</label>
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="NGO-KA-2024-8849"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Distribution Center Address</label>
                  <input
                    type="text"
                    value={ngoAddress}
                    onChange={(e) => setNgoAddress(e.target.value)}
                    placeholder="MG Road Community Center, Bangalore"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Registering Partner..." : "Complete Registration"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <button
              onClick={() => onNavigate("/login")}
              className="font-bold text-emerald-600 hover:text-emerald-500 underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
