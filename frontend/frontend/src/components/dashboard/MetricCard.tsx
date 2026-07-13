import React from "react";
import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  trend: {
    value: string;
    isPositive: boolean;
  };
  color: "indigo" | "emerald" | "cyan" | "pink" | "amber";
  sparklineData?: number[];
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = "",
  icon: Icon,
  trend,
  color,
  sparklineData = [20, 35, 25, 45, 30, 50, 40],
}) => {
  // Theme color maps for text, backgrounds, and sparklines
  const colorMaps = {
    indigo: {
      text: "text-indigo-500 dark:text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "hover:border-indigo-500/30",
      glow: "shadow-indigo-500/5",
      stroke: "#6366f1",
      fill: "rgba(99, 102, 241, 0.1)",
    },
    emerald: {
      text: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "hover:border-emerald-500/30",
      glow: "shadow-emerald-500/5",
      stroke: "#10b981",
      fill: "rgba(16, 185, 129, 0.1)",
    },
    cyan: {
      text: "text-cyan-500 dark:text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "hover:border-cyan-500/30",
      glow: "shadow-cyan-500/5",
      stroke: "#06b6d4",
      fill: "rgba(6, 182, 212, 0.1)",
    },
    pink: {
      text: "text-pink-500 dark:text-pink-400",
      bg: "bg-pink-500/10",
      border: "hover:border-pink-500/30",
      glow: "shadow-pink-500/5",
      stroke: "#ec4899",
      fill: "rgba(236, 72, 153, 0.1)",
    },
    amber: {
      text: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "hover:border-amber-500/30",
      glow: "shadow-amber-500/5",
      stroke: "#f59e0b",
      fill: "rgba(245, 158, 11, 0.1)",
    },
  };

  const selectedColor = colorMaps[color];

  // Helper to generate sparkline path points
  const width = 100;
  const height = 30;
  const maxVal = Math.max(...sparklineData);
  const minVal = Math.min(...sparklineData);
  const range = maxVal - minVal || 1;

  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPath = `M 0,${height} L ${points} L ${width},${height} Z`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg ${selectedColor.glow} ${selectedColor.border} transition-all overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${selectedColor.bg} ${selectedColor.text}`}>
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            {unit}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Trend Indicator Pill */}
        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          trend.isPositive
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}>
          {trend.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          <span>{trend.value}</span>
        </div>

        {/* Sparkline Visual SVG */}
        <div className="w-24 h-8 shrink-0 opacity-80 dark:opacity-100">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
            {/* Sparkline Area Fill */}
            <path d={fillPath} fill={selectedColor.fill} stroke="none" />
            {/* Sparkline Line */}
            <polyline
              fill="none"
              stroke={selectedColor.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;
