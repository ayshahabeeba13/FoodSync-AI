import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Store, HeartHandshake, ShieldCheck, LogOut, UserCircle, RefreshCw } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, demoMode } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "RESTAURANT":
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">Restaurant Partner</span>;
      case "NGO":
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">Verified Charity / NGO</span>;
      case "ADMIN":
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">Platform Admin</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">{role || "Guest"}</span>;
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
          FS
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">FoodSync AI</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
              FSSAI Standard
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Predict Smarter • Manage Better • Share Responsibly</p>
        </div>
      </div>

      {/* User Actions & Organization Metadata */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Restaurant Badge */}
            {user.restaurant && (
              <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700">
                <Store className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-bold text-slate-900">{user.restaurant.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">FSSAI: {user.restaurant.fssai_license_number}</span>
              </div>
            )}

            {/* NGO Badge */}
            {user.ngo && (
              <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700">
                <HeartHandshake className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-bold text-slate-900">{user.ngo.name}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {user.ngo.verification_status}
                </span>
              </div>
            )}

            {/* User Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <UserCircle className="h-8 w-8 text-slate-400" />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">{user.full_name}</div>
                <div>{getRoleBadge(user.role)}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <a href="/login" className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg">
              Sign In
            </a>
            <a href="/register" className="text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 px-3 py-1.5 rounded-lg shadow-xs">
              Get Started
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
