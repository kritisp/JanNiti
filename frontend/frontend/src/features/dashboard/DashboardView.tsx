import React from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Sparkles,
  Map,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  Wallet,
  Activity,
} from "lucide-react";

import MetricCard from "@/components/dashboard/MetricCard";
import ChartCard from "@/components/dashboard/ChartCard";
import MapCard from "@/components/dashboard/MapCard";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import InsightsPanel from "@/components/dashboard/InsightsPanel";

export const DashboardView: React.FC = () => {
  const { toggleCopilot } = useOutletContext<{ toggleCopilot: () => void }>();

  const metrics = [
    {
      title: "Total Citizen Requests",
      value: "1,248",
      unit: "petitions",
      icon: MessageSquare,
      trend: { value: "+14.2% MoM", isPositive: true },
      color: "indigo" as const,
      data: [15, 20, 18, 30, 24, 38, 42],
    },
    {
      title: "Infrastructure Gaps",
      value: "14",
      unit: "critical blocks",
      icon: AlertTriangle,
      trend: { value: "-4.1% MoM", isPositive: true },
      color: "amber" as const,
      data: [25, 22, 24, 20, 18, 16, 14],
    },
    {
      title: "Budget Remaining",
      value: "₹2.50",
      unit: "Crores",
      icon: Wallet,
      trend: { value: "100% allocation", isPositive: true },
      color: "emerald" as const,
      data: [100, 100, 100, 100, 100, 100, 100],
    },
    {
      title: "Population Covered",
      value: "54.2k",
      unit: "residents",
      icon: Users,
      trend: { value: "+8.4% reach", isPositive: true },
      color: "cyan" as const,
      data: [40, 42, 45, 48, 50, 52, 54],
    },
  ];

  const recommendations = [
    {
      rank: 1,
      title: "Aurangpur Main Road Pavement Project",
      village: "Aurangpur Village",
      block: "Raniganj Block",
      budget: "₹1.12 Cr",
      population: "12,400",
      score: 94,
      factors: [
        { id: "f1", text: "Average travel time to nearest emergency health center is currently 54 minutes (target < 20 min).", type: "warning" as const },
        { id: "f2", text: "High local petition count indicating strong community endorsement (42 independent entries).", type: "positive" as const },
        { id: "f3", text: "Connects three contiguous blocks, optimizing commercial transport pathways.", type: "positive" as const },
      ],
    },
    {
      rank: 2,
      title: "Nayanagar Clinic Solar Power Grid",
      village: "Nayanagar",
      block: "Forbesganj Block",
      budget: "₹38 Lakhs",
      population: "8,200",
      score: 87,
      factors: [
        { id: "f4", text: "Primary care clinic experiences an average of 4.2 power outages daily.", type: "warning" as const },
        { id: "f5", text: "Enables vaccine cold-chain preservation and night-time treatment capabilities.", type: "positive" as const },
      ],
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 border border-slate-200/60 dark:border-slate-800/80 shadow-lg relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/35 text-indigo-600 dark:text-indigo-400 text-xs font-semibold w-fit select-none">
            <Sparkles size={12} className="animate-pulse" />
            <span>AI Development Copilot Live</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
            Constituency Planning Workspace
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-300 leading-relaxed">
            Transform citizen request aggregates, local demographic structures, and infrastructure deficit registers into optimized, explainable spending layouts.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={toggleCopilot}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:scale-102 transition-all active:scale-98"
          >
            <Sparkles size={14} />
            <span>AI Copilot</span>
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs transition-all active:scale-98">
            <PlusCircle size={14} className="text-indigo-500" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, idx) => (
          <MetricCard
            key={idx}
            title={m.title}
            value={m.value}
            unit={m.unit}
            icon={m.icon}
            trend={m.trend}
            color={m.color}
            sparklineData={m.data}
          />
        ))}
      </div>

      {/* Main Grid: Map & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Heatmap Map & Stats (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-8">
          <MapCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartCard title="Infrastructure Gap Matrix" subtitle="Calculated index by block category" type="infrastructure" />
            <ChartCard title="Earmarked Allocations" subtitle="Consolidated funding distribution" type="budget" />
          </div>
        </div>

        {/* Right Column: AI Suggestion Cards & Insights (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-8">
          {/* Prioritized Recommendation list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-500" />
                Top Recommendations
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hover:underline cursor-pointer">
                View All
              </span>
            </div>
            
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.rank}
                rank={rec.rank}
                title={rec.title}
                village={rec.village}
                block={rec.block}
                budget={rec.budget}
                population={rec.population}
                score={rec.score}
                factors={rec.factors}
              />
            ))}
          </div>

          {/* Today's Insights panel */}
          <InsightsPanel />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
