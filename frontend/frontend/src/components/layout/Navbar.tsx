import React from "react";
import { Sun, Moon, Filter, MapPin } from "lucide-react";

import { useTheme } from "@/core/theme";
import SearchBar from "@/components/ui/SearchBar";
import NotificationBell from "@/components/ui/NotificationBell";
import UserMenu from "@/components/ui/UserMenu";

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* Left Side: Breadcrumb & Search */}
        <div className="flex items-center gap-4 flex-1">
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Admin Control</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-slate-800 dark:text-slate-200">Executive Panel</span>
          </div>
          <SearchBar />
        </div>

        {/* Right Side: Global Filters & Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Location Filter */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <MapPin size={12} className="text-indigo-400" />
            <span>All Blocks (Araria)</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
            <Filter size={12} className="text-indigo-400" />
            <span>Filters</span>
          </div>

          {/* Vertical Divider */}
          <span className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:inline"></span>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all focus:outline-none"
            aria-label="Toggle visual theme"
          >
            {theme === "dark" ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>

          {/* Notification Center */}
          <NotificationBell />

          {/* User Menu Trigger */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
