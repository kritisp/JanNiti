import React, { useState } from "react";
import { Map, Layers, ZoomIn, ZoomOut, Compass, Navigation } from "lucide-react";

export const MapCard: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<"demand" | "demographics" | "gaps">("demand");
  const [selectedPin, setSelectedPin] = useState<{ name: string; block: string; demand: number; status: string } | null>({
    name: "Aurangpur Village",
    block: "Raniganj Block",
    demand: 42,
    status: "Critical Road & Medical Gap",
  });

  const pins = [
    { name: "Aurangpur Village", block: "Raniganj Block", demand: 42, x: 75, y: 45, status: "Critical Road & Medical Gap" },
    { name: "Nayanagar Village", block: "Forbesganj Block", demand: 35, x: 40, y: 70, status: "High Solar Pump Demand" },
    { name: "Rampur East", block: "Palasi Block", demand: 28, x: 120, y: 90, status: "Moderate Flood Shelter Gap" },
  ];

  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative flex flex-col h-[400px]">
      {/* Map Control Headers */}
      <div className="flex items-center justify-between shrink-0 mb-4 z-10">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Spatial Demand Heatmap</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Geospatial overlays of citizen request density</p>
        </div>
        
        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveLayer("demand")}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              activeLayer === "demand"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Feedback
          </button>
          <button
            onClick={() => setActiveLayer("demographics")}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              activeLayer === "demographics"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Demographics
          </button>
        </div>
      </div>

      {/* Futuristic Vector Map canvas */}
      <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800/80 relative overflow-hidden flex items-center justify-center">
        
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

        {/* Abstract Electorate Map Shapes */}
        <svg viewBox="0 0 200 160" className="w-full max-w-[340px] h-auto select-none opacity-80">
          <defs>
            <radialGradient id="cyan-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="indigo-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Block boundaries */}
          <path d="M 20,40 Q 60,20 100,50 T 180,30 L 170,130 Q 90,140 30,120 Z" fill="rgba(30, 41, 59, 0.2)" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 100,50 Q 80,100 120,135" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" />
          <path d="M 60,30 Q 75,70 30,120" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" />

          {/* Ambient heatmaps glow rings depending on activeLayer */}
          {activeLayer === "demand" ? (
            <>
              <circle cx="75" cy="45" r="30" fill="url(#cyan-glow)" className="animate-pulse" />
              <circle cx="40" cy="70" r="22" fill="url(#cyan-glow)" />
              <circle cx="120" cy="90" r="25" fill="url(#indigo-glow)" />
            </>
          ) : (
            <>
              <circle cx="100" cy="80" r="45" fill="url(#indigo-glow)" className="animate-pulse" />
              <circle cx="150" cy="50" r="20" fill="url(#cyan-glow)" />
            </>
          )}
        </svg>

        {/* Hotspot Markers */}
        {pins.map((pin, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedPin(pin)}
            style={{ left: `${(pin.x / 200) * 100}%`, top: `${(pin.y / 160) * 100}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded-full border shadow-xl transition-all ${
              selectedPin?.name === pin.name
                ? "bg-indigo-600 border-white text-white scale-110 z-20"
                : "bg-slate-900 border-slate-700 text-cyan-400 hover:scale-105"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </button>
        ))}

        {/* Map Tool overlay */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 text-[9px] font-mono text-slate-400 bg-slate-950/90 border border-slate-800 p-2 rounded-lg backdrop-blur-md">
          <div className="flex items-center gap-1 text-slate-300">
            <Navigation size={9} className="rotate-45" />
            <span>GEO-REF: LOK_24_ARARIA</span>
          </div>
          <span>GRID STATS: 1,424 PTS</span>
          <span>LAT: 26° 09' N | LONG: 87° 27' E</span>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <ZoomIn size={12} />
          </button>
          <button className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <ZoomOut size={12} />
          </button>
        </div>

        {/* Dynamic Map Info Window */}
        {selectedPin && (
          <div className="absolute top-3 left-3 right-3 mx-auto max-w-[260px] bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl shadow-2xl backdrop-blur-md z-10">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-[11px] font-bold text-slate-100">{selectedPin.name}</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">{selectedPin.block}</p>
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                className="text-[9px] text-slate-500 hover:text-white font-semibold"
              >
                Close
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] border-t border-slate-800 pt-2 text-slate-300">
              <span className="font-semibold text-cyan-400">{selectedPin.demand} Citizen requests</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                {selectedPin.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapCard;
