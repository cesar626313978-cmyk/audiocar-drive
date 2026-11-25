import React from 'react';
import { Disc3, Sliders, Folder, LogOut, Sun, Moon, ShieldCheck, Wifi } from 'lucide-react';

interface NavbarProps {
  isAuthenticated: boolean;
  folderName: string;
  isDemoMode: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  cacheSize: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated,
  folderName,
  isDemoMode,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenLogin,
  onLogout,
  cacheSize
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Disc3 className="w-6 h-6 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            AudioCar Drive
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {isDemoMode ? 'Demo Library' : 'Tesla OS'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" />
            <span>{folderName}</span>
          </p>
        </div>
      </div>

      {/* Zone 2: Status & Cache */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span>Anti-Tunnel Cache: <strong className="font-semibold">{cacheSize} MB</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Scope: drive.file</span>
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          title="Audio Settings"
        >
          <Sliders className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {isAuthenticated || isDemoMode ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition-colors"
          >
            Connect Drive / QR
          </button>
        )}
      </div>
    </header>
  );
};
