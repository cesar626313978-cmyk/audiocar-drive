import React from 'react';
import { AudioSettings } from '../types/audio';
import { X, Sliders, Zap, Volume2, Shield, Trash2, HardDrive } from 'lucide-react';
import { AudioCacheDB } from '../services/db';

interface AudioSettingsModalProps {
  isOpen: boolean;
  settings: AudioSettings;
  onChangeSettings: (settings: AudioSettings) => void;
  onClose: () => void;
  cacheSize: string;
  onClearCache: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  settings,
  onChangeSettings,
  onClose,
  cacheSize,
  onClearCache
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Audio & Cabin Settings</h2>
              <p className="text-xs text-slate-400">Crossfade, AGC, EQ, and Tunnel Buffer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Crossfade Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Crossfade Transition</span>
              <span className="font-mono text-blue-400">{settings.crossfadeSeconds}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={settings.crossfadeSeconds}
              onChange={(e) => onChangeSettings({ ...settings, crossfadeSeconds: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-400">Smooth gapless overlap between tracks (0s = disabled, up to 12s).</p>
          </div>

          {/* AGC Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-sm font-medium text-white">Nivelador Dinámico (AGC)</h4>
                <p className="text-xs text-slate-400">Iguala el volumen entre canciones antiguas y modernas</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.agcEnabled}
                onChange={(e) => onChangeSettings({ ...settings, agcEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Tesla Auto-Dim on Reverse Gear (R) Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="text-sm font-medium text-white">Atenuar volumen al aparcar (Marcha Atrás)</h4>
                <p className="text-xs text-slate-400">
                  Baja el volumen del Tesla (-3) al poner la marcha <strong className="text-slate-200">R</strong> y lo restaura (+3) al pasar a <strong className="text-slate-200">D</strong> o <strong className="text-slate-200">P</strong>
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoDimOnReverse}
                onChange={(e) => onChangeSettings({ ...settings, autoDimOnReverse: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* 3-Band Equalizer */}
          <div className="space-y-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              Cabin Equalizer (3-Band)
            </h4>

            {/* Bass */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Graves (Bass)</span>
                <span className="font-mono">{settings.eqBands.bass} dB</span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={settings.eqBands.bass}
                onChange={(e) => onChangeSettings({
                  ...settings,
                  eqBands: { ...settings.eqBands, bass: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-blue-500"
              />
            </div>

            {/* Mid */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Medios (Mid)</span>
                <span className="font-mono">{settings.eqBands.mid} dB</span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={settings.eqBands.mid}
                onChange={(e) => onChangeSettings({
                  ...settings,
                  eqBands: { ...settings.eqBands, mid: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-blue-500"
              />
            </div>

            {/* Treble */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Agudos (Treble)</span>
                <span className="font-mono">{settings.eqBands.treble} dB</span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={settings.eqBands.treble}
                onChange={(e) => onChangeSettings({
                  ...settings,
                  eqBands: { ...settings.eqBands, treble: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-blue-500"
              />
            </div>
          </div>

          {/* Buffer & Cache Manager */}
          <div className="space-y-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Tunnel Cache Storage</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">{cacheSize} MB cached</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                <p>Pre-priming buffer ahead:</p>
              </div>
              <div className="flex gap-2">
                {[1, 3, 5].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => onChangeSettings({ ...settings, bufferAheadCount: cnt })}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      settings.bufferAheadCount === cnt
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cnt} songs
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={onClearCache}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear IndexedDB Cache</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
