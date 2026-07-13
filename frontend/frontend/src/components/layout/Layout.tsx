import React from "react";
import { Link, Outlet } from "react-router-dom";

export const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header Navigation with glassmorphism */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-white hover:opacity-90 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-sm">
                JV
              </div>
              <span className="font-semibold text-slate-100">
                JanVikas <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-medium">AI</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 py-1 px-3 text-xs text-slate-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gov-Cloud Secure
            </div>
            <span className="text-xs text-slate-600 font-mono">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Primary Dashboard Container */}
      <main className="flex-grow flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>

      {/* Administrative Footer */}
      <footer className="w-full border-t border-slate-950/20 bg-slate-950/50 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} JanVikas AI Decision Platform. India.</p>
          <div className="flex gap-6 font-medium">
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Security Protocol</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Metadata Schema</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
