import React from "react";
import { BarChart3, PieChart, Info } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: "infrastructure" | "budget";
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, type }) => {
  const renderInfrastructureChart = () => {
    const gaps = [
      { sector: "Roads & Bridges", gap: 78, label: "Critical", color: "bg-red-500/20 text-red-400 border-red-500/20", barColor: "from-red-500 to-pink-500" },
      { sector: "Water & Sanitation", gap: 62, label: "High", color: "bg-amber-500/20 text-amber-400 border-amber-500/20", barColor: "from-amber-500 to-orange-500" },
      { sector: "Primary Clinics", gap: 45, label: "Moderate", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20", barColor: "from-indigo-500 to-purple-500" },
      { sector: "Micro Solar Grids", gap: 38, label: "Moderate", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20", barColor: "from-cyan-500 to-indigo-500" },
      { sector: "Digital Schools", gap: 24, label: "Stable", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20", barColor: "from-emerald-500 to-teal-500" },
    ];

    return (
      <div className="space-y-4">
        {gaps.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700 dark:text-slate-300">{item.sector}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] border ${item.color}`}>
                  {item.label}
                </span>
                <span className="text-slate-900 dark:text-white font-bold">{item.gap}% Gap</span>
              </div>
            </div>
            {/* Progress bar container */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${item.barColor}`}
                style={{ width: `${item.gap}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBudgetChart = () => {
    // Custom Donut representation in SVG
    const radius = 50;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;

    // Segment values: Roads (45%), Health (20%), Solar (15%), Water (20%)
    const segments = [
      { name: "Road Infrastructure", percentage: 45, value: "₹1.12 Cr", color: "#6366f1", offset: 0 },
      { name: "Drinking Water filtration", percentage: 20, value: "₹50 L", color: "#10b981", offset: circumference * 0.45 },
      { name: "Primary Clinics setup", percentage: 20, value: "₹50 L", color: "#ec4899", offset: circumference * 0.65 },
      { name: "Solar Grid deployments", percentage: 15, value: "₹38 L", color: "#f59e0b", offset: circumference * 0.85 },
    ];

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Styled Donut SVG */}
        <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 120 120">
            {/* Ambient inner backing */}
            <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#1e293b" strokeWidth={strokeWidth} className="opacity-10 dark:opacity-40" />
            {segments.map((seg, idx) => {
              const dasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
              return (
                <circle
                  key={idx}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dasharray}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="round"
                  className="transition-all hover:stroke-[16px] cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-slate-800 dark:text-white">₹2.5 Cr</span>
            <span className="text-[10px] text-slate-400">Total Budget</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">{seg.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-semibold text-slate-800 dark:text-white">{seg.value}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">({seg.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
          {type === "infrastructure" ? <BarChart3 size={16} /> : <PieChart size={16} />}
        </div>
      </div>

      <div className="mt-6 flex-1">
        {type === "infrastructure" ? renderInfrastructureChart() : renderBudgetChart()}
      </div>

      {/* Interactive Tooltip backing info */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-400">
        <Info size={11} className="text-indigo-400" />
        <span>Datasets updated today at 04:30 AM via State GIS servers</span>
      </div>
    </div>
  );
};

export default ChartCard;
