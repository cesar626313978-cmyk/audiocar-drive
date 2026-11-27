import React from 'react';
import { AudioSettings } from '../types/audio';
import { X, Sliders, Zap, Volume2, Shield, Trash2, HardDrive } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-2xl shadow-2xl overflow-hidden p-6 text-[#0F172A] dark:text-[#F8FAFC]">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#2A2D34] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#93C5FD] text-[#1D4ED8] dark:bg-[#3B82F6]/20 dark:border-[#3B82F6]/40 dark:text-[#4DA8FF] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Ecualizador 3B y Ajustes</h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">Crossfade, AGC, EQ de Cabina y Caché</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] dark:hover:bg-[#16181C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-[#2A2D34]">
          {/* Crossfade Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              <span>Transición Crossfade</span>
              <span className="font-mono text-[#3B82F6] dark:text-[#4DA8FF]">{settings.crossfadeSeconds}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={settings.crossfadeSeconds}
              onChange={(e) => onChangeSettings({ ...settings, crossfadeSeconds: Number(e.target.value) })}
              className="w-full h-2 bg-[#E2E8F0] dark:bg-[#16181C] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
            />
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">Fundido suave al iniciar cada pista (0s = desactivado, hasta 12s).</p>
          </div>

          {/* AGC Switch */}
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-[#16181C] rounded-xl border border-[#E2E8F0] dark:border-[#2A2D34]">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Nivelador Dinámico (AGC)</h4>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">Iguala el volumen entre canciones antiguas y modernas</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.agcEnabled}
                onChange={(e) => onChangeSettings({ ...settings, agcEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#CBD5E1] dark:bg-[#2A2D34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
            </label>
          </div>

          {/* Tesla Auto-Dim on Reverse Gear (R) Switch */}
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-[#16181C] rounded-xl border border-[#E2E8F0] dark:border-[#2A2D34]">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#15803D] dark:text-emerald-400" />
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Atenuar volumen al aparcar (Marcha Atrás)</h4>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                  Baja el volumen del Tesla (-3) al poner la marcha <strong className="text-[#0F172A] dark:text-[#F8FAFC]">R</strong> y lo restaura (+3) al pasar a <strong className="text-[#0F172A] dark:text-[#F8FAFC]">D</strong> o <strong className="text-[#0F172A] dark:text-[#F8FAFC]">P</strong>
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
              <div className="w-11 h-6 bg-[#CBD5E1] dark:bg-[#2A2D34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* 3-Band Equalizer */}
          <div className="space-y-4 p-4 bg-[#F8FAFC] dark:bg-[#16181C] rounded-xl border border-[#E2E8F0] dark:border-[#2A2D34]">
            <h4 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#3B82F6] dark:text-[#4DA8FF]" />
              Ecualizador de Cabina (3 Bandas)
            </h4>

            {/* Bass */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
                <span>Graves (Bass)</span>
                <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{settings.eqBands.bass} dB</span>
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
                className="w-full h-1.5 bg-[#E2E8F0] dark:bg-[#2A2D34] rounded-lg appearance-none accent-[#3B82F6]"
              />
            </div>

            {/* Mid */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
                <span>Medios (Mid)</span>
                <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{settings.eqBands.mid} dB</span>
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
                className="w-full h-1.5 bg-[#E2E8F0] dark:bg-[#2A2D34] rounded-lg appearance-none accent-[#3B82F6]"
              />
            </div>

            {/* Treble */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#475569] dark:text-[#94A3B8]">
                <span>Agudos (Treble)</span>
                <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{settings.eqBands.treble} dB</span>
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
                className="w-full h-1.5 bg-[#E2E8F0] dark:bg-[#2A2D34] rounded-lg appearance-none accent-[#3B82F6]"
              />
            </div>
          </div>

          {/* Buffer & Cache Manager */}
          <div className="space-y-3 p-4 bg-[#F8FAFC] dark:bg-[#16181C] rounded-xl border border-[#E2E8F0] dark:border-[#2A2D34]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Caché Offline Anti-Túneles</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#15803D] dark:text-emerald-400">{cacheSize} MB</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-[#475569] dark:text-[#94A3B8]">
                <p>Pistas pre-cargadas por adelantado:</p>
              </div>
              <div className="flex gap-2">
                {[1, 3, 5].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => onChangeSettings({ ...settings, bufferAheadCount: cnt })}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      settings.bufferAheadCount === cnt
                        ? 'bg-[#3B82F6] text-white'
                        : 'bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#EFF6FF] dark:bg-[#1C1E22] dark:border-[#2A2D34] dark:text-[#F8FAFC]'
                    }`}
                  >
                    {cnt} pistas
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={onClearCache}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:border-rose-500/20 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Vaciar Caché IndexedDB</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#2A2D34] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#3B82F6] hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
