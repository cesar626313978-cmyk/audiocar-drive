import React from 'react';
import { Track } from '../types/audio';
import { Play, Pause, SkipBack, SkipForward, Folder, ShieldCheck, Music, Disc, Volume1, Volume2 } from 'lucide-react';

interface DrivingHUDProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isOffline: boolean;
  mobileView: 'player' | 'library';
  hasTeslaSession?: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleMobileView: () => void;
  onTeslaVolumeDown?: () => void;
  onTeslaVolumeUp?: () => void;
}

export const DrivingHUD: React.FC<DrivingHUDProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isOffline,
  mobileView,
  hasTeslaSession,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleMobileView,
  onTeslaVolumeDown,
  onTeslaVolumeUp
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-[1100px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-3 sm:px-4 py-2.5 shadow-2xl">
      {/* Progress bar top strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Track Info with Artwork thumbnail */}
        <div
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer group"
          onClick={onToggleMobileView}
          title={mobileView === 'player' ? 'Abrir Carpetas / Pistas' : 'Ver Reproductor Principal'}
        >
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0">
            <img
              src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop"
              alt="Carátula"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Disc className={`w-5 h-5 text-white ${isPlaying ? 'animate-spin-slow' : ''}`} />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
              {currentTrack?.name || 'Toca para elegir canción'}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 truncate">
                {currentTrack?.album || currentTrack?.artist || 'mimusica'}
              </span>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                  <ShieldCheck className="w-3 h-3" /> OFFLINE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right Touch Controls (Ergonomic driving buttons) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {hasTeslaSession && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                onClick={onTeslaVolumeDown}
                className="min-h-[48px] px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                title="Bajar Volumen Coche (Vol -)"
              >
                <Volume1 className="w-4 h-4 text-blue-400" />
                <span>Vol -</span>
              </button>
              <button
                onClick={onTeslaVolumeUp}
                className="min-h-[48px] px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                title="Subir Volumen Coche (Vol +)"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Vol +</span>
              </button>
            </div>
          )}

          <button
            onClick={onToggleMobileView}
            className={`min-h-[48px] px-3 py-2 flex items-center justify-center gap-1.5 rounded-2xl border font-bold text-xs active:scale-95 transition-all ${
              mobileView === 'player'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-blue-600/20 border-blue-500/40 text-blue-300'
            }`}
            title={mobileView === 'player' ? 'Ver Carpetas y Pistas' : 'Ver Reproductor'}
          >
            {mobileView === 'player' ? (
              <>
                <Folder className="w-5 h-5 text-amber-400" />
                <span className="hidden sm:inline">Carpetas</span>
              </>
            ) : (
              <>
                <Music className="w-5 h-5 text-blue-400" />
                <span className="hidden sm:inline">Reproductor</span>
              </>
            )}
          </button>

          <button
            onClick={onPrev}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white active:scale-95 transition-all"
            title="Anterior"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={onTogglePlay}
            className="min-h-[52px] min-w-[52px] flex items-center justify-center p-3 rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white active:scale-95 transition-all"
            title="Siguiente"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
