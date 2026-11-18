import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { RestaurantDashboard } from "./pages/dashboard/RestaurantDashboard";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { BillingPOSPage } from "./pages/billing/BillingPOSPage";
import { RecipesPage } from "./pages/recipes/RecipesPage";
import { PredictionsPage } from "./pages/predictions/PredictionsPage";
import { B2BExchangePage } from "./pages/b2b/B2BExchangePage";
import { DonationsPage } from "./pages/donations/DonationsPage";
import { MapPage } from "./pages/map/MapPage";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { NGODashboard } from "./pages/ngo/NGODashboard";
import { SettingsPage } from "./pages/settings/SettingsPage";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || "/";
  });

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Loading FoodSync AI...</span>
        </div>
      </div>
    );
  }

  // Public Landing Page
  if (currentPath === "/") {
    return <LandingPage onNavigate={navigate} />;
  }

  // Authentication Pages
  if (currentPath === "/login") {
    return <LoginPage onNavigate={navigate} />;
  }

  if (currentPath === "/register") {
    return <RegisterPage onNavigate={navigate} />;
  }

  // Fallback to login if not authenticated for dashboard routes
  if (!user) {
    return <LoginPage onNavigate={navigate} />;
  }

  // Render Dashboard Views
  return (
    <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
      {currentPath === "/dashboard" && (
        user.role === "NGO" ? (
          <NGODashboard onNavigate={navigate} />
        ) : user.role === "ADMIN" ? (
          <AdminDashboard />
        ) : (
          <RestaurantDashboard onNavigate={navigate} />
        )
      )}

      {currentPath === "/inventory" && <InventoryPage />}
      {currentPath === "/billing" && <BillingPOSPage />}
      {currentPath === "/recipes" && <RecipesPage />}
      {currentPath === "/predictions" && <PredictionsPage />}
      {currentPath === "/b2b-exchange" && <B2BExchangePage />}
      {currentPath === "/donations" && <DonationsPage />}
      {currentPath === "/safety-inspections" && <DonationsPage />}
      {currentPath === "/map" && <MapPage />}
      {currentPath === "/analytics" && <AnalyticsPage />}
      {currentPath === "/admin" && <AdminDashboard />}
      {currentPath === "/ngo/dashboard" && <NGODashboard onNavigate={navigate} />}
      {currentPath === "/settings" && <SettingsPage onNavigate={navigate} />}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}