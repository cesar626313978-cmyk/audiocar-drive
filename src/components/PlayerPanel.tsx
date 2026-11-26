import React from 'react';
import { Track } from '../types/audio';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Volume1, ShieldCheck, Radio, Disc, Folder } from 'lucide-react';

interface PlayerPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  isOffline: boolean;
  hasTeslaSession?: boolean;
  teslaShiftState?: string | null;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onTeslaVolumeDown?: () => void;
  onTeslaVolumeUp?: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onOpenFolders?: () => void;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  repeatMode,
  shuffle,
  isOffline,
  hasTeslaSession,
  teslaShiftState,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onTeslaVolumeDown,
  onTeslaVolumeUp,
  onToggleRepeat,
  onToggleShuffle,
  onOpenFolders
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-between h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-4 sm:p-6 [@media(max-height:750px)]:p-3.5 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Header info */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 [@media(max-height:750px)]:mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tesla Audio Stream</span>
          {hasTeslaSession && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Fleet API {teslaShiftState ? `· [${teslaShiftState}]` : 'Activa'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenFolders && (
            <button
              onClick={onOpenFolders}
              className="min-[1100px]:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Abrir Carpetas</span>
            </button>
          )}
          {isOffline ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">OFFLINE READY</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">CLOUD STREAM</span>
            </span>
          )}
        </div>
      </div>

      {/* Artwork / Vinyl Disc view (Compacted to <= 180x180px on screens < 750px height) */}
      <div className="relative my-auto flex flex-col items-center">
        <div
          className={`relative w-52 h-52 sm:w-64 sm:h-64 xl:w-72 xl:h-72 [@media(max-height:750px)]:w-[168px] [@media(max-height:750px)]:h-[168px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 flex items-center justify-center group ${
            isPlaying ? 'animate-float' : ''
          }`}
        >
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop"
            alt="Album Artwork"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-4 sm:p-5 [@media(max-height:750px)]:p-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 [@media(max-height:750px)]:w-7 [@media(max-height:750px)]:h-7 rounded-full bg-blue-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-lg shrink-0 ${
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

        {/* Visualizer bars */}
        <div className="flex items-center justify-center gap-1 h-7 [@media(max-height:750px)]:h-4 mt-4 [@media(max-height:750px)]:mt-2">
          {[...Array(24)].map((_, i) => (
            <span
              key={i}
              className={`w-1 bg-blue-500 rounded-full transition-all duration-150 ${
                isPlaying ? 'animate-pulse' : 'h-1 opacity-40'
              }`}
              style={{
                height: isPlaying ? `${Math.max(8, Math.sin(i + Date.now() / 200) * 20)}px` : '4px',
                animationDelay: `${i * 50}ms`
              }}
            ></span>
          ))}
        </div>
      </div>

      {/* Progress Bar & Timestamps */}
      <div className="w-full space-y-1.5 mt-3 [@media(max-height:750px)]:mt-1.5">
        <div className="relative group cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-between text-xs font-mono tabular-nums text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(duration - currentTime)}</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mt-4 [@media(max-height:750px)]:mt-2 px-1 sm:px-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleShuffle}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 sm:p-3 rounded-xl transition-colors ${
              shuffle ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Modo Aleatorio (Shuffle)"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleRepeat}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 sm:p-3 rounded-xl transition-colors ${
              repeatMode !== 'off' ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={`Repetir: ${repeatMode}`}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onPrev}
            className="min-h-[52px] min-w-[52px] flex items-center justify-center p-3.5 [@media(max-height:750px)]:p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white shadow-md active:scale-95 transition-all"
            title="Anterior"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={onTogglePlay}
            className="min-h-[60px] min-w-[60px] flex items-center justify-center p-4 [@media(max-height:750px)]:p-3.5 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            className="min-h-[52px] min-w-[52px] flex items-center justify-center p-3.5 [@media(max-height:750px)]:p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white shadow-md active:scale-95 transition-all"
            title="Siguiente"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Physical Tesla Car Volume Controls when audiocar_tesla_session exists */}
          {hasTeslaSession && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                onClick={onTeslaVolumeDown}
                className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                title="Bajar Volumen Físico del Coche (Tesla Fleet API)"
              >
                <Volume1 className="w-4 h-4 text-blue-400" />
                <span>Vol -</span>
              </button>
              <button
                onClick={onTeslaVolumeUp}
                className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                title="Subir Volumen Físico del Coche (Tesla Fleet API)"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Vol +</span>
              </button>
            </div>
          )}

          <Volume2 className="w-5 h-5 text-slate-400 shrink-0 hidden sm:inline" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-16 sm:w-20 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            title="Volumen Web Audio"
          />
        </div>
      </div>
    </div>
  );
};
