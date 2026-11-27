import React, { useState, useRef, useEffect } from 'react';
import { Disc3, Sliders, Folder, LogOut, Sun, Moon, ShieldCheck, Radio, Home, RefreshCw, Music, User } from 'lucide-react';

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
    <header className="w-full max-w-full px-4 sm:px-6 py-2.5 border-b border-[#E2E8F0] dark:border-[#2A2D34] bg-white dark:bg-[#1C1E22] sticky top-0 z-30 transition-colors">
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
        {/* 1. Left: Rounded Blue Logo + AudioCar Drive title & discreet folder subtitle */}
        <div className="flex items-center gap-3 min-w-0 shrink">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white shadow-sm shadow-[#3B82F6]/30 shrink-0">
            <Disc3 className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] truncate">
                AudioCar Drive
              </h1>
            </div>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] flex items-center gap-1 truncate">
              <Folder className="w-3 h-3 shrink-0 text-[#3B82F6] dark:text-[#4DA8FF]" />
              <span className="truncate">{folderName}</span>
            </p>
          </div>
        </div>

        {/* 2. Center: [Inicio / Hub] button + status pill (Cache: XX MB / TESLA STREAM) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="h-[40px] px-3.5 sm:px-4 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#16181C] hover:bg-[#EFF6FF] dark:hover:bg-[#22252B] rounded-xl transition-colors border border-[#E2E8F0] hover:border-[#93C5FD] dark:border-[#2A2D34] whitespace-nowrap"
            title="Volver al Launcher / Hub"
          >
            <Home className="w-4 h-4 text-[#3B82F6] dark:text-[#4DA8FF] shrink-0" />
            <span>Inicio / Hub</span>
          </button>

          <div className="hidden md:flex items-center gap-2 h-[40px] px-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] text-xs font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">TESLA STREAM</span>
            <span aria-hidden="true" className="opacity-40">·</span>
            <Radio className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF] shrink-0" />
            <span>Cache: <strong className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{cacheSize} MB</strong></span>
          </div>
        </div>

        {/* 3. Right: [Ecualizador 3B] + [Modo Día / Modo Noche] + [Carpetas / Reproductor] (narrow view) + Google Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={onOpenSettings}
            className="h-[40px] px-3 sm:px-3.5 flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#16181C] hover:bg-[#EFF6FF] dark:hover:bg-[#22252B] border border-[#E2E8F0] hover:border-[#93C5FD] dark:border-[#2A2D34] transition-colors whitespace-nowrap"
            title="Ecualizador 3 Bandas y Ajustes"
          >
            <Sliders className="w-4 h-4 text-[#3B82F6] dark:text-[#4DA8FF] shrink-0" />
            <span className="hidden sm:inline">Ecualizador 3B</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="h-[40px] px-3 sm:px-3.5 flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#16181C] hover:bg-[#EFF6FF] dark:hover:bg-[#22252B] border border-[#E2E8F0] hover:border-[#93C5FD] dark:border-[#2A2D34] transition-colors whitespace-nowrap"
            title="Cambiar entre Modo Día y Modo Noche"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Modo Día</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#475569] shrink-0" />
                <span className="hidden sm:inline">Modo Noche</span>
              </>
            )}
          </button>

          {/* Prominent responsive view switcher on split-screen (< 1024px) */}
          <button
            onClick={onToggleMobileView}
            className="lg:hidden h-[42px] px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all border whitespace-nowrap bg-[#3B82F6] hover:bg-blue-500 text-white border-[#3B82F6] shadow-md shadow-[#3B82F6]/25 active:scale-95"
            title={mobileView === 'player' ? 'Ver Lista de Carpetas y Canciones' : 'Ver Reproductor'}
          >
            {mobileView === 'player' ? (
              <span>☰ Carpetas / Pistas</span>
            ) : (
              <span>▶ Reproductor</span>
            )}
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="relative w-[38px] h-[38px] rounded-full focus:outline-none ring-2 ring-[#E2E8F0] dark:ring-[#2A2D34] hover:ring-[#3B82F6] dark:hover:ring-[#4DA8FF] transition-all flex items-center justify-center bg-[#F8FAFC] dark:bg-[#16181C] text-[#0F172A] dark:text-[#F8FAFC]"
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
                  <User className="w-5 h-5 text-[#475569] dark:text-[#94A3B8]" />
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1C1E22]"></span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-white dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] shadow-xl dark:shadow-2xl p-3.5 z-50 text-[#0F172A] dark:text-[#F8FAFC] animate-fade-in">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0] dark:border-[#2A2D34]">
                    <div className="relative w-10 h-10 rounded-full bg-[#F8FAFC] dark:bg-[#16181C] flex items-center justify-center shrink-0">
                      {userPicture ? (
                        <img
                          src={userPicture}
                          alt="Perfil"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[#475569] dark:text-[#94A3B8]" />
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1C1E22]"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-emerald-400">
                        Sesión Conectada
                      </p>
                      <p className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate" title={userEmail || ''}>
                        {userEmail || 'Google Drive'}
                      </p>
                    </div>
                  </div>

                  <div className="py-2.5 border-b border-[#E2E8F0] dark:border-[#2A2D34] flex items-center justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF]" />
                      Scope: drive.readonly
                    </span>
                    <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{cacheSize} MB</span>
                  </div>

                  <div className="pt-2.5 space-y-1.5">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onChangeAccount();
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#EFF6FF] dark:hover:bg-[#16181C] rounded-xl transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-[#3B82F6] dark:text-[#4DA8FF]" />
                      <span>Cambiar cuenta de Google</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-xl transition-colors"
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
              className="h-[40px] px-3.5 flex items-center gap-1.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-blue-500 rounded-xl shadow-sm transition-colors whitespace-nowrap"
            >
              <span>Conectar Drive</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
