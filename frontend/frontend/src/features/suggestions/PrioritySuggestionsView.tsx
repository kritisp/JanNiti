import React, { useState, useEffect } from "react";
import { Sparkles, Sliders, Activity, HelpCircle, ArrowRight } from "lucide-react";
import api from "@/core/api";
import RecommendationCard from "@/components/dashboard/RecommendationCard";

export const PrioritySuggestionsView: React.FC = () => {
  const [villages, setVillages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/gis/villages");
      // Sort villages by priority score descending
      const sorted = (response.data || []).sort((a: any, b: any) => b.priority_score - a.priority_score);
      setVillages(sorted);
    } catch (err) {
      console.error("Failed to load priority suggestions", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Map village indicators to structured recommendation card options
  const getRecommendationDetails = (v: any, index: number) => {
    const score = Math.round(v.priority_score * 100);
    const populationStr = v.population.toLocaleString();
    const block = `${v.ward || "Ward No. 1"} | Araria`;

    // Find maximum gap score to determine project focus
    const gaps = [
      { type: "Road", score: v.gap_score_road, label: "Road Connectivity Deficit" },
      { type: "Water", score: v.gap_score_water, label: "Drinking Water Grid Shortage" },
      { type: "Electricity", score: v.gap_score_electricity, label: "Electricity Grid Deficit" },
      { type: "School", score: v.gap_score_school, label: "School Capacity Deficit" },
      { type: "Hospital", score: v.gap_score_hospital, label: "Clinic Capacity Deficit" },
    ];

    const maxGap = gaps.sort((a, b) => b.score - a.score)[0];
    
    let title = "Constituency Asset Improvement";
    let budget = "₹75 Lakhs";
    let factors = [
      { id: "f1", text: "Priority rating compiled from composite regional infrastructure deficits.", type: "warning" as const },
      { id: "f2", text: "Targeted to serve local demographic and vulnerable groups.", type: "positive" as const }
    ];

    if (maxGap.type === "Road") {
      title = `${v.name} Main Road Pavement & Drainage Project`;
      budget = "₹1.15 Cr";
      factors = [
        { id: "f1", text: `Road connectivity rating is low (${(maxGap.score * 100).toFixed(0)}% deficit). Emphasizes mud road paving.`, type: "warning" as const },
        { id: "f2", text: `Reduces emergency travel times to central hospitals from 55 min to under 20 min.`, type: "positive" as const },
        { id: "f3", text: `High local feedback support indicating community endorsement.`, type: "positive" as const }
      ];
    } else if (maxGap.type === "Water") {
      title = `${v.name} Safe Drinking Water Filter Grid`;
      budget = "₹45 Lakhs";
      factors = [
        { id: "f1", text: `Water grid access deficit is high (${(maxGap.score * 100).toFixed(0)}% shortage).`, type: "warning" as const },
        { id: "f2", text: `Filters arsenic and chemical contaminants, improving health safety.`, type: "positive" as const },
        { id: "f3", text: `Mitigates groundwater waterlogging issues.`, type: "positive" as const }
      ];
    } else if (maxGap.type === "Hospital") {
      title = `${v.name} Clinic Expansion & Solar Retrofitting`;
      budget = "₹85 Lakhs";
      factors = [
        { id: "f1", text: `Primary clinic capacity is severely constrained (1 clinic per ${populationStr} residents).`, type: "warning" as const },
        { id: "f2", text: `Enables solar backup grid to resolve cold-chain vaccine issues during outages.`, type: "positive" as const }
      ];
    } else if (maxGap.type === "School") {
      title = `${v.name} Secondary School Upgradation`;
      budget = "₹95 Lakhs";
      factors = [
        { id: "f1", text: `Primary school capacity does not meet baseline population needs.`, type: "warning" as const },
        { id: "f2", text: `Minimizes student commute walking distances to neighboring wards.`, type: "positive" as const }
      ];
    } else {
      title = `${v.name} Electricity Grid Extension`;
      budget = "₹60 Lakhs";
      factors = [
        { id: "f1", text: `Electricity grid access deficiency is high.`, type: "warning" as const },
        { id: "f2", text: `Integrates new transformers to stabilize power supply.`, type: "positive" as const }
      ];
    }

    return {
      rank: index + 1,
      title,
      village: `${v.name} Village`,
      block,
      budget,
      population: populationStr,
      score,
      factors
    };
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          AI Priority Suggestions
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Dynamic project proposals ranked by the Priority Recommendation Engine. Scoring weights reflect local infrastructure gaps and citizen request volumes.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Activity size={32} className="text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Evaluating spending layouts...</span>
        </div>
      ) : villages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {villages.map((v, idx) => {
            const cardProps = getRecommendationDetails(v, idx);
            return (
              <RecommendationCard
                key={v.id}
                rank={cardProps.rank}
                title={cardProps.title}
                village={cardProps.village}
                block={cardProps.block}
                budget={cardProps.budget}
                population={cardProps.population}
                score={cardProps.score}
                factors={cardProps.factors}
                onDraftProposal={() => alert(`Drafting proposal document for ${v.name} village.`)}
              />
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-slate-400">
          <HelpCircle size={28} className="mx-auto mb-3" />
          <p className="text-sm">No priority suggestions found. Ensure villages indicators are loaded.</p>
        </div>
      )}
    </div>
  );
};

export default PrioritySuggestionsView;
