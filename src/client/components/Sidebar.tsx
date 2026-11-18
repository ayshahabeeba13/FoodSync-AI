"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthUser } from "../lib/authStore";
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  UtensilsCrossed,
  TrendingUp,
  ArrowLeftRight,
  HeartHandshake,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface SidebarProps {
  user: AuthUser | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const pathname = usePathname();

  const isRestaurantUser =
    user?.role === "RESTAURANT_MANAGER" || user?.role === "RESTAURANT_STAFF";
  const isNGOUser = user?.role === "NGO_COORDINATOR";
  const isAdmin = user?.role === "PLATFORM_ADMIN";

  const navItems = [
    {
      title: "OVERVIEW",
      links: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
      ],
    },
    {
      title: "RESTAURANT OPERATIONS",
      links: [
        { label: "Inventory & FEFO", href: "/inventory", icon: Boxes, show: isRestaurantUser || isAdmin },
        { label: "POS Billing", href: "/pos", icon: Receipt, show: isRestaurantUser || isAdmin },
        { label: "Recipe Bill of Materials", href: "/recipes", icon: UtensilsCrossed, show: isRestaurantUser || isAdmin },
        { label: "AI Demand Forecast", href: "/ai-forecast", icon: TrendingUp, show: isRestaurantUser || isAdmin },
      ],
    },
    {
      title: "FOOD RESCUE & SHARING",
      links: [
        { label: "B2B Exchange", href: "/b2b-exchange", icon: ArrowLeftRight, show: isRestaurantUser || isAdmin },
        { label: "NGO Donations", href: "/donations", icon: HeartHandshake, show: isRestaurantUser || isNGOUser || isAdmin },
        { label: "FSSAI Food Safety", href: "/safety-inspections", icon: ShieldCheck, show: true },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {navItems.map((section, idx) => {
          const visibleLinks = section.links.filter((l) => l.show);
          if (visibleLinks.length === 0) return null;

          return (
            <div key={idx}>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Regulatory Badge */}
      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs text-emerald-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
          FSSAI Surplus Regulations
        </div>
        <p className="text-[10px] text-emerald-700 leading-tight">
          Strict cold chain (≤5°C) & hot holding (≥65°C) compliance active.
        </p>
      </div>
    </aside>
  );
};
