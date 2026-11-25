import React from 'react';
import { Track } from '../types/audio';
import { Play, Pause, SkipBack, SkipForward, Folder, ShieldCheck, Music } from 'lucide-react';

interface DrivingHUDProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isOffline: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onOpenFolderDrawer: () => void;
}

export const DrivingHUD: React.FC<DrivingHUDProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isOffline,
  onTogglePlay,
  onNext,
  onPrev,
  onOpenFolderDrawer
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-4 shadow-2xl">
      {/* Progress bar top strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Left Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1" onClick={onOpenFolderDrawer}>
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-blue-400">
            <Music className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{currentTrack?.name || 'Select Music'}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 truncate">{currentTrack?.artist || 'Mi música'}</span>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" /> OFFLINE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right Touch Controls (min-height 64px ergonomics) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenFolderDrawer}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 active:scale-95 transition-all"
            title="Open Folders"
          >
            <Folder className="w-6 h-6 text-blue-400" />
          </button>
          <button
            onClick={onPrev}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white active:scale-95 transition-all"
            title="Previous"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={onTogglePlay}
            className="min-h-[56px] min-w-[56px] flex items-center justify-center p-4 rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white active:scale-95 transition-all"
            title="Next"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
