import React from "react";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  UtensilsCrossed,
  TrendingUp,
  ArrowLeftRight,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  BarChart3,
  Building2,
  Settings,
} from "lucide-react";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { user } = useAuth();

  const isRestaurant = user?.role === "RESTAURANT" || user?.role === "ADMIN";
  const isNGO = user?.role === "NGO" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const navSections = [
    {
      title: "OVERVIEW",
      links: [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, show: true },
      ],
    },
    {
      title: "RESTAURANT OPERATIONS",
      links: [
        { label: "Inventory & FEFO", path: "/inventory", icon: Boxes, show: isRestaurant },
        { label: "Smart POS Billing", path: "/billing", icon: Receipt, show: isRestaurant },
        { label: "Recipe Bill of Materials", path: "/recipes", icon: UtensilsCrossed, show: isRestaurant },
        { label: "AI Demand Forecast", path: "/predictions", icon: TrendingUp, show: isRestaurant },
      ],
    },
    {
      title: "FOOD RESCUE & SHARING",
      links: [
        { label: "B2B Exchange", path: "/b2b-exchange", icon: ArrowLeftRight, show: isRestaurant },
        { label: "NGO Donations", path: "/donations", icon: HeartHandshake, show: isRestaurant || isNGO },
        { label: "Interactive Map", path: "/map", icon: MapPin, show: true },
        { label: "FSSAI Safety Gateway", path: "/safety-inspections", icon: ShieldCheck, show: true },
      ],
    },
    {
      title: "PLATFORM & IMPACT",
      links: [
        { label: "Impact Analytics", path: "/analytics", icon: BarChart3, show: true },
        { label: "Admin Control", path: "/admin", icon: Building2, show: isAdmin },
        { label: "Settings & Profile", path: "/settings", icon: Settings, show: true },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-6">
        {navSections.map((section, idx) => {
          const visibleLinks = section.links.filter((l) => l.show);
          if (visibleLinks.length === 0) return null;

          return (
            <div key={idx}>
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-2">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = currentPath === link.path;

                  return (
                    <button
                      key={link.path}
                      onClick={() => onNavigate(link.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                        isActive
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* FSSAI Regulatory Status Pill */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-950 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-900">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
          FSSAI Regulations (2019)
        </div>
        <p className="text-[10px] text-emerald-800 leading-relaxed">
          Surplus food cold-chain (≤5°C) and hot-holding (≥65°C) compliance active.
        </p>
      </div>
    </aside>
  );
};
