import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sparkles, MessageSquare } from "lucide-react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CopilotPanel from "@/components/copilot/CopilotPanel";

export const AppLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const toggleCopilot = () => {
    setIsCopilotOpen((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans">
      
      {/* Side Navigation */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Primary Layout Body */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Dynamic Inner Layout Frame */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 relative">
          <Outlet context={{ toggleCopilot }} />
        </main>
      </div>

      {/* Floating AI Copilot Toggle Button */}
      <button
        onClick={toggleCopilot}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all animate-bounce focus:outline-none"
        aria-label="Open AI Copilot"
      >
        <Sparkles size={20} />
      </button>

      {/* Sliding AI Copilot Chat Drawer */}
      <CopilotPanel isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </div>
  );
};

export default AppLayout;
