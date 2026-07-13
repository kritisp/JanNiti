import React, { useState, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Network,
  Search,
  Filter,
  Activity,
  Compass,
  FileSpreadsheet,
  Info,
  Sparkles,
} from "lucide-react";
import api from "@/core/api";

// Custom Node Renderer matching Palantir Gotham premium themes
const CustomGraphNode = ({ data }: { data: any }) => {
  const getStyleClasses = (category: string) => {
    switch (category) {
      case "Village":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/35 hover:border-emerald-400 dark:bg-emerald-950/20";
      case "Ward":
      case "District":
      case "State":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/35 hover:border-cyan-400 dark:bg-cyan-950/20";
      case "Complaint":
        return "bg-red-500/10 text-red-500 border-red-500/35 hover:border-red-400 dark:bg-red-950/20";
      case "Citizen":
        return "bg-blue-500/10 text-blue-500 border-blue-500/35 hover:border-blue-400 dark:bg-blue-950/20";
      case "InfrastructureGap":
        return "bg-amber-500/15 text-amber-500 border-amber-500/50 hover:border-amber-400 dark:bg-amber-950/20 shadow-md shadow-amber-500/5 animate-pulse-slow";
      case "MPRecommendation":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/40 hover:border-indigo-300 dark:bg-indigo-950/20 font-extrabold";
      case "GovernmentProject":
        return "bg-pink-500/10 text-pink-500 border-pink-500/35 hover:border-pink-400 dark:bg-pink-950/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-700 hover:border-slate-500";
    }
  };

  const styleClasses = getStyleClasses(data.category);

  return (
    <div className={`px-3 py-2.5 rounded-xl border text-[11px] font-bold text-center tracking-tight transition-all max-w-[140px] backdrop-blur-md ${styleClasses}`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="truncate max-w-[120px]">{data.label}</div>
      <div className="text-[8px] font-mono opacity-50 uppercase tracking-widest mt-1">
        {data.category}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomGraphNode,
};

export const KnowledgeGraphView: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inspector Panels
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [graphStats, setGraphStats] = useState<any | null>(null);

  // Filtering Options
  const [focusFilter, setFocusFilter] = useState<"all" | "infrastructure" | "recommendations">("all");
  const [searchText, setSearchText] = useState("");

  // 1. Fetch Graph structure dynamically from API
  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      let endpoint = "/api/knowledge-graph";
      if (focusFilter === "infrastructure") {
        endpoint = "/api/knowledge-graph/infrastructure";
      } else if (focusFilter === "recommendations") {
        endpoint = "/api/knowledge-graph/recommendations";
      }

      const response = await api.get(endpoint);
      setNodes(response.data.nodes || []);
      setEdges(response.data.edges || []);
      
      // Fetch stats
      const statsRes = await api.get("/api/knowledge-graph/statistics");
      setGraphStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load Knowledge Graph datasets", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [focusFilter]);

  // 2. Filter nodes dynamically on Search
  const handleSearch = () => {
    if (!searchText.trim()) {
      fetchGraphData();
      return;
    }
    
    // Highlight matched nodes
    const lowerSearch = searchText.toLowerCase();
    const updatedNodes = nodes.map((node) => {
      const label = node.data.label.toLowerCase();
      const category = node.data.category.toLowerCase();
      const match = label.includes(lowerSearch) || category.includes(lowerSearch);
      
      return {
        ...node,
        style: match 
          ? { border: "2px solid #6366f1", boxShadow: "0 0 12px rgba(99, 102, 241, 0.4)", scale: "1.05" }
          : { opacity: 0.3 }
      };
    });
    
    setNodes(updatedNodes);
  };

  const clearSearch = () => {
    setSearchText("");
    fetchGraphData();
  };

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      
      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Network size={18} className="text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">KG Analytical Canvas</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Focus filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setFocusFilter("all")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                focusFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Master Canvas
            </button>
            <button
              onClick={() => setFocusFilter("infrastructure")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                focusFilter === "infrastructure"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Gaps
            </button>
            <button
              onClick={() => setFocusFilter("recommendations")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                focusFilter === "recommendations"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              AI Proposals
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter nodes..."
              className="pl-8 pr-12 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full sm:w-48"
            />
            <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
            <button
              onClick={handleSearch}
              className="absolute right-7 top-1.5 text-[9px] font-bold text-indigo-500 uppercase hover:underline"
            >
              Go
            </button>
            {searchText && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas + Inspector Details splits */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* React Flow Workspace Canvas (8 cols equivalent) */}
        <div className="flex-grow rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative min-h-[300px]">
          {isLoading ? (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4">
              <Network size={36} className="text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mapping nodes mesh...</span>
            </div>
          ) : null}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background color="#475569" gap={16} size={1} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-white hover:!bg-slate-800" />
            <MiniMap 
              className="!bg-slate-950/85 !border-slate-800 !rounded-xl"
              nodeColor={(node) => {
                switch (node.data.category) {
                  case "Village": return "#10b981";
                  case "Complaint": return "#ef4444";
                  case "MPRecommendation": return "#6366f1";
                  default: return "#475569";
                }
              }}
              maskColor="rgba(15, 23, 42, 0.6)"
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar Details Inspector Panel (4 cols equivalent) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          {/* Node Inspector Details card */}
          <div className="flex-1 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg flex flex-col min-h-[220px]">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 shrink-0">
              <Compass size={14} className="text-indigo-500" />
              KG Inspector
            </h3>

            <div className="flex-grow overflow-y-auto pr-1">
              {selectedNode ? (
                <div className="space-y-4">
                  {/* Category Badge & Node title */}
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded text-[9px] font-black border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 uppercase tracking-widest">
                      {selectedNode.data.category}
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-base leading-tight mt-1.5">
                      {selectedNode.data.label}
                    </h4>
                  </div>

                  {/* Properties table list */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attributes</span>
                    <div className="space-y-2 text-xs">
                      {Object.entries(selectedNode.data.properties || {}).map(([key, val]: any) => (
                        <div key={key} className="flex justify-between gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                          <span className="text-slate-400 font-mono text-[10px] uppercase">{key}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-right max-w-[120px] truncate" title={String(val)}>
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation linking hints */}
                  {selectedNode.data.category === "InfrastructureGap" && (
                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs leading-normal space-y-1.5">
                      <div className="flex items-center gap-1 font-bold text-indigo-400">
                        <Sparkles size={12} />
                        <span>AI Suggestion Available</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        This gap has triggered an MP recommendation proposal to construct regional assets.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4 py-8">
                  <Network size={28} className="text-slate-500/40 mb-3" />
                  <p className="text-xs">Select a node inside the knowledge canvas to inspect geographic attributes, relationship indices, and AI suggestions.</p>
                </div>
              )}
            </div>
          </div>

          {/* Graph Statistics card */}
          {graphStats && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shrink-0">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-500" />
                Network Statistics
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                  <span className="block text-[18px] font-black text-slate-800 dark:text-white">
                    {Object.values(graphStats.nodes).reduce((a: any, b: any) => a + b, 0) as number}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total Nodes</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50">
                  <span className="block text-[18px] font-black text-slate-800 dark:text-white">
                    {Object.values(graphStats.relationships).reduce((a: any, b: any) => a + b, 0) as number}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total Edges</span>
                </div>
              </div>

              {/* Top anomalies list */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Top Critical Gaps</span>
                <div className="space-y-1.5">
                  {graphStats.top_gaps.slice(0, 2).map((gap: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="truncate">{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default KnowledgeGraphView;
