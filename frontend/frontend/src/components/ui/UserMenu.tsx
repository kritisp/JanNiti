import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Shield, ChevronDown } from "lucide-react";

export const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all focus:outline-none"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs select-none">
          MP
        </div>
        <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-200">
          Hon. Rajesh Kumar
        </span>
        <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden"
          >
            {/* User Meta */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <p className="text-xs font-semibold text-slate-800 dark:text-white">Hon. Rajesh Kumar</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Member of Parliament (Lok Sabha)</p>
              <div className="mt-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700 w-fit text-[9px] font-mono text-slate-500 dark:text-slate-400">
                <Shield size={10} className="text-indigo-400" />
                Araria Constituency
              </div>
            </div>

            {/* Menu Links */}
            <div className="p-1.5 space-y-0.5">
              <button className="flex items-center gap-2.5 w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 transition-colors">
                <User size={14} className="text-slate-400" />
                Constituency Profile
              </button>
              <button className="flex items-center gap-2.5 w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 transition-colors">
                <Shield size={14} className="text-slate-400" />
                Security Protocols
              </button>
            </div>

            {/* Logout section */}
            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
              <button className="flex items-center gap-2.5 w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-xs text-red-600 dark:text-red-400 transition-colors">
                <LogOut size={14} />
                Disconnect Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
