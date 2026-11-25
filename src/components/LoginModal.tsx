import React, { useState } from 'react';
import { X, QrCode, Key, ShieldCheck, Disc3, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginWithToken: (token: string) => void;
  onEnableDemoMode: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginWithToken,
  onEnableDemoMode
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'token' | 'demo'>('demo');
  const [inputToken, setInputToken] = useState<string>('');

  if (!isOpen) return null;

  const sessionId = Math.random().toString(36).substring(2, 9);
  const pairingUrl = `${window.location.origin}/auth/confirm?session=${sessionId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Disc3 className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Connect Google Drive</h2>
              <p className="text-xs text-slate-400">Restricted drive.file scope authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
          <button
            onClick={() => setActiveTab('demo')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'demo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Demo Library
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'qr' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tesla QR Code
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'token' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            OAuth Token
          </button>
        </div>

        {activeTab === 'demo' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Instant Demo Library</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Test AudioCar Drive instantly with high-quality preloaded music streams and offline caching without logging into Google.
              </p>
            </div>
            <button
              onClick={() => {
                onEnableDemoMode();
                onClose();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-colors"
            >
              Launch Demo Experience
            </button>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-slate-400">
              Scan this QR code with your phone camera to securely authorize your Tesla screen without typing credentials.
            </p>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto">
              <QRCodeSVG value={pairingUrl} size={180} level="M" />
            </div>
            <p className="text-[11px] font-mono text-slate-500 truncate">Session ID: {sessionId}</p>
          </div>
        )}

        {activeTab === 'token' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-400">
              Paste your Google OAuth Access Token (with <code className="text-blue-400">drive.file</code> scope) to connect your personal Google Drive music folder.
            </p>
            <div className="space-y-2">
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="ya29.a0..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <button
              onClick={() => {
                if (inputToken.trim()) {
                  onLoginWithToken(inputToken.trim());
                  onClose();
                }
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-colors"
            >
              Verify & Connect Drive
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Strict privacy: Only accesses files created or opened by this app (drive.file scope).</span>
        </div>
      </div>
    </div>
  );
};
