import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import {
  Boxes,
  Plus,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"batches" | "portions" | "audit">("batches");
  const [batches, setBatches] = useState<any[]>([]);
  const [portions, setPortions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showAddBatchModal, setShowAddBatchModal] = useState<boolean>(false);
  const [showAddPortionModal, setShowAddPortionModal] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [batchForm, setBatchForm] = useState({
    ingredient_name: "",
    category: "DAIRY",
    current_quantity: "",
    unit: "kg",
    lot_number: "",
    unit_cost: "",
    received_date: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    storage_condition: "REFRIGERATED",
    reorder_level: "5.0"
  });

  const [portionForm, setPortionForm] = useState({
    dish_name: "",
    portion_count: "",
    holding_temperature_celsius: "4.0",
    allergen_flags: "None",
    safe_hours: "6"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bData, pData, aData, lData] = await Promise.all([
        ApiService.getBatches(),
        ApiService.getPortions(),
        ApiService.getInventoryAlerts(),
        ApiService.getAuditLogs(20)
      ]);
      setBatches(bData);
      setPortions(pData);
      setAlerts(aData);
      setAuditLogs(lData);
    } catch (err: any) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createBatch({
        ...batchForm,
        current_quantity: parseFloat(batchForm.current_quantity),
        unit_cost: parseFloat(batchForm.unit_cost || "100"),
        reorder_level: parseFloat(batchForm.reorder_level || "5.0")
      });
      setShowAddBatchModal(false);
      setActionMessage("New raw ingredient batch added successfully with FEFO tracking!");
      setTimeout(() => setActionMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to create batch");
    }
  };

  const handleCreatePortion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      const safeDeadline = new Date(now.getTime() + parseInt(portionForm.safe_hours) * 3600000);
      await ApiService.createPortion({
        dish_name: portionForm.dish_name,
        portion_count: parseInt(portionForm.portion_count),
        prepared_at: now.toISOString(),
        safe_use_deadline: safeDeadline.toISOString(),
        holding_temperature_celsius: parseFloat(portionForm.holding_temperature_celsius),
        allergen_flags: portionForm.allergen_flags
      });
      setShowAddPortionModal(false);
      setActionMessage("Cooked meal portion recorded with temperature & shelf-life monitoring!");
      setTimeout(() => setActionMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to create portion");
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch = b.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.lot_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || b.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Boxes className="h-3.5 w-3.5" /> First-Expired, First-Out (FEFO) Engine
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Smart Inventory & Batch Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time lot tracking, temperature control, and automated depletion history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddBatchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-4 w-4" /> Add Ingredient Batch
          </button>
          <button
            onClick={() => setShowAddPortionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-4 w-4" /> Log Cooked Portions
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Alert Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Batches</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{batches.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">FEFO sorted</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Expiring in 48-72h</span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {alerts?.near_expiry_batches?.length || 0}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Priority for recipes/B2B</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Low Stock Warnings</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{alerts?.low_stock_items?.length || 0}</p>
          <span className="text-[11px] text-rose-500 font-medium">Below reorder limit</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Prepared Meals</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {portions.reduce((acc, p) => acc + (p.portion_count || 0), 0)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Safe holding monitored</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "batches"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Raw Ingredient Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab("portions")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "portions"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Prepared Meal Portions ({portions.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "audit"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Immutable Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Raw Ingredient Batches */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ingredient or lot number..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "DAIRY", "GRAIN", "PRODUCE", "MEAT", "CONDIMENT"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition shrink-0 ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ingredient</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Lot #</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">FEFO Status</th>
                    <th className="py-3 px-4">Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No ingredient batches matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{b.ingredient_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px]">
                            {b.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{b.lot_number}</td>
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {b.current_quantity} <span className="text-slate-400 font-normal">{b.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{b.expiry_date}</td>
                        <td className="py-3.5 px-4">
                          {b.days_until_expiry <= 2 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> Critical ({b.days_until_expiry}d left)
                            </span>
                          ) : b.days_until_expiry <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                              <Clock className="h-3 w-3" /> Warning ({b.days_until_expiry}d left)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> Healthy ({b.days_until_expiry}d left)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium text-[11px]">{b.storage_condition}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Prepared Portions */}
      {activeTab === "portions" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cooked Dish</th>
                  <th className="py-3 px-4">Portions</th>
                  <th className="py-3 px-4">Prepared At</th>
                  <th className="py-3 px-4">Safe Deadline</th>
                  <th className="py-3 px-4">Holding Temp</th>
                  <th className="py-3 px-4">Allergens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No prepared food portions logged.
                    </td>
                  </tr>
                ) : (
                  portions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{p.dish_name}</td>
                      <td className="py-3.5 px-4 font-black text-emerald-700">{p.portion_count} portions</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(p.prepared_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {p.hours_remaining !== undefined && (
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            p.hours_remaining <= 3 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {p.hours_remaining} hrs left
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.holding_temperature_celsius}°C</td>
                      <td className="py-3.5 px-4 text-slate-500">{p.allergen_flags || "None"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Immutable Audit Logs */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Delta</th>
                  <th className="py-3 px-4">Remaining</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                        log.action === "POS_DEDUCT" ? "bg-amber-50 text-amber-700" :
                        log.action === "STOCK_IN" ? "bg-emerald-50 text-emerald-700" :
                        log.action === "B2B_OUT" ? "bg-sky-50 text-sky-700" :
                        "bg-purple-50 text-purple-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.item_name}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={log.quantity_delta < 0 ? "text-rose-600" : "text-emerald-600"}>
                        {log.quantity_delta > 0 ? `+${log.quantity_delta}` : log.quantity_delta} {log.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{log.remaining_quantity} {log.unit}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Batch */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4">Add Raw Ingredient Batch</h3>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Ingredient Name</label>
                  <input
                    type="text"
                    required
                    value={batchForm.ingredient_name}
                    onChange={(e) => setBatchForm({ ...batchForm, ingredient_name: e.target.value })}
                    placeholder="e.g. Mozzarella Cheese"
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Category</label>
                  <select
                    value={batchForm.category}
                    onChange={(e) => setBatchForm({ ...batchForm, category: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DAIRY">DAIRY</option>
                    <option value="GRAIN">GRAIN</option>
                    <option value="PRODUCE">PRODUCE</option>
                    <option value="MEAT">MEAT</option>
                    <option value="CONDIMENT">CONDIMENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={batchForm.current_quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, current_quantity: e.target.value })}
                    placeholder="10.0"
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Unit</label>
                  <select
                    value={batchForm.unit}
                    onChange={(e) => setBatchForm({ ...batchForm, unit: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litres">litres</option>
                    <option value="ml">ml</option>
                    <option value="units">units</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Lot Number</label>
                  <input
                    type="text"
                    required
                    value={batchForm.lot_number}
                    onChange={(e) => setBatchForm({ ...batchForm, lot_number: e.target.value })}
                    placeholder="LOT-2026-X"
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Expiry Date (FEFO Index)</label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiry_date}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Storage Condition</label>
                  <select
                    value={batchForm.storage_condition}
                    onChange={(e) => setBatchForm({ ...batchForm, storage_condition: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="REFRIGERATED">REFRIGERATED (0-4°C)</option>
                    <option value="FROZEN">FROZEN (-18°C)</option>
                    <option value="DRY">DRY AMBIENT</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Confirm & Register Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Cooked Portion */}
      {showAddPortionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4">Log Cooked Meal Portion</h3>
            <form onSubmit={handleCreatePortion} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Dish Name</label>
                <input
                  type="text"
                  required
                  value={portionForm.dish_name}
                  onChange={(e) => setPortionForm({ ...portionForm, dish_name: e.target.value })}
                  placeholder="e.g. Quinoa Salad Bowls"
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Portion Count</label>
                  <input
                    type="number"
                    required
                    value={portionForm.portion_count}
                    onChange={(e) => setPortionForm({ ...portionForm, portion_count: e.target.value })}
                    placeholder="25"
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Holding Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={portionForm.holding_temperature_celsius}
                    onChange={(e) => setPortionForm({ ...portionForm, holding_temperature_celsius: e.target.value })}
                    placeholder="4.0"
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Shelf-life Window (Hours)</label>
                <select
                  value={portionForm.safe_hours}
                  onChange={(e) => setPortionForm({ ...portionForm, safe_hours: e.target.value })}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="4">4 Hours (Hot holding standard)</option>
                  <option value="6">6 Hours (Safe chilled service)</option>
                  <option value="12">12 Hours (Rapid chill)</option>
                  <option value="24">24 Hours (Controlled vacuum refrigeration)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPortionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  Log Prepared Portions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
