import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import {
  ArrowLeftRight,
  Plus,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  Boxes,
  Lock,
  Sparkles,
  Layers
} from "lucide-react";

export const B2BExchangePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"available" | "transfers" | "create">("available");
  const [listings, setListings] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [requestQty, setRequestQty] = useState<string>("");
  const [handoverInput, setHandoverInput] = useState<{ [key: string]: string }>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form for listing surplus
  const [listingForm, setListingForm] = useState({
    item_ref_id: "",
    item_name: "",
    quantity: "",
    unit: "kg",
    days_valid: "2"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lData, tData, bData] = await Promise.all([
        ApiService.getB2BListings(20.0),
        ApiService.getB2BTransfers(),
        ApiService.getBatches()
      ]);
      setListings(lData);
      setTransfers(tData);
      setBatches(bData);
    } catch (err: any) {
      console.error("Failed to load B2B data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;
    try {
      const qty = parseFloat(requestQty || selectedListing.quantity.toString());
      const res = await ApiService.requestB2BTransfer(selectedListing.id, qty);
      setSelectedListing(null);
      setRequestQty("");
      setFeedback(`Transfer request sent! Handover Code generated: ${res.handover_code}`);
      setTimeout(() => setFeedback(null), 6000);
      fetchData();
      setActiveTab("transfers");
    } catch (err: any) {
      alert(err.message || "Failed to request transfer");
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    try {
      await ApiService.acceptB2BTransfer(transferId);
      setFeedback("Transfer accepted! Ready for physical delivery & handover.");
      setTimeout(() => setFeedback(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to accept transfer");
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    const code = handoverInput[transferId];
    if (!code) {
      alert("Please enter the handover verification code.");
      return;
    }
    try {
      await ApiService.completeB2BTransfer(transferId, code);
      setFeedback("Handover confirmed! Inventory stock was atomically updated and batch lot numbers preserved.");
      setTimeout(() => setFeedback(null), 5000);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to complete transfer");
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batches.find((b) => b.id === listingForm.item_ref_id);
    if (!batch) return;
    try {
      const availUntil = new Date(Date.now() + parseInt(listingForm.days_valid) * 86400000);
      await ApiService.createB2BListing({
        listing_type: "RAW_INGREDIENT",
        item_ref_id: batch.id,
        item_name: listingForm.item_name || batch.ingredient_name,
        quantity: parseFloat(listingForm.quantity),
        unit: batch.unit,
        target_audience: "RESTAURANT",
        available_until: availUntil.toISOString()
      });
      setFeedback("Surplus raw ingredient listing published to nearby restaurant network!");
      setTimeout(() => setFeedback(null), 4000);
      fetchData();
      setActiveTab("available");
    } catch (err: any) {
      alert(err.message || "Failed to publish listing");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <ArrowLeftRight className="h-3.5 w-3.5" /> B2B Restaurant-to-Restaurant Inventory Exchange
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Surplus & Shortage B2B Exchange</h1>
          <p className="text-xs text-slate-500 mt-1">
            Redistribute raw ingredients between verified restaurants within 15 km with complete batch lot traceability.
          </p>
        </div>
        <div>
          <button
            onClick={() => setActiveTab("create")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-4 w-4" /> Offer Surplus Ingredients
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("available")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "available"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Nearby Surplus Offers ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "transfers"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Active Transfers & Handovers ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "create"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Create Surplus Listing
        </button>
      </div>

      {/* Tab 1: Available Nearby Listings */}
      {activeTab === "available" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.length === 0 ? (
            <div className="col-span-3 p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              <Boxes className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold">No surplus listings from neighboring restaurants right now.</p>
              <p className="text-[11px] mt-1">Check back soon or create your own surplus offer.</p>
            </div>
          ) : (
            listings.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {item.distance_km} km away
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">RAW INGREDIENT</span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base">{item.item_name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{item.restaurant_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{item.restaurant_address}</p>

                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Available Qty</span>
                      <span className="text-base font-black text-slate-900">
                        {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      Verified Safe
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedListing(item);
                      setRequestQty(item.quantity.toString());
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" /> Request Transfer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Active Transfers */}
      {activeTab === "transfers" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Handover Verification Code</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No active B2B inventory transfers found.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.item_name || "Ingredient Batch"}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{t.from_restaurant_name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{t.to_restaurant_name}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {t.quantity} {t.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : t.status === "ACCEPTED"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {t.handover_code ? (
                          <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                            {t.handover_code}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.status === "REQUESTED" && (
                          <button
                            onClick={() => handleAcceptTransfer(t.id)}
                            className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px]"
                          >
                            Accept
                          </button>
                        )}
                        {t.status === "ACCEPTED" && (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Code"
                              value={handoverInput[t.id] || ""}
                              onChange={(e) =>
                                setHandoverInput({ ...handoverInput, [t.id]: e.target.value })
                              }
                              className="w-24 px-2 py-1 text-[11px] rounded-lg border border-slate-200 font-mono"
                            />
                            <button
                              onClick={() => handleCompleteTransfer(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                            >
                              Verify
                            </button>
                          </div>
                        )}
                        {t.status === "COMPLETED" && (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Transferred
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Create Surplus Listing */}
      {activeTab === "create" && (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Offer Surplus Ingredient Batch</h3>
          <p className="text-xs text-slate-500">
            Select one of your existing inventory batches to publish for nearby restaurants.
          </p>
          <form onSubmit={handleCreateListing} className="space-y-4">
            <div>
              <label className="text-[10px] font-extrabold uppercase text-slate-400">Select Batch</label>
              <select
                required
                value={listingForm.item_ref_id}
                onChange={(e) => {
                  const b = batches.find((x) => x.id === e.target.value);
                  setListingForm({
                    ...listingForm,
                    item_ref_id: e.target.value,
                    item_name: b?.ingredient_name || "",
                    quantity: b?.current_quantity?.toString() || ""
                  });
                }}
                className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose active ingredient batch --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ingredient_name} ({b.current_quantity} {b.unit} | Lot: {b.lot_number} | Exp: {b.expiry_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400">Quantity to Share</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={listingForm.quantity}
                  onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400">Offer Validity (Days)</label>
                <select
                  value={listingForm.days_valid}
                  onChange={(e) => setListingForm({ ...listingForm, days_valid: e.target.value })}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="1">24 Hours</option>
                  <option value="2">48 Hours (Recommended)</option>
                  <option value="3">72 Hours</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition"
              >
                Publish B2B Surplus Offer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Request Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Request Surplus Transfer</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Requesting from <strong className="text-slate-800">{selectedListing.restaurant_name}</strong> ({selectedListing.distance_km} km away).
            </p>

            <form onSubmit={handleRequestTransfer} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Quantity Needed ({selectedListing.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedListing.quantity}
                  required
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum available: {selectedListing.quantity} {selectedListing.unit}</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
