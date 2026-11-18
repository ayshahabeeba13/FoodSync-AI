import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  ChefHat,
  Scale,
  Sparkles
} from "lucide-react";

export const RecipesPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddDishModal, setShowAddDishModal] = useState<boolean>(false);
  const [showBomModal, setShowBomModal] = useState<boolean>(false);
  const [selectedDish, setSelectedDish] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forms
  const [dishForm, setDishForm] = useState({
    name: "",
    category: "Main Course",
    price: ""
  });

  const [bomRows, setBomRows] = useState<{ ingredient_name: string; quantity_required: string; unit: string }[]>([
    { ingredient_name: "", quantity_required: "", unit: "kg" }
  ]);
  const [prepTime, setPrepTime] = useState<string>("25");
  const [instructions, setInstructions] = useState<string>("");

  const fetchMenu = async () => {
    try {
      const items = await ApiService.getMenuItems();
      setMenuItems(items);
    } catch (err: any) {
      console.error("Failed to load recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createMenuItem({
        name: dishForm.name,
        category: dishForm.category,
        price: parseFloat(dishForm.price)
      });
      setShowAddDishModal(false);
      setDishForm({ name: "", category: "Main Course", price: "" });
      setSuccessMessage("Menu item added! You can now map its recipe BOM ingredients.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchMenu();
    } catch (err: any) {
      alert(err.message || "Failed to create dish");
    }
  };

  const openBomModal = (dish: any) => {
    setSelectedDish(dish);
    if (dish.recipe && dish.recipe.ingredients?.length > 0) {
      setBomRows(
        dish.recipe.ingredients.map((i: any) => ({
          ingredient_name: i.ingredient_name,
          quantity_required: i.quantity_required.toString(),
          unit: i.unit
        }))
      );
      setPrepTime(dish.recipe.preparation_time_minutes?.toString() || "25");
      setInstructions(dish.recipe.instructions || "");
    } else {
      setBomRows([{ ingredient_name: "", quantity_required: "", unit: "kg" }]);
      setPrepTime("25");
      setInstructions("");
    }
    setShowBomModal(true);
  };

  const addBomRow = () => {
    setBomRows([...bomRows, { ingredient_name: "", quantity_required: "", unit: "kg" }]);
  };

  const removeBomRow = (index: number) => {
    setBomRows(bomRows.filter((_, i) => i !== index));
  };

  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDish) return;
    try {
      const payload = {
        menu_item_id: selectedDish.id,
        preparation_time_minutes: parseInt(prepTime),
        instructions,
        ingredients: bomRows.map((r) => ({
          ingredient_name: r.ingredient_name.trim(),
          quantity_required: parseFloat(r.quantity_required),
          unit: r.unit
        }))
      };
      await ApiService.createOrUpdateRecipe(payload);
      setShowBomModal(false);
      setSuccessMessage(`Recipe Bill of Materials mapped for '${selectedDish.name}'!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchMenu();
    } catch (err: any) {
      alert(err.message || "Failed to save recipe BOM");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <UtensilsCrossed className="h-3.5 w-3.5" /> Recipe-to-Ingredient Engineering
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recipe Bill of Materials (BOM)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Map dishes to constituent raw ingredient weights for precision FEFO auto-deductions and AI forecasting.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddDishModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-4 w-4" /> Add Menu Dish
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Dishes & Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((dish) => {
          const hasBom = dish.recipe && dish.recipe.ingredients?.length > 0;
          return (
            <div
              key={dish.id}
              className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{dish.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {dish.category}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">₹{dish.price}</span>
                    </div>
                  </div>
                  {hasBom ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> BOM Configured
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold">
                      Missing BOM
                    </span>
                  )}
                </div>

                {/* Recipe Details */}
                {hasBom ? (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Ingredients Per Single Portion:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {dish.recipe.ingredients.map((ing: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px] truncate max-w-[120px]">
                            {ing.ingredient_name}
                          </span>
                          <span className="font-mono text-emerald-700 font-extrabold text-[11px]">
                            {ing.quantity_required} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    {dish.estimated_cost > 0 && (
                      <p className="text-[11px] text-slate-400 font-medium pt-1">
                        Est. Raw Cost: <span className="font-bold text-slate-700">₹{dish.estimated_cost}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 italic">
                    No recipe mapped yet. Click below to specify raw ingredient requirements.
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openBomModal(dish)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Scale className="h-3.5 w-3.5 text-slate-500" />
                  {hasBom ? "Edit Bill of Materials" : "Map Recipe Ingredients"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Menu Item */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4">Add New Menu Dish</h3>
            <form onSubmit={handleCreateDish} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Dish Name</label>
                <input
                  type="text"
                  required
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  placeholder="e.g. Risotto Ai Funghi"
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Category</label>
                  <select
                    value={dishForm.category}
                    onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Menu Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                    placeholder="350.00"
                    className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Create Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Recipe BOM Builder */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Recipe BOM: {selectedDish?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Enter the exact raw ingredient portion requirements needed to cook 1 portion of this dish.
            </p>

            <form onSubmit={handleSaveBom} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Ingredients List (Weights & Units)
                </label>
                {bomRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Ingredient Name (e.g. Flour)"
                      value={row.ingredient_name}
                      onChange={(e) => {
                        const copy = [...bomRows];
                        copy[idx].ingredient_name = e.target.value;
                        setBomRows(copy);
                      }}
                      className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="Qty"
                      value={row.quantity_required}
                      onChange={(e) => {
                        const copy = [...bomRows];
                        copy[idx].quantity_required = e.target.value;
                        setBomRows(copy);
                      }}
                      className="w-20 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <select
                      value={row.unit}
                      onChange={(e) => {
                        const copy = [...bomRows];
                        copy[idx].unit = e.target.value;
                        setBomRows(copy);
                      }}
                      className="w-24 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="litres">litres</option>
                      <option value="ml">ml</option>
                      <option value="units">units</option>
                    </select>
                    {bomRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBomRow(idx)}
                        className="p-2 text-rose-500 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBomRow}
                  className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Ingredient Row
                </button>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Preparation Instructions</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Standard kitchen SOP instructions..."
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  Save Recipe BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
