import React, { useState, useEffect } from "react";
import {
  Play,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Terminal,
  HelpCircle,
  TrendingUp,
  Cpu,
  RefreshCw,
} from "lucide-react";
import api from "@/core/api";

const AGENT_NAMES = [
  "TranslationAgent",
  "ClassificationAgent",
  "EntityExtractionAgent",
  "LocationIntelligenceAgent",
  "KnowledgeGraphAgent",
  "InfrastructureAnalysisAgent",
  "PriorityRecommendationAgent",
  "BudgetOptimizationAgent",
  "ImpactPredictionAgent",
  "ExplainableAIAgent",
  "ReportGenerationAgent",
  "AICopilotAgent",
];

export const AgentWorkflowView: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const hRes = await api.get("/api/agents/runs");
      setRuns(hRes.data || []);
      
      const sRes = await api.get("/api/agents/statistics");
      setStats(sRes.data || []);
    } catch (err) {
      console.error("Failed to load workflow history", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch full details of a specific run ID
  const inspectRun = async (runId: string) => {
    try {
      const res = await api.get(`/api/agents/run/${runId}`);
      setSelectedRun(res.data);
      if (res.data.task_logs.length > 0) {
        setSelectedAgent(res.data.task_logs[0].agent_name);
      }
    } catch (err) {
      console.error("Failed to fetch run details", err);
    }
  };

  // Trigger Citizen Ingestion run simulation
  const handleTriggerWorkflow = async () => {
    setIsTriggering(true);
    setActiveStepIdx(0);
    setSelectedRun(null);

    const demoPayload = {
      trigger_type: "Citizen Submission",
      payload: {
        description: "The road in Aurangpur Village is flooded and cracked. Commuting to local clinics takes more than 50 minutes. We urgently need concrete pavement and drainage.",
        submitted_category: "Road",
        village: "Aurangpur",
        pin_code: "854311",
        district: "Araria",
        state: "Bihar"
      }
    };

    // Simulate stepping through the 12 nodes sequentially in UI
    const stepInterval = setInterval(() => {
      setActiveStepIdx((prev) => {
        if (prev !== null && prev < 11) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          return null;
        }
      });
    }, 900);

    try {
      const response = await api.post("/api/agents/run", demoPayload);
      const runId = response.data.run_id;
      
      clearInterval(stepInterval);
      setActiveStepIdx(null);
      
      // Load details of the completed run
      await inspectRun(runId);
      await fetchHistory();
    } catch (err) {
      clearInterval(stepInterval);
      setActiveStepIdx(null);
      alert("Workflow execution failed. Verify uvicorn server connections.");
    } finally {
      setIsTriggering(false);
    }
  };

  // Format Helper to resolve individual step status in visualizer
  const getStepStatus = (agentName: string, index: number) => {
    if (isTriggering) {
      if (activeStepIdx === index) return "Running";
      if (activeStepIdx !== null && index < activeStepIdx) return "Completed";
      return "Pending";
    }
    
    if (selectedRun) {
      const log = selectedRun.task_logs.find((l: any) => l.agent_name === agentName);
      return log ? log.status : "Pending";
    }

    return "Pending";
  };

  const getStepDuration = (agentName: string) => {
    if (selectedRun) {
      const log = selectedRun.task_logs.find((l: any) => l.agent_name === agentName);
      return log ? `${log.execution_time_ms.toFixed(0)}ms` : "";
    }
    return "";
  };

  const getSelectedAgentLog = () => {
    if (selectedRun && selectedAgent) {
      return selectedRun.task_logs.find((l: any) => l.agent_name === selectedAgent);
    }
    return null;
  };

  const activeLog = getSelectedAgentLog();

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Agentic Workflow Monitor
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Monitor and coordinate the 12 AI agents executing inside the Render AI Workflow pipeline.
          </p>
        </div>
        <button
          onClick={handleTriggerWorkflow}
          disabled={isTriggering}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white font-semibold text-xs transition-all disabled:opacity-50"
        >
          <Play size={14} />
          {isTriggering ? "Running workflow..." : "Trigger Ingestion Run"}
        </button>
      </div>

      {/* Grid splits: Map visualizer + Details sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Workflow Flow Grid (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative min-h-[460px] flex flex-col justify-between">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-500 animate-pulse" />
              Workflow Execution Pipeline
            </span>
            {selectedRun && (
              <span className="text-[10px] text-indigo-500 font-mono font-bold">
                Run ID: #{selectedRun.id} ({selectedRun.execution_time_ms.toFixed(0)}ms)
              </span>
            )}
          </div>

          {/* 12 Agents Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-grow">
            {AGENT_NAMES.map((agent, index) => {
              const status = getStepStatus(agent, index);
              const duration = getStepDuration(agent);
              const isCurrent = activeStepIdx === index;

              return (
                <div
                  key={agent}
                  onClick={() => selectedRun && setSelectedAgent(agent)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between relative ${
                    selectedAgent === agent
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                      : "border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight">
                      {agent.replace("Agent", "")}
                    </span>
                    
                    {/* Status Badge */}
                    <div className="shrink-0">
                      {status === "Completed" && <CheckCircle2 size={13} className="text-emerald-500" />}
                      {status === "Running" && <RefreshCw size={13} className="text-yellow-500 animate-spin" />}
                      {status === "Failed" && <AlertTriangle size={13} className="text-red-500" />}
                      {status === "Pending" && <div className="h-2 w-2 rounded-full bg-slate-350 dark:bg-slate-800 mt-1" />}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[9px] font-semibold tracking-wider uppercase">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                      status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : status === "Running"
                        ? "bg-yellow-500/10 text-yellow-500 animate-pulse"
                        : status === "Failed"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-slate-100 dark:bg-slate-850 text-slate-400"
                    }`}>
                      {status}
                    </span>
                    {duration && <span className="text-slate-400 font-mono">{duration}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual link connectors legends */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-4 text-[9px] text-slate-400 select-none">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-slate-350 dark:bg-slate-800" /> Pending</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-yellow-500 animate-pulse" /> Running</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" /> Completed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500" /> Failed</span>
          </div>
        </div>

        {/* Right: Task Details Inspector (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl min-h-[460px] flex flex-col justify-between">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 shrink-0">
            <Terminal size={14} className="text-indigo-500" />
            Agent task inspector
          </h3>

          <div className="flex-grow overflow-y-auto pr-1">
            {activeLog ? (
              <div className="space-y-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 uppercase tracking-widest">
                    {activeLog.agent_name.replace("Agent", "")}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs mt-2">
                    Execution time: <span className="font-mono text-indigo-500">{activeLog.execution_time_ms.toFixed(1)}ms</span>
                  </h4>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs mt-1">
                    Retries required: <span className="font-mono text-slate-400">{activeLog.retries}</span>
                  </h4>
                </div>

                {/* Input Payload */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Input Context</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-850 font-mono text-[9px] text-slate-300 max-h-[140px] overflow-y-auto overflow-x-auto leading-normal">
                    {JSON.stringify(JSON.parse(activeLog.input_data || "{}"), null, 2)}
                  </pre>
                </div>

                {/* Output Payload */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Output Data</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-850 font-mono text-[9px] text-indigo-400 max-h-[140px] overflow-y-auto overflow-x-auto leading-normal">
                    {JSON.stringify(JSON.parse(activeLog.output_data || "{}"), null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12 px-4">
                <HelpCircle size={28} className="text-slate-500/40 mb-3" />
                <p className="text-xs">Select a completed agent node on the grid to inspect its geocoded inputs, outputs payloads, and performance logs.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* History Log table */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-4">
        <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <History size={14} className="text-indigo-500" />
          Workflow Runs Log History
        </h3>

        {runs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">Run ID</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Total Duration</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">#{r.id}</td>
                    <td className="py-3 text-slate-500">{r.trigger_type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        r.status === "Completed"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-500">{r.execution_time_ms.toFixed(0)}ms</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => inspectRun(r.id)}
                        className="text-indigo-500 hover:underline font-bold text-[10px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No workflow history log found. Run a trigger to record executions.</p>
        )}
      </div>
    </div>
  );
};

export default AgentWorkflowView;
