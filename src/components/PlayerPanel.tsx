import React from 'react';
import { Track } from '../types/audio';
import { ShieldCheck, Radio, Disc, Folder, Play, Clock } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface PlayerPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isOffline: boolean;
  hasTeslaSession?: boolean;
  teslaShiftState?: string | null;
  showResumeOverlay?: boolean;
  resumeTime?: number;
  onResumeNow?: () => void;
  onOpenFolders?: () => void;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  currentTrack,
  isPlaying,
  isOffline,
  hasTeslaSession,
  teslaShiftState,
  showResumeOverlay,
  resumeTime = 0,
  onResumeNow,
  onOpenFolders
}) => {
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col items-center justify-between h-full bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-4 sm:p-6 [@media(max-height:750px)]:p-3.5 shadow-sm dark:shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/5 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Header info */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] dark:bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider">Tesla Audio Stream</span>
          </div>
          {hasTeslaSession && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
              Fleet API {teslaShiftState ? `· [${teslaShiftState}]` : 'Activa'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenFolders && (
            <button
              onClick={onOpenFolders}
              className="min-[1100px]:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border-amber-500/30 dark:text-amber-300 text-xs font-bold transition-colors"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Abrir Carpetas</span>
            </button>
          )}
          {isOffline ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">OFFLINE READY</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DBEAFE] border border-[#93C5FD] text-[#1D4ED8] dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 text-xs font-bold">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">CLOUD STREAM</span>
            </span>
          )}
        </div>
      </div>

      {/* Center Stage: Large Artwork & 56-Bar High-Definition Canvas AudioVisualizer */}
      <div className="relative my-auto flex flex-col items-center justify-center w-full z-10">
        <div
          className={`relative w-56 h-56 sm:w-64 sm:h-64 xl:w-72 xl:h-72 [@media(max-height:750px)]:w-[172px] [@media(max-height:750px)]:h-[172px] rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl border border-[#CBD5E1] dark:border-slate-700/60 bg-slate-950 flex items-center justify-center group ${
            isPlaying ? 'animate-float' : ''
          }`}
        >
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop"
            alt="Album Artwork"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-transparent flex flex-col justify-end p-4 sm:p-5 [@media(max-height:750px)]:p-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 [@media(max-height:750px)]:w-7 [@media(max-height:750px)]:h-7 rounded-full bg-blue-600/95 backdrop-blur-md flex items-center justify-center text-white shadow-lg shrink-0 ${
                  isPlaying ? 'animate-spin-slow' : ''
                }`}
              >
                <Disc className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg [@media(max-height:750px)]:text-sm font-bold text-white truncate">
                  {currentTrack?.name || 'Selecciona una pista'}
                </h2>
                <p className="text-xs [@media(max-height:750px)]:text-[11px] text-blue-300 truncate">
                  {currentTrack?.album || currentTrack?.artist || 'mimusica / Google Drive'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* High-Definition 56-Bar Symmetric Canvas Visualizer */}
        <AudioVisualizer isPlaying={isPlaying} />

        {/* Large Autoplay-Blocked Session Resume Overlay Card */}
        {showResumeOverlay && currentTrack && (
          <div
            onClick={onResumeNow}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md rounded-2xl cursor-pointer animate-fade-in"
          >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-[#93C5FD] dark:border-blue-500/60 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3.5 w-full text-left">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop"
                    alt="Carátula"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 mb-1">
                    <Clock className="w-3 h-3" />
                    Sesión guardada · {formatTime(resumeTime)}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white truncate">
                    {currentTrack.name}
                  </h3>
                  <p className="text-xs font-medium text-[#475569] dark:text-slate-400 truncate">
                    {currentTrack.album || currentTrack.artist || 'mimusica'}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onResumeNow) onResumeNow();
                }}
                className="w-full min-h-[54px] py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>Reanudar ahora ({formatTime(resumeTime)})</span>
              </button>
              <p className="text-[11px] font-medium text-[#475569] dark:text-slate-400">
                O toca en cualquier punto libre de la pantalla para continuar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Subtle bottom status line inside the stage card */}
      <div className="w-full text-center text-[11px] font-medium text-[#475569] dark:text-slate-500 pt-2 relative z-10">
        Usa la barra inferior fija o los mandos del volante del Tesla para controlar la reproducción
      </div>
    </div>
  );
};
