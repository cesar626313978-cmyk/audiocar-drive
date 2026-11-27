import React from 'react';
import { Track } from '../types/audio';
import {
  ShieldCheck,
  Radio,
  Disc,
  Folder,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume1,
  Volume2,
  VolumeX,
  Clock
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface PlayerPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  isOffline: boolean;
  eqBands: { bass: number; mid: number; treble: number };
  hasTeslaSession?: boolean;
  teslaShiftState?: string | null;
  showResumeOverlay?: boolean;
  resumeTime?: number;
  onResumeNow?: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onTeslaVolumeDown?: () => void;
  onTeslaVolumeUp?: () => void;
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
  eqBands,
  hasTeslaSession,
  teslaShiftState,
  showResumeOverlay,
  resumeTime = 0,
  onResumeNow,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleRepeat,
  onToggleShuffle,
  onTeslaVolumeDown,
  onTeslaVolumeUp,
  onOpenFolders
}) => {
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatEqVal = (val: number) => (val >= 0 ? `+${val}` : `${val}`);
  const remainingTime = Math.max(0, (duration || 0) - (currentTime || 0));
  const volumePercent = Math.round((volume || 0) * 100);

  return (
    <div className="flex flex-col justify-between h-full bg-white dark:bg-[#1C1E22] rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D34] p-3.5 sm:p-4 lg:p-6 [@media(max-height:750px)]:p-3.5 shadow-sm dark:shadow-none relative overflow-hidden transition-colors">
      {/* 1. ZONA SUPERIOR DERECHA: Carátula cuadrada redondeada (96x96px) a la izquierda + Metadatos, Título grande y Carpeta/Artista */}
      <div className="w-full flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
          {/* 96x96px Rounded Square Artwork */}
          <div className="relative w-20 h-20 lg:w-24 lg:h-24 [@media(max-height:750px)]:w-20 [@media(max-height:750px)]:h-20 rounded-2xl overflow-hidden bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] shadow-md shrink-0 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop"
              alt="Carátula"
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />
            <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#3B82F6]/90 backdrop-blur-xs flex items-center justify-center text-white shadow-sm">
              <Disc className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin-slow' : ''}`} />
            </div>
          </div>

          {/* Left-Aligned Metadata + Large Bold Track Title + Folder/Artist */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-emerald-400 animate-pulse"></span>
                TESLA AUDIO STREAM
              </span>

              <span aria-hidden="true" className="text-[#475569] dark:text-[#94A3B8] text-xs font-bold">
                ·
              </span>

              {isOffline ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  OFFLINE READY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD] dark:bg-[#3B82F6]/15 dark:text-[#4DA8FF] dark:border-[#3B82F6]/30">
                  <Radio className="w-3.5 h-3.5" />
                  CLOUD STREAM
                </span>
              )}

              {hasTeslaSession && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] dark:bg-[#16181C] dark:text-[#4DA8FF] dark:border-[#2A2D34]">
                  Fleet API {teslaShiftState ? `[${teslaShiftState}]` : ''}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl lg:text-2xl [@media(max-height:750px)]:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate leading-tight">
              {currentTrack?.name || 'Selecciona una pista'}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#475569] dark:text-[#94A3B8] truncate mt-0.5">
              {currentTrack?.album || currentTrack?.artist || 'mimusica · Google Drive'}
            </p>
          </div>
        </div>

        {onOpenFolders && (
          <button
            onClick={onOpenFolders}
            className="lg:hidden h-[42px] px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-sm shadow-[#3B82F6]/25 flex items-center gap-1.5 shrink-0 transition-all"
            title="Ver lista de carpetas y canciones"
          >
            <Folder className="w-4 h-4" />
            <span>☰ Carpetas</span>
          </button>
        )}
      </div>

      {/* 2. ZONA CENTRAL DERECHA: Visualizador Bicolor + Encabezado Espectro/EQ + Barra de Progreso Interactiva */}
      <div className="w-full my-auto py-1.5 lg:py-3 [@media(max-height:750px)]:py-1.5 space-y-2.5 lg:space-y-3.5 [@media(max-height:750px)]:space-y-2 relative">
        {/* Spectrum Box */}
        <div className="w-full bg-[#F8FAFC] dark:bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-2xl p-2.5 sm:p-3 lg:p-4 [@media(max-height:750px)]:p-2.5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">
              Espectro de Onda en Tiempo Real
            </span>
            <span className="font-mono font-semibold text-[#3B82F6] dark:text-[#4DA8FF]">
              EQ: {formatEqVal(eqBands.bass)} / {formatEqVal(eqBands.mid)} / {formatEqVal(eqBands.treble)} dB
            </span>
          </div>

          <AudioVisualizer isPlaying={isPlaying} />
        </div>

        {/* Interactive Progress Bar directly below visualizer */}
        <div className="w-full flex items-center gap-3 px-1">
          <span className="text-xs font-mono font-semibold text-[#475569] dark:text-[#94A3B8] w-11 text-left shrink-0">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={Math.min(currentTime, duration || 100)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] dark:bg-[#16181C] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
              aria-label="Progreso de la pista"
            />
          </div>

          <span className="text-xs font-mono font-semibold text-[#475569] dark:text-[#94A3B8] w-12 text-right shrink-0">
            -{formatTime(remainingTime)}
          </span>
        </div>

        {/* Autoplay-Blocked Session Resume Overlay Card */}
        {showResumeOverlay && currentTrack && (
          <div
            onClick={onResumeNow}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-white/95 dark:bg-[#1C1E22]/95 backdrop-blur-md rounded-2xl cursor-pointer animate-fade-in"
          >
            <div className="w-full max-w-md bg-white dark:bg-[#16181C] border-2 border-[#93C5FD] dark:border-[#3B82F6] rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3.5 w-full text-left">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop"
                    alt="Carátula"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8] dark:bg-[#3B82F6]/20 dark:text-[#4DA8FF] mb-1">
                    <Clock className="w-3 h-3" />
                    Sesión guardada · {formatTime(resumeTime)}
                  </span>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                    {currentTrack.name}
                  </h3>
                  <p className="text-xs font-medium text-[#475569] dark:text-[#94A3B8] truncate">
                    {currentTrack.album || currentTrack.artist || 'mimusica'}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onResumeNow) onResumeNow();
                }}
                className="w-full min-h-[52px] py-3 px-6 rounded-xl bg-[#3B82F6] hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-[#3B82F6]/30 flex items-center justify-center gap-2.5 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Reanudar ahora ({formatTime(resumeTime)})</span>
              </button>
              <p className="text-[11px] font-medium text-[#475569] dark:text-[#94A3B8]">
                O toca en cualquier punto libre de la pantalla para continuar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. ZONA INFERIOR DERECHA: Botonera Principal Centrada (72x72px Play/Pausa) + Deslizador Horizontal Ancho de Volumen */}
      <div className="w-full space-y-2.5 lg:space-y-4 [@media(max-height:750px)]:space-y-2.5">
        {/* Centered Transport Controls Row */}
        <div className="w-full flex items-center justify-center gap-3 sm:gap-5">
          {/* [Aleatorio] Discreet Left */}
          <button
            onClick={onToggleShuffle}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
              shuffle
                ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8] dark:bg-[#3B82F6]/20 dark:border-[#4DA8FF]/60 dark:text-[#4DA8FF]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:border-[#93C5FD] dark:bg-[#16181C] dark:border-[#2A2D34] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
            title="Modo Aleatorio (Shuffle)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* [Anterior] */}
          <button
            onClick={onPrev}
            className="w-12 h-12 lg:w-14 lg:h-14 [@media(max-height:750px)]:w-12 [@media(max-height:750px)]:h-12 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#93C5FD] text-[#0F172A] dark:bg-[#16181C] dark:hover:bg-[#22252B] dark:border-[#2A2D34] dark:text-[#F8FAFC] flex items-center justify-center transition-all active:scale-95"
            title="Anterior"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          {/* [Play / Pausa] 72x72px Rounded Square Blue Button */}
          <button
            onClick={onTogglePlay}
            className="w-[62px] h-[62px] lg:w-[72px] lg:h-[72px] [@media(max-height:750px)]:w-[60px] [@media(max-height:750px)]:h-[60px] rounded-2xl bg-[#3B82F6] hover:bg-blue-500 text-white shadow-lg shadow-[#3B82F6]/30 flex items-center justify-center transition-all active:scale-95"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-0.5 fill-current" />}
          </button>

          {/* [Siguiente] */}
          <button
            onClick={onNext}
            className="w-12 h-12 lg:w-14 lg:h-14 [@media(max-height:750px)]:w-12 [@media(max-height:750px)]:h-12 rounded-2xl bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#93C5FD] text-[#0F172A] dark:bg-[#16181C] dark:hover:bg-[#22252B] dark:border-[#2A2D34] dark:text-[#F8FAFC] flex items-center justify-center transition-all active:scale-95"
            title="Siguiente"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          {/* [Repetir] Discreet Right */}
          <button
            onClick={onToggleRepeat}
            className={`w-11 h-11 rounded-xl border relative flex items-center justify-center transition-all active:scale-95 ${
              repeatMode !== 'off'
                ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8] dark:bg-[#3B82F6]/20 dark:border-[#4DA8FF]/60 dark:text-[#4DA8FF]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:border-[#93C5FD] dark:bg-[#16181C] dark:border-[#2A2D34] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
            title="Modo Repetición"
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#3B82F6] text-[9px] font-bold text-white rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        {/* Bottom Wide Horizontal Volume Bar with Speaker Icon (left) & Percentage % (right) */}
        <div className="w-full flex items-center gap-3 bg-[#F8FAFC] dark:bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-xl px-4 py-2.5">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
            className="text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] transition-colors shrink-0"
            title={volume === 0 ? 'Restaurar volumen' : 'Silenciar'}
          >
            {volume === 0 ? (
              <VolumeX className="w-5 h-5 text-rose-500" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-5 h-5 text-[#3B82F6] dark:text-[#4DA8FF]" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#3B82F6] dark:text-[#4DA8FF]" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="flex-1 h-2 bg-[#E2E8F0] dark:bg-[#2A2D34] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
            aria-label="Volumen de reproducción"
          />

          <span className="text-xs font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC] w-10 text-right shrink-0">
            {volumePercent}%
          </span>

          {hasTeslaSession && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E8F0] dark:border-[#2A2D34]">
              <button
                onClick={onTeslaVolumeDown}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1E22] hover:bg-[#EFF6FF] border border-[#E2E8F0] dark:border-[#2A2D34] text-[#0F172A] dark:text-[#F8FAFC] font-bold text-xs active:scale-95"
                title="Bajar Volumen Coche (Vol -)"
              >
                Vol -
              </button>
              <button
                onClick={onTeslaVolumeUp}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1E22] hover:bg-[#EFF6FF] border border-[#E2E8F0] dark:border-[#2A2D34] text-[#0F172A] dark:text-[#F8FAFC] font-bold text-xs active:scale-95"
                title="Subir Volumen Coche (Vol +)"
              >
                Vol +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
