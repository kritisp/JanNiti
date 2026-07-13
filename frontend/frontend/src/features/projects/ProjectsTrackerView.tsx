import React, { useState, useEffect } from "react";
import { Briefcase, Activity, CheckCircle, Clock, AlertTriangle, Plus, Search, Calendar, Filter, Sparkles } from "lucide-react";
import api from "@/core/api";

interface TrackedProject {
  id: string;
  title: string;
  village: string;
  category: string;
  budget: string;
  progress: number; // 0 to 100
  status: "Planned" | "In Progress" | "Completed" | "Delayed";
  startDate: string;
  endDate: string;
  riskLevel: "Low" | "Medium" | "High";
  aiRiskExplanation?: string;
}

export const ProjectsTrackerView: React.FC = () => {
  const [projects, setProjects] = useState<TrackedProject[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New project form state
  const [newTitle, setNewTitle] = useState("");
  const [newVillage, setNewVillage] = useState("Aurangpur");
  const [newCategory, setNewCategory] = useState("Road");
  const [newBudget, setNewBudget] = useState("₹50 Lakhs");

  useEffect(() => {
    const initializeTracker = async () => {
      setIsLoading(true);
      try {
        // Seed baseline in-progress and completed projects
        const baselineProjects: TrackedProject[] = [
          {
            id: "TRACK_1",
            title: "Aurangpur Main Road Pavement",
            village: "Aurangpur",
            category: "Road",
            budget: "₹1.15 Cr",
            progress: 65,
            status: "In Progress",
            startDate: "2026-05-10",
            endDate: "2026-08-30",
            riskLevel: "High",
            aiRiskExplanation: "At risk of monsoon waterlogging delays due to sub-drainage construction bottleneck."
          },
          {
            id: "TRACK_2",
            title: "Nayanagar Primary Clinic Solar Retrofitting",
            village: "Nayanagar",
            category: "Hospital",
            budget: "₹38 Lakhs",
            progress: 100,
            status: "Completed",
            startDate: "2026-04-01",
            endDate: "2026-06-15",
            riskLevel: "Low"
          },
          {
            id: "TRACK_3",
            title: "Raniganj Secondary School Block build",
            village: "Raniganj",
            category: "School",
            budget: "₹95 Lakhs",
            progress: 20,
            status: "In Progress",
            startDate: "2026-06-01",
            endDate: "2026-11-20",
            riskLevel: "Medium",
            aiRiskExplanation: "Procurement delay for structural steel rods detected from central logistics nodes."
          },
          {
            id: "TRACK_4",
            title: "Jokihat Community Arsenic Filter Installation",
            village: "Jokihat",
            category: "Water Supply",
            budget: "₹45 Lakhs",
            progress: 90,
            status: "In Progress",
            startDate: "2026-05-15",
            endDate: "2026-07-25",
            riskLevel: "Low"
          }
        ];

        // Fetch approved budget planner projects from localStorage and append them as 'Planned' projects!
        const savedApproved = localStorage.getItem("mplads_approved_projects");
        if (savedApproved) {
          const approvedIds = JSON.parse(savedApproved);
          const response = await api.get("/api/gis/villages");
          const villages = response.data || [];

          const plannerProjects: TrackedProject[] = [];
          
          // Generate projects matching the approved planner ID format
          villages.forEach((v: any, idx: number) => {
            const projId = `PROJ_${v.id || idx}`;
            if (approvedIds.includes(projId)) {
              // Ensure we don't duplicate baseline seeded projects
              const baseNameMatch = baselineProjects.some(bp => bp.village.toLowerCase() === v.name.toLowerCase());
              if (!baseNameMatch) {
                plannerProjects.push({
                  id: projId,
                  title: `${v.name} Community Infrastructure Upgrade`,
                  village: v.name,
                  category: v.gap_score_road > v.gap_score_water ? "Road" : "Water Supply",
                  budget: v.gap_score_road > v.gap_score_water ? "₹1.15 Cr" : "₹45 Lakhs",
                  progress: 0,
                  status: "Planned",
                  startDate: "2026-08-01",
                  endDate: "2026-12-15",
                  riskLevel: "Low"
                });
              }
            }
          });

          setProjects([...baselineProjects, ...plannerProjects]);
        } else {
          setProjects(baselineProjects);
        }
      } catch (err) {
        console.error("Failed to initialize projects tracker", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTracker();
  }, []);

  // Update progress handler
  const handleIncrementProgress = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextProgress = Math.min(p.progress + 10, 100);
        const nextStatus = nextProgress === 100 ? "Completed" : p.status;
        return {
          ...p,
          progress: nextProgress,
          status: nextStatus as any,
          riskLevel: nextProgress === 100 ? "Low" : p.riskLevel
        };
      })
    );
  };

  // Status toggle handler
  const handleChangeStatus = (id: string, newStatus: any) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: newStatus,
          progress: newStatus === "Completed" ? 100 : (newStatus === "Planned" ? 0 : p.progress)
        };
      })
    );
  };

  // Add project handler
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newProj: TrackedProject = {
      id: `TRACK_${Date.now()}`,
      title: newTitle,
      village: newVillage,
      category: newCategory,
      budget: newBudget,
      progress: 0,
      status: "Planned",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "2026-12-31",
      riskLevel: "Low"
    };

    setProjects((prev) => [newProj, ...prev]);
    setNewTitle("");
    setShowAddForm(false);
  };

  // Stat aggregates
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status === "In Progress").length;
  const completedCount = projects.filter((p) => p.status === "Completed").length;
  const delayedCount = projects.filter((p) => p.status === "Delayed" || p.riskLevel === "High").length;

  const filtered = projects.filter((p) => {
    const matchesStatus = filterStatus === "All" || p.status === filterStatus;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Projects Tracker
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Monitor infrastructure implementation schedules, track physical progress percentages, and mitigate bottlenecks.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white font-semibold text-xs transition-all"
        >
          <Plus size={14} />
          <span>Track New Project</span>
        </button>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Projects</span>
          <span className="text-2xl font-black text-slate-800 dark:text-white block mt-2">{totalCount}</span>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <Activity size={12} className="text-indigo-500" />
            In Progress
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white block mt-2">{activeCount}</span>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-500" />
            Completed
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white block mt-2">{completedCount}</span>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
            At Risk / Delayed
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white block mt-2">{delayedCount}</span>
        </div>
      </div>

      {/* Grid: Search/Filter list + Add Form Overlay */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Search controls row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search project title or village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            {["All", "Planned", "In Progress", "Completed", "Delayed"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex-grow sm:flex-grow-0 ${
                  filterStatus === st
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* New Project Form Overlay modal */}
        {showAddForm && (
          <div className="p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Track New Development Asset</h3>
            <form onSubmit={handleAddProject} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Main Canal Desilting"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs w-full focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Village Location</label>
                <select
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs w-full focus:outline-none"
                >
                  <option value="Aurangpur">Aurangpur</option>
                  <option value="Nayanagar">Nayanagar</option>
                  <option value="Raniganj">Raniganj</option>
                  <option value="Jokihat">Jokihat</option>
                  <option value="Kursakanta">Kursakanta</option>
                  <option value="Jokihat">Jokihat</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-xs w-full focus:outline-none"
                >
                  <option value="Road">Road</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Hospital">Hospital</option>
                  <option value="School">School</option>
                  <option value="Electricity">Electricity</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-grow p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Confirm Track
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects List View */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Title block */}
                <div className="space-y-2 max-w-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      p.status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-500 animate-none"
                        : p.status === "In Progress"
                        ? "bg-indigo-500/10 text-indigo-500"
                        : p.status === "Delayed"
                        ? "bg-red-500/10 text-red-500 animate-pulse"
                        : "bg-slate-100 dark:bg-slate-850 text-slate-500"
                    }`}>
                      {p.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {p.category} | {p.village}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">
                    {p.title}
                  </h4>

                  {p.aiRiskExplanation && (
                    <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                      <Sparkles size={12} className="shrink-0 mt-0.5" />
                      <span><strong>AI Risk Alert:</strong> {p.aiRiskExplanation}</span>
                    </div>
                  )}
                </div>

                {/* Progress controls */}
                <div className="flex-1 max-w-xs space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Physical completion</span>
                    <span className="font-mono text-slate-700 dark:text-slate-350">{p.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        p.status === "Completed"
                          ? "bg-emerald-500"
                          : p.riskLevel === "High"
                          ? "bg-red-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    {p.status !== "Completed" && (
                      <button
                        onClick={() => handleIncrementProgress(p.id)}
                        className="text-[9px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800"
                      >
                        +10% Progress
                      </button>
                    )}
                    <select
                      value={p.status}
                      onChange={(e) => handleChangeStatus(p.id, e.target.value as any)}
                      className="text-[9px] font-bold px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800"
                    >
                      <option value="Planned">Planned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed</option>
                    </select>
                  </div>
                </div>

                {/* Logistics date/budget */}
                <div className="text-right shrink-0">
                  <span className="block text-sm font-black text-slate-850 dark:text-indigo-400">
                    {p.budget}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 justify-end mt-1.5">
                    <Calendar size={11} className="text-slate-500" />
                    {p.startDate} to {p.endDate}
                  </span>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-2 ${
                    p.riskLevel === "High"
                      ? "bg-red-500/10 text-red-500 animate-pulse"
                      : p.riskLevel === "Medium"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-emerald-500/10 text-emerald-500"
                  }`}>
                    {p.riskLevel} Risk
                  </span>
                </div>

              </div>
            ))
          ) : (
            <div className="p-12 rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-center text-slate-400">
              <HelpCircle size={28} className="mx-auto mb-3 text-slate-500/40" />
              <p className="text-sm">No matched tracked projects found. Try checking status filter keys.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProjectsTrackerView;
