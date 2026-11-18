"use client";

import React from "react";
import { AuthUser } from "../lib/authStore";
import { ShieldCheck, LogOut, UserCircle, Store, HeartHandshake } from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "RESTAURANT_MANAGER":
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">Restaurant Manager</span>;
      case "RESTAURANT_STAFF":
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">Kitchen Staff</span>;
      case "NGO_COORDINATOR":
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">NGO Coordinator</span>;
      case "PLATFORM_ADMIN":
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">Platform Admin</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">{role}</span>;
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          FS
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight text-lg">FoodSync AI</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
              v1.0 FSSAI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Smart Inventory & Verified Food Rescue</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Organization Identity Pill */}
            {user.restaurant && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-md text-xs text-slate-700">
                <Store className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold">{user.restaurant.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">FSSAI: {user.restaurant.fssaiLicenseNumber}</span>
              </div>
            )}

            {user.ngo && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-md text-xs text-slate-700">
                <HeartHandshake className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-semibold">{user.ngo.name}</span>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {user.ngo.verificationStatus}
                </span>
              </div>
            )}

            {/* User Profile & Role */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <UserCircle className="h-7 w-7 text-slate-400" />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
                <div>{getRoleBadge(user.role)}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="text-xs text-slate-500">Not authenticated</div>
        )}
      </div>
    </header>
  );
};
