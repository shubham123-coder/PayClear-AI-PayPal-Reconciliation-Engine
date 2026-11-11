// frontend/src/components/Navbar.jsx
import React from 'react';
import BrandLogo from './BrandLogo';

export default function Navbar({ user, darkMode, setDarkMode, onLogout }) {
  // Generate user initials for avatar
  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#070D18]/85 backdrop-blur-xl sticky top-0 z-30 transition-colors duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              PayClear
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-mono font-medium border border-slate-200/60 dark:border-slate-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Ledger</span>
            </span>
          </div>
        </div>

        {/* User context & theme controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-200 text-sm active:scale-95 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* User profile capsule */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 dark:from-indigo-500/30 dark:to-violet-500/30 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
              {initials}
            </div>
            <div className="text-right leading-tight">
              <div className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                {user.businessName || user.email}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800/60 active:scale-95 transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
