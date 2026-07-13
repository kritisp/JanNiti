import React from "react";
import { Sparkles, Users, Award, ShieldAlert, CheckCircle, ArrowRight } from "lucide-react";

interface Factor {
  id: string;
  text: string;
  type: "positive" | "warning";
}

interface RecommendationCardProps {
  rank: number;
  title: string;
  village: string;
  block: string;
  budget: string;
  population: string;
  score: number; // Score out of 100
  factors: Factor[];
  onDraftProposal?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  rank,
  title,
  village,
  block,
  budget,
  population,
  score,
  factors,
  onDraftProposal,
}) => {
  return (
    <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-500/5 hover:border-slate-300 dark:hover:border-slate-700">
      
      {/* Background ambient glow behind score */}
      <div className="absolute -top-10 -right-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs shrink-0 select-none">
            #{rank}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
              {title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {village}, <span className="font-medium text-slate-400">{block}</span>
            </p>
          </div>
        </div>

        {/* AI Score Badge */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            <Sparkles size={13} className="text-indigo-500" />
            <span className="text-base font-extrabold text-slate-900 dark:text-white">{score}</span>
            <span className="text-[10px] text-slate-400">/100</span>
          </div>
          <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Priority index</span>
        </div>
      </div>

      {/* Project Specs */}
      <div className="mt-5 grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/80 text-center">
        <div>
          <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Est. Budget</span>
          <span className="block text-xs font-bold text-slate-800 dark:text-indigo-400 mt-0.5">{budget}</span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Reach</span>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
            <Users size={11} className="text-slate-400" />
            {population}
          </span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Status</span>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Approved</span>
        </div>
      </div>

      {/* AI Explanation / Factors */}
      <div className="mt-5 space-y-2.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Award size={12} className="text-indigo-500" />
          Explainable AI Decision Factors
        </span>
        <div className="space-y-2">
          {factors.map((factor) => (
            <div key={factor.id} className="flex gap-2 items-start text-xs leading-normal">
              {factor.type === "positive" ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <span className="text-slate-600 dark:text-slate-300">{factor.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Draft Action Button */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
        <span className="text-[10px] text-slate-400">Ready to draft project documentation</span>
        <button
          onClick={onDraftProposal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white font-semibold text-xs transition-all active:scale-98 focus:outline-none"
        >
          <span>Draft Proposal</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default RecommendationCard;
