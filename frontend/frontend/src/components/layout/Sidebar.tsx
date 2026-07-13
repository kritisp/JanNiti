import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Map,
  Network,
  Lightbulb,
  Sparkles,
  Wallet,
  Briefcase,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenCopilot: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  onOpenCopilot,
}) => {
  const location = useLocation();

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Citizen Requests", icon: MessageSquare, path: "/requests" },
    { label: "Development Map", icon: Map, path: "/map" },
    { label: "Knowledge Graph", icon: Network, path: "/graph" },
    { label: "Priority Suggestions", icon: Lightbulb, path: "/recommendations" },
    { label: "AI Copilot", icon: Sparkles, path: "/copilot", action: onOpenCopilot },
    { label: "Budget Planner", icon: Wallet, path: "/budget" },
    { label: "Projects Tracker", icon: Briefcase, path: "/projects" },
    { label: "Reports", icon: FileText, path: "/reports" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="sticky top-0 left-0 h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl z-40 overflow-hidden"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-4 justify-between border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-3 overflow-hidden select-none">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20 text-white font-black text-sm">
            JV
          </div>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-slate-900 dark:text-white text-lg tracking-tight whitespace-nowrap"
              >
                JanVikas <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent font-medium">AI</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-none">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          const buttonContent = (
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                }`}
              >
                <Icon size={18} />
              </div>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          );

          const itemClass = `group flex items-center justify-between w-full p-1.5 rounded-xl transition-all relative ${
            isActive
              ? "bg-slate-100 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 border border-slate-200/50 dark:border-slate-700/60"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200"
          }`;

          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className={itemClass}
              >
                {buttonContent}
                {item.label === "AI Copilot" && !isCollapsed && (
                  <div className="mr-2 flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              className={itemClass}
            >
              {buttonContent}
            </Link>
          );
        })}
      </nav>

      {/* Footer System Toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
