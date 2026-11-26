import React from 'react';
import { Track } from '../types/audio';
import { ShieldCheck, Radio, Disc, Folder } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface PlayerPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isOffline: boolean;
  hasTeslaSession?: boolean;
  teslaShiftState?: string | null;
  onOpenFolders?: () => void;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  currentTrack,
  isPlaying,
  isOffline,
  hasTeslaSession,
  teslaShiftState,
  onOpenFolders
}) => {
  return (
    <div className="flex flex-col items-center justify-between h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-4 sm:p-6 [@media(max-height:750px)]:p-3.5 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Header info */}
      <div className="w-full flex items-center justify-between gap-2 mb-2">
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

      {/* Center Stage: Large Artwork & 56-Bar High-Definition Canvas AudioVisualizer */}
      <div className="relative my-auto flex flex-col items-center justify-center w-full">
        <div
          className={`relative w-56 h-56 sm:w-64 sm:h-64 xl:w-72 xl:h-72 [@media(max-height:750px)]:w-[172px] [@media(max-height:750px)]:h-[172px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 flex items-center justify-center group ${
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

        {/* High-Definition 56-Bar Symmetric Canvas Visualizer */}
        <AudioVisualizer isPlaying={isPlaying} />
      </div>

      {/* Subtle bottom status line inside the stage card */}
      <div className="w-full text-center text-[11px] text-slate-500 pt-2">
        Usa la barra inferior fija o los mandos del volante del Tesla para controlar la reproducción
      </div>
    </div>
  );
};
