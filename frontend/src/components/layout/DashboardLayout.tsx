import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Users, AlertTriangle } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPath, onNavigate }) => {
  const { demoMode, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* Controlled Demonstration Mode Banner (Safeguard 6) */}
      {demoMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-extrabold uppercase tracking-wide text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
              Demonstration Mode Active
            </span>
            <span className="hidden sm:inline text-amber-800 text-[11px]">
              One-click persona switching enabled for evaluation of 5 restaurants & 2 NGOs.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-amber-700" />
            <span className="text-[11px] font-semibold text-amber-800">Quick Logins:</span>
            <button
              onClick={() => onNavigate("/login")}
              className="text-[10px] font-bold bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 px-2 py-0.5 rounded transition-all shadow-2xs"
            >
              Demo Accounts
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
};
