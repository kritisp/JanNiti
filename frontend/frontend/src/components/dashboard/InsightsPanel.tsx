import React from "react";
import { AlertCircle, MapPin, Users, HardHat, HeartPulse, ChevronRight } from "lucide-react";

export const InsightsPanel: React.FC = () => {
  const insights = [
    {
      title: "Top Infrastructure Gap",
      value: "Road Connection Deficiency",
      description: "Raniganj Block lacks 14km of paved arterial connection routes.",
      icon: HardHat,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Highest Demand Location",
      value: "Aurangpur Village",
      description: "42 matching citizen feedback requests received this week.",
      icon: MapPin,
      color: "text-red-500 bg-red-500/10 border-red-500/20",
    },
    {
      title: "Population At Health Risk",
      value: "18,400 Citizens",
      description: "Groundwater tests indicate high levels of chemical arsenic.",
      icon: Users,
      color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    },
    {
      title: "Urgent Recommendation",
      value: "Clinics Solar Retrofitting",
      description: "Equip 8 local block clinics with solar backups before monsoon.",
      icon: HeartPulse,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-indigo-500" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Constituency Alerts</h3>
        </div>
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      </div>

      {/* Alerts List */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all flex gap-3 group cursor-pointer"
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${insight.color}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {insight.title}
                  </span>
                  <ChevronRight size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate mt-0.5">
                  {insight.value}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform Health footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span>Alert Threshold: Critical 80%+</span>
        <span className="text-indigo-500 font-semibold cursor-pointer hover:underline">Manage Rules</span>
      </div>
    </div>
  );
};

export default InsightsPanel;
