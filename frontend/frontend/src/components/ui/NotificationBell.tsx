import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageSquare, AlertCircle, Sparkles, Check } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "info" | "warning" | "ai" | "feedback";
  read: boolean;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "New AI Recommendation",
      description: "Optimized water pipeline placement suggested for Bihar North constituency.",
      time: "5m ago",
      type: "ai",
      read: false,
    },
    {
      id: "2",
      title: "Spike in Citizen Demands",
      description: "High demand road repair requests in village Aurangpur (24 entries).",
      time: "1h ago",
      type: "feedback",
      read: false,
    },
    {
      id: "3",
      title: "Budget Gap Threshold",
      description: "Sub-division clinic construction exceeds remaining seasonal buffer by 4.2%.",
      time: "3h ago",
      type: "warning",
      read: true,
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "ai":
        return <Sparkles size={14} className="text-indigo-400" />;
      case "warning":
        return <AlertCircle size={14} className="text-amber-400" />;
      case "feedback":
        return <MessageSquare size={14} className="text-emerald-400" />;
      default:
        return <Check size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden"
          >
            {/* Dropdown Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No new notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 flex gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                      !n.read ? "bg-indigo-50/20 dark:bg-indigo-500/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${
                          !n.read ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        {n.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
