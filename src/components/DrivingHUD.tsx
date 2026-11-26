import React from 'react';
import { Track } from '../types/audio';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Folder,
  ShieldCheck,
  Music,
  Disc,
  Volume1,
  Volume2,
  Shuffle,
  Repeat
} from 'lucide-react';

interface DrivingHUDProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  isOffline: boolean;
  mobileView: 'player' | 'library';
  hasTeslaSession?: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleMobileView: () => void;
  onTeslaVolumeDown?: () => void;
  onTeslaVolumeUp?: () => void;
}

export const DrivingHUD: React.FC<DrivingHUDProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  repeatMode,
  shuffle,
  isOffline,
  mobileView,
  hasTeslaSession,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleRepeat,
  onToggleShuffle,
  onToggleMobileView,
  onTeslaVolumeDown,
  onTeslaVolumeUp
}) => {
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const remainingTime = Math.max(0, (duration || 0) - (currentTime || 0));

  return (
    <footer
      data-player="audiocar-drive-single-footer"
      className="fixed bottom-0 left-0 right-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-3 sm:px-5 pt-2 pb-2.5 shadow-2xl"
    >
      {/* 1. Single Interactive Progress Bar at the Top Edge of the Footer */}
      <div className="max-w-[1600px] mx-auto w-full flex items-center gap-3 mb-2">
        <span className="text-[11px] font-mono text-slate-400 w-10 text-left shrink-0">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={Math.min(currentTime, duration || 100)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Progreso de la pista"
          />
        </div>

        <span className="text-[11px] font-mono text-slate-400 w-11 text-right shrink-0">
          -{formatTime(remainingTime)}
        </span>
      </div>

      {/* 2. Main Controls Row: Artwork + Title/Album Left | Carpetas + Transport Controls Right */}
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Artwork Thumbnail + Full Track Title & Album */}
        <div
          className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 cursor-pointer group"
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
          <div className="min-w-0 flex-1">
            <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">
              {currentTrack?.name || 'Selecciona una pista en Carpetas'}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 truncate">
                {currentTrack?.album || currentTrack?.artist || 'mimusica (Google Drive)'}
              </span>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                  <ShieldCheck className="w-3 h-3" /> OFFLINE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Folder Switcher, Shuffle/Repeat, Volume & Large Touch Transport Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Tesla Fleet Physical Volume Controls (when Tesla session active) */}
          {hasTeslaSession && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                onClick={onTeslaVolumeDown}
                className="min-h-[48px] px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                title="Bajar Volumen Coche (Vol -)"
              >
                <Volume1 className="w-4 h-4 text-blue-400" />
                <span className="hidden md:inline">Vol -</span>
              </button>
              <button
                onClick={onTeslaVolumeUp}
                className="min-h-[48px] px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
                title="Subir Volumen Coche (Vol +)"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Vol +</span>
              </button>
            </div>
          )}

          {/* Shuffle & Repeat quick buttons */}
          <button
            onClick={onToggleShuffle}
            className={`min-h-[48px] min-w-[44px] hidden sm:flex items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 ${
              shuffle
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Modo Aleatorio (Shuffle)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`min-h-[48px] min-w-[44px] hidden md:flex items-center justify-center p-2.5 rounded-xl border relative transition-all active:scale-95 ${
              repeatMode !== 'off'
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Modo Repetición"
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 text-[9px] font-bold text-white rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </button>

          {/* Carpetas Button */}
          <button
            onClick={onToggleMobileView}
            className={`min-h-[48px] px-3 py-2 flex items-center justify-center gap-1.5 rounded-2xl border font-bold text-xs active:scale-95 transition-all ${
              mobileView === 'player'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
            }`}
            title={mobileView === 'player' ? 'Ver Carpetas y Pistas' : 'Ver Reproductor'}
          >
            {mobileView === 'player' ? (
              <>
                <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Carpetas</span>
              </>
            ) : (
              <>
                <Music className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="hidden sm:inline">Reproductor</span>
              </>
            )}
          </button>

          {/* Large Touch Transport Controls: Anterior, Play/Pausa, Siguiente */}
          <button
            onClick={onPrev}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white active:scale-95 transition-all"
            title="Anterior"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={onTogglePlay}
            className="min-h-[52px] min-w-[52px] flex items-center justify-center p-3 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>

          <button
            onClick={onNext}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white active:scale-95 transition-all"
            title="Siguiente"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          {/* Desktop / Park Web Audio Volume Slider */}
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-800">
            <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              aria-label="Volumen"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
