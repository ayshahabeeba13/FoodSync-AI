import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      onNavigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed signing in to account");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password@123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-600 items-center justify-center text-white font-extrabold text-2xl shadow-md">
            FS
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">FoodSync AI</h1>
          <p className="text-xs text-slate-500 font-medium">Commercial Restaurant Operations & Food Rescue Console</p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@bellaitalia.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Pre-fill Box (Safeguard 6) */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">
              Evaluation Demo Accounts (5 Restaurants + 2 NGOs)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill("manager@bellaitalia.com")}
                className="p-2 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 rounded-lg text-left transition-colors border border-emerald-200/60"
              >
                <div className="font-bold text-[11px]">Bella Italia</div>
                <div className="text-[10px] text-emerald-700">Italian Cuisine</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("manager@dailygrind.com")}
                className="p-2 bg-amber-50/70 hover:bg-amber-100 text-amber-900 rounded-lg text-left transition-colors border border-amber-200/60"
              >
                <div className="font-bold text-[11px]">Daily Grind Bistro</div>
                <div className="text-[10px] text-amber-700">American Casual</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("manager@royalbiryani.com")}
                className="p-2 bg-orange-50/70 hover:bg-orange-100 text-orange-900 rounded-lg text-left transition-colors border border-orange-200/60"
              >
                <div className="font-bold text-[11px]">Royal Biryani House</div>
                <div className="text-[10px] text-orange-700">Mughlai Special</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("coordinator@cityhope.org")}
                className="p-2 bg-blue-50/70 hover:bg-blue-100 text-blue-900 rounded-lg text-left transition-colors border border-blue-200/60"
              >
                <div className="font-bold text-[11px]">City Hope Rescue</div>
                <div className="text-[10px] text-blue-700">Verified Charity</div>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Need to register your organization?{" "}
            <button
              onClick={() => onNavigate("/register")}
              className="font-bold text-emerald-600 hover:text-emerald-500 underline"
            >
              Register here
            </button>
          </div>
        </div>

        {/* Regulatory Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>FSSAI Surplus Regulations (2019) Certified</span>
        </div>
      </div>
    </div>
  );
};
