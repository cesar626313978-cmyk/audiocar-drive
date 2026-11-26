import React, { useState, useRef, useEffect } from 'react';
import { Disc3, Sliders, Folder, LogOut, Sun, Moon, ShieldCheck, Wifi, Home, RefreshCw, Music, User } from 'lucide-react';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close profile popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  return (
    <header className="w-full max-w-full px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="w-full max-w-full flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
        {/* a) Left Block: Logo/Title + Compact Tesla OS badge + truncated folder name */}
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Disc3 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span className="truncate">AudioCar Drive</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                Tesla OS
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{folderName}</span>
            </p>
          </div>
        </div>

        {/* b) Center Block: Orange "Carpetas / Pistas" button & "Inicio / Hub" button (uniform 44px height, px-4) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onToggleMobileView}
            className={`min-[1100px]:hidden h-[44px] px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all border whitespace-nowrap ${
              mobileView === 'player'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-blue-600/25'
            }`}
          >
            {mobileView === 'player' ? (
              <>
                <Folder className="w-4 h-4 fill-slate-950/20 shrink-0" />
                <span>Carpetas / Pistas</span>
              </>
            ) : (
              <>
                <Music className="w-4 h-4 shrink-0" />
                <span>Ver Reproductor</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="h-[44px] px-4 flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-800 whitespace-nowrap"
            title="Volver al Launcher / Hub"
          >
            <Home className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Inicio / Hub</span>
          </button>

          {/* Optional extra cache info only on wide desktop viewports (>= 1280px) */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 ml-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cache: <strong className="font-semibold">{cacheSize} MB</strong></span>
            </div>
          </div>
        </div>

        {/* c) Right Block: Equalizer (40x40px), Theme (40x40px), and Circular Avatar (38x38px) with Popover */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pr-0.5">
          <button
            onClick={onOpenSettings}
            className="w-[40px] h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
            title="Ecualizador y Ajustes de Audio"
          >
            <Sliders className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleTheme}
            className="w-[40px] h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
            title="Cambiar Tema (Día / Noche)"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="relative w-[38px] h-[38px] rounded-full focus:outline-none ring-2 ring-slate-700/80 hover:ring-blue-500 transition-all flex items-center justify-center bg-slate-800 text-slate-200"
                title={userEmail ? `Conectado: ${userEmail}` : 'Cuenta de Google Drive'}
              >
                {userPicture ? (
                  <img
                    src={userPicture}
                    alt="Perfil"
                    referrerPolicy="no-referrer"
                    className="w-[38px] h-[38px] rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-slate-300" />
                )}
                {/* Green online status badge on bottom-right corner of avatar */}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950"></span>
              </button>

              {/* Floating Popover Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3.5 z-50 text-slate-100 animate-fade-in">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <div className="relative w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      {userPicture ? (
                        <img
                          src={userPicture}
                          alt="Perfil"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-slate-300" />
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                        Sesión Conectada
                      </p>
                      <p className="text-xs font-medium text-slate-200 truncate" title={userEmail || ''}>
                        {userEmail || 'Google Drive'}
                      </p>
                    </div>
                  </div>

                  <div className="py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      Scope: drive.readonly
                    </span>
                    <span className="font-mono text-slate-300">{cacheSize} MB</span>
                  </div>

                  <div className="pt-2.5 space-y-1.5">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onChangeAccount();
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                      <span>Cambiar cuenta de Google</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/15 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Desconectar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="h-[40px] px-3.5 flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition-colors whitespace-nowrap"
            >
              <span>Conectar Drive</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
