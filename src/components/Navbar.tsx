import React from 'react';
import { Disc3, Sliders, Folder, LogOut, Sun, Moon, ShieldCheck, Wifi, Home, RefreshCw, Music } from 'lucide-react';

interface NavbarProps {
  isAuthenticated: boolean;
  folderName: string;
  theme: 'dark' | 'light';
  userEmail: string | null;
  userPicture: string | null;
  mobileView: 'player' | 'library';
  onToggleMobileView: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onChangeAccount: () => void;
  onLogout: () => void;
  cacheSize: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated,
  folderName,
  theme,
  userEmail,
  userPicture,
  mobileView,
  onToggleMobileView,
  onToggleTheme,
  onOpenSettings,
  onOpenLogin,
  onChangeAccount,
  onLogout,
  cacheSize
}) => {
  return (
    <header className="flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Wordmark + Prominent View Switcher for < 1100px (Tesla Split-Screen) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Disc3 className="w-6 h-6 animate-spin-slow" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            AudioCar Drive
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Tesla OS
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" />
            <span>{folderName}</span>
          </p>
        </div>

        {/* Prominent View Switcher Button for < 1100px (Tesla Drive Split-Screen) */}
        <button
          onClick={onToggleMobileView}
          className={`min-[1100px]:hidden min-h-[48px] px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-lg active:scale-95 transition-all border ${
            mobileView === 'player'
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/20'
              : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-600/25'
          }`}
        >
          {mobileView === 'player' ? (
            <>
              <Folder className="w-5 h-5 fill-slate-950/20 shrink-0" />
              <span>📁 Carpetas / Pistas</span>
            </>
          ) : (
            <>
              <Music className="w-5 h-5 shrink-0" />
              <span>🎵 Ver Reproductor</span>
            </>
          )}
        </button>
      </div>

      {/* Zone 2: Status & Cache */}
      <div className="hidden xl:flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cache: <strong className="font-semibold">{cacheSize} MB</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Scope: drive.readonly · mimusica</span>
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="min-h-[42px] flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-800"
          title="Volver al Launcher / Hub"
        >
          <Home className="w-4 h-4 text-blue-500" />
          <span className="hidden md:inline">Inicio / Hub</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="min-h-[42px] min-w-[42px] flex items-center justify-center p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          title="Audio Settings"
        >
          <Sliders className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleTheme}
          className="min-h-[42px] min-w-[42px] flex items-center justify-center p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            {/* Green status pill with connected email */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              {userPicture && <img src={userPicture} alt="Avatar" className="w-4 h-4 rounded-full shrink-0" />}
              <span className="truncate max-w-[140px]">{userEmail || 'Google Drive'}</span>
            </div>

            <button
              onClick={onChangeAccount}
              className="min-h-[42px] flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              title="Cambiar de cuenta de Google"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Cambiar cuenta</span>
            </button>

            <button
              onClick={onLogout}
              className="min-h-[42px] flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Desconectar</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="min-h-[42px] flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition-colors"
          >
            Conectar Google Drive
          </button>
        )}
      </div>
    </header>
  );
};
