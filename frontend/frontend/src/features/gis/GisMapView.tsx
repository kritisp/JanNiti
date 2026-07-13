import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Layers,
  MapPin,
  Sliders,
  Sparkles,
  Compass,
  Navigation,
  School,
  Heart,
  TrendingUp,
  Network,
  Users,
  Search,
  Eye,
} from "lucide-react";
import api from "@/core/api";

// Custom Leaflet DivIcon factory preventing Vite path resolution issues
const createDivIcon = (type: "Village" | "School" | "Clinic", priority?: number) => {
  let colorClass = "bg-indigo-600 border-indigo-400 text-white";
  let htmlContent = "";

  if (type === "School") {
    colorClass = "bg-blue-600 border-blue-400 text-white shadow-md";
    htmlContent = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>`;
  } else if (type === "Clinic") {
    colorClass = "bg-red-600 border-red-400 text-white shadow-md";
    htmlContent = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
  } else {
    // Village point priorities
    if (priority && priority > 0.6) {
      colorClass = "bg-red-500 border-red-400 text-white animate-pulse shadow-red-500/20";
    } else if (priority && priority > 0.4) {
      colorClass = "bg-orange-500 border-orange-400 text-white shadow-orange-500/20";
    } else {
      colorClass = "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20";
    }
    htmlContent = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
  }

  return L.divIcon({
    html: `<div class="rounded-full border flex items-center justify-center shadow-lg ${colorClass}" style="width: 24px; height: 24px;">${htmlContent}</div>`,
    className: "custom-div-icon-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export const GisMapView: React.FC = () => {
  const [villages, setVillages] = useState<any[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [infrastructure, setInfrastructure] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);

  // States
  const [selectedVillage, setSelectedVillage] = useState<any | null>(null);
  const [graphConnections, setGraphConnections] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  // Map Modes: "demand" | "gaps" | "priority"
  const [mapMode, setMapMode] = useState<"demand" | "gaps" | "priority">("demand");

  // Layer switches
  const [showVillages, setShowVillages] = useState(true);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [showGaps, setShowGaps] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Search
  const [searchText, setSearchText] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const vRes = await api.get("/api/gis/villages");
      setVillages(vRes.data);

      const hRes = await api.get("/api/gis/heatmap");
      setHeatmapPoints(hRes.data);

      const iRes = await api.get("/api/gis/infrastructure");
      setInfrastructure(iRes.data);

      const aRes = await api.get("/api/gis/analytics");
      setAnalytics(aRes.data);
    } catch (err) {
      console.error("Failed to load GIS geocodes data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update default layers when toggling Map Modes
  const handleMapModeChange = (mode: "demand" | "gaps" | "priority") => {
    setMapMode(mode);
    if (mode === "demand") {
      setShowHeatmap(true);
      setShowVillages(true);
      setShowInfrastructure(false);
      setShowGaps(false);
    } else if (mode === "gaps") {
      setShowHeatmap(false);
      setShowVillages(false);
      setShowInfrastructure(true);
      setShowGaps(true);
    } else if (mode === "priority") {
      setShowHeatmap(false);
      setShowVillages(true);
      setShowInfrastructure(false);
      setShowGaps(true);
    }
  };

  // Fetch Knowledge Graph links when clicking a village
  const selectVillage = async (village: any) => {
    setSelectedVillage(village);
    setIsGraphLoading(true);
    setGraphConnections(null);
    try {
      const gRes = await api.get(`/api/knowledge-graph/village/${village.name}`);
      const complaintNodes = gRes.data.nodes.filter((n: any) => n.data.category === "Complaint").length;
      const citizenNodes = gRes.data.nodes.filter((n: any) => n.data.category === "Citizen").length;
      
      setGraphConnections({
        complaints: complaintNodes,
        citizens: citizenNodes,
        totalNodes: gRes.data.nodes.length,
      });
    } catch (err) {
      console.error("Failed to query Knowledge Graph sub-network", err);
    } finally {
      setIsGraphLoading(false);
    }
  };

  // Center coordinate around constituency center ( Bihar)
  const mapCenter: [number, number] = [26.1542, 87.5021];

  // Search filter
  const filteredVillages = villages.filter((v) =>
    v.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      
      {/* Upper Mode bar */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md gap-4 shrink-0">
        
        {/* Map Mode selector buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner w-full md:w-auto">
          <button
            onClick={() => handleMapModeChange("demand")}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider ${
              mapMode === "demand"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <TrendingUp size={12} />
            Citizen Demand Map
          </button>
          <button
            onClick={() => handleMapModeChange("gaps")}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider ${
              mapMode === "gaps"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sliders size={12} />
            Infrastructure Gaps Map
          </button>
          <button
            onClick={() => handleMapModeChange("priority")}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider ${
              mapMode === "priority"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles size={12} />
            AI Priority Map
          </button>
        </div>

        {/* Mode subtitle explanation */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Eye size={14} className="text-indigo-500" />
          <span>
            {mapMode === "demand" && "Visualizing complaint densities and citizen infrastructure requests."}
            {mapMode === "gaps" && "Highlighting deficits in roads, school coverage, and primary clinics."}
            {mapMode === "priority" && "Composite investment prioritization weights generated by AI."}
          </span>
        </div>
      </div>

      {/* Main Map + Side Profiles splits */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Leaflet OSM Canvas (8 cols equivalent) */}
        <div className="flex-grow rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/80 backdrop-blur-sm z-1000 flex flex-col items-center justify-center gap-4">
              <Navigation size={36} className="text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Loading spatial layout...</span>
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={11}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render Layer 1: Villages geocodes */}
            {showVillages &&
              filteredVillages.map((v) => (
                <Marker
                  key={v.id}
                  position={[v.latitude, v.longitude]}
                  icon={createDivIcon("Village", v.priority_score)}
                  eventHandlers={{
                    click: () => selectVillage(v),
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <h4 className="font-bold">{v.name} Village</h4>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Development Rating:</span>
                        <span className="font-bold text-indigo-500">{(v.development_index * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Investment Priority:</span>
                        <span className="font-bold text-red-500">{v.priority_score.toFixed(2)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Render Layer 2: Gaps Envelopes (glowing Circles) */}
            {showGaps &&
              villages.map((v) => {
                if (v.priority_score > 0.4) {
                  const circleColor = v.priority_score > 0.6 ? "#ef4444" : "#f97316";
                  return (
                    <Circle
                      key={`gap-${v.id}`}
                      center={[v.latitude, v.longitude]}
                      radius={1200}
                      pathOptions={{
                        color: circleColor,
                        fillColor: circleColor,
                        fillOpacity: 0.15,
                        weight: 1.5,
                        dashArray: "4 4",
                      }}
                    />
                  );
                }
                return null;
              })}

            {/* Render Layer 3: Infrastructure POIs (Schools/Clinics) */}
            {showInfrastructure &&
              infrastructure.map((inf, idx) => (
                <Marker
                  key={`poi-${idx}`}
                  position={[inf.latitude, inf.longitude]}
                  icon={createDivIcon(inf.type)}
                >
                  <Popup>
                    <div className="text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-indigo-500 mb-1">
                        {inf.type === "School" ? <School size={12} /> : <Heart size={12} />}
                        <span>{inf.type} POI</span>
                      </div>
                      <span>{inf.name}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Render Layer 4: Citizen Requests Heatmaps */}
            {showHeatmap &&
              heatmapPoints.map((pt, idx) => (
                <Circle
                  key={`heat-${idx}`}
                  center={[pt.lat, pt.lng]}
                  radius={1600}
                  pathOptions={{
                    color: "#a855f7", // Purple complaint density circle
                    fillColor: "#a855f7",
                    fillOpacity: pt.intensity * 0.4,
                    stroke: false,
                  }}
                />
              ))}
          </MapContainer>

          {/* Floating Layers controller (inside map absolute) */}
          <div className="absolute top-4 right-4 z-1000 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-md space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
              <Layers size={12} className="text-indigo-500" />
              Layers Manual Override
            </span>
            <div className="space-y-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVillages}
                  onChange={(e) => setShowVillages(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Village Centers
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInfrastructure}
                  onChange={(e) => setShowInfrastructure(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                POIs (Schools & Clinics)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGaps}
                  onChange={(e) => setShowGaps(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Deficit Rings
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Complaint Heatmap
              </label>
            </div>
          </div>

          {/* Dynamic Map Legend */}
          <div className="absolute bottom-4 left-4 z-1000 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-lg backdrop-blur-md text-[10px] space-y-1.5 font-semibold text-slate-600 dark:text-slate-300">
            <span className="font-extrabold uppercase text-slate-400 block tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1">Legend Overlay</span>
            {mapMode === "demand" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-purple-500 opacity-60" /> Complaint Density</div>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Surveyed Villages</div>
              </div>
            )}
            {mapMode === "gaps" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white text-[7px] font-black"><School size={8} /></span> School Facility</div>
                <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-red-600 border border-red-400 flex items-center justify-center text-white text-[7px] font-black"><Heart size={8} /></span> Clinic Facility</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full border border-red-500 bg-red-500/10" /> Critical Deficit Ring</div>
              </div>
            )}
            {mapMode === "priority" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Critical Priority Scoring (&gt;0.6)</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /> High Priority Scoring (0.4 - 0.6)</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Stable Area (&lt;0.4)</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar details inspector (4 cols equivalent) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          {/* Geocoding search filter */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search villages..."
              className="w-full pl-8 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <Search size={12} className="absolute left-7 top-5.5 text-slate-400" />
          </div>

          {/* Inspector profiles details cards */}
          <div className="flex-grow p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg flex flex-col min-h-[300px] overflow-hidden">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 shrink-0">
              <Compass size={14} className="text-indigo-500" />
              GIS Inspector
            </h3>

            <div className="flex-grow overflow-y-auto pr-1">
              {selectedVillage ? (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-base leading-tight">
                      {selectedVillage.name} Village Profile
                    </h4>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {selectedVillage.ward} | {selectedVillage.district}, {selectedVillage.state}
                    </span>
                  </div>

                  {/* Demographics indicators */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Population</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1">
                        <Users size={10} className="text-slate-400" />
                        {selectedVillage.population.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Overall index</span>
                      <span className="text-xs font-black text-indigo-500 mt-0.5 block">
                        {(selectedVillage.development_index * 100).toFixed(0)}% Rated
                      </span>
                    </div>
                  </div>

                  {/* Gap Scores cards */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Infrastructure Gaps</span>
                    <div className="space-y-2">
                      {[
                        { label: "Road Connectivity Deficit", value: selectedVillage.gap_score_road },
                        { label: "Drinking Water Shortage", value: selectedVillage.gap_score_water },
                        { label: "Electricity Grid Deficit", value: selectedVillage.gap_score_electricity },
                        { label: "School Capacity Deficit", value: selectedVillage.gap_score_school },
                        { label: "Clinic Capacity Deficit", value: selectedVillage.gap_score_hospital },
                      ].map((gap, i) => (
                        <div key={i} className="text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>{gap.label}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{(gap.value * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${gap.value > 0.6 ? "bg-red-500" : gap.value > 0.4 ? "bg-orange-500" : "bg-emerald-500"}`}
                              style={{ width: `${gap.value * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Suggested development priorities */}
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs leading-normal space-y-2 pt-3">
                    <div className="flex items-center gap-1 font-bold text-indigo-400">
                      <Sparkles size={12} />
                      <span>AI Development Recommendation</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {selectedVillage.priority_score > 0.6
                        ? `Urgent deployment of a new Primary Clinic and Road connection is advised based on critical citizen requests.`
                        : `Current infrastructure coverage is stable. Maintenance on existing water grids suggested.`}
                    </p>
                  </div>

                  {/* Knowledge Graph integration overlay */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Network size={12} className="text-indigo-400" />
                      KG Node Synchronizations
                    </span>
                    {isGraphLoading ? (
                      <span className="text-[10px] text-slate-400 animate-pulse block">Polling Neo4j index...</span>
                    ) : graphConnections ? (
                      <div className="text-[11px] space-y-1.5 text-slate-400">
                        <div className="flex justify-between">
                          <span>Active Complaint Nodes:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{graphConnections.complaints}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Linked Citizens:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{graphConnections.citizens}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">Failed to retrieve graph links.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4 py-8">
                  <MapPin size={28} className="text-slate-500/40 mb-3 animate-bounce" />
                  <p className="text-xs">Click on any village marker or POI to inspect geocoded attributes, deficit indicators, and Neo4j node links.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default GisMapView;
