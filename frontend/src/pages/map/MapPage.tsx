import React, { useState, useEffect } from "react";
import { ApiService } from "../../services/api";
import {
  MapPin,
  Building2,
  HeartHandshake,
  Navigation,
  Compass,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers
} from "lucide-react";

export const MapPage: React.FC = () => {
  const [mapData, setMapData] = useState<any>(null);
  const [filterType, setFilterType] = useState<"ALL" | "RESTAURANT" | "NGO">("ALL");
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const data = await ApiService.getMapEntities();
        setMapData(data);
        if (data.restaurants?.length > 0) {
          setSelectedNode(data.restaurants[0]);
        }
      } catch (err: any) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntities();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371.0;
    const dlat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dlon = ((lon2 - lon1) * Math.PI) / 180.0;
    const a =
      Math.sin(dlat / 2.0) ** 2 +
      Math.cos((lat1 * Math.PI) / 180.0) * Math.cos((lat2 * Math.PI) / 180.0) * Math.sin(dlon / 2.0) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    return Math.round(R * c * 10) / 10;
  };

  const restaurants = mapData?.restaurants || [];
  const ngos = mapData?.ngos || [];
  const surplusMarkers = mapData?.surplus_markers || [];

  const allNodes = [...restaurants, ...ngos].filter((n) => {
    if (filterType === "ALL") return true;
    return n.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Compass className="h-3.5 w-3.5" /> Spatial Haversine Distance Engine
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Geographical Redistribution Map</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualizing verified restaurant donors, surplus inventory markers, and NGO rescue hubs across Bangalore.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "RESTAURANT", "NGO"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === type
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "ALL" ? "All Nodes" : type === "RESTAURANT" ? "Restaurants" : "NGO Hubs"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Viewport & Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map Canvas Simulation with Leaflet coordinates */}
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative min-h-[480px] flex flex-col justify-between overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

          {/* Top Bar inside Map */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-slate-800 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Bangalore Metro Cluster (12.9716° N, 77.5946° E)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              <span className="text-emerald-400 font-bold">● Restaurant ({restaurants.length})</span>
              <span className="text-sky-400 font-bold ml-2">▲ NGO ({ngos.length})</span>
              <span className="text-amber-400 font-bold ml-2">★ Surplus ({surplusMarkers.length})</span>
            </div>
          </div>

          {/* Node Plotting Matrix */}
          <div className="relative z-10 my-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isRest = node.type === "RESTAURANT";
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                    isSelected
                      ? "bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/10"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      isRest ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"
                    }`}
                  >
                    {isRest ? <Building2 className="h-4 w-4" /> : <HeartHandshake className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-white">{node.name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{node.address}</p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-1">
                      <span>{node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}</span>
                      {node.active_surplus_count > 0 && (
                        <span className="text-amber-400 font-bold">★ {node.active_surplus_count} Surplus</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Surpluses Strip at bottom of map */}
          <div className="relative z-10 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">Active Geocoded Redistribution Offers:</span>
            <div className="flex items-center gap-3">
              {surplusMarkers.map((m: any, idx: number) => (
                <span key={idx} className="font-bold text-amber-400 flex items-center gap-1">
                  ★ {m.item_name} ({m.quantity} {m.unit})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Selected Node Distance & Route Matrix */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Navigation className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900">Proximity Matrix</h3>
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Selected Origin Node
                  </span>
                  <p className="font-black text-slate-900 text-sm">{selectedNode.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedNode.address}</p>
                  {selectedNode.fssai_license && (
                    <p className="text-[10px] text-slate-400 font-mono">FSSAI: {selectedNode.fssai_license}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    Distances to Other Nodes (Haversine km):
                  </span>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {[...restaurants, ...ngos]
                      .filter((n) => n.id !== selectedNode.id)
                      .map((target) => {
                        const dist = calculateDistance(
                          selectedNode.latitude,
                          selectedNode.longitude,
                          target.latitude,
                          target.longitude
                        );
                        return (
                          <div key={target.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-900 text-[11px]">{target.name}</p>
                              <span className="text-[10px] text-slate-400 font-semibold">{target.type}</span>
                            </div>
                            <span
                              className={`font-black font-mono px-2 py-0.5 rounded-md ${
                                dist <= 3.0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : dist <= 10.0
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {dist} km
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">Click a node on the map to calculate distances.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
