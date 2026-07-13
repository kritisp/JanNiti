import React, { useState, useEffect } from "react";
import { Wallet, CheckSquare, Square, TrendingUp, AlertTriangle, Save, DollarSign, CheckCircle2 } from "lucide-react";
import api from "@/core/api";

interface ProjectCandidate {
  id: string;
  villageId: string;
  villageName: string;
  title: string;
  category: "Road" | "Water Supply" | "Hospital" | "School" | "Electricity";
  costCrores: number;
  beneficiaries: number;
  priorityScore: number;
  reason: string;
}

export const BudgetPlannerView: React.FC = () => {
  const [candidates, setCandidates] = useState<ProjectCandidate[]>([]);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(5.0); // ₹5.0 Crores MPLADS Default
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize and load candidates from local indicators
  useEffect(() => {
    const fetchCandidates = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/gis/villages");
        const villages = response.data || [];
        
        // Form candidate projects based on maximum deficit indicator of each seeded village
        const mapped: ProjectCandidate[] = villages.map((v: any, idx: number) => {
          const gaps = [
            { type: "Road", score: v.gap_score_road, cost: 1.15, title: "Arterial Road Rehabilitation & Paving" },
            { type: "Water Supply", score: v.gap_score_water, cost: 0.45, title: "Community Arsenic Filter & Grid Setup" },
            { type: "Hospital", score: v.gap_score_hospital, cost: 0.85, title: "Primary Health Clinic Solar Retrofitting" },
            { type: "School", score: v.gap_score_school, cost: 0.95, title: "Secondary School Classroom Block Extension" },
            { type: "Electricity", score: v.gap_score_electricity, cost: 0.60, title: "Sub-station Transformer Installation" },
          ];

          // Sort gaps to select highest need area for project candidate
          const primeGap = gaps.sort((a, b) => b.score - a.score)[0];
          
          return {
            id: `PROJ_${v.id || idx}`,
            villageId: v.id,
            villageName: v.name,
            title: `${v.name} ${primeGap.title}`,
            category: primeGap.type as any,
            costCrores: primeGap.cost,
            beneficiaries: Math.round(v.population * 0.85),
            priorityScore: Math.round(v.priority_score * 100),
            reason: `Directly targets ${v.name} village's ${(primeGap.score * 100).toFixed(0)}% infrastructure deficit.`
          };
        });

        setCandidates(mapped);

        // Load previously saved approved states if available in localStorage
        const savedApproved = localStorage.getItem("mplads_approved_projects");
        if (savedApproved) {
          setApprovedIds(JSON.parse(savedApproved));
        } else {
          // Default approve the first two to match dashboard baseline
          const defaultApproved = mapped.slice(0, 2).map(m => m.id);
          setApprovedIds(defaultApproved);
        }

        const savedBudget = localStorage.getItem("mplads_budget_limit");
        if (savedBudget) {
          setTotalBudget(parseFloat(savedBudget));
        }
      } catch (err) {
        console.error("Failed to load budget candidates", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // Toggle selection
  const handleToggleProject = (id: string) => {
    setApprovedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("mplads_approved_projects", JSON.stringify(next));
      return next;
    });
  };

  const handleSaveBudgetConfig = () => {
    localStorage.setItem("mplads_approved_projects", JSON.stringify(approvedIds));
    localStorage.setItem("mplads_budget_limit", totalBudget.toString());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Math aggregates
  const allocatedBudget = candidates
    .filter((c) => approvedIds.includes(c.id))
    .reduce((sum, c) => sum + c.costCrores, 0);

  const remainingBudget = totalBudget - allocatedBudget;
  const utilizationPercentage = Math.min((allocatedBudget / totalBudget) * 100, 100);

  // Group allocations by category for charts
  const categoryAllocations = candidates
    .filter((c) => approvedIds.includes(c.id))
    .reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + c.costCrores;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            MPLADS Budget Planner
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Manage spending limits, allocate budgets to priority projects, and visualize category cost distributions.
          </p>
        </div>
        <button
          onClick={handleSaveBudgetConfig}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white font-semibold text-xs transition-all"
        >
          {saveSuccess ? <CheckCircle2 size={14} className="text-white" /> : <Save size={14} />}
          {saveSuccess ? "Plan Saved!" : "Save spending plan"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spending Limit</span>
            <Wallet size={16} className="text-indigo-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">₹{totalBudget.toFixed(2)}</span>
              <span className="text-xs font-bold text-slate-400">Crores</span>
            </div>
            {/* Quick adjust buttons */}
            <div className="mt-4 flex gap-2">
              {[2.0, 5.0, 8.0, 10.0].map((b) => (
                <button
                  key={b}
                  onClick={() => setTotalBudget(b)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    totalBudget === b
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350"
                  }`}
                >
                  ₹{b}Cr
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Allocated Funds</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">₹{allocatedBudget.toFixed(2)}</span>
              <span className="text-xs font-bold text-slate-400">Crores</span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  remainingBudget < 0 ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${utilizationPercentage}%` }}
              />
            </div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">
              {utilizationPercentage.toFixed(0)}% budget utilized
            </span>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border bg-white dark:bg-slate-900 shadow-lg relative overflow-hidden flex flex-col justify-between ${
          remainingBudget < 0 ? "border-red-500/40" : "border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining Balance</span>
            {remainingBudget < 0 ? <AlertTriangle size={16} className="text-red-500 animate-pulse" /> : <DollarSign size={16} className="text-indigo-500" />}
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black ${remainingBudget < 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}>
                ₹{remainingBudget.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-400">Crores</span>
            </div>
            <span className="block text-[10px] text-slate-500 mt-3 leading-normal">
              {remainingBudget < 0 ? (
                <span className="text-red-500 font-bold flex items-center gap-1">
                  Budget Exceeded! De-allocate projects to resolve.
                </span>
              ) : (
                "Funds available for extra project approvals."
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Projects list + Category analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Candidates List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            Candidate Priority Projects
          </span>

          {isLoading ? (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-slate-500">
              Loading candidates...
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((c) => {
                const isApproved = approvedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleProject(c.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-4 ${
                      isApproved
                        ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-lg shadow-emerald-500/5"
                        : "border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Checkbox Icon */}
                      <div className="mt-1 shrink-0">
                        {isApproved ? (
                          <CheckSquare size={18} className="text-emerald-500" />
                        ) : (
                          <Square size={18} className="text-slate-400 dark:text-slate-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            c.category === "Road"
                              ? "bg-amber-500/10 text-amber-500"
                              : c.category === "Water Supply"
                              ? "bg-blue-500/10 text-blue-400"
                              : c.category === "Hospital"
                              ? "bg-red-500/10 text-red-400"
                              : c.category === "School"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}>
                            {c.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            AI Score: {c.priorityScore}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base leading-tight">
                          {c.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          {c.reason}
                        </p>
                      </div>
                    </div>

                    {/* Cost Badge */}
                    <div className="text-right shrink-0">
                      <span className="block text-sm font-black text-slate-800 dark:text-indigo-400">
                        ₹{c.costCrores.toFixed(2)} Cr
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                        Reach: {c.beneficiaries.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Funding Distribution & Summary (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              Allocation Distribution
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Funding allocation broken down by sector category.
            </p>
          </div>

          <div className="space-y-4">
            {["Road", "Water Supply", "Hospital", "School", "Electricity"].map((cat) => {
              const allocated = categoryAllocations[cat] || 0;
              const ratio = allocatedBudget > 0 ? (allocated / allocatedBudget) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600 dark:text-slate-350">{cat}</span>
                    <span className="text-slate-900 dark:text-white font-mono">₹{allocated.toFixed(2)} Cr</span>
                  </div>
                  {/* Category Progress */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat === "Road"
                          ? "bg-amber-500"
                          : cat === "Water Supply"
                          ? "bg-blue-500"
                          : cat === "Hospital"
                          ? "bg-red-500"
                          : cat === "School"
                          ? "bg-purple-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Total Projects Approved</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{approvedIds.length}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Total Est. Beneficiaries</span>
              <span className="font-bold text-indigo-500">
                {candidates
                  .filter((c) => approvedIds.includes(c.id))
                  .reduce((sum, c) => sum + c.beneficiaries, 0)
                  .toLocaleString()}{" "}
                citizens
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BudgetPlannerView;
