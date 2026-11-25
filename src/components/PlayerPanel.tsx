import React from 'react';
import { Track } from '../types/audio';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, ShieldCheck, Radio, Disc } from 'lucide-react';

interface PlayerPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  isOffline: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
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
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleRepeat,
  onToggleShuffle
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-between h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Header info */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tesla Audio Stream</span>
        </div>
        {isOffline ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            OFFLINE READY (TUNNEL PROOF)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Radio className="w-4 h-4" />
            CLOUD STREAM
          </span>
        )}
      </div>

      {/* Artwork / Vinyl Disc view */}
      <div className="relative my-auto flex flex-col items-center">
        <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 flex items-center justify-center group ${isPlaying ? 'animate-float' : ''}`}>
          <img
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop"
            alt="Album Artwork"
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-blue-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-lg ${isPlaying ? 'animate-spin-slow' : ''}`}>
                <Disc className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{currentTrack?.name || 'Select a Track'}</h2>
                <p className="text-xs text-blue-300 truncate">{currentTrack?.artist || 'Mi música / Google Drive'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visualizer bars */}
        <div className="flex items-center justify-center gap-1 h-8 mt-6">
          {[...Array(24)].map((_, i) => (
            <span
              key={i}
              className={`w-1 bg-blue-500 rounded-full transition-all duration-150 ${
                isPlaying ? 'animate-pulse' : 'h-1 opacity-40'
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, Math.sin(i + Date.now() / 200) * 32)}px` : '4px',
                animationDelay: `${i * 50}ms`
              }}
            ></span>
          ))}
        </div>
      </div>

      {/* Progress Bar & Timestamps */}
      <div className="w-full space-y-2 mt-4">
        <div className="relative group cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-between text-xs font-mono tabular-nums text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(duration - currentTime)}</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="w-full flex items-center justify-between mt-6 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleShuffle}
            className={`p-3 rounded-xl transition-colors ${shuffle ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleRepeat}
            className={`p-3 rounded-xl transition-colors ${repeatMode !== 'off' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title={`Repeat: ${repeatMode}`}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white shadow-md active:scale-95 transition-all"
            title="Previous Track"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-5 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white shadow-md active:scale-95 transition-all"
            title="Next Track"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-slate-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-20 sm:w-24 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
