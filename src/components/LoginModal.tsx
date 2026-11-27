import React, { useState } from 'react';
import { X, ShieldCheck, Disc3, Key, ExternalLink } from 'lucide-react';
import { GoogleDriveAuth } from '../services/drive';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectDrive: (clientId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onConnectDrive
}) => {
  const [clientIdInput, setClientIdInput] = useState<string>(GoogleDriveAuth.getStoredClientId() || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-2xl shadow-2xl overflow-hidden p-6 text-[#0F172A] dark:text-[#F8FAFC]">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#2A2D34] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#93C5FD] text-[#1D4ED8] dark:bg-[#3B82F6]/20 dark:border-[#3B82F6]/40 dark:text-[#4DA8FF] flex items-center justify-center">
              <Disc3 className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Google Drive (`mimusica`)</h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">Conexión OAuth 2.0 en solo lectura</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] dark:hover:bg-[#16181C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            AudioCar Drive accederá exclusivamente a la carpeta <strong className="text-[#0F172A] dark:text-[#F8FAFC]">mimusica</strong> en tu Google Drive utilizando el scope <code className="text-[#1D4ED8] dark:text-[#4DA8FF]">drive.readonly</code>.
          </p>

          <div className="p-3 bg-[#EFF6FF] border border-[#93C5FD] text-[#1D4ED8] dark:bg-[#16181C] dark:border-[#2A2D34] rounded-xl text-xs dark:text-[#4DA8FF] space-y-1">
            <p className="font-semibold">Requisito importante:</p>
            <p>Asegúrate de tener una carpeta llamada exactamente <strong className="text-[#0F172A] dark:text-[#F8FAFC]">mimusica</strong> en la raíz de tu Google Drive que contenga tus archivos de audio o subcarpetas.</p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF]" />
              <span>Google OAuth Client ID</span>
            </label>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="Ej. 123456789-abc...apps.googleusercontent.com"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-xl text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6] font-mono"
            />
            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
              También puedes definir la variable de entorno <code className="text-[#0F172A] dark:text-[#F8FAFC]">VITE_GOOGLE_CLIENT_ID</code> en tu entorno.
            </p>
          </div>

          <button
            onClick={() => {
              if (clientIdInput.trim()) {
                GoogleDriveAuth.setStoredClientId(clientIdInput.trim());
                onConnectDrive(clientIdInput.trim());
                onClose();
              }
            }}
            className="w-full py-3 bg-[#3B82F6] hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#3B82F6]/30 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Conectar con Google Drive</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#2A2D34] flex items-center gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8]">
          <ShieldCheck className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
          <span>Seguridad: Autenticación oficial de Google Identity Services. Sin contraseñas almacenadas.</span>
        </div>
      </div>
    </div>
  );
};
