import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import {
  Receipt,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
  CreditCard,
  QrCode,
  Banknote,
  Boxes
} from "lucide-react";

export const BillingPOSPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [loading, setLoading] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentBills, setRecentBills] = useState<any[]>([]);

  const fetchMenuAndBills = async () => {
    try {
      const [mItems, bHistory] = await Promise.all([
        ApiService.getMenuItems(),
        ApiService.getBills(10)
      ]);
      setMenuItems(mItems);
      setRecentBills(bHistory);
    } catch (err: any) {
      console.error("Failed to load POS catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndBills();
  }, []);

  const addToCart = (menuItemId: string) => {
    setCart((prev) => ({
      ...prev,
      [menuItemId]: (prev[menuItemId] || 0) + 1,
    }));
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[menuItemId] > 1) {
        next[menuItemId] -= 1;
      } else {
        delete next[menuItemId];
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  const cartEntries = Object.entries(cart).map(([id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return {
      id,
      name: item?.name || "Dish",
      price: item?.price || 0,
      quantity: qty,
      total: (item?.price || 0) * qty,
    };
  });

  const subtotal = cartEntries.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const handleCheckout = async () => {
    if (cartEntries.length === 0) return;
    setCheckoutLoading(true);
    setErrorMessage(null);
    setCheckoutResult(null);

    try {
      const payload = {
        items: cartEntries.map((c) => ({ menu_item_id: c.id, quantity: c.quantity })),
        payment_method: paymentMethod,
      };

      const result = await ApiService.checkout(payload);
      setCheckoutResult(result);
      setCart({});
      fetchMenuAndBills();
    } catch (err: any) {
      setErrorMessage(err.message || "Checkout failed due to ingredient deficiency.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Receipt className="h-3.5 w-3.5" /> Atomic Recipe BOM Auto-Deduction POS
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Smart Point of Sale (POS)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Order placement triggers instantaneous, atomic FEFO batch deductions with full shortage rollback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {recentBills.length} Bills Processed Today
          </span>
        </div>
      </div>

      {/* Error & Success Feedback Banners */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-3 animate-fadeIn">
          <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-black">ATOMIC CHECKOUT ROLLBACK TRIGGERED</p>
            <p className="font-normal text-rose-700">{errorMessage}</p>
            <p className="text-[11px] text-rose-600 font-semibold">
              Safeguard 4 Enforced: Zero inventory was deducted. No partial depletion occurred.
            </p>
          </div>
        </div>
      )}

      {checkoutResult && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-black text-sm">Sale Completed — Bill #{checkoutResult.bill_number}</span>
            </div>
            <span className="font-black text-base text-emerald-800">₹{checkoutResult.total_amount}</span>
          </div>

          <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 space-y-2">
            <p className="text-[11px] font-extrabold uppercase text-emerald-800 tracking-wider">
              FEFO Inventory Stock Deductions Recorded:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {checkoutResult.deductions_summary?.map((d: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-emerald-100/50">
                  <span className="font-bold text-slate-900">{d.ingredient_name}</span>
                  <span className="font-mono text-emerald-700">
                    -{d.deducted} {d.unit} (Lot: {d.lot_number})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Menu Dish Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Restaurant Menu Catalog ({menuItems.length})
            </h3>
          </div>

          {menuItems.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
              <Boxes className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold">No dishes found in menu catalog.</p>
              <p className="text-[11px] text-slate-400 mt-1">Create dishes in Recipe Bill of Materials tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map((item) => {
                const countInCart = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
                        <span className="font-black text-slate-900 text-sm">₹{item.price}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {item.category}
                      </span>

                      {/* Recipe BOM Ingredients preview */}
                      {item.recipe?.ingredients && (
                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Recipe BOM Ingredients:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.recipe.ingredients.map((ing: any, i: number) => (
                              <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100">
                                {ing.quantity_required}{ing.unit} {ing.ingredient_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100">
                      {countInCart > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-black text-slate-900 w-6 text-center">{countInCart}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Order Cart & Checkout Terminal */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Current Order Cart</h3>
              </div>
              {cartEntries.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            {cartEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-bold">Cart is empty</p>
                <p className="text-[11px] text-slate-400 mt-1">Select dishes from the catalog to place orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                  {cartEntries.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {c.quantity} × ₹{c.price}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900">₹{c.total}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => removeFromCart(c.id)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => addToCart(c.id)}
                            className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Pricing Summary */}
                <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-700">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST (5%)</span>
                    <span className="font-bold text-slate-700">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>Grand Total</span>
                    <span className="text-emerald-700 font-black text-base">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="pt-2">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "UPI", label: "UPI", icon: QrCode },
                      { id: "CARD", label: "Card", icon: CreditCard },
                      { id: "CASH", label: "Cash", icon: Banknote },
                    ].map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPaymentMethod(p.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                            paymentMethod === p.id
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || cartEntries.length === 0}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" /> Complete Sale & Deduct Stock
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
